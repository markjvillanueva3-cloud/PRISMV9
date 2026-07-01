---
source: project
section: MANDATORY SELF-AWARENESS (hooks enforce this automatically)
slug: mandatory-self-awareness-hooks-enforce-this-automatically
indexed_at: 2026-06-23T02:05:18.084Z
---

## MANDATORY SELF-AWARENESS (hooks enforce this automatically)

Every build/create/investigate request auto-fires these gates before your first tool call:
- `inventory-check-guard.mjs` → injects current counts from PRISM-INVENTORY-LATEST.md
- `master-index-search-gate.mjs` → fuzzy search for existing similar assets
- `dedup-auto-invoke.mjs` → silent duplicate check
- `duplication-hard-block.mjs` → **HARD BLOCK** on exact duplicates
- `ai-feature-recommend.mjs` → recommends relevant engines
- `build-create-detector.mjs` → detects create intent

**Bug-finding → wiki gate (2026-05-17, lima 77971357 — commit `bb198d9285`):** `.claude/hooks/stop-bug-finding-wiki-gate.mjs` (T3 Stop advisory, wired Stop[0].hooks[19] in both `C:\Users\<u>\.claude\settings.json` + auto-mirrored to H:). Detects bug findings shipped this session via three signals — CLAUDE.md `## Recent regressions` delta, new `feedback_*.md`/`reference_*_(bug|regression|fix)_*.md` memory files, and commit-subject keywords (`[fix]`, `regression`, `silent`, `corruption`, `R12`, `BLOCK`, `FAILLOUD`, `fail-loud`, `rot`) — then verifies a companion wiki entry exists under `knowledge/wiki/{lessons,code-tribal,architecture}/`. Missing → advisory `systemMessage` reminder pointing at [[feedback_always_update_wiki_on_bug_finding]] doctrine. NOT a block (per-file scrutiny + 3-of-3 stay in front). Knobs: `PRISM_BUG_FINDING_WIKI_GATE_{DISABLE,HORIZON,MAX_LIST}`. Wiki: [`knowledge/wiki/lessons/bug-findings-wiki-gate.md`]. Memory: [[feedback_always_update_wiki_on_bug_finding]].

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
