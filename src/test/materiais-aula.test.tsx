import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MateriaisAula, type MaterialItem } from '@/app/[espaco]/aula/[aulaId]/materiais-aula'

const link: MaterialItem = {
  id: 'l1',
  nome: 'Apostila pública',
  origem: 'link',
  url: 'https://exemplo.com/apostila.pdf',
}

const arquivo: MaterialItem = { id: 'a1', nome: 'Planilha privada', origem: 'arquivo' }
const outroArquivo: MaterialItem = { id: 'a2', nome: 'Checklist privado', origem: 'arquivo' }

/**
 * Resolução controlada pelo teste: a promessa fica pendente até `liberar()`.
 * Toda promessa criada aqui é liberada antes do fim do teste — uma transição
 * assíncrona pendente entrelaça as transições seguintes no React 19 e
 * contaminaria os outros casos.
 */
function resolucaoControlada() {
  let liberar!: (valor: { url: string } | null) => void
  const resolver = vi.fn(
    () =>
      new Promise<{ url: string } | null>((resolve) => {
        liberar = resolve
      })
  )
  return { resolver, liberar: (valor: { url: string } | null = null) => liberar(valor) }
}

describe('MateriaisAula', () => {
  it('não renderiza o cartão quando não há materiais', () => {
    const { container } = render(<MateriaisAula materiais={[]} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Materiais da aula')).not.toBeInTheDocument()
  })

  it('renderiza o material de link como âncora para a url', () => {
    render(<MateriaisAula materiais={[link]} />)
    expect(screen.getByText('Materiais da aula')).toBeInTheDocument()
    const ancora = screen.getByRole('link', { name: 'Apostila pública' })
    expect(ancora).toHaveAttribute('href', 'https://exemplo.com/apostila.pdf')
    expect(ancora).toHaveAttribute('target', '_blank')
    expect(ancora).toHaveAttribute('rel', 'noreferrer')
  })

  it('não expõe nenhum href na marcação do material de arquivo', () => {
    const { container } = render(<MateriaisAula materiais={[arquivo]} />)
    expect(container.querySelector('[href]')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Planilha privada' })).toBeInTheDocument()
  })

  it('deixa o botão desabilitado enquanto a resolução não responde', async () => {
    const { resolver, liberar } = resolucaoControlada()
    render(<MateriaisAula materiais={[arquivo]} resolver={resolver} />)

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    const carregando = await screen.findByRole('button', { name: 'Abrindo…' })
    expect(carregando).toBeDisabled()

    // Clique repetido durante o carregando não dispara nova resolução.
    fireEvent.click(carregando)
    expect(resolver).toHaveBeenCalledTimes(1)

    liberar()
    await screen.findByRole('button', { name: 'Planilha privada' })
  })

  it('mostra "Material indisponível." quando a resolução devolve null', async () => {
    const resolver = vi.fn(async () => null)
    render(<MateriaisAula materiais={[arquivo]} resolver={resolver} />)

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Material indisponível.')
    expect(resolver).toHaveBeenCalledWith('a1')

    // Clicar de novo limpa a mensagem e refaz a tentativa.
    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))
    await waitFor(() => expect(resolver).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent('Material indisponível.')
  })

  it('cai na mesma mensagem quando a resolução lança exceção', async () => {
    const resolver = vi.fn(async () => {
      throw new Error('falha inesperada')
    })
    render(<MateriaisAula materiais={[arquivo]} resolver={resolver} />)

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Material indisponível.')
  })

  it('mantém o estado isolado entre dois materiais de arquivo', async () => {
    const { resolver, liberar } = resolucaoControlada()
    render(<MateriaisAula materiais={[arquivo, outroArquivo]} resolver={resolver} />)

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))
    await screen.findByRole('button', { name: 'Abrindo…' })

    const segundo = screen.getByRole('button', { name: 'Checklist privado' })
    expect(segundo).not.toBeDisabled()

    const itens = screen.getAllByRole('listitem')
    expect(within(itens[1]).queryByRole('alert')).not.toBeInTheDocument()

    liberar()
    await screen.findByRole('button', { name: 'Planilha privada' })
  })
})
