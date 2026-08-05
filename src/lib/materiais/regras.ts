// Regras puras do material de apoio — sem I/O, sem `server-only`, sem Supabase.
//
// Por que este arquivo existe separado do emissor: a decisão "esta linha é
// assinável?" é lógica de negócio pura e precisa ser testável no Vitest sem
// mock de cliente Supabase nem variável de ambiente. É o mesmo par que
// `admin/conteudo/` já usa: `escopo.ts` (I/O) ao lado de `autorizacao.ts`
// (regra pura).

// Nome do bucket privado criado em `supabase/migrations/20260805130000_storage_materiais_privado.sql`.
// Fica aqui, e não literal em cada arquivo, porque escrita, remoção e listagem
// de material vão apontar para o mesmo bucket — string repetida em vários
// arquivos é exatamente o tipo de coisa que diverge. Mesma justificativa de
// `LIMITES` em `src/lib/upload.ts`.
export const BUCKET_MATERIAIS = 'materiais'

// Prazo do link assinado, em segundos. Os 5 minutos que a spec fixa.
//
// ESTE É O ÚNICO LUGAR A MUDAR se o prazo precisar crescer: o emissor lê a
// constante e ninguém mais decide prazo (o cliente nunca manda prazo nenhum).
//
// O que se sabe sobre o RISCO 3 ("download grande em conexão ruim pode ser
// cortado?"): `expiresIn` vira a claim `exp` de um JWT embutido no `?token=`
// da URL de `/storage/v1/object/sign/...`. O servidor de Storage valida
// assinatura e `exp` AO RECEBER a requisição; validada, começa a transmitir o
// corpo. HTTP não tem como abortar uma resposta em andamento porque um token
// expirou — não existe revalidação por chunk. Ou seja: o prazo limita o INÍCIO
// do download, não a conclusão. Um arquivo de 20 MB que começou no minuto 4:59
// termina normalmente.
//
// A ressalva real: se a conexão cair e o navegador RETOMAR com um `Range`
// request, essa é uma requisição nova — depois dos 5 minutos ela é recusada e o
// download morre pela metade. Se isso se mostrar um problema na prática, o
// conserto é subir este número (900 = 15 min) e nada mais.
export const PRAZO_LINK_SEGUNDOS = 300

// Só linha de arquivo é assinável.
//
// Por que `origem = 'link'` nunca é assinada: `url` de um link externo é um
// endereço da internet digitado por quem cadastrou o material, não um caminho
// dentro do bucket. Assinar isso não faz sentido — e recusar aqui garante que
// um link externo jamais saia disfarçado de link do Storage, mesmo se alguém
// chamar o emissor à mão com o id de um material de link.
//
// Por que `url` vazia (ou só espaços) é barrada antes do Storage: chamar
// `createSignedUrl('')` produz um erro cru do Storage sem nenhum ganho — o
// resultado seria o mesmo `null`, só que com ruído de rede e de log. Linha
// assim é dado corrompido, e a resposta correta é a mesma negativa de sempre.
export function podeAssinarMaterial(linha: { origem: string; url: string | null }): boolean {
  return linha.origem === 'arquivo' && (linha.url ?? '').trim().length > 0
}
