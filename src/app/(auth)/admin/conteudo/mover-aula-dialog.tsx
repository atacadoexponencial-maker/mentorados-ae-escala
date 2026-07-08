'use client'

import { useState, useTransition } from 'react'
import { moverAulaParaModulo } from './actions'
import type { AulaLinha, ModuloLinha } from './dados'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export function MoverAulaDialog({
  aula,
  modulos,
  onClose,
}: {
  aula: AulaLinha | null
  modulos: ModuloLinha[]
  onClose: () => void
}) {
  const destinos = modulos.filter((m) => m.id !== aula?.moduloId)
  const [destinoId, setDestinoId] = useState('')
  const [pendente, iniciarTransicao] = useTransition()

  const mover = () => {
    if (!aula || !destinoId) return
    iniciarTransicao(async () => {
      await moverAulaParaModulo(aula.id, destinoId)
      onClose()
    })
  }

  return (
    <Dialog open={aula !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent>
        {aula && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Mover aula</DialogTitle>
              <DialogDescription>&quot;{aula.titulo}&quot;</DialogDescription>
            </DialogHeader>
            {destinos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não há outro módulo para onde mover. Crie um módulo primeiro.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="modulo-destino">Módulo de destino</Label>
                <select
                  id="modulo-destino"
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Escolha…</option>
                  {destinos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <DialogFooter>
              <Button onClick={mover} disabled={pendente || !destinoId}>
                {pendente ? 'Movendo…' : 'Mover'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
