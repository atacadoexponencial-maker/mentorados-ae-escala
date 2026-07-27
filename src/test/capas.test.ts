import { describe, it, expect } from 'vitest'
import { resolverCapa } from '@/lib/capas'

describe('resolverCapa', () => {
  it('sem exceção, vale a capa base', () => {
    expect(resolverCapa('base.jpg', null)).toBe('base.jpg')
  })

  it('a capa da marca vence a base', () => {
    expect(resolverCapa('base.jpg', 'marca.jpg')).toBe('marca.jpg')
  })

  it('sem base e sem exceção, não há capa', () => {
    expect(resolverCapa(null, null)).toBeNull()
  })

  it('marca com capa própria funciona mesmo sem capa base', () => {
    expect(resolverCapa(null, 'marca.jpg')).toBe('marca.jpg')
  })
})
