'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'

export type EstadoMentorado = { ok: boolean; erro: string | null }

// Garante que a sessão atual é de um admin; retorna o user id ou null.
export async function exigirAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: ehAdmin } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  return ehAdmin ? user.id : null
}

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function cadastrarMentorado(
  _estadoAnterior: EstadoMentorado,
  formData: FormData
): Promise<EstadoMentorado> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const marca = String(formData.get('marca') ?? '').trim()
  const slug = String(formData.get('endereco') ?? '').trim().toLowerCase()

  if (!nome || !email || !marca || !slug) {
    return { ok: false, erro: 'Preencha todos os campos' }
  }
  if (slug.length < 3 || slug.length > 40 || !SLUG_VALIDO.test(slug)) {
    return {
      ok: false,
      erro: 'Endereço inválido: use só letras minúsculas, números e hífens (ex.: joao-atacados)',
    }
  }

  const admin = createAdminClient()

  const { data: slugExistente } = await admin
    .from('espacos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugExistente) {
    return { ok: false, erro: 'Este endereço já está em uso por outro mentorado' }
  }

  // Convite cria o usuário e envia o e-mail de primeiro acesso
  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${origem}/${slug}/primeiro-acesso`,
  })
  if (erroConvite || !convite.user) {
    const jaExiste = erroConvite?.message.toLowerCase().includes('already')
    return {
      ok: false,
      erro: jaExiste ? 'Este e-mail já está em uso' : 'Não foi possível criar o mentorado. Tente novamente.',
    }
  }

  const { error: erroPapel } = await admin
    .from('user_roles')
    .insert({ user_id: convite.user.id, role: 'mentorado' })
  const { error: erroEspaco } = erroPapel
    ? { error: erroPapel }
    : await admin.from('espacos').insert({
        slug,
        nome_curso: marca,
        mentorado_user_id: convite.user.id,
      })

  if (erroPapel || erroEspaco) {
    // Não deixa usuário órfão se o espaço falhou
    await admin.auth.admin.deleteUser(convite.user.id)
    return { ok: false, erro: 'Não foi possível concluir o cadastro. Tente novamente.' }
  }

  revalidatePath('/admin/mentorados')
  return { ok: true, erro: null }
}

export async function desativarMentorado(espacoId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()
  await admin.from('espacos').update({ ativo: false }).eq('id', espacoId)
  revalidatePath('/admin/mentorados')
}

export async function reativarMentorado(espacoId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()
  await admin.from('espacos').update({ ativo: true }).eq('id', espacoId)
  revalidatePath('/admin/mentorados')
}

export async function editarMentorado(
  _estadoAnterior: EstadoMentorado,
  formData: FormData
): Promise<EstadoMentorado> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const espacoId = String(formData.get('espacoId') ?? '')
  const nome = String(formData.get('nome') ?? '').trim()
  const marca = String(formData.get('marca') ?? '').trim()
  const slug = String(formData.get('endereco') ?? '').trim().toLowerCase()

  if (!espacoId || !nome || !marca || !slug) {
    return { ok: false, erro: 'Preencha todos os campos' }
  }
  if (slug.length < 3 || slug.length > 40 || !SLUG_VALIDO.test(slug)) {
    return {
      ok: false,
      erro: 'Endereço inválido: use só letras minúsculas, números e hífens (ex.: joao-atacados)',
    }
  }

  const admin = createAdminClient()

  const { data: slugExistente } = await admin
    .from('espacos')
    .select('id')
    .eq('slug', slug)
    .neq('id', espacoId)
    .maybeSingle()
  if (slugExistente) {
    return { ok: false, erro: 'Este endereço já está em uso por outro mentorado' }
  }

  const { data: espaco, error: erroEspaco } = await admin
    .from('espacos')
    .update({ nome_curso: marca, slug })
    .eq('id', espacoId)
    .select('mentorado_user_id')
    .single()
  if (erroEspaco) {
    return { ok: false, erro: 'Não foi possível salvar. Tente novamente.' }
  }

  if (espaco.mentorado_user_id) {
    await admin.from('profiles').update({ nome }).eq('id', espaco.mentorado_user_id)
  }

  revalidatePath('/admin/mentorados')
  return { ok: true, erro: null }
}
