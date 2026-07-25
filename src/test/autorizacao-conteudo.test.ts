import { describe, it, expect } from 'vitest'
import { podeGerenciarEspaco } from '@/app/(auth)/admin/conteudo/autorizacao'

const admin = { ehAdmin: true, espacoId: null }
const mentorA = { ehAdmin: false, espacoId: 'A' }

describe('podeGerenciarEspaco', () => {
  it('admin gerencia qualquer espaço (base, A, B)', () => {
    expect(podeGerenciarEspaco(admin, null)).toBe(true)
    expect(podeGerenciarEspaco(admin, 'A')).toBe(true)
    expect(podeGerenciarEspaco(admin, 'B')).toBe(true)
  })

  it('mentor gerencia só o próprio; negado em outro espaço e na base', () => {
    expect(podeGerenciarEspaco(mentorA, 'A')).toBe(true)
    expect(podeGerenciarEspaco(mentorA, 'B')).toBe(false)
    expect(podeGerenciarEspaco(mentorA, null)).toBe(false)
  })
})
