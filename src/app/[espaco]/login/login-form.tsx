'use client'

import { useActionState } from 'react'
import { fazerLogin, type EstadoLogin } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const estadoInicial: EstadoLogin = { erro: null }

export function LoginForm() {
  const [estado, acao, pendente] = useActionState(fazerLogin, estadoInicial)

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" placeholder="voce@exemplo.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" required />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <span className="cursor-pointer underline">Esqueci minha senha</span>
      </p>
    </form>
  )
}
