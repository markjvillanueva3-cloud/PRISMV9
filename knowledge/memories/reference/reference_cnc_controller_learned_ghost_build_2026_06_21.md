---
name: reference_cnc_controller_learned_ghost_build_2026_06_21
description: "CNCControllerDeepLearningEngine learned-pattern consumer GHOST build shipped (U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4, slot:india 2026-06-21) -- engine ingest+inference built, dispatcher stub de-stubbed, ledger schemaVersion bumped."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.519Z
aliases: reference_cnc_controller_learned_ghost_build_2026_06_21
---


**Shipped 2026-06-21 (slot:india), commit `427ec9c69a` (4 files, +897).** Completed the CNCControllerDeepLearning learned-pattern consumer -- a true GHOST build: the dispatcher actions + Zod schemas (`prism_ai:controller_ingest_learned` / `controller_recommend_macro`, `aiReasoningActionSchemas.ts:152-153/1713`) and a 34-test TDD-ahead spec (`CNCControllerDeepLearningEngine.learned.test.ts`, which was UNTRACKED on disk) all existed from Steps 1-2, but the engine consumer (Steps 3-4) was never built -> 30/34 RED.

**What was built (engine `CNCControllerDeepLearningEngine.ts`):**
- `ingestLearnedPatterns(ledgerPath)` -- loads+REPLACES the learned corpus; fail-loud on every bad-input class (each error message matches the spec regex); **parse-into-locals-then-commit** so a throw never mutates prior good state; per-row drift tolerated + counted in `{unknownController, malformedRow}`.
- `getLearnedPatternStats()` -- snapshot (loaded:false before ingest).
- learned-aware `recommendMacro` (built-in MACRO_PATTERNS precedence -> learned synthesis fallback, non-stub template referencing real corpus tool-slot/op/V-vars/macro-labels; null on empty/unmatched op or no-corpus controller) + `generateMacro` okuma branch (seeds learned V-vars when loaded, else generic VC1/VC2 back-compat).
- SECURITY: controller family filter = `new Set(Object.keys(CONTROLLER_PROFILES)).has(c)` so `__proto__`/`constructor` cannot slip the filter or pollute the prototype; no object is keyed by untrusted input.

**THE FINDING (de-stub + false comment):** the existing `controller_ingest_learned` dispatcher case (`aiReasoningDispatcher.ts:~2670`) was a STUB calling `deepReason("summarize...")` with a comment falsely asserting *"it has no file-loading API"*. That comment was the author's intent-at-the-time, NOT reality once the consumer landed -- a sibling of the "existence != complete; read the body not the title" rail. The recommend case (`{found, pattern}`) was already correct; only ingest needed the rewrite to call `ingestLearnedPatterns(<canonical path resolved cwd-based + mcp-server/ fallback>)`.

**Ledger:** `data/state/learned-cnc-controller-patterns.json` schemaVersion `1.0.0-DRAFT-no-consumer` -> `1.0.0` (data unchanged). NOTE: the `ingestion-cache-root-guard.mjs` hook false-positive-flags edits to this pre-existing canonical ledger (it pattern-matches "ingestion content in data/state/"); the file MUST stay in `data/state/` (the test's `CANONICAL_LEDGER` + engine + dispatcher all reference that path) -- do not move it.

**Verify:** learned suite 34/34 (was 4/34); 820/821 aiReasoningDispatcher tests pass (the 1 fail = pre-existing `ai_route_mill_pipeline` foxtrot-domain, REFUTED as related by both scrutiny arms); tsc clean except pre-existing `InventorCADCodeGeneratorEngine.ts:148` CAD error. Per-file 2-arm scrutiny (reviewer + code-analyzer) both PASS, 0 P0/P1.

**Lesson:** when a dispatcher case is a stub whose comment claims the engine "can't" do something, VERIFY against the engine + the TDD-ahead test before trusting it -- the test is the real contract, and a stub-with-a-rationalizing-comment is exactly the kind of GHOST a NEVER-IDLE sweep should hunt. Sibling: [[reference_india_ai_red_batch_2026_06_21]] (this was item #1 of that batch).
