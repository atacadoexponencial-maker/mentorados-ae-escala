'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { cadastrarRevendedora, type EstadoRevendedora } from './actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const estadoInicial: EstadoRevendedora = { ok: false, erro: null }

export function NovaRevendedoraDialog() {
  const [aberto, setAberto] = useState(false)
  const [estado, acao, pendente] = useActionState(cadastrarRevendedora, estadoInicial)

  useEffect(() => {
    if (estado.ok && !estado.aviso) setAberto(false)
  }, [estado])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Nova revendedora
      </DialogTrigger>
      <DialogContent>
        <form action={acao} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nova revendedora</DialogTitle>
            <DialogDescription>
              O convite de primeiro acesso será enviado ao e-mail informado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rev-nome">Nome</Label>
            <Input id="rev-nome" name="nome" placeholder="Nome completo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-email">E-mail</Label>
            <Input id="rev-email" name="email" type="email" placeholder="email@exemplo.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-whatsapp">WhatsApp (opcional)</Label>
            <Input id="rev-whatsapp" name="whatsapp" placeholder="(11) 99999-9999" />
          </div>
          {estado.erro && (
            <p role="alert" className="text-sm text-destructive">
              {estado.erro}
            </p>
          )}
          {estado.ok && estado.aviso && (
            <p role="status" className="text-sm text-muted-foreground">
              {estado.aviso}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Cadastrando…' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
