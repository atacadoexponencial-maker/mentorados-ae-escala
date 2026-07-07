import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Play } from 'lucide-react'
import {
  formatarDuracao,
  getMockEspaco,
  mockAulas,
  mockModulos,
  mockProgressoRevendedor,
} from '@/lib/mock-data'
import { EspacoHeader } from '@/components/shared/espaco-header'
import { Button } from '@/components/ui/button'

export default async function CatalogoPage({
  params,
}: {
  params: Promise<{ espaco: string }>
}) {
  const { espaco } = await params
  const dados = getMockEspaco(espaco)
  if (!dados) notFound()

  const { concluidasIds, emAndamentoAulaId } = mockProgressoRevendedor
  const concluidas = new Set(concluidasIds)
  const aulaEmAndamento = emAndamentoAulaId
    ? mockAulas.find((a) => a.id === emAndamentoAulaId && a.status === 'publicada')
    : undefined

  const modulosOrdenados = [...mockModulos].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="flex min-h-screen flex-col">
      <EspacoHeader espaco={dados} />

      <div className="mx-auto w-full max-w-7xl px-4 pt-6">
        <div
          className="flex aspect-[2400/960] w-full items-center overflow-hidden rounded-lg border border-border px-8 sm:max-h-[412px]"
          style={{
            background: `linear-gradient(120deg, ${dados.corPrimaria ?? '#171717'}, ${
              dados.corDestaque ?? '#525252'
            })`,
          }}
        >
          <div>
            <h1 className="text-2xl font-black text-white sm:text-4xl">{dados.nomeCurso}</h1>
            <p className="mt-1 text-sm text-white/80">Treinamento oficial para revendedoras</p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <div className="space-y-12">
          {aulaEmAndamento && (
            <section>
              <h2 className="mb-4 text-lg font-bold tracking-tight sm:text-2xl">
                Continuar assistindo
              </h2>
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded bg-muted text-2xl font-black text-muted-foreground/40">
                  {aulaEmAndamento.titulo.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{aulaEmAndamento.titulo}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatarDuracao(aulaEmAndamento.duracaoSegundos)}
                  </p>
                </div>
                <Button
                  render={<Link href={`/${dados.slug}/aula/${aulaEmAndamento.id}`} />}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Continuar
                </Button>
              </div>
            </section>
          )}

          {modulosOrdenados.map((modulo) => {
            const aulas = mockAulas
              .filter((a) => a.moduloId === modulo.id && a.status === 'publicada')
              .sort((a, b) => a.ordem - b.ordem)
            if (aulas.length === 0) return null
            const totalConcluidas = aulas.filter((a) => concluidas.has(a.id)).length
            return (
              <section key={modulo.id}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 className="text-lg font-bold tracking-tight sm:text-3xl">{modulo.titulo}</h2>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {totalConcluidas} de {aulas.length}{' '}
                    {aulas.length === 1 ? 'aula concluída' : 'aulas concluídas'}
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {aulas.map((aula) => (
                    <Link
                      key={aula.id}
                      href={`/${dados.slug}/aula/${aula.id}`}
                      className="block w-[180px] shrink-0 sm:w-[200px]"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
                        <div className="flex h-full items-center justify-center text-4xl font-black text-muted-foreground/40">
                          {aula.titulo.charAt(0)}
                        </div>
                        {concluidas.has(aula.id) && (
                          <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </span>
                        )}
                        <span className="absolute bottom-2 right-2 rounded bg-background/90 px-1.5 py-0.5 text-xs tabular-nums">
                          {formatarDuracao(aula.duracaoSegundos)}
                        </span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-medium">{aula.titulo}</h3>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
