// src/lib/catalogo.ts
// Server-only: o que a revendedora de um espaco enxerga - base + conteudo da marca.
// Ponto unico de leitura para o catalogo e para a pagina de aula, para que admin e
// mentorado (que a RLS deixa ler mais) vejam exatamente o mesmo que ela.
import 'server-only'
import { createClient } from '@/integrations/supabase/server'

export type AulaCatalogo = {
  id: string
  moduloId: string
  titulo: string
  descricao: string | null
  pandaVideoId: string | null
  capaUrl: string | null
  duracaoSegundos: number | null
  ordem: number
}

export type ModuloCatalogo = {
  id: string
  titulo: string
  ordem: number
  aulas: AulaCatalogo[]
}

export async function carregarCatalogo(espacoId: string): Promise<ModuloCatalogo[]> {
  const supabase = await createClient()
  const filtroEspaco = `espaco_id.is.null,espaco_id.eq.${espacoId}`

  const [{ data: modulos }, { data: aulas }] = await Promise.all([
    supabase
      .from('modulos')
      .select('id, titulo, ordem')
      .or(filtroEspaco)
      .order('espaco_id', { nullsFirst: true })
      .order('ordem'),
    supabase
      .from('aulas')
      .select('id, modulo_id, titulo, descricao, panda_video_id, capa_url, duracao_segundos, ordem')
      .or(filtroEspaco)
      .eq('publicada', true)
      .order('ordem'),
  ])

  return (modulos ?? []).map((m) => ({
    id: m.id,
    titulo: m.titulo,
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
      })),
  }))
}
