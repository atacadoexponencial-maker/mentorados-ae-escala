// @vitest-environment node
//
// Teste de INTEGRAÇÃO da chave do objeto no bucket `materiais`, contra o
// Supabase real. Trava a regressão do achado que motivou `chaveDeArquivo`: o
// Storage recusa chave fora do ASCII com 400 `InvalidKey`, e por isso anexar
// `Guia de Preços.pdf` falhava. Aqui os dois lados são medidos no mesmo teste —
// a chave gerada por `chaveDeArquivo` sobe (200) e a chave crua com acento não
// sobe (InvalidKey). Sem as variáveis do Supabase no `.env`, o bloco é pulado.
import 'dotenv/config'
import { describe, it, expect, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BUCKET_MATERIAIS, chaveDeArquivo } from '@/lib/materiais/regras'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const temEnv = Boolean(url && service)

const svc: SupabaseClient | null = temEnv
  ? createClient(url as string, service as string, { auth: { persistSession: false } })
  : null

// Não há aula nenhuma envolvida: o que está sob teste é a chave, não a linha.
// Um UUID fixo de teste serve de primeiro segmento, no mesmo formato que a
// action produz (`<aulaId>/<timestamp>-<chave>`).
const PASTA = `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`
const NOME_ORIGINAL = 'Guia de Preços.pdf'

const caminhos: string[] = []

async function subir(caminho: string) {
  const r = await svc!.storage
    .from(BUCKET_MATERIAIS)
    .upload(caminho, new Blob(['conteudo de teste']), {
      contentType: 'application/octet-stream',
    })
  if (!r.error) caminhos.push(caminho)
  return r
}

describe.skipIf(!temEnv)('chave do objeto no bucket materiais', () => {
  afterAll(async () => {
    if (!svc || !caminhos.length) return
    await svc.storage.from(BUCKET_MATERIAIS).remove(caminhos)
  }, 30000)

  it('a chave gerada por chaveDeArquivo sobe no bucket privado', async () => {
    const chave = chaveDeArquivo(NOME_ORIGINAL)
    expect(chave).toBe('Guia de Precos.pdf')

    const { error } = await subir(`${PASTA}/${Date.now()}-${chave}`)
    expect(error).toBeNull()
  }, 30000)

  it('a MESMA chave sem chaveDeArquivo é recusada com InvalidKey', async () => {
    const { error } = await subir(`${PASTA}/${Date.now()}-${NOME_ORIGINAL}`)
    expect(error).toBeTruthy()
    // O corpo cru do Storage é `{"error":"InvalidKey","message":"Invalid key: …"}`;
    // a lib expõe isso como `StorageApiError` com `status` 400 e a mensagem.
    expect((error as { status?: number }).status).toBe(400)
    expect(error!.message).toContain('Invalid key')
  }, 30000)

  it('nome inteiramente não-ASCII vira "arquivo" e sobe', async () => {
    const { error } = await subir(`${PASTA}/${Date.now()}-${chaveDeArquivo('文書.pdf')}`)
    expect(error).toBeNull()
  }, 30000)
})
