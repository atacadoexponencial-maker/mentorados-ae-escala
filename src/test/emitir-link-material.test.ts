// Teste unitário do emissor de link temporário de material — sem rede.
// Os dois clientes Supabase são mockados: o de sessão (que a RLS filtraria) e o
// de serviço (que assina). O que se prova aqui é o contrato da negativa única
// (`null` em todo caminho negativo, sem exceção e sem distinção de causa) e que
// o serviço só é acionado depois da autorização.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { podeAssinarMaterial, BUCKET_MATERIAIS, PRAZO_LINK_SEGUNDOS } from '@/lib/materiais/regras'

// --- mocks dos dois clientes -------------------------------------------------

const getUser = vi.fn()
const maybeSingle = vi.fn()
const createSignedUrl = vi.fn()
const from = vi.fn()
const storageFrom = vi.fn()

vi.mock('@/integrations/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
    from,
  }),
}))

vi.mock('@/integrations/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: { from: storageFrom },
  }),
}))

const { emitirLinkDeMaterial } = await import('@/lib/materiais/emitir-link')

const ID = '11111111-2222-3333-4444-555555555555'

function comSessao() {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
}

function comLinha(linha: { nome: string; url: string; origem: string } | null) {
  maybeSingle.mockResolvedValue({ data: linha, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  from.mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  })
  storageFrom.mockReturnValue({ createSignedUrl })
  createSignedUrl.mockResolvedValue({
    // Formato real devolvido pela lib, com o `download` DUPLAMENTE codificado
    // (`%25C3%25B3` no lugar de `%C3%B3`) — é isso que o emissor corrige.
    data: {
      signedUrl:
        'https://projeto.supabase.co/storage/v1/object/sign/materiais/aula/123-guia.pdf' +
        '?token=abc.def-ghi&download=Guia+de+Vendas+%25E2%2580%2594+2026.pdf',
    },
    error: null,
  })
})

// --- regra pura --------------------------------------------------------------

describe('podeAssinarMaterial', () => {
  it('libera arquivo com caminho preenchido', () => {
    expect(podeAssinarMaterial({ origem: 'arquivo', url: 'aula/123-guia.pdf' })).toBe(true)
  })

  it('recusa link externo — link nunca sai pelo emissor', () => {
    expect(podeAssinarMaterial({ origem: 'link', url: 'https://exemplo.com/guia.pdf' })).toBe(false)
  })

  it('recusa arquivo com url vazia ou só espaços', () => {
    expect(podeAssinarMaterial({ origem: 'arquivo', url: '' })).toBe(false)
    expect(podeAssinarMaterial({ origem: 'arquivo', url: '   ' })).toBe(false)
    expect(podeAssinarMaterial({ origem: 'arquivo', url: null })).toBe(false)
  })

  it('recusa origem desconhecida', () => {
    expect(podeAssinarMaterial({ origem: 'outra-coisa', url: 'aula/123-guia.pdf' })).toBe(false)
  })
})

// --- emissor -----------------------------------------------------------------

describe('emitirLinkDeMaterial', () => {
  it('devolve null sem sessão e nunca chama o Storage', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await emitirLinkDeMaterial(ID)).toBeNull()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('devolve null para id não-UUID, sem tocar banco nem Storage', async () => {
    expect(await emitirLinkDeMaterial('lixo')).toBeNull()
    expect(from).not.toHaveBeenCalled()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('devolve null quando a linha não vem (inexistente ou sem direito) e nunca chama o Storage', async () => {
    comSessao()
    comLinha(null)
    expect(await emitirLinkDeMaterial(ID)).toBeNull()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('devolve null para material de link externo', async () => {
    comSessao()
    comLinha({ nome: 'Site', url: 'https://exemplo.com', origem: 'link' })
    expect(await emitirLinkDeMaterial(ID)).toBeNull()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('devolve null quando o Storage falha (arquivo sumido ou indisponível)', async () => {
    comSessao()
    comLinha({ nome: 'Guia.pdf', url: 'aula/123-guia.pdf', origem: 'arquivo' })
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } })
    expect(await emitirLinkDeMaterial(ID)).toBeNull()
  })

  it('devolve { url } no caminho feliz, assinando o caminho do banco com o nome amigável', async () => {
    comSessao()
    comLinha({ nome: 'Guia de Vendas — 2026.pdf', url: 'aula/123-guia.pdf', origem: 'arquivo' })
    const resultado = await emitirLinkDeMaterial(ID)
    expect(resultado).not.toBeNull()

    const devolvida = new URL(resultado!.url)
    expect(devolvida.pathname).toBe('/storage/v1/object/sign/materiais/aula/123-guia.pdf')
    // O token sobrevive intacto à reescrita do parâmetro.
    expect(devolvida.searchParams.get('token')).toBe('abc.def-ghi')
    // E o `download` deixa de vir duplamente codificado.
    expect(devolvida.searchParams.get('download')).toBe('Guia de Vendas — 2026.pdf')
    expect(devolvida.search).toContain('download=Guia+de+Vendas+%E2%80%94+2026.pdf')

    expect(storageFrom).toHaveBeenCalledWith(BUCKET_MATERIAIS)
    expect(createSignedUrl).toHaveBeenCalledWith('aula/123-guia.pdf', PRAZO_LINK_SEGUNDOS, {
      download: 'Guia de Vendas — 2026.pdf',
    })
  })
})
