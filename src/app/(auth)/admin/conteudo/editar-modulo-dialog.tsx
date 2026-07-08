'use client'

import { useActionState, useEffect } from 'react'
import { editarModulo, type EstadoConteudo } from './actions'
import type { ModuloLinha } from './dados'
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

export function EditarModuloDialog({
  modulo,
  onClose,
}: {
  modulo: ModuloLinha | null
  onClose: () => void
}) {
  const [estado, acao, pendente] = useActionState(editarModulo, estadoInicial)

  useEffect(() => {
    if (estado.ok) onClose()
  }, [estado, onClose])

  return (
    <Dialog open={modulo !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {modulo && (
          <form action={acao} className="space-y-4">
            <input type="hidden" name="moduloId" value={modulo.id} />
            <DialogHeader>
              <DialogTitle>Editar módulo</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-modulo-titulo">Nome</Label>
              <Input id="edit-modulo-titulo" name="titulo" defaultValue={modulo.titulo} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-modulo-descricao">Descrição</Label>
              <Textarea
                id="edit-modulo-descricao"
                name="descricao"
                defaultValue={modulo.descricao ?? ''}
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
