// @vitest-environment node
//
// Teste de INTEGRAÇÃO do emissor de link de material, contra o Supabase real.
// Reproduz os dois passos da função sem passar por ela (a função depende de
// `cookies()` do Next, que não existe fora da requisição): a leitura da linha
// pela SESSÃO da revendedora — é a RLS que autoriza — e a assinatura pelo
// cliente de SERVIÇO, que é a única identidade capaz de assinar no bucket
// `materiais` (zero policies em `storage.objects`).
//
// Cria o próprio conteúdo (2 espaços, 1 revendedora em A, aulas e materiais nos
// dois) e limpa tudo no fim, inclusive os objetos do bucket. Sem as variáveis do
// Supabase no `.env`, o bloco é pulado.
import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  BUCKET_MATERIAIS,
  PRAZO_LINK_SEGUNDOS,
  podeAssinarMaterial,
} from '@/lib/materiais/regras'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const temEnv = Boolean(url && anon && service)

const svc: SupabaseClient | null = temEnv
  ? createClient(url as string, service as string, { auth: { persistSession: false } })
  : null

const SENHA = 'TesteMaterialLink123!'
const carimbo = Date.now()
const emailA = `rev.material.${carimbo}@teste.local`
const NOME_AMIGAVEL = 'Guia de Vendas — 2026.pdf'

const ids: Record<string, string | undefined> = {}
const caminhos: string[] = []

async function inserir(tabela: string, valores: Record<string, unknown>): Promise<string> {
  const { data, error } = await svc!.from(tabela).insert(valores).select('id').single()
  if (error) throw new Error(`insert ${tabela}: ${error.message}`)
  return (data as { id: string }).id
}

// Sobe um arquivinho no bucket privado e devolve o caminho interno, no mesmo
// formato que a action de upload usa (`<aulaId>/<timestamp>-<nome>`).
async function subirArquivo(aulaId: string): Promise<string> {
  const caminho = `${aulaId}/${Date.now()}-teste-emissor.txt`
  const { error } = await svc!.storage
    .from(BUCKET_MATERIAIS)
    .upload(caminho, new Blob(['conteudo de teste']), { contentType: 'application/octet-stream' })
  if (error) throw new Error(`upload: ${error.message}`)
  caminhos.push(caminho)
  return caminho
}

describe.skipIf(!temEnv)('emissor de link de material (RLS + assinatura)', () => {
  beforeAll(async () => {
    ids.espacoA = await inserir('espacos', { slug: `mat-a-${carimbo}`, nome_curso: 'MAT A' })
    ids.espacoB = await inserir('espacos', { slug: `mat-b-${carimbo}`, nome_curso: 'MAT B' })

    const { data: u, error: eu } = await svc!.auth.admin.createUser({
      email: emailA,
      password: SENHA,
      email_confirm: true,
    })
    if (eu) throw new Error(`createUser: ${eu.message}`)
    ids.userA = u.user.id
    await svc!.from('user_roles').insert({ user_id: ids.userA, role: 'revendedor' })
    await svc!
      .from('revendedores')
      .insert({ user_id: ids.userA, espaco_id: ids.espacoA, email: emailA, status: 'ativo' })

    ids.modA = await inserir('modulos', { titulo: 'MAT A Mod', ordem: 1, espaco_id: ids.espacoA })
    ids.aulaA = await inserir('aulas', {
      modulo_id: ids.modA,
      titulo: 'MAT A Aula',
      ordem: 1,
      publicada: true,
      espaco_id: ids.espacoA,
    })

    ids.modB = await inserir('modulos', { titulo: 'MAT B Mod', ordem: 1, espaco_id: ids.espacoB })
    ids.aulaB = await inserir('aulas', {
      modulo_id: ids.modB,
      titulo: 'MAT B Aula',
      ordem: 1,
      publicada: true,
      espaco_id: ids.espacoB,
    })

    ids.caminhoA = await subirArquivo(ids.aulaA as string)
    ids.caminhoB = await subirArquivo(ids.aulaB as string)

    ids.materialA = await inserir('aula_materiais', {
      aula_id: ids.aulaA,
      nome: NOME_AMIGAVEL,
      url: ids.caminhoA,
      origem: 'arquivo',
      ordem: 1,
    })
    ids.materialB = await inserir('aula_materiais', {
      aula_id: ids.aulaB,
      nome: 'Material de B.pdf',
      url: ids.caminhoB,
      origem: 'arquivo',
      ordem: 1,
    })
  }, 60000)

  afterAll(async () => {
    if (!svc) return
    if (caminhos.length) await svc.storage.from(BUCKET_MATERIAIS).remove(caminhos)
    await svc.from('aula_materiais').delete().in(
      'id',
      [ids.materialA, ids.materialB].filter(Boolean) as string[]
    )
    await svc.from('aulas').delete().in(
      'id',
      [ids.aulaA, ids.aulaB].filter(Boolean) as string[]
    )
    await svc.from('modulos').delete().in(
      'id',
      [ids.modA, ids.modB].filter(Boolean) as string[]
    )
    if (ids.userA) {
      await svc.from('revendedores').delete().eq('user_id', ids.userA)
      await svc.from('user_roles').delete().eq('user_id', ids.userA)
      await svc.auth.admin.deleteUser(ids.userA)
    }
    await svc.from('espacos').delete().in(
      'id',
      [ids.espacoA, ids.espacoB].filter(Boolean) as string[]
    )
  }, 60000)

  async function comoRevendedorA() {
    const cli = createClient(url as string, anon as string, { auth: { persistSession: false } })
    const { error } = await cli.auth.signInWithPassword({ email: emailA, password: SENHA })
    if (error) throw new Error(`login: ${error.message}`)
    return cli
  }

  it('a sessão da revendedora A lê o material de A e NÃO lê o de B', async () => {
    const cli = await comoRevendedorA()

    const { data: doA } = await cli
      .from('aula_materiais')
      .select('nome, url, origem')
      .eq('id', ids.materialA as string)
      .maybeSingle()
    expect(doA).not.toBeNull()
    expect(doA!.url).toBe(ids.caminhoA)
    expect(podeAssinarMaterial(doA!)).toBe(true)

    // Material de outro espaço: a RLS não devolve a linha — indistinguível de
    // um id que não existe, que é justamente o requisito.
    const { data: doB } = await cli
      .from('aula_materiais')
      .select('nome, url, origem')
      .eq('id', ids.materialB as string)
      .maybeSingle()
    expect(doB).toBeNull()
  }, 30000)

  it('sem sessão nenhuma linha é lida', async () => {
    const cli = createClient(url as string, anon as string, { auth: { persistSession: false } })
    const { data } = await cli
      .from('aula_materiais')
      .select('nome, url, origem')
      .eq('id', ids.materialA as string)
      .maybeSingle()
    expect(data).toBeNull()
  }, 30000)

  it('a sessão da revendedora NÃO consegue assinar no bucket privado — só o serviço', async () => {
    const cli = await comoRevendedorA()
    const { data, error } = await cli.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(ids.caminhoA as string, PRAZO_LINK_SEGUNDOS)
    expect(data?.signedUrl).toBeFalsy()
    expect(error).toBeTruthy()
  }, 30000)

  it('o serviço assina o caminho do banco, com o nome amigável em download', async () => {
    const { data, error } = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(ids.caminhoA as string, PRAZO_LINK_SEGUNDOS, { download: NOME_AMIGAVEL })
    expect(error).toBeNull()
    expect(data?.signedUrl).toContain('/object/sign/')
    expect(data?.signedUrl).toContain('token=')

    // A lib devolve o `download` DUPLAMENTE codificado: monta a query com
    // `URLSearchParams` e passa tudo por `encodeURI`, que escapa o `%` de novo.
    // Este teste registra o defeito da plataforma para que a correção do
    // emissor não seja removida por engano.
    expect(data!.signedUrl).toContain('%25E2%2580%2594')

    // Mesma reescrita que `src/lib/materiais/emitir-link.ts` faz.
    const corrigida = new URL(data!.signedUrl)
    corrigida.searchParams.set('download', NOME_AMIGAVEL)
    expect(corrigida.searchParams.get('download')).toBe(NOME_AMIGAVEL)

    // O download efetivo traz Content-Disposition de anexo com o nome do banco,
    // e não o `<timestamp>-<nome>` do caminho no bucket.
    const resposta = await fetch(corrigida.toString())
    expect(resposta.ok).toBe(true)
    const disposicao = resposta.headers.get('content-disposition') ?? ''
    expect(disposicao).toContain('attachment')
    expect(decodeURIComponent(disposicao)).toContain(NOME_AMIGAVEL)
  }, 30000)

  it('duas emissões seguidas produzem tokens diferentes — nada é reaproveitado', async () => {
    const primeira = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(ids.caminhoA as string, PRAZO_LINK_SEGUNDOS)
    await new Promise((r) => setTimeout(r, 1100))
    const segunda = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(ids.caminhoA as string, PRAZO_LINK_SEGUNDOS)

    const token = (assinada: string) => new URL(assinada).searchParams.get('token')
    expect(token(primeira.data!.signedUrl)).not.toBe(token(segunda.data!.signedUrl))
  }, 30000)

  it('caminho inexistente no bucket devolve erro, nunca uma URL assinada', async () => {
    const { data, error } = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(`${ids.aulaA}/nao-existe-${carimbo}.pdf`, PRAZO_LINK_SEGUNDOS)
    expect(data?.signedUrl).toBeFalsy()
    expect(error).toBeTruthy()
  }, 30000)

  it('link expirado é recusado pelo Storage', async () => {
    const { data } = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(ids.caminhoA as string, 1)
    await new Promise((r) => setTimeout(r, 2500))
    const resposta = await fetch(data!.signedUrl)
    expect(resposta.ok).toBe(false)
  }, 30000)
})
