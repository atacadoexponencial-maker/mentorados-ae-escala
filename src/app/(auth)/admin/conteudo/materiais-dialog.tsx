'use client'

import { useActionState, useTransition } from 'react'
import { FileText, Link2, Trash2 } from 'lucide-react'
import {
  adicionarMaterialArquivo,
  adicionarMaterialLink,
  removerMaterial,
  type EstadoConteudo,
} from './actions'
import type { AulaLinha } from './dados'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

export function MateriaisDialog({
  aula,
  onClose,
}: {
  aula: AulaLinha | null
  onClose: () => void
}) {
  const [estadoArquivo, acaoArquivo, pendenteArquivo] = useActionState(
    adicionarMaterialArquivo,
    estadoInicial
  )
  const [estadoLink, acaoLink, pendenteLink] = useActionState(adicionarMaterialLink, estadoInicial)
  const [removendo, iniciarRemocao] = useTransition()

  return (
    <Dialog open={aula !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {aula && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Materiais da aula</DialogTitle>
              <DialogDescription>&quot;{aula.titulo}&quot;</DialogDescription>
            </DialogHeader>

            {aula.materiais.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material anexado.</p>
            ) : (
              <ul className="space-y-2">
                {aula.materiais.map((material) => (
                  <li key={material.id} className="flex items-center justify-between gap-2 text-sm">
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {material.nome}
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${material.nome}`}
                      disabled={removendo}
                      onClick={() => iniciarRemocao(() => removerMaterial(material.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Separator />

            <form action={acaoArquivo} className="space-y-2">
              <input type="hidden" name="aulaId" value={aula.id} />
              <Label htmlFor="material-arquivo">Anexar arquivo (até 20 MB)</Label>
              <div className="flex items-center gap-2">
                <Input id="material-arquivo" name="arquivo" type="file" required />
                <Button type="submit" variant="outline" disabled={pendenteArquivo}>
                  {pendenteArquivo ? 'Enviando…' : 'Anexar'}
                </Button>
              </div>
              {estadoArquivo.erro && (
                <p role="alert" className="text-sm text-destructive">
                  {estadoArquivo.erro}
                </p>
              )}
            </form>

            <form action={acaoLink} className="space-y-2">
              <input type="hidden" name="aulaId" value={aula.id} />
              <Label>Ou anexar link</Label>
              <div className="flex items-center gap-2">
                <Input name="nome" placeholder="Nome" required className="max-w-36" />
                <Input name="url" type="url" placeholder="https://…" required />
                <Button type="submit" variant="outline" disabled={pendenteLink}>
                  <Link2 className="mr-1 h-4 w-4" />
                  {pendenteLink ? '…' : 'Anexar'}
                </Button>
              </div>
              {estadoLink.erro && (
                <p role="alert" className="text-sm text-destructive">
                  {estadoLink.erro}
                </p>
              )}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
