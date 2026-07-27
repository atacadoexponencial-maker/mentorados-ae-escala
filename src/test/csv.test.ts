import { describe, it, expect } from 'vitest'
import { escaparCampoCsv } from '@/lib/csv'

describe('escaparCampoCsv', () => {
  it('envolve o valor em aspas e duplica as aspas internas', () => {
    expect(escaparCampoCsv('Curso')).toBe('"Curso"')
    expect(escaparCampoCsv('Curso "top"')).toBe('"Curso ""top"""')
  })

  it('neutraliza fórmula: nome de curso digitado por terceiro não executa', () => {
    // Sem o prefixo, o Excel executaria isso ao abrir o arquivo.
    expect(escaparCampoCsv('=HYPERLINK("http://mal.co","clique")')).toBe(
      '"\'=HYPERLINK(""http://mal.co"",""clique"")"'
    )
    expect(escaparCampoCsv('+1+1')).toBe(`"'+1+1"`)
    expect(escaparCampoCsv('-2+3')).toBe(`"'-2+3"`)
    expect(escaparCampoCsv('@SUM(A1)')).toBe(`"'@SUM(A1)"`)
  })

  it('não mexe em valores comuns do relatório', () => {
    expect(escaparCampoCsv('/marca-exemplo')).toBe('"/marca-exemplo"')
    expect(escaparCampoCsv('ana@exemplo.com')).toBe('"ana@exemplo.com"')
    expect(escaparCampoCsv('')).toBe('""')
  })
})
