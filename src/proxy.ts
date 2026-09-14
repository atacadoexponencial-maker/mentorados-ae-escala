import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ehHostDaPlataforma, hostSemPorta, origemNoDominio } from '@/lib/dominio/regras'
import {
  CABECALHO_ESPACO_DOMINIO,
  caminhoLimpo,
  decidirNoDominio,
  deveIrParaODominio,
  slugDoCaminho,
} from '@/lib/dominio/rotas'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl
  // x-forwarded-host primeiro: é o host que o navegador usou. Na Vercel a borda o
  // preenche, e o Next o repassa quando um redirect de Server Action renderiza o
  // destino numa busca interna (que chega com host da máquina, não do domínio).
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host

  // Cabeçalho interno nunca é aceito de fora; só o proxy o define.
  const cabecalhos = new Headers(request.headers)
  cabecalhos.delete(CABECALHO_ESPACO_DOMINIO)

  // Toda resposta leva os cookies que o Supabase renovou nesta requisição.
  const finalizar = (resposta: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => resposta.cookies.set(cookie))
    return resposta
  }

  // ── Domínio próprio de um espaço ─────────────────────────────
  if (!ehHostDaPlataforma(host)) {
    const { data: espaco } = await supabase
      .from('espacos')
      .select('slug, dominio_ativo')
      .eq('dominio', hostSemPorta(host))
      .maybeSingle()
    const slug = espaco?.dominio_ativo ? (espaco.slug as string) : null

    const decisao = decidirNoDominio({ pathname, busca: search, slug, logado: Boolean(user) })
    if (decisao.tipo === 'redirecionar') {
      return finalizar(NextResponse.redirect(new URL(decisao.destino, request.url)))
    }
    if (slug) cabecalhos.set(CABECALHO_ESPACO_DOMINIO, slug)
    if (decisao.tipo === 'reescrever') {
      return finalizar(
        NextResponse.rewrite(new URL(`${decisao.caminho}${search}`, request.url), {
          request: { headers: cabecalhos },
        })
      )
    }
    return finalizar(NextResponse.next({ request: { headers: cabecalhos } }))
  }

  // ── Plataforma ───────────────────────────────────────────────

  // Link de e-mail (convite, recuperação) cujo destino é um espaço com domínio
  // ativo: o token é consumido no próprio domínio, para a sessão nascer lá.
  // Cobre convites novos (next absoluto no domínio) e antigos (next /slug/...).
  if (pathname === '/auth/confirm') {
    const next = request.nextUrl.searchParams.get('next') ?? ''
    const dominioDoNext = await dominioAtivoDoDestino(supabase, next)
    if (dominioDoNext) {
      const origem = next.startsWith('http')
        ? new URL(next).origin
        : origemNoDominio(dominioDoNext, request.url)
      return finalizar(NextResponse.redirect(`${origem}/auth/confirm${search}`))
    }
  }

  const slugDoEndereco = slugDoCaminho(pathname)
  if (slugDoEndereco) {
    const { data: espaco } = await supabase
      .from('espacos')
      .select('dominio, dominio_ativo, mentorado_user_id')
      .eq('slug', slugDoEndereco)
      .maybeSingle()
    if (espaco?.dominio_ativo && espaco.dominio) {
      const { data: ehAdmin } = user
        ? await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
        : { data: false }
      const ir = deveIrParaODominio({
        dominioAtivo: espaco.dominio_ativo,
        dominio: espaco.dominio,
        userId: user?.id ?? null,
        ehAdmin: Boolean(ehAdmin),
        mentoradoUserId: espaco.mentorado_user_id,
      })
      if (ir) {
        const destino = `${origemNoDominio(espaco.dominio, request.url)}${caminhoLimpo(slugDoEndereco, pathname)}${search}`
        return finalizar(NextResponse.redirect(destino))
      }
    }
  }

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/recuperar-senha' ||
    pathname === '/auth/callback' ||
    pathname === '/auth/confirm' ||
    pathname === '/espaco-indisponivel' ||
    /^\/[^/]+\/(login|primeiro-acesso|recuperar-senha)$/.test(pathname)

  if (!user && !isPublicRoute) {
    // Rotas de espaço voltam para o login do próprio espaço; equipe vai para /login
    const segmento = pathname.split('/')[1]
    const destino =
      segmento && segmento !== 'admin' && segmento !== 'mentor'
        ? `/${segmento}/login`
        : '/login'
    return finalizar(NextResponse.redirect(new URL(destino, request.url)))
  }

  return finalizar(NextResponse.next({ request: { headers: cabecalhos } }))
}

// Domínio ativo do espaço para onde um `next` de link de e-mail aponta, se houver.
async function dominioAtivoDoDestino(
  supabase: ReturnType<typeof createServerClient>,
  next: string
): Promise<string | null> {
  if (next.startsWith('http')) {
    let hostDoNext: string
    try {
      hostDoNext = new URL(next).host
    } catch {
      return null
    }
    if (ehHostDaPlataforma(hostDoNext)) return null
    const { data } = await supabase
      .from('espacos')
      .select('dominio')
      .eq('dominio', hostSemPorta(hostDoNext))
      .eq('dominio_ativo', true)
      .maybeSingle()
    return (data?.dominio as string | undefined) ?? null
  }
  const slug = slugDoCaminho(next)
  if (!slug) return null
  const { data } = await supabase
    .from('espacos')
    .select('dominio')
    .eq('slug', slug)
    .eq('dominio_ativo', true)
    .maybeSingle()
  return (data?.dominio as string | undefined) ?? null
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
