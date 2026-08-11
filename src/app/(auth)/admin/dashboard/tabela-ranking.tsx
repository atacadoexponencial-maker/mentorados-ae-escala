'use client'

import Link from 'next/link'
import { formatarHoras } from '@/lib/mock-data'
import { CabecalhoOrdenavel, useOrdenacao } from '@/components/shared/tabela/cabecalho-ordenavel'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type LinhaRanking = {
  slug: string
  marca: string
  ativas: number
  tempo: number
  concluidas: number
}

export function TabelaRanking({ linhas }: { linhas: LinhaRanking[] }) {
  const { coluna, direcao, alternar, ordenar } = useOrdenacao<LinhaRanking>('tempo', 'desc')

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {/* A posição acompanha a ordenação escolhida: é o lugar naquele
              ranking, não um número fixo da marca. */}
          <TableHead className="w-12">#</TableHead>
          <CabecalhoOrdenavel
            rotulo="Marca"
            ativa={coluna === 'marca'}
            direcao={direcao}
            onClick={() => alternar('marca', 'asc')}
          />
          <CabecalhoOrdenavel
            rotulo="Revendedoras ativas"
            alinhar="direita"
            ativa={coluna === 'ativas'}
            direcao={direcao}
            onClick={() => alternar('ativas')}
          />
          <CabecalhoOrdenavel
            rotulo="Tempo assistido"
            alinhar="direita"
            ativa={coluna === 'tempo'}
            direcao={direcao}
            onClick={() => alternar('tempo')}
          />
          <CabecalhoOrdenavel
            rotulo="Aulas concluídas"
            alinhar="direita"
            ativa={coluna === 'concluidas'}
            direcao={direcao}
            onClick={() => alternar('concluidas')}
          />
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              Nenhum mentorado ativo
            </TableCell>
          </TableRow>
        ) : (
          ordenar(linhas).map((r, i) => (
            <TableRow key={r.slug}>
              <TableCell className="text-muted-foreground">{i + 1}º</TableCell>
              <TableCell className="font-medium">{r.marca}</TableCell>
              <TableCell className="text-right tabular-nums">{r.ativas}</TableCell>
              <TableCell className="text-right tabular-nums">{formatarHoras(r.tempo)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.concluidas}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" render={<Link href={`/admin/mentorados/${r.slug}`} />}>
                  Ver espaço
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
