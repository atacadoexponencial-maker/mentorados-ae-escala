import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, Play } from 'lucide-react'
import { formatarDuracao } from '@/lib/mock-data'
import { getEspacoPorSlug } from '@/lib/espacos'
import { getVinculoDoUsuario } from '@/lib/vinculo'
import { ehPreview } from '@/lib/preview'
import { createClient } from '@/integrations/supabase/server'
import { carregarCatalogo } from '@/lib/catalogo'
import { EspacoHeader } from '@/components/shared/espaco-header'
import { FaixaPreview } from '@/components/shared/faixa-preview'
import { PandaPlayer } from '@/components/shared/panda-player'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MateriaisAula } from './materiais-aula'

export default async function AulaPage({
  params,
}: {
  params: Promise<{ espaco: string; aulaId: string }>
}) {
  const { espaco, aulaId } = await params
  const dados = await getEspacoPorSlug(espaco)
  if (!dados) notFound()

  const vinculo = await getVinculoDoUsuario()
  if (!vinculo) redirect(`/${dados.slug}/login`)
  if (
    vinculo.revendedor &&
    !vinculo.roles.has('admin') &&
    !vinculo.roles.has('mentorado') &&
    vinculo.revendedor.espacoSlug !== dados.slug
  ) {
    redirect(`/${vinculo.revendedor.espacoSlug}`)
  }

  const preview = ehPreview(vinculo.revendedor?.espacoId ?? null, dados.id)

  const supabase = await createClient()
  const [modulos, { data: visualizacao }] = await Promise.all([
    carregarCatalogo(dados.id),
    supabase
      .from('aula_visualizacoes')
      .select('concluida_em, ultima_posicao')
      .eq('user_id', vinculo.userId)
      .eq('aula_id', aulaId)
      .maybeSingle(),
  ])

  // carregarCatalogo devolve os módulos na ordem de exibição (base primeiro) e as
  // aulas publicadas ordenadas dentro de cada um: a sequência linear é o achatamento.
  const publicadas = modulos.flatMap((m) => m.aulas)

  const indice = publicadas.findIndex((a) => a.id === aulaId)
  if (indice === -1) notFound()

  const aula = publicadas[indice]
  const anterior = indice > 0 ? publicadas[indice - 1] : null
  const proxima = indice < publicadas.length - 1 ? publicadas[indice + 1] : null
  const concluida = Boolean(visualizacao?.concluida_em)
  const modulo = modulos.find((m) => m.id === aula.moduloId)

  const { data: materiais } = await supabase
    .from('aula_materiais')
    .select('id, nome, url')
    .eq('aula_id', aula.id)
    .order('ordem')

  return (
    <div className="flex min-h-screen flex-col">
      {preview && <FaixaPreview />}
      <EspacoHeader espaco={dados} emailUsuario={vinculo.email ?? undefined} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link
          href={`/${dados.slug}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar ao catálogo
        </Link>

        {aula.pandaVideoId ? (
          <PandaPlayer
            videoId={aula.pandaVideoId}
            aulaId={aula.id}
            iniciarEm={
              !visualizacao?.concluida_em && (visualizacao?.ultima_posicao ?? 0) > 0
                ? visualizacao?.ultima_posicao
                : undefined
            }
          />
        ) : (
          <div
            className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
            style={{ aspectRatio: '16 / 9' }}
          >
            <div className="text-center text-white/70">
              <Play className="mx-auto mb-2 h-8 w-8" />
              <p className="text-sm">Vídeo ainda não disponível</p>
            </div>
          </div>
        )}

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
            {modulo?.titulo}
            {aula.duracaoSegundos ? ` · ${formatarDuracao(aula.duracaoSegundos)}` : ''}
          </p>
          {aula.descricao && <p className="text-sm leading-relaxed">{aula.descricao}</p>}
        </div>

        {/* A coluna de origem só chega na issue 04: hoje toda linha de aula_materiais
            é link externo (a pasta materiais/ do bucket está vazia em produção), então
            `origem` é fixo em 'link' — sem inspecionar o texto de `url`. */}
        <MateriaisAula
          materiais={(materiais ?? []).map((material) => ({
            id: material.id,
            nome: material.nome,
            origem: 'link' as const,
            url: material.url,
          }))}
        />

        <div className="mt-8 flex items-center justify-between gap-4">
          {anterior ? (
            <Button variant="outline" render={<Link href={`/${dados.slug}/aula/${anterior.id}`} />}>
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
