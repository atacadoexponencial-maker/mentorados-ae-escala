'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirAdmin } from '../mentorados/actions'

export type EstadoConteudo = { ok: boolean; erro: string | null }

export async function criarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!titulo) {
    return { ok: false, erro: 'Informe o nome do módulo' }
  }

  const admin = createAdminClient()
  const { data: ultimo } = await admin
    .from('modulos')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from('modulos').insert({
    titulo,
    descricao: descricao || null,
    ordem: (ultimo?.ordem ?? 0) + 1,
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível criar o módulo. Tente novamente.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}

export async function moverModulo(moduloId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { data: modulos } = await admin
    .from('modulos')
    .select('id, ordem')
    .order('ordem')
  if (!modulos) return

  const indice = modulos.findIndex((m) => m.id === moduloId)
  const vizinho = direcao === 'cima' ? modulos[indice - 1] : modulos[indice + 1]
  if (indice === -1 || !vizinho) return

  const atual = modulos[indice]
  await admin.from('modulos').update({ ordem: vizinho.ordem }).eq('id', atual.id)
  await admin.from('modulos').update({ ordem: atual.ordem }).eq('id', vizinho.id)

  revalidatePath('/admin/conteudo')
}

export async function criarAula(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const moduloId = String(formData.get('moduloId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pandaVideoId = String(formData.get('pandaVideoId') ?? '').trim()
  if (!moduloId || !titulo) {
    return { ok: false, erro: 'Informe o título da aula' }
  }

  const admin = createAdminClient()
  const { data: ultima } = await admin
    .from('aulas')
    .select('ordem')
    .eq('modulo_id', moduloId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from('aulas').insert({
    modulo_id: moduloId,
    titulo,
    descricao: descricao || null,
    panda_video_id: pandaVideoId || null,
    ordem: (ultima?.ordem ?? 0) + 1,
    publicada: false,
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível criar a aula.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}

const CAPA_MAX_BYTES = 2 * 1024 * 1024

export async function definirCapa(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!aulaId || !(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem' }
  }
  if (!arquivo.type.startsWith('image/')) {
    return { ok: false, erro: 'O arquivo precisa ser uma imagem' }
  }
  if (arquivo.size > CAPA_MAX_BYTES) {
    return { ok: false, erro: 'Imagem muito grande (máximo 2 MB)' }
  }

  const admin = createAdminClient()
  const extensao = (arquivo.name.split('.').pop() ?? 'jpg').toLowerCase()
  const caminho = `capas/${aulaId}.${extensao}`

  const { error: erroUpload } = await admin.storage
    .from('conteudo')
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar a imagem.' }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('conteudo').getPublicUrl(caminho)

  const { error } = await admin.from('aulas').update({ capa_url: publicUrl }).eq('id', aulaId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar a capa.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}

export async function excluirModulo(moduloId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { count } = await admin
    .from('aulas')
    .select('id', { count: 'exact', head: true })
    .eq('modulo_id', moduloId)
  if ((count ?? 0) > 0) return

  await admin.from('modulos').delete().eq('id', moduloId)
  revalidatePath('/admin/conteudo')
}

export async function editarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const moduloId = String(formData.get('moduloId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!moduloId || !titulo) {
    return { ok: false, erro: 'Informe o nome do módulo' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('modulos')
    .update({ titulo, descricao: descricao || null })
    .eq('id', moduloId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar. Tente novamente.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}
