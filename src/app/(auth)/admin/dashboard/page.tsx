'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import {
  formatarHoras,
  mockAulas,
  mockDashboardGlobal,
  mockModulos,
} from '@/lib/mock-data'
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

const periodos = ['7 dias', '30 dias', '90 dias', 'Personalizado'] as const

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

export default function DashboardGlobalPage() {
  const [periodo, setPeriodo] = useState<(typeof periodos)[number]>('30 dias')
  const { totais, ranking, porAula } = mockDashboardGlobal

  const tiles = [
    { rotulo: 'Mentorados ativos', valor: String(totais.mentoradosAtivos) },
    { rotulo: 'Revendedores cadastrados', valor: totais.revendedoresCadastrados.toLocaleString('pt-BR') },
    { rotulo: 'Revendedores que acessaram', valor: totais.revendedoresQueAcessaram.toLocaleString('pt-BR') },
    { rotulo: 'Tempo total assistido', valor: formatarHoras(totais.tempoTotalSegundos) },
    { rotulo: 'Aulas concluídas', valor: totais.aulasConcluidas.toLocaleString('pt-BR') },
  ]

  const aulaPorId = new Map(mockAulas.map((a) => [a.id, a]))
  const moduloPorId = new Map(mockModulos.map((m) => [m.id, m]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Engajamento de toda a operação</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {periodos.map((p) => (
          <Button
            key={p}
            variant={p === periodo ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodo(p)}
          >
            {p}
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
                <TableHead className="text-right">Revendedores ativos</TableHead>
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
                  <TableCell className="text-right tabular-nums">{r.revendedoresAtivos}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarHoras(r.tempoAssistidoSegundos)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.aulasConcluidas}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
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
              {porAula.map((linha) => {
                const aula = aulaPorId.get(linha.aulaId)
                if (!aula) return null
                const modulo = moduloPorId.get(aula.moduloId)
                return (
                  <TableRow key={linha.aulaId}>
                    <TableCell className="font-medium">{aula.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">{modulo?.titulo}</TableCell>
                    <TableCell className="text-right tabular-nums">{linha.assistiram}</TableCell>
                    <TableCell>
                      <BarraConclusao percentual={linha.percentualConclusao} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
