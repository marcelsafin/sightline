/**
 * Accessibility pack: axe-core scan + six safe fixers.
 *
 * Division of labour: rules with a mechanical answer (contrast, heading
 * level, tabindex) are measured from the live DOM. Rules whose answer is
 * human-facing content (alt text, labels, roles) require the agent to author
 * it; the engine validates and applies, but never invents the words.
 */
import type { AuditIssue } from '../types'
import type { AuditPack, Fixer, PatchOutcome, ScanContext } from './types'
import {
  VALID_ROLES,
  cleanText,
  contrastRatio,
  effectiveBackground,
  expectedHeadingLevel,
  parseRgb,
  passingForeground,
  relativeLuminance,
  requiredContrast,
  toHex,
} from './shared'
import { shortHash, slug } from './util'

export const A11Y_RULES = [
  'image-alt',
  'label',
  'color-contrast',
  'heading-order',
  'aria-roles',
  'tabindex',
]

const IMPACT_ORDER = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
  null: 4,
} as const

function normalizeSelector(target: unknown): string {
  if (Array.isArray(target)) return String(target[0] ?? '')
  return String(target ?? '')
}

async function scan(ctx: ScanContext): Promise<AuditIssue[]> {
  const frameWindow = ctx.auditRoot.ownerDocument.defaultView as
    | (Window & { axe?: typeof import('axe-core') })
    | null
  const axe = frameWindow?.axe
  if (!axe) throw new Error('axe is not available inside the audit surface.')

  const results = await axe.run('[data-sightline-audit-root]', {
    runOnly: { type: 'rule', values: A11Y_RULES },
    resultTypes: ['violations'],
  })

  const issues: AuditIssue[] = []
  for (const violation of results.violations) {
    violation.nodes.forEach((node, index) => {
      const rawSelector = normalizeSelector(node.target)
      const selector = ctx.stableSelector(rawSelector)
      const element = ctx.findElement(selector)
      const key =
        element?.getAttribute('data-sightline-key') ||
        shortHash(`${rawSelector}-${index}`)
      issues.push({
        id: `${violation.id}-${slug(key)}`,
        packId: 'accessibility',
        ruleId: violation.id,
        title: violation.help,
        description: violation.description,
        helpUrl: violation.helpUrl,
        impact: node.impact ?? violation.impact ?? null,
        selector,
        html: node.html,
        failureSummary:
          node.failureSummary?.replace(/^Fix (any|all) of the following:\s*/i, '') ||
          violation.help,
        wcagTags: violation.tags.filter((tag) => tag.startsWith('wcag')),
      })
    })
  }
  issues.sort((l, r) => {
    const d =
      IMPACT_ORDER[String(l.impact) as keyof typeof IMPACT_ORDER] -
      IMPACT_ORDER[String(r.impact) as keyof typeof IMPACT_ORDER]
    return d || l.ruleId.localeCompare(r.ruleId)
  })
  return issues
}

const imageAlt: Fixer = (issue, _element, { input }): PatchOutcome => {
  if (input.altText === undefined) {
    return {
      kind: 'needs_input',
      requiredField: 'altText',
      guidance:
        'Describe what the image shows for someone who cannot see it, in one short sentence. Use an empty string only if the image is purely decorative.',
    }
  }
  const altText =
    input.altText === '' ? '' : cleanText(input.altText, 'altText', 160)
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: altText
        ? `Add alt text: "${altText}"`
        : 'Mark image as decorative (empty alt)',
      rationale:
        'A screen reader currently announces the file name. The agent authored this description from page context; you confirm it is true to the picture.',
      evidence: [
        'alt attribute: missing',
        `agent-authored alt: ${altText ? `"${altText}"` : '(decorative)'}`,
      ],
      authoredBy: 'agent',
      operation: { kind: 'set-attribute', name: 'alt', value: altText },
    },
  }
}

const label: Fixer = (issue, element, { input }): PatchOutcome => {
  if (input.labelText === undefined) {
    return {
      kind: 'needs_input',
      requiredField: 'labelText',
      guidance:
        'Write the visible label a person should see for this field, in the page\u2019s own language and voice.',
    }
  }
  const labelText = cleanText(input.labelText, 'labelText', 80)
  const key = element.dataset.sightlineKey || shortHash(issue.selector)
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Add visible label "${labelText}"`,
      rationale:
        'Placeholder or nearby text is not an accessible name. A programmatically associated label fixes navigation and error recovery.',
      evidence: [
        'accessible name: none',
        `agent-authored label: "${labelText}"`,
      ],
      authoredBy: 'agent',
      operation: {
        kind: 'insert-label',
        text: labelText,
        inputId: element.id || `sightline-field-${slug(key)}`,
      },
    },
  }
}

const ariaRoles: Fixer = (issue, element, { input }): PatchOutcome => {
  const current = element.getAttribute('role') ?? '(none)'
  if (input.role === undefined) {
    return {
      kind: 'needs_input',
      requiredField: 'role',
      guidance: `The element has role="${current}", which is not a valid ARIA role. Decide what the control actually is (e.g. button, link) from its behaviour.`,
    }
  }
  const role = cleanText(input.role, 'role', 24).toLowerCase()
  if (!VALID_ROLES.has(role)) {
    throw new Error(
      `role must be one of: ${[...VALID_ROLES].join(', ')}.`,
    )
  }
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Replace role="${current}" with role="${role}"`,
      rationale:
        'An unknown role is ignored by assistive technology. The agent chose the role from the control\u2019s behaviour; you confirm the intent.',
      evidence: [`current role: "${current}" (invalid)`, `agent-chosen role: "${role}"`],
      authoredBy: 'agent',
      operation: { kind: 'set-attribute', name: 'role', value: role },
    },
  }
}

const colorContrast: Fixer = (issue, element): PatchOutcome => {
  const style = getComputedStyle(element)
  const fg = parseRgb(style.color) ?? [0, 0, 0, 1]
  const bg = effectiveBackground(element)
  const target = requiredContrast(element)
  const before = contrastRatio(fg, bg)
  const fixed = passingForeground(fg, bg, target)
  const after = contrastRatio(fixed, bg)
  if (after < target) {
    throw new Error(
      `Cannot reach ${target}:1 by changing the text colour alone (best ${after.toFixed(2)}:1 against ${toHex(bg)}); the background needs a design decision.`,
    )
  }
  const direction = relativeLuminance(fixed) < relativeLuminance(fg) ? 'Darken' : 'Lighten'
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `${direction} text from ${before.toFixed(2)}:1 to ${after.toFixed(2)}:1`,
      rationale: `Measured ${before.toFixed(2)}:1 against the effective background; WCAG requires ${target}:1 for this text size. The replacement keeps the same hue, ${direction === 'Darken' ? 'darkened' : 'lightened'} just enough to pass.`,
      evidence: [
        `measured contrast: ${before.toFixed(2)}:1`,
        `required: ${target}:1`,
        `proposed: ${toHex(fixed)} → ${after.toFixed(2)}:1`,
      ],
      authoredBy: 'engine',
      operation: { kind: 'set-style', property: 'color', value: toHex(fixed) },
    },
  }
}

const headingOrder: Fixer = (issue, element, { root, input }): PatchOutcome => {
  const currentLevel = Number(element.tagName.slice(1))
  const derived = expectedHeadingLevel(element, root)
  const level = input.headingLevel ?? derived
  if (!Number.isInteger(level) || level < 1 || level > 6) {
    throw new Error('headingLevel must be an integer between 1 and 6.')
  }
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Change <h${currentLevel}> to <h${level}>`,
      rationale: `The document outline reaches level ${derived - 1} before this heading, so the next valid level is h${derived}. Skipping levels makes the outline sound incomplete to screen-reader users.`,
      evidence: [
        `current: h${currentLevel}`,
        `outline-derived level: h${derived}`,
        input.headingLevel !== undefined
          ? `agent override: h${input.headingLevel}`
          : 'agent accepted derived level',
      ],
      authoredBy: input.headingLevel !== undefined ? 'agent' : 'engine',
      operation: { kind: 'replace-tag', tagName: `h${level}` },
    },
  }
}

const tabindex: Fixer = (issue, element): PatchOutcome => {
  const current = element.getAttribute('tabindex') ?? '(none)'
  return {
    kind: 'patch',
    definition: {
      ruleId: issue.ruleId,
      summary: `Reset tabindex="${current}" to tabindex="0"`,
      rationale:
        'A positive tabindex pulls focus out of reading order. tabindex="0" keeps the control reachable while letting DOM order define the sequence.',
      evidence: [`current tabindex: ${current}`, 'proposed: 0'],
      authoredBy: 'engine',
      operation: { kind: 'set-attribute', name: 'tabindex', value: '0' },
    },
  }
}

export const accessibilityPack: AuditPack = {
  id: 'accessibility',
  label: 'Accessibility',
  description:
    'axe-core WCAG 2.1 AA checks: alt text, labels, contrast, heading order, ARIA roles, focus order. Agent authors alt/label/role; engine measures contrast and outline.',
  rules: A11Y_RULES,
  scan,
  fixers: {
    'image-alt': imageAlt,
    'label': label,
    'aria-roles': ariaRoles,
    'color-contrast': colorContrast,
    'heading-order': headingOrder,
    'tabindex': tabindex,
  },
}
