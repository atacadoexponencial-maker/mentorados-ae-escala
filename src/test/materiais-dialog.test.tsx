import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ItemMaterialDialog,
  type MaterialDialogItem,
  type ResolverLinkDoMaterial,
} from '@/app/(auth)/admin/conteudo/item-material-dialog'

const link: MaterialDialogItem = {
  id: 'l1',
  nome: 'Apostila pública',
  origem: 'link',
  url: 'https://exemplo.com/apostila.pdf',
}

const arquivo: MaterialDialogItem = { id: 'a1', nome: 'Planilha privada', origem: 'arquivo' }

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

/**
 * Substituição de `window.location` por `Object.defineProperty`: o jsdom recusa
 * `vi.spyOn(window.location, 'assign')` com `TypeError: Cannot redefine property`.
 * O original é guardado aqui e restaurado no `afterEach` — sem isso os outros
 * casos herdariam o stub.
 */
const locationOriginal = window.location

function stubDeLocation() {
  const assign = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...locationOriginal, assign },
    configurable: true,
    writable: true,
  })
  return assign
}

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: locationOriginal,
    configurable: true,
    writable: true,
  })
})

function renderizarItem({
  material,
  removendo = false,
  onRemover = () => {},
  resolver,
}: {
  material: MaterialDialogItem
  removendo?: boolean
  onRemover?: () => void
  resolver?: ResolverLinkDoMaterial
}) {
  return render(
    <ul>
      <ItemMaterialDialog
        material={material}
        removendo={removendo}
        onRemover={onRemover}
        resolver={resolver}
      />
    </ul>
  )
}

describe('ItemMaterialDialog', () => {
  it('renderiza o material de link como âncora para a url', () => {
    renderizarItem({ material: link })
    const ancora = screen.getByRole('link', { name: 'Apostila pública' })
    expect(ancora).toHaveAttribute('href', 'https://exemplo.com/apostila.pdf')
    expect(ancora).toHaveAttribute('target', '_blank')
    expect(ancora).toHaveAttribute('rel', 'noreferrer')
  })

  it('não expõe nenhum href na marcação do material de arquivo', () => {
    const { container } = renderizarItem({ material: arquivo })
    expect(container.querySelector('[href]')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Planilha privada' })).toBeInTheDocument()
  })

  it('deixa o botão desabilitado enquanto a resolução não responde', async () => {
    const { resolver, liberar } = resolucaoControlada()
    renderizarItem({ material: arquivo, resolver })

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    const carregando = await screen.findByRole('button', { name: 'Abrindo…' })
    expect(carregando).toBeDisabled()

    // Clique repetido durante o carregando não dispara nova resolução.
    fireEvent.click(carregando)
    expect(resolver).toHaveBeenCalledTimes(1)

    // A lixeira não é desabilitada pelo estado de abrir do item.
    expect(screen.getByRole('button', { name: 'Remover Planilha privada' })).not.toBeDisabled()

    liberar()
    await screen.findByRole('button', { name: 'Planilha privada' })
  })

  it('mostra "Material indisponível." quando a resolução devolve null', async () => {
    const resolver = vi.fn(async () => null)
    renderizarItem({ material: arquivo, resolver })

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Material indisponível.')
    expect(resolver).toHaveBeenCalledWith('a1')

    // Clicar de novo limpa a mensagem e refaz a tentativa.
    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))
    await waitFor(() => expect(resolver).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent('Material indisponível.')
  })

  it('abre o endereço recebido na aba atual quando a resolução devolve url', async () => {
    const assign = stubDeLocation()
    const url = 'https://projeto.supabase.co/storage/v1/object/sign/materiais/a/1-Guia.pdf?token=abc'
    const resolver = vi.fn(async () => ({ url }))
    renderizarItem({ material: arquivo, resolver })

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
    expect(assign).toHaveBeenCalledWith(url)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cai na mesma mensagem quando a resolução lança exceção', async () => {
    const resolver = vi.fn(async () => {
      throw new Error('falha inesperada')
    })
    renderizarItem({ material: arquivo, resolver })

    fireEvent.click(screen.getByRole('button', { name: 'Planilha privada' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Material indisponível.')
  })

  it('chama onRemover no botão de remover e o desabilita quando removendo', () => {
    const onRemover = vi.fn()
    const { rerender } = renderizarItem({ material: link, onRemover })

    const remover = screen.getByRole('button', { name: 'Remover Apostila pública' })
    expect(remover).not.toBeDisabled()
    fireEvent.click(remover)
    expect(onRemover).toHaveBeenCalledTimes(1)

    rerender(
      <ul>
        <ItemMaterialDialog material={link} removendo onRemover={onRemover} />
      </ul>
    )
    expect(screen.getByRole('button', { name: 'Remover Apostila pública' })).toBeDisabled()
  })
})
