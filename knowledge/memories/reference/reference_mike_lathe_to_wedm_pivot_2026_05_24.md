---
name: mike-lathe-to-wedm-pivot-2026-05-24
description: "2026-05-24 mike PIVOT — operator handed all lathe work to whiskey; mike pivots to wire EDM. Lathe hexalogy (6 units, 121/121 tests) shipped on slot/mike; whiskey inherits as the active lathe-domain owner. Mike's WEDM kickoff ships the first unit — empirical ground-truth extractor for 3 real JM Die Mitsubishi W31MV-2 .NC programs (20/20 tests). REFUSED build-more posture (103 existing WEDM engines per WEDM_DIGEST) — train-with-existing first."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.212Z
aliases: reference_mike_lathe_to_wedm_pivot_2026_05_24
---


# Mike → Whiskey lathe handoff + WEDM pivot — 2026-05-24

## Operator pivot directive

User: *"pivot and prioritize wireedm now instead of lathe, whiskey is taking all lathe work. assess all work done for lathe and lathe wizard. apply the same process to wire edm. train the system utilizing docustra prints, existing cnc programs and our abundant amount of wire edm engines and algorithms. assess if we need to build more while we train. final goal is end to end test of print insertion and highly accurate, efficient and optimal cnc programs relative to the jm die fleet. wire and synergize all finding and builds to PSN and Prism App features"*

## Lathe close-out — what whiskey inherits

**Mike shipped a 6-unit hexalogy on `slot/mike` worktree (121/121 vitest PASS).** Every unit is committed and PSN-synergized (memo + wiki + RECENT-SHIPMENTS). Whiskey now owns continuation; mike is done with lathe.

| # | Unit | Tests | Surface |
|---|------|------:|---------|
| 1 | U-MIKE-LATHE-POST-AUDIT | 13/13 | 7-machine `.cps` post tier classification (4 plain, 2 partial, 1 full) |
| 2 | U-MIKE-[[reference_fusion_tooling_catalog_2026_05_23|FUSION-TOOLING-CATALOG]] | 16/16 | `.hsmlib` extractor + 712-tool / 329-preset speed/feed backbone |
| 3 | U-[[reference_mike_osp_profile_engine_2026_05_23|MIKE-OSP-PROFILE-ENGINE]] | 32/32 | india + echo patterns → Kienzle/Taylor/stickout gates + Ω/S(x) safety + consensus |
| 4 | U-[[reference_mike_lathe_capability_engine_2026_05_24|MIKE-LATHE-CAPABILITY-ENGINE]] | 18/18 | 10-axis breadth × 7 lathes + 3-tier upgrade ceiling |
| 5 | U-[[reference_mike_lathe_deep_capability_2026_05_24|MIKE-LATHE-DEEP-CAPABILITY]]-ENGINE | 22/22 | physics-derived envelopes + threading + turret + cycle + macro |
| 6 | U-MIKE-LATHE-GROUND-TRUTH-EXTRACT | 30/30 | 4 FULL-PROGRAM-* originals (ADDISON/AFI/CSM/OPTIMAS) parsed |

**All work consumable by echo (the .cps post-edit owner) + whiskey (new lathe-domain lead) via:**
- `mcp-server/src/data/jm-die-lathe-capabilities.ts` — sidecar (does NOT mutate `jm-die-profile.ts`)
- `mcp-server/src/engines/JMDieLatheCapabilityEngine.ts` — query API
- `mcp-server/src/engines/JMDieLatheDeepCapabilityEngine.ts` — physics envelopes
- `mcp-server/src/engines/OkumaLatheOSPProfileEngine.ts` — Kienzle/Taylor/safety gates
- `state/shared/JM-LATHE-POST-AUDIT-2026-05-23.json`
- `state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json`
- `state/shared/JM-LATHE-PROGRAM-GROUND-TRUTH-2026-05-24.json`

**Open follow-ups whiskey can pick up (none blocking):**
1. Wire OkumaLatheOSPProfileEngine to `prism_calc` dispatcher (no consumer yet)
2. Surface JMDieLatheDeepCapabilityEngine.rankFleetByMRR via `prism_orchestrate:lathe_recommend_machine`
3. Generate the 28 `.nc` re-posts for each upgrade-candidate (echo's lane) using the 4 ground-truth originals as the spec

## WEDM pivot — assessment + first ship

### Existing substrate (DEDUP CHECK before any new build)

`WEDM_DIGEST.md` confirms: **103 WEDM engines + 8 playbooks + 42 state files already built** by charlie + prior chats. Pre-write graph hits also surfaced:
- `wedm-generate-complete-program`
- `ai-wedm-print-to-program`
- `wedm-generate-optimized-program`
- `WEDMBatchProgramAnalyzerEngine` (comprehensive program analysis already exists)
- `WEDMCalibrationReportEngine` (compares shop programs to published benchmarks)
- `WEDMPrintToProgramEngine` (the user-named end goal already has an engine)
- `WEDMCompleteOrchestrationEngine` (30-stage Wire EDM Program Generation Pipeline)

**Posture: train-with-existing, refuse build-more until corpus calibration done.** The user explicitly said *"assess if we need to build more while we train"* — the answer for engines is **NO MORE ENGINES NEEDED FIRST**. The gap is data, not code.

### JM Die WEDM corpus (real)

Only **3 real .NC programs** at `H:/PRISM/JM DIE/WIRE EDM/`. The ATF subfolder's 17 `.MIN` files are misfiled lathe programs (verified by reading `2766022-4P2.MIN` — contains `T010101`, `G85 NTURN`, `NAT01..NAT11` Okuma lathe codes, not Mitsubishi wire EDM). 49 `.mcx-8` Mastercam source files at ATF are project binaries, not posted G-code.

Target machine: **WEDM-01 Mitsubishi FA10S** with **OSP-W31MV-2** controller (single-machine fleet — no 7-way re-post needed, unlike lathe).

### Shipped (slot/mike) — U-MIKE-WEDM-GROUND-TRUTH-EXTRACT

- `scripts/extract-wedm-program-ground-truth.mjs` (13 pure-fn exports)
- `scripts/extract-wedm-program-ground-truth.test.mjs` (**20/20 vitest PASS**)
- `state/shared/JM-WEDM-PROGRAM-GROUND-TRUTH-2026-05-24.json` (live extraction)

### Live findings

| Program | Date | Passes | E-codes | Offset comp | Taper | Motion mix |
|---------|------|-------:|--------:|-------------|:-----:|------------|
| **ITW SHAKEPROOF 500-30540-24000-04** | 03/07/22 | 4 | 8 (E1221..E1224) | G41+G42+G40 | ✗ | 39 G1 + 20 G2 + 8 G3 (arc-heavy) |
| **NOZE TEST** | 05/24/22 | 5 | 4 (E2821..E2824) | none | **✓ 61 UV moves** | 73 G1 (pure linear taper) |
| Wire Program - 5 inch square | — | 0 | 0 | none | ✗ | 1 G0 + 1 G1 (demo) |

### Key findings for charlie

1. **Two distinct E-code families** in production: E1221-E1224 (ITW, no taper) vs E2821-E2824 (NOZE, full taper). These are Mitsubishi spark-table rows. Calibrate per-customer via `WEDMCalibrationReportEngine`.
2. **Pass count discipline:** 4-5 passes (rough + trim + finish + skim + super-skim). Both real programs use multi-pass — no operator skipping for speed. Baseline for `WEDMMultiPassStrategyEngine`.
3. **Taper is part-driven, not machine-driven:** NOZE is a tapered die feature (61 UV moves out of 73 G1 lines). Check `WEDMHeadClearanceEngine` + `WEDMFixtureInterferenceEngine` against those 61 moves.
4. **Offset compensation style varies:** ITW uses explicit G41/G42/G40; NOZE uses pre-compensated paths. `WEDMPostProcessGCodeEngine` must preserve original style on re-post.
5. **Single-machine fleet** — pattern from lathe (7-way re-post) does NOT apply. Each program targets WEDM-01 directly.

### Mike's WEDM trilogy plan

1. **THIS UNIT (shipped)** — empirical ground-truth corpus extractor
2. **NEXT** — gap audit: which of the 103 engines lack calibration data from the 3 real programs; which are duplicates per the AGI clusters (`WEDMHierarchicalPlannerEngine`, `WEDMNeuralFormulaFusionEngine`, etc); which are unwired
3. **NEXT-NEXT** — print-to-program E2E test through `WEDMPrintToProgramEngine` + `WEDMCompleteOrchestrationEngine` using one of the 3 ground-truth programs as the verifier

### Docustra prints

Per CLAUDE.md, JM Die has 24,545 archive files including 100+ customer folders. Wire-EDM-specific prints / docustra files are at `H:/PRISM/JM DIE/WIRE EDM/<customer>/` — but those subfolders mostly contain `.mcx-8` Mastercam source + misfiled lathe programs. The PDF/print corpus for wire EDM specifically lives elsewhere — the gap-audit unit (#2) will inventory.

### PRISM App + PSN synergy

- **PSN leg #2 (PRISM OS):** `prism_operating_system` already has wire-EDM workspace actions per CLAUDE.md §PRISM OS
- **PSN leg #3 (Wiki):** ~62 entries match `[[wedm-*]]` in the wiki — extensive prior documentation
- **PSN leg #6 (System Viz):** existing WEDM nodes are L10 (deep leaf) — new ground-truth JSON will surface as L8 (data-layer state)
- **PSN leg #7-8 (Engines + Algorithms):** 103 engines + ~25 WEDM algorithms (per WEDM_DIGEST). Charlie's lane, mike doesn't touch.
- **PRISM App features:** `WEDMCalculatorAIEngine — AI-Powered Wire EDM Calculator for PRISM App` already exists — this engine consumes the ground-truth JSON when surfacing pre-validated E-code recommendations to the operator UI.

## Cross-refs

- Lathe hexalogy (whiskey inherits): [[reference_jm_lathe_post_audit_2026_05_23]] · [[reference_fusion_tooling_catalog_2026_05_23]] · [[reference_mike_osp_profile_engine_2026_05_23]] · [[reference_mike_lathe_capability_engine_2026_05_24]] · [[reference_mike_lathe_deep_capability_2026_05_24]] · [[reference_mike_lathe_ground_truth_2026_05_24]]
- Slot soul: mike = misc-catcher; WEDM is charlie's domain but user override authorizes mike's WEDM ground-truth + gap audit work (extractor-only, no engine duplication)
- Substrate refs: `WEDM_DIGEST.md` (103 engines), `wedm-constants.ts` (physics), `jm-die-profile.ts` (WEDM-01 spec)
