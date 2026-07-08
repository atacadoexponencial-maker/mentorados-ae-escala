import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Play } from 'lucide-react'
import { formatarDuracao } from '@/lib/mock-data'
import { getEspacoPorSlug } from '@/lib/espacos'
import { getVinculoDoUsuario } from '@/lib/vinculo'
import { createClient } from '@/integrations/supabase/server'
import { EspacoHeader } from '@/components/shared/espaco-header'
import { PandaPlayer } from '@/components/shared/panda-player'
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

  // Client da sessão: RLS limita a aulas publicadas para revendedoras
  const supabase = await createClient()
  const [{ data: modulos }, { data: aulas }, { data: visualizacao }] = await Promise.all([
    supabase.from('modulos').select('id, titulo, ordem').order('ordem'),
    supabase
      .from('aulas')
      .select('id, modulo_id, titulo, descricao, panda_video_id, duracao_segundos, ordem')
      .eq('publicada', true)
      .order('ordem'),
    supabase
      .from('aula_visualizacoes')
      .select('concluida_em, ultima_posicao')
      .eq('user_id', vinculo.userId)
      .eq('aula_id', aulaId)
      .maybeSingle(),
  ])

  const ordemModulos = new Map((modulos ?? []).map((m) => [m.id, m.ordem]))
  const publicadas = (aulas ?? []).sort(
    (a, b) =>
      (ordemModulos.get(a.modulo_id) ?? 0) - (ordemModulos.get(b.modulo_id) ?? 0) ||
      a.ordem - b.ordem
  )

  const indice = publicadas.findIndex((a) => a.id === aulaId)
  if (indice === -1) notFound()

  const aula = publicadas[indice]
  const anterior = indice > 0 ? publicadas[indice - 1] : null
  const proxima = indice < publicadas.length - 1 ? publicadas[indice + 1] : null
  const concluida = Boolean(visualizacao?.concluida_em)
  const modulo = (modulos ?? []).find((m) => m.id === aula.modulo_id)

  const { data: materiais } = await supabase
    .from('aula_materiais')
    .select('id, nome, url')
    .eq('aula_id', aula.id)
    .order('ordem')

  return (
    <div className="flex min-h-screen flex-col">
      <EspacoHeader espaco={dados} emailUsuario={vinculo.email ?? undefined} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link
          href={`/${dados.slug}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar ao catálogo
        </Link>

        {aula.panda_video_id ? (
          <PandaPlayer videoId={aula.panda_video_id} />
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
            {aula.duracao_segundos ? ` · ${formatarDuracao(aula.duracao_segundos)}` : ''}
          </p>
          {aula.descricao && <p className="text-sm leading-relaxed">{aula.descricao}</p>}
        </div>

        {(materiais ?? []).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Materiais da aula</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(materiais ?? []).map((material) => (
                  <li key={material.id}>
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {material.nome}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

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
