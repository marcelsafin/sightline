/**
 * Performance pack — pure DOM inspection of things that hurt Core Web Vitals
 * and can be fixed safely in markup. Everything here is measured, so every
 * fixer is engine-authored; there is no copy for an agent to write.
 */
import type { AuditIssue, Impact } from '../types'
import type { AuditPack, Fixer, PatchOutcome, ScanContext } from './types'
import { pathSelector } from './shared'
import { slug } from './util'

export const PERF_RULES = ['img-dimensions', 'img-lazy', 'link-rel-noopener']

const REF = 'https://web.dev/articles/vitals'

// Anything below this many pixels from the top of the audit surface is
// treated as "below the fold" for a typical desktop viewport.
const FOLD_PX = 900

function issue(
  ctx: ScanContext,
  ruleId: string,
  element: Element,
  impact: Impact,
  title: string,
  description: string,
  failureSummary: string,
  key: string,
): AuditIssue {
  const keyed = element.getAttribute('data-sightline-key')
  const selector = pathSelector(element, ctx.auditRoot)
  return {
    id: `${ruleId}-${slug(keyed ?? key)}`,
    packId: 'performance',
    ruleId,
    title,
    description,
    helpUrl: REF,
    impact,
    selector,
    html: element.outerHTML.slice(0, 400),
    failureSummary,
    wcagTags: [],
  }
}

async function scan(ctx: ScanContext): Promise<AuditIssue[]> {
  const root = ctx.auditRoot
  const rootTop = root.getBoundingClientRect().top
  const issues: AuditIssue[] = []

  root.querySelectorAll('img').forEach((img, i) => {
    const hasDims = img.hasAttribute('width') && img.hasAttribute('height')
    if (!hasDims) {
      issues.push(
        issue(ctx, 'img-dimensions', img, 'moderate',
          'Image has no width and height attributes',
          'Without intrinsic dimensions the browser cannot reserve space, so content jumps when the image loads (Cumulative Layout Shift).',
          `Rendered size is ${Math.round(img.getBoundingClientRect().width)}×${Math.round(img.getBoundingClientRect().height)}px but no width/height attributes are set.`,
          `img-${i}`),
      )
    }
    const top = img.getBoundingClientRect().top - rootTop
    if (top > FOLD_PX && img.getAttribute('loading') !== 'lazy') {
      issues.push(
        issue(ctx, 'img-lazy', img, 'minor',
          'Below-the-fold image loads eagerly',
          'Images the user cannot see yet compete for bandwidth with the content they can. loading="lazy" defers them.',
          `Image sits ${Math.round(top)}px from the top, past the ${FOLD_PX}px fold, with no loading attribute.`,
          `img-${i}`),
      )
    }
  })

  root.querySelectorAll('a[target="_blank"]').forEach((a, i) => {
    const rel = (a.getAttribute('rel') ?? '').split(/\s+/)
    if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
      issues.push(
        issue(ctx, 'link-rel-noopener', a, 'minor',
          'New-tab link shares its process with the opener',
          'Without rel="noopener" the opened page can access window.opener and runs in the same process, hurting both security and performance.',
          `target="_blank" without rel="noopener".`,
          `blank-${i}`),
      )
    }
  })

  return issues
}

const imgDimensions: Fixer = (issue, element): PatchOutcome => {
  const img = element as HTMLImageElement
  const rect = img.getBoundingClientRect()
  const w = Math.round(img.naturalWidth || rect.width)
  const h = Math.round(img.naturalHeight || rect.height)
  if (!w || !h) throw new Error('Image has not loaded; cannot measure dimensions yet.')
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Reserve ${w}×${h} for the image`,
      rationale:
        'Setting width and height lets the browser compute the aspect ratio before the file arrives, so nothing shifts when it loads.',
      evidence: [
        `measured ${img.naturalWidth ? 'intrinsic' : 'rendered'} size: ${w}×${h}`,
        'width/height attributes: missing',
      ],
      authoredBy: 'engine',
      operation: {
        kind: 'set-attributes',
        attributes: { width: String(w), height: String(h) },
      },
    },
  }
}

const imgLazy: Fixer = (issue): PatchOutcome => ({
  kind: 'patch',
  definition: {
    ruleId: issue.ruleId,
    summary: 'Defer this image with loading="lazy"',
    rationale:
      'The image is below the first viewport. Lazy loading lets visible content finish first.',
    evidence: ['position: below the fold', 'loading attribute: missing'],
    authoredBy: 'engine',
    operation: { kind: 'set-attribute', name: 'loading', value: 'lazy' },
  },
})

const linkRelNoopener: Fixer = (issue, element): PatchOutcome => {
  const existing = (element.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean)
  const rel = [...new Set([...existing, 'noopener'])].join(' ')
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: 'Add rel="noopener" to the new-tab link',
      rationale:
        'Isolates the opened page from this one: no window.opener access, and the browser may use a separate process.',
      evidence: [`current rel: ${existing.length ? existing.join(' ') : '(none)'}`, `proposed rel: ${rel}`],
      authoredBy: 'engine',
      operation: { kind: 'set-attribute', name: 'rel', value: rel },
    },
  }
}

export const performancePack: AuditPack = {
  id: 'performance',
  label: 'Performance',
  description:
    'Core Web Vitals hygiene measured from the DOM: image dimensions (CLS), lazy loading below the fold, noopener on new-tab links. All fixes are engine-measured.',
  rules: PERF_RULES,
  scan,
  fixers: {
    'img-dimensions': imgDimensions,
    'img-lazy': imgLazy,
    'link-rel-noopener': linkRelNoopener,
  },
}
