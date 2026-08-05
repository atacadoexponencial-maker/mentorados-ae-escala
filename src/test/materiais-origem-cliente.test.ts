import { describe, it, expect } from 'vitest'
import { materialParaCliente } from '@/lib/materiais/regras'

// Caminho interno típico de um material de arquivo dentro do bucket privado.
// É esta string que jamais pode sobreviver à conversão para o cliente.
const CAMINHO_INTERNO = 'aula-1/1717171717-Guia de Precos.pdf'

describe('materialParaCliente', () => {
  it('mantém a url original no ramo "link"', () => {
    expect(
      materialParaCliente({
        id: 'm1',
        nome: 'Planilha',
        url: 'https://exemplo.com/a.pdf',
        origem: 'link',
      })
    ).toEqual({ id: 'm1', nome: 'Planilha', origem: 'link', url: 'https://exemplo.com/a.pdf' })
  })

  it('descarta o caminho interno no ramo "arquivo" — a chave nem existe', () => {
    const resultado = materialParaCliente({
      id: 'm2',
      nome: 'Guia de Preços',
      url: CAMINHO_INTERNO,
      origem: 'arquivo',
    })

    // Ausência da chave, não `url: undefined`: `undefined` some no JSON, mas
    // continuaria visível ao código do cliente e a qualquer serializador futuro.
    expect('url' in resultado).toBe(false)
    expect(JSON.stringify(resultado)).not.toContain('1717171717-Guia de Precos.pdf')
  })

  it('o ramo "arquivo" tem exatamente id, nome e origem', () => {
    const resultado = materialParaCliente({
      id: 'm3',
      nome: 'Checklist',
      url: CAMINHO_INTERNO,
      origem: 'arquivo',
    })
    expect(Object.keys(resultado).sort()).toEqual(['id', 'nome', 'origem'])
  })

  it('origem fora do vocabulário cai no ramo sem url', () => {
    for (const origem of ['externo', '', 'LINK', 'arquivo ', 'null']) {
      const resultado = materialParaCliente({
        id: 'm4',
        nome: 'Suspeito',
        url: CAMINHO_INTERNO,
        origem,
      })
      expect(resultado.origem, origem).toBe('arquivo')
      expect('url' in resultado, origem).toBe(false)
      expect(JSON.stringify(resultado), origem).not.toContain('1717171717')
    }
  })

  it('é pura: mesma entrada, mesma saída, sem mutar a linha', () => {
    const linha = { id: 'm5', nome: 'Guia', url: CAMINHO_INTERNO, origem: 'arquivo' }
    expect(materialParaCliente(linha)).toEqual(materialParaCliente(linha))
    expect(linha).toEqual({ id: 'm5', nome: 'Guia', url: CAMINHO_INTERNO, origem: 'arquivo' })
  })
})
