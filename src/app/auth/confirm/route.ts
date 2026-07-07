import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/integrations/supabase/server'

// Consome links de e-mail (convite, recuperação) no padrão SSR do Supabase:
// /auth/confirm?token_hash=…&type=invite|recovery&next=/caminho
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? '/login'
  // Aceita next absoluto (template usa {{ .RedirectTo }}), mas só o caminho conta
  const next = nextParam.startsWith('http') ? new URL(nextParam).pathname : nextParam

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  const segmento = next.split('/')[1]
  const destino =
    segmento && segmento !== 'admin' && segmento !== 'mentor' && segmento !== 'login'
      ? `/${segmento}/login`
      : '/login'
  return NextResponse.redirect(new URL(destino, origin))
}
