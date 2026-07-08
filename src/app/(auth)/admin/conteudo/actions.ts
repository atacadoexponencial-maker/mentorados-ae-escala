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
