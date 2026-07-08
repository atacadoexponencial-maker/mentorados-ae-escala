'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirMentorado } from '../revendedores/actions'

export type EstadoPersonalizacao = { ok: boolean; erro: string | null }

const COR_VALIDA = /^#[0-9a-f]{6}$/i
const LOGO_MAX_BYTES = 2 * 1024 * 1024

export async function salvarPersonalizacao(
  _estadoAnterior: EstadoPersonalizacao,
  formData: FormData
): Promise<EstadoPersonalizacao> {
  const contexto = await exigirMentorado()
  if (!contexto) return { ok: false, erro: 'Acesso negado' }

  const nomeCurso = String(formData.get('nomeCurso') ?? '').trim()
  const corPrimaria = String(formData.get('corPrimaria') ?? '').trim()
  const corDestaque = String(formData.get('corDestaque') ?? '').trim()
  const removerLogo = formData.get('removerLogo') === 'sim'
  const logo = formData.get('logo')

  if (!nomeCurso) return { ok: false, erro: 'Informe o nome do curso' }
  if (corPrimaria && !COR_VALIDA.test(corPrimaria)) {
    return { ok: false, erro: 'Cor primária inválida' }
  }
  if (corDestaque && !COR_VALIDA.test(corDestaque)) {
    return { ok: false, erro: 'Cor de destaque inválida' }
  }

  const admin = createAdminClient()
  const atualizacao: Record<string, string | null> = {
    nome_curso: nomeCurso,
    cor_primaria: corPrimaria || null,
    cor_destaque: corDestaque || null,
  }

  if (removerLogo) {
    atualizacao.logo_url = null
    const { data: arquivos } = await admin.storage
      .from('conteudo')
      .list('logos', { search: contexto.espacoId })
    const caminhos = (arquivos ?? []).map((a) => `logos/${a.name}`)
    if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)
  } else if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith('image/')) {
      return { ok: false, erro: 'A logo precisa ser uma imagem' }
    }
    if (logo.size > LOGO_MAX_BYTES) {
      return { ok: false, erro: 'Logo muito grande (máximo 2 MB)' }
    }
    const extensao = (logo.name.split('.').pop() ?? 'png').toLowerCase()
    const caminho = `logos/${contexto.espacoId}.${extensao}`
    const { error: erroUpload } = await admin.storage
      .from('conteudo')
      .upload(caminho, logo, { upsert: true, contentType: logo.type })
    if (erroUpload) {
      return { ok: false, erro: 'Não foi possível enviar a logo.' }
    }
    const {
      data: { publicUrl },
    } = admin.storage.from('conteudo').getPublicUrl(caminho)
    atualizacao.logo_url = publicUrl
  }

  const { error } = await admin.from('espacos').update(atualizacao).eq('id', contexto.espacoId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar. Tente novamente.' }
  }

  revalidatePath('/mentor/personalizacao')
  revalidatePath(`/${contexto.slug}`)
  return { ok: true, erro: null }
}
