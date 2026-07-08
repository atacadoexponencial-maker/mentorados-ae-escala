'use client'

import { useState } from 'react'
import { formatarDuracao } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
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

export type AulaAssistida = {
  aulaTitulo: string
  segundos: number
  ultimaAtividade: string
  concluida: boolean
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function DetalheDialog({
  nome,
  aulas,
}: {
  nome: string
  aulas: AulaAssistida[]
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Ver detalhe</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nome}</DialogTitle>
          <DialogDescription>Aulas assistidas, tempo e última atividade</DialogDescription>
        </DialogHeader>
        {aulas.length === 0 ? (
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
                <TableHead>Concluída</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aulas.map((a) => (
                <TableRow key={`${a.aulaTitulo}-${a.ultimaAtividade}`}>
                  <TableCell className="font-medium">{a.aulaTitulo}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarDuracao(a.segundos)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatarData(a.ultimaAtividade)}
                  </TableCell>
                  <TableCell>{a.concluida ? 'Sim' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
