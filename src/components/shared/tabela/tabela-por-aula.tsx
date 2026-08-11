'use client'

import { CabecalhoOrdenavel, useOrdenacao } from './cabecalho-ordenavel'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'

// Serve os dois painéis: o da mentorada e o do admin montam esta linha do mesmo
// jeito, então a tabela é uma só.
export type LinhaPorAula = {
  id: string
  titulo: string
  modulo: string
  assistiram: number
  percentual: number
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

export function TabelaPorAula({
  linhas,
  rotuloConclusao = 'Conclusão',
}: {
  linhas: LinhaPorAula[]
  rotuloConclusao?: string
}) {
  // Começa pela ordem do catálogo, que é como as aulas chegam do servidor.
  const { coluna, direcao, alternar, ordenar } = useOrdenacao<LinhaPorAula>('assistiram', 'desc')

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <CabecalhoOrdenavel
            rotulo="Aula"
            ativa={coluna === 'titulo'}
            direcao={direcao}
            onClick={() => alternar('titulo', 'asc')}
          />
          <CabecalhoOrdenavel
            rotulo="Módulo"
            ativa={coluna === 'modulo'}
            direcao={direcao}
            onClick={() => alternar('modulo', 'asc')}
          />
          <CabecalhoOrdenavel
            rotulo="Assistiram"
            alinhar="direita"
            ativa={coluna === 'assistiram'}
            direcao={direcao}
            onClick={() => alternar('assistiram')}
          />
          <CabecalhoOrdenavel
            rotulo={rotuloConclusao}
            ativa={coluna === 'percentual'}
            direcao={direcao}
            onClick={() => alternar('percentual')}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              Nenhuma aula publicada ainda
            </TableCell>
          </TableRow>
        ) : (
          ordenar(linhas).map((linha) => (
            <TableRow key={linha.id}>
              <TableCell className="font-medium">{linha.titulo}</TableCell>
              <TableCell className="text-muted-foreground">{linha.modulo}</TableCell>
              <TableCell className="text-right tabular-nums">{linha.assistiram}</TableCell>
              <TableCell>
                <BarraConclusao percentual={linha.percentual} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
