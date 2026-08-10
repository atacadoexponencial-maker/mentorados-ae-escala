'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/integrations/supabase/admin'
import { exigirEscopoConteudo, filtrarEscopo, conteudoNoEscopo } from './escopo'
import { podeGerenciarEspaco } from './autorizacao'
import { garantirPastaModulo, criarSlotUpload, propriedadesVideo } from '@/integrations/panda/server'
import { validarImagem, contentTypeDeMaterial, ehUuid, LIMITES } from '@/lib/upload'
import { BUCKET_MATERIAIS, chaveDeArquivo } from '@/lib/materiais/regras'

export type EstadoConteudo = { ok: boolean; erro: string | null }

// A mesma ação serve /admin/conteudo (base) e /mentor/conteudo (do mentorado).
function revalidarConteudo() {
  revalidatePath('/admin/conteudo')
  revalidatePath('/mentor/conteudo')
}

export async function criarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!titulo) {
    return { ok: false, erro: 'Informe o nome do módulo' }
  }

  // Admin escolhe o espaço-alvo (vazio = base); mentor é forçado ao próprio.
  const alvo = escopo.ehAdmin
    ? String(formData.get('espacoAlvo') ?? '') || null
    : escopo.espacoId

  const admin = createAdminClient()
  const { data: ultimo } = await filtrarEscopo(admin.from('modulos').select('ordem'), alvo)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from('modulos').insert({
    titulo,
    descricao: descricao || null,
    ordem: (ultimo?.ordem ?? 0) + 1,
    espaco_id: alvo,
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível criar o módulo. Tente novamente.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function moverModulo(moduloId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo))) return
  const admin = createAdminClient()

  // Reordena dentro do espaço do próprio módulo (base ou de um mentorado).
  const { data: alvoMod } = await admin
    .from('modulos')
    .select('espaco_id')
    .eq('id', moduloId)
    .single()
  const { data: modulos } = await filtrarEscopo(
    admin.from('modulos').select('id, ordem'),
    alvoMod?.espaco_id ?? null
  ).order('ordem')
  if (!modulos) return

  const indice = modulos.findIndex((m: { id: string }) => m.id === moduloId)
  const vizinho = direcao === 'cima' ? modulos[indice - 1] : modulos[indice + 1]
  if (indice === -1 || !vizinho) return

  const atual = modulos[indice]
  await admin.from('modulos').update({ ordem: vizinho.ordem }).eq('id', atual.id)
  await admin.from('modulos').update({ ordem: atual.ordem }).eq('id', vizinho.id)

  revalidarConteudo()
}

export async function criarAula(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const moduloId = String(formData.get('moduloId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pandaVideoId = String(formData.get('pandaVideoId') ?? '').trim()
  if (!moduloId || !titulo) {
    return { ok: false, erro: 'Informe o título da aula' }
  }
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  // A aula herda o espaço do módulo (denormalizado para o RLS).
  const { data: modulo } = await admin
    .from('modulos')
    .select('espaco_id')
    .eq('id', moduloId)
    .single()
  const { data: ultima } = await admin
    .from('aulas')
    .select('ordem')
    .eq('modulo_id', moduloId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from('aulas').insert({
    modulo_id: moduloId,
    titulo,
    descricao: descricao || null,
    panda_video_id: pandaVideoId || null,
    ordem: (ultima?.ordem ?? 0) + 1,
    publicada: false,
    espaco_id: modulo?.espaco_id ?? null,
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível criar a aula.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}


export async function definirCapa(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!aulaId || !(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem' }
  }
  if (arquivo.size > LIMITES.capa) {
    return { ok: false, erro: 'Imagem muito grande (máximo 2 MB)' }
  }
  const validacao = await validarImagem(arquivo)
  if (!validacao.ok) {
    return { ok: false, erro: validacao.erro }
  }
  if (!ehUuid(aulaId)) {
    return { ok: false, erro: 'Acesso negado' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const caminho = `capas/${aulaId}.${validacao.imagem.extensao}`

  const { error: erroUpload } = await admin.storage
    .from('conteudo')
    .upload(caminho, arquivo, { upsert: true, contentType: validacao.imagem.contentType })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar a imagem.' }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('conteudo').getPublicUrl(caminho)

  const { error } = await admin.from('aulas').update({ capa_url: publicUrl }).eq('id', aulaId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar a capa.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

// Troca a capa de conteúdo base dentro de uma marca, e só de aula base: aula de
// marca já tem capa pelo caminho normal (definirCapa). A admin troca em qualquer
// marca; a mentorada, só na dela.
export async function salvarCapaNoEspaco(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  const aulaId = String(formData.get('aulaId') ?? '')
  const espacoId = String(formData.get('espacoId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!ehUuid(aulaId) || !ehUuid(espacoId)) {
    return { ok: false, erro: 'Acesso negado' }
  }
  if (!escopo || !podeGerenciarEspaco(escopo, espacoId)) {
    return { ok: false, erro: 'Acesso negado' }
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem' }
  }
  if (arquivo.size > LIMITES.capa) {
    return { ok: false, erro: 'Imagem muito grande (máximo 2 MB)' }
  }
  const validacao = await validarImagem(arquivo)
  if (!validacao.ok) {
    return { ok: false, erro: validacao.erro }
  }

  const admin = createAdminClient()
  const { data: aula } = await admin
    .from('aulas')
    .select('espaco_id')
    .eq('id', aulaId)
    .maybeSingle()
  if (!aula || aula.espaco_id !== null) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const caminho = `capas/${aulaId}-${espacoId}.${validacao.imagem.extensao}`
  const { error: erroUpload } = await admin.storage
    .from('conteudo')
    .upload(caminho, arquivo, { upsert: true, contentType: validacao.imagem.contentType })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar a imagem.' }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('conteudo').getPublicUrl(caminho)

  const { error } = await admin
    .from('aula_capas_espaco')
    .upsert({ aula_id: aulaId, espaco_id: espacoId, capa_url: publicUrl })
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar a capa.' }
  }

  await revalidarEspaco(espacoId)
  revalidarConteudo()
  return { ok: true, erro: null }
}

// Revalida a área de membros da marca afetada (o slug não vem no formulário).
async function revalidarEspaco(espacoId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('espacos').select('slug').eq('id', espacoId).maybeSingle()
  if (data?.slug) revalidatePath(`/${data.slug}`)
}

export async function removerCapaDoEspaco(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  const aulaId = String(formData.get('aulaId') ?? '')
  const espacoId = String(formData.get('espacoId') ?? '')
  if (!ehUuid(aulaId) || !ehUuid(espacoId)) {
    return { ok: false, erro: 'Acesso negado' }
  }
  if (!escopo || !podeGerenciarEspaco(escopo, espacoId)) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { data: arquivos } = await admin.storage
    .from('conteudo')
    .list('capas', { search: `${aulaId}-${espacoId}` })
  const caminhos = (arquivos ?? []).map((a) => `capas/${a.name}`)
  if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)

  const { error } = await admin
    .from('aula_capas_espaco')
    .delete()
    .eq('aula_id', aulaId)
    .eq('espaco_id', espacoId)
  if (error) {
    return { ok: false, erro: 'Não foi possível remover a capa.' }
  }

  await revalidarEspaco(espacoId)
  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function editarAula(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const aulaId = String(formData.get('aulaId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pandaVideoId = String(formData.get('pandaVideoId') ?? '').trim()
  if (!aulaId || !titulo) {
    return { ok: false, erro: 'Informe o título da aula' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('aulas')
    .update({
      titulo,
      descricao: descricao || null,
      panda_video_id: pandaVideoId || null,
    })
    .eq('id', aulaId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function moverAula(aulaId: string, direcao: 'cima' | 'baixo'): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) return
  const admin = createAdminClient()

  const { data: aula } = await admin
    .from('aulas')
    .select('id, modulo_id, ordem')
    .eq('id', aulaId)
    .maybeSingle()
  if (!aula) return

  const { data: aulas } = await admin
    .from('aulas')
    .select('id, ordem')
    .eq('modulo_id', aula.modulo_id)
    .order('ordem')
  if (!aulas) return

  const indice = aulas.findIndex((a) => a.id === aulaId)
  const vizinha = direcao === 'cima' ? aulas[indice - 1] : aulas[indice + 1]
  if (indice === -1 || !vizinha) return

  await admin.from('aulas').update({ ordem: vizinha.ordem }).eq('id', aula.id)
  await admin.from('aulas').update({ ordem: aulas[indice].ordem }).eq('id', vizinha.id)

  revalidarConteudo()
}

export async function moverAulaParaModulo(
  aulaId: string,
  moduloDestinoId: string
): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (
    !(await conteudoNoEscopo('aulas', aulaId, escopo)) ||
    !(await conteudoNoEscopo('modulos', moduloDestinoId, escopo))
  ) {
    return
  }
  const admin = createAdminClient()

  // Nunca mover conteúdo entre marcas: aula e módulo-destino no mesmo espaço.
  const [{ data: aulaAlvo }, { data: modDestino }] = await Promise.all([
    admin.from('aulas').select('espaco_id').eq('id', aulaId).single(),
    admin.from('modulos').select('espaco_id').eq('id', moduloDestinoId).single(),
  ])
  if ((aulaAlvo?.espaco_id ?? null) !== (modDestino?.espaco_id ?? null)) return

  const { data: ultima } = await admin
    .from('aulas')
    .select('ordem')
    .eq('modulo_id', moduloDestinoId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  await admin
    .from('aulas')
    .update({ modulo_id: moduloDestinoId, ordem: (ultima?.ordem ?? 0) + 1 })
    .eq('id', aulaId)

  revalidarConteudo()
}

export async function publicarAula(aulaId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) return
  const admin = createAdminClient()
  await admin.from('aulas').update({ publicada: true }).eq('id', aulaId)
  revalidarConteudo()
}

export async function despublicarAula(aulaId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) return
  const admin = createAdminClient()
  await admin.from('aulas').update({ publicada: false }).eq('id', aulaId)
  revalidarConteudo()
}

export async function excluirAula(aulaId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) return
  const admin = createAdminClient()

  await admin.from('aulas').delete().eq('id', aulaId)

  // Limpa arquivos do storage. São DOIS destinos: as capas continuam no bucket
  // público `conteudo` e os materiais agora moram no bucket privado
  // BUCKET_MATERIAIS. Os retornos de `list`/`remove` são descartados de
  // propósito — a ação é `void` e a aula já saiu do banco.

  const caminhos: string[] = []
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
    caminhos.push(`capas/${aulaId}.${ext}`)
  }
  // Capas por marca desta aula (as linhas caem por ON DELETE CASCADE).
  const { data: capasMarca } = await admin.storage
    .from('conteudo')
    .list('capas', { search: `${aulaId}-` })
  for (const a of capasMarca ?? []) caminhos.push(`capas/${a.name}`)
  if (caminhos.length) await admin.storage.from('conteudo').remove(caminhos)

  // Materiais no bucket privado. O prefixo é só `<aulaId>` — `materiais/` virou
  // o nome do bucket. A listagem é paginada porque `list()` trunca em 100 por
  // padrão (e uma aula pode ter mais que isso); a ordenação default (`name`
  // asc) é estável, e o `remove` só roda depois que a listagem terminou, então
  // paginar por `offset` é seguro.
  const LIMITE_PAGINA = 100
  const materiais: string[] = []
  for (let offset = 0; ; offset += LIMITE_PAGINA) {
    const { data: pagina } = await admin.storage
      .from(BUCKET_MATERIAIS)
      .list(aulaId, { limit: LIMITE_PAGINA, offset })
    for (const a of pagina ?? []) materiais.push(`${aulaId}/${a.name}`)
    if ((pagina?.length ?? 0) < LIMITE_PAGINA) break
  }
  if (materiais.length) await admin.storage.from(BUCKET_MATERIAIS).remove(materiais)

  revalidarConteudo()
}


function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/]/g, '_').replace(/[^\p{L}\p{N}._ -]/gu, '').trim() || 'arquivo'
}

async function proximaOrdemMaterial(aulaId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: ultimo } = await admin
    .from('aula_materiais')
    .select('ordem')
    .eq('aula_id', aulaId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (ultimo?.ordem ?? 0) + 1
}

export async function adicionarMaterialArquivo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  const aulaId = String(formData.get('aulaId') ?? '')
  const arquivo = formData.get('arquivo')
  if (!aulaId || !(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha um arquivo' }
  }
  if (arquivo.size > LIMITES.material) {
    return { ok: false, erro: 'Arquivo muito grande (máximo 20 MB)' }
  }
  if (!ehUuid(aulaId)) {
    return { ok: false, erro: 'Acesso negado' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  // `nome` vai íntegro para o banco (com acento — é o nome amigável do
  // download); só a chave do Storage passa por `chaveDeArquivo`, que a força a
  // ASCII. O bucket recusa chave acentuada com `InvalidKey`. A ordem importa:
  // `sanitizarNomeArquivo` já trocou `/` e `\` por `_` antes, então nada aqui
  // consegue subir de pasta. O primeiro segmento é `aulaId`, barrado por
  // `ehUuid` acima. O prefixo `materiais/` sumiu: agora é o nome do bucket.
  const nome = sanitizarNomeArquivo(arquivo.name)
  const caminho = `${aulaId}/${Date.now()}-${chaveDeArquivo(nome)}`

  const { error: erroUpload } = await admin.storage
    .from(BUCKET_MATERIAIS)
    .upload(caminho, arquivo, { contentType: contentTypeDeMaterial(arquivo) })
  if (erroUpload) {
    return { ok: false, erro: 'Não foi possível enviar o arquivo.' }
  }

  // `url` guarda o CAMINHO INTERNO do bucket privado, não uma URL pública: quem
  // baixa é o emissor de link assinado (`src/lib/materiais/emitir-link.ts`).
  // `origem: 'arquivo'` é explícito de propósito — a coluna tem
  // `DEFAULT 'link'`, e uma linha de arquivo nascida como link jamais seria
  // assinada, ficando permanentemente indisponível.
  const { error } = await admin.from('aula_materiais').insert({
    aula_id: aulaId,
    nome,
    url: caminho,
    origem: 'arquivo',
    ordem: await proximaOrdemMaterial(aulaId),
  })
  if (error) {
    await admin.storage.from(BUCKET_MATERIAIS).remove([caminho])
    return { ok: false, erro: 'Não foi possível salvar o material.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function adicionarMaterialLink(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }

  const aulaId = String(formData.get('aulaId') ?? '')
  const nome = String(formData.get('nome') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  if (!aulaId || !nome || !url) {
    return { ok: false, erro: 'Preencha nome e link' }
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, erro: 'O link precisa começar com http:// ou https://' }
  }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  // A `origem` vai explícita de propósito, mesmo com o `DEFAULT 'link'` da
  // coluna: assim esta função fica simétrica a `adicionarMaterialArquivo` e não
  // depende de uma decisão de migração para gravar o valor certo.
  const { error } = await admin.from('aula_materiais').insert({
    aula_id: aulaId,
    nome,
    url,
    origem: 'link',
    ordem: await proximaOrdemMaterial(aulaId),
  })
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar o link.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

export async function removerMaterial(materialId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  const admin = createAdminClient()

  const { data: material } = await admin
    .from('aula_materiais')
    .select('url, aula_id, origem')
    .eq('id', materialId)
    .maybeSingle()
  if (!material) return
  if (!(await conteudoNoEscopo('aulas', material.aula_id, escopo))) return

  await admin.from('aula_materiais').delete().eq('id', materialId)

  // A origem é a única fonte de verdade: `url` de linha de arquivo é o caminho
  // interno completo dentro do bucket privado e vai cru para o Storage.
  // O retorno é descartado de propósito — remoção de material não devolve erro
  // para a usuária, e a linha já saiu do banco.
  if (material.origem === 'arquivo') {
    await admin.storage.from(BUCKET_MATERIAIS).remove([material.url])
  }

  revalidarConteudo()
}

export async function excluirModulo(moduloId: string): Promise<void> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo))) return
  const admin = createAdminClient()

  const { count } = await admin
    .from('aulas')
    .select('id', { count: 'exact', head: true })
    .eq('modulo_id', moduloId)
  if ((count ?? 0) > 0) return

  await admin.from('modulos').delete().eq('id', moduloId)
  revalidarConteudo()
}

export async function editarModulo(
  _estadoAnterior: EstadoConteudo,
  formData: FormData
): Promise<EstadoConteudo> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const moduloId = String(formData.get('moduloId') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  if (!moduloId || !titulo) {
    return { ok: false, erro: 'Informe o nome do módulo' }
  }
  if (!(await conteudoNoEscopo('modulos', moduloId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('modulos')
    .update({ titulo, descricao: descricao || null })
    .eq('id', moduloId)
  if (error) {
    return { ok: false, erro: 'Não foi possível salvar. Tente novamente.' }
  }

  revalidarConteudo()
  return { ok: true, erro: null }
}

// Cria o slot de upload no Panda para a aula (pasta do módulo garantida) e marca
// a aula como 'processando'. O navegador sobe o arquivo direto na uploadUrl.
export async function iniciarUploadVideo(
  aulaId: string,
  filename: string,
  size: number
): Promise<{ ok: boolean; erro?: string; uploadUrl?: string; videoId?: string }> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { ok: false, erro: 'Acesso negado' }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) {
    return { ok: false, erro: 'Acesso negado' }
  }

  const admin = createAdminClient()
  const { data: aula } = await admin.from('aulas').select('id, modulo_id').eq('id', aulaId).single()
  if (!aula) return { ok: false, erro: 'Aula não encontrada' }

  try {
    const folderId = await garantirPastaModulo(aula.modulo_id)
    const { uploadUrl, videoId } = await criarSlotUpload({ folderId, filename, size })
    await admin
      .from('aulas')
      .update({ panda_video_id: videoId, video_status: 'processando' })
      .eq('id', aulaId)
    revalidarConteudo()
    return { ok: true, uploadUrl, videoId }
  } catch {
    return { ok: false, erro: 'Não foi possível iniciar o upload no Panda.' }
  }
}

// Consulta o Panda e, se pronto, grava status + duração. Usada em polling.
export async function sincronizarStatusVideo(
  aulaId: string
): Promise<{ status: 'processando' | 'pronto' | 'sem-video' }> {
  const escopo = await exigirEscopoConteudo()
  if (!escopo) return { status: 'sem-video' }
  if (!(await conteudoNoEscopo('aulas', aulaId, escopo))) return { status: 'sem-video' }

  const admin = createAdminClient()
  const { data: aula } = await admin
    .from('aulas')
    .select('panda_video_id')
    .eq('id', aulaId)
    .single()
  if (!aula?.panda_video_id) return { status: 'sem-video' }

  try {
    const { status, duracaoSegundos, embedId } = await propriedadesVideo(aula.panda_video_id)
    const pronto = /convert(ed)?|ready|done|pronto|ativ/i.test(status)
    if (pronto) {
      // O player usa o id de embed (video_external_id). Gravamos ele no
      // panda_video_id para o vídeo tocar — igual ao padrão dos IDs colados.
      await admin
        .from('aulas')
        .update({
          video_status: 'pronto',
          duracao_segundos: duracaoSegundos,
          ...(embedId ? { panda_video_id: embedId } : {}),
        })
        .eq('id', aulaId)
      revalidarConteudo()
      return { status: 'pronto' }
    }
    return { status: 'processando' }
  } catch {
    return { status: 'processando' }
  }
}
