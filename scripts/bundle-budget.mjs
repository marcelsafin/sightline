// Fails the build when the shipped JS grows past the budget. Keeps axe-core from
// being bundled twice again (audit CTO-5) and makes size regressions visible in CI.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'

const dir = 'dist/assets'
const BUDGET_RAW_KB = 900
const BUDGET_GZIP_KB = 300
const BUDGET_ENTRY_KB = 320 // the eagerly loaded chunk; axe-core is lazy-loaded at first scan
let raw = 0, gz = 0, entry = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue
  const p = join(dir, f)
  raw += statSync(p).size
  gz += gzipSync(readFileSync(p)).length
  if (f.startsWith('index-')) entry = statSync(p).size
}
const rawKb = Math.round(raw / 1024), gzKb = Math.round(gz / 1024), entryKb = Math.round(entry / 1024)
console.log(`bundle: ${rawKb} KB raw · ${gzKb} KB gzip · entry ${entryKb} KB (budget ${BUDGET_RAW_KB} / ${BUDGET_GZIP_KB} / ${BUDGET_ENTRY_KB})`)
if (rawKb > BUDGET_RAW_KB || gzKb > BUDGET_GZIP_KB || entryKb > BUDGET_ENTRY_KB) {
  console.error('bundle budget exceeded')
  process.exit(1)
}
