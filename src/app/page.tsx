import { redirect } from 'next/navigation'

// A raiz não tem conteúdo próprio: a entrada do sistema é o login da equipe.
// Revendedoras entram pelo login do próprio espaço (/{slug}/login).
export default function RaizPage() {
  redirect('/login')
}
