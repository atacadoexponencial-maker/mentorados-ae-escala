'use client'

import { useActionState } from 'react'
import { definirSenha, type EstadoPrimeiroAcesso } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const estadoInicial: EstadoPrimeiroAcesso = { erro: null }

export function PrimeiroAcessoForm() {
  const [estado, acao, pendente] = useActionState(definirSenha, estadoInicial)

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmacao">Confirmar senha</Label>
        <Input id="confirmacao" name="confirmacao" type="password" minLength={8} required />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Criar minha senha'}
      </Button>
    </form>
  )
}
