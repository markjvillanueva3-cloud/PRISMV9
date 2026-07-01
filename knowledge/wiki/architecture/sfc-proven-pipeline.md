---
title: SFC Proven Speed/Feed Pipeline (JM-Die-grounded)
type: architecture
domain: speed-feed
slot: oscar
created: 2026-06-22
tags: [sfc, proven-speed-feed, jm-die, convergence, persistence]
related:
  - "[[reference_oscar_sfc_proven_activated_2026_06_22]]"
  - "[[reference_oscar_sfc_proven_pipeline_poc_2026_06_21]]"
  - "[[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]]"
  - "[[reference_oscar_sfc_frontend_wiring_map_2026_06_22]]"
---

# SFC Proven Speed/Feed Pipeline

Activated 2026-06-22 (slot:oscar, commits `698525d504` → `ded461e4f3`). Grounds the
Speed/Feed Calculator's proven-program blend in REAL JM Die cutting data, closing the
"proven store empty in every process" gap that made the orchestrator's proven-blend
(`SpeedFeedOrchestratorEngine.ts:2196` → `getProvenParams`) dead in practice.

## Components

| Piece | Path | Role |
|---|---|---|
| Aggregator engine | `mcp-server/src/engines/ProvenSpeedFeedAggregatorEngine.ts` | `aggregateLatheData`/`aggregateMillData` (pure) + **`serialize`/`hydrate` (pure)** + **`loadFromStore`/`persistToStore` (fail-soft I/O)** + sync lazy **`ensureHydrated`** guard on the 3 read methods. |
| Versioned store | `mcp-server/data/state/proven-speed-feed-store.json` | `schemaVersion 1.0.0`; serialized `provenParams` map (small — hundreds of `material:op:machine` keys). Committed seed. |
| Corpus harness | `mcp-server/scripts/extract-jm-proven-speedfeed.ts` | Resumable miner. `--lane lathe\|mill\|both`. Lathe: walk `.MIN` → `okumaOSPParserEngine` → `aggregateLatheData` (durable cursor + raw JSONL, re-runs skip done files). Mill: `jmDieProgramInventoryEngine.scan` → `findByType("mill")` → `millPatternMinerEngine.mineJMDiePrograms` → `aggregateMillData`. |
| Mill catalog seed | `mcp-server/src/engines/lib/jmdie-mill-proven-samples.ts` | Folds the curated `jmdie-proven-mill-programs.ts` (FONTANA/SFS die-steel HSM) into the store — the corpus mill yield is thin (Mastercam-`.mcx`-dominated). |

## Load-at-init (the wiring)

The engine hydrates the persisted store on the first read (`getProvenParams` etc.) via a
sync `ensureHydrated()` guard — strictly additive (absent/corrupt/schema-mismatch store
leaves the map empty, never throws). The orchestrator already calls `getProvenParams`
synchronously via `require()`, so the proven-blend goes live **on the next MCP server
rebuild + restart** (it `require()`s the compiled bundle). Knobs: `PRISM_PROVEN_SF_STORE`
(path), `PRISM_PROVEN_SF_NO_HYDRATE=1` (disable). Dispatcher: `prism_calc` already exposes
`proven_speed_feed_{aggregate_lathe,aggregate_mill,query,export}` — `query`/`export` now
return real persisted data after rebuild.

## Validation (live numbers)

- **Lathe:** full `CNC LATHE` corpus = **16,558 `.MIN` programs** (100% mined, 0 parse
  errors) → 93,960 S/F rows. Headline: tool_steel OD-finishing **CSS 450 SFM (~137 m/min),
  n=459, conf 0.82** = published-aligned.
- **Mill:** 6,171 programs, 6,125 skipped (`.mcx` binaries + non-G-code controllers) → 52
  corpus samples + 7 curated catalog samples.
- **Combined store: 94,019 samples → 63 proven param sets (17 high-confidence).** 15/15 tests.

## Why it matters — caveat #2 resolved + convergence direction

The proven data settles the SFC convergence reconciliation: JM Die's **actual** cutting
speeds are published-aligned (lathe 137 m/min, mill HSM 180–249), while the production
web-UI engine (`SpeedFeedOrchestratorEngine`) is ~**-63% over-derated with NO shop-data
grounding** (the proven store it claimed to blend was empty). → Convergence direction
confirmed: converge onto `UltimateSpeedFeedEngine`. Per-case decision support:
`state/shared/SFC-CONVERGENCE-DIFF.md` (milling = clean win incl. 2 over-speed fixes;
turning-rough runs hotter = correct Taylor physics, a display-review item). `U-SFC-CONVERGE-P2`
remains operator-gated (outward-facing — changes real-shop cutting speeds shown in the UI).

## Stale-finding corrections (R12 — read the body, not the title)

This activation corrected several stale memories/docs:
1. **Mill proven path "broken"** — already FIXED (`f10b3aec2a` require→ESM + `09d605bac1`
   `.mcx`-skip); the broken-path memory was stale.
2. **JM corpus "24,545"/"34,993 .MIN"** — `CNC LATHE` is exactly **16,558 `.MIN`**.
3. **Convergence diff "4 broken turning cases"** — already fixed by `679a27226`; regenerated
   evidence shows 0 broken + 2 milling over-speed fixes + 4 turning-rough review items.
4. **Frontend "deprecate the orphan `SpeedFeedPage`"** — backwards: the orphan is the
   RICHEST page (full statistical-uncertainty UI: CI95/weibull/sobol via `sf_orchestrate`).
   See [[reference_oscar_sfc_frontend_wiring_map_2026_06_22]].
5. **Self-correction (R12) — the focused page does NOT publish "blind".** An earlier claim
   (this wiki + the wiring-map memory) said `SfcCalculatorPage` violates oscar-soul by
   publishing speed/feed with no uncertainty. **FALSE** — verified by reading the delegated
   component: `ResultsDisplay.tsx:62-125` already renders the S(x) **safety block**
   (score + status + factors), sourced from `result.safety` which the backend populates
   (`routes/sfc.ts:28` returns `{ result, safety: result?.safety }`; the `useApiCall` hook
   returns `res.result` which carries `.safety`). The focused page DOES surface a
   safety/accuracy signal. The real (gated) gap is only the *richer statistical* uncertainty
   (CI95/confidence/weibull) that `sf_orchestrate` produces but `prism_product sfc_calculate`
   (the focused page's engine) does not — closing that needs the D2 canonical-engine decision,
   not a UI add.

## Open / next

- **`U-SFC-CONVERGE-P2`** (operator-gated): make `SpeedFeedOrchestratorEngine.compute()`
  delegate to `UltimateSpeedFeedEngine` (clone the NineAxisOrchestrator delegate-then-layer
  pattern). Major refactor (output-shape mapping `UltimateSpeedFeedResult → OrchestratorResult`).
- **Frontend** — the S(x) safety block already renders (`ResultsDisplay.tsx`). The remaining
  gap is the *richer statistical* uncertainty (CI95/confidence/weibull): the focused page's
  engine (`prism_product sfc_calculate`) doesn't produce it; only `sf_orchestrate` does. So
  this is the D2 canonical-engine decision (link the orphan `/speed-feed`, or point the
  focused page at `sf_orchestrate`), NOT a blind UI add. Any UI work needs a visual-verify
  session per `web/CLAUDE.md`.
- **Re-mine cron** + richer mill coverage (Mastercam `.mcx` extractor).
