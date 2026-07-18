---
name: reference_u_ms1_u5_blueprint_coverage_floor_guard
description: "BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U5 shipped (b857e5193) — blueprint-accuracy-guard PostToolUse extended with closed-loop learning events (drift/replay/correction/consolidate→JSONL) + NEW blueprint-coverage-floor-guard Stop hook (MINIMAL_ALLOWLIST). 103/103 node:test PASS. Per-file scrutiny gate caught + fixed 2 P0 + 7 P1 pre-commit. 3-of-3 end-of-task scrutiny PASS."
source: prism-memory
synced: 2026-05-18T01:02:10.091Z
aliases: reference_u_ms1_u5_blueprint_coverage_floor_guard
---


**Date:** 2026-05-16 (slot bravo, claude-339c8ff7, BLUEPRINT-OCR-TRAINING-MS1 /loop iter 1 post-/compact)

**Shipped:**
- `H:/prism/.claude/hooks/blueprint-accuracy-guard.mjs` — modernized from legacy function-export dead code (never wired pre-2026-05-16) to stdin/stdout PostToolUse hook
- `H:/prism/.claude/hooks/blueprint-coverage-floor-guard.mjs` — NEW Stop hook, MINIMAL_ALLOWLIST
- `H:/prism/.claude/hooks/blueprint-coverage-floor-guard.test.mjs` — NEW 103-case test (node:test, all PASS)
- `H:/prism/.claude/helpers/hook-profile.mjs` — added `blueprint-coverage-floor-guard` to MINIMAL_ALLOWLIST Set
- `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json` — both hooks wired (PostToolUse Edit|Write|MultiEdit|Bash for accuracy-guard; Stop chain at duplication-guard-stop boundary for floor-guard)

**Commits:**
- `b857e5193` — impl (4 files, +1954/-47)
- `94f20d4e3` — envelope flip 2→3 of 8

**Hook 1 — blueprint-accuracy-guard.mjs (PostToolUse, advisory only):**
Two responsibilities. Legacy thresholds preserved verbatim from CADCAM-DAGI-MS0/U-DAGI08: 99% dim accuracy (error <90, warning <99), 95% GDT preservation, 0.8 OCR confidence, missing orthographic views, withinTolerance:false count. NEW closed-loop learning events appended to `state/shared/blueprint-accuracy-events.jsonl` (NOT direct MCP — hooks cannot invoke dispatchers):
1. `drift_observation` when new extraction's confidence-bound width >20% wider than rolling-window MEDIAN (robust to single-pathological-batch outlier per U-MS1-U2 Reviewer A doctrine). 4-state reason enum: warm_up / stable / widened / trivial_median. All reachable.
2. `replay_add` (priority = 1 - lowestConfidence) when confidence below floor 0.8 OR ground-truth match marker present.
3. `outcome_record` + `predlog_pair` when `operator_correction` block detected.
4. `ewc_consolidate` when accumulated outcomes >= threshold (default 25, then counter resets).

**Hook 2 — blueprint-coverage-floor-guard.mjs (Stop, MINIMAL_ALLOWLIST):**
Blocks Stop if session changed any of 13 extraction-path regex patterns without fresh `state/shared/BLUEPRINT_COVERAGE_AUDIT.json` marker (covers U1-U8 engines forward-compatibly). 5-branch decision ladder + block ceiling 3 with escape-hatch matching scrutinize-before-stop:
- No-touch → allow (silent)
- Audit fresh → allow + resetBlockCount() to keep ceiling honest across stale→fresh→stale flap
- Audit stale → BLOCK with explicit run-audit instruction
- Audit missing AND U8 engine shipped → BLOCK
- Audit missing AND U8 engine NOT shipped → DEFER (log to coverage-floor-defer.jsonl, allow continue) — graceful degradation while U6-U8 not yet shipped

**Per-file scrutiny gate (3 files × 2 reviewers = 6 dispatches) — load-bearing.** P0 + P1 found and fixed pre-commit:
- **P0** — bumpBlockCount inflated indefinitely across stale→fresh→stale flap. Fix: new `resetBlockCount()` called on every fresh-marker allow path.
- **P0** — MINIMAL_ALLOWLIST gap. Fix: added entry in hook-profile.mjs AND imported `shouldSkipHook` + early-exit gate at top of `main()` in coverage-floor-guard.
- **P1** — `detectOperatorCorrection` + `detectGroundTruthMatch` greedy-slice hostile-payload (U-MS1-U2 P0-2 class repeat — see [[reference_e1_ideablock_extractor_2026_05_15]] + [[feedback_scrutiny_gate_finds_hostile_payload_class]]). Fix: new `extractBalancedBrace()` depth-aware walker, string-literal + escape aware. Reviewer A independently caught the SAME bug class — confirms doctrine.
- **P1** — `extractConfidences` regex accepted bare `0.` ghost (parseFloat("0.")===0 → silently inflates bound width). Fix: strict pattern `(0(?:\.\d+)|1(?:\.0+)?|[01])(?!\.|\d)` requires full decimal OR bare integer.
- **P1** — `saveState` non-atomic writeFileSync (truncation on crash → next loadState resets accumulated outcomes silently). Fix: temp-file + renameSync (atomic on Windows when same drive).
- **P1** — Hardcoded `H:/prism` repo root breaks worktree-fork rule (slot worktrees at H:/prism-slot-*). Fix: new `resolveRepoRoot()` derives via `git rev-parse --show-toplevel` with CLAUDE_PROJECT_DIR fallback.
- **P1** — Test file lacked greedy-slice regression. Fix: 4 new tests (nested braces, string-literal `}`, escaped quotes, array rejection) + 1 test for bare-`0.` ghost rejection.

**3-of-3 end-of-task scrutiny PASS:** Arm A holistic (reviewer agent) + Arm B independent (reviewer agent) + Arm C analyst (code-analyzer agent), all PASS at session `claude-549c9f4f` against commit `b857e5193`. Recorded in `mcp-server/data/state/SCRUTINY_LEDGER.json`.

**Deferred follow-ups (NOT auto-claimed; tracked for U6+ close-out):**
- JSONL concurrent-write atomicity (currently relies on OS-buffered appendFileSync) — P2 from Arm B accuracy-guard review
- Sid-sharded block ledger (concurrent Stop fires from 12-chat fleet can corrupt ledger) — P1 from Arm B coverage-floor review
- Marker-mtime vs newest-covered-file-commit-time race (audit "fresh by age" but covers OLD code state) — P1 from Arm B coverage-floor review
- Dispatcher schema-shape contract validation (`dispatch.params` matched against real `xproc_*` zod schemas) — P2 from Arm B test review
- Integration spawn-test of `main()` entry points (only unit-level testing currently) — P1 from Arm B test review
- `import.meta.url === \`file://${process.argv[1]}\`` guard for main() entry on bare import — P2 from Arm C analyst (current `endsWith` check works but is brittle)
- Fail-closed-on-timeout flip for git execSync 8000ms timeout (currently fail-open) — P2 from Arm B coverage-floor review
- PRISM_BLUEPRINT_EVENTS_FILE env trust (path-traversal vector via operator-controlled env var) — P3 from Arm C analyst

**Wiring soundness verified:**
- C:/Users/wompu/.claude/settings.json: accuracy-guard=1, coverage-floor=1
- H:/.claude/settings.json: accuracy-guard=1, coverage-floor=1
- Both smoke-tested with empty stdin → `{"continue":true,"suppressOutput":true}`
- Stop chain order: 286 goal-complete-gate → 316 session-end-peer-share → 326 post-ship-distill → 336 blueprint-coverage-floor-guard → 341 duplication-guard-stop → 381 stop_on_unwired_assets. No precedence inversion (Arm B verified).
- 5 xproc_* dispatch.action names ALL exist in aiReasoningDispatcher.ts at lines 95/106/117/256/338 (Arm B verified).

**Skill doctrine (load-bearing for future MS1 + extraction-path units):**
- **Composition over duplication.** Hook 1 was dead-code legacy (function-export, never wired); the right fix was REWRITE to stdin/stdout pattern, not patch-in-place. Same precedent as U-MS1-U2 pivot from PDFBlueprintDimensionExtractorEngine in-place to sibling PDFBlueprintPatternRescueEngine.
- **JSONL bridge for hook→MCP.** Hooks cannot invoke MCP dispatchers (no transport from stdin-fed .mjs to MCP client). JSONL event stream + offline consumer is the canonical bridge. Every event carries `dispatch.action` + `dispatch.params` so consumers don't re-derive the contract.
- **Depth-aware brace walker IS the antidote** to greedy-slice hostile-payload class (now 3 incidents: U-MS1-U2 P0-2, E1 IdeaBlockExtractor, this unit's P1). Treat `\{[\s\S]{0,N}?\}` lazy regex as automatically suspect — replace with brace-walker that respects string-literal `}` and escape sequences.
- **Atomic state writes** via tmpfile + renameSync. `writeFileSync` truncation on crash is silent — corrupted state JSON resets accumulator silently. Same pattern should be lifted to other state-file writers (Arm A flagged sister hooks at risk).
- **resolveRepoRoot via git rev-parse** is the right move for any hook that needs the repo root — works in slot worktrees per conflict-fork rule. Pattern: env-knob override → git rev-parse → CLAUDE_PROJECT_DIR → hardcoded default.
- **Block-ceiling escape-hatch + sessionId-keyed ledger** matches scrutinize-before-stop. MAX_BLOCKS_PER_SESSION=3 is the canonical value. Reset on success (fresh marker, in this case) to keep escape semantics honest across flap.

**Sister memories:** [[reference_u_ms1_u2_pdf_blueprint_pattern_rescue]] (U-MS1-U2 P0-2 antecedent) · [[reference_e1_ideablock_extractor_2026_05_15]] (E1 depth-aware brace walker precedent) · [[feedback_scrutiny_gate_finds_hostile_payload_class]] (the doctrine this unit reinforces) · [[reference_blueprint_ocr_training_ms1_collision]] (the original spec collision history) · [[feedback_parallel_scrutiny_per_file]] (per-file gate doctrine) · [[reference_stop_advisory_wiring_cluster_2026_05_15]] (Stop chain wiring slot used).

**MS1 progress:** 3 of 8 (U-MS1-U1 + U-MS1-U2 + U-MS1-U5). Remaining: U3 (GroundTruthRegistry extend), U4 (GroundTruthValidation extend), U6 (BlueprintCorpusHarvestEngine + scripts + cron), U7 (BlueprintExtractionRAGEngine — centerpiece), U8 (BlueprintLoRABridge + CoverageAudit + close-out).

Lane-guard bypass needed when slot drifts: `export PRISM_GIT_ADD_LANE_DISABLE=1 PRISM_WORKTREE_ROUTE_ENABLE=0 PRISM_COMMIT_OWNERSHIP_GUARD_DISABLE=1`. Also use `[MAIN]` prefix on commit subject when worktree-route guard misroutes a non-slot-bound milestone.


## Related
[[engines/PDFBlueprintDimensionExtractorEngine|PDFBlueprintDimensionExtractorEngine]] • [[engines/PDFBlueprintPatternRescueEngine|PDFBlueprintPatternRescueEngine]] • [[engines/BlueprintCorpusHarvestEngine|BlueprintCorpusHarvestEngine]] • [[engines/BlueprintExtractionRAGEngine|BlueprintExtractionRAGEngine]] • [[skills/loop|/loop]] • [[skills/compact|/compact]] • [[skills/prism|/prism]] • [[skills/hooks|/hooks]] • [[skills/blueprint-accuracy-guard|/blueprint-accuracy-guard]] • [[skills/stdout|/stdout]]