import Link from 'next/link'
import { Download } from 'lucide-react'
import { createAdminClient } from '@/integrations/supabase/admin'
import { formatarHoras } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default async function DashboardGlobalPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { periodo: periodoParam } = await searchParams
  const periodo = periodos.some((p) => p.valor === periodoParam) ? periodoParam! : '30'
  const inicio = inicioDoPeriodo(periodo)

  // Gate de admin já aplicado no layout; leitura global via service client
  const admin = createAdminClient()
  let consultaVisualizacoes = admin
    .from('aula_visualizacoes')
    .select('espaco_id, revendedor_id, aula_id, segundos_assistidos, concluida_em, updated_at')
  if (inicio) consultaVisualizacoes = consultaVisualizacoes.gte('updated_at', inicio)

  const [{ data: espacos }, { data: revendedoras }, { data: visualizacoes }, { data: aulas }, { data: modulos }] =
    await Promise.all([
      admin.from('espacos').select('id, slug, nome_curso, ativo'),
      admin.from('revendedores').select('id, espaco_id, status, ultimo_acesso'),
      consultaVisualizacoes,
      admin.from('aulas').select('id, titulo, modulo_id').eq('publicada', true).order('ordem'),
      admin.from('modulos').select('id, titulo').order('ordem'),
    ])

  const listaEspacos = espacos ?? []
  const listaRev = revendedoras ?? []
  const listaVis = visualizacoes ?? []

  const tiles = [
    { rotulo: 'Mentorados ativos', valor: String(listaEspacos.filter((e) => e.ativo).length) },
    { rotulo: 'Revendedoras cadastradas', valor: listaRev.length.toLocaleString('pt-BR') },
    {
      rotulo: 'Acessaram no período',
      valor: String(
        listaRev.filter((r) => r.ultimo_acesso && (!inicio || r.ultimo_acesso >= inicio)).length
      ),
    },
    {
      rotulo: 'Tempo total assistido',
      valor: formatarHoras(listaVis.reduce((s, v) => s + (v.segundos_assistidos ?? 0), 0)),
    },
    {
      rotulo: 'Aulas concluídas',
      valor: String(
        listaVis.filter((v) => v.concluida_em && (!inicio || v.concluida_em >= inicio)).length
      ),
    },
  ]

  const ranking = listaEspacos
    .filter((e) => e.ativo)
    .map((e) => {
      const doEspaco = listaVis.filter((v) => v.espaco_id === e.id)
      return {
        slug: e.slug,
        marca: e.nome_curso,
        ativas: listaRev.filter((r) => r.espaco_id === e.id && r.status === 'ativo').length,
        tempo: doEspaco.reduce((s, v) => s + (v.segundos_assistidos ?? 0), 0),
        concluidas: doEspaco.filter((v) => v.concluida_em).length,
      }
    })
    .sort((a, b) => b.tempo - a.tempo)

  const moduloPorId = new Map((modulos ?? []).map((m) => [m.id, m.titulo]))
  const porAula = (aulas ?? []).map((aula) => {
    const daAula = listaVis.filter((v) => v.aula_id === aula.id)
    const assistiram = new Set(daAula.map((v) => v.revendedor_id).filter(Boolean)).size
    const concluiram = daAula.filter((v) => v.concluida_em).length
    return {
      id: aula.id,
      titulo: aula.titulo,
      modulo: moduloPorId.get(aula.modulo_id) ?? '',
      assistiram,
      percentual: assistiram > 0 ? Math.round((concluiram / assistiram) * 100) : 0,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Engajamento de toda a operação</p>
        </div>
        <Button
          variant="outline"
          render={<a href={`/admin/dashboard/exportar?periodo=${periodo}`} />}
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
            render={<Link href={`/admin/dashboard?periodo=${p.valor}`} />}
          >
            {p.rotulo}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <CardTitle>Ranking de mentorados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Revendedoras ativas</TableHead>
                <TableHead className="text-right">Tempo assistido</TableHead>
                <TableHead className="text-right">Aulas concluídas</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r, i) => (
                <TableRow key={r.slug}>
                  <TableCell className="text-muted-foreground">{i + 1}º</TableCell>
                  <TableCell className="font-medium">{r.marca}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.ativas}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarHoras(r.tempo)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.concluidas}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/admin/mentorados/${r.slug}`} />}
                    >
                      Ver espaço
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <TableHead>Conclusão média</TableHead>
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
    </div>
  )
}
