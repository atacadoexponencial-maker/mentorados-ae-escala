import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/integrations/supabase/server'

// CSV do período: uma linha por revendedora do espaço (RLS da sessão isola).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const periodo = request.nextUrl.searchParams.get('periodo') ?? '30'
  const dias = Number(periodo)
  const inicio = Number.isFinite(dias) && dias > 0
    ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
    : null

  let consulta = supabase
    .from('aula_visualizacoes')
    .select('revendedor_id, segundos_assistidos, concluida_em, updated_at')
  if (inicio) consulta = consulta.gte('updated_at', inicio)

  const [{ data: revendedoras }, { data: visualizacoes }] = await Promise.all([
    supabase.from('revendedores').select('id, nome, email, status, ultimo_acesso'),
    consulta,
  ])

  const escapa = (v: string) => `"${v.replaceAll('"', '""')}"`
  const linhas = [
    ['Nome', 'E-mail', 'Status', 'Último acesso', 'Aulas concluídas', 'Segundos assistidos']
      .map(escapa)
      .join(';'),
  ]
  for (const r of revendedoras ?? []) {
    const dela = (visualizacoes ?? []).filter((v) => v.revendedor_id === r.id)
    linhas.push(
      [
        escapa(r.nome ?? ''),
        escapa(r.email),
        escapa(r.status),
        escapa(r.ultimo_acesso ?? ''),
        String(dela.filter((v) => v.concluida_em).length),
        String(dela.reduce((s, v) => s + (v.segundos_assistidos ?? 0), 0)),
      ].join(';')
    )
  }

  return new NextResponse('﻿' + linhas.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="engajamento-${periodo}dias.csv"`,
    },
  })
}
