import { describe, it, expect } from 'vitest'
import { LIMITES, erroDeTamanho } from '@/lib/upload'

function arquivoDe(bytes: number): File {
  return new File([new Uint8Array(bytes)], 'a.png', { type: 'image/png' })
}

describe('erroDeTamanho', () => {
  it('aceita arquivo dentro do limite e exatamente no limite', () => {
    expect(erroDeTamanho(arquivoDe(1024), LIMITES.logo, 'A logo')).toBeNull()
    expect(erroDeTamanho(arquivoDe(LIMITES.logo), LIMITES.logo, 'A logo')).toBeNull()
  })

  it('recusa acima do limite dizendo o tamanho real e o permitido', () => {
    const msg = erroDeTamanho(arquivoDe(LIMITES.logo + 1024 * 512), LIMITES.logo, 'A logo')
    expect(msg).toContain('A logo')
    expect(msg).toContain('2,5 MB') // tamanho do arquivo
    expect(msg).toContain('2,0 MB') // máximo permitido
  })

  it('usa o rótulo recebido, para a mensagem citar o campo certo', () => {
    expect(erroDeTamanho(arquivoDe(LIMITES.banner + 1), LIMITES.banner, 'O banner')).toContain(
      'O banner'
    )
  })
})

describe('LIMITES', () => {
  // O bodySizeLimit em next.config.ts é 22mb; se algum limite passar disso, o
  // upload volta a falhar com o erro genérico do Next em vez da mensagem boa.
  it('nenhum limite ultrapassa o bodySizeLimit configurado', () => {
    const bodySizeLimitMB = 22
    for (const [nome, bytes] of Object.entries(LIMITES)) {
      expect(bytes / 1024 / 1024, nome).toBeLessThan(bodySizeLimitMB)
    }
  })

  it('logo e banner juntos cabem no bodySizeLimit (vão no mesmo formulário)', () => {
    expect((LIMITES.logo + LIMITES.banner) / 1024 / 1024).toBeLessThan(22)
  })
})
