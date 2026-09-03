/**
 * Sightline's bundled in-page agent.
 *
 * This is a genuine WebMCP *client*: it discovers tools with
 * `document.modelContext.getTools()` and invokes them with `executeTool()`,
 * exactly like ChatGPT's in-app browser or Chrome's agent would. It has no
 * privileged access to the engine. When the page reports `needs_input`, the
 * agent authors the missing content from the context the tool returned.
 *
 * When `document.modelContext` is unavailable (browser without WebMCP), the
 * agent falls back to calling the same engine methods directly and says so in
 * the log, so the demo never silently pretends to be something it is not.
 */
import type { SightlineEngine } from './engine'
import type { FixPatch, ProposalInput, ProposalNeedsInput } from './types'

export type AgentTransport = 'webmcp' | 'direct'

interface RegisteredToolLike {
  name: string
}

interface ModelContextLike {
  getTools(): Promise<RegisteredToolLike[]>
  executeTool(tool: RegisteredToolLike, input: string): Promise<string>
}

function modelContext(): ModelContextLike | null {
  const mc = (document as Document & { modelContext?: unknown }).modelContext
  if (!mc || typeof mc !== 'object') return null
  const candidate = mc as Partial<ModelContextLike>
  if (
    typeof candidate.getTools !== 'function' ||
    typeof candidate.executeTool !== 'function'
  ) {
    return null
  }
  return candidate as ModelContextLike
}

function parse<T>(raw: unknown): T {
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
}

/**
 * Author human-facing content from the tool's returned context. This is the
 * only "intelligence" the bundled agent has: it reads the surrounding page and
 * writes a plausible value. It never reads hidden hints from the DOM.
 */
export function authorContent(
  needs: ProposalNeedsInput,
): ProposalInput {
  const { requiredField, context } = needs
  const html = context.html
  const nearby = context.nearbyText

  switch (requiredField) {
    case 'altText': {
      const src = html.match(/src="([^"]+)"/)?.[1] ?? ''
      const file = src.split('/').pop()?.replace(/\.[a-z0-9]+$/i, '') ?? ''
      const words = file.replace(/[-_]+/g, ' ').trim()
      if (/facebook|instagram|twitter|linkedin|youtube/i.test(words)) {
        const network = words.match(/facebook|instagram|twitter|linkedin|youtube/i)![0]
        return { altText: network[0].toUpperCase() + network.slice(1).toLowerCase() }
      }
      const headline = nearby.match(/^([^.!?]{8,60})/)?.[1]?.trim()
      return {
        altText: headline
          ? `Illustration for "${headline}"`
          : words
            ? words[0].toUpperCase() + words.slice(1)
            : 'Decorative illustration',
      }
    }
    case 'labelText': {
      const type = html.match(/type="([^"]+)"/)?.[1] ?? ''
      const hint = nearby.match(/[\w.+-]+@[\w-]+\.[\w.]+/) ? 'Email address' : null
      if (type === 'email' || hint) return { labelText: 'Email address' }
      const visible = html.match(/data-visual-label>([^<]+)</)?.[1]
      if (visible) return { labelText: `Choose ${visible.trim().toLowerCase()}` }
      return { labelText: 'Enter a value' }
    }
    case 'role': {
      if (/<a\b/i.test(html) || /href=/.test(html)) return { role: 'link' }
      return { role: 'button' }
    }
    case 'headingLevel':
      return {}
    case 'title': {
      // Page title: lead sentence from nearby copy, suffixed with the brand the
      // page itself declares (its first strong/heading text), never hardcoded.
      const lead = nearby.match(/^([^.!?]{10,50})/)?.[1]?.trim()
      const brand = context.html.match(/<strong[^>]*>([^<]{3,40})<\/strong>/)?.[1]?.trim()
      const base = lead ?? brand ?? 'Untitled page'
      return { title: brand && lead ? `${lead} · ${brand}` : base }
    }
    case 'description': {
      // First ~150 chars of real page copy, cut at a word boundary.
      const clean = nearby.replace(/\s+/g, ' ').trim()
      const cut = clean.slice(0, 150)
      const desc = cut.length < clean.length ? cut.replace(/\s+\S*$/, '') : cut
      return { description: desc.length >= 50 ? desc : `${desc} Learn how to take part.` }
    }
    case 'linkText': {
      const href = html.match(/href="([^"]+)"/)?.[1] ?? ''
      const target = href.replace(/^#/, '').replace(/[-_]+/g, ' ').trim()
      return { linkText: target ? `Go to ${target}` : 'Read the full details' }
    }
  }
}

export interface AgentStepResult {
  transport: AgentTransport
  issueId: string
  authored: ProposalInput | null
  patchId: string
}

/**
 * Run one agent step: highlight → propose (authoring content if asked) → stage
 * for approval. Resolves when the patch is staged; the human decision happens
 * in the UI, and `apply_fix`'s own promise is left to resolve on its own.
 */
export async function runAgentStep(
  engine: SightlineEngine,
  issueId: string,
  onApplyStaged: (applyPromise: Promise<unknown>) => void,
): Promise<AgentStepResult> {
  const mc = modelContext()

  if (mc) {
    const find = async (name: string) => {
      const tools = await mc.getTools()
      const tool = tools.find((t) => t.name === name)
      if (!tool) throw new Error(`WebMCP tool ${name} is not registered yet.`)
      return tool
    }
    const call = async <T,>(name: string, input: Record<string, unknown>) =>
      parse<T>(await mc.executeTool(await find(name), JSON.stringify(input)))

    await call('highlight_issue', { issueId })
    let result = await call<FixPatch | ProposalNeedsInput>('propose_fix', { issueId })
    let authored: ProposalInput | null = null
    if ('status' in result && result.status === 'needs_input') {
      authored = authorContent(result)
      result = await call<FixPatch | ProposalNeedsInput>('propose_fix', {
        issueId,
        ...authored,
      })
    }
    if ('status' in result) {
      throw new Error(`Agent could not satisfy propose_fix for ${issueId}.`)
    }
    const patch = result
    // apply_fix is registered dynamically once a proposal exists.
    await new Promise((r) => setTimeout(r, 60))
    onApplyStaged(
      call('apply_fix', { issueId, patchId: patch.id }).catch(() => undefined),
    )
    return { transport: 'webmcp', issueId, authored, patchId: patch.id }
  }

  // Fallback: no WebMCP in this browser. Same steps, direct engine calls.
  engine.highlightIssue(issueId, { actor: 'agent' })
  let result = engine.proposeFix(issueId, {}, { actor: 'agent' })
  let authored: ProposalInput | null = null
  if ('status' in result) {
    authored = authorContent(result)
    result = engine.proposeFix(issueId, authored, { actor: 'agent' })
  }
  if ('status' in result) {
    throw new Error(`Agent could not satisfy propose_fix for ${issueId}.`)
  }
  onApplyStaged(
    engine
      .requestApply(issueId, result.id, { actor: 'agent' })
      .catch(() => undefined),
  )
  return { transport: 'direct', issueId, authored, patchId: result.id }
}
