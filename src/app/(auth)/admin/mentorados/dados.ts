// Server-only: leitura consolidada dos mentorados para o admin.
import { createAdminClient } from '@/integrations/supabase/admin'

export type MentoradoLinha = {
  id: string
  userId: string | null
  nome: string
  email: string
  marca: string
  slug: string
  qtdRevendedores: number
  status: 'ativo' | 'inativo' | 'convite-pendente'
}

export async function listarMentorados(): Promise<MentoradoLinha[]> {
  const admin = createAdminClient()

  const [{ data: espacos }, { data: revendedores }, { data: usuarios }] = await Promise.all([
    admin
      .from('espacos')
      .select('id, slug, nome_curso, ativo, mentorado_user_id, created_at')
      .order('created_at'),
    admin.from('revendedores').select('espaco_id'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const contagem = new Map<string, number>()
  for (const r of revendedores ?? []) {
    contagem.set(r.espaco_id, (contagem.get(r.espaco_id) ?? 0) + 1)
  }

  const usuarioPorId = new Map((usuarios?.users ?? []).map((u) => [u.id, u]))

  const donosIds = (espacos ?? [])
    .map((e) => e.mentorado_user_id)
    .filter((id): id is string => Boolean(id))
  const { data: perfis } = donosIds.length
    ? await admin.from('profiles').select('id, nome, email').in('id', donosIds)
    : { data: [] }
  const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]))

  return (espacos ?? []).map((e) => {
    const dono = e.mentorado_user_id ? usuarioPorId.get(e.mentorado_user_id) : undefined
    const perfil = e.mentorado_user_id ? perfilPorId.get(e.mentorado_user_id) : undefined
    const status: MentoradoLinha['status'] = !e.ativo
      ? 'inativo'
      : dono && !dono.last_sign_in_at
        ? 'convite-pendente'
        : 'ativo'
    return {
      id: e.id,
      userId: e.mentorado_user_id,
      nome: perfil?.nome ?? '—',
      email: perfil?.email ?? '—',
      marca: e.nome_curso,
      slug: e.slug,
      qtdRevendedores: contagem.get(e.id) ?? 0,
      status,
    }
  })
}
