import { notFound } from 'next/navigation'
import { getMockEspaco } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ espaco: string }>
}) {
  const { espaco } = await params
  const dados = getMockEspaco(espaco)
  if (!dados) notFound()

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          {dados.logoUrl ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dados.logoUrl} alt={dados.nomeCurso} className="h-10 w-10 object-contain" />
            </div>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{dados.nomeCurso}</h1>
            <p className="text-sm text-muted-foreground">Acesse sua área de membros</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@exemplo.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" required />
        </div>
        <Button type="button" className="w-full">
          Entrar
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          <span className="cursor-pointer underline">Esqueci minha senha</span>
        </p>
      </form>
    </div>
  )
}
