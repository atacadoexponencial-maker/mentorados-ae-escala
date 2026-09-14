import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/integrations/supabase/server'
import { CABECALHO_ESPACO_DOMINIO } from '@/lib/dominio/rotas'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Code ausente/expirado: manda para o login do espaço do destino (ou da equipe)
  // No domínio próprio o login do espaço é simplesmente /login
  const segmento = next.split('/')[1]
  const noDominioProprio = Boolean(request.headers.get(CABECALHO_ESPACO_DOMINIO))
  const destino =
    !noDominioProprio &&
    segmento &&
    segmento !== 'admin' &&
    segmento !== 'mentor' &&
    segmento !== 'login'
      ? `/${segmento}/login`
      : '/login'
  return NextResponse.redirect(new URL(destino, origin))
}
