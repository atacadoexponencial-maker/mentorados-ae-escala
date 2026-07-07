import { notFound } from 'next/navigation'
import { getEspacoPorSlug } from '@/lib/espacos'
import { RecuperarForm } from './recuperar-form'

export default async function RecuperarSenhaPage({
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
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">{dados.nome_curso}</h1>
          <p className="text-sm text-muted-foreground">
            Informe seu e-mail para receber o link de redefinição de senha
          </p>
        </div>
        <RecuperarForm espacoSlug={dados.slug} />
      </div>
    </div>
  )
}
