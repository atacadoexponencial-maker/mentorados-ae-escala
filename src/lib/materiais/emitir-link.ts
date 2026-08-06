'use server'

// Emissor do link temporário de material de apoio.
//
// DUAS IDENTIDADES, DE PROPÓSITO:
//  1. A linha de `aula_materiais` é lida pelo cliente de SESSÃO. Quem decide o
//     direito é a policy `aula_materiais_select` — quem não pode simplesmente
//     não encontra a linha. A autorização vem inteiramente daqui.
//  2. A URL é assinada pelo cliente de SERVIÇO. O bucket `materiais` tem ZERO
//     policies em `storage.objects` por decisão da migration 20260805130000;
//     nenhum usuário `authenticated` consegue assinar nada nele. O service role
//     não decide nada — só executa uma operação já autorizada no passo 1.
//
// Se o passo 1 não devolveu linha, o passo 2 nunca acontece.
//
// NEGATIVA ÚNICA: sem sessão, id malformado, id inexistente, sem direito,
// material de link externo, `url` vazia, arquivo sumido do bucket ou falha do
// Storage — todos devolvem exatamente `null`, indistinguíveis entre si. Nada de
// código de erro, mensagem ou campo revelando a causa: a mensagem fixa
// ("Material indisponível.") mora no componente. Também não se lança exceção em
// caminho negativo esperado — um `throw` numa Server Action gera `digest` no
// console do navegador e entrada de erro no log, o que é canal lateral e
// poluição de monitoramento. `throw` fica reservado para bug de programação.
//
// A assinatura é `(id: string)` e ponto: nenhum caminho, pasta, nome, bucket ou
// prazo vem do cliente. O caminho assinado sai EXCLUSIVAMENTE da coluna `url`
// da linha lida do banco.

import { createClient } from '@/integrations/supabase/server'
import { createAdminClient } from '@/integrations/supabase/admin'
import { ehUuid } from '@/lib/upload'
import { BUCKET_MATERIAIS, PRAZO_LINK_SEGUNDOS, podeAssinarMaterial } from './regras'

export async function emitirLinkDeMaterial(id: string): Promise<{ url: string } | null> {
  // Id malformado nem chega ao PostgREST: `eq('id', 'lixo')` responde
  // `22P02 invalid input syntax for type uuid` e só gera ruído no log.
  if (!ehUuid(id)) return null

  const supabase = await createClient()

  // `getUser()` e não `getSession()`: valida o token contra o servidor de auth.
  // A consulta abaixo já viria vazia sem sessão (a policy é `TO authenticated`),
  // mas a spec pede a checagem explícita e ela evita uma ida inútil à rede.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // A RLS decide aqui. Id inexistente e id sem direito caem juntos em `null`.
  const { data: material } = await supabase
    .from('aula_materiais')
    .select('nome, url, origem')
    .eq('id', id)
    .maybeSingle()
  if (!material) return null

  if (!podeAssinarMaterial(material)) return null

  // `download` com o `nome` amigável do banco, não `true`: `true` usaria o nome
  // do objeto, que carrega o `<timestamp>-` do caminho. Além do nome bonito, é
  // o `Content-Disposition: attachment` que faz o `window.location.assign` do
  // componente baixar sem substituir a página da aula — sem ele, PDF e imagem
  // (gravados com o MIME real) seriam renderizados inline.
  // `download` viaja como query string, fora do token assinado: é conveniência
  // de UX, nunca controle de acesso.
  const admin = createAdminClient()
  const { data: assinado, error } = await admin.storage
    .from(BUCKET_MATERIAIS)
    .createSignedUrl(material.url, PRAZO_LINK_SEGUNDOS, { download: material.nome })

  // Arquivo sumido do bucket e Storage fora do ar caem juntos em `null`.
  if (error || !assinado?.signedUrl) return null

  // Correção de codificação do `download`, medida contra o Storage real.
  // `createSignedUrl` monta a query com `URLSearchParams` (que já
  // percent-encoda) e depois passa a URL inteira por `encodeURI`, que escapa o
  // `%` de novo. Resultado: `Relatório.pdf` viaja como `Relat%25C3%25B3rio.pdf`
  // e o navegador salva com o `%C3%B3` literal no nome — justamente os nomes
  // em português, que quase sempre têm acento. Reescrever o parâmetro pela API
  // de `URL` desfaz a camada extra (verificado: o header passa a vir
  // `filename*=UTF-8''Relat%C3%B3rio.pdf`) e não toca no token, cujos
  // caracteres são todos seguros na serialização. Não se mexe no `nome`
  // gravado no banco: o defeito é de codificação na saída, não do dado.
  const assinada = new URL(assinado.signedUrl)
  assinada.searchParams.set('download', material.nome)

  return { url: assinada.toString() }
}
