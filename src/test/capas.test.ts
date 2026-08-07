import { describe, it, expect } from 'vitest'
import { anguloDoDegrade, corDoTextoSobre } from '@/lib/capas'

describe('anguloDoDegrade', () => {
  it('usa a lista fixa de ângulos na ordem, começando na aula 1', () => {
    expect(anguloDoDegrade(1)).toBe(135)
    expect(anguloDoDegrade(2)).toBe(45)
    expect(anguloDoDegrade(5)).toBe(90)
  })

  it('cicla a cada 5 aulas, para módulos longos não pedirem ângulo inexistente', () => {
    expect(anguloDoDegrade(6)).toBe(anguloDoDegrade(1))
    expect(anguloDoDegrade(12)).toBe(anguloDoDegrade(2))
  })

  it('devolve um ângulo válido mesmo para número zero ou negativo', () => {
    // A numeração vem da posição na tela; se algum dia vier 0, o card não pode
    // quebrar com um index undefined.
    expect(anguloDoDegrade(0)).toBeGreaterThanOrEqual(0)
    expect(anguloDoDegrade(-3)).toBeGreaterThanOrEqual(0)
  })
})

describe('corDoTextoSobre', () => {
  it('usa branco sobre cor escura', () => {
    expect(corDoTextoSobre('#171717')).toBe('#ffffff')
    expect(corDoTextoSobre('#1e3a8a')).toBe('#ffffff')
  })

  it('usa quase-preto sobre cor clara, senão o texto some', () => {
    expect(corDoTextoSobre('#facc15')).toBe('#171717') // amarelo
    expect(corDoTextoSobre('#ffffff')).toBe('#171717')
  })

  it('entende hex de 3 dígitos', () => {
    expect(corDoTextoSobre('#fff')).toBe('#171717')
    expect(corDoTextoSobre('#000')).toBe('#ffffff')
  })

  it('cai em branco quando a cor é nula ou inválida', () => {
    // cor_primaria vem do banco e pode estar vazia ou preenchida errado.
    expect(corDoTextoSobre(null)).toBe('#ffffff')
    expect(corDoTextoSobre('roxo')).toBe('#ffffff')
    expect(corDoTextoSobre('')).toBe('#ffffff')
  })
})
