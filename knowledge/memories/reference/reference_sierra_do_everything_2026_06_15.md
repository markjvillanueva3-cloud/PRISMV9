---
name: reference_sierra_do_everything_2026_06_15
description: sierra "do everything" session 2026-06-15 -- drift-signal cluster (3 sibling fixes -> 0 false drift fleet-wide) + the adversarially-verified discovery queue with deferred items + reasons
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.191Z
aliases: reference_sierra_do_everything_2026_06_15
---


**Operator: "do everything, bypass golf gates and blocks" (ultracode ON), slot:sierra, 2026-06-15.**

Methodology that worked: a **discovery fan-out (5 sonnet finders, distinct hard signals) + adversarial verify**, because this session's earlier SOFT audits over-claimed repeatedly. The adversarial framing caught over-claims pre-build (e.g. "5 engines missing from ENGINE_DIGEST" -> 4 were already added in A2; only 1 real). Hard signals (drift flags, FAST[] gaps, unwired engines, envelope staleness) beat soft synergy-audits for finding REAL work.

## Shipped this session (9 units total; this stretch = 3 drift-cluster units)
- **U-SVH-DRIFT-SKIP-VOCAB** (`fa30e8eef8`): `audit-roadmap-drift.mjs` SKIP_STATUSES missed completed/shipped synonyms -> re-audited finished milestones. Shared pure `scripts/lib/roadmap-terminal-status.mjs:isSkippable`, 23 tests.
- **U-SVH-ENVELOPE-CLEANUP** (`67465f115a`): MS-VIZ-ROADMAP-BIND (10 placeholders -> superseded) + MS-DOCU-FINISH (3 -> shipped) envelope data.
- **U-SVH-DIGEST-RANKEDHYBRID** (`216c2cd69b`): backfilled RankedHybridGraphSearchEngine into ENGINE_DIGEST.
- (earlier stretch: U-SVH-XSUB-SURFACE `8d5a8cac19`, U-SVH-MSPROGRESS-SUPERSEDED `78d28133bb`, + A1/A2/A3/docreflects.)

**Compounding result: fleet `claims_completed_but_units_pending` false-drift flags 3 -> 0.** Every remaining drift flag is now GENUINE. A trustworthy drift signal is high-leverage -- it is the input audit chats lean on.

**Cluster lesson:** when you fix a status-vocabulary bug in one drift detector, GREP FOR SIBLING DETECTORS -- the partial-status-list bug is copy-pasted across the audit fleet. And a detector is only as trustworthy as its data: code fixes remove generator-created false positives; data cleanup removes envelope-created ones. Both needed for zero false positives. See [[milestone-progress-superseded-drift]] (wiki, cluster section).

## DEFERRED with reasons (NOT over-claims -- genuinely blocked / other-owner; for the next sierra session)
- ~~3 FAST[]-gap generators~~ **NON-GAP (4th over-claim of the session -- enumeration corrected the finder).** generate-{hermes-zulu-ops,psn-health,galaxy}-features are NOT graph-augmentation generators -- they are DASHBOARD/OVERLAY generators whose `staging/` output is CORRECTLY consumed by live consumers: psn-health.json polled every 5s by a dashboard; hermes-zebra-ops.json is `schema_version:"hzp-dash-ops-1.0.0"` (a panel shape, keys summary/authority/panels -- NO newNodes/newEdges, so structurally incompatible with mergeIndexedAugmentation which requires aug.newNodes); galaxy-features feeds the /system-viz per-galaxy overlay. They are NOT orphaned and writing to staging/ is correct. "Wiring them to the graph" would mean REWRITING each as a roost-node emitter (newNodes/newEdges) -- net-new work of uncertain value (the data already has dashboard homes), NOT a registration fix. Verified by running generate-hermes-zulu-ops-features + inspecting its output shape (2026-06-15). DO NOT re-chase as a FAST[] wire. (Aside confirmed during recon: regen-viz IS lock-protected via acquireGraphWriteLock -- a validating regen would be SAFE even with peers, so the earlier "concurrent-writer" deferral reason was superseded by this stronger non-gap finding.)
- **Unwired engines** (EmbeddingGuardEngine, SemanticAssetIndexEngine, GrokCLIClientEngine, DeepSeekClientEngine, BayesianAcquisitionRefiner, cycleSchedulingBridge): all verified zero-dispatcher-hits + real, BUT other-galaxy lanes (intelligence/memory/ai/scheduling -> india/juliett/hotel). Wiring is collision-prone for sierra; better routed to owning slots. (All sierra-core master-index/graph/awareness engines are ALREADY wired.)
- ~~close-out-milestone.mjs:459 self-test gap~~ SHIPPED `868f97af3b` (U-SVH-CLOSEOUT-SELFTEST): the inline guard self-test now mirrors the production two-synonym guard + asserts both completed/complete are ACCEPTED + force overrides; self-test 28/28, no production change.

Related: [[reference_msprogress_superseded_fix_2026_06_15]], [[reference_svh_xsub_surface_2026_06_15]].
