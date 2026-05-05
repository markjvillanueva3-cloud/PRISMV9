---
schema_version: 1.0.0
source: project
section: MANDATORY SELF-AWARENESS (hooks enforce this automatically)
slug: mandatory-self-awareness-hooks-enforce-this-automatically
start_line: 100
end_line: 121
indexed_at: 2026-05-05T13:49:55.470Z
content_hash: fc7ed841b37935f07672df7be5d9ca6c7b0b0df3c81e61940f1683b0b3c8feb5
mirror_engine: ClaudeMdChunkerEngine
---
## MANDATORY SELF-AWARENESS (hooks enforce this automatically)
Every build/create/investigate request auto-fires these gates before your first tool call:
- `inventory-check-guard.mjs` → injects current counts from PRISM-INVENTORY-LATEST.md
- `master-index-search-gate.mjs` → fuzzy search for existing similar assets
- `dedup-auto-invoke.mjs` → silent duplicate check
- `duplication-hard-block.mjs` → **HARD BLOCK** on exact duplicates
- `ai-feature-recommend.mjs` → recommends relevant engines
- `build-create-detector.mjs` → detects create intent

**Before creating ANY engine/algorithm/formula/hook/action:**
```typescript
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";
const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine", proposedName: "MyEngine",
  keywords: ["cutting","force"], description: "…"
});
if (!check.shouldProceed) { /* USE existing: check.matches[0] */ }
```
Methods: `mustCheckBeforeCreating()` + `mustNotReExtract()` **THROW** on duplicates — you cannot bypass.

Already-extracted (do NOT re-extract): Mastercam(45), hyperMILL(25), Okuma(63), Fanuc(35), Haas(28), Titans(42). Full log: `mcp-server/data/state/extraction-log.json`. Cross-session registry: `mcp-server/data/state/cross-session-asset-registry.json`.
