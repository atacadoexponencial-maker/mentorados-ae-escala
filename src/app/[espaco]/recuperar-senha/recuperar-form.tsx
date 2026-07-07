'use client'

import { useActionState } from 'react'
import { solicitarRedefinicao, type EstadoRecuperacao } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const estadoInicial: EstadoRecuperacao = { enviado: false, erro: null }

export function RecuperarForm({ espacoSlug }: { espacoSlug?: string }) {
  const [estado, acao, pendente] = useActionState(solicitarRedefinicao, estadoInicial)

  if (estado.enviado) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Se este e-mail estiver cadastrado, você vai receber um link de redefinição.
      </p>
    )
  }

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="espacoSlug" value={espacoSlug ?? ''} />
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" placeholder="voce@exemplo.com" required />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Enviando…' : 'Enviar link de redefinição'}
      </Button>
    </form>
  )
}
