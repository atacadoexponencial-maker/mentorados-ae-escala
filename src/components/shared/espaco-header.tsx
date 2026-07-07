import Link from 'next/link'
import { User } from 'lucide-react'
import type { MockEspaco } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { BotaoSair } from '@/components/shared/botao-sair'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function EspacoHeader({ espaco }: { espaco: MockEspaco }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
        <Link
          href={`/${espaco.slug}`}
          className="flex items-center gap-3"
        >
          {espaco.logoUrl ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={espaco.logoUrl} alt={espaco.nomeCurso} className="h-5 w-5 object-contain" />
            </span>
          ) : null}
          <span className="text-sm font-semibold">{espaco.nomeCurso}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
              <User className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                revendedora@exemplo.com
              </div>
              <DropdownMenuSeparator />
              <BotaoSair destino={`/${espaco.slug}/login`} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
