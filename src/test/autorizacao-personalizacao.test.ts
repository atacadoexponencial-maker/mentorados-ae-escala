import { describe, it, expect } from 'vitest'
import { podeSalvarPersonalizacao } from '@/app/(auth)/mentor/personalizacao/autorizacao'

const admin = { ehAdmin: true, espacoId: null }
const mentorA = { ehAdmin: false, espacoId: 'A' }

describe('podeSalvarPersonalizacao', () => {
  it('admin personaliza qualquer marca', () => {
    expect(podeSalvarPersonalizacao(admin, 'A')).toBe(true)
    expect(podeSalvarPersonalizacao(admin, 'B')).toBe(true)
  })

  it('mentor personaliza só a própria marca', () => {
    expect(podeSalvarPersonalizacao(mentorA, 'A')).toBe(true)
    expect(podeSalvarPersonalizacao(mentorA, 'B')).toBe(false)
  })

  it('base não tem personalização — negada até para admin', () => {
    expect(podeSalvarPersonalizacao(admin, null)).toBe(false)
    expect(podeSalvarPersonalizacao(mentorA, null)).toBe(false)
  })
})
