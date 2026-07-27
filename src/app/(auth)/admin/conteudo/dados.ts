// Server-only: conteúdo consolidado (módulos + aulas + materiais) por escopo.
// espacoId null = base (admin); preenchido = conteúdo do mentorado.
import { createAdminClient } from '@/integrations/supabase/admin'
import { resolverCapa } from '@/lib/capas'
import { filtrarEscopo } from './escopo'

export type MaterialLinha = { id: string; nome: string; url: string }

export type AulaLinha = {
  id: string
  moduloId: string
  titulo: string
  descricao: string | null
  pandaVideoId: string | null
  capaUrl: string | null
  duracaoSegundos: number | null
  ordem: number
  publicada: boolean
  videoStatus: string | null
  materiais: MaterialLinha[]
}

export type ModuloLinha = {
  id: string
  titulo: string
  descricao: string | null
  ordem: number
  aulas: AulaLinha[]
}

export async function listarConteudo(espacoId: string | null): Promise<ModuloLinha[]> {
  const admin = createAdminClient()

  const [{ data: modulos }, { data: aulas }, { data: materiais }] = await Promise.all([
    filtrarEscopo(admin.from('modulos').select('id, titulo, descricao, ordem'), espacoId).order(
      'ordem'
    ),
    filtrarEscopo(
      admin
        .from('aulas')
        .select(
          'id, modulo_id, titulo, descricao, panda_video_id, capa_url, duracao_segundos, ordem, publicada, video_status'
        ),
      espacoId
    ).order('ordem'),
    admin.from('aula_materiais').select('id, aula_id, nome, url').order('ordem'),
  ])

  const materiaisPorAula = new Map<string, MaterialLinha[]>()
  for (const m of materiais ?? []) {
    const lista = materiaisPorAula.get(m.aula_id) ?? []
    lista.push({ id: m.id, nome: m.nome, url: m.url })
    materiaisPorAula.set(m.aula_id, lista)
  }

  return (modulos ?? []).map((m) => ({
    id: m.id,
    titulo: m.titulo,
    descricao: m.descricao,
    ordem: m.ordem,
    aulas: (aulas ?? [])
      .filter((a) => a.modulo_id === m.id)
      .map((a) => ({
        id: a.id,
        moduloId: a.modulo_id,
        titulo: a.titulo,
        descricao: a.descricao,
        pandaVideoId: a.panda_video_id,
        capaUrl: a.capa_url,
        duracaoSegundos: a.duracao_segundos,
        ordem: a.ordem,
        publicada: a.publicada,
        videoStatus: a.video_status,
        materiais: materiaisPorAula.get(a.id) ?? [],
      })),
  }))
}

export type AulaBaseLinha = {
  id: string
  titulo: string
  ordem: number
  capaUrl: string | null
  temCapaPropria: boolean
}

export type ModuloBaseLinha = {
  id: string
  titulo: string
  ordem: number
  aulas: AulaBaseLinha[]
}

// Conteúdo base como a marca informada o vê (capa já resolvida). Somente leitura:
// serve à troca de capa por marca na tela do admin.
export async function listarBaseComCapas(espacoId: string): Promise<ModuloBaseLinha[]> {
  const admin = createAdminClient()

  const [{ data: modulos }, { data: aulas }, { data: capas }] = await Promise.all([
    admin.from('modulos').select('id, titulo, ordem').is('espaco_id', null).order('ordem'),
    admin
      .from('aulas')
      .select('id, modulo_id, titulo, ordem, capa_url')
      .is('espaco_id', null)
      .eq('publicada', true)
      .order('ordem'),
    admin.from('aula_capas_espaco').select('aula_id, capa_url').eq('espaco_id', espacoId),
  ])

  const capaPorAula = new Map((capas ?? []).map((c) => [c.aula_id, c.capa_url]))

  return (modulos ?? []).map((m) => ({
    id: m.id,
    titulo: m.titulo,
    ordem: m.ordem,
    aulas: (aulas ?? [])
      .filter((a) => a.modulo_id === m.id)
      .map((a) => ({
        id: a.id,
        titulo: a.titulo,
        ordem: a.ordem,
        capaUrl: resolverCapa(a.capa_url, capaPorAula.get(a.id) ?? null),
        temCapaPropria: capaPorAula.has(a.id),
      })),
  }))
}
