import { describe, it, expect } from 'vitest'
import { ehPreview } from '@/lib/preview'

describe('ehPreview', () => {
  it('revendedora do próprio espaço não está em pré-visualização', () => {
    expect(ehPreview('A', 'A')).toBe(false)
  })

  it('quem não é revendedora (admin ou mentorado) está em pré-visualização', () => {
    expect(ehPreview(null, 'A')).toBe(true)
  })

  it('revendedora de outro espaço conta como pré-visualização', () => {
    expect(ehPreview('B', 'A')).toBe(true)
  })
})
