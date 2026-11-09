import { describe, it, expect } from 'vitest'
import { urlComVersao } from '@/lib/upload'

const URL_BASE =
  'https://exemplo.supabase.co/storage/v1/object/public/conteudo/capas/abc.png'

describe('urlComVersao', () => {
  it('mantém o endereço do arquivo e acrescenta a versão no fim', () => {
    expect(urlComVersao(URL_BASE, 1731190000000)).toBe(`${URL_BASE}?v=1731190000000`)
  })

  it('gera endereços diferentes para uploads em momentos diferentes', () => {
    expect(urlComVersao(URL_BASE, 1)).not.toBe(urlComVersao(URL_BASE, 2))
  })

  it('usa o horário atual quando não recebe um', () => {
    const antes = Date.now()
    const v = Number(new URL(urlComVersao(URL_BASE)).searchParams.get('v'))
    expect(v).toBeGreaterThanOrEqual(antes)
    expect(v).toBeLessThanOrEqual(Date.now())
  })
})
