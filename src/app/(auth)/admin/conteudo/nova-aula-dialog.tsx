'use client'

import { useActionState, useEffect } from 'react'
import { criarAula, type EstadoConteudo } from './actions'
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
import { Textarea } from '@/components/ui/textarea'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

export function NovaAulaDialog({
  modulo,
  onClose,
}: {
  modulo: { id: string; titulo: string } | null
  onClose: () => void
}) {
  const [estado, acao, pendente] = useActionState(criarAula, estadoInicial)

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
              <DialogTitle>Nova aula</DialogTitle>
              <DialogDescription>Aula do módulo &quot;{modulo.titulo}&quot;. Nasce como rascunho.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="aula-titulo">Título</Label>
              <Input id="aula-titulo" name="titulo" placeholder="Ex.: A regra do markup" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aula-descricao">Descrição</Label>
              <Textarea id="aula-descricao" name="descricao" placeholder="O que a revendedora vai aprender" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aula-video">Vídeo (ID no Panda Video)</Label>
              <Input id="aula-video" name="pandaVideoId" placeholder="Ex.: 3f8a2b1c-…" />
            </div>
            {estado.erro && (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Criando…' : 'Criar aula'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
