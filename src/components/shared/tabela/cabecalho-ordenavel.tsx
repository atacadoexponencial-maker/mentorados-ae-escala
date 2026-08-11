'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { ordenarPor, type Direcao } from '@/lib/tabela/ordenacao'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function useOrdenacao<T>(colunaInicial: keyof T, direcaoInicial: Direcao = 'desc') {
  const [coluna, setColuna] = useState<keyof T>(colunaInicial)
  const [direcao, setDirecao] = useState<Direcao>(direcaoInicial)

  // Clicar de novo na mesma coluna inverte. Trocar de coluna começa na direção
  // que faz sentido para aquele tipo: número desce (maior primeiro, que é o que
  // se quer de um ranking) e texto sobe (A→Z).
  const alternar = (nova: keyof T, padrao: Direcao = 'desc') => {
    if (nova === coluna) setDirecao((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setColuna(nova)
      setDirecao(padrao)
    }
  }

  return {
    coluna,
    direcao,
    alternar,
    ordenar: (lista: readonly T[]) => ordenarPor(lista, coluna, direcao),
  }
}

export function CabecalhoOrdenavel({
  rotulo,
  ativa,
  direcao,
  alinhar = 'esquerda',
  className,
  onClick,
}: {
  rotulo: string
  ativa: boolean
  direcao: Direcao
  alinhar?: 'esquerda' | 'direita'
  className?: string
  onClick: () => void
}) {
  const Icone = !ativa ? ChevronsUpDown : direcao === 'asc' ? ArrowUp : ArrowDown

  return (
    <TableHead className={cn(alinhar === 'direita' && 'text-right', className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ordenar por ${rotulo}`}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
          alinhar === 'direita' && 'flex-row-reverse',
          ativa ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {rotulo}
        <Icone className={cn('h-3.5 w-3.5', !ativa && 'opacity-50')} />
      </button>
    </TableHead>
  )
}
