'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'

export type EstadoRevendedora = { ok: boolean; erro: string | null; aviso?: string | null }

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
  | { ok: true; aviso: string | null }
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
    aviso = 'Cadastrada, mas o e-mail de convite não pôde ser enviado agora (limite por hora). Use "Reenviar convite" mais tarde.'
  } else if (erroConvite?.message.toLowerCase().includes('already')) {
    return { ok: false, erro: 'Este e-mail já está em uso em outro espaço' }
  }
  if (!usuarioId) {
    return { ok: false, erro: 'Não foi possível criar a revendedora. Tente novamente.' }
  }

  const { error: erroPapel } = await admin
    .from('user_roles')
    .insert({ user_id: usuarioId, role: 'revendedor' })
  const { error: erroLinha } = erroPapel
    ? { error: erroPapel }
    : await admin.from('revendedores').insert({
        user_id: usuarioId,
        espaco_id: contexto.espacoId,
        nome: dados.nome,
        email: dados.email,
        whatsapp: dados.whatsapp,
        status: 'convite-pendente',
      })
  if (erroPapel || erroLinha) {
    await admin.auth.admin.deleteUser(usuarioId)
    return { ok: false, erro: 'Não foi possível concluir o cadastro. Tente novamente.' }
  }

  return { ok: true, aviso }
}

export async function cadastrarRevendedora(
  _estadoAnterior: EstadoRevendedora,
  formData: FormData
): Promise<EstadoRevendedora> {
  const contexto = await exigirMentorado()
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

  revalidatePath('/mentor/revendedores')
  return { ok: true, erro: null, aviso: resultado.aviso }
}

export async function importarRevendedoras(
  _estadoAnterior: EstadoRevendedora,
  formData: FormData
): Promise<EstadoRevendedora> {
  const contexto = await exigirMentorado()
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
    const [nomeBruto, emailBruto] = linha.split(',').map((p) => p?.trim() ?? '')
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

  revalidatePath('/mentor/revendedores')
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
