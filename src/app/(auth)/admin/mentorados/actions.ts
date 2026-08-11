'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'
import { BUCKET_MATERIAIS } from '@/lib/materiais/regras'

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
    const limiteEmail = erroConvite?.code === 'over_email_send_rate_limit'
    return {
      ok: false,
      erro: jaExiste
        ? 'Este e-mail já está em uso'
        : limiteEmail
          ? 'Limite de envio de e-mails por hora atingido. Tente novamente em 1 hora.'
          : 'Não foi possível criar o mentorado. Tente novamente.',
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

export async function reenviarConviteMentorado(espacoId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { data: espaco } = await admin
    .from('espacos')
    .select('slug, mentorado_user_id')
    .eq('id', espacoId)
    .maybeSingle()
  if (!espaco?.mentorado_user_id) return

  const { data: usuario } = await admin.auth.admin.getUserById(espaco.mentorado_user_id)
  // Só reenvia para quem nunca logou (convite pendente)
  if (!usuario.user || usuario.user.last_sign_in_at) return

  const email = usuario.user.email!
  const nome = (usuario.user.user_metadata?.nome as string | undefined) ?? null

  // Supabase não re-convida usuário existente: remove o pendente e convida de novo
  await admin.auth.admin.deleteUser(espaco.mentorado_user_id)

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const { data: convite, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${origem}/${espaco.slug}/primeiro-acesso`,
  })

  // Convite falhou (ex.: limite de e-mails/hora): recria o usuário pendente
  // sem enviar e-mail, para o espaço não ficar sem dono.
  const novoUsuario = convite?.user
    ? convite.user
    : (
        await admin.auth.admin.createUser({
          email,
          user_metadata: { nome },
          email_confirm: false,
        })
      ).data.user
  if (error && !convite?.user) {
    console.error('Reenvio de convite falhou (usuário recriado sem e-mail):', error.message)
  }
  if (!novoUsuario) {
    revalidatePath('/admin/mentorados')
    return
  }

  await admin.from('user_roles').insert({ user_id: novoUsuario.id, role: 'mentorado' })
  await admin.from('espacos').update({ mentorado_user_id: novoUsuario.id }).eq('id', espacoId)

  revalidatePath('/admin/mentorados')
}

export type DependenciasMentorado = {
  slug: string
  marca: string
  email: string | null
  revendedoras: number
  modulos: number
  aulas: number
  capas: number
  temPandaFolder: boolean
}

// O que some junto se este mentorado for excluído. Serve para a tela mostrar o
// tamanho do estrago antes de perguntar — exclusão aqui é irreversível e leva a
// conta de uma pessoa real junto.
export async function dependenciasDoMentorado(
  espacoId: string
): Promise<DependenciasMentorado | null> {
  if (!(await exigirAdmin())) return null
  const admin = createAdminClient()

  const { data: espaco } = await admin
    .from('espacos')
    .select('id, slug, nome_curso, mentorado_user_id, panda_folder_id')
    .eq('id', espacoId)
    .maybeSingle()
  if (!espaco) return null

  const contar = async (tabela: 'revendedores' | 'modulos' | 'aulas' | 'aula_capas_espaco') => {
    const { count } = await admin
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .eq('espaco_id', espacoId)
    return count ?? 0
  }

  const [revendedoras, modulos, aulas, capas] = await Promise.all([
    contar('revendedores'),
    contar('modulos'),
    contar('aulas'),
    contar('aula_capas_espaco'),
  ])

  let email: string | null = null
  if (espaco.mentorado_user_id) {
    const { data } = await admin.auth.admin.getUserById(espaco.mentorado_user_id)
    email = data.user?.email ?? null
  }

  return {
    slug: espaco.slug,
    marca: espaco.nome_curso,
    email,
    revendedoras,
    modulos,
    aulas,
    capas,
    temPandaFolder: Boolean(espaco.panda_folder_id),
  }
}

// Exclusão definitiva. O banco cascateia as linhas a partir de espacos
// (revendedores, modulos, aulas, capas por marca, visualizações), mas duas
// coisas ele não alcança e precisam ser feitas aqui: as contas no Auth e os
// arquivos no Storage. A pasta no Panda Video fica — apagar vídeo é destrutivo
// de um jeito que não cabe num efeito colateral de outra ação.
export async function excluirMentorado(espacoId: string, confirmacao: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { data: espaco } = await admin
    .from('espacos')
    .select('id, slug, mentorado_user_id, panda_folder_id')
    .eq('id', espacoId)
    .maybeSingle()
  if (!espaco) return

  // A tela pede o endereço digitado. Conferir de novo aqui, no servidor, porque
  // o cliente não é autoridade sobre nada — muito menos sobre isto.
  if (confirmacao.trim().toLowerCase() !== espaco.slug) return

  // Coletado antes de apagar: depois da exclusão não há mais como descobrir
  // quais usuários e arquivos pertenciam a este espaço.
  const [{ data: revendedoras }, { data: aulas }] = await Promise.all([
    admin.from('revendedores').select('user_id').eq('espaco_id', espacoId),
    admin.from('aulas').select('id').eq('espaco_id', espacoId),
  ])

  for (const aula of aulas ?? []) {
    const { data: arquivos } = await admin.storage.from(BUCKET_MATERIAIS).list(aula.id)
    if (arquivos?.length) {
      await admin.storage
        .from(BUCKET_MATERIAIS)
        .remove(arquivos.map((a) => `${aula.id}/${a.name}`))
    }
  }

  for (const pasta of ['logos', 'banners', 'capas']) {
    const { data: arquivos } = await admin.storage.from('conteudo').list(pasta, {
      search: espacoId,
    })
    if (arquivos?.length) {
      await admin.storage.from('conteudo').remove(arquivos.map((a) => `${pasta}/${a.name}`))
    }
  }

  // Aulas antes de módulos: aulas.modulo_id é ON DELETE RESTRICT, e a cascata a
  // partir de espacos não garante ordem entre as duas tabelas.
  await admin.from('aulas').delete().eq('espaco_id', espacoId)
  await admin.from('modulos').delete().eq('espaco_id', espacoId)
  await admin.from('espacos').delete().eq('id', espacoId)

  for (const r of revendedoras ?? []) {
    if (r.user_id) await admin.auth.admin.deleteUser(r.user_id)
  }
  if (espaco.mentorado_user_id) {
    await admin.from('user_roles').delete().eq('user_id', espaco.mentorado_user_id)
    await admin.auth.admin.deleteUser(espaco.mentorado_user_id)
  }

  if (espaco.panda_folder_id) {
    console.warn(
      `Espaço ${espaco.slug} excluído. A pasta ${espaco.panda_folder_id} continua no Panda Video — remoção é manual.`
    )
  }

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
