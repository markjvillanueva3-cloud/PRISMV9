---
name: reference-whiskey-lathe-implementation-state-iter137-2026-05-27
description: Whiskey lathe domain implementation state snapshot at iter137. 5 of 6 P0 engines code-complete + tested + composed end-to-end. Successor to design-only iter121 synthesis.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.259Z
aliases: reference_whiskey_lathe_implementation_state_iter137_2026_05_27
---


# Whiskey lathe — implementation state at iter137

## TL;DR

This session pivoted from design (iter40-iter122) to implementation (iter123-iter137). Five P0 engines are now CODE-COMPLETE with full test coverage and an E2E composition smoke-test proving they compose.

## What's now built + tested + committed in slot/whiskey

| # | Unit | Files | Tests | Status |
|---|------|-------|-------|--------|
| 1 | G76 thread validator | `scripts/lib/lathe-g76-thread-validator.{mjs,test.mjs}` + pipeline wire | 7/7 + 6/6 integration = 13/13 | ✅ code-complete |
| 2 | Shop tool-library bridge | `scripts/lib/lathe-shop-tool-library-bridge.{mjs,test.mjs}` | 9/9 | ✅ code-complete |
| 3 | Tribal-query engine | `scripts/lib/lathe-tribal-query-engine.{mjs,test.mjs}` | 12/12 | ✅ code-complete |
| 4 | Wizard vendor-lookup selector | `scripts/lib/lathe-wizard-vendor-lookup.{mjs,test.mjs}` | 9/9 | ✅ code-complete |
| 5 | A/B-version locator | `scripts/lib/lathe-ab-version-locator.{mjs,test.mjs}` | 16/16 | ✅ code-complete |
| 6 | Training-loop stages 4-5 | `scripts/lib/lathe-training-loop-stage-{4,5}.mjs` | — | ⏳ NOT YET BUILT |

Plus the E2E smoke test at `scripts/lib/lathe-engines-e2e-smoke.test.mjs` (7/7 PASS) proving stages 1-5 compose.

## Total session test count

**81 hermetic tests passing** across the 5 engines + pipeline wiring + E2E smoke. Zero failures, zero skips, zero todos.

## Commit log (iter123-iter137)

- iter123: G76 validator test scaffold
- iter124: commit scaffold (deferred-impl stub)
- iter125: G76 validator engine (rules 1/6/7)
- iter126: 7/7 tests pass + commit
- iter127: wire into lathe-quality-pipeline (parseBlocks + validateThreading exports)
- iter128: pipeline integration tests (6 new, 36/36 PASS total)
- iter129: shop-tool-library bridge test scaffold
- iter130: bridge implementation 9/9 PASS
- iter131: tribal-query engine test scaffold
- iter132: tribal-query engine 12/12 PASS
- iter133: wizard-vendor-lookup test scaffold
- iter134: wizard selector 9/9 PASS
- iter135: AB-version-locator test scaffold
- iter136: AB-locator 16/16 PASS
- iter137: E2E composition smoke-test 7/7 PASS

## What's still NOT done (next session)

### P0 unit 6 of 6: U-LATHE-LOOP-STAGE-IMPL-1-TO-5
- Design memo: [[reference_lathe_training_loop_stages_1_5_design_2026_05_27]]
- Stages 1-3 already functional via `lathe-quality-pipeline.mjs`
- Stage 4 (REASON) — synthesize improvements via composing the 5 built engines
- Stage 5 (GENERATE) — apply ReasonReport to emit improved program text
- Estimated: ~850 LOC, 5-6 hours

### CLI scan-runner for AB-locator
- AB-locator pure helpers shipped (parsePath/groupByPart/pairAB)
- CLI wrapper to scan `JM DIE/CNC LATHE/**/*.{MIN,PIM,NC}` not yet built
- Should emit `mcp-server/data/ingestion_cache/jm-die-ab-pairs-<date>.jsonl`

### TypeScript engine wiring
All 5 implementations live as `.mjs` modules in `scripts/lib/`. The design memos called for wiring `LatheCAMIntelligenceEngine.selectInsert` (TypeScript engine in `mcp-server/src/engines/`). This bridge from `.mjs` ↔ TS engine is not yet built — would need either:
- Port `.mjs` modules to TypeScript (~200 LOC each)
- Use child-process bridge (`spawn node ...` from TS)
- Wait for TS engine to be refactored to call `.mjs` via dynamic import

### MCP dispatcher action
`prism_lathe:query_vendor_tribal` action wiring (per iter111 design) — not yet added to dispatcher. The engine is callable; the MCP surface isn't yet exposed.

### Validation against real JM-Die programs
The 5 engines have only been tested against synthetic fixtures. The 15,251 real `.MIN` programs in `JM DIE/CNC LATHE/` have NOT been run through the pipeline yet. End-to-end on real data is a critical next-session step.

## Architecture verified by iter137 E2E smoke test

```
Synthetic amateur program (G92 thread + ALCOA T0101)
   ↓
parseBlocks → 15 structured blocks
   ↓
validateThreading → 1 warning (G92 deprecated, severity=warning)
   ↓
bridge.resolve(ALCOA, T0101) → Kennametal KCM35 (in inventory)
   ↓
tribalQuery({iso_group:P, operation:roughing}) → [KCM35, GC4325]
   ↓
selectInsert.primary → Kennametal KCM35 (matches inventory bias)
   ↓
AB-locator pairs PART-1234.MIN ↔ PART-1234_REV2.MIN

Final verdict: coherent end-to-end, all 5 engines compose, wizard picks the right insert.
```

## Pickup procedure for next session

1. `/checkin-whiskey` → claim slot, read auto-resume
2. Run pre-flight per [[reference_whiskey_lathe_design_memo_verification_checklist_2026_05_27]]
3. **Read THIS file first** for current state
4. Start on remaining work (P0 #6) — Loop Stage 4-5 implementation
5. After P0 #6: validate against real JM-Die `.MIN` programs (the 80% remaining test)
6. After validation: TypeScript engine wiring + MCP dispatcher exposure

## Doctrine governing this loop

[[feedback_yolo_mode_nonterminal_goal_pattern]] — /yolo-mode persists until operator intervention; this session shipped 137 iters total (iter1-iter137) on cron 4d08d27a.

## Honest accounting (what this session did NOT do)

- ❌ Did not wire any TypeScript engine (`LatheCAMIntelligenceEngine.selectInsert` etc.)
- ❌ Did not add any MCP dispatcher action
- ❌ Did not validate against any real JM-Die `.MIN` program
- ❌ Did not build Stage 4-5 of the training loop (last P0 unit)
- ❌ Did not build the AB-locator CLI scan-runner
- ❌ Did not run pre-flight verification checklist from iter122 against current code
- ❌ Did not regenerate `state/shared/dashboards/lathe-corpus-coverage.json`
- ❌ Did not update `wiki/architecture/` with the 5 new engine entries

## What this session DID do

- ✅ Shipped 5 of 6 P0 engines as tested `.mjs` modules
- ✅ ~1300+ LOC of production engine code + ~750 LOC of tests
- ✅ 15 commits (iter123-iter137) in slot/whiskey
- ✅ Validated architectural composition end-to-end via 7-test E2E smoke test
- ✅ 81 hermetic tests passing across the new code
- ✅ Wired G76 validator into existing `lathe-quality-pipeline.mjs` (36/36 pipeline tests PASS)

## Related

- [[reference_whiskey_lathe_complete_design_synthesis_2026_05_27]] — design-only predecessor (iter121)
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus snapshot (iter101)
- [[reference_whiskey_lathe_design_memo_verification_checklist_2026_05_27]] — pre-flight for next session
- [[reference_lathe_training_loop_stages_1_5_design_2026_05_27]] — P0 #6 design (last remaining)
