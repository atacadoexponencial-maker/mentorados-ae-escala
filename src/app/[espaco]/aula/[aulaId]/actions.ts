'use server'

import { getVinculoDoUsuario } from '@/lib/vinculo'
import { createAdminClient } from '@/integrations/supabase/admin'

// Registro acumulado de visualização (padrão recordWatch da essenciademenina).
// Só revendedoras contam — preview de mentorado/admin não polui as métricas.
export async function registrarVisualizacao(dados: {
  aulaId: string
  deltaSegundos: number
  posicao?: number
  duracao?: number
  terminou?: boolean
}): Promise<void> {
  const vinculo = await getVinculoDoUsuario()
  if (!vinculo?.revendedor || vinculo.revendedor.status !== 'ativo') return

  const delta = Math.max(0, Math.min(60, Math.floor(dados.deltaSegundos || 0)))
  const posicao = Math.max(0, Math.floor(dados.posicao ?? 0))
  const duracao = dados.duracao && dados.duracao > 0 ? Math.floor(dados.duracao) : null
  if (delta === 0 && !dados.terminou && posicao === 0) return

  const admin = createAdminClient()

  const { data: aula } = await admin
    .from('aulas')
    .select('id, titulo, publicada, duracao_segundos')
    .eq('id', dados.aulaId)
    .maybeSingle()
  if (!aula || !aula.publicada) return

  const { data: existente } = await admin
    .from('aula_visualizacoes')
    .select('id, segundos_assistidos, concluida_em')
    .eq('user_id', vinculo.userId)
    .eq('aula_id', aula.id)
    .maybeSingle()

  // Conclusão automática: fim do vídeo ou ≥ 90% — registrada uma única vez
  const duracaoConhecida = duracao ?? aula.duracao_segundos
  const chegouAoFim =
    dados.terminou || (duracaoConhecida ? posicao / duracaoConhecida >= 0.9 : false)
  const concluidaEm =
    existente?.concluida_em ?? (chegouAoFim ? new Date().toISOString() : null)

  if (existente) {
    await admin
      .from('aula_visualizacoes')
      .update({
        segundos_assistidos: (existente.segundos_assistidos ?? 0) + delta,
        ultima_posicao: posicao,
        concluida_em: concluidaEm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existente.id)
  } else {
    await admin.from('aula_visualizacoes').insert({
      user_id: vinculo.userId,
      revendedor_id: vinculo.revendedor.id,
      espaco_id: vinculo.revendedor.espacoId,
      aula_id: aula.id,
      aula_titulo: aula.titulo,
      segundos_assistidos: delta,
      ultima_posicao: posicao,
      concluida_em: concluidaEm,
    })
  }

  // Cacheia a duração na aula na primeira vez que o player informa
  if (duracao && !aula.duracao_segundos) {
    await admin.from('aulas').update({ duracao_segundos: duracao }).eq('id', aula.id)
  }
}
