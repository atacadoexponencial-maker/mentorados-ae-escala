'use client'

import { useActionState, useState } from 'react'
import { Upload } from 'lucide-react'
import { importarRevendedoras, type EstadoRevendedora } from './actions'
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
import { Textarea } from '@/components/ui/textarea'

const estadoInicial: EstadoRevendedora = { ok: false, erro: null }

export function ImportarDialog() {
  const [aberto, setAberto] = useState(false)
  const [estado, acao, pendente] = useActionState(importarRevendedoras, estadoInicial)

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="mr-2 h-4 w-4" />
        Importar lista
      </DialogTrigger>
      <DialogContent>
        <form action={acao} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Importar lista de revendedoras</DialogTitle>
            <DialogDescription>
              Cole uma revendedora por linha, no formato: nome, e-mail
            </DialogDescription>
          </DialogHeader>
          <Textarea
            name="lista"
            placeholder={'Fernanda Alves, fernanda@gmail.com\nPatrícia Gomes, pati@hotmail.com'}
            rows={8}
            required
          />
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
              {pendente ? 'Importando…' : 'Importar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
