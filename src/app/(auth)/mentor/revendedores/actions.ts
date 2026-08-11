'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirEscopoConteudo } from '@/app/(auth)/admin/conteudo/escopo'
import { podeGerenciarEspaco } from '@/app/(auth)/admin/conteudo/autorizacao'
import { ehUuid } from '@/lib/upload'

export type EstadoRevendedora = {
  ok: boolean
  erro: string | null
  aviso?: string | null
  // Id da revendedora recém-criada, para oferecer o link de convite na hora.
  revendedoraId?: string | null
}

// Arquivo 'use server' só exporta funções async — a constante vive aqui sem export
// (espelhada em limite.ts para uso na interface)
const LIMITE_REVENDEDORAS = 1000

// Garante que a sessão é de um mentorado dono de espaço ativo.
export async function exigirMentorado(): Promise<{
  userId: string
  espacoId: string
  slug: string
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: ehMentorado } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'mentorado',
  })
  if (!ehMentorado) return null

  const { data: espaco } = await supabase
    .from('espacos')
    .select('id, slug, ativo')
    .eq('mentorado_user_id', user.id)
    .maybeSingle()
  if (!espaco || !espaco.ativo) return null

  return { userId: user.id, espacoId: espaco.id, slug: espaco.slug }
}

type ResultadoCriacao =
  | { ok: true; aviso: string | null; revendedoraId: string | null }
  | { ok: false; erro: string }

// Núcleo compartilhado entre cadastro individual e importação em massa.
async function criarRevendedora(
  contexto: { espacoId: string; slug: string; origem: string },
  dados: { nome: string; email: string; whatsapp: string | null }
): Promise<ResultadoCriacao> {
  const admin = createAdminClient()

  const { count } = await admin
    .from('revendedores')
    .select('id', { count: 'exact', head: true })
    .eq('espaco_id', contexto.espacoId)
  if ((count ?? 0) >= LIMITE_REVENDEDORAS) {
    return { ok: false, erro: `Limite de ${LIMITE_REVENDEDORAS} revendedoras atingido` }
  }

  const { data: duplicada } = await admin
    .from('revendedores')
    .select('id')
    .eq('espaco_id', contexto.espacoId)
    .eq('email', dados.email)
    .maybeSingle()
  if (duplicada) {
    return { ok: false, erro: 'Este e-mail já está cadastrado no seu espaço' }
  }

  // Convida (envia e-mail); se o SMTP limitar, cria sem e-mail para reenviar depois
  let usuarioId: string | null = null
  let aviso: string | null = null
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(
    dados.email,
    {
      data: { nome: dados.nome },
      redirectTo: `${contexto.origem}/${contexto.slug}/primeiro-acesso`,
    }
  )
  if (convite?.user) {
    usuarioId = convite.user.id
  } else if (erroConvite?.code === 'over_email_send_rate_limit') {
    const { data: criado } = await admin.auth.admin.createUser({
      email: dados.email,
      user_metadata: { nome: dados.nome },
      email_confirm: false,
    })
    usuarioId = criado.user?.id ?? null
    aviso =
      'Cadastrada, mas o e-mail de convite não pôde ser enviado agora (limite por hora). Copie o link abaixo e mande para ela — ou use "Reenviar convite" mais tarde.'
  } else if (erroConvite?.message.toLowerCase().includes('already')) {
    return { ok: false, erro: 'Este e-mail já está em uso em outro espaço' }
  }
  if (!usuarioId) {
    return { ok: false, erro: 'Não foi possível criar a revendedora. Tente novamente.' }
  }

  const { error: erroPapel } = await admin
    .from('user_roles')
    .insert({ user_id: usuarioId, role: 'revendedor' })
  const { data: linha, error: erroLinha } = erroPapel
    ? { data: null, error: erroPapel }
    : await admin
        .from('revendedores')
        .insert({
          user_id: usuarioId,
          espaco_id: contexto.espacoId,
          nome: dados.nome,
          email: dados.email,
          whatsapp: dados.whatsapp,
          status: 'convite-pendente',
        })
        .select('id')
        .single()
  if (erroPapel || erroLinha) {
    await admin.auth.admin.deleteUser(usuarioId)
    return { ok: false, erro: 'Não foi possível concluir o cadastro. Tente novamente.' }
  }

  return { ok: true, aviso, revendedoraId: linha?.id ?? null }
}

export async function cadastrarRevendedora(
  _estadoAnterior: EstadoRevendedora,
  formData: FormData
): Promise<EstadoRevendedora> {
  const contexto = await espacoDaAcao(String(formData.get('espacoId') ?? '') || null)
  if (!contexto) return { ok: false, erro: 'Acesso negado' }

  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const whatsapp = String(formData.get('whatsapp') ?? '').trim() || null
  if (!nome || !email) {
    return { ok: false, erro: 'Preencha nome e e-mail' }
  }

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const resultado = await criarRevendedora(
    { espacoId: contexto.espacoId, slug: contexto.slug, origem },
    { nome, email, whatsapp }
  )
  if (!resultado.ok) return { ok: false, erro: resultado.erro }

  revalidarRevendedoras(contexto.slug)
  return {
    ok: true,
    erro: null,
    aviso: resultado.aviso,
    revendedoraId: resultado.revendedoraId,
  }
}

// Em qual espaço esta ação vai agir. A admin escolhe pela tela; a mentorada só
// pode o dela, e o id que vier do formulário é ignorado para ela.
//
// Reusa `exigirEscopoConteudo`/`podeGerenciarEspaco`: apesar do nome, a regra
// ali é "admin gerencia qualquer espaço, mentorado só o próprio" — exatamente
// esta. Duplicar criaria uma segunda verdade sobre isolamento entre marcas, que
// é o último lugar do sistema onde se pode ter duas versões da mesma regra.
async function espacoDaAcao(
  espacoIdDoFormulario: string | null
): Promise<{ espacoId: string; slug: string } | null> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return null

  const alvo = escopo.ehAdmin ? espacoIdDoFormulario : escopo.espacoId
  if (!alvo || !ehUuid(alvo) || !podeGerenciarEspaco(escopo, alvo)) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('espacos')
    .select('id, slug, ativo')
    .eq('id', alvo)
    .maybeSingle()
  if (!data?.ativo) return null
  return { espacoId: data.id, slug: data.slug }
}

// Retorna a revendedora só se quem está logado puder gerenciar o espaço dela.
async function revendedoraDoEspaco(revendedoraId: string) {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('revendedores')
    .select('id, user_id, email, nome, status, espaco_id, espacos(slug)')
    .eq('id', revendedoraId)
    .maybeSingle()
  if (!data || !podeGerenciarEspaco(escopo, data.espaco_id)) return null

  const slug = (data as unknown as { espacos: { slug: string } | null }).espacos?.slug ?? ''
  return { revendedora: data, contexto: { espacoId: data.espaco_id, slug } }
}

// As duas telas que listam revendedora precisam recarregar depois de qualquer
// ação: a da mentorada e a da admin, que agora também mexe.
function revalidarRevendedoras(slug: string) {
  revalidatePath('/mentor/revendedores')
  if (slug) revalidatePath(`/admin/mentorados/${slug}`)
}

export type ResultadoLinkConvite = { ok: true; link: string } | { ok: false; erro: string }

// Devolve o mesmo acesso que vai dentro do e-mail de convite, em texto, para a
// mentorada mandar pelo canal que quiser. O link é montado sobre /auth/confirm,
// a rota que o projeto já usa para consumir token de e-mail — assim o caminho
// copiado e o caminho clicado no e-mail terminam no mesmo lugar.
//
// A interface avisa que gerar um link novo derruba o anterior. Isso vem do
// comportamento do GoTrue, que guarda um token por usuário — não foi verificado
// contra este projeto. O aviso é conservador de propósito: se por acaso os dois
// continuarem valendo, ninguém fica sem acesso; o contrário seria pior.
export async function gerarLinkConvite(revendedoraId: string): Promise<ResultadoLinkConvite> {
  const alvo = await revendedoraDoEspaco(revendedoraId)
  if (!alvo) return { ok: false, erro: 'Acesso negado' }
  if (alvo.revendedora.status !== 'convite-pendente') {
    return {
      ok: false,
      erro: 'Esta revendedora já fez o primeiro acesso — ela entra pela tela de login.',
    }
  }

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const destino = `/${alvo.contexto.slug}/primeiro-acesso`

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: alvo.revendedora.email,
    options: { redirectTo: `${origem}${destino}` },
  })

  const token = data?.properties?.hashed_token
  if (error || !token) {
    console.error('Geração de link de convite falhou:', error?.message)
    return { ok: false, erro: 'Não foi possível gerar o link agora. Tente de novo em instantes.' }
  }

  const parametros = new URLSearchParams({
    token_hash: token,
    type: 'magiclink',
    next: destino,
  })
  return { ok: true, link: `${origem}/auth/confirm?${parametros.toString()}` }
}

export async function desativarRevendedora(revendedoraId: string): Promise<void> {
  const alvo = await revendedoraDoEspaco(revendedoraId)
  if (!alvo) return
  const admin = createAdminClient()
  await admin.from('revendedores').update({ status: 'inativo' }).eq('id', revendedoraId)
  revalidarRevendedoras(alvo.contexto.slug)
}

export async function reativarRevendedora(revendedoraId: string): Promise<void> {
  const alvo = await revendedoraDoEspaco(revendedoraId)
  if (!alvo) return
  const admin = createAdminClient()
  await admin.from('revendedores').update({ status: 'ativo' }).eq('id', revendedoraId)
  revalidarRevendedoras(alvo.contexto.slug)
}

export async function reenviarConviteRevendedora(revendedoraId: string): Promise<void> {
  const alvo = await revendedoraDoEspaco(revendedoraId)
  if (!alvo || alvo.revendedora.status !== 'convite-pendente') return
  const admin = createAdminClient()

  if (alvo.revendedora.user_id) {
    const { data: usuario } = await admin.auth.admin.getUserById(alvo.revendedora.user_id)
    if (usuario.user?.last_sign_in_at) return
    await admin.auth.admin.deleteUser(alvo.revendedora.user_id)
  }

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'
  const { data: convite, error } = await admin.auth.admin.inviteUserByEmail(
    alvo.revendedora.email,
    {
      data: { nome: alvo.revendedora.nome },
      redirectTo: `${origem}/${alvo.contexto.slug}/primeiro-acesso`,
    }
  )
  const novoUsuario = convite?.user
    ? convite.user
    : (
        await admin.auth.admin.createUser({
          email: alvo.revendedora.email,
          user_metadata: { nome: alvo.revendedora.nome },
          email_confirm: false,
        })
      ).data.user
  if (error && !convite?.user) {
    console.error('Reenvio de convite de revendedora falhou:', error.message)
  }
  if (novoUsuario) {
    await admin.from('user_roles').insert({ user_id: novoUsuario.id, role: 'revendedor' })
    await admin
      .from('revendedores')
      .update({ user_id: novoUsuario.id })
      .eq('id', revendedoraId)
  }

  revalidarRevendedoras(alvo.contexto.slug)
}

export async function excluirRevendedora(revendedoraId: string): Promise<void> {
  const alvo = await revendedoraDoEspaco(revendedoraId)
  if (!alvo) return
  const admin = createAdminClient()

  // Histórico em aula_visualizacoes sobrevive via ON DELETE SET NULL
  await admin.from('revendedores').delete().eq('id', revendedoraId)
  if (alvo.revendedora.user_id) {
    await admin.auth.admin.deleteUser(alvo.revendedora.user_id)
  }

  revalidarRevendedoras(alvo.contexto.slug)
}

export async function importarRevendedoras(
  _estadoAnterior: EstadoRevendedora,
  formData: FormData
): Promise<EstadoRevendedora> {
  const contexto = await espacoDaAcao(String(formData.get('espacoId') ?? '') || null)
  if (!contexto) return { ok: false, erro: 'Acesso negado' }

  const lista = String(formData.get('lista') ?? '').trim()
  if (!lista) return { ok: false, erro: 'Cole a lista de revendedoras' }

  const cabecalhos = await headers()
  const origem = cabecalhos.get('origin') ?? 'http://localhost:3000'

  const linhas = lista
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  let criadas = 0
  const falhas: string[] = []
  let houveAvisoEmail = false

  for (const linha of linhas) {
    const [nomeBruto = '', emailBruto = ''] = linha.split(',').map((p) => p.trim())
    const email = emailBruto.toLowerCase()
    if (!nomeBruto || !email || !email.includes('@')) {
      falhas.push(`"${linha}": formato inválido (use: nome, e-mail)`)
      continue
    }
    const resultado = await criarRevendedora(
      { espacoId: contexto.espacoId, slug: contexto.slug, origem },
      { nome: nomeBruto, email, whatsapp: null }
    )
    if (resultado.ok) {
      criadas += 1
      if (resultado.aviso) houveAvisoEmail = true
    } else {
      falhas.push(`${email}: ${resultado.erro}`)
    }
  }

  revalidarRevendedoras(contexto.slug)
  const resumo = [
    `${criadas} ${criadas === 1 ? 'revendedora criada' : 'revendedoras criadas'}`,
    falhas.length ? `${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'}: ${falhas.join(' · ')}` : null,
    houveAvisoEmail
      ? 'Alguns convites não puderam ser enviados agora (limite de e-mails/hora) — use "Reenviar convite" mais tarde.'
      : null,
  ]
    .filter(Boolean)
    .join(' — ')

  return { ok: true, erro: null, aviso: resumo }
}
