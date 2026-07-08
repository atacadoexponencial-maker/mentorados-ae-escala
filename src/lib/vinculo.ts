// Uso exclusivo no servidor: papel e vínculo de espaço do usuário logado.
import { createClient } from '@/integrations/supabase/server'

export type Vinculo = {
  userId: string
  email: string | null
  roles: Set<'admin' | 'mentorado' | 'revendedor'>
  // Presente quando o usuário é revendedora
  revendedor: { id: string; espacoId: string; espacoSlug: string; status: string } | null
}

export async function getVinculoDoUsuario(): Promise<Vinculo | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: papeis }, { data: revendedor }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase
      .from('revendedores')
      .select('id, espaco_id, status, espacos(slug)')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const rev = revendedor as
    | { id: string; espaco_id: string; status: string; espacos: { slug: string } | null }
    | null

  return {
    userId: user.id,
    email: user.email ?? null,
    roles: new Set((papeis ?? []).map((p: { role: string }) => p.role)) as Vinculo['roles'],
    revendedor: rev
      ? {
          id: rev.id,
          espacoId: rev.espaco_id,
          espacoSlug: rev.espacos?.slug ?? '',
          status: rev.status,
        }
      : null,
  }
}
