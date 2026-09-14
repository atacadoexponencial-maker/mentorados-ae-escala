// Uso exclusivo no servidor: em qual endereço a requisição atual está sendo servida.
import { headers } from 'next/headers'
import { CABECALHO_ESPACO_DOMINIO } from './rotas'

// Slug do espaço quando a requisição veio por domínio próprio; null na plataforma.
// Confiável porque o proxy sempre sobrescreve o cabeçalho vindo do navegador.
export async function slugDoDominioAtual(): Promise<string | null> {
  return (await headers()).get(CABECALHO_ESPACO_DOMINIO)
}

// Início dos caminhos do espaço: '' no domínio próprio, '/slug' na plataforma.
export async function prefixoDoEspaco(slug: string): Promise<string> {
  return (await slugDoDominioAtual()) ? '' : `/${slug}`
}
