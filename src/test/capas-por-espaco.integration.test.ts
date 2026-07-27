// @vitest-environment node
//
// Teste de INTEGRAÇÃO da RLS de aula_capas_espaco: a revendedora de um espaço lê a
// capa por marca do próprio espaço e nunca a de outro. Precisa das variáveis do
// Supabase; sem elas, o bloco é pulado.
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

const SENHA = 'TesteCapas123!'
const carimbo = Date.now()
const emailA = `rev.capas.${carimbo}@teste.local`

const ids: Record<string, string | undefined> = {}

async function inserir(tabela: string, valores: Record<string, unknown>): Promise<string> {
  const { data, error } = await svc!.from(tabela).insert(valores).select('id').single()
  if (error) throw new Error(`insert ${tabela}: ${error.message}`)
  return (data as { id: string }).id
}

describe.skipIf(!temEnv)('capas por espaço (RLS)', () => {
  beforeAll(async () => {
    ids.espacoA = await inserir('espacos', { slug: `capa-a-${carimbo}`, nome_curso: 'CAPA A' })
    ids.espacoB = await inserir('espacos', { slug: `capa-b-${carimbo}`, nome_curso: 'CAPA B' })

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

    ids.modBase = await inserir('modulos', { titulo: 'CAPA Base', ordem: 1, espaco_id: null })
    ids.aulaBase = await inserir('aulas', {
      modulo_id: ids.modBase,
      titulo: 'CAPA Base Aula',
      ordem: 1,
      publicada: true,
      espaco_id: null,
      capa_url: 'https://exemplo.test/base.jpg',
    })

    await svc!.from('aula_capas_espaco').insert([
      { aula_id: ids.aulaBase, espaco_id: ids.espacoA, capa_url: 'https://exemplo.test/a.jpg' },
      { aula_id: ids.aulaBase, espaco_id: ids.espacoB, capa_url: 'https://exemplo.test/b.jpg' },
    ])
  }, 30000)

  afterAll(async () => {
    if (!svc) return
    await svc.from('aulas').delete().in('id', [ids.aulaBase].filter(Boolean) as string[])
    await svc.from('modulos').delete().in('id', [ids.modBase].filter(Boolean) as string[])
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

  it('revendedora de A lê só a capa de A', async () => {
    const cli = createClient(url as string, anon as string, { auth: { persistSession: false } })
    const { error } = await cli.auth.signInWithPassword({ email: emailA, password: SENHA })
    if (error) throw new Error(`login: ${error.message}`)

    const { data } = await cli.from('aula_capas_espaco').select('espaco_id, capa_url')
    const espacos = (data ?? []).map((c) => c.espaco_id)
    expect(espacos).toContain(ids.espacoA)
    expect(espacos).not.toContain(ids.espacoB)
  })
})
