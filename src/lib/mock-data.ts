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
