import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirAdmin } from '../../mentorados/actions'

// CSV global: uma linha por espaço.
export async function GET(request: NextRequest) {
  if (!(await exigirAdmin())) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const periodo = request.nextUrl.searchParams.get('periodo') ?? '30'
  const dias = Number(periodo)
  const inicio = Number.isFinite(dias) && dias > 0
    ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
    : null

  const admin = createAdminClient()
  let consulta = admin
    .from('aula_visualizacoes')
    .select('espaco_id, segundos_assistidos, concluida_em, updated_at')
  if (inicio) consulta = consulta.gte('updated_at', inicio)

  const [{ data: espacos }, { data: revendedoras }, { data: visualizacoes }] = await Promise.all([
    admin.from('espacos').select('id, slug, nome_curso, ativo'),
    admin.from('revendedores').select('espaco_id, status'),
    consulta,
  ])

  const escapa = (v: string) => `"${v.replaceAll('"', '""')}"`
  const linhas = [
    ['Marca', 'Endereço', 'Ativo', 'Revendedoras ativas', 'Aulas concluídas', 'Segundos assistidos']
      .map(escapa)
      .join(';'),
  ]
  for (const e of espacos ?? []) {
    const doEspaco = (visualizacoes ?? []).filter((v) => v.espaco_id === e.id)
    linhas.push(
      [
        escapa(e.nome_curso),
        escapa(`/${e.slug}`),
        e.ativo ? 'sim' : 'não',
        String(
          (revendedoras ?? []).filter((r) => r.espaco_id === e.id && r.status === 'ativo').length
        ),
        String(doEspaco.filter((v) => v.concluida_em).length),
        String(doEspaco.reduce((s, v) => s + (v.segundos_assistidos ?? 0), 0)),
      ].join(';')
    )
  }

  return new NextResponse('﻿' + linhas.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="engajamento-global-${periodo}dias.csv"`,
    },
  })
}
