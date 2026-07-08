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
