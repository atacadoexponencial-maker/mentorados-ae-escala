'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { cadastrarMentorado, type EstadoMentorado } from './actions'
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

const estadoInicial: EstadoMentorado = { ok: false, erro: null }

export function NovoMentoradoDialog() {
  const [aberto, setAberto] = useState(false)
  const [estado, acao, pendente] = useActionState(cadastrarMentorado, estadoInicial)

  useEffect(() => {
    if (estado.ok) setAberto(false)
  }, [estado])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Novo mentorado
      </DialogTrigger>
      <DialogContent>
        <form action={acao} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Novo mentorado</DialogTitle>
            <DialogDescription>
              O convite de primeiro acesso será enviado ao e-mail informado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Nome completo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="email@exemplo.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marca">Nome da marca</Label>
            <Input id="marca" name="marca" placeholder="Ex.: João Atacados" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço do espaço</Label>
            <Input id="endereco" name="endereco" placeholder="Ex.: joao-atacados" required />
          </div>
          {estado.erro && (
            <p role="alert" className="text-sm text-destructive">
              {estado.erro}
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
