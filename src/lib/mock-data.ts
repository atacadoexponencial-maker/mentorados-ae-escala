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
