/**
 * Helpers shared by rule packs: agent-content validation, real WCAG contrast
 * math, and document-outline queries. Nothing here invents content.
 */
// --- Agent-content validation -------------------------------------------
// The agent authors human-facing content; the engine only checks it is safe
// and plausible. Nothing here invents an answer on the agent's behalf.

export const VALID_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'switch',
  'tab',
  'menuitem',
  'img',
  'presentation',
  'none',
])

export function cleanText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`)
  }
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text) throw new Error(`${field} must not be empty.`)
  if (/[<>]/.test(text)) throw new Error(`${field} must be plain text, not markup.`)
  if (text.length > max) throw new Error(`${field} must be ${max} characters or fewer.`)
  return text
}

export function nearbyText(element: HTMLElement): string {
  // Walk up until we find a container with real text; a bare <figure> around
  // an image tells the agent nothing about what the image is for.
  let scope: HTMLElement | null = element.parentElement
  while (scope) {
    const text = (scope.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.length >= 20) return text.slice(0, 240)
    scope = scope.parentElement
  }
  return ''
}

// --- Real WCAG 2.x contrast math ------------------------------------------

export function parseRgb(color: string): [number, number, number, number] | null {
  const match = color.match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null
  return [parts[0], parts[1], parts[2], parts[3] ?? 1]
}

export function relativeLuminance([r, g, b]: [number, number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (light + 0.05) / (dark + 0.05)
}

export function effectiveBackground(element: HTMLElement): [number, number, number, number] {
  let node: HTMLElement | null = element
  while (node) {
    const parsed = parseRgb(getComputedStyle(node).backgroundColor)
    if (parsed && parsed[3] > 0) return parsed
    node = node.parentElement
  }
  return [255, 255, 255, 1]
}

export function toHex([r, g, b]: [number, number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Darken (or lighten) the current foreground along its own hue until the
 * text passes the given ratio. Preserves the palette instead of hardcoding a
 * replacement colour.
 */
export function passingForeground(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
  target: number,
): [number, number, number, number] {
  const bgIsLight = relativeLuminance(bg) > 0.5
  let candidate: [number, number, number, number] = [...fg]
  for (let step = 0; step < 100; step += 1) {
    if (contrastRatio(candidate, bg) >= target) return candidate
    const factor = bgIsLight ? 0.94 : 1.06
    candidate = [
      Math.min(255, candidate[0] * factor),
      Math.min(255, candidate[1] * factor),
      Math.min(255, candidate[2] * factor),
      1,
    ]
  }
  return bgIsLight ? [0, 0, 0, 1] : [255, 255, 255, 1]
}

export function requiredContrast(element: HTMLElement): number {
  const style = getComputedStyle(element)
  const size = parseFloat(style.fontSize)
  const weight = parseInt(style.fontWeight, 10) || 400
  const isLarge = size >= 24 || (size >= 18.66 && weight >= 700)
  return isLarge ? 3 : 4.5
}

// --- Real document-outline heading level ----------------------------------

export function expectedHeadingLevel(element: HTMLElement, root: HTMLElement): number {
  const headings = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]
  const index = headings.indexOf(element)
  for (let i = index - 1; i >= 0; i -= 1) {
    const level = Number(headings[i].tagName.slice(1))
    if (level > 0) return Math.min(6, level + 1)
  }
  return 1
}


/**
 * Build a CSS path for an element inside the audit root that will also match
 * the corresponding live element (the live page and the audit clone share
 * identical structure). Prefers a stable `data-sightline-key`.
 */
export function pathSelector(element: Element, root: Element): string {
  const key = element.getAttribute('data-sightline-key')
  if (key) return `[data-sightline-key="${key}"]`
  const parts: string[] = []
  let node: Element | null = element
  while (node && node !== root) {
    const parent: Element | null = node.parentElement
    if (!parent) break
    const siblings = [...parent.children].filter((c) => c.tagName === node!.tagName)
    const idx = siblings.indexOf(node) + 1
    parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${idx})`)
    node = parent
  }
  return parts.join(' > ')
}
