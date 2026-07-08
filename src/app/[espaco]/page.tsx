import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CheckCircle2, Play } from 'lucide-react'
import { getEspacoPorSlug } from '@/lib/espacos'
import { getVinculoDoUsuario } from '@/lib/vinculo'
import { formatarDuracao } from '@/lib/mock-data'
import { createClient } from '@/integrations/supabase/server'
import { EspacoHeader } from '@/components/shared/espaco-header'
import { Button } from '@/components/ui/button'

export default async function CatalogoPage({
  params,
}: {
  params: Promise<{ espaco: string }>
}) {
  const { espaco } = await params
  const dados = await getEspacoPorSlug(espaco)
  if (!dados) notFound()

  const vinculo = await getVinculoDoUsuario()
  if (!vinculo) redirect(`/${dados.slug}/login`)

  // Revendedora só enxerga o próprio espaço; mentorado/admin podem visualizar
  if (
    vinculo.revendedor &&
    !vinculo.roles.has('admin') &&
    !vinculo.roles.has('mentorado') &&
    vinculo.revendedor.espacoSlug !== dados.slug
  ) {
    redirect(`/${vinculo.revendedor.espacoSlug}`)
  }

  // Client da sessão: a RLS garante que revendedora só vê aulas publicadas
  // e apenas as próprias visualizações
  const supabase = await createClient()
  const [{ data: modulos }, { data: aulas }, { data: visualizacoes }] = await Promise.all([
    supabase.from('modulos').select('id, titulo, ordem').order('ordem'),
    supabase
      .from('aulas')
      .select('id, modulo_id, titulo, capa_url, duracao_segundos, ordem, publicada')
      .eq('publicada', true)
      .order('ordem'),
    supabase
      .from('aula_visualizacoes')
      .select('aula_id, ultima_posicao, concluida_em, updated_at')
      .eq('user_id', vinculo.userId)
      .order('updated_at', { ascending: false }),
  ])

  const concluidas = new Set(
    (visualizacoes ?? []).filter((v) => v.concluida_em).map((v) => v.aula_id)
  )
  const emAndamento = (visualizacoes ?? []).find(
    (v) => !v.concluida_em && v.ultima_posicao > 0
  )
  const aulaEmAndamento = emAndamento
    ? (aulas ?? []).find((a) => a.id === emAndamento.aula_id)
    : undefined

  const modulosComAulas = (modulos ?? [])
    .map((m) => ({ ...m, aulas: (aulas ?? []).filter((a) => a.modulo_id === m.id) }))
    .filter((m) => m.aulas.length > 0)

  return (
    <div className="flex min-h-screen flex-col">
      <EspacoHeader espaco={dados} emailUsuario={vinculo.email ?? undefined} />

      <div className="mx-auto w-full max-w-7xl px-4 pt-6">
        <div
          className="flex aspect-[2400/960] w-full items-center overflow-hidden rounded-lg border border-border px-8 sm:max-h-[412px]"
          style={{
            background: `linear-gradient(120deg, ${dados.cor_primaria ?? '#171717'}, ${
              dados.cor_destaque ?? '#525252'
            })`,
          }}
        >
          <div>
            <h1 className="text-2xl font-black text-white sm:text-4xl">{dados.nome_curso}</h1>
            <p className="mt-1 text-sm text-white/80">Treinamento oficial para revendedoras</p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        {modulosComAulas.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">As primeiras aulas chegam em breve!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {aulaEmAndamento && (
              <section>
                <h2 className="mb-4 text-lg font-bold tracking-tight sm:text-2xl">
                  Continuar assistindo
                </h2>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
                  <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-2xl font-black text-muted-foreground/40">
                    {aulaEmAndamento.capa_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={aulaEmAndamento.capa_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      aulaEmAndamento.titulo.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{aulaEmAndamento.titulo}</h3>
                    <p className="text-sm text-muted-foreground">
                      {aulaEmAndamento.duracao_segundos
                        ? formatarDuracao(aulaEmAndamento.duracao_segundos)
                        : ''}
                    </p>
                  </div>
                  <Button render={<Link href={`/${dados.slug}/aula/${aulaEmAndamento.id}`} />}>
                    <Play className="mr-2 h-4 w-4" />
                    Continuar
                  </Button>
                </div>
              </section>
            )}

            {modulosComAulas.map((modulo) => {
              const totalConcluidas = modulo.aulas.filter((a) => concluidas.has(a.id)).length
              return (
                <section key={modulo.id}>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <h2 className="text-lg font-bold tracking-tight sm:text-3xl">
                      {modulo.titulo}
                    </h2>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {totalConcluidas} de {modulo.aulas.length}{' '}
                      {modulo.aulas.length === 1 ? 'aula concluída' : 'aulas concluídas'}
                    </span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {modulo.aulas.map((aula) => (
                      <Link
                        key={aula.id}
                        href={`/${dados.slug}/aula/${aula.id}`}
                        className="block w-[180px] shrink-0 sm:w-[200px]"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
                          {aula.capa_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={aula.capa_url}
                              alt={aula.titulo}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-4xl font-black text-muted-foreground/40">
                              {aula.titulo.charAt(0)}
                            </div>
                          )}
                          {concluidas.has(aula.id) && (
                            <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </span>
                          )}
                          {aula.duracao_segundos ? (
                            <span className="absolute bottom-2 right-2 rounded bg-background/90 px-1.5 py-0.5 text-xs tabular-nums">
                              {formatarDuracao(aula.duracao_segundos)}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-medium">{aula.titulo}</h3>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
