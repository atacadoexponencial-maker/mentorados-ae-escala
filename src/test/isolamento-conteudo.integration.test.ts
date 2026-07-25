// @vitest-environment node
//
// Teste de INTEGRAÇÃO do isolamento de conteúdo entre espaços (RLS do Postgres).
// Cria o próprio conteúdo (2 espaços + um revendedor + aulas), verifica que a
// revendedora de um espaço não lê o conteúdo do outro, e limpa tudo no fim.
// Precisa das variáveis do Supabase; sem elas, o bloco é pulado.
import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const temEnv = Boolean(url && anon && service)

const svc: SupabaseClient | null = temEnv
  ? createClient(url as string, service as string, { auth: { persistSession: false } })
  : null

const SENHA = 'TesteIsolamento123!'
const carimbo = Date.now()
const emailA = `rev.isolamento.${carimbo}@teste.local`

// ids criados no beforeAll, removidos no afterAll
const ids: Record<string, string | undefined> = {}

async function inserir(tabela: string, valores: Record<string, unknown>): Promise<string> {
  const { data, error } = await svc!.from(tabela).insert(valores).select('id').single()
  if (error) throw new Error(`insert ${tabela}: ${error.message}`)
  return (data as { id: string }).id
}

describe.skipIf(!temEnv)('isolamento de conteúdo entre espaços (RLS)', () => {
  beforeAll(async () => {
    ids.espacoA = await inserir('espacos', { slug: `iso-a-${carimbo}`, nome_curso: 'ISO A' })
    ids.espacoB = await inserir('espacos', { slug: `iso-b-${carimbo}`, nome_curso: 'ISO B' })

    // Revendedor autenticado no espaço A
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

    // Base (espaco_id null): visível para todos
    ids.modBase = await inserir('modulos', { titulo: 'ISO Base', ordem: 1, espaco_id: null })
    ids.aulaBase = await inserir('aulas', {
      modulo_id: ids.modBase,
      titulo: 'ISO Base Aula',
      ordem: 1,
      publicada: true,
      espaco_id: null,
    })

    // Espaço A: uma aula publicada e uma em rascunho
    ids.modA = await inserir('modulos', { titulo: 'ISO A Mod', ordem: 1, espaco_id: ids.espacoA })
    ids.aulaAPub = await inserir('aulas', {
      modulo_id: ids.modA,
      titulo: 'ISO A Pub',
      ordem: 1,
      publicada: true,
      espaco_id: ids.espacoA,
    })
    ids.aulaADraft = await inserir('aulas', {
      modulo_id: ids.modA,
      titulo: 'ISO A Draft',
      ordem: 2,
      publicada: false,
      espaco_id: ids.espacoA,
    })

    // Espaço B: aula publicada que NÃO deve vazar para o revendedor de A
    ids.modB = await inserir('modulos', { titulo: 'ISO B Mod', ordem: 1, espaco_id: ids.espacoB })
    ids.aulaB = await inserir('aulas', {
      modulo_id: ids.modB,
      titulo: 'ISO B Pub',
      ordem: 1,
      publicada: true,
      espaco_id: ids.espacoB,
    })
  }, 30000)

  afterAll(async () => {
    if (!svc) return
    await svc.from('aulas').delete().in(
      'id',
      [ids.aulaBase, ids.aulaAPub, ids.aulaADraft, ids.aulaB].filter(Boolean) as string[]
    )
    await svc.from('modulos').delete().in(
      'id',
      [ids.modBase, ids.modA, ids.modB].filter(Boolean) as string[]
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
  }, 30000)

  async function comoRevendedorA() {
    const cli = createClient(url as string, anon as string, { auth: { persistSession: false } })
    const { error } = await cli.auth.signInWithPassword({ email: emailA, password: SENHA })
    if (error) throw new Error(`login: ${error.message}`)
    return cli
  }

  it('vê a base e os módulos de A, mas não os de B', async () => {
    const cli = await comoRevendedorA()
    const { data } = await cli.from('modulos').select('id')
    const visiveis = (data ?? []).map((m) => m.id)
    expect(visiveis).toContain(ids.modBase) // base visível (prova que a query retorna algo)
    expect(visiveis).toContain(ids.modA) // próprio espaço visível
    expect(visiveis).not.toContain(ids.modB) // OUTRO espaço nunca visível
  })

  it('vê aulas publicadas da base e de A, nunca de B nem rascunhos', async () => {
    const cli = await comoRevendedorA()
    const { data } = await cli.from('aulas').select('id')
    const visiveis = (data ?? []).map((a) => a.id)
    expect(visiveis).toContain(ids.aulaBase)
    expect(visiveis).toContain(ids.aulaAPub)
    expect(visiveis).not.toContain(ids.aulaB) // aula de outro espaço
    expect(visiveis).not.toContain(ids.aulaADraft) // rascunho não aparece para revendedora
  })
})
