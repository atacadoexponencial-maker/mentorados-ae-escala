// Traduz o erro do Supabase ao definir senha numa mensagem que a revendedora
// consiga agir. Regra pura (sem I/O, sem server-only) para ser testável, no
// mesmo padrão de autorizacao.ts.
//
// Existe porque a proteção contra senhas vazadas está ativa no painel: sem
// distinguir o motivo, quem escolhe uma senha vazada lê "tente novamente",
// repete a mesma senha e fica preso no formulário.

// Precisa acompanhar o "Minimum password length" do painel do Supabase.
export const SENHA_MINIMA = 8

export const ERRO_SENHA_CURTA = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres`

const PADRAO = 'Não foi possível salvar a senha. Tente novamente.'

// O SDK entrega `reasons` ('pwned' | 'length' | 'characters') no erro de senha
// fraca e `code` nos demais. Lido por duck-typing para não acoplar ao SDK.
type ErroDeSenha = { code?: unknown; reasons?: unknown }

export function mensagemDeErroDeSenha(erro: unknown): string {
  const { code, reasons } = (erro ?? {}) as ErroDeSenha
  const motivos = Array.isArray(reasons) ? reasons : []

  if (motivos.includes('pwned')) {
    return 'Essa senha já apareceu em vazamentos de outros sites. Escolha uma diferente.'
  }
  if (motivos.includes('length')) {
    return ERRO_SENHA_CURTA
  }
  if (motivos.includes('characters')) {
    return 'Combine letras, números e símbolos na senha.'
  }
  if (code === 'same_password') {
    return 'A nova senha precisa ser diferente da atual.'
  }
  if (code === 'weak_password') {
    return 'Essa senha é fraca demais. Escolha uma mais difícil de adivinhar.'
  }
  return PADRAO
}
