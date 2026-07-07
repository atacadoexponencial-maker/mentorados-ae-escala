import { notFound } from 'next/navigation'
import { getEspacoPorSlug } from '@/lib/espacos'
import { LoginForm } from './login-form'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ espaco: string }>
}) {
  const { espaco } = await params
  const dados = await getEspacoPorSlug(espaco)
  if (!dados) notFound()

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          {dados.logo_url ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dados.logo_url} alt={dados.nome_curso} className="h-10 w-10 object-contain" />
            </div>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{dados.nome_curso}</h1>
            <p className="text-sm text-muted-foreground">Acesse sua área de membros</p>
          </div>
        </div>
        <LoginForm espacoSlug={dados.slug} />
      </div>
    </div>
  )
}
