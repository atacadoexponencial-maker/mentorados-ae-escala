import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Store, User } from 'lucide-react'
import { createClient } from '@/integrations/supabase/server'
import { Button } from '@/components/ui/button'
import { BotaoSair } from '@/components/shared/botao-sair'
import { TourPainel } from '@/components/shared/onboarding/tour-painel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: ehMentorado } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'mentorado',
  })
  if (!ehMentorado) redirect('/login')

  const { data: espaco } = await supabase
    .from('espacos')
    .select('slug, onboarding_visto_em')
    .eq('mentorado_user_id', user.id)
    .maybeSingle()

  // Quem decide se o tour existe é o servidor, na carga da página: assim nada
  // pisca na tela de quem já viu.
  const mostrarTour = Boolean(espaco && !espaco.onboarding_visto_em)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
          <Link
            href="/mentor/personalizacao"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Store className="h-4 w-4" />
          </Link>
          <nav className="ml-4 flex items-center gap-4 text-sm">
            <Link
              href="/mentor/personalizacao"
              data-tour="personalizacao"
              className="text-muted-foreground hover:text-foreground"
            >
              Personalização
            </Link>
            <Link
              href="/mentor/conteudo"
              data-tour="conteudo"
              className="text-muted-foreground hover:text-foreground"
            >
              Conteúdo
            </Link>
            <Link
              href="/mentor/revendedores"
              data-tour="revendedores"
              className="text-muted-foreground hover:text-foreground"
            >
              Revendedores
            </Link>
            <Link href="/mentor/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            {espaco && (
              <a
                href={`/${espaco.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                data-tour="area-membros"
                className="text-muted-foreground hover:text-foreground"
              >
                Ver área de membros
              </a>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <BotaoSair destino="/login" />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
      {/* Suspense porque o tour lê o passo da query string (useSearchParams). */}
      {mostrarTour && (
        <Suspense fallback={null}>
          <TourPainel />
        </Suspense>
      )}
    </div>
  )
}
