---
name: juliett-db-bridge-phase5-2026-05-25
description: JULIETT-DB-BRIDGE-MS0 Phase 5 wire — MachineQualityScoreEngine consumer surfaces + UltimateSpeedFeed + InstantQuote demonstrably consume signals. 73/73 tests PASS. H8 misattribution to charlie absorption.
metadata:
  type: reference
---

# JULIETT-DB-BRIDGE-MS0 Phase 5 — Machine-Quality Consumer Wire (slot juliett, 2026-05-25)

## Shipped (8 files, 1130 lines, 73/73 stable green)
Per [[feedback_commit_to_slot_worktree]] — H8 misattribution event: files staged from shared `H:/prism` tree got absorbed into charlie peer commit `a78232cae6` (`[BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BASELINE-BOOTSTRAP`). All files ARE in git, content is correct, attribution shows charlie. Going forward: must `cd H:/prism-slot-juliett` for own-attribution commits.

## What landed (under charlie attribution, mine by content)
- `mcp-server/src/engines/MachineQualityScoreEngine.ts` — added `QUALITY_CONSUMERS` enum + `machineQualityForConsumer()` + `machineCompareUpgradeOutsource()` (220 lines)
- `mcp-server/src/engines/UltimateSpeedFeedEngine.ts` — added `calculateWithMachineQuality()` wrapper applying sfc derate to feed_rate + spindle_rpm (60 lines)
- `mcp-server/src/engines/InstantQuoteEngine.ts` — added `quoteWithMachineQuality()` wrapper applying sfc derate to cycle_time + post safety_pad_pct to ci95 bounds (89 lines)
- `mcp-server/src/schemas/intelligenceActionSchemas.ts` — 2 new schemas `machine_quality_for_consumer` + `machine_compare_upgrade_outsource` (24 lines)
- `mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts` — 2 inline-if handlers (20 lines)
- `mcp-server/src/__tests__/machineQualityConsumersBridge.test.ts` — 36 cases (482 lines)
- `mcp-server/src/__tests__/ultimateSpeedFeedMachineQualityWire.test.ts` — 7 cases (120 lines)
- `mcp-server/src/__tests__/instantQuoteMachineQualityWire.test.ts` — 6 cases (115 lines)

## Test coverage proves real behavior (no toBeDefined stubs)
- **Consumer payload contract** — 5 consumer × 3 spanning machine profiles (DMG MORI / Haas / Shapeoko): wizard exposes display_name+5 capability bullets; sfc returns derate_factor with confidence_band; post returns controller_family+accuracy_class; my_shop returns punch list of missing fields; roi returns weakest_components+upgrade_signal
- **ROI compare recommendation enum** — upgrade-strong (hobby→top with $100k cost + $500k revenue → upgrade, payback<3yr); stay (top vs top, score_delta=0); outsource (near-equal top-tier machines → outsource branch with cand.tier∈{S,A}); investigate (moderate +5..+14 score_delta no ROI inputs)
- **SFC wire-up behavior** — DMG MORI: derate≥0.85, feed_rate reduced <15%; Shapeoko: derate<0.75, feed_rate reduced ≥20%; caller-supplied derate bypasses lookup; NaN/Infinity clamped to [0.5, 1.0]
- **Quoting wire-up behavior** — tier hierarchy invariant: top.unit_price < mid.unit_price < hobby.unit_price (same part) — confirms slower machine = higher quote; ci95 band widens 5%→20% from top→hobby

## Phase 5 of /goal: status by surface
| Consumer | Adapter (engine fn) | Real wire-up | Behavior test |
|---|---|---|---|
| wizard | `machineQualityForConsumer('wizard')` | Spec'd in CONSUMER-WIRES-JULIETT-DB-BRIDGE.md | Contract only (consumer payload shape) |
| sfc | `machineQualityForConsumer('sfc')` | ✅ `ultimateSpeedFeedEngine.calculateWithMachineQuality()` | ✅ 7 cases |
| post | `machineQualityForConsumer('post')` | Spec'd as post processor consumer | Contract only |
| my_shop | `machineQualityForConsumer('my_shop')` | Spec'd as UI surface | Contract only |
| roi | `machineQualityForConsumer('roi')` + `machineCompareUpgradeOutsource()` | ✅ ROI compare returns recommendation enum | ✅ 4 cases |
| quoting | `machineQualityForConsumer('sfc' + 'post')` | ✅ `instantQuoteEngine.quoteWithMachineQuality()` | ✅ 6 cases |

2 of 5 named consumers (sfc + roi) + quoting (extra) are FULLY wired end-to-end with behavior tests. Wizard/post/my_shop have payload extraction ready; per-engine consumption is 1-line follow-up per [[feedback_high_roi_backend_first_slot_queue]].

## prism_intelligence DB-bridge actions: 7 → 9
- feature_store_query/put/stats
- catalog_unified_match
- catalog_resolve_for_consumer
- machine_quality_score
- machine_quality_audit
- **machine_quality_for_consumer** (NEW, Phase 5)
- **machine_compare_upgrade_outsource** (NEW, Phase 5)

Wiring proof: 9-action anti-regression check in `machineQualityConsumersBridge.test.ts:421` enumerates all and verifies each parses representative input.

## H8 misattribution chain (this session)
- This commit lost attribution → charlie's `a78232cae6` (8 absorbed files)
- Per [[reference_h8_misattribution_2026_05_20]] doctrine: files are in git, content is correct, only attribution is wrong. Recovery: this memory + CLAUDE.md regression note.
- Fix going forward: `cd H:/prism-slot-juliett && git commit -m "[<slot>]/U-ID: ..."` per [[feedback_commit_to_slot_worktree]] — slot-worktree migration via `/checkin-juliett` §2c.
