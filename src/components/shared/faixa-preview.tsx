import { Eye } from 'lucide-react'

// Mostrada para quem não é revendedora deste espaço (admin ou mentorado dono).
export function FaixaPreview() {
  return (
    <div className="flex items-center justify-center gap-2 bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>Pré-visualização — é assim que a revendedora vê este espaço.</span>
    </div>
  )
}
