import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CheckCircle2, Play } from 'lucide-react'
import { getEspacoPorSlug } from '@/lib/espacos'
import { getVinculoDoUsuario } from '@/lib/vinculo'
import { ehPreview } from '@/lib/preview'
import { formatarDuracao } from '@/lib/mock-data'
import { createClient } from '@/integrations/supabase/server'
import { carregarCatalogo } from '@/lib/catalogo'
import { CapaAula } from '@/components/shared/capa-aula'
import { EspacoHeader } from '@/components/shared/espaco-header'
import { FaixaPreview } from '@/components/shared/faixa-preview'
import { CartaoBoasVindas } from '@/components/shared/onboarding/cartao-boas-vindas'
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

  const preview = ehPreview(vinculo.revendedor?.espacoId ?? null, dados.id)

  // Client da sessão: a RLS garante que revendedora só vê aulas publicadas
  // e apenas as próprias visualizações
  const supabase = await createClient()
  const [modulosComTodasAulas, { data: visualizacoes }] = await Promise.all([
    carregarCatalogo(dados.id),
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

  const todasAulas = modulosComTodasAulas.flatMap((m) => m.aulas)
  const aulaEmAndamento = emAndamento
    ? todasAulas.find((a) => a.id === emAndamento.aula_id)
    : undefined

  const modulosComAulas = modulosComTodasAulas.filter((m) => m.aulas.length > 0)

  // O número mostrado é a posição da aula dentro do módulo na tela, a mesma
  // contagem usada na fileira - assim os dois lugares nunca discordam.
  const posicaoEmAndamento = aulaEmAndamento
    ? modulosComAulas
        .find((m) => m.id === aulaEmAndamento.moduloId)
        ?.aulas.findIndex((a) => a.id === aulaEmAndamento.id)
    : undefined
  const numeroEmAndamento =
    posicaoEmAndamento === undefined || posicaoEmAndamento < 0 ? 1 : posicaoEmAndamento + 1

  // Só a revendedora dona da conta vê as boas-vindas, e só enquanto a marca de
  // visto estiver vazia. Mentorada e admin visitando o espaço não são o público.
  const mostrarBoasVindas = Boolean(vinculo.revendedor && !vinculo.revendedor.onboardingVistoEm)
  const primeiraAula = modulosComAulas[0]?.aulas[0]

  return (
    <div className="flex min-h-screen flex-col">
      {mostrarBoasVindas && (
        <CartaoBoasVindas
          nomeCurso={dados.nome_curso}
          logoUrl={dados.logo_url}
          corPrimaria={dados.cor_primaria}
          primeiraAulaHref={primeiraAula ? `/${dados.slug}/aula/${primeiraAula.id}` : null}
        />
      )}
      {preview && <FaixaPreview />}
      <EspacoHeader espaco={dados} emailUsuario={vinculo.email ?? undefined} />

      {dados.banner_url ? (
        <div className="w-full overflow-hidden border-b border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dados.banner_url}
            alt={dados.nome_curso}
            className="aspect-[2400/640] w-full object-cover object-center"
          />
        </div>
      ) : (
        <div
          className="flex h-[180px] w-full items-center overflow-hidden border-b border-border sm:h-[412px]"
          style={{
            background: `linear-gradient(120deg, ${dados.cor_primaria ?? '#171717'}, ${
              dados.cor_destaque ?? '#525252'
            })`,
          }}
        >
          <div className="mx-auto w-full max-w-7xl px-4">
            <h1 className="text-2xl font-black text-white sm:text-4xl">{dados.nome_curso}</h1>
            <p className="mt-1 text-sm text-white/80">Treinamento oficial para revendedoras</p>
          </div>
        </div>
      )}

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
                  <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    <CapaAula
                      capaUrl={aulaEmAndamento.capaUrl}
                      titulo={aulaEmAndamento.titulo}
                      numero={numeroEmAndamento}
                      corPrimaria={dados.cor_primaria}
                      corDestaque={dados.cor_destaque}
                      variante="faixa"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{aulaEmAndamento.titulo}</h3>
                    <p className="text-sm text-muted-foreground">
                      {aulaEmAndamento.duracaoSegundos
                        ? formatarDuracao(aulaEmAndamento.duracaoSegundos)
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
                  <div className="row-scroll pb-2">
                    {modulo.aulas.map((aula, indice) => (
                      <Link
                        key={aula.id}
                        href={`/${dados.slug}/aula/${aula.id}`}
                        className="card-tilt block w-[180px] sm:w-[200px]"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
                          <CapaAula
                            capaUrl={aula.capaUrl}
                            titulo={aula.titulo}
                            numero={indice + 1}
                            corPrimaria={dados.cor_primaria}
                            corDestaque={dados.cor_destaque}
                            variante="card"
                          />
                          {concluidas.has(aula.id) && (
                            <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </span>
                          )}
                          {aula.duracaoSegundos ? (
                            <span className="absolute bottom-2 right-2 rounded bg-background/90 px-1.5 py-0.5 text-xs tabular-nums">
                              {formatarDuracao(aula.duracaoSegundos)}
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
