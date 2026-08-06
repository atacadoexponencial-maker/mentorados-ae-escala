// @vitest-environment node
//
// Teste de INTEGRAÇÃO da limpeza do bucket `materiais` que `excluirAula` faz,
// contra o Supabase real. O que só o bucket real responde: (a) listar o prefixo
// `<aulaId>` e remover tudo esvazia mesmo a pasta; (b) prefixo inexistente
// devolve `[]` com `error: null` — não é erro, e é isso que sustenta o cenário
// da aula só com links; (c) a listagem PAGINADA devolve mais de 100 objetos,
// enquanto uma chamada única pararia em 100.
//
// A server action não é instanciada nem `createAdminClient` é mockado: o que
// está sob teste é o comportamento do Storage e o laço de paginação, replicado
// aqui igual ao de `excluirAula`. Sem as variáveis do Supabase no `.env`, o
// bloco é pulado.
import 'dotenv/config'
import { describe, it, expect, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BUCKET_MATERIAIS } from '@/lib/materiais/regras'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const temEnv = Boolean(url && service)

const svc: SupabaseClient | null = temEnv
  ? createClient(url as string, service as string, { auth: { persistSession: false } })
  : null

// Nenhuma aula é criada: o alvo é a pasta do bucket, não a linha. UUIDs de teste
// no mesmo formato que a action usa como primeiro segmento da chave.
const PASTA = `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`
const PASTA_PAGINACAO = `00000000-0000-4000-9000-${String(Date.now()).slice(-12)}`
const PASTA_VAZIA = '00000000-0000-4000-a000-000000000000'

const LIMITE_PAGINA = 100

// Mesmo laço de `excluirAula`: acumula páginas até uma voltar com menos que o
// limite.
async function listarPaginado(prefixo: string): Promise<string[]> {
  const caminhos: string[] = []
  for (let offset = 0; ; offset += LIMITE_PAGINA) {
    const { data: pagina } = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .list(prefixo, { limit: LIMITE_PAGINA, offset })
    for (const a of pagina ?? []) caminhos.push(`${prefixo}/${a.name}`)
    if ((pagina?.length ?? 0) < LIMITE_PAGINA) break
  }
  return caminhos
}

async function subir(caminho: string) {
  return svc!.storage.from(BUCKET_MATERIAIS).upload(caminho, new Blob(['x']), {
    contentType: 'application/octet-stream',
  })
}

describe.skipIf(!temEnv)('limpeza do bucket materiais ao excluir a aula', () => {
  afterAll(async () => {
    if (!svc) return
    for (const pasta of [PASTA, PASTA_PAGINACAO]) {
      const restos = await listarPaginado(pasta)
      if (restos.length) await svc.storage.from(BUCKET_MATERIAIS).remove(restos)
    }
  }, 120000)

  it('remove todos os objetos do prefixo da aula', async () => {
    expect((await subir(`${PASTA}/${Date.now()}-a.pdf`)).error).toBeNull()
    expect((await subir(`${PASTA}/${Date.now()}-b.pdf`)).error).toBeNull()

    const caminhos = await listarPaginado(PASTA)
    expect(caminhos).toHaveLength(2)

    const { error } = await svc!.storage.from(BUCKET_MATERIAIS).remove(caminhos)
    expect(error).toBeNull()

    expect(await listarPaginado(PASTA)).toEqual([])
  }, 60000)

  it('prefixo inexistente devolve lista vazia sem erro', async () => {
    const { data, error } = await svc!.storage
      .from(BUCKET_MATERIAIS)
      .list(PASTA_VAZIA, { limit: LIMITE_PAGINA, offset: 0 })
    expect(error).toBeNull()
    expect(data).toEqual([])
  }, 30000)

  it('a listagem paginada enxerga além do teto de 100 do list()', async () => {
    const total = 101
    const envios = Array.from({ length: total }, (_, i) =>
      subir(`${PASTA_PAGINACAO}/${String(i).padStart(3, '0')}.txt`)
    )
    for (const r of await Promise.all(envios)) expect(r.error).toBeNull()

    // Uma chamada única para no teto default; o laço vê todos.
    const { data: umaPagina } = await svc!.storage.from(BUCKET_MATERIAIS).list(PASTA_PAGINACAO)
    expect(umaPagina).toHaveLength(LIMITE_PAGINA)

    const caminhos = await listarPaginado(PASTA_PAGINACAO)
    expect(caminhos).toHaveLength(total)

    const { error } = await svc!.storage.from(BUCKET_MATERIAIS).remove(caminhos)
    expect(error).toBeNull()
    expect(await listarPaginado(PASTA_PAGINACAO)).toEqual([])
  }, 180000)
})
