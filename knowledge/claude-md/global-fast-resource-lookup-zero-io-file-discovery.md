---
source: global
section: FAST RESOURCE LOOKUP (zero-IO file discovery)
slug: fast-resource-lookup-zero-io-file-discovery
indexed_at: 2026-04-28T00:49:50.583Z
---

## FAST RESOURCE LOOKUP (zero-IO file discovery)

### Digest Files (pre-computed indexes)
| Digest | Contents | Path |
|--------|----------|------|
| ENGINE_DIGEST.md | 2392 engines, 1-line each | `mcp-server/data/docs/` |
| DISPATCHER_DIGEST.md | 91 dispatchers + action counts | `mcp-server/data/docs/` |
| DIRECTORY_DIGEST.md | 215 directories with purposes | `mcp-server/data/docs/` |
| CODE_SYSTEM_INDEX.json | 1865 shortcode→path mappings | `mcp-server/data/docs/` |
| PRISM-INVENTORY-LATEST.md | Live counts (auto-refreshed) | `H:/prism/` |

### DSL Shortcodes (use in output to save tokens)
- `E####: Name` → `src/engines/Name.ts`
- `D##: Name` → `src/tools/dispatchers/Name.ts`
- `A##: Name` → `src/algorithms/Name.ts`
- `T####: Name` → `src/__tests__/Name.test.ts`

Resolve: `/code-index lookup <shortcode>` or `codeSystemIndexEngine.resolve()`

### Quick Path Reference
| Resource | Path |
|----------|------|
| Physics constants | `mcp-server/src/physics/constants.ts` |
| Schemas | `mcp-server/src/schemas/*.ts` |
| Registries | `mcp-server/src/registries/*.ts` |
| Hooks (source) | `mcp-server/src/hooks/*.ts` |
| Hooks (Claude) | `.claude/hooks/*.mjs` |
| Skills (user) | `~/.claude/commands/*.md` |
| Skills (project) | `.claude/commands/*.md` |
| State (shared) | `state/shared/*.md` |
| Handoffs | `state/shared/handoffs/HANDOFF-*.md` |
| JM Die programs | `JM DIE/` (24,545 files) |

---
