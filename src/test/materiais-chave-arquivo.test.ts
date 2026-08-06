import { describe, it, expect } from 'vitest'
import { chaveDeArquivo } from '@/lib/materiais/regras'

// O que o Supabase Storage aceita no segmento final da chave, medido por curl
// contra o projeto real: ASCII alfanumérico, ponto, sublinhado, hífen e espaço.
// Qualquer coisa fora disso devolve 400 InvalidKey no upload.
const ACEITO = /^[A-Za-z0-9._ -]+$/

describe('chaveDeArquivo', () => {
  it('troca acento por ASCII preservando a legibilidade', () => {
    expect(chaveDeArquivo('Guia de Preços.pdf')).toBe('Guia de Precos.pdf')
    expect(chaveDeArquivo('Relatório-Ação_2026.xlsx')).toBe('Relatorio-Acao_2026.xlsx')
    expect(chaveDeArquivo('Ficha de Inscrição.docx')).toBe('Ficha de Inscricao.docx')
  })

  it('cai em "arquivo" quando não sobra nada identificável', () => {
    expect(chaveDeArquivo('文書.pdf')).toBe('arquivo')
    expect(chaveDeArquivo('.txt')).toBe('arquivo')
    expect(chaveDeArquivo('документ')).toBe('arquivo')
    expect(chaveDeArquivo('')).toBe('arquivo')
  })

  it('mantém o espaço, que o Storage aceita', () => {
    expect(chaveDeArquivo('arquivo com espaço.txt')).toBe('arquivo com espaco.txt')
  })

  it('entrada já ASCII sai idêntica', () => {
    for (const n of ['Checklist.pdf', 'guia_de-vendas v2.zip', 'a1.png', 'SEM-EXTENSAO']) {
      expect(chaveDeArquivo(n)).toBe(n)
    }
  })

  it('não reintroduz caractere proibido e nunca devolve algo fora da whitelist', () => {
    for (const n of [
      'Guia de Preços.pdf',
      '文書.pdf',
      'aspas "duplas" e #hash?query%50.pdf',
      'ĄĆĘŁŃÓŚŹŻ.txt',
      'emoji 🎉 aqui.pdf',
      '«»‹›.txt',
      'a'.repeat(220) + '.pdf',
    ]) {
      const chave = chaveDeArquivo(n)
      expect(chave, n).toMatch(ACEITO)
    }
  })

  it('não cria separador de pasta — nenhuma barra sobrevive', () => {
    // `sanitizarNomeArquivo` já troca `/` e `\` por `_` antes; aqui é a segunda
    // linha de defesa, caso a ordem de composição mude por engano.
    expect(chaveDeArquivo('../../etc/passwd')).not.toContain('/')
    expect(chaveDeArquivo('..\\..\\windows\\system32')).not.toContain('\\')
  })

  it('é pura: mesma entrada, mesma saída, sem tocar no original', () => {
    const nome = 'Guia de Preços.pdf'
    expect(chaveDeArquivo(nome)).toBe(chaveDeArquivo(nome))
    expect(nome).toBe('Guia de Preços.pdf')
  })
})
