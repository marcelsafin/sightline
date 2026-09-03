# Contract: Tool Annotation Matrix

Required state after this feature. Verified via native CDP `WebMCP.enable` → `toolsAdded` (see quickstart.md).

| Tool | Returns page-authored content? | `readOnlyHint` | `untrustedContentHint` | Registered when |
|---|---|---|---|---|
| `list_packs` | no | true | — | always |
| `scan_page` | no (rule titles, structural selectors) | true | — | always |
| `navigate_node` | **yes** (html) | true | **true** | always |
| `highlight_issue` | no | true | — | after scan |
| `propose_fix` | **yes** (before/after html, nearbyText) | true | **true** | after scan |
| `re_scan` | no | true | — | after scan |
| `apply_fix` | no | — | — | after proposal |
| `revert_fix` | no | — | — | after ≥1 approved fix |
| `export_patch` | **yes** (diff with outerHTML) | true | **true ← ADD** | after ≥1 approved fix |

Invariant (Constitution V): every row with "yes" in column 2 has `true` in column 4. Before this feature: 2/3. After: 3/3.

Source of truth: `src/webmcp.ts` annotations objects. Change site: the `export_patch` definition, `annotations: { readOnlyHint: true }` → `annotations: { readOnlyHint: true, untrustedContentHint: true }`.
