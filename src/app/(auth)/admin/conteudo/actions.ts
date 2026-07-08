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

export async function editarAula(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pandaVideoId = String(formData.get('pandaVideoId') ?? '').trim()
  if (!aulaId || !titulo) {
    return { ok: false, erro: 'Informe o título da aula' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('aulas')
    .update({
      titulo,
      descricao: descricao || null,
      panda_video_id: pandaVideoId || null,
    })
    .eq('id', aulaId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}

export async function moverAula(aulaId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { data: aula } = await admin
    .from('aulas')
    .select('id, modulo_id, ordem')
    .eq('id', aulaId)
    .maybeSingle()
  if (!aula) return

  const { data: aulas } = await admin
    .from('aulas')
    .select('id, ordem')
    .eq('modulo_id', aula.modulo_id)
    .order('ordem')
  if (!aulas) return

  const indice = aulas.findIndex((a) => a.id === aulaId)
  const vizinha = direcao === 'cima' ? aulas[indice - 1] : aulas[indice + 1]
  if (indice === -1 || !vizinha) return

  await admin.from('aulas').update({ ordem: vizinha.ordem }).eq('id', aula.id)
  await admin.from('aulas').update({ ordem: aulas[indice].ordem }).eq('id', vizinha.id)

  revalidatePath('/admin/conteudo')
}

export async function moverAulaParaModulo(
  aulaId: string,
  moduloDestinoId: string
): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { data: ultima } = await admin
    .from('aulas')
    .select('ordem')
    .eq('modulo_id', moduloDestinoId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  await admin
    .from('aulas')
    .update({ modulo_id: moduloDestinoId, ordem: (ultima?.ordem ?? 0) + 1 })
    .eq('id', aulaId)

  revalidatePath('/admin/conteudo')
}

export async function publicarAula(aulaId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()
  await admin.from('aulas').update({ publicada: true }).eq('id', aulaId)
  revalidatePath('/admin/conteudo')
}

export async function despublicarAula(aulaId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()
  await admin.from('aulas').update({ publicada: false }).eq('id', aulaId)
  revalidatePath('/admin/conteudo')
}

export async function excluirAula(aulaId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  await admin.from('aulas').delete().eq('id', aulaId)

  // Limpa arquivos do storage (capa + materiais enviados)
  const { data: arquivosMateriais } = await admin.storage
    .from('conteudo')
    .list(`materiais/${aulaId}`)
  const caminhos = (arquivosMateriais ?? []).map((a) => `materiais/${aulaId}/${a.name}`)
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
    caminhos.push(`capas/${aulaId}.${ext}`)
  }
  if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)

  revalidatePath('/admin/conteudo')
}

const MATERIAL_MAX_BYTES = 20 * 1024 * 1024

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/]/g, '_').replace(/[^\p{L}\p{N}._ -]/gu, '').trim() || 'arquivo'
}

async function proximaOrdemMaterial(aulaId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: ultimo } = await admin
    .from('aula_materiais')
    .select('ordem')
    .eq('aula_id', aulaId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (ultimo?.ordem ?? 0) + 1
}

export async function adicionarMaterialArquivo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) return { ok: false, erro: 'Acesso negado' }

  const aulaId = String(formData.get('aulaId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!aulaId || !(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha um arquivo' }
  }
  if (arquivo.size > MATERIAL_MAX_BYTES) {
    return { ok: false, erro: 'Arquivo muito grande (máximo 20 MB)' }
  }

  const admin = createAdminClient()
  const nome = sanitizarNomeArquivo(arquivo.name)
  const caminho = `materiais/${aulaId}/${Date.now()}-${nome}`

  const { error: erroUpload } = await admin.storage
    .from('conteudo')
    .upload(caminho, arquivo, { contentType: arquivo.type || 'application/octet-stream' })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar o arquivo.' }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('conteudo').getPublicUrl(caminho)

  const { error } = await admin.from('aula_materiais').insert({
    aula_id: aulaId,
    nome,
    url: publicUrl,
    ordem: await proximaOrdemMaterial(aulaId),
  })
  if (error) {
    await admin.storage.from('conteudo').remove([caminho])
    return { ok: false, erro: 'Não foi possível salvar o material.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}

export async function adicionarMaterialLink(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  if (!(await exigirAdmin())) return { ok: false, erro: 'Acesso negado' }

  const aulaId = String(formData.get('aulaId') ?? '')
  const nome = String(formData.get('nome') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  if (!aulaId || !nome || !url) {
    return { ok: false, erro: 'Preencha nome e link' }
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, erro: 'O link precisa começar com http:// ou https://' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('aula_materiais').insert({
    aula_id: aulaId,
    nome,
    url,
    ordem: await proximaOrdemMaterial(aulaId),
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar o link.' }
  }

  revalidatePath('/admin/conteudo')
  return { ok: true, erro: null }
}

export async function removerMaterial(materialId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()

  const { data: material } = await admin
    .from('aula_materiais')
    .select('url')
    .eq('id', materialId)
    .maybeSingle()

  await admin.from('aula_materiais').delete().eq('id', materialId)

  // Se era upload nosso, remove o arquivo do bucket
  const prefixo = '/storage/v1/object/public/conteudo/'
  if (material?.url.includes(prefixo)) {
    const caminho = decodeURIComponent(material.url.split(prefixo)[1] ?? '')
    if (caminho) await admin.storage.from('conteudo').remove([caminho])
  }

  revalidatePath('/admin/conteudo')
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
