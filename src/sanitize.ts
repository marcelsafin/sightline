const BLOCKED_ELEMENTS = [
  'script',
  'style',
  'iframe',
  'frame',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'template',
  'video',
  'audio',
  'source',
  'track',
]

const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'poster',
  'xlink:href',
  'cite',
  'background',
])

const BLOCKED_ATTRIBUTES = new Set([
  'action',
  'autofocus',
  'formaction',
  'ping',
  'srcdoc',
  'srcset',
  'style',
])

function isSafeLocalUrl(name: string, rawValue: string): boolean {
  const value = rawValue
    .split('')
    .filter((character) => character.charCodeAt(0) > 32)
    .join('')
    .toLowerCase()

  if (
    value.startsWith('#') ||
    (value.startsWith('/') && !value.startsWith('//')) ||
    value.startsWith('./') ||
    value.startsWith('../')
  ) {
    return true
  }

  if (
    name === 'src' &&
    /^data:image\/(?:png|jpe?g|gif|webp);base64,/.test(value)
  ) {
    return true
  }

  return !/^[a-z][a-z0-9+.-]*:|^\/\//.test(value)
}

export function sanitizeImportedHtml(input: string): string {
  if (!input.trim()) {
    throw new Error('Paste some HTML first.')
  }

  if (input.length > 100_000) {
    throw new Error('HTML is too large. Keep imports under 100 KB.')
  }

  const documentNode = new DOMParser().parseFromString(input, 'text/html')

  for (const selector of BLOCKED_ELEMENTS) {
    documentNode.querySelectorAll(selector).forEach((node) => node.remove())
  }

  for (const element of documentNode.body.querySelectorAll('*')) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()

      if (
        name.startsWith('on') ||
        BLOCKED_ATTRIBUTES.has(name) ||
        (URL_ATTRIBUTES.has(name) &&
          !isSafeLocalUrl(name, attribute.value))
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  return `<div class="imported-page">${documentNode.body.innerHTML}</div>`
}
