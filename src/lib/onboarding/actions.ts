'use server'

// Registro de "já viu o onboarding". Cada pessoa só marca a si mesma: o alvo é
// resolvido pela sessão, nunca por um id vindo do formulário — por isso não há
// como uma mentorada marcar o espaço de outra nem uma revendedora marcar por
// outra, mesmo forjando a requisição.
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirMentorado } from '@/app/(auth)/mentor/revendedores/actions'
import { getVinculoDoUsuario } from '@/lib/vinculo'

// A condição `is null` guarda a primeira marcação: chamar de novo, por duplo
// clique ou nova tentativa, não atualiza linha nenhuma e não dá erro.
export async function marcarTourVisto(): Promise<void> {
  const contexto = await exigirMentorado()
  if (!contexto) return

  const admin = createAdminClient()
  await admin
    .from('espacos')
    .update({ onboarding_visto_em: new Date().toISOString() })
    .eq('id', contexto.espacoId)
    .is('onboarding_visto_em', null)
}

export async function marcarCartaoVisto(): Promise<void> {
  const vinculo = await getVinculoDoUsuario()
  if (!vinculo?.revendedor) return

  const admin = createAdminClient()
  await admin
    .from('revendedores')
    .update({ onboarding_visto_em: new Date().toISOString() })
    .eq('id', vinculo.revendedor.id)
    .is('onboarding_visto_em', null)
}
