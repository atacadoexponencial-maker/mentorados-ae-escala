// Está vendo como quem não é revendedora deste espaço (admin ou mentorado dono).
export function ehPreview(revendedorEspacoId: string | null, espacoId: string): boolean {
  return revendedorEspacoId !== espacoId
}
