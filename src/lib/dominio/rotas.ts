// Decisões de roteamento do domínio próprio, puras para poderem ser testadas.
// O proxy busca os dados (espaço, sessão, papel) e só aplica o que sai daqui.

// Cabeçalho interno que o proxy põe na requisição reescrita, com o slug do
// espaço dono do domínio. Qualquer valor vindo do navegador é descartado.
export const CABECALHO_ESPACO_DOMINIO = 'x-espaco-dominio'

export const CAMINHO_INDISPONIVEL = '/espaco-indisponivel'

// Primeiros segmentos que são rotas da plataforma, nunca slug de espaço.
const SEGMENTOS_RESERVADOS = new Set([
  'admin',
  'mentor',
  'login',
  'recuperar-senha',
  'redefinir-senha',
  'auth',
  'espaco-indisponivel',
])

// No domínio, telas abertas sem sessão (as demais pedem login).
const PUBLICAS_NO_DOMINIO = new Set(['/login', '/primeiro-acesso', '/recuperar-senha'])

export type Decisao =
  | { tipo: 'seguir' }
  | { tipo: 'reescrever'; caminho: string }
  | { tipo: 'redirecionar'; destino: string }

export function primeiroSegmento(pathname: string): string {
  return pathname.split('/')[1] ?? ''
}

// Slug de espaço no início do caminho da plataforma, se houver.
export function slugDoCaminho(pathname: string): string | null {
  const segmento = primeiroSegmento(pathname)
  return segmento && !SEGMENTOS_RESERVADOS.has(segmento) ? segmento : null
}

// '/slug' → '/', '/slug/aula/1' → '/aula/1'. Caminho de outro espaço fica igual.
export function caminhoLimpo(slug: string, pathname: string): string {
  if (pathname === `/${slug}`) return '/'
  if (pathname.startsWith(`/${slug}/`)) return pathname.slice(slug.length + 1)
  return pathname
}

// Requisição que chegou por um domínio que não é da plataforma. `slug` é o do
// espaço com esse domínio ativo, ou null (desconhecido ou inativo).
export function decidirNoDominio(entrada: {
  pathname: string
  busca: string
  slug: string | null
  logado: boolean
}): Decisao {
  const { pathname, busca, slug, logado } = entrada

  if (!slug) {
    return pathname === CAMINHO_INDISPONIVEL
      ? { tipo: 'seguir' }
      : { tipo: 'reescrever', caminho: CAMINHO_INDISPONIVEL }
  }

  // Consumo de link de e-mail: a rota trata, sabendo o espaço pelo cabeçalho.
  if (pathname.startsWith('/auth/')) return { tipo: 'seguir' }

  const segmento = primeiroSegmento(pathname)
  if (segmento === 'admin' || segmento === 'mentor') {
    return { tipo: 'redirecionar', destino: '/' }
  }
  if (segmento === slug) {
    return { tipo: 'redirecionar', destino: `${caminhoLimpo(slug, pathname)}${busca}` }
  }
  if (!logado && !PUBLICAS_NO_DOMINIO.has(pathname)) {
    return { tipo: 'redirecionar', destino: '/login' }
  }
  return { tipo: 'reescrever', caminho: `/${slug}${pathname === '/' ? '' : pathname}` }
}

// Na plataforma, um espaço com domínio ativo manda o visitante para lá. Quem
// gerencia o espaço (admin ou mentorada dona) continua na plataforma, onde está
// logado — senão o botão "ver espaço" do painel cairia num domínio sem sessão.
export function deveIrParaODominio(entrada: {
  dominioAtivo: boolean
  dominio: string | null
  userId: string | null
  ehAdmin: boolean
  mentoradoUserId: string | null
}): boolean {
  if (!entrada.dominioAtivo || !entrada.dominio) return false
  if (entrada.ehAdmin) return false
  if (entrada.userId && entrada.userId === entrada.mentoradoUserId) return false
  return true
}
