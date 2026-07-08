import Link from 'next/link'
import { User } from 'lucide-react'
import type { Espaco } from '@/lib/espacos'
import { Button } from '@/components/ui/button'
import { BotaoSair } from '@/components/shared/botao-sair'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function EspacoHeader({ espaco, emailUsuario }: { espaco: Espaco; emailUsuario?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
        <Link
          href={`/${espaco.slug}`}
          className="flex items-center gap-3"
        >
          {espaco.logo_url ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={espaco.logo_url} alt={espaco.nome_curso} className="h-5 w-5 object-contain" />
            </span>
          ) : null}
          <span className="text-sm font-semibold">{espaco.nome_curso}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
              <User className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                {emailUsuario ?? ''}
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
