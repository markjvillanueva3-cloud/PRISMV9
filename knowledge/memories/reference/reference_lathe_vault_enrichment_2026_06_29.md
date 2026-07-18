---
name: reference_lathe_vault_enrichment_2026_06_29
description: Lathe-domain vault enrichment -- coverage map, ingestion gaps + next sources, and cited tribal candidates synthesized from mined-but-scattered lathe signals.
type: reference
source: prism-memory
synced: 2026-06-29T16:20:11.140Z
aliases: reference_lathe_vault_enrichment_2026_06_29
---



# Lathe Domain Vault Enrichment (2026-06-29, slot:whiskey synthesizer)

SYNTHESIS ONLY. Every claim is cited to a gathered source. Anything I could not
cite to a read source is marked UNVERIFIED for the whiskey specialist to confirm.
This compounds mined-but-scattered lathe knowledge into auto-pulling form
(master-index + memory-search reachable).

---

## 1. COVERAGE MAP -- what the lathe domain solidly knows

### Physics / safety rails (engine-level, hard-enforced)
Source for all: `mcp-server/src/engines/lathe/CLAUDE.md` sections 4-6 gotchas.

- CSS (G96) MUST pair with a G50 RPM cap -- `LatheAdvancedOperationsEngine.validateCSSCap()` is a hard block. (CLAUDE.md S5 gotcha 1)
- Boring-bar deflection scales as L^3/D^4; L/D enforced <=4 steel / <=6 carbide by `BoringBarDeflectionEngine`. (CLAUDE.md S5 gotcha 2)
- Nose-radius + feed coupled: Ra ~= f^2 / (8 * Rnose). (CLAUDE.md S5 gotcha 3)
- Threading needs position-lock at entry (G92/G76); feed-mode entry is a hard-error in `LatheAdvancedOperationsEngine.validateThreadEntry()`. (CLAUDE.md S5 gotcha 4)
- Parting at depth >3x tool width traps chips; G75 peck-grooving mandatory above that ratio, enforced by `LathePartingChipClearanceEngine`. (CLAUDE.md S5 gotcha 5)
- Sub-spindle handoff must align within 0.5 deg spindle phase; `Fusion360MillTurnBridgeEngine` enforces. (CLAUDE.md S5 gotcha 6)
- Off-center milling uses Cartesian Y-axis; polar interpolation needs G7.1/G12.1. (CLAUDE.md S5 gotcha 7)
- G76 infeed angle must match insert geometry: 29 deg Acme / 30 deg metric / 60 deg UN. (CLAUDE.md S5 gotcha 8)
- Chuck jaw centrifugal grip loss ~30% at 3000 RPM on a 6 in chuck; `ChuckJawForceEngine` enforces centrifugal reduction. (CLAUDE.md S5 gotcha 9)
- Bar remnant minimum enforced by `BarFeedPitchOptimizerEngine`; insufficient bar => turret crash. (CLAUDE.md S5 gotcha 10)
- Lathe feed is ALWAYS IPR (mm/rev), never IPM -- confusing them is a 25.4x chip-load surge. (CLAUDE.md S6)
- Kienzle kc1.1 (P=1800, M=2100, K=1100, N=700, S=2800, H=3200 N/mm^2) and Taylor C,n sourced EXCLUSIVELY from `mcp-server/src/physics/constants.ts`, hook-enforced. (CLAUDE.md S4)

### Okuma OSP dialect (safety-critical) -- Source: CLAUDE.md S6-7
- 7 JM Die lathes are all Okuma OSP. CSS is the `VCSS` macro (NOT G96/G97).
- Threading: G78 (single-pass) + G176 (multi-pass), NOT G76.
- OSP G74 = peck-drill, NOT face-grooving (collision risk if assumed Fanuc).
- Sub-spindle: `VWAIT`/`VSYNCH` macros. CSS clear: `G1100`.
- All OSP translation routes through `OkumaDialectKnowledgeEngine` (41K data file, never full-read).

### Dispatcher surface (verified) -- Source: CLAUDE.md S3
- Primary `turningDispatcher.ts` (373 actions). Sub: `turningProgramDispatcher.ts` (14), `threadDispatcher.ts` (17), `threadingPipelineDispatcher.ts` (multi-pass G76, verified exists 2026-06-26).
- Pre-emit safety gate sequence (order matters): `lathe_safety_predicate_evaluate` -> part-off gate -> workholding select -> spindle torque/power -> Kienzle force -> merchant analysis.
- `lathe_spindle_*` actions do NOT exist in turningDispatcher; correct path is `prism_safety:check_spindle_torque/power`.

### Engine inventory (confirmed) -- Source: CLAUDE.md S2 + AWARENESS.md
- 60 AI engines attributed (5 reasoning, 5 neural, 49 LoRA, 1 bridge); 111 per-galaxy dispatcher actions; 194+ `Lathe*.ts` engines on disk (dedup guard mandatory before any new creation); 22 verified engine entries enumerated in CLAUDE.md S2.

### Threading infeed physics -- Source: `lathe_synthesis.md` citing `reference/reference_lathe_threading_infeed_tnr_2026_06_13`
- Radial and plunge infeeds standardized (both flanks cut); pitch capped <=16 TPI for coarse material; nose-radius/CSS limits enforced to curb heat and chatter.

### Lathe foundations wiki -- Source: `knowledge/wiki/lathe/lathe-foundations.md` (per MEMORY.md S VERIFIED foundations)
- Vc/RPM geometry, feed-per-rev f = l/n, theoretical finish h = f^2/(8r), G96/G97 + threading-needs-G97 method, lathe-feed-is-per-rev fact.
- All numeric cutting constants (kc1.1/Taylor C,n/SFM/IPR/L:D limits) deliberately remain UNVERIFIED in `_staging` -- sourced only from constants.ts, never web.

### AI / ML substrate -- Source: MEMORY.md S algo-primitives
- 5 large LoRA-class AI engines: Orchestration 77K, ActiveLearning 76K, Attention 88K, Bayesian 64K, Reasoning 38K.
- Algorithm primitives -> turning mappings: SavitzkyGolay (force smoothing), DTW (pass-signature alignment), Viterbi/BeamSearch (insert-wear state decode), GMM/KNN (regime clustering), RANSAC (diameter/taper fit).
- Galaxy reasoning bridge: `node scripts/lib/galaxy-reasoning-bridge.mjs lathe "<q>"` (dense/hybrid RAG ON by default).
- CSS / chuck-jaw SAFETY must stay on Claude -- do NOT route to Ollama. (CLAUDE.md S5 + S13)

### Cross-galaxy edges -- Source: CLAUDE.md S9 + MEMORY.md
- lathe -> quoting (charlie): `LatheAutoQuoteFromPrintEngine`.
- lathe <-> ERP (hotel): `LatheActualCostReconciliationEngine`.
- lathe <-> mill-turn: `Fusion360MillTurnBridgeEngine` / `HyperMillMillTurnBridge`.

### Corpus / wiki coverage (auto-surfaced counts) -- Source: MEMORY.md
- 98 curated memory files, 1111 wiki entries, 35 tribal tips matching this galaxy.
- 722 reference memory files match lathe domain keywords; 118 wiki index lines match lathe/turning terms.
- Key extracted wikis present: `autodesk-2014-turning.md`, `cnccookbook-lathe-programming.md`, `inventorcam-turning-millturn.md`.

---

## 2. GAPS + NEXT INGESTION TARGETS

Thin areas (each with its cited gap source), then the concrete corpus root or
online source that would close it.

| # | Gap (cited) | Next ingestion target to drain |
|---|---|---|
| G1 | Material-specific quantitative infeed/heat/chatter thresholds beyond the <=16 TPI rule (`lathe_synthesis.md` Open threads) | H: `resources/` insert-vendor turning catalogs (Sandvik CoroTurn, Kennametal, Iscar) for per-ISO infeed/Vc/feed tables; MIT OCW 2.008 Design and Manufacturing II (turning chapters); Machinery's Handbook turning/threading sections |
| G2 | Cost-optimal Vc optimizer not physics-backed; 220 vs 209 m/min target discrepancy (`_SYNTHESIS.md` open threads + recurring bugs) | Gilbert / Taylor minimum-cost speed derivation -- already canonical in `GilbertEconomicSpeedEngine` (cross-ref the recently-fixed economy-flag lesson `economy-flag-artifact-not-generation-defect`); MIT OCW 2.810 Manufacturing Processes (tool-life economics) |
| G3 | Okuma real collision geometry (turret/chuck/swing) for LTH-01..07 is placeholder; `U-W-COLLISION-GEOM` open (`_SYNTHESIS.md`) | H: `JM DIE/CNC OKUMA MULTUS/` running programs + Okuma OSP machine spec sheets (Genos L / LB / Multus B250); the verified Multus B250 sub-spindle code-set in `reference_multus_b250_subspindle_verified_codes_2026_06_28` |
| G4 | G76 threading validator misses specific defects (`MEMORY.md` Known failure modes; node_formula g76_thread_validator_design) | Haas G76 + Fanuc threading manuals (already partly WebFetched in `_staging/deep-domain-research-2026-06-09.md`); JM `JM DIE/` ACME/THREAD `.MIN` programs for ground-truth infeed/lead values |
| G5 | Aux-axis timing optimization for downtime reduction (`MEMORY.md` Known failure modes) | Individual mining transcripts under `state/shared/galaxy-transcript-mining/lathe/*.md` (action-level wiring detail) |
| G6 | ~64 lathe AI engines (DL/RL/INTEL non-LoRA) unwired; only ~33% have wikis; 51 ghost nodes (`_SYNTHESIS.md`) | `scripts/audit-unwired-engines.mjs` + BUILD_STATE NEEDS_WIRING; system-viz ghost roosts for `ghost.galaxy.lathe` |
| G7 | Standalone `lathe-gcode-lint.mjs` CLI UNCONFIRMED (only the hook is verified) (`CLAUDE.md` S12) | Confirm/build from `reference_whiskey_lathe_lint_tooling_2026_05_29` (lint architecture memory) |
| G8 | `LatheSurfaceFinishEngine` cited but existence unconfirmed (`CLAUDE.md` S12) | Duplication-guard check + ENGINE_DIGEST.md before any build |
| G9 | Tribal ingest formal schema missing (`lathe_synthesis.md` Open threads) | The Kienzle-lathe-wizard tribal ingest loop named in `lathe_synthesis.md`; formalize checkpoint/slot-map spec |
| G10 | Print-to-CNC pipeline Phases 2-5 open (Phase 1 STEP->profile->TurningInput shipped) (`_SYNTHESIS.md`) | CAD-import Python B-rep bridge; `LatheAutoQuoteFromPrintEngine` for the quote leg; JM Die `.MIN` program integration corpus |
| G11 | No canonical lathe-soul slot; S5 gotchas are alpha-authored hypotheses, not whiskey-refined; `U-GALAXY-MS1-D3` open (`MEMORY.md`) | Whiskey specialist refinement pass (operator-designated whiskey=lathe, `reference_whiskey_lathe_soul_designation_2026_05_27`) |

### TOP 3 next-ingestion targets (highest compound value)
1. `state/shared/galaxy-transcript-mining/lathe/_SYNTHESIS.md` (20 mined transcripts, gpt-oss:120b 2026-06-28) -- densest un-folded signal: pipeline decisions, shipped-unit list, bug log, per-op cycle-time attribution, cost-aware tool-life flag, EMFILE/OOM fix. Fold into CLAUDE.md/MEMORY.md.
2. H: `resources/` turning-insert vendor catalogs (Sandvik/Kennametal/Iscar) -- closes G1 quantitative material/infeed/Vc tables, the single largest physics gap.
3. H: `JM DIE/CNC OKUMA MULTUS/` running `.MIN` programs -- closes G3 (real collision geometry) and G4 (ground-truth thread infeed) with verifiable live JM data.

---

## 3. NEW CITED TRIBAL CANDIDATES

Distilled from un-synthesized mined signals. Each: tip + source-cite +
VERIFIED|UNVERIFIED. UNVERIFIED items await whiskey specialist confirmation.

1. On Okuma OSP, never emit Fanuc G74 for face-grooving -- OSP G74 is peck-DRILL; the cycle wears the wrong tool path and risks collision. Use the OSP grooving cycle instead. SOURCE: CLAUDE.md S6-7. VERIFIED.

2. On Okuma OSP, CSS is the `VCSS` macro and threading is G78 (single) / G176 (multi), NOT G96/G97/G76 -- a Fanuc-dialect thread cycle alarms or mis-cuts on an OSP control. SOURCE: CLAUDE.md S6-7. VERIFIED.

3. A lathe economy flag must judge cost on the dominant tool-CONSUMPTION op among economically-free ops (rough/face/bore), NOT the min raw Taylor life across all ops -- grading on a light surface-constrained finish pass (320 m/min) produced a false "74% uneconomical" artifact. SOURCE: `_SYNTHESIS.md` recurring bugs + cross-ref regression `economy-flag-artifact-not-generation-defect`. VERIFIED.

4. Cap rough/face/bore Vc at the Gilbert minimum-cost optimum (lower-only, never raise); rough Vc 220 m/min was already ~5% from the 209 m/min Gilbert optimum, so the generator was NOT over-aggressive -- validate the premise of a headline metric on live data before "fixing" generation. SOURCE: `_SYNTHESIS.md` open threads + `economy-flag-artifact-not-generation-defect`. VERIFIED.

5. Per-op cost attribution must use real `cycle_time_sec`, not an even-split heuristic -- but note the live A/B finding: switching to accurate attribution did NOT move the uneconomical count, so attribution alone is not the lever. SOURCE: `_SYNTHESIS.md` (per-op cycle-time attribution logic). UNVERIFIED (whiskey: confirm the A/B numbers in the synthesis).

6. `MaterialRegistry.load()` had an EMFILE/OOM concurrency failure under fleet load -- material loads must be bounded/serialized, not fanned out unbounded. SOURCE: `_SYNTHESIS.md` (EMFILE/OOM concurrency fix). UNVERIFIED (whiskey: confirm the fix landed and the bound value).

7. Boring-bar L/D over 4 (steel) or 6 (carbide) deflects as L^3/D^4 -- a small reach increase is a large finish/chatter penalty; prefer carbide or a steady rest before exceeding the limit. SOURCE: CLAUDE.md S5 gotcha 2 + `SteadyRestPlacement` engine. VERIFIED.

8. Surface finish and feed are not independently choosable: Ra ~= f^2/(8*Rnose), so halving feed quarters roughness -- tune feed against the nose radius, not in isolation. SOURCE: CLAUDE.md S5 gotcha 3 + `lathe-foundations.md` h = f^2/(8r). VERIFIED.

9. Chuck grip is RPM-dependent: ~30% centrifugal grip loss at 3000 RPM on a 6 in chuck -- a part safe at load-speed can throw at cutting-speed; derate grip force by RPM before approving the cut. SOURCE: CLAUDE.md S5 gotcha 9 (`ChuckJawForceEngine`). VERIFIED.

10. Parting deeper than 3x tool width traps chips and binds -- switch to G75 peck-grooving above that ratio; a straight plunge part-off at depth is a tool-break/spindle-stall risk. SOURCE: CLAUDE.md S5 gotcha 5 (`LathePartingChipClearanceEngine`). VERIFIED.

11. Lathe feed is per-rev (IPR / mm-rev), never per-minute (IPM) -- a value pasted from a mill program is a 25.4x chip-load surge; resolve the feed UNIT from the source before emitting. SOURCE: CLAUDE.md S6. VERIFIED.

12. G96 CSS without a G50 RPM cap is an over-speed hazard as diameter shrinks (RPM -> infinity at center) -- always pair CSS with a max-RPM clamp. SOURCE: CLAUDE.md S5 gotcha 1 (`validateCSSCap`). VERIFIED.

13. Spindle torque/power checks for the lathe live on `prism_safety:check_spindle_torque/power`, NOT on a `lathe_spindle_*` action (those do not exist) -- routing to a non-existent action silently skips the gate. SOURCE: CLAUDE.md S3 + S6. VERIFIED.

14. Keep CSS and chuck-jaw safety reasoning on Claude; do NOT offload these to Ollama -- they are safety-critical decisions, not mechanical text ops. SOURCE: CLAUDE.md S5 + S13. VERIFIED.

15. Algorithm-to-turning primitive map for lathe AI: Savitzky-Golay for force-signal smoothing, DTW for cut-pass signature alignment, Viterbi/BeamSearch for insert-wear state decoding, GMM/KNN for cutting-regime clustering, RANSAC for diameter/taper fitting. SOURCE: MEMORY.md S algo-primitives. UNVERIFIED (whiskey: confirm these mappings are wired to real engines, not just proposed).

---

## Provenance
Synthesized 2026-06-29 by slot:whiskey (lathe knowledge-synthesizer) from the
gathered digest: lathe CLAUDE.md/MEMORY.md/AWARENESS.md, `lathe_synthesis.md`,
`_SYNTHESIS.md` (galaxy-transcript-mining/lathe), and named reference memories.
No raw corpus was read into context (R5). Numeric cutting constants remain
constants.ts-sourced; nothing here introduces a web-sourced numeric constant.
