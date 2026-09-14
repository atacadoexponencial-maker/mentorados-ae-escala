import { describe, it, expect } from 'vitest'
import {
  podeGerenciarEspaco,
  podeMarcarAntesDaBase,
} from '@/app/(auth)/admin/conteudo/autorizacao'

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

describe('podeMarcarAntesDaBase', () => {
  it('admin marca módulo de qualquer marca, mas não módulo da base', () => {
    expect(podeMarcarAntesDaBase(admin, 'A')).toBe(true)
    expect(podeMarcarAntesDaBase(admin, 'B')).toBe(true)
    expect(podeMarcarAntesDaBase(admin, null)).toBe(false)
  })

  it('mentor não marca nem no próprio espaço', () => {
    expect(podeMarcarAntesDaBase(mentorA, 'A')).toBe(false)
    expect(podeMarcarAntesDaBase(mentorA, null)).toBe(false)
  })
})
