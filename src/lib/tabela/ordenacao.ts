// Regra pura de ordenação de tabela — sem React, sem I/O, para ser testável.
// Mesma separação que `admin/conteudo/autorizacao.ts` usa: a regra mora longe
// da tela que a consome.

export type Direcao = 'asc' | 'desc'

function ehVazio(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === ''
}

// Compara dois valores do mesmo tipo, sempre em ordem crescente. A inversão de
// direção acontece em `ordenarPor`, nunca aqui.
//
// Texto compara com localeCompare em pt-BR porque acento importa: sem isso,
// "Ângela" cai depois de "Zuleica" na ordem de código de caractere.
export function compararValores(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' })
}

// Ordena uma cópia da lista pela chave escolhida.
//
// Valores vazios vão SEMPRE para o fim, nas duas direções — e é de propósito.
// Uma revendedora que nunca assistiu nada não tem "última atividade"; deixá-la
// disputar o topo ao inverter a ordem esconderia justamente quem está engajado,
// que é o que estas tabelas existem para mostrar.
export function ordenarPor<T>(lista: readonly T[], chave: keyof T, direcao: Direcao): T[] {
  const sinal = direcao === 'asc' ? 1 : -1
  const cheios = lista.filter((item) => !ehVazio(item[chave]))
  const vazios = lista.filter((item) => ehVazio(item[chave]))

  const ordenados = [...cheios].sort((a, b) => compararValores(a[chave], b[chave]) * sinal)
  return [...ordenados, ...vazios]
}
