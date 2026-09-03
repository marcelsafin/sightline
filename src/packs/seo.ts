/**
 * SEO pack — pure DOM inspection, deterministic, no network.
 *
 * Same division of labour as accessibility: structural facts are measured by
 * the engine; copy (title, description, link text) must be authored by the
 * agent from page context. The engine never invents marketing words.
 */
import type { AuditIssue, Impact } from '../types'
import type { AuditPack, Fixer, PatchOutcome, ScanContext } from './types'
import { cleanText, pathSelector } from './shared'
import { slug } from './util'

export const SEO_RULES = [
  'document-title',
  'meta-description',
  'single-h1',
  'link-text',
  'html-lang',
]

const GENERIC_LINK_TEXT = new Set([
  'click here',
  'here',
  'read more',
  'more',
  'learn more',
  'link',
  'this',
])

const REF = 'https://developers.google.com/search/docs/appearance/'

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
    packId: 'seo',
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
  const issues: AuditIssue[] = []

  // The audited fixture is a page body; its <head> is represented by a
  // `[data-page-head]` container so head-level rules stay inspectable.
  const head = root.querySelector('[data-page-head]') ?? root

  const titles = head.querySelectorAll('[data-page-title]')
  if (titles.length === 0) {
    issues.push(
      issue(ctx, 'document-title', head, 'serious',
        'The page has no title',
        'Search engines and browser tabs use the document title as the primary label for the page.',
        'No <title> element was found in the document head.',
        'page-head'),
    )
  } else {
    const text = (titles[0].textContent ?? '').trim()
    if (text.length < 10 || text.length > 60) {
      issues.push(
        issue(ctx, 'document-title', titles[0], 'moderate',
          `The page title is ${text.length < 10 ? 'too short' : 'too long'}`,
          'Titles between 10 and 60 characters display fully in search results.',
          `Current title is ${text.length} characters: "${text}".`,
          'page-title'),
      )
    }
  }

  const description = head.querySelector('meta[name="description"]')
  if (!description) {
    issues.push(
      issue(ctx, 'meta-description', head, 'serious',
        'The page has no meta description',
        'Search engines use the description as the snippet under the title.',
        'No <meta name="description"> was found.',
        'page-head'),
    )
  }

  const html = root.querySelector('[data-page-html]')
  if (html && !html.getAttribute('lang')) {
    issues.push(
      issue(ctx, 'html-lang', html, 'serious',
        'The document language is not declared',
        'Search engines and screen readers rely on lang to select the right language model.',
        'The <html> element has no lang attribute.',
        'page-html'),
    )
  }

  const h1s = root.querySelectorAll('h1')
  if (h1s.length > 1) {
    h1s.forEach((h, i) => {
      if (i === 0) return
      issues.push(
        issue(ctx, 'single-h1', h, 'moderate',
          'The page has more than one h1',
          'One h1 tells search engines what the page is about. Additional top-level headings dilute it.',
          `This is h1 number ${i + 1} of ${h1s.length}.`,
          `h1-${i}`),
      )
    })
  }

  root.querySelectorAll('a[href]').forEach((a, i) => {
    const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (text && GENERIC_LINK_TEXT.has(text)) {
      issues.push(
        issue(ctx, 'link-text', a, 'moderate',
          `Link text "${a.textContent?.trim()}" says nothing about its destination`,
          'Descriptive link text helps search engines and people scanning the page understand where a link goes.',
          `Generic link text: "${text}".`,
          `link-${i}`),
      )
    }
  })

  return issues
}

const documentTitle: Fixer = (issue, element, { input }): PatchOutcome => {
  if (input.title === undefined) {
    return {
      kind: 'needs_input',
      requiredField: 'title',
      guidance:
        'Write a page title of 10–60 characters that names what this page is, in the page language. Lead with the specific subject, not the brand.',
    }
  }
  const title = cleanText(input.title, 'title', 60)
  if (title.length < 10) throw new Error('title must be at least 10 characters.')
  const current = (element.textContent ?? '').trim()
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Set page title: "${title}"`,
      rationale:
        'The title is the first thing search results and browser tabs show. The agent wrote it from the page content; you confirm it represents the page.',
      evidence: [
        `current title: ${current ? `"${current}" (${current.length} chars)` : 'missing'}`,
        `agent-authored title: "${title}" (${title.length} chars)`,
      ],
      authoredBy: 'agent',
      operation: element.hasAttribute('data-page-title')
        ? { kind: 'set-text', text: title }
        : { kind: 'set-title', text: title },
    },
  }
}

const metaDescription: Fixer = (issue, _element, { input }): PatchOutcome => {
  if (input.description === undefined) {
    return {
      kind: 'needs_input',
      requiredField: 'description',
      guidance:
        'Write a meta description of 50–155 characters summarising this page for someone deciding whether to click, in the page language.',
    }
  }
  const description = cleanText(input.description, 'description', 155)
  if (description.length < 50) throw new Error('description must be at least 50 characters.')
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: 'Add meta description',
      rationale:
        'Without a description, search engines pick an arbitrary snippet. The agent wrote this from the page content; you confirm it is accurate.',
      evidence: [
        'meta description: missing',
        `agent-authored: "${description}" (${description.length} chars)`,
      ],
      authoredBy: 'agent',
      operation: { kind: 'insert-meta', name: 'description', content: description },
    },
  }
}

const htmlLang: Fixer = (issue, element, { root }): PatchOutcome => {
  // Detect from the page's own content: Swedish characters vs. English.
  const text = (root.textContent ?? '').slice(0, 4000)
  const swedish = (text.match(/[åäöÅÄÖ]/g) ?? []).length
  const lang = swedish > 3 ? 'sv' : 'en'
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Declare document language: lang="${lang}"`,
      rationale: `Detected from page text (${swedish} Swedish-specific characters in the first 4 000 characters). Screen readers switch voice, and search engines index in the right language.`,
      evidence: [
        `current lang: ${element.getAttribute('lang') ?? '(none)'}`,
        `detected: ${lang}`,
      ],
      authoredBy: 'engine',
      operation: { kind: 'set-attribute', name: 'lang', value: lang },
    },
  }
}

const singleH1: Fixer = (issue, element): PatchOutcome => ({
  kind: 'patch',
  definition: {
    ruleId: issue.ruleId,
    summary: `Demote extra <h1> "${(element.textContent ?? '').trim().slice(0, 40)}" to <h2>`,
    rationale:
      'The first h1 already names the page. Demoting later h1s keeps a single top-level topic without changing visible text.',
    evidence: ['h1 count on page: >1', 'proposed: h2 for this heading'],
    authoredBy: 'engine',
    operation: { kind: 'replace-tag', tagName: 'h2' },
  },
})

const linkText: Fixer = (issue, element, { input }): PatchOutcome => {
  const current = (element.textContent ?? '').trim()
  if (input.linkText === undefined) {
    return {
      kind: 'needs_input',
      requiredField: 'linkText',
      guidance: `The link currently says "${current}" and points to ${element.getAttribute('href')}. Write 2–6 words that describe the destination, so the link makes sense out of context.`,
    }
  }
  const text = cleanText(input.linkText, 'linkText', 60)
  if (GENERIC_LINK_TEXT.has(text.toLowerCase())) {
    throw new Error('linkText is still generic; describe the destination.')
  }
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Replace link text "${current}" with "${text}"`,
      rationale:
        'Generic link text carries no meaning in search snippets or screen-reader link lists. The agent proposed wording from the destination; you confirm the voice.',
      evidence: [`current: "${current}"`, `agent-authored: "${text}"`],
      authoredBy: 'agent',
      operation: { kind: 'set-text', text },
    },
  }
}

export const seoPack: AuditPack = {
  id: 'seo',
  label: 'SEO',
  description:
    'Search visibility: document title, meta description, single h1, descriptive link text, declared language. Agent authors title/description/link text; engine fixes structure.',
  rules: SEO_RULES,
  scan,
  fixers: {
    'document-title': documentTitle,
    'meta-description': metaDescription,
    'html-lang': htmlLang,
    'single-h1': singleH1,
    'link-text': linkText,
  },
}
