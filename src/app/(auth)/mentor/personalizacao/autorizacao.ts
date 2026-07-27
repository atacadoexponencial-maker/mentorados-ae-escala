// Regra pura de autorização de personalização (sem I/O, sem server-only),
// para ser importável em testes. Admin personaliza qualquer marca; mentorado só
// a própria. Diferente de podeGerenciarEspaco, personalização nega a base (null).

import { podeGerenciarEspaco, type EscopoConteudo } from '@/app/(auth)/admin/conteudo/autorizacao'

// Personalização pertence sempre a um espaço: a base (null) não tem identidade
// própria, então é negada mesmo para o admin — diferente de podeGerenciarEspaco,
// onde a base é um alvo válido de conteúdo.
export function podeSalvarPersonalizacao(escopo: EscopoConteudo, alvo: string | null): boolean {
  if (!alvo) return false
  return podeGerenciarEspaco(escopo, alvo)
}
