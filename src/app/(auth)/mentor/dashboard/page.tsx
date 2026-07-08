import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { createClient } from '@/integrations/supabase/server'
import { formatarHoras } from '@/lib/mock-data'
import { DetalheDialog, type AulaAssistida } from './detalhe-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const periodos = [
  { valor: '7', rotulo: '7 dias' },
  { valor: '30', rotulo: '30 dias' },
  { valor: '90', rotulo: '90 dias' },
  { valor: 'tudo', rotulo: 'Tudo' },
] as const

function inicioDoPeriodo(periodo: string): string | null {
  if (periodo === 'tudo') return null
  const dias = Number(periodo) || 30
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
}

function BarraConclusao({ percentual }: { percentual: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums text-muted-foreground">{percentual}%</span>
    </div>
  )
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function DashboardMentoradoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { periodo: periodoParam } = await searchParams
  const periodo = periodos.some((p) => p.valor === periodoParam) ? periodoParam! : '30'
  const inicio = inicioDoPeriodo(periodo)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS limita revendedoras e visualizações ao espaço do mentorado (issue 74)
  let consultaVisualizacoes = supabase
    .from('aula_visualizacoes')
    .select('revendedor_id, aula_id, aula_titulo, segundos_assistidos, ultima_posicao, concluida_em, updated_at')
  if (inicio) consultaVisualizacoes = consultaVisualizacoes.gte('updated_at', inicio)

  const [{ data: revendedoras }, { data: visualizacoes }, { data: aulas }, { data: modulos }] =
    await Promise.all([
      supabase.from('revendedores').select('id, nome, email, status, ultimo_acesso'),
      consultaVisualizacoes,
      supabase.from('aulas').select('id, titulo, modulo_id').eq('publicada', true).order('ordem'),
      supabase.from('modulos').select('id, titulo').order('ordem'),
    ])

  const listaRev = revendedoras ?? []
  const listaVis = visualizacoes ?? []

  const ativas = listaRev.filter((r) => r.status === 'ativo')
  const acessaramNoPeriodo = listaRev.filter(
    (r) => r.ultimo_acesso && (!inicio || r.ultimo_acesso >= inicio)
  )
  const tempoTotal = listaVis.reduce((soma, v) => soma + (v.segundos_assistidos ?? 0), 0)
  const concluidasNoPeriodo = listaVis.filter(
    (v) => v.concluida_em && (!inicio || v.concluida_em >= inicio)
  ).length

  const tiles = [
    { rotulo: 'Revendedoras ativas', valor: String(ativas.length) },
    { rotulo: 'Acessaram no período', valor: String(acessaramNoPeriodo.length) },
    { rotulo: 'Tempo total assistido', valor: formatarHoras(tempoTotal) },
    { rotulo: 'Aulas concluídas', valor: String(concluidasNoPeriodo) },
  ]

  const moduloPorId = new Map((modulos ?? []).map((m) => [m.id, m.titulo]))
  const porAula = (aulas ?? []).map((aula) => {
    const doPeriodo = listaVis.filter((v) => v.aula_id === aula.id)
    const assistiram = new Set(doPeriodo.map((v) => v.revendedor_id).filter(Boolean)).size
    const concluiram = doPeriodo.filter((v) => v.concluida_em).length
    return {
      id: aula.id,
      titulo: aula.titulo,
      modulo: moduloPorId.get(aula.modulo_id) ?? '',
      assistiram,
      percentual: assistiram > 0 ? Math.round((concluiram / assistiram) * 100) : 0,
    }
  })

  const porRevendedora = listaRev
    .map((r) => {
      const dela = listaVis.filter((v) => v.revendedor_id === r.id)
      const aulasAssistidas: AulaAssistida[] = dela.map((v) => ({
        aulaTitulo: v.aula_titulo,
        segundos: v.segundos_assistidos ?? 0,
        ultimaAtividade: v.updated_at,
        concluida: Boolean(v.concluida_em),
      }))
      return {
        id: r.id,
        nome: r.nome ?? r.email,
        concluidas: dela.filter((v) => v.concluida_em).length,
        tempo: dela.reduce((s, v) => s + (v.segundos_assistidos ?? 0), 0),
        ultimaAtividade: dela.length
          ? dela.map((v) => v.updated_at).sort().at(-1)!
          : null,
        aulasAssistidas,
      }
    })
    .sort((a, b) => b.tempo - a.tempo)

  const inativas = listaRev.filter(
    (r) => r.status === 'ativo' && (!r.ultimo_acesso || (inicio ? r.ultimo_acesso < inicio : false))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Engajamento das suas revendedoras</p>
        </div>
        <Button
          variant="outline"
          render={<a href={`/mentor/dashboard/exportar?periodo=${periodo}`} />}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {periodos.map((p) => (
          <Button
            key={p.valor}
            variant={p.valor === periodo ? 'default' : 'outline'}
            size="sm"
            render={<Link href={`/mentor/dashboard?periodo=${p.valor}`} />}
          >
            {p.rotulo}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.rotulo}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t.rotulo}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{t.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por aula</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aula</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead className="text-right">Assistiram</TableHead>
                <TableHead>Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porAula.map((linha) => (
                <TableRow key={linha.id}>
                  <TableCell className="font-medium">{linha.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{linha.modulo}</TableCell>
                  <TableCell className="text-right tabular-nums">{linha.assistiram}</TableCell>
                  <TableCell>
                    <BarraConclusao percentual={linha.percentual} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Por revendedora</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Concluídas</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {porRevendedora.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.concluidas}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarHoras(r.tempo)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatarData(r.ultimaAtividade)}
                    </TableCell>
                    <TableCell>
                      <DetalheDialog nome={r.nome} aulas={r.aulasAssistidas} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sem acesso no período</CardTitle>
            <CardDescription>Revendedoras para reengajar</CardDescription>
          </CardHeader>
          <CardContent>
            {inativas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todas acessaram no período. 🎉</p>
            ) : (
              <ul className="space-y-3">
                {inativas.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{r.nome ?? '—'}</span>
                    <span className="text-muted-foreground">{r.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
