'use client'

import { LogOut } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { sair } from './sair-action'

export function BotaoSair({ destino }: { destino: string }) {
  return (
    <DropdownMenuItem onClick={() => sair(destino)}>
      <LogOut className="mr-2 h-4 w-4" />
      Sair
    </DropdownMenuItem>
  )
}
