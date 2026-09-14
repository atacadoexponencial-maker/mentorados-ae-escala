'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/integrations/supabase/admin'
import { erroDoDominio, normalizarDominio } from '@/lib/dominio/regras'
import { exigirAdmin } from './actions'

export type EstadoDominio = { ok: boolean; erro: string | null }

async function revalidar(espacoId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('espacos').select('slug').eq('id', espacoId).maybeSingle()
  revalidatePath('/admin/mentorados')
  if (data?.slug) revalidatePath(`/admin/mentorados/${data.slug}`)
}

// Cadastra ou edita. Sempre grava inativo: um domínio novo ou trocado só entra
// em uso depois de a equipe conferir DNS e certificado e ativar de propósito.
export async function salvarDominio(
  _estadoAnterior: EstadoDominio,
  formData: FormData
): Promise<EstadoDominio> {
  if (!(await exigirAdmin())) return { ok: false, erro: 'Acesso negado' }

  const espacoId = String(formData.get('espacoId') ?? '')
  const dominio = normalizarDominio(String(formData.get('dominio') ?? ''))
  if (!espacoId) return { ok: false, erro: 'Acesso negado' }

  const erro = erroDoDominio(dominio)
  if (erro) return { ok: false, erro }

  const admin = createAdminClient()
  const { data: existente } = await admin
    .from('espacos')
    .select('id')
    .eq('dominio', dominio)
    .neq('id', espacoId)
    .maybeSingle()
  if (existente) return { ok: false, erro: 'Este domínio já está em uso por outro mentorado' }

  const { error } = await admin
    .from('espacos')
    .update({ dominio, dominio_ativo: false })
    .eq('id', espacoId)
  if (error) {
    // 23505 = corrida com outro cadastro do mesmo domínio
    return {
      ok: false,
      erro:
        error.code === '23505'
          ? 'Este domínio já está em uso por outro mentorado'
          : 'Não foi possível salvar o domínio. Tente novamente.',
    }
  }

  await revalidar(espacoId)
  return { ok: true, erro: null }
}

async function mudarSituacao(espacoId: string, ativo: boolean): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()
  await admin
    .from('espacos')
    .update({ dominio_ativo: ativo })
    .eq('id', espacoId)
    .not('dominio', 'is', null)
  await revalidar(espacoId)
}

export async function ativarDominio(espacoId: string): Promise<void> {
  await mudarSituacao(espacoId, true)
}

export async function desativarDominio(espacoId: string): Promise<void> {
  await mudarSituacao(espacoId, false)
}

export async function removerDominio(espacoId: string): Promise<void> {
  if (!(await exigirAdmin())) return
  const admin = createAdminClient()
  await admin.from('espacos').update({ dominio: null, dominio_ativo: false }).eq('id', espacoId)
  await revalidar(espacoId)
}
