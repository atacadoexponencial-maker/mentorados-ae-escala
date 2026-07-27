'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirEscopoConteudo } from '@/app/(auth)/admin/conteudo/escopo'
import { podeSalvarPersonalizacao } from './autorizacao'
import { validarImagem, ehUuid } from '@/lib/upload'

export type EstadoPersonalizacao = { ok: boolean; erro: string | null }

const COR_VALIDA = /^#[0-9a-f]{6}$/i
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const BANNER_MAX_BYTES = 5 * 1024 * 1024

export async function salvarPersonalizacao(
  _estadoAnterior: EstadoPersonalizacao,
  formData: FormData
): Promise<EstadoPersonalizacao> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  // Mentorado é forçado ao próprio espaço: o valor do formulário é ignorado para
  // ele, mesmo padrão de criarModulo.
  const espacoIdForm = String(formData.get('espacoId') ?? '').trim()
  const alvo = escopo.ehAdmin ? espacoIdForm || null : escopo.espacoId
  // O id do admin vem do formulário e entra no caminho do Storage: exigir UUID
  // impede que um valor livre suba de pasta com `../`.
  if (!alvo || !ehUuid(alvo) || !podeSalvarPersonalizacao(escopo, alvo)) {
    return { ok: false, erro: 'Acesso negado' }
  }
  const espacoAlvo = alvo

  const nomeCurso = String(formData.get('nomeCurso') ?? '').trim()
  const corPrimaria = String(formData.get('corPrimaria') ?? '').trim()
  const corDestaque = String(formData.get('corDestaque') ?? '').trim()
  const removerLogo = formData.get('removerLogo') === 'sim'
  const logo = formData.get('logo')
  const removerBanner = formData.get('removerBanner') === 'sim'
  const banner = formData.get('banner')

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
      .list('logos', { search: espacoAlvo })
    const caminhos = (arquivos ?? []).map((a) => `logos/${a.name}`)
    if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)
  } else if (logo instanceof File && logo.size > 0) {
    if (logo.size > LOGO_MAX_BYTES) {
      return { ok: false, erro: 'Logo muito grande (máximo 2 MB)' }
    }
    const validacao = await validarImagem(logo)
    if (!validacao.ok) {
      return { ok: false, erro: validacao.erro }
    }
    const caminho = `logos/${espacoAlvo}.${validacao.imagem.extensao}`
    const { error: erroUpload } = await admin.storage
      .from('conteudo')
      .upload(caminho, logo, { upsert: true, contentType: validacao.imagem.contentType })
    if (erroUpload) {
      return { ok: false, erro: 'Não foi possível enviar a logo.' }
    }
    const {
      data: { publicUrl },
    } = admin.storage.from('conteudo').getPublicUrl(caminho)
    atualizacao.logo_url = publicUrl
  }

  if (removerBanner) {
    atualizacao.banner_url = null
    const { data: arquivos } = await admin.storage
      .from('conteudo')
      .list('banners', { search: espacoAlvo })
    const caminhos = (arquivos ?? []).map((a) => `banners/${a.name}`)
    if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)
  } else if (banner instanceof File && banner.size > 0) {
    if (banner.size > BANNER_MAX_BYTES) {
      return { ok: false, erro: 'Banner muito grande (máximo 5 MB)' }
    }
    const validacao = await validarImagem(banner)
    if (!validacao.ok) {
      return { ok: false, erro: validacao.erro }
    }
    const caminho = `banners/${espacoAlvo}.${validacao.imagem.extensao}`
    const { error: erroUpload } = await admin.storage
      .from('conteudo')
      .upload(caminho, banner, { upsert: true, contentType: validacao.imagem.contentType })
    if (erroUpload) {
      return { ok: false, erro: 'Não foi possível enviar o banner.' }
    }
    const {
      data: { publicUrl },
    } = admin.storage.from('conteudo').getPublicUrl(caminho)
    atualizacao.banner_url = publicUrl
  }

  const { error } = await admin.from('espacos').update(atualizacao).eq('id', espacoAlvo)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar. Tente novamente.' }
  }

  const { data: espacoSalvo } = await admin
    .from('espacos')
    .select('slug')
    .eq('id', espacoAlvo)
    .maybeSingle()

  revalidatePath('/mentor/personalizacao')
  if (espacoSalvo?.slug) {
    revalidatePath(`/admin/mentorados/${espacoSalvo.slug}`)
    revalidatePath(`/${espacoSalvo.slug}`)
  }
  return { ok: true, erro: null }
}
