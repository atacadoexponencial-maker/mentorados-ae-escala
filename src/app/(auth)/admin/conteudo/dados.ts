// Server-only: conteúdo consolidado (módulos + aulas + materiais) para o admin.
import { createAdminClient } from '@/integrations/supabase/admin'

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
  qtdMateriais: number
}

export type ModuloLinha = {
  id: string
  titulo: string
  descricao: string | null
  ordem: number
  aulas: AulaLinha[]
}

export async function listarConteudo(): Promise<ModuloLinha[]> {
  const admin = createAdminClient()

  const [{ data: modulos }, { data: aulas }, { data: materiais }] = await Promise.all([
    admin.from('modulos').select('id, titulo, descricao, ordem').order('ordem'),
    admin
      .from('aulas')
      .select('id, modulo_id, titulo, descricao, panda_video_id, capa_url, duracao_segundos, ordem, publicada')
      .order('ordem'),
    admin.from('aula_materiais').select('aula_id'),
  ])

  const materiaisPorAula = new Map<string, number>()
  for (const m of materiais ?? []) {
    materiaisPorAula.set(m.aula_id, (materiaisPorAula.get(m.aula_id) ?? 0) + 1)
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
        qtdMateriais: materiaisPorAula.get(a.id) ?? 0,
      })),
  }))
}
