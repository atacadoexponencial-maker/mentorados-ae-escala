// Escape de campo CSV usado pelos dois exports de dashboard.
//
// Além das aspas, neutraliza injeção de fórmula: Excel e Google Sheets tratam
// um campo iniciado por `=`, `+`, `-` ou `@` como fórmula ao abrir o arquivo.
// Como nome de curso e nome de revendedora são digitados por terceiros e o
// arquivo é aberto por quem administra, o prefixo com aspa simples faz a
// planilha ler o valor como texto.
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/

export function escaparCampoCsv(valor: string): string {
  const seguro = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor
  return `"${seguro.replaceAll('"', '""')}"`
}
