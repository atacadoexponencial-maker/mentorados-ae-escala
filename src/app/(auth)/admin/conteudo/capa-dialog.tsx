'use client'

import { useActionState, useEffect } from 'react'
import { definirCapa, salvarCapaNoEspaco, type EstadoConteudo } from './actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

// O dialog só precisa disto; AulaLinha satisfaz o formato.
export type AulaCapa = { id: string; titulo: string; capaUrl: string | null }

export function CapaDialog({
  aula,
  espacoId,
  onClose,
}: {
  aula: AulaCapa | null
  espacoId?: string
  onClose: () => void
}) {
  // Com espacoId, a capa é a exceção daquela marca; sem, é a capa base da aula.
  const [estado, acao, pendente] = useActionState(
    espacoId ? salvarCapaNoEspaco : definirCapa,
    estadoInicial
  )

  useEffect(() => {
    if (estado.ok) onClose()
  }, [estado, onClose])

  return (
    <Dialog open={aula !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {aula && (
          <form action={acao} className="space-y-4">
            <input type="hidden" name="aulaId" value={aula.id} />
            {espacoId && <input type="hidden" name="espacoId" value={espacoId} />}
            <DialogHeader>
              <DialogTitle>{espacoId ? 'Capa nesta marca' : 'Capa da aula'}</DialogTitle>
              <DialogDescription>&quot;{aula.titulo}&quot; · imagem de até 2 MB</DialogDescription>
            </DialogHeader>
            {aula.capaUrl && (
              <div className="overflow-hidden rounded-md border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aula.capaUrl} alt="Capa atual" className="max-h-40 w-full object-cover" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="capa-arquivo">Imagem</Label>
              <Input
                id="capa-arquivo"
                name="arquivo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                required
              />
            </div>
            {estado.erro && (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Enviando…' : 'Salvar capa'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
