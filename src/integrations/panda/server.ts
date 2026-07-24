import 'server-only'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/integrations/supabase/admin'

// Cliente server-only do Panda. A PANDA_API_KEY NUNCA vai ao cliente.
const API = 'https://api-v2.pandavideo.com.br'
const b64 = (s: string) => Buffer.from(s).toString('base64')

async function pandaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: process.env.PANDA_API_KEY ?? '',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Panda ${path} -> ${res.status}`)
  return res
}

async function criarPasta(name: string, parentFolderId: string): Promise<string> {
  const res = await pandaFetch('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parent_folder_id: parentFolderId }),
  })
  const data = await res.json()
  return data.id as string
}

// Resolve/cria a pasta do módulo (e a do mentorado sob a raiz, se preciso),
// gravando os panda_folder_id no banco. Retorna o folder_id do módulo.
export async function garantirPastaModulo(moduloId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: modulo } = await admin
    .from('modulos')
    .select('id, titulo, espaco_id, panda_folder_id')
    .eq('id', moduloId)
    .single()
  if (!modulo) throw new Error('Módulo não encontrado')
  if (modulo.panda_folder_id) return modulo.panda_folder_id

  const raiz = process.env.PANDA_ROOT_FOLDER_ID
  if (!raiz) throw new Error('PANDA_ROOT_FOLDER_ID não configurado')

  let parent = raiz
  if (modulo.espaco_id) {
    const { data: espaco } = await admin
      .from('espacos')
      .select('id, nome_curso, panda_folder_id')
      .eq('id', modulo.espaco_id)
      .single()
    if (!espaco) throw new Error('Espaço não encontrado')
    if (espaco.panda_folder_id) {
      parent = espaco.panda_folder_id
    } else {
      parent = await criarPasta(espaco.nome_curso, raiz)
      await admin.from('espacos').update({ panda_folder_id: parent }).eq('id', espaco.id)
    }
  }

  const folderId = await criarPasta(modulo.titulo, parent)
  await admin.from('modulos').update({ panda_folder_id: folderId }).eq('id', modulo.id)
  return folderId
}

// Cria o slot de upload no Panda (dois passos, TUS). Retorna a URL do slot e o
// videoId. O PATCH do arquivo é feito pelo navegador direto nessa URL.
export async function criarSlotUpload({
  folderId,
  filename,
  size,
}: {
  folderId: string
  filename: string
  size: number
}): Promise<{ uploadUrl: string; videoId: string }> {
  const hostsRes = await pandaFetch('/hosts/uploader')
  const hostsData = (await hostsRes.json()) as { hosts: Record<string, string[]> }
  const all = Object.values(hostsData.hosts).flat()
  const host = all[Math.floor(Math.random() * all.length)]

  const videoId = randomUUID()
  const key = process.env.PANDA_API_KEY ?? ''
  const metadata = [
    `authorization ${b64(key)}`,
    `folder_id ${b64(folderId)}`,
    `filename ${b64(filename)}`,
    `video_id ${b64(videoId)}`,
  ].join(', ')

  const res = await fetch(`https://${host}.pandavideo.com.br/files`, {
    method: 'POST',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(size),
      'Upload-Metadata': metadata,
    },
  })
  const uploadUrl = res.headers.get('location')
  if (!uploadUrl) throw new Error('Panda não retornou a URL de upload (location)')
  return { uploadUrl, videoId }
}

// Consulta status, duração e o id de embed do vídeo. Confirmado contra a
// resposta real (Task 7): status 'CONVERTED', duração em `length`, e o player
// usa `video_external_id` (não o `id` da API).
export async function propriedadesVideo(
  videoId: string
): Promise<{ status: string; duracaoSegundos: number | null; embedId: string | null }> {
  const res = await pandaFetch(`/videos/${videoId}`)
  const v = (await res.json()) as Record<string, unknown>
  const status = String(v.status ?? '')
  const dur = (v.length ?? v.duration ?? v.video_duration ?? null) as number | null
  const embedId = (v.video_external_id ?? null) as string | null
  return { status, duracaoSegundos: dur, embedId }
}
