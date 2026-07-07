// Dados mock usados apenas pelos protótipos (issues 01–09).
// Serão substituídos por dados reais do Supabase nas issues de implementação.

export type MockEspaco = {
  slug: string
  nomeCurso: string
  logoUrl: string | null
  corPrimaria: string | null
  corDestaque: string | null
}

export const mockEspacos: MockEspaco[] = [
  {
    slug: 'joao-atacados',
    nomeCurso: 'Academia João Atacados',
    logoUrl: '/globe.svg',
    corPrimaria: '#c2410c',
    corDestaque: '#f97316',
  },
  {
    slug: 'maria-modas',
    nomeCurso: 'Escola Maria Modas',
    logoUrl: null,
    corPrimaria: null,
    corDestaque: null,
  },
]

export function getMockEspaco(slug: string): MockEspaco | undefined {
  return mockEspacos.find((e) => e.slug === slug)
}

export type MockModulo = {
  id: string
  titulo: string
  descricao: string
  ordem: number
}

export type MockAula = {
  id: string
  moduloId: string
  titulo: string
  descricao: string
  duracaoSegundos: number
  capaUrl: string | null
  status: 'publicada' | 'rascunho'
  ordem: number
  materiais: { nome: string }[]
}

export const mockModulos: MockModulo[] = [
  { id: 'm1', titulo: 'Primeiros Passos na Revenda', descricao: 'Fundamentos para começar a revender com lucro.', ordem: 1 },
  { id: 'm2', titulo: 'Precificação e Margem', descricao: 'Como precificar as peças e proteger sua margem.', ordem: 2 },
  { id: 'm3', titulo: 'Vendas pelo WhatsApp', descricao: 'Roteiros e técnicas de venda pelo WhatsApp.', ordem: 3 },
]

export const mockAulas: MockAula[] = [
  { id: 'a1', moduloId: 'm1', titulo: 'Bem-vinda à revenda profissional', descricao: 'O que esperar do treinamento e como aproveitar as aulas.', duracaoSegundos: 483, capaUrl: null, status: 'publicada', ordem: 1, materiais: [{ nome: 'Guia de boas-vindas.pdf' }] },
  { id: 'a2', moduloId: 'm1', titulo: 'Montando seu primeiro pedido', descricao: 'Critérios para escolher peças que giram rápido.', duracaoSegundos: 726, capaUrl: null, status: 'publicada', ordem: 2, materiais: [] },
  { id: 'a3', moduloId: 'm1', titulo: 'Organizando seu estoque em casa', descricao: 'Espaço, etiquetas e controle simples de estoque.', duracaoSegundos: 654, capaUrl: null, status: 'rascunho', ordem: 3, materiais: [{ nome: 'Planilha de estoque.xlsx' }] },
  { id: 'a4', moduloId: 'm2', titulo: 'A regra do markup', descricao: 'Quanto cobrar em cima do preço de atacado.', duracaoSegundos: 892, capaUrl: null, status: 'publicada', ordem: 1, materiais: [{ nome: 'Calculadora de margem.xlsx' }] },
  { id: 'a5', moduloId: 'm2', titulo: 'Promoções sem perder dinheiro', descricao: 'Quando e como fazer promoção com margem protegida.', duracaoSegundos: 571, capaUrl: null, status: 'publicada', ordem: 2, materiais: [] },
  { id: 'a6', moduloId: 'm3', titulo: 'Roteiro de venda no WhatsApp', descricao: 'Mensagens prontas que convertem.', duracaoSegundos: 803, capaUrl: null, status: 'publicada', ordem: 1, materiais: [{ nome: 'Roteiros prontos.pdf' }] },
]

export function formatarDuracao(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export type MockMentorado = {
  id: string
  nome: string
  email: string
  marca: string
  slug: string
  qtdRevendedores: number
  status: 'ativo' | 'inativo' | 'convite-pendente'
}

export const mockMentorados: MockMentorado[] = [
  {
    id: '1',
    nome: 'João Pereira',
    email: 'joao@joaoatacados.com.br',
    marca: 'João Atacados',
    slug: 'joao-atacados',
    qtdRevendedores: 437,
    status: 'ativo',
  },
  {
    id: '2',
    nome: 'Maria Souza',
    email: 'maria@mariamodas.com.br',
    marca: 'Maria Modas',
    slug: 'maria-modas',
    qtdRevendedores: 82,
    status: 'ativo',
  },
  {
    id: '3',
    nome: 'Carlos Lima',
    email: 'carlos@climaimportados.com.br',
    marca: 'C. Lima Importados',
    slug: 'clima-importados',
    qtdRevendedores: 0,
    status: 'convite-pendente',
  },
  {
    id: '4',
    nome: 'Ana Beatriz',
    email: 'ana@abvariedades.com.br',
    marca: 'AB Variedades',
    slug: 'ab-variedades',
    qtdRevendedores: 15,
    status: 'inativo',
  },
]
