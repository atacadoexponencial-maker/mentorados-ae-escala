'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'

export type EstadoPrimeiroAcesso = { erro: string | null }

export async function definirSenha(
  _estadoAnterior: EstadoPrimeiroAcesso,
  formData: FormData
): Promise<EstadoPrimeiroAcesso> {
  const senha = String(formData.get('senha') ?? '')
  const confirmacao = String(formData.get('confirmacao') ?? '')

  if (senha.length < 8) {
    return { erro: 'A senha precisa ter pelo menos 8 caracteres' }
  }
  if (senha !== confirmacao) {
    return { erro: 'As senhas não são iguais' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { erro: 'Sessão expirada. Abra o link do convite novamente.' }
  }

  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) {
    return { erro: 'Não foi possível salvar a senha. Tente novamente.' }
  }

  // Revendedor pendente é ativado no primeiro acesso (escrita administrativa)
  const admin = createAdminClient()
  await admin
    .from('revendedores')
    .update({ status: 'ativo' })
    .eq('user_id', user.id)
    .eq('status', 'convite-pendente')

  // Redireciona por papel (mesma regra da issue 11)
  const { data: papeis } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
  const roles = new Set((papeis ?? []).map((p: { role: string }) => p.role))

  if (roles.has('admin')) redirect('/admin/mentorados')
  if (roles.has('mentorado')) redirect('/mentor/personalizacao')

  const { data: revendedor } = await supabase
    .from('revendedores')
    .select('espacos(slug)')
    .eq('user_id', user.id)
    .maybeSingle()
  const slug = (revendedor as { espacos?: { slug?: string } } | null)?.espacos?.slug
  redirect(slug ? `/${slug}` : '/login')
}
