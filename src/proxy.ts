import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const pathname = request.nextUrl.pathname
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/recuperar-senha' ||
    pathname === '/auth/callback' ||
    pathname === '/auth/confirm' ||
    /^\/[^/]+\/(login|primeiro-acesso|recuperar-senha)$/.test(pathname)

  if (!user && !isPublicRoute) {
    // Rotas de espaço voltam para o login do próprio espaço; equipe vai para /login
    const segmento = pathname.split('/')[1]
    const destino =
      segmento && segmento !== 'admin' && segmento !== 'mentor'
        ? `/${segmento}/login`
        : '/login'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
