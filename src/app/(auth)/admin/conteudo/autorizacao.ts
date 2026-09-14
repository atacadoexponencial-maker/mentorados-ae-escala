// Regra pura de autorização de escrita de conteúdo (sem I/O, sem server-only),
// para ser importável em testes. Admin gerencia qualquer espaço; mentorado só o
// próprio. O isolamento mentorado↔mentorado depende disto.

export type EscopoConteudo = { ehAdmin: boolean; espacoId: string | null }

export function podeGerenciarEspaco(
  escopo: EscopoConteudo,
  alvoEspacoId: string | null
): boolean {
  if (escopo.ehAdmin) return true
  return (alvoEspacoId ?? null) === escopo.espacoId
}

// Colocar um módulo antes do conteúdo base é decisão só do admin, e só vale
// para módulo de um espaço (a base não tem "antes da base").
export function podeMarcarAntesDaBase(
  escopo: EscopoConteudo,
  moduloEspacoId: string | null
): boolean {
  return escopo.ehAdmin && (moduloEspacoId ?? null) !== null
}
