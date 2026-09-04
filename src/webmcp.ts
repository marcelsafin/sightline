import type { SightlineEngine } from './engine'
import type {
  EngineState,
  PackId,
  ToolExecutionOptions,
  WcagLevel,
} from './types'

type ToolInput = Record<string, unknown>

interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
  }
  execute: (
    input: ToolInput,
    options: ToolExecutionOptions,
  ) => Promise<unknown> | unknown
}

function stringValue(
  input: ToolInput,
  key: string,
  options: { required?: boolean; allowed?: readonly string[] } = {},
): string | undefined {
  const value = input?.[key]
  if (value === undefined || value === null || value === '') {
    if (options.required) {
      throw new Error(`${key} is required.`)
    }
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string.`)
  }
  if (options.allowed && !options.allowed.includes(value)) {
    throw new Error(
      `${key} must be one of: ${options.allowed.join(', ')}.`,
    )
  }
  return value
}

function signalFrom(options?: ToolExecutionOptions): AbortSignal {
  return options?.signal ?? new AbortController().signal
}

function optionalString(input: ToolInput, key: string): string | undefined {
  const value = input?.[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`${key} must be a string.`)
  return value
}

function optionalInteger(input: ToolInput, key: string): number | undefined {
  const value = input?.[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer.`)
  }
  return value
}

function packList(
  input: ToolInput,
  key: string,
  allowed: readonly PackId[],
): PackId[] | undefined {
  const value = input?.[key]
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) throw new Error(`${key} must be an array.`)
  return value.map((item) => {
    if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item)) {
      throw new Error(`${key} entries must be one of: ${allowed.join(', ')}.`)
    }
    return item as PackId
  })
}

function buildDefinitions(
  engine: SightlineEngine,
  state: EngineState,
): ToolDefinition[] {
  const packIds = engine.packs.map((pack) => pack.id)
  const definitions: ToolDefinition[] = [
    {
      name: 'list_packs',
      title: 'List rule packs',
      description:
        'List the rule packs this page exposes (accessibility, seo, performance): id, label, what each checks, and which fixes require agent-authored content. Call this first to decide which packs to scan.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () =>
        engine.packs.map((pack) => ({
          id: pack.id,
          label: pack.label,
          description: pack.description,
          rules: pack.rules,
        })),
    },
    {
      name: 'scan_page',
      title: 'Scan page',
      description:
        'Run Sightline’s audit over the live page with one or more rule packs (default: all). Returns stable issue IDs with packId, rule, impact, selector, and per-pack plus overall 0–100 score. Start every workflow here.',
      inputSchema: {
        type: 'object',
        properties: {
          wcagLevel: {
            type: 'string',
            enum: ['A', 'AA', 'AAA'],
            default: 'AA',
            description: 'Requested WCAG conformance target (accessibility pack).',
          },
          packs: {
            type: 'array',
            items: { type: 'string', enum: packIds },
            description: 'Rule packs to run. Omit to run all.',
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: (input, options) =>
        engine.scanPage(
          {
            wcagLevel:
              (stringValue(input, 'wcagLevel', {
                allowed: ['A', 'AA', 'AAA'],
              }) as WcagLevel | undefined) ?? 'AA',
            packs: packList(input, 'packs', packIds),
          },
          { actor: 'agent', signal: signalFrom(options) },
        ),
    },
    {
      name: 'navigate_node',
      title: 'Inspect page node',
      description:
        'Navigate the shared preview to a CSS selector and return a short HTML/text snapshot. Use it to understand surrounding page context without changing anything.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector inside the audited preview.',
          },
        },
        required: ['selector'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input, options) =>
        engine.navigateNode(
          stringValue(input, 'selector', { required: true })!,
          { actor: 'agent', signal: signalFrom(options) },
        ),
    },
  ]

  if (state.issues.length > 0) {
    definitions.push(
      {
        name: 'highlight_issue',
        title: 'Highlight issue',
        description:
          'Move the human-visible focus overlay to one current audit issue. This creates shared visual context before discussing a repair.',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'A current ID returned by scan_page.',
            },
          },
          required: ['issueId'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input, options) =>
          engine.highlightIssue(
            stringValue(input, 'issueId', { required: true })!,
            { actor: 'agent', signal: signalFrom(options) },
          ),
      },
      {
        name: 'propose_fix',
        title: 'Propose safe fix',
        description:
          'Create a selector-scoped patch for one current issue. Does not mutate the page. For image-alt, label and aria-roles the AGENT must author the content (altText / labelText / role) using the page context; call without it first to receive a needs_input response with guidance, html and nearbyText. Contrast, heading level and tabindex are measured by the engine from the live DOM.',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'A current ID returned by scan_page.',
            },
            altText: {
              type: 'string',
              description:
                'image-alt only. Agent-authored description of what the image shows, ≤160 chars, plain text. Empty string marks the image decorative.',
            },
            labelText: {
              type: 'string',
              description:
                'label only. Agent-authored visible label for the form field, ≤80 chars, in the page language.',
            },
            role: {
              type: 'string',
              description:
                'aria-roles only. The valid ARIA role the control should have, chosen from its behaviour (e.g. button, link).',
            },
            headingLevel: {
              type: 'integer',
              minimum: 1,
              maximum: 6,
              description:
                'heading-order only. Optional override; omit to accept the level the engine derives from the document outline.',
            },
            title: {
              type: 'string',
              description:
                'seo document-title only. Agent-authored page title, 10–60 chars, plain text, in the page language.',
            },
            description: {
              type: 'string',
              description:
                'seo meta-description only. Agent-authored summary, 50–155 chars, plain text.',
            },
            linkText: {
              type: 'string',
              description:
                'seo link-text only. Agent-authored descriptive link text (2–6 words) replacing generic text like "click here".',
            },
          },
          required: ['issueId'],
          additionalProperties: false,
        },
        annotations: {
          readOnlyHint: true,
          untrustedContentHint: true,
        },
        execute: (input, options) =>
          engine.proposeFix(
            stringValue(input, 'issueId', { required: true })!,
            {
              altText: optionalString(input, 'altText'),
              labelText: optionalString(input, 'labelText'),
              role: optionalString(input, 'role'),
              headingLevel: optionalInteger(input, 'headingLevel'),
              title: optionalString(input, 'title'),
              description: optionalString(input, 'description'),
              linkText: optionalString(input, 'linkText'),
            },
            { actor: 'agent', signal: signalFrom(options) },
          ),
      },
      {
        name: 're_scan',
        title: 'Verify changes',
        description:
          'Re-run the focused audit after page changes. Returns the updated score, remaining issue IDs and next recommended barrier.',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              enum: ['page', 'changed'],
              default: 'changed',
              description:
                'Label this as a full audit or post-change verification.',
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input, options) =>
          engine.scanPage(
            {
              wcagLevel: 'AA',
              scope:
                (stringValue(input, 'scope', {
                  allowed: ['page', 'changed'],
                }) as 'page' | 'changed' | undefined) ?? 'changed',
            },
            { actor: 'agent', signal: signalFrom(options) },
          ),
      },
    )
  }

  if (state.proposal) {
    definitions.push({
      name: 'apply_fix',
      title: 'Request fix approval',
      description:
        'Stage the current safe patch in Sightline’s human confirmation dialog. Execution waits for the person to approve or decline; never bypasses consent.',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: {
            type: 'string',
            description: 'Issue ID from the latest propose_fix result.',
          },
          patchId: {
            type: 'string',
            description: 'Patch ID from the latest propose_fix result.',
          },
        },
        required: ['issueId', 'patchId'],
        additionalProperties: false,
      },
      execute: (input, options) =>
        engine.requestApply(
          stringValue(input, 'issueId', { required: true })!,
          stringValue(input, 'patchId', { required: true })!,
          { actor: 'agent', signal: signalFrom(options) },
        ),
    })
  }

  if (state.appliedFixes.length > 0) {
    definitions.push(
      {
        name: 'revert_fix',
        title: 'Revert approved fix',
        description:
          'Undo one previously approved fix by its current fix ID, rebuild the preview from safe history, and return the new score.',
        inputSchema: {
          type: 'object',
          properties: {
            fixId: {
              type: 'string',
              description: 'A fix ID returned by apply_fix.',
            },
          },
          required: ['fixId'],
          additionalProperties: false,
        },
        execute: (input, options) =>
          engine.revertFix(
            stringValue(input, 'fixId', { required: true })!,
            { actor: 'agent', signal: signalFrom(options) },
          ),
      },
      {
        name: 'export_patch',
        title: 'Export verified work',
        description:
          'Export only human-approved changes as a compact unified-style diff or a review report with per-pack scores, evidence and a scope statement.',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['diff', 'report'],
              default: 'diff',
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input, options) =>
          engine.exportPatch(
            (stringValue(input, 'format', {
              allowed: ['diff', 'report'],
            }) as 'diff' | 'report' | undefined) ?? 'diff',
            { actor: 'agent', signal: signalFrom(options) },
          ),
      },
    )
  }

  return definitions
}

export function registerWebMcp(engine: SightlineEngine): () => void {
  const modelContext = document.modelContext
  // Debug handle for local development only; production exposes nothing but WebMCP.
  if (import.meta.env.DEV) window.__SIGHTLINE__ = { engine }

  if (!modelContext) {
    engine.setWebMcpState({
      available: false,
      registering: false,
      registeredTools: [],
      error: null,
    })
    return () => {
      delete window.__SIGHTLINE__
    }
  }

  let disposed = false
  let refreshScheduled = false
  let registrationChain = Promise.resolve()
  const controllers = new Map<string, AbortController>()
  const registered = new Set<string>()

  const scheduleRefresh = () => {
    if (disposed || refreshScheduled) {
      return
    }
    refreshScheduled = true
    window.setTimeout(() => {
      refreshScheduled = false
      registrationChain = registrationChain.then(async () => {
        if (disposed) return

        const missing = buildDefinitions(engine, engine.getSnapshot()).filter(
          (tool) => !registered.has(tool.name),
        )
        if (!missing.length) return

        engine.setWebMcpState({
          available: true,
          registering: true,
          error: null,
        })

        let lastError: string | null = null
        for (const tool of missing) {
          if (disposed) return
          const controller = new AbortController()
          try {
            await modelContext.registerTool(tool, {
              signal: controller.signal,
            })
            controllers.set(tool.name, controller)
            registered.add(tool.name)
          } catch (error) {
            controller.abort()
            lastError = String(error)
          }
        }

        engine.setWebMcpState({
          available: true,
          registering: false,
          registeredTools: [...registered],
          error: lastError,
        })
      })
    }, 0)
  }

  const unsubscribe = engine.subscribe(scheduleRefresh)
  scheduleRefresh()

  return () => {
    disposed = true
    unsubscribe()
    controllers.forEach((controller) => controller.abort())
    delete window.__SIGHTLINE__
  }
}
