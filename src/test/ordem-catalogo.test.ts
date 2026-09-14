import { describe, it, expect } from 'vitest'
import { ordenarModulosDoCatalogo } from '@/lib/ordem-catalogo'

const base = (titulo: string, ordem: number) => ({ titulo, ordem, espaco_id: null, antes_da_base: false })
const marca = (titulo: string, ordem: number, antes_da_base = false) => ({
  titulo,
  ordem,
  espaco_id: 'A',
  antes_da_base,
})

const titulos = (lista: { titulo: string }[]) => lista.map((m) => m.titulo)

describe('ordenarModulosDoCatalogo', () => {
  it('sem marcação: base primeiro, depois a marca, cada grupo pela ordem', () => {
    const r = ordenarModulosDoCatalogo([marca('M2', 2), base('B2', 2), marca('M1', 1), base('B1', 1)])
    expect(titulos(r)).toEqual(['B1', 'B2', 'M1', 'M2'])
  })

  it('módulo da marca marcado vem antes da base; os demais da marca seguem depois', () => {
    const r = ordenarModulosDoCatalogo([
      base('Comece Aqui', 1),
      base('Base Lucrativa', 2),
      marca('Precificação', 1),
      marca('Sejam bem vindas', 2, true),
    ])
    expect(titulos(r)).toEqual(['Sejam bem vindas', 'Comece Aqui', 'Base Lucrativa', 'Precificação'])
  })

  it('vários marcados respeitam a ordem entre si', () => {
    const r = ordenarModulosDoCatalogo([marca('X', 3, true), base('B', 1), marca('Y', 1, true)])
    expect(titulos(r)).toEqual(['Y', 'X', 'B'])
  })

  it('não altera a lista recebida', () => {
    const lista = [marca('M', 1), base('B', 1)]
    ordenarModulosDoCatalogo(lista)
    expect(titulos(lista)).toEqual(['M', 'B'])
  })
})
