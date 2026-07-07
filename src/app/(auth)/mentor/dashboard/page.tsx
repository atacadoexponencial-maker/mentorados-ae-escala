'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import {
  formatarDuracao,
  formatarHoras,
  mockAulas,
  mockDashboardMentorado,
  mockModulos,
  mockRevendedores,
} from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function DashboardMentoradoPage() {
  const [periodo, setPeriodo] = useState<(typeof periodos)[number]>('30 dias')
  const { totais, porAula, porRevendedora, inativasIds } = mockDashboardMentorado

  const aulaPorId = new Map(mockAulas.map((a) => [a.id, a]))
  const moduloPorId = new Map(mockModulos.map((m) => [m.id, m]))
  const revendedoraPorId = new Map(mockRevendedores.map((r) => [r.id, r]))

  const tiles = [
    { rotulo: 'Revendedoras ativas', valor: String(totais.revendedorasAtivas) },
    { rotulo: 'Revendedoras que acessaram', valor: String(totais.revendedorasQueAcessaram) },
    { rotulo: 'Tempo total assistido', valor: formatarHoras(totais.tempoTotalSegundos) },
    { rotulo: 'Aulas concluídas', valor: String(totais.aulasConcluidas) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Engajamento das suas revendedoras
          </p>
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
                <TableHead>Conclusão média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porAula.map((linha) => {
                const aula = aulaPorId.get(linha.aulaId)
                if (!aula) return null
                return (
                  <TableRow key={linha.aulaId}>
                    <TableCell className="font-medium">{aula.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {moduloPorId.get(aula.moduloId)?.titulo}
                    </TableCell>
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
                  <TableHead className="text-right">Aulas concluídas</TableHead>
                  <TableHead className="text-right">Tempo assistido</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {porRevendedora.map((linha) => {
                  const revendedora = revendedoraPorId.get(linha.revendedorId)
                  if (!revendedora) return null
                  return (
                    <TableRow key={linha.revendedorId}>
                      <TableCell className="font-medium">{revendedora.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {linha.aulasConcluidas}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarHoras(linha.tempoAssistidoSegundos)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatarData(linha.ultimaAtividade)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger render={<Button variant="outline" size="sm" />}>
                            Ver detalhe
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{revendedora.nome}</DialogTitle>
                              <DialogDescription>
                                Aulas assistidas e tempo em cada uma
                              </DialogDescription>
                            </DialogHeader>
                            {linha.aulasAssistidas.length === 0 ? (
                              <p className="py-4 text-center text-sm text-muted-foreground">
                                Nenhuma aula assistida ainda
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Aula</TableHead>
                                    <TableHead className="text-right">Tempo</TableHead>
                                    <TableHead>Quando</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {linha.aulasAssistidas.map((aa) => (
                                    <TableRow key={aa.aulaId}>
                                      <TableCell className="font-medium">
                                        {aulaPorId.get(aa.aulaId)?.titulo}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums">
                                        {formatarDuracao(aa.tempoAssistidoSegundos)}
                                      </TableCell>
                                      <TableCell className="tabular-nums text-muted-foreground">
                                        {formatarData(aa.quando)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
            <ul className="space-y-3">
              {inativasIds.map((id) => {
                const revendedora = revendedoraPorId.get(id)
                if (!revendedora) return null
                return (
                  <li key={id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{revendedora.nome}</span>
                    <span className="text-muted-foreground">{revendedora.email}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
