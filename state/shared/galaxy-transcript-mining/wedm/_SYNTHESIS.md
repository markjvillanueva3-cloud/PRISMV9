# wedm galaxy CROSS-SESSION SYNTHESIS (2 of 137 mineable, model gpt-oss:120b, 2026-06-09)

## What this galaxy is building  
- End‑to‑end **Payroll Liability Filing** pipeline (compute 940, generate W2, reconcile W2/941, contractor 1099 totals, remit liability) wired into `BusinessDispatcher`.  
- **Speed‑Feed Calibration & Validation** stack: tri‑compare, exhaustive combine, ISO‑group collapse, persistence engine, GPU‑judge engine, full 69 k‑cell sweep, axis‑liveness probes, clamping‑force and rigidity DOC calculators.  
- Unified **PRISM Wire‑EDM** infrastructure (Wire Wizard, multi‑pass skim, wire‑break prediction, flush/recast/HAZ, tech‑tables, E‑code families) serving both payroll & machining domains.  

## Shipped capabilities  
- `e44a3a1592` – wired orphan methods in `PayrollLiabilityFilingEngine`.  
- `e649790e76` – added dispatcher case `payroll_remit_liability`; tests updated (`businessDispatcher.payroll-filing-wire.test.ts`).  
- `9dfd621910` – reusable Ollama transcript miner (`scripts/mine-hotel-transcripts.mjs`).  
- `61518eb988` – miner bug‑fixes (empty response, noise filter, combined globbing regex).  
- `099e6b92bd` – hotel forge roadmap spec (`state/shared/specs/HOTEL-FORGE-ROADMAP-2026-06-09.md`).  
- `U-HOTEL-FALSE-WIRE-REGRESSION-GUARD` – 20/20 guard tests, validates `marketplace_lead_get`.  

- `5ae481f748` – EPERM rename fix in `OutcomeCaptureBusEngine` (atomic `fs.appendFileSync`, retry, orphan‑tmp cleanup).  
- `86f0e3fe0c` – wired `speed_feed_tri_compare`; 16 round‑trip dispatcher tests.  
- `a2dbfa76e1` – closed‑loop driver rescuing 7 SF engines; consensus bug fixed.  
- `43e1b8e449` – G‑Wizard alignment symmetry (R7 resolution).  
- `891c66e728` – full‑sweep comparison driver, material map correction (added N/H groups).  
- `16d6eecef4` – `SpeedFeedCalibrationPersistEngine` wired + unit tests.  
- `f31398a1a5` – `SpeedFeedGpuJudgeEngine` (GPU‑resident LLM judging).  
- `f5d14ddb29` – GPU judge hardening (probe‑GPU residency prefix bug, timeout, `matched_model`).  
- `658c8280fe` – canonical table `CANONICAL_TOOL_MATERIAL_SPEED_FACTOR`.  
- `585584e3ae` – wired existing `CoolantVcModifier`.  

## Key decisions + rationale  
- **LLM summarizer**: Ollama `qwen2.5-coder:32b` for mechanical code‑summaries; ultracode workflow for reasoning & roadmap synthesis.  
- **Review gate**: mandatory 3‑of‑3 scrutiny (reviewer prompt generator) before any commit lands.  
- **Atomic file ops**: replace read‑rewrite with `fs.appendFileSync` + bounded retry to eliminate orphan `.tmp` files.  
- **Dispatcher design**: expose granular actions (`payroll_*`, `speed_feed_tri_compare`, `speed_feed_exhaustive_combine`, `speed_feed_calibration_persist`, `speed_feed_gpu_judge`).  
- **Consensus filtering**: exclude non‑aligned external data *only* when a better aligned source exists (R7 rule).  
- **Safety gating**: Vc increase (`INCVC` flag) must be operator‑gated; default to inert axes unless explicitly enabled.  
- **Persistence strategy**: SQLite‑WAL for `CustomerPortalEngine` maps (deferred to open thread).  

## Standing operator directives  
- `/checkin-hotel` – recover current context before any hotel‑related action.  
- `/startup-hotel` – run startup audit if auto‑pin missed.  
- `/compact` – reset budget before heavy builds.  
- `continue`, `start` – execute roadmap units in listed order.  
- “Run calculations for every possible combination … compare ALL to G‑Wizard & HSMAdvisor.” (trigger full sweep).  
- “Run Blackwell `qwen2.5-vl` OCR batch over vendor catalog PDFs.”  
- Verify galaxy mapping under `H:\PRISM\resources`.  

## What is still to build (open threads)  
1. **U-HOTEL-PORTAL-PERSISTENCE** – SQLite‑WAL layer for CustomerPortalEngine maps.  
2. **ALLOWLIST‑WRITE‑REVIEW / REALTIME‑VERIFY** – post‑build verification of allowlist actions & realtime route.  
3. **Final regression guard sweep** – ensure no false‑wire regressions remain after guard implementation.  
4. **Closed‑loop live driver** – run against live G‑Wizard crib & HSMAdvisor, emit honest alignment flags and abstention reasons.  
5. **Calibration apply gate** – integrate `SpeedFeedCalibrationPersistEngine` output into PRISM SFC (`PRISM_SFC_CALIB_APPLY`) with operator approval.  
6. **Vendor catalog OCR** – full multi‑hour GPU batch to populate missing N/H groups in baseline DB.  
7. **Safety gating validation** – confirm `INCVC` flag does not raise Vc beyond safe limits for newly added axes.  
8. **DOC calculation engine** – combine rigidity factor, holder/spindle stiffness (`U-OSC-RIGIDITY-DOC`).  
9. **Remaining inert axes implementation** – holder type, spindle controller, workholding, insert; decide default controller philosophy.  
10. **GPU‑judge scaling** – batch/caching to avoid OOM on 69 k sweep.  

## How to build it (patterns/sequence)  
- **Seed → Guard → Wire**: use `seedFromHints` → run `U-HOTEL-FALSE-WIRE-REGRESSION-GUARD` → wire dispatcher actions only after guard passes.  
- **Atomic commit pipeline**: apply file‑op fixes, run unit tests, pass 3‑of‑3 review, then `git push`.  
- **Calibration chain**:  
  1. Run `speed_feed_tri_compare` & `speed_feed_exhaustive_combine` (streaming generator).  
  2. Persist per‑ISO/mode factors via `SpeedFeedCalibrationPersistEngine`.  
  3. Validate with `SpeedFeedGpuJudgeEngine` (GPU residency check, timeout).  
  4. Apply to live SFC only after operator `/compact` and safety gating review.  
- **Persistence rollout**: implement SQLite‑WAL layer → migrate existing in‑memory maps → run integration tests (`portal_persistence.test.ts`).  
- **OCR enrichment**: schedule `qwen2.5-vl` batch → ingest into baseline DB → re‑run material map collapse.  

## Tools to use (dispatchers/skills/scripts/hooks/system‑viz/AI‑systems/qdrant/obsidian/ollama)  
- **LLM backends**: Ollama `qwen2.5-coder:32b`, `gpt-oss:20b`; vision OCR `qwen2.5-vl`.  
- **Ultracode workflow** (`/hermes-workflow`) – 8‑agent fan‑out + adversarial verification.  
- **PRISM Wire‑EDM suite** – Wire Wizard, multi‑pass skim, wire‑break prediction, flush/recast/HAZ, tech‑tables, E‑code families.  
- **Scripts**: `scripts/mine-hotel-transcripts.mjs`, `scripts/ask-ollama.mjs`, `update-prism-inventory.mjs`, `build-state-snapshot.mjs`, `system-viz-query.mjs`.  
- **Git hooks**: `slot-commit-enforce`, `ascii-guard`.  
- **Test harnesses**: Vitest suites (`businessDispatcher.payroll-filing-wire.test.ts`, `calcDispatcher.uwire-sfc-batch1.test.ts`).  
- **Dispatchers**: `calcDispatcher.ts` (exposes all speed‑feed actions), `BusinessDispatcher` (payroll actions).  
- **Data stores**: Qdrant vector DB for transcript embeddings, SQLite‑WAL for portal maps, JSONL ledgers (`state/outcomes/sfc-full-sweep-ledger.jsonl`).  
- **Observability**: `system-viz-query.mjs`, ledger files, GPU metrics (`vram_used_mib`, `gpu_resident`).  

## Recurring findings + bugs  
- Orphan methods in payroll engine → all wired (5 methods).  
- EPERM rename failure created orphan `.tmp` – fixed with atomic append & retry.  
- Regex placeholder detector bug caused false null returns for `marketplace_lead_get`; corrected to `{supplierId}`.  
- Dispatcher wiring errors: zero‑arg getters replaced by keyed cache API (`speed_feed_downstream_subscriber`).  
- G‑Wizard crib lacked speed data → comparator always returned first tool; flagged as missing UI entry.  
- Consensus median incorporated non‑aligned externals → now filtered per R7 rule.  
- GPU judge probe‑GPU residency prefix bug & missing fetch timeout – hardened in `f5d14ddb29`.  
- Streaming generator introduced `ReferenceError: cells.length`; fixed by guarding length checks.  
- ISO‑group collapse produced identical Vc for inert material variations; documented and locked.  
- Runout impact factor never applied → now reduces tool life appropriately (`runoutImpact`).  
- Axis‑liveness probe identified 4 inert axes (spindle.hp, workholding.type, tool_holder.type, controller); default to inert with optional safety gating.
