'use client'

import { useActionState, useEffect } from 'react'
import { editarAula, type EstadoConteudo } from './actions'
import type { AulaLinha } from './dados'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

export function EditarAulaDialog({
  aula,
  onClose,
}: {
  aula: AulaLinha | null
  onClose: () => void
}) {
  const [estado, acao, pendente] = useActionState(editarAula, estadoInicial)

  useEffect(() => {
    if (estado.ok) onClose()
  }, [estado, onClose])

  return (
    <Dialog open={aula !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {aula && (
          <form action={acao} className="space-y-4">
            <input type="hidden" name="aulaId" value={aula.id} />
            <DialogHeader>
              <DialogTitle>Editar aula</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-aula-titulo">Título</Label>
              <Input id="edit-aula-titulo" name="titulo" defaultValue={aula.titulo} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aula-descricao">Descrição</Label>
              <Textarea
                id="edit-aula-descricao"
                name="descricao"
                defaultValue={aula.descricao ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aula-video">Vídeo (ID no Panda Video)</Label>
              <Input
                id="edit-aula-video"
                name="pandaVideoId"
                defaultValue={aula.pandaVideoId ?? ''}
              />
            </div>
            {estado.erro && (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
