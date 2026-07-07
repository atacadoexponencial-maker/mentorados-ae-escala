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

export function formatarHoras(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h === 0) return `${m}min`
  return `${h}h ${String(m).padStart(2, '0')}min`
}

export type MockRevendedor = {
  id: string
  nome: string
  email: string
  whatsapp: string | null
  status: 'ativo' | 'inativo' | 'convite-pendente'
  ultimoAcesso: string | null
}

export const mockRevendedores: MockRevendedor[] = [
  { id: 'r1', nome: 'Fernanda Alves', email: 'fernanda.alves@gmail.com', whatsapp: '(11) 98877-1234', status: 'ativo', ultimoAcesso: '2026-07-06T14:20:00' },
  { id: 'r2', nome: 'Patrícia Gomes', email: 'pati.gomes@hotmail.com', whatsapp: null, status: 'ativo', ultimoAcesso: '2026-07-05T09:12:00' },
  { id: 'r3', nome: 'Juliana Castro', email: 'ju.castro@gmail.com', whatsapp: '(21) 99654-8800', status: 'ativo', ultimoAcesso: '2026-06-28T19:45:00' },
  { id: 'r4', nome: 'Renata Dias', email: 'renata.dias@yahoo.com.br', whatsapp: null, status: 'convite-pendente', ultimoAcesso: null },
  { id: 'r5', nome: 'Camila Rocha', email: 'camila.rocha@gmail.com', whatsapp: '(31) 98211-4477', status: 'inativo', ultimoAcesso: '2026-05-14T11:03:00' },
  { id: 'r6', nome: 'Beatriz Nunes', email: 'bia.nunes@gmail.com', whatsapp: null, status: 'ativo', ultimoAcesso: '2026-07-07T08:30:00' },
]

export type MockDashboardMentorado = {
  totais: {
    revendedorasAtivas: number
    revendedorasQueAcessaram: number
    tempoTotalSegundos: number
    aulasConcluidas: number
  }
  porAula: {
    aulaId: string
    assistiram: number
    percentualConclusao: number
  }[]
  porRevendedora: {
    revendedorId: string
    aulasConcluidas: number
    tempoAssistidoSegundos: number
    ultimaAtividade: string | null
    aulasAssistidas: {
      aulaId: string
      tempoAssistidoSegundos: number
      quando: string
    }[]
  }[]
  inativasIds: string[]
}

export const mockDashboardMentorado: MockDashboardMentorado = {
  totais: {
    revendedorasAtivas: 4,
    revendedorasQueAcessaram: 3,
    tempoTotalSegundos: 34_620,
    aulasConcluidas: 11,
  },
  porAula: [
    { aulaId: 'a1', assistiram: 3, percentualConclusao: 88 },
    { aulaId: 'a2', assistiram: 3, percentualConclusao: 76 },
    { aulaId: 'a4', assistiram: 2, percentualConclusao: 64 },
    { aulaId: 'a5', assistiram: 1, percentualConclusao: 52 },
    { aulaId: 'a6', assistiram: 1, percentualConclusao: 30 },
  ],
  porRevendedora: [
    {
      revendedorId: 'r1',
      aulasConcluidas: 5,
      tempoAssistidoSegundos: 15_840,
      ultimaAtividade: '2026-07-06T14:20:00',
      aulasAssistidas: [
        { aulaId: 'a1', tempoAssistidoSegundos: 483, quando: '2026-07-01T10:00:00' },
        { aulaId: 'a2', tempoAssistidoSegundos: 726, quando: '2026-07-03T20:15:00' },
        { aulaId: 'a4', tempoAssistidoSegundos: 812, quando: '2026-07-06T14:20:00' },
      ],
    },
    {
      revendedorId: 'r2',
      aulasConcluidas: 4,
      tempoAssistidoSegundos: 11_760,
      ultimaAtividade: '2026-07-05T09:12:00',
      aulasAssistidas: [
        { aulaId: 'a1', tempoAssistidoSegundos: 483, quando: '2026-06-30T08:30:00' },
        { aulaId: 'a2', tempoAssistidoSegundos: 690, quando: '2026-07-05T09:12:00' },
      ],
    },
    {
      revendedorId: 'r6',
      aulasConcluidas: 2,
      tempoAssistidoSegundos: 7_020,
      ultimaAtividade: '2026-07-07T08:30:00',
      aulasAssistidas: [
        { aulaId: 'a1', tempoAssistidoSegundos: 470, quando: '2026-07-07T08:30:00' },
      ],
    },
    {
      revendedorId: 'r3',
      aulasConcluidas: 0,
      tempoAssistidoSegundos: 0,
      ultimaAtividade: null,
      aulasAssistidas: [],
    },
  ],
  inativasIds: ['r3', 'r5'],
}

export type MockDashboardGlobal = {
  totais: {
    mentoradosAtivos: number
    revendedoresCadastrados: number
    revendedoresQueAcessaram: number
    tempoTotalSegundos: number
    aulasConcluidas: number
  }
  ranking: {
    marca: string
    slug: string
    revendedoresAtivos: number
    tempoAssistidoSegundos: number
    aulasConcluidas: number
  }[]
  porAula: {
    aulaId: string
    assistiram: number
    percentualConclusao: number
  }[]
}

export const mockDashboardGlobal: MockDashboardGlobal = {
  totais: {
    mentoradosAtivos: 2,
    revendedoresCadastrados: 519,
    revendedoresQueAcessaram: 342,
    tempoTotalSegundos: 462_180,
    aulasConcluidas: 1874,
  },
  ranking: [
    {
      marca: 'João Atacados',
      slug: 'joao-atacados',
      revendedoresAtivos: 437,
      tempoAssistidoSegundos: 391_500,
      aulasConcluidas: 1592,
    },
    {
      marca: 'Maria Modas',
      slug: 'maria-modas',
      revendedoresAtivos: 82,
      tempoAssistidoSegundos: 70_680,
      aulasConcluidas: 282,
    },
  ],
  porAula: [
    { aulaId: 'a1', assistiram: 318, percentualConclusao: 92 },
    { aulaId: 'a2', assistiram: 274, percentualConclusao: 81 },
    { aulaId: 'a4', assistiram: 236, percentualConclusao: 74 },
    { aulaId: 'a5', assistiram: 191, percentualConclusao: 58 },
    { aulaId: 'a6', assistiram: 147, percentualConclusao: 43 },
  ],
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
