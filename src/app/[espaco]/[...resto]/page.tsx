import { notFound } from 'next/navigation'

// Qualquer caminho desconhecido dentro de um espaço mostra o "não encontrado" do
// próprio espaço. No domínio próprio é o que impede `/outro-espaco` de abrir
// algo além de uma tela de erro.
export default function CaminhoInexistente() {
  notFound()
}
