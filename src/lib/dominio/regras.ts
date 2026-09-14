// Regras puras do domínio próprio por espaço. Sem dependência de servidor:
// usadas pelo proxy, pelas actions e pelos testes.

// Endereço canônico da plataforma. Espaços sem domínio próprio vivem aqui.
export const HOST_PLATAFORMA = 'areademembros.atacadoexponencial.com'

// Hosts que são a própria plataforma, e não um domínio de mentorado:
// produção, previews da Vercel e a máquina local.
export function ehHostDaPlataforma(host: string): boolean {
  const h = hostSemPorta(host)
  return (
    h === HOST_PLATAFORMA ||
    h.endsWith(`.${HOST_PLATAFORMA}`) ||
    h.endsWith('.vercel.app') ||
    h === 'localhost' ||
    h === '127.0.0.1'
  )
}

export function hostSemPorta(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '')
}

// Aceita o que o admin colar ("https://WWW.Marca.com/") e guarda só o host.
export function normalizarDominio(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/\/+$/, '')
    .trim()
}

const DOMINIO_VALIDO = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/

export const ERRO_DOMINIO_INVALIDO =
  'Domínio inválido. Use só o endereço, por exemplo: www.suamarca.com'
export const ERRO_DOMINIO_DA_PLATAFORMA =
  'Este endereço é da própria plataforma e não pode ser usado como domínio de um mentorado.'

// Endereço da plataforma para onde mandar quem não pertence ao domínio próprio
// (equipe e mentorados). Em dev aponta para a máquina local.
export function urlDaPlataforma(): string {
  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `https://${HOST_PLATAFORMA}`
}

// Origem de um domínio próprio herdando protocolo e porta de uma URL de
// referência: em produção dá https://dominio; na máquina local mantém
// http://dominio:3000, para o fluxo poder ser testado com *.localhost.
export function origemNoDominio(dominio: string, referencia: string): string {
  const url = new URL(referencia)
  return `${url.protocol}//${dominio}${url.port ? `:${url.port}` : ''}`
}

export type EspacoComDominio = { slug: string; dominio: string | null; dominio_ativo: boolean }

// Onde começam os links destinados às revendedoras de um espaço. Decidido pelo
// espaço, nunca pelo endereço em que quem dispara a ação está navegando.
export function enderecoDoEspaco(
  espaco: EspacoComDominio,
  origemDaPlataforma: string
): { origem: string; prefixo: string } {
  if (espaco.dominio_ativo && espaco.dominio) {
    return { origem: origemNoDominio(espaco.dominio, origemDaPlataforma), prefixo: '' }
  }
  return { origem: origemDaPlataforma, prefixo: `/${espaco.slug}` }
}

// Recebe o domínio já normalizado. Retorna a mensagem de erro ou null.
export function erroDoDominio(dominio: string): string | null {
  if (!DOMINIO_VALIDO.test(dominio) || dominio.endsWith('-')) return ERRO_DOMINIO_INVALIDO
  if (ehHostDaPlataforma(dominio)) return ERRO_DOMINIO_DA_PLATAFORMA
  return null
}
