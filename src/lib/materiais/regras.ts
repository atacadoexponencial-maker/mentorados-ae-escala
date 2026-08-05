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

// Nome ASCII para o SEGMENTO FINAL da chave do objeto no Storage.
//
// ACHADO VERIFICADO (curl com o service role, contra o projeto real, nos dois
// buckets): o Supabase Storage RECUSA chave fora do ASCII.
//
//   PUT .../object/materiais/<uuid>/1-Guia de Preços.pdf
//     -> 400 {"error":"InvalidKey","message":"Invalid key: ..."}
//   PUT .../object/conteudo/materiais/<uuid>/1-Guia de Preços.pdf
//     -> 400 InvalidKey  (idêntico — o caminho de produção de hoje)
//   PUT .../object/materiais/<uuid>/3-文書.pdf            -> 400 InvalidKey
//   PUT .../object/materiais/<uuid>/2-Guia de Precos.pdf  -> 200
//   PUT .../object/materiais/<uuid>/4-Guia_de-Precos v2.pdf -> 200
//
// Ou seja: espaço, `_`, `-`, `.` e ASCII alfanumérico passam; letra acentuada e
// qualquer não-ASCII não passam. Anexar um material chamado `Guia de Preços.pdf`
// JÁ FALHAVA antes do bucket privado, com a mensagem genérica "Não foi possível
// enviar o arquivo." — é o nome mais típico em português.
//
// POR QUE ISTO NÃO É `sanitizarNomeArquivo`: aquele valor tem dois destinos e só
// um é restrito. `aula_materiais.nome` é o nome amigável, exibido na lista e
// usado como `download` do link assinado — acento ali é DESEJÁVEL e já funciona
// (o emissor corrige a dupla codificação e o header sai
// `filename*=UTF-8''Relat%C3%B3rio.pdf`). Tirar acento do `nome` pioraria o
// produto. Só a chave do Storage precisa ser ASCII, e é só nela que esta função
// é aplicada:
//
//   nome    = sanitizarNomeArquivo(arquivo.name)   // display + banco, com acento
//   caminho = `${aulaId}/${Date.now()}-${chaveDeArquivo(nome)}`
//
// A regra: normalizar em NFD e jogar fora os diacríticos combinantes (`\p{M}`),
// para que `ç`→`c`, `é`→`e`, `ã`→`a` e a chave continue legível; depois manter
// só a whitelist `[A-Za-z0-9._ -]`. Se o que sobra não tem nenhum alfanumérico
// fora da extensão (nome inteiramente CJK/cirílico, ou só pontuação), cai em
// `'arquivo'`. Perder a extensão nesse caso extremo é irrelevante: o
// `Content-Type` é gravado explicitamente por `contentTypeDeMaterial` e o nome
// do download vem de `aula_materiais.nome`, nunca da chave.
export function chaveDeArquivo(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9._ -]/g, '')
    .trim()
  // O miolo (tudo menos a extensão final) é o que precisa ter substância: um
  // resto como `.pdf`, vindo de `文書.pdf`, não identifica arquivo nenhum.
  const miolo = limpo.replace(/\.[A-Za-z0-9]+$/, '')
  return /[A-Za-z0-9]/.test(miolo) ? limpo : 'arquivo'
}

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

// O que um material vira quando atravessa a fronteira servidor → navegador.
//
// A união é discriminada por `origem` e o ramo `'arquivo'` **não tem** `url`:
// a `url` de uma linha de arquivo é o caminho interno dentro do bucket privado
// (`<aulaId>/<timestamp>-Guia.pdf`) e esse caminho não tem nenhuma serventia no
// cliente — quem precisa dele é o emissor de link temporário, que relê a linha
// pelo id no servidor (`emitir-link.ts`). Mandá-lo no payload só publicaria a
// organização interna do Storage no HTML. O ramo `'link'` continua carregando a
// `url` porque link externo é âncora direta e nunca passa pelo servidor.
export type MaterialCliente =
  | { id: string; nome: string; origem: 'arquivo' }
  | { id: string; nome: string; origem: 'link'; url: string }

// Converte a linha do banco (onde `origem` é `text`, portanto `string` para o
// TypeScript) na forma que o cliente recebe.
//
// POR QUE O TESTE POSITIVO É EM `'link'` e não em `'arquivo'`: a função falha
// para o lado do arquivo. Um valor de `origem` fora do vocabulário — impossível
// hoje pela constraint `aula_materiais_origem_valida`, possível amanhã se o
// vocabulário crescer — cai no ramo sem `url` e nada vaza. O oposto (testar
// `'arquivo'` e mandar o resto para `'link'`) publicaria o caminho de bucket de
// uma linha corrompida direto no HTML.
//
// Isso é o inverso literal de `podeAssinarMaterial`, logo acima, que testa
// `origem === 'arquivo'`. A inversão é DELIBERADA e as duas fecham a mesma
// porta: lá o positivo é "assinar" (só arquivo assina); aqui o positivo é
// "publicar a url" (só link publica). As duas recusam por omissão.
//
// Nunca inspecionar o texto de `url` para adivinhar a origem: a coluna `origem`
// é a única fonte da verdade.
export function materialParaCliente(linha: {
  id: string
  nome: string
  url: string
  origem: string
}): MaterialCliente {
  if (linha.origem === 'link') {
    return { id: linha.id, nome: linha.nome, origem: 'link', url: linha.url }
  }
  return { id: linha.id, nome: linha.nome, origem: 'arquivo' }
}
