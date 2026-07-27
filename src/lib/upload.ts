// Validação de arquivos enviados para o bucket público `conteudo`.
//
// Duas regras dão a segurança aqui:
//  1. O `Content-Type` gravado no Storage NUNCA vem do navegador — é derivado da
//     whitelist abaixo. Sem isso, um arquivo declarado como `image/svg+xml` ou
//     `text/html` seria servido executável a partir de um bucket público.
//  2. A extensão do caminho também sai da whitelist, nunca de `arquivo.name`.
//     Como os uploads usam `upsert: true`, um nome manipulado poderia escrever
//     fora da pasta e sobrescrever o arquivo de outro espaço.

// MIME aceito → extensão canônica. SVG fica de fora de propósito: é XML e
// executa script quando aberto direto no navegador.
const IMAGENS_PERMITIDAS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Assinaturas de arquivo (magic bytes). O MIME declarado pelo cliente é
// falsificável; os bytes iniciais não. Sem esta checagem, bastaria declarar
// `image/png` e enviar HTML para hospedar conteúdo ativo no bucket.
const ASSINATURAS: { tipo: string; confere: (b: Uint8Array) => boolean }[] = [
  {
    tipo: 'image/png',
    confere: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    tipo: 'image/jpeg',
    confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    // RIFF....WEBP
    tipo: 'image/webp',
    confere: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    // GIF87a / GIF89a
    tipo: 'image/gif',
    confere: (b) =>
      b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61,
  },
]

export type ImagemValidada = { contentType: string; extensao: string }

// Confirma que o arquivo é mesmo uma das imagens aceitas, pelo conteúdo.
// Retorna o contentType e a extensão a usar — ambos derivados dos bytes reais.
export async function validarImagem(
  arquivo: File
): Promise<{ ok: true; imagem: ImagemValidada } | { ok: false; erro: string }> {
  if (!IMAGENS_PERMITIDAS[arquivo.type]) {
    return { ok: false, erro: 'Use uma imagem PNG, JPG, WEBP ou GIF' }
  }

  const cabecalho = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer())
  const real = ASSINATURAS.find((a) => a.confere(cabecalho))
  if (!real || real.tipo !== arquivo.type) {
    return { ok: false, erro: 'O arquivo não é uma imagem válida' }
  }

  return { ok: true, imagem: { contentType: real.tipo, extensao: IMAGENS_PERMITIDAS[real.tipo] } }
}

// Materiais aceitam qualquer arquivo (é material de apoio do mentorado), então
// a defesa não é restringir o tipo e sim impedir que o navegador execute o que
// for baixado: só PDF e as imagens da whitelist são servidos com o próprio
// MIME. Todo o resto vira octet-stream, que o navegador baixa em vez de
// renderizar — HTML e SVG maliciosos ficam inertes.
export function contentTypeDeMaterial(arquivo: File): string {
  if (arquivo.type === 'application/pdf') return 'application/pdf'
  if (IMAGENS_PERMITIDAS[arquivo.type]) return arquivo.type
  return 'application/octet-stream'
}

// Ids que entram na composição de caminhos do Storage precisam ser UUID: vindos
// de formulário, uma string livre permitiria subir de pasta com `../`.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ehUuid(valor: string): boolean {
  return UUID.test(valor)
}
