import 'server-only'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'
import { podeGerenciarEspaco, type EscopoConteudo } from './autorizacao'

// admin gerencia qualquer espaço; mentorado gerencia só o próprio.
export async function exigirEscopoConteudo(): Promise<EscopoConteudo | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: ehAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (ehAdmin) return { ehAdmin: true, espacoId: null }

  const { data: ehMentorado } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'mentorado',
  })
  if (!ehMentorado) return null

  const { data: espaco } = await supabase
    .from('espacos')
    .select('id')
    .eq('mentorado_user_id', user.id)
    .maybeSingle()
  if (!espaco) return null
  return { ehAdmin: false, espacoId: espaco.id }
}

// Aplica o filtro de espaço a uma query, preservando o tipo (null precisa de .is, não .eq).
export function filtrarEscopo<T>(query: T, espacoId: string | null): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any
  return (espacoId === null ? q.is('espaco_id', null) : q.eq('espaco_id', espacoId)) as T
}

// Confirma que o escopo pode gerenciar a linha (admin: qualquer; mentor: própria).
export async function conteudoNoEscopo(
  tabela: 'modulos' | 'aulas',
  id: string,
  escopo: EscopoConteudo
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from(tabela).select('espaco_id').eq('id', id).maybeSingle()
  if (!data) return false
  return podeGerenciarEspaco(escopo, data.espaco_id ?? null)
}
