import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Play } from 'lucide-react'
import {
  formatarDuracao,
  mockAulas,
  mockModulos,
  mockProgressoRevendedor,
} from '@/lib/mock-data'
import { getEspacoPorSlug } from '@/lib/espacos'
import { EspacoHeader } from '@/components/shared/espaco-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AulaPage({
  params,
}: {
  params: Promise<{ espaco: string; aulaId: string }>
}) {
  const { espaco, aulaId } = await params
  const dados = await getEspacoPorSlug(espaco)
  if (!dados) notFound()

  // Mesma ordenação do catálogo: módulos em ordem, aulas publicadas em ordem
  const ordemModulos = new Map(mockModulos.map((m) => [m.id, m.ordem]))
  const publicadas = mockAulas
    .filter((a) => a.status === 'publicada')
    .sort(
      (a, b) =>
        (ordemModulos.get(a.moduloId) ?? 0) - (ordemModulos.get(b.moduloId) ?? 0) ||
        a.ordem - b.ordem
    )

  const indice = publicadas.findIndex((a) => a.id === aulaId)
  if (indice === -1) notFound()

  const aula = publicadas[indice]
  const anterior = indice > 0 ? publicadas[indice - 1] : null
  const proxima = indice < publicadas.length - 1 ? publicadas[indice + 1] : null
  const concluida = mockProgressoRevendedor.concluidasIds.includes(aula.id)
  const modulo = mockModulos.find((m) => m.id === aula.moduloId)

  return (
    <div className="flex min-h-screen flex-col">
      <EspacoHeader espaco={dados} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link
          href={`/${dados.slug}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <div
          className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Play className="h-8 w-8 text-white" />
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{aula.titulo}</h1>
            {concluida && (
              <Badge>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Concluída
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {modulo?.titulo} · {formatarDuracao(aula.duracaoSegundos)}
          </p>
          <p className="text-sm leading-relaxed">{aula.descricao}</p>
        </div>

        {aula.materiais.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Materiais da aula</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aula.materiais.map((material) => (
                  <li key={material.nome}>
                    <button className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {material.nome}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          {anterior ? (
            <Button
              variant="outline"
              render={<Link href={`/${dados.slug}/aula/${anterior.id}`} />}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Aula anterior
            </Button>
          ) : (
            <span />
          )}
          {proxima ? (
            <Button render={<Link href={`/${dados.slug}/aula/${proxima.id}`} />}>
              Próxima aula
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <span />
          )}
        </div>
      </main>
    </div>
  )
}
