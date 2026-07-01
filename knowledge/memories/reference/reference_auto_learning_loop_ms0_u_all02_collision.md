---
name: reference-auto-learning-loop-ms0-u-all02-collision
description: "AUTO-LEARNING-LOOP-MS0/U-ALL02 (NoveltyDetectionEngine) 5 files absorbed into peer commit f2c0ae42a — 4th 24h-collision pattern; do NOT re-build, files correct + tracked."
aliases: reference_auto_learning_loop_ms0_u_all02_collision
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.475Z
---


# AUTO-LEARNING-LOOP-MS0 / U-ALL02 ship — absorbed into peer commit

**Shipped:** 2026-05-13T17:25Z by slot **bravo** (`claude-68ec3497`).
**Absorbing commit:** `f2c0ae42a` titled `[MAIN] [TRAINING-LEARNING-MS0]/U-TL-U3-CLOSEOUT-V2: envelope status flip (commit 722bb7dd9 swept peer files instead)` — the peer chat's commit message acknowledges the sweep but understates the scope (5 U-ALL02 files + 2 unrelated peer files).

## Files in `f2c0ae42a`

- `mcp-server/src/engines/NoveltyDetectionEngine.ts` (784 LOC) — engine
- `mcp-server/src/__tests__/NoveltyDetectionEngine.test.ts` (995 LOC, 50 tests) — engine tests
- `mcp-server/src/__tests__/aiReasoning.noveltyDetect.test.ts` (141 LOC, 8 wiring tests) — dispatcher round-trip
- `mcp-server/src/schemas/aiReasoningActionSchemas.ts` (+21 LOC) — `novelty_detect` Zod schema + enum
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` (+26 LOC) — `case "novelty_detect"` block

## Design summary

- **Three-tier dedup**: (1) SHA-256 exact-hash short-circuit, (2) cosine ≥ 0.92, (3) Jaccard ≥ 0.50 fallback (when embedder unavailable)
- **Read-isolation**: `detect()` snapshots `state.entries.slice()` at t0 so concurrent `addVerifiedNovel` can't perturb mid-scan
- **No double-embed**: detect threads `_computedEmbedding` through `NoveltyVerdict` so `addVerifiedNovel` re-uses it (~150 ms/item saved on cron)
- **DI everywhere**: embedder, hashFn, now injectable for hermetic tests
- **AddOutcome**: returns `{added, embeddedFailures: string[], skipped: string[]}` for operator-grade observability
- **isCatalogLoaded() flag**: distinguishes "process fresh / catalog file not yet loaded" from "catalog genuinely empty" — dispatcher can surface a `catalog_not_loaded` advisory

## Spec deviation (documented in engine JSDoc)

Spec § U-ALL02 step-1 says load `state/shared/system-viz/novelty-catalog.json` (described as "currently empty"). That path is **already populated** by a different v1.0.0 PRISM-internal novel-toolpath catalog (~51KB, 207 entries, harvested for system-viz graph). To honor never-delete: auto-learn catalog goes to **`state/shared/auto-learning/source-novelty-catalog.json`** (CLI-owned default; engine is path-agnostic).

## Tests (58/58 pass, vitest)

- 50 engine tests covering: 3-tier dedup, all spec adversarial_cases (paraphrased dup, identical-content-diff-timestamp), all failure_modes (embedder down → Jaccard fallback, catalog corrupt → structured error), variability axes (0% / 50% / 100% novelty, catalog size 1 / 100), defensive guards (NaN/Infinity/__proto__ rejection), 5-known + 5-new headline assertion (precision=1, recall=1)
- 8 wiring tests covering: action enum membership, schema map presence, strict-mode rejection of unknown keys, round-trip with/without commit, descriptive error envelopes

## P1 scrutiny fixes (2-agent parallel pass)

- `bestCosine`: init `-Infinity` + `Number.isFinite` guard + return `{similarity:0}` when zero qualifying entries scanned (fixes negative-similarity misreport AND Infinity-embedding NaN propagation)
- `validateCatalog`: `Number.isFinite` (rejects ±Infinity + NaN); rejects reserved keys `__proto__` / `constructor` / `prototype` per entry
- `tokenize`: documented precondition (input must be pre-normalized lowercase); dropped redundant `/i` flag
- `addVerifiedNovel`: returns `AddOutcome {added, embeddedFailures, skipped}`; skips on guid collision in addition to hash collision; threads `_computedEmbedding` for no-double-embed
- `deepCloneState`: explicit named construction (no spread) so own-prop `__proto__` from `JSON.parse` cannot leak through
- `normalize`: entity-strip extended to numeric forms (`&#8217;`, `&#x2019;`)
- `cosine` import: `// COUPLING:` annotation flagging dependence on OllamaEmbedderEngine.cosine contract (returns 0 on zero-magnitude / length-mismatch)
- Singleton: `// WIRE-EXEMPT:` tag noting U-ALL07 final dispatcher wiring + CLI consumer
- Test fixture P1s: tokenize input swap (`b!c` → `b!c ab-cd`), `__proto__` test uses `JSON.parse` (V8 own-prop quirk), verifies_via 10-dim orthogonal subspaces (8-dim was too small — `v[i]=1` known + `v[(i+4)%8]=0.9` new collided at i=4)

## Operator follow-ups (deferred)

1. **CLI cron entry** (`scripts/novelty-detect-sweep.mjs`) + Windows installer (`.claude/helpers/install-novelty-detection-task.ps1`) — spec micro_step 3 (cron `*/30 * * * *`). Deferred until U-ALL03 lands so the cron has a real downstream consumer (the orchestrator).
2. **End-of-task 3-of-3 scrutiny gate** — engine + tests + wiring locally green (58/58); the formal codex + reviewer-A + reviewer-B gate to be run when chat-bus close-out is finalized.
3. **TS pre-existing errors** — `tsc --noEmit` reports errors in `telemetryDispatcher.ts`, `tenantDispatcher.ts`, `shopPracticeDispatcher.ts`, `MultiModelConsensusEngine.ts` and 4 `xproc_outcome_replay*` actions in the enum without schemas. NONE introduced by U-ALL02. U-ALL01 shipped with `tsc clean` — these errors landed in the 16:30Z → 17:25Z gap. Out of U-ALL02 scope; flag to project sweep.

## Unblocks

- U-ALL03 (`AutoResearchOrchestratorEngine` — depends_on U-ALL02) — next pickable in the chain
- U-ALL07 (wire 5 actions — depends_on U-ALL01..U-ALL06) — still gated by U-ALL03..U-ALL06

## Collision pattern (4th in 24h)

Same shape as [[reference_training_learning_ms0_u1_collision]] [[reference_blueprint_ocr_training_ms1_collision]] [[reference_coord_ms0_u4_collision]]: my staged files were swept into a peer chat's commit. Files are correct + tracked, commit msg understates scope. Lessons (compounding):

- `H:/prism` main tree at 6-chat saturation is hostile to small files staged for long
- The conflict-fork rule ([[feedback_conflict_fork_rule]]) is the documented mitigation; in this case worktree-add itself hung (broken `H:/prism-auto-learning-loop` tree, only top-level files materialised), forcing a fall-back to commit-from-main-tree which the peer absorbed
- Even **explicit `git add <path>`** then `git commit` can absorb peer-staged files if a concurrent peer commits between your `add` and `commit` — the index is single-process-wide

## Subsequent U-ALL chats

Read this entry before re-deriving. The next chat picking U-ALL03 should:
1. Verify `noveltyDetectionEngine` singleton imports cleanly (`import { noveltyDetectionEngine } from "../engines/NoveltyDetectionEngine.js"`)
2. Inject as a downstream consumer in `AutoResearchOrchestratorEngine` so high-novelty items feed the orchestrator's queue
3. Reuse the `MockEmbedder` pattern in tests
4. Keep an eye on commit collisions — consider forking to `H:/prism-auto-learning-loop` BEFORE writing any files (after creating it from a clean main-tree HEAD, not a partial one)
