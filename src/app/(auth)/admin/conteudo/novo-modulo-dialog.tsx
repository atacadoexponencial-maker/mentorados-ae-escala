'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { criarModulo, type EstadoConteudo } from './actions'
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
import { Textarea } from '@/components/ui/textarea'

const estadoInicial: EstadoConteudo = { ok: false, erro: null }

export function NovoModuloDialog({ espacoAlvo }: { espacoAlvo?: string | null }) {
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState<EstadoConteudo>(estadoInicial)
  const [pendente, iniciar] = useTransition()

  function acao(formData: FormData) {
    iniciar(async () => {
      const resultado = await criarModulo(estadoInicial, formData)
      setEstado(resultado)
      if (resultado.ok) setAberto(false)
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Novo módulo
      </DialogTrigger>
      <DialogContent>
        <form action={acao} className="space-y-4">
          <input type="hidden" name="espacoAlvo" value={espacoAlvo ?? ''} />
          <DialogHeader>
            <DialogTitle>Novo módulo</DialogTitle>
            <DialogDescription>
              {espacoAlvo
                ? 'O módulo aparece só neste espaço.'
                : 'O módulo aparece para todos os espaços (base).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="modulo-titulo">Nome</Label>
            <Input id="modulo-titulo" name="titulo" placeholder="Ex.: Precificação e Margem" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modulo-descricao">Descrição</Label>
            <Textarea id="modulo-descricao" name="descricao" placeholder="Sobre o que é este módulo" />
          </div>
          {estado.erro && (
            <p role="alert" className="text-sm text-destructive">
              {estado.erro}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Criando…' : 'Criar módulo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
