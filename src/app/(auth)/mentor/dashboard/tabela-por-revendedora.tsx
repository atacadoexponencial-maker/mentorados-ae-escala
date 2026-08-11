'use client'

import { formatarHoras } from '@/lib/mock-data'
import { DetalheDialog, type AulaAssistida } from './detalhe-dialog'
import { CabecalhoOrdenavel, useOrdenacao } from '@/components/shared/tabela/cabecalho-ordenavel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type LinhaRevendedora = {
  id: string
  nome: string
  concluidas: number
  tempo: number
  ultimaAtividade: string | null
  aulasAssistidas: AulaAssistida[]
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TabelaPorRevendedora({ linhas }: { linhas: LinhaRevendedora[] }) {
  const { coluna, direcao, alternar, ordenar } = useOrdenacao<LinhaRevendedora>('tempo', 'desc')

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <CabecalhoOrdenavel
            rotulo="Nome"
            ativa={coluna === 'nome'}
            direcao={direcao}
            onClick={() => alternar('nome', 'asc')}
          />
          <CabecalhoOrdenavel
            rotulo="Concluídas"
            alinhar="direita"
            ativa={coluna === 'concluidas'}
            direcao={direcao}
            onClick={() => alternar('concluidas')}
          />
          <CabecalhoOrdenavel
            rotulo="Tempo"
            alinhar="direita"
            ativa={coluna === 'tempo'}
            direcao={direcao}
            onClick={() => alternar('tempo')}
          />
          <CabecalhoOrdenavel
            rotulo="Última atividade"
            ativa={coluna === 'ultimaAtividade'}
            direcao={direcao}
            onClick={() => alternar('ultimaAtividade')}
          />
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              Nenhuma revendedora cadastrada
            </TableCell>
          </TableRow>
        ) : (
          ordenar(linhas).map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.nome}</TableCell>
              <TableCell className="text-right tabular-nums">{r.concluidas}</TableCell>
              <TableCell className="text-right tabular-nums">{formatarHoras(r.tempo)}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatarData(r.ultimaAtividade)}
              </TableCell>
              <TableCell>
                <DetalheDialog nome={r.nome} aulas={r.aulasAssistidas} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
