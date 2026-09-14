// src/lib/ordem-catalogo.ts
// Regra pura da ordem dos módulos no catálogo de um espaço (sem I/O, testável):
// módulos da marca marcados "antes da base" → conteúdo base → demais módulos da marca.
// Dentro de cada grupo vale a `ordem` definida pelas setas.

export type ModuloOrdenavel = {
  espaco_id: string | null
  antes_da_base: boolean
  ordem: number
}

function grupo(m: ModuloOrdenavel): number {
  if (m.espaco_id === null) return 1
  return m.antes_da_base ? 0 : 2
}

export function ordenarModulosDoCatalogo<T extends ModuloOrdenavel>(modulos: T[]): T[] {
  return [...modulos].sort((a, b) => grupo(a) - grupo(b) || a.ordem - b.ordem)
}
