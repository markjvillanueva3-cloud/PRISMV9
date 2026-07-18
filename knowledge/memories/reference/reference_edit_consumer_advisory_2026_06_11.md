---
name: reference_edit_consumer_advisory_2026_06_11
description: Awareness
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.565Z
aliases: reference_edit_consumer_advisory_2026_06_11
---


**Awareness deliverable #5 (slot:bravo, 2026-06-11)** — `.claude/hooks/edit-consumer-advisory.mjs`, a PostToolUse:Edit **advisory** (never blocks) that surfaces the REAL file-level importers (downstream consumers) of an edited `mcp-server/src` `.ts` file, so the agent's NEXT action is blast-radius-aware ("you edited FooEngine.ts — A, B, C import it; verify them"). Wired into `posttool-edit-bundle.mjs` SUB_HOOKS (main tree, live).

**Data source = `git grep -P`, NOT ripgrep.** `rg` is NOT on Node's spawn PATH on this host (only resolves inside an interactive shell) → `spawnSync("rg")` would ENOENT and silently return zero importers. git is guaranteed present in the repo + reliably Node-spawnable; `-P` gives PCRE so `\s`/`\b`/`(\.js)?` in the import pattern work. Live-validated with real numbers: `ShopConfigurationEngine`→10 importers, `UltimateSpeedFeedEngine`→12.

**Design:** pure core (`isRelevantFile` / `shouldThrottle` / `findImporters({runRg})` / `assembleAdvisory` / `evaluate`) with injected runner+clock+cooldown → 21/21 node:test, no real spawn in tests. Relevance-gated (src non-test `.ts`, skips `index`/`types`/`constants` barrels) + per-file cooldown sidecar (default 10m, `H:/prism/state/edit-consumer-advisory-cooldown.json`) + min-importers gate (default 3) so it fires on a small slice of edits. Knobs `PRISM_EDIT_CONSUMER_ADVISORY_{DISABLE,COOLDOWN_MS,MIN_IMPORTERS,TOPN}`. Fail-open everywhere. General fleet asset → serves all galaxies (rule B-2).

**Stub-hunter finding (the gap this fills) — bravo's core duty, R12/R9:**
- `.claude/hooks/dep-graph-impact.mjs` is a **silent no-op**: it reads `mcp-server/data/state/dependency-graph.json`, which **DOES NOT EXIST** on this host (verified), so it returns `undefined` on every edit and never fires. It also BLOCKS (`decision:block`) rather than advises, and is PreTool.
- `.claude/hooks/pre-edit-impact-analyzer.mjs` is **DISABLED** (token-redux short-circuit, line 5) AND its "impact" was a fabricated heuristic (`importedByCount = isEngine ? 3 : 1`) — never a real consumer lookup.
- `signature-drift-detector.mjs` keys on content-hash drift via a pre-built `ENGINE_USAGE_INDEX.json` (same dead-index risk); different axis.
The new hook computes importers at edit-time, so it can never silently no-op from a missing index — the lesson is: **a hook whose data source is a pre-built file that may be absent is a latent silent-no-op** (prefer compute-at-call-time for advisory surfaces).

Closes awareness deliverable #2 at **5-of-5**. Ledger: `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` row 6. Wiki: `knowledge/wiki/architecture/edit-consumer-advisory.md`. See [[feedback_bravo_free_reign_backend_incl_india]] · [[feedback_enhancements_auto_apply_all_galaxies]].
