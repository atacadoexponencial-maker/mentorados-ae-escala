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
