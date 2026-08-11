import { describe, it, expect } from 'vitest'
import { ordenarPor, compararValores } from '@/lib/tabela/ordenacao'

type Linha = { nome: string; tempo: number; ultimaAtividade: string | null }

const linhas: Linha[] = [
  { nome: 'Ângela', tempo: 30, ultimaAtividade: '2026-08-01T10:00:00Z' },
  { nome: 'Beatriz', tempo: 120, ultimaAtividade: null },
  { nome: 'Zuleica', tempo: 5, ultimaAtividade: '2026-08-09T10:00:00Z' },
]

const nomes = (l: Linha[]) => l.map((x) => x.nome)

describe('ordenarPor', () => {
  it('ordena número decrescente e crescente', () => {
    expect(nomes(ordenarPor(linhas, 'tempo', 'desc'))).toEqual(['Beatriz', 'Ângela', 'Zuleica'])
    expect(nomes(ordenarPor(linhas, 'tempo', 'asc'))).toEqual(['Zuleica', 'Ângela', 'Beatriz'])
  })

  it('ordena texto respeitando acento do português', () => {
    // Por código de caractere, "Â" cairia depois de "Z" — o que jogaria Ângela
    // para o fim de uma lista A→Z.
    expect(nomes(ordenarPor(linhas, 'nome', 'asc'))).toEqual(['Ângela', 'Beatriz', 'Zuleica'])
  })

  it('mantém vazios no fim nas DUAS direções', () => {
    // Beatriz nunca teve atividade: ela não pode aparecer no topo só porque a
    // ordem foi invertida.
    expect(nomes(ordenarPor(linhas, 'ultimaAtividade', 'desc')).at(-1)).toBe('Beatriz')
    expect(nomes(ordenarPor(linhas, 'ultimaAtividade', 'asc')).at(-1)).toBe('Beatriz')
  })

  it('não modifica a lista recebida', () => {
    const antes = nomes(linhas)
    ordenarPor(linhas, 'tempo', 'asc')
    expect(nomes(linhas)).toEqual(antes)
  })

  it('compara números por valor, e não como texto', () => {
    // Como texto, "10" viria antes de "9".
    expect(compararValores(9, 10)).toBeLessThan(0)
  })
})
