import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve(process.cwd(), 'src')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}
const sources = walk(SRC).filter(
  (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('demo.ts') && !f.includes('__tests__') && !f.endsWith('.d.ts'),
)
const demo = readFileSync(path.join(SRC, 'demo.ts'), 'utf8')

describe('constitution III — no planted answers, no fixture-specific lookups', () => {
  it('the fixture carries problems only, never answers', () => {
    expect(demo).not.toMatch(/data-fix/)
  })

  it('no fixture element key is referenced anywhere outside the fixture', () => {
    const keys = [...demo.matchAll(/data-sightline-key="([^"]+)"/g)].map((m) => m[1])
    expect(keys.length).toBeGreaterThan(10)
    for (const file of sources) {
      const text = readFileSync(file, 'utf8')
      for (const key of keys) {
        expect(text, `${path.relative(SRC, file)} references fixture key "${key}"`).not.toContain(`"${key}"`)
        expect(text, `${path.relative(SRC, file)} references fixture key "${key}"`).not.toContain(`'${key}'`)
      }
    }
  })

  it('the bundled agent only uses context returned by tools, never the DOM', () => {
    const agent = readFileSync(path.join(SRC, 'agent.ts'), 'utf8')
    expect(agent).not.toMatch(/document\.querySelector|getElementById|\.innerHTML|\.outerHTML/)
  })
})
