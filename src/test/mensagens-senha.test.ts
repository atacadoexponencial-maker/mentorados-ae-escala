import { describe, it, expect } from 'vitest'
import {
  mensagemDeErroDeSenha,
  ERRO_SENHA_CURTA,
  SENHA_MINIMA,
} from '@/app/[espaco]/primeiro-acesso/mensagens'

// Formato real do erro do SDK: senha fraca traz `reasons`, os demais só `code`.
const senhaFraca = (reasons: string[]) => ({ code: 'weak_password', reasons })

describe('mensagemDeErroDeSenha', () => {
  it('senha vazada diz para trocar, não para tentar de novo', () => {
    const msg = mensagemDeErroDeSenha(senhaFraca(['pwned']))
    expect(msg).toContain('vazamentos')
    // O ponto da correção: "tente novamente" fazia repetir a mesma senha.
    expect(msg.toLowerCase()).not.toContain('tente novamente')
  })

  it('senha curta reaproveita a mesma mensagem da validação local', () => {
    expect(mensagemDeErroDeSenha(senhaFraca(['length']))).toBe(ERRO_SENHA_CURTA)
    expect(ERRO_SENHA_CURTA).toContain(String(SENHA_MINIMA))
  })

  it('exigência de tipos de caractere', () => {
    expect(mensagemDeErroDeSenha(senhaFraca(['characters']))).toContain('letras')
  })

  it('vazada tem prioridade quando vem junto de outro motivo', () => {
    expect(mensagemDeErroDeSenha(senhaFraca(['length', 'pwned']))).toContain('vazamentos')
  })

  it('repetir a senha atual na redefinição', () => {
    expect(mensagemDeErroDeSenha({ code: 'same_password' })).toContain('diferente da atual')
  })

  it('senha fraca sem motivo detalhado', () => {
    expect(mensagemDeErroDeSenha({ code: 'weak_password' })).toContain('fraca')
  })

  it('erro desconhecido, null e formato inesperado caem no texto padrão', () => {
    const padrao = 'Não foi possível salvar a senha. Tente novamente.'
    expect(mensagemDeErroDeSenha({ code: 'unexpected_failure' })).toBe(padrao)
    expect(mensagemDeErroDeSenha(null)).toBe(padrao)
    expect(mensagemDeErroDeSenha(undefined)).toBe(padrao)
    expect(mensagemDeErroDeSenha({ reasons: 'pwned' })).toBe(padrao)
  })
})
