'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'

export type EstadoLogin = { erro: string | null }

export async function fazerLogin(
  _estadoAnterior: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')
  const espacoSlugDaPagina = String(formData.get('espacoSlug') ?? '').trim()

  const supabase = await createClient()
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })

  if (error || !auth.user) {
    return { erro: 'E-mail ou senha incorretos' }
  }

  const { data: papeis } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)

  const roles = new Set((papeis ?? []).map((p: { role: string }) => p.role))

  if (roles.has('admin')) {
    redirect('/admin/mentorados')
  }

  if (roles.has('mentorado')) {
    const { data: espacoDoMentorado } = await supabase
      .from('espacos')
      .select('ativo')
      .eq('mentorado_user_id', auth.user.id)
      .maybeSingle()
    if (espacoDoMentorado && !espacoDoMentorado.ativo) {
      await supabase.auth.signOut()
      return { erro: 'Este espaço está temporariamente indisponível. Fale com o Atacado Exponencial.' }
    }
    redirect('/mentor/personalizacao')
  }

  if (roles.has('revendedor')) {
    // Espaço do revendedor vem do vínculo no banco (não do endereço digitado)
    const { data: revendedor } = await supabase
      .from('revendedores')
      .select('id, status, espacos(slug, ativo)')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (revendedor?.status === 'inativo') {
      await supabase.auth.signOut()
      return { erro: 'Seu acesso foi revogado. Fale com seu mentor.' }
    }

    const espacoDoVinculo = (revendedor as { espacos?: { slug?: string; ativo?: boolean } } | null)
      ?.espacos
    if (espacoDoVinculo && espacoDoVinculo.ativo === false) {
      await supabase.auth.signOut()
      return { erro: 'Este espaço está temporariamente indisponível. Fale com o Atacado Exponencial.' }
    }
    const slug = espacoDoVinculo?.slug

    // Login feito pela página de um espaço que não é o dela → negado
    if (espacoSlugDaPagina && slug && espacoSlugDaPagina !== slug) {
      await supabase.auth.signOut()
      return { erro: 'Você não faz parte deste espaço. Confira o endereço com seu mentor.' }
    }

    if (slug) {
      // Registro de último acesso é escrita administrativa (RLS não permite update pelo próprio)
      const admin = createAdminClient()
      await admin
        .from('revendedores')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('user_id', auth.user.id)
      redirect(`/${slug}`)
    }
  }

  await supabase.auth.signOut()
  return { erro: 'Conta sem perfil configurado. Fale com o suporte.' }
}
