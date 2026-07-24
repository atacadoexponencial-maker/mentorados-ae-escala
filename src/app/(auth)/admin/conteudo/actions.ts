'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirEscopoConteudo, filtrarEscopo, conteudoNoEscopo } from './escopo'
import { garantirPastaModulo, criarSlotUpload, propriedadesVideo } from '@/integrations/panda/server'

export type EstadoConteudo = { ok: boolean; erro: string | null }

// A mesma ação serve /admin/conteudo (base) e /mentor/conteudo (do mentorado).
function revalidarConteudo() {
  revalidatePath('/admin/conteudo')
  revalidatePath('/mentor/conteudo')
}

export async function criarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!titulo) {
    return { ok: false, erro: 'Informe o nome do módulo' }
  }

  const admin = createAdminClient()
  const { data: ultimo } = await filtrarEscopo(
    admin.from('modulos').select('ordem'),
    escopo.espacoId
  )
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from('modulos').insert({
    titulo,
    descricao: descricao || null,
    ordem: (ultimo?.ordem ?? 0) + 1,
    espaco_id: escopo.espacoId,
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível criar o módulo. Tente novamente.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function moverModulo(moduloId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  const admin = createAdminClient()

  const { data: modulos } = await filtrarEscopo(
    admin.from('modulos').select('id, ordem'),
    escopo.espacoId
  ).order('ordem')
  if (!modulos) return

  const indice = modulos.findIndex((m: { id: string }) => m.id === moduloId)
  const vizinho = direcao === 'cima' ? modulos[indice - 1] : modulos[indice + 1]
  if (indice === -1 || !vizinho) return

  const atual = modulos[indice]
  await admin.from('modulos').update({ ordem: vizinho.ordem }).eq('id', atual.id)
  await admin.from('modulos').update({ ordem: atual.ordem }).eq('id', vizinho.id)

  revalidarConteudo()
}

export async function criarAula(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const moduloId = String(formData.get('moduloId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pandaVideoId = String(formData.get('pandaVideoId') ?? '').trim()
  if (!moduloId || !titulo) {
    return { ok: false, erro: 'Informe o título da aula' }
  }
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
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
    espaco_id: escopo.espacoId,
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível criar a aula.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

const CAPA_MAX_BYTES = 2 * 1024 * 1024

export async function definirCapa(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
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
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
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

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function editarAula(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pandaVideoId = String(formData.get('pandaVideoId') ?? '').trim()
  if (!aulaId || !titulo) {
    return { ok: false, erro: 'Informe o título da aula' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
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

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function moverAula(aulaId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return
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

  revalidarConteudo()
}

export async function moverAulaParaModulo(
  aulaId: string,
  moduloDestinoId: string
): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (
    !(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId)) ||
    !(await conteudoNoEscopo('modulos', moduloDestinoId, escopo.espacoId))
  ) {
    return
  }
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

  revalidarConteudo()
}

export async function publicarAula(aulaId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return
  const admin = createAdminClient()
  await admin.from('aulas').update({ publicada: true }).eq('id', aulaId)
  revalidarConteudo()
}

export async function despublicarAula(aulaId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return
  const admin = createAdminClient()
  await admin.from('aulas').update({ publicada: false }).eq('id', aulaId)
  revalidarConteudo()
}

export async function excluirAula(aulaId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return
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

  revalidarConteudo()
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
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  const aulaId = String(formData.get('aulaId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!aulaId || !(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha um arquivo' }
  }
  if (arquivo.size > MATERIAL_MAX_BYTES) {
    return { ok: false, erro: 'Arquivo muito grande (máximo 20 MB)' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
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

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function adicionarMaterialLink(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  const aulaId = String(formData.get('aulaId') ?? '')
  const nome = String(formData.get('nome') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  if (!aulaId || !nome || !url) {
    return { ok: false, erro: 'Preencha nome e link' }
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, erro: 'O link precisa começar com http:// ou https://' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
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

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function removerMaterial(materialId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  const admin = createAdminClient()

  const { data: material } = await admin
    .from('aula_materiais')
    .select('url, aula_id')
    .eq('id', materialId)
    .maybeSingle()
  if (!material) return
  if (!(await conteudoNoEscopo('aulas', material.aula_id, escopo.espacoId))) return

  await admin.from('aula_materiais').delete().eq('id', materialId)

  // Se era upload nosso, remove o arquivo do bucket
  const prefixo = '/storage/v1/object/public/conteudo/'
  if (material?.url.includes(prefixo)) {
    const caminho = decodeURIComponent(material.url.split(prefixo)[1] ?? '')
    if (caminho) await admin.storage.from('conteudo').remove([caminho])
  }

  revalidarConteudo()
}

export async function excluirModulo(moduloId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo.espacoId))) return
  const admin = createAdminClient()

  const { count } = await admin
    .from('aulas')
    .select('id', { count: 'exact', head: true })
    .eq('modulo_id', moduloId)
  if ((count ?? 0) > 0) return

  await admin.from('modulos').delete().eq('id', moduloId)
  revalidarConteudo()
}

export async function editarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const moduloId = String(formData.get('moduloId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!moduloId || !titulo) {
    return { ok: false, erro: 'Informe o nome do módulo' }
  }
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('modulos')
    .update({ titulo, descricao: descricao || null })
    .eq('id', moduloId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar. Tente novamente.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

// Cria o slot de upload no Panda para a aula (pasta do módulo garantida) e marca
// a aula como 'processando'. O navegador sobe o arquivo direto na uploadUrl.
export async function iniciarUploadVideo(
  aulaId: string,
  filename: string,
  size: number
): Promise<{ ok: boolean; erro?: string; uploadUrl?: string; videoId?: string }> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { data: aula } = await admin.from('aulas').select('id, modulo_id').eq('id', aulaId).single()
  if (!aula) return { ok: false, erro: 'Aula não encontrada' }

  try {
    const folderId = await garantirPastaModulo(aula.modulo_id)
    const { uploadUrl, videoId } = await criarSlotUpload({ folderId, filename, size })
    await admin
      .from('aulas')
      .update({ panda_video_id: videoId, video_status: 'processando' })
      .eq('id', aulaId)
    revalidarConteudo()
    return { ok: true, uploadUrl, videoId }
  } catch {
    return { ok: false, erro: 'Não foi possível iniciar o upload no Panda.' }
  }
}

// Consulta o Panda e, se pronto, grava status + duração. Usada em polling.
export async function sincronizarStatusVideo(
  aulaId: string
): Promise<{ status: 'processando' | 'pronto' | 'sem-video' }> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { status: 'sem-video' }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo.espacoId))) return { status: 'sem-video' }

  const admin = createAdminClient()
  const { data: aula } = await admin
    .from('aulas')
    .select('panda_video_id')
    .eq('id', aulaId)
    .single()
  if (!aula?.panda_video_id) return { status: 'sem-video' }

  try {
    const { status, duracaoSegundos } = await propriedadesVideo(aula.panda_video_id)
    const pronto = /convert(ed)?|ready|done|pronto|ativ/i.test(status)
    if (pronto) {
      await admin
        .from('aulas')
        .update({ video_status: 'pronto', duracao_segundos: duracaoSegundos })
        .eq('id', aulaId)
      revalidarConteudo()
      return { status: 'pronto' }
    }
    return { status: 'processando' }
  } catch {
    return { status: 'processando' }
  }
}
