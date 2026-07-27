import { describe, it, expect } from 'vitest'
import { validarImagem, contentTypeDeMaterial, ehUuid } from '@/lib/upload'

// Constrói um File com os bytes iniciais pedidos e o MIME declarado, para
// simular o que o navegador envia (o MIME é sempre falsificável).
function arquivo(bytes: number[], tipo: string, nome = 'a.png'): File {
  return new File([new Uint8Array([...bytes, ...new Array(20).fill(0)])], nome, { type: tipo })
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]
// '<svg' — o vetor clássico de XSS em bucket público
const SVG = [0x3c, 0x73, 0x76, 0x67]
// '<htm'
const HTML = [0x3c, 0x68, 0x74, 0x6d]

describe('validarImagem', () => {
  it('aceita PNG, JPEG, GIF e WEBP legítimos', async () => {
    for (const [bytes, tipo, ext] of [
      [PNG, 'image/png', 'png'],
      [JPEG, 'image/jpeg', 'jpg'],
      [GIF, 'image/gif', 'gif'],
      [WEBP, 'image/webp', 'webp'],
    ] as const) {
      const r = await validarImagem(arquivo([...bytes], tipo))
      expect(r.ok, tipo).toBe(true)
      if (r.ok) {
        expect(r.imagem.contentType).toBe(tipo)
        expect(r.imagem.extensao).toBe(ext)
      }
    }
  })

  it('rejeita SVG mesmo declarado como imagem', async () => {
    const r = await validarImagem(arquivo(SVG, 'image/svg+xml', 'logo.svg'))
    expect(r.ok).toBe(false)
  })

  it('rejeita HTML disfarçado de PNG (MIME mentiroso)', async () => {
    const r = await validarImagem(arquivo(HTML, 'image/png', 'x.png'))
    expect(r.ok).toBe(false)
  })

  it('rejeita PNG real declarado como outro tipo aceito', async () => {
    const r = await validarImagem(arquivo(PNG, 'image/jpeg'))
    expect(r.ok).toBe(false)
  })

  it('extensão vem do conteúdo, não do nome do arquivo', async () => {
    // Nome com traversal: o caminho final não pode herdar nada dele.
    const r = await validarImagem(arquivo(PNG, 'image/png', 'x.png/../../logos/vitima.png'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.imagem.extensao).toBe('png')
  })
})

describe('contentTypeDeMaterial', () => {
  it('preserva PDF e imagens da whitelist', () => {
    expect(contentTypeDeMaterial(arquivo([], 'application/pdf'))).toBe('application/pdf')
    expect(contentTypeDeMaterial(arquivo([], 'image/png'))).toBe('image/png')
  })

  it('força download em HTML e SVG, neutralizando execução no bucket público', () => {
    expect(contentTypeDeMaterial(arquivo([], 'text/html'))).toBe('application/octet-stream')
    expect(contentTypeDeMaterial(arquivo([], 'image/svg+xml'))).toBe('application/octet-stream')
  })

  it('tipo desconhecido ou ausente vira octet-stream', () => {
    expect(contentTypeDeMaterial(arquivo([], ''))).toBe('application/octet-stream')
    expect(contentTypeDeMaterial(arquivo([], 'application/x-msdownload'))).toBe(
      'application/octet-stream'
    )
  })
})

describe('ehUuid', () => {
  it('aceita UUID válido', () => {
    expect(ehUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true)
  })

  it('rejeita traversal e strings livres usadas em caminho', () => {
    expect(ehUuid('../../logos/vitima')).toBe(false)
    expect(ehUuid('')).toBe(false)
    expect(ehUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301/..')).toBe(false)
  })
})
