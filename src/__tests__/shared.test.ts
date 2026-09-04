import { describe, expect, it } from 'vitest'
import {
  cleanText,
  contrastRatio,
  passingForeground,
  pathSelector,
  VALID_ROLES,
} from '../packs/shared'

type Rgba = [number, number, number, number]
const white: Rgba = [255, 255, 255, 1]
const black: Rgba = [0, 0, 0, 1]

describe('cleanText — agent-authored content validation (constitution II)', () => {
  it('normalises whitespace and returns plain text', () => {
    expect(cleanText('  Email   address ', 'labelText', 80)).toBe('Email address')
  })
  it('rejects markup, emptiness, non-strings and over-long values', () => {
    expect(() => cleanText('<img onerror=x>', 'altText', 125)).toThrow(/plain text/)
    expect(() => cleanText('   ', 'altText', 125)).toThrow(/empty/)
    expect(() => cleanText(42, 'altText', 125)).toThrow(/string/)
    expect(() => cleanText('x'.repeat(126), 'altText', 125)).toThrow(/125 characters/)
  })
  it('keeps the role allow-list to real ARIA roles', () => {
    expect(VALID_ROLES.has('button')).toBe(true)
    expect(VALID_ROLES.has('buton')).toBe(false)
  })
})

describe('WCAG contrast maths', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1)
  })
  it('passingForeground reaches the target on a light background', () => {
    const fixed = passingForeground([170, 170, 170, 1], white, 4.5)
    expect(contrastRatio(fixed, white)).toBeGreaterThanOrEqual(4.5)
  })
  it('passingForeground reaches the target on a mid-luminance background (BOARD-1)', () => {
    // rgb(128,128,128) has L≈0.22: white only reaches 3.95:1, black reaches 5.3:1.
    const grey: Rgba = [128, 128, 128, 1]
    const fixed = passingForeground(white, grey, 4.5)
    expect(contrastRatio(fixed, grey)).toBeGreaterThanOrEqual(4.5)
  })
  it('passingForeground picks the direction that passes on a dark background', () => {
    const dark: Rgba = [40, 40, 48, 1]
    const fixed = passingForeground([90, 90, 100, 1], dark, 4.5)
    expect(contrastRatio(fixed, dark)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('pathSelector — structural, never page-authored strings', () => {
  it('prefers the engine key and otherwise builds an nth-of-type path', () => {
    document.body.innerHTML = `<main><section><p>a</p><p id="x">b</p></section><div data-sightline-key="k"></div></main>`
    const root = document.querySelector('main')!
    expect(pathSelector(root.querySelector('[data-sightline-key]')!, root)).toBe('[data-sightline-key="k"]')
    const sel = pathSelector(document.getElementById('x')!, root)
    expect(sel).toBe('section:nth-of-type(1) > p:nth-of-type(2)')
    expect(root.querySelector(sel)).toBe(document.getElementById('x'))
    expect(sel).not.toMatch(/#x|\bx\b/)
  })
})
