'use client'

import { useActionState, useEffect } from 'react'
import { editarMentorado, type EstadoMentorado } from './actions'
import type { MentoradoLinha } from './dados'
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

const estadoInicial: EstadoMentorado = { ok: false, erro: null }

export function EditarMentoradoDialog({
  mentorado,
  onClose,
}: {
  mentorado: MentoradoLinha | null
  onClose: () => void
}) {
  const [estado, acao, pendente] = useActionState(editarMentorado, estadoInicial)

  useEffect(() => {
    if (estado.ok) onClose()
  }, [estado, onClose])

  return (
    <Dialog open={mentorado !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {mentorado && (
          <form action={acao} className="space-y-4">
            <input type="hidden" name="espacoId" value={mentorado.id} />
            <DialogHeader>
              <DialogTitle>Editar mentorado</DialogTitle>
              <DialogDescription>
                Alterar o endereço muda o link usado pelas revendedoras.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input id="edit-nome" name="nome" defaultValue={mentorado.nome} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail (não editável)</Label>
              <Input id="edit-email" value={mentorado.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-marca">Nome da marca</Label>
              <Input id="edit-marca" name="marca" defaultValue={mentorado.marca} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endereco">Endereço do espaço</Label>
              <Input id="edit-endereco" name="endereco" defaultValue={mentorado.slug} required />
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
