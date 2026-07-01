# KIENZLE — Lathe Wizard Master Plan (assess → build → exhaustive closed-loop test → BE/FE + rebrand)

> **slot:whiskey** · session `5e7ecda3` · 2026-06-26 · authoritative plan for the operator `/goal` work order.
> Supersedes the scattered survey notes. Every count below is **verified this session** (Glob/Grep/find/Read),
> not survey-agent hearsay. Build units are dependency-ordered, each with a **deterministic loss function**
> (R5/R12 — a done/not-done signal a command can check) + R15 metadata (galaxy / wiring target / auto-invoke / scope).

## 0. The goal, bounded (loss function for the whole `/goal`)

The operator's prose decomposes into 4 measurable terminal gates. The `/goal` is DONE when **all four** hold:

| Gate | Deterministic loss function (done-test) |
|---|---|
| **G1 — Exhaustive closed-loop test** | A single harness runs print→features→program→collision→cost→safety→compare over the FULL verified JM lathe corpus (34,993 `.MIN` + 114,653 `.nc` + 2,307 STEP + 1,737 f3d) and emits a dashboard with a real pass/fail % per stage. `node scripts/lathe-closed-loop-full.mjs --all` exits 0 with a numeric report. |
| **G2 — Capability complete** | Every gap in §2 is BUILT+WIRED+TESTED (round-tripped through the dispatcher). `npx vitest run -t "Lathe"` green; `audit-unwired-engines.mjs` shows 0 whiskey-owned orphans. |
| **G3 — Tribal maxed** | Lathe tribal corpus grown from verified **57** → **≥500** via `/learn` on the enumerated PDFs+videos. `prism_knowledge:tribal_search slot=whiskey` count before/after proves it. |
| **G4 — BE/FE + Kienzle rename** | 3 whiskey-owned API gaps wired (no dead frontend calls); lathe wizard FE renamed to Kienzle; `cd mcp-server/web && npx tsc --noEmit && npm run build` green + appShell test updated. |

This is multi-iteration work (R12 — NOT a one-turn build). The `/loop` advances one unit per iteration, each feeding the next.

---

## 1. Verified current state (ground truth, 2026-06-26)

**Engines (lathe galaxy):** ~194 `Lathe*.ts` + 57 turning-family (`Turning*/Okuma*/MillTurn*/Swiss*/HardTurn*`) ≈ **251 engines**. REAL implementations (not stubs — the MEMORY.md "STUB" line refers to the per-galaxy *memory-doc* migration U-GALAXY-MS1-C1, not the code). Confirmed real+wired+tested: `LatheCollisionZoneEngine` (20+ tests), `TurningPrintToProgramEngine` (headless-runnable since lathe adapter bound 2026-06-03), `CycleTimeEngine`, `SafetyVetoSimulationGateEngine`.

**Dispatchers:** `turningDispatcher.ts` (373 actions, primary) · `turningProgramDispatcher.ts` (14) · `threadDispatcher.ts` (17) · `threadingPipelineDispatcher.ts` (**VERIFIED EXISTS** — corrected stale doctrine this session). Cross-galaxy: `camDispatcher` carries 35+ `lathe_p2p_*` actions.

**Pre-emit safety gate sequence (wired, mandatory order):** `lathe_safety_predicate_evaluate` → `lathe_partoff_safety_gate` → `lathe_workholding_select_jaw` → `check_spindle_torque/power` → `turning_force` + `merchant_analysis`. S(x) ≥ 0.70 hard block.

**Frontend (mcp-server/web):** 9 lathe pages — `LatheWizardPage` (primary, already references "Kienzle AI"), `LatheUploadPage`, `LatheStudioPage`, `LatheResultsPage`, `LatheERPDashboard`, `LathePrintToProgram(Page)`, `TurningPage`, `MillTurnPage` (orphaned). Routes `/lathe`, `/lathe/wizard`, `/lathe/results`, `/lathe-studio`, `/turning`. API: `submitLatheWizard`, `getLatheResult`, `uploadLatheFile` → `/api/v1/lathe/*`.

**Closed-loop test apparatus (exists):** Rung A `scripts/lathe-jmdie-param-accuracy-harness.mjs` (mines `.MIN` → empirical SFM/IPR p05–p95 bands by op-type) · Rung B `mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts` (PRISM generator on a 60-program synthetic grid scored vs Rung A bands).

**Tribal:** verified **57** lathe entries (18 `lathe-tribal-corpus.jsonl` + 39 code-tribal learnings) + 5 pending extraction specs. `/learn` pipeline fully wired (`/pdf-learn`, `/video-learn`, `/lathe-learn`).

**Verified JM data scale (the closed-loop test population):**

| Category | Count | Path |
|---|---|---|
| `.MIN` programs (Okuma native) | **34,993** | `JM DIE` tree |
| `.nc` programs (CNC LATHE) | **114,653** | `JM DIE/CNC LATHE/` |
| STEP/STP CAD | **2,307** | `JM DIE/` |
| Fusion `.f3d` CAD | **1,737** | `JM DIE/FUSION CAD AND CAM FILES/` |
| Lathe PDF prints (CNC LATHE) | **10** | `JM DIE/CNC LATHE/ELECTRODE/` |
| Mastercam `.mcam/.mcx` | **0** | workflow is Fusion→post→NC |
| Corpus index | 1 | `.cache/temp/harvest-full/jm-die-corpus.jsonl` |

---

## 2. Gap matrix (what to build — verified, severity, owner)

| # | Gap | Severity | Why it matters | Owner |
|---|---|---|---|---|
| GAP-1 | **Rung C: print/CAD → features wired into the closed loop** | **P0** | Rung A/B prove PRISM reproduces JM *parameters* from synthetic `TurningInput`; they NEVER read a real print/STEP. The operator's "utilize ALL jm die prints/cad models" REQUIRES feeding real geometry. This is the keystone. | whiskey |
| GAP-2 | **Full-corpus closed-loop driver** (`--all` over 34,993 + .nc) | **P0** | Today's harness samples (600/1500). "ALL means ALL" → must run the full population + report covered-vs-total. | whiskey |
| GAP-3 | Live tooling / C-axis archetypes absent from Rung B grid | P1 | whistle-notch, cross-drill, keyway, hex are typed but untested. | whiskey |
| GAP-4 | Shop-floor feedback (Rung D): actual cycle-time vs forecast | P1 | True closed loop needs actual-vs-predicted reconciliation (`MachineLogHarvesterEngine` exists, unwired to feedback). | whiskey ↔ india |
| GAP-5 | Production-cost validation (Rung E): quoted vs actual | P2 | `LatheActualCostReconciliationEngine` exists; post-ship capture not wired. | whiskey ↔ hotel/charlie |
| GAP-6 | 4 Okuma engines unwired (step-ingester, macro-converter, manual-tip, transcript-miner) | P1 | OSP macro generation + manual mining incomplete; JM fleet is 100% Okuma OSP. | whiskey |
| GAP-7 | `LatheLoRASafetyEvaluatorEngine` unwired (0 dispatcher refs) | P1 | LoRA training loop has no safety gate exposed as an action. | whiskey ↔ india |
| GAP-8 | 3 lathe FE→BE API gaps (QUEBEC-FE-BE-WIRING-MAP-2026-06-25) | P1 | Dead frontend calls: scoped `/api/v1/cam` for 12 `lathe_p2p_*`, scoped lathe-print route, swiss endpoints. | whiskey (+quebec/india) |
| GAP-9 | Tribal corpus thin (57 vs ~500 available) | P1 | Operator: "max out tribal via /learn on PDFs+videos." Corpus staged (~80 PDFs + 100 videos + 6 MIT). | whiskey |
| GAP-10 | Kienzle rename incomplete (10 surfaces + appId pending operator) | P1 | "PRISM" is Sandvik-owned; customer product → Kienzle. | quebec (global) + whiskey (lathe pages) |

---

## 3. Exhaustive closed-loop test design (G1)

Pipeline stages and current status (✅ exists / ⚠ build):

```
[print/STEP/f3d] --(Rung C: extract features)--> [TurningInput]   ⚠ GAP-1
   --(turningPrintToProgramEngine.runPipeline)--> [G-code/OSP]      ✅
   --(LatheCollisionZoneEngine.checkAll)--------> [collision OK?]   ✅
   --(CycleTimeEngine + CostEfficiencyBridge)---> [cost/efficiency] ✅
   --(SafetyVetoSimulationGate.certify S>=0.70)-> [safety gate]     ✅
   --(score vs Rung A empirical bands)----------> [accuracy %]      ✅ Rung B (synthetic grid only)
   --(compare vs the JM .MIN that made this part)-> [ground-truth]  ⚠ GAP-1/2 (real corpus pairing)
```

**Build = wire the two ⚠ legs into one full-corpus driver.** Rung C reuses existing extractors (`DXFGeometryParserEngine`, `Drawing2DExtractionEngine`, blueprint-vision/, STEP parser) → `TurningInput`, feeding the existing Rung B scoring. Then a `--all` driver iterates the full 34,993 `.MIN` + the STEP/f3d corpus, pairing each generated program against its real JM counterpart, scoring collision + cost + machining-efficiency + accuracy per part. **Loss fn:** dashboard reports per-stage pass% over the full corpus with covered/total counts (R12 — never silently sample).

---

## 4. Build plan — dependency-ordered units (each: deliverable · loss fn · galaxy · wire-to · auto-invoke · scope)

> Logical order (R13): the measurement apparatus (G1) before capability fills (G2), because a gap is only "closed" when the closed-loop test proves it.

- **U-W1 (P0) — Rung C extractor bridge.** Deliverable: `LathePrintFeatureExtractionBridgeEngine` mapping STEP/f3d/DXF/PDF → `TurningInput` via existing extractors. **Loss fn:** unit test extracts ≥1 turned part from a real JM STEP and produces a valid `TurningInput` (happy + 3 failure + 2 adversarial). **Galaxy:** lathe (`mcp-server/src/engines/`). **Wire-to:** `camDispatcher:lathe_p2p_ingest` + `turningProgramDispatcher`. **Auto-invoke:** none (pipeline stage). **Scope:** domain.
- **U-W2 (P0) — full-corpus closed-loop driver.** Deliverable: `scripts/lathe-closed-loop-full.mjs` chaining Rung C → generate → collision → cost → safety → compare-vs-`.MIN`, `--all` + `--sample N`. **Loss fn:** `--all` exits 0 with per-stage pass% over 34,993 + covered/total. **Galaxy:** lathe. **Wire-to:** consumes Rung A JSON + `turningPrintToProgramEngine` + `LatheCollisionZoneEngine` + `CycleTimeEngine` + `SafetyVetoSimulationGateEngine`. **Auto-invoke:** optional nightly cron. **Scope:** domain (pattern cloneable to mill/wedm).
- **U-W3 (P1) — Rung B live-tooling archetypes** (GAP-3): +3 archetypes (keyway, cross-drill, od-pocket). **Loss fn:** Rung B grid exercises ≥3 live-tooling ops, all in-band or flagged. **Galaxy:** lathe. **Scope:** domain.
- **U-W4 (P1) — wire 4 Okuma engines** (GAP-6) into `turningDispatcher`. **Loss fn:** 4 new actions round-trip through dispatcher with real tests; `audit-unwired-engines.mjs` drops them. **Wire-to:** `turningDispatcher` + `OkumaDialectKnowledgeEngine`. **Scope:** domain.
- **U-W5 (P1) — wire `LatheLoRASafetyEvaluatorEngine`** (GAP-7). **Loss fn:** `lathe_lora_safety_evaluate` action + test. **Wire-to:** `turningDispatcher` + india closed-loop. **Scope:** domain ↔ india.
- **U-W6 (P1) — tribal max-out** (GAP-9, G3). See §5. **Loss fn:** tribal count 57 → ≥500.
- **U-W7 (P1) — 3 FE→BE API gaps** (GAP-8). **Loss fn:** lathe pages reach backend (no dead calls); `tsc --noEmit` green. **Wire-to:** scoped `/api/v1/cam`, lathe-print route, swiss endpoints. **Scope:** domain (+quebec allowlist, india ai-route).
- **U-W8 (P1) — Kienzle rename** (GAP-10, G4). See §6. **Loss fn:** appShell test updated + web build green.
- **U-W9 (P2) — Rung D shop-floor feedback** (GAP-4) + **U-W10 (P2) — Rung E cost validation** (GAP-5): later iterations.

---

## 5. Tribal max-out plan (G3) — route mechanical extraction to Ollama (R5), not Claude

Corpus staged (verified available): Okuma OSP-P200L programming manual · ~35 turning tool catalogs (Korloy/Horn/Ingersoll/Sumitomo/Mitsubishi/Schwanog) · CIMCO Siemens cycle docs (CYCLE93/95/97) · Fusion/HSMWorks/Mastercam lathe posts · ~100 training videos · 6 MIT OCW courses (2.008/2.810/2.830/2.72/2.670/2.875). Pipeline: `/pdf-learn <dir> --batch --tips-only` (lima pypdf page extractor) + `/video-learn` + `/lathe-learn --mode extract` → `prism_knowledge:tribal_capture slot=whiskey` (NEVER direct markdown writes). **Loss fn:** `prism_knowledge:tribal_search slot=whiskey` count before (57) and after (≥500) with provenance.

---

## 6. BE/FE + Kienzle rename (G4) — and the ONE operator-only decision

Per `REBRAND-SURFACE-2026-06-25.md` (quebec): "PRISM" is Sandvik-owned → customer product rename. `index.html` already says "Kienzle Academy"; `package.json productName` still "PRISM". The operator's directive ("name change to Kienzle") **resolves the brand to "Kienzle"** for the lathe wizard surface. Two pieces remain genuinely operator-only (hard-to-reverse, trademark/store-facing — I will NOT invent these):

1. **Exact brand string:** "Kienzle" vs "Kienzle Academy" vs "Kienzle Lathe Wizard"? (`index.html` currently shows "Kienzle Academy".)
2. **App bundle id** `tools.prism.app` → must become a real **owned reverse-DNS** before store submission (cannot be guessed).

**Disposition:** I will apply the in-app lathe-wizard naming ("Lathe Wizard" → "Kienzle") which is squarely directed, and stage the 10-surface global rename, but leave the brand-string + appId for operator confirmation (surfaced, non-blocking). Global package.json/SVG rename coordinated with quebec (U-Q-REBRAND).

---

## 7. Decisions surfaced for the operator (non-blocking — build proceeds on defaults)

- **D1 — Brand string: RESOLVED = "Kienzle"** (operator directive 2026-06-26 "name change to Kienzle", verbatim). Reversible/internal codebase string, NOT operator-only by the crossroad classifier; "Kienzle Academy" was a pre-existing academy-module title, not the platform brand. U-W8 applies "Kienzle" across the 10 rename surfaces. No wait.
- **D3 — Ground truth: RESOLVED = `.MIN`** (Okuma-native, JM's real shop output) as the comparison set; `.nc` secondary. Reversible/internal choice, decided by default. No wait.
- **D2 — App id: OPERATOR-ONLY, non-blocking.** `tools.prism.app` -> needs a real OWNED reverse-DNS (cannot be invented; external/store-submission). Recommendation: keep `tools.prism.app` for dev until you provide an owned domain. Store submission is the ONLY thing this gates -- no build waits on it.

_Loss function for THIS spec (Phase 0): file exists with verified counts + every build unit carries a deterministic done-test. ✅_

## 8. Build progress log (append-only)

- **2026-06-26 -- GAP-1 (Rung C keystone) BUILT via the OCR/PDF path (U-W2C, commit `aee90250e3`).** `scripts/lathe-rungc-ocr-loop.mjs` (run via tsx) closes the geometry leg: real part DRAWING (PDF) -> PyMuPDF raster -> `blueprintVisionOCREngine.analyzeBlueprint(turning)` -> `turningPrintIntakeEngine.convertBlueprint` -> `turningPrintToProgramEngine.runPipeline` -> `scoreProgram` vs the Rung A empirical cloud (`scripts/lib/lathe-band-score.mjs`, 16/16 tests) -> pair to `.MIN`. ALL real production engines (R15 test-through-the-path). Specialty ops (thread/part-off/groove) excluded from band scoring. Per-file 2-arm scrutiny PASS/PASS.
  - **R12 HONEST:** `full_geometry_loop_closed` is still FALSE -- the live vision OCR is GPU-blocked by peer fleet contention (`qwen2.5-coder:32b` 54.7GB resident + in use; even moondream times out). NOT a code defect (verified by direct curl). The driver is resumable + reap-safe (`--all --limit 1`); a fire when the GPU frees completes it.
  - **STEP B-rep leg (GAP-1 option B, 2,307 JM STEP files)** still needs the Python `cad-engine/` B-rep bridge -- separate unit (`STEPGeometryParserEngine` is entity-count-only, does NOT feed `TurningCADImportEngine`).
  - **Rung B real-program roundtrip harness EXISTS** (WHISKEY-LATHE-ACCURACY-MS0/U-ROUNDTRIP-ACCURACY-RUNG-B; 41.6% baseline) -- do not rebuild.
- **2026-06-26 -- U-W7 (FE/BE) reassessed: mostly MOOT now.** Per QUEBEC-FE-BE-WIRING-MAP, the whiskey-owned lathe FE/BE items (`SwissPage`, `LathePrintToProgram`, `LathePrintToProgramPage`) all target ORPHAN pages not routed in `App.tsx` -- zero user impact until a product decision routes them. **U-W8 rename:** quebec-lane + appId operator-only (D2) + SVG-glyph design judgment -- coordinate, do not solo during an active fleet run.
- **2026-06-26 -- the closed-loop test found + FIXED two real generator over-pessimism defects (UNSAFE 40 -> 30).** The Rung B safety/efficiency scoring (U-W2D wired into the roundtrip harness, U-W2G) graded PRISM's generated programs 40/60 UNSAFE; `violations_by_axis` + `collision_fail_types` instrumentation (U-W2I/U-W2M) pinned it precisely (overspeed + overpower = 0 -- G50 cap + power FINE):
  - **U-W2K (`680145c933`) boring-bar deflection overhang.** The pre-check used `overhang = part_length*1.2` for every bore op regardless of bore depth; deflection ~ L^3/D^4, so over-stating L over-states deflection cubically -> false `within_tolerance:false` on blind bores. FIX: pure helper `boringBarOverhangMm` = `min(boreDepth, part_length)*1.2`. boring flags 40 -> 20 (deep bores still flag). 9 R9 tests + never-soften invariant.
  - **U-W2L (`0da80516aa`) groove/part collision stickout.** The collision builder fed a flat 40mm stickout; a parting blade reaches the part CENTER (~part radius), a grooving blade the groove BOTTOM. FIX: `groovePartStickoutMm` = real reach, capped at 40. collision flags 20 -> 10 (groove + small-part relieved; probe-confirmed 0). 9 R9 tests.
  - **Residual 30 UNSAFE are all GENUINE:** 20 deep-bore deflection + 10 `part_off:grooving_overhang` (a hardcoded-3mm parting blade genuinely can't part a large bar -- the check correctly flags; the program doesn't yet SPECIFY a blade width). Both fixes never-soften-safe (true geometry, min-cap, R9 invariant proof; physics-reviewer validated the boring model). Envelope UNCHANGED 96.3/100.
  - **NEXT (fresh budget, multi-part): parting blade-width spec.** Add `blade_width_mm` to `TurningInsert` -> populate in parting tool selection (scale with bar OD) -> collision check reads the SPECIFIED width (NOT scaling an assumption, which would be softening). Then the residual relieves where physically valid + still flags genuinely-undersized blades. Needs physics-review. Memory: [[reference_whiskey_rungb_safety_finding_boring_collision_2026_06_26]].
- **2026-06-26 (session 6eaa145c) -- U-W6-VISION SHIPPED (G3 tribal route).** The image-heavy-PDF blocker is closed: `scripts/lathe-tribal-ollama-ingest.mjs` gained a VISION fallback (PyMuPDF raster -> `qwen2.5vl:7b` via curl -> transcription -> existing `extractTips`, $0-Claude) + AUTO-DISCOVERY (`scripts/lib/lathe-tribal-corpus-discover.mjs`, 11/11 tests) growing the corpus **12 hard-coded -> 48** lathe PDFs (mill-exclude + word-boundary filter). LIVE: image-heavy Sumitomo catalog -> `via=pdf-vision` +15 real tips; corpus 49->71. 2-arm per-file scrutiny: 2 P1 fixed (filter contamination + Ollama-error-body silent-permanent-skip). Memory [[reference_whiskey_kienzle_vision_route_u_w6_2026_06_26]]. **G3 status: route BUILT; the cron `--limit 1` drain now compounds the 38 remaining toward 500.** Decisions D1/D3 already resolved; global "Kienzle Academy" rename DONE (quebec U-Q-REBRAND).
- **2026-06-26 (session 14093afb) -- G1 KEYSTONE CLOSED: STEP geometry leg (U-W-STEP-RUNGC-LOOP, commit `1567dba6f1`).** `full_geometry_loop_closed` is now **TRUE** via the STEP path. The STEP profile extractor (U-W-STEP-PROFILE/SEGMENT) was built but not in the loop; this wired it end-to-end: `scripts/lib/lathe-step-profile-to-features.mjs` (pure, 12/12 -- profile `{a,r}` -> `od_contour`/`id_contour` features + stock, 25.4x units rail) + `scripts/lathe-rungc-step-loop.mjs` (resumable corpus runner, **pure JS occt -- NOT GPU-bound**, so it RUNS TO COMPLETION unlike the OCR leg) -> folded into `lathe-closed-loop-full.mjs` (`rung_c_step`, verdict ORs OCR|STEP, `_ocr`/`_step` split). LIVE: AGRATI 9070219 OP2 STEP -> 2 ops, both SFM+IPR in-band 100%. Non-revolution bodies (electrodes/molds/toolholders = bulk of the 2,307 STEP corpus) correctly skipped as suspect (R12). Also fixed the stale corpus-coverage WARN: `--all` already passes `--all-roots` so Rung A scans the true ALL 34,993 .MIN. Per-file 2-arm scrutiny: arm-B P1 path-casing double-count FIXED (lowercase canon key); arm-A P2s FIXED (occt-failed retriable, OP/v suffix-strip pairing, done-aware enumerate, metre units-unsupported). HONEST gaps: material defaulted 1018/P (STEP carries none -> op-archetype-relative scoring); safety PARTIAL (machine limits undefined, never false-SAFE -- DEFERRED cross-leg ShopConfig plumbing). Memory: [[reference_whiskey_rungc_step_loop_closed_2026_06_26]].
  - **NEXT (loop):** (1) G3 tribal 101->500 drain `--limit 1` (vision route built, GPU free); (2) run STEP loop over more corpus; (3) plumb Okuma limits -> safety SAFE/UNSAFE; (4) G4 Kienzle BE/FE.
- **2026-06-28 (session 8f313ac7, slot:whiskey) -- RE-ISSUE of the same /goal. State reconciled vs LIVE code+dashboards (R12 -- 3 stale notes above corrected):**
  - **CORRECTION #1 -- G1 closed-loop is FAR more complete than `steps_scored:1` implied.** `state/shared/dashboards/lathe-rungc-step.json` LIVE: **steps_attempted 2191 / 2307 STEP corpus (95%), steps_scored 1049 turned parts, ALL SAFE (unsafe 0 / partial 0), 988 suspect-non-revolution skipped, 28 paired to .MIN, full_geometry_loop_closed=true.** Combined with Rung A over ALL 34,993 .MIN -> the operator's "exhaustive closed-loop test over ALL JM data w/ collision+cost+efficiency+safety" is **substantially DONE**.
  - **CORRECTION #2 -- "(3) plumb Okuma limits" + the §8 "safety PARTIAL ... DEFERRED ShopConfig plumbing" note are STALE/DONE.** `lathe-rungc-step-loop.mjs:247` ALREADY sets `ti.max_spindle_rpm/max_power_kW` from the JM Okuma **fleet-floor** (most-restrictive across `ShopConfigurationEngine` LTH-01..07 = 3800 rpm / 11 kW), passed to the scorer @:280. Result: 0 partial (all 1049 certified SAFE on rpm+power+collision). Almost rebuilt this -- verified-not-rebuilt (R8/R12).
  - **SHIPPED U-W-TRIBAL-VENDOR-CATALOGS (this session).** `scripts/lib/lathe-tribal-corpus-discover.mjs` was basename turning-KEYWORD only -> general turning-insert vendor catalogs with generic names (korloy solid, Accupro, cobra-carbide, BIG Daishowa, Carmex, Applitec) were DROPPED. Added `VENDOR_TURNING_BRANDS` allowlist (turning/boring/grooving/threading makers only; pure mill/drill vendors excluded; MILL_EXCLUDE veto still wins; extractor's turning-tip filter prevents dilution). **Discoverable lathe corpus 48 -> 78 (+30 vendor catalogs).** 14/14 tests (incl adversarial dilution + veto guards).
  - **SHIPPED U-W-FE-KIENZLE-POLISH (this session).** LatheUploadPage title 'Lathe Upload'->'Kienzle Upload'; 8 inline `rounded-[22px]`/`rounded-2xl` -> `rounded-ios-lg` token across Wizard+Upload (web/CLAUDE.md token rule). web `tsc --noEmit` green. Pages already use shared WorkspacePrimitives + WorkspaceRecoveryScaffold + 'Kienzle' brand -> these closed the residual inline-token + brand gaps.
  - **TRIBAL drain reality (R12 honest):** continuous durable Windows scheduled tasks ALREADY drain tribal (`PRISM Lathe Tribal Drain`, `PRISM Resources Tribal Drain` RUNNING, `PRISM Tribal Resources Drain` RUNNING, `PRISM Tribal Embed`) -> the +30 widened catalogs auto-drain as GPU frees (the operator's "continuous loops" is wired; this session expanded its REACH). Corpus 694 tips (>=500 gate MET). **OPEN:** oversized general catalogs (e.g. Accupro 2013, 300+ pages) hit `curl exit 28` (vision-OCR timeout under GPU contention -- `nomic-embed` resident); these stay RETRIABLE (ingest line 210 never markSkipped) so the cron retries when GPU frees. Deeper fix (distributed page-sampling vs first-4-pages; chunked vision) = future tribal-pipeline unit.
  - **STILL OPEN (genuinely remaining):** (G4 FE) LatheStudioPage (520-line hand-rolled, no WorkspacePrimitives, hardcoded slate/cyan, no MobileSafeArea) + LatheERPDashboard (hand-rolled tiles, uppercase iOS-violation) need a design-system refactor -- **VISUAL-VERIFY gated** (web/CLAUDE.md: "Claude is visually blind without the screenshot"); best in a Playwright-screenshot-equipped FE session, coordinate w/ quebec (web/ owner). Audit: LatheWizard/Upload/Results conformant; Studio+ERPDashboard are the debt.
  - **ALSO SHIPPED 2026-06-28 (tribal yield, NOT just reach):** U-W-TRIBAL-DISTRIBUTED-PAGES + U-W-TRIBAL-PAGES-INT-GUARD. The vision ingest rendered the FIRST `--vision-pages` (4) pages -> a 200-400pp turning catalog yielded ~0 insert tips (cover+TOC). New pure `scripts/lib/lathe-vision-page-select.mjs::selectVisionPages(total,budget)` (7/7 tests, 2-reviewer PASS) spreads the budget EVENLY across the doc; `lathe-tribal-ollama-ingest.mjs` probes a cheap `pageCountOf` -> distributes indices -> rasterizes those (first-N fallback on probe fail, isinstance(i,int) guard). The running drain crons now extract body tables, not covers.
  - **PRECISE SPEC -- U-W-PARTING-BLADE-WIDTH (fresh-budget, physics-review-gated; deferred 2026-06-28 with rationale, NOT rushed at session-tail).** WHY low-priority: all 1049 REAL STEP parts grade SAFE; the residual `part_off:grooving_overhang` UNSAFE is in the Rung-B SYNTHETIC 60-grid ONLY. ROOT CAUSE: `LatheCollisionZoneEngine.ts:473` defaults `bladeWidth = tool.blade_width_mm ?? 3` -> the generator never SPECIFIES a parting blade width, so a 3mm default can't part a large bar (extension>=part_radius; ratio=extension/3 > maxRatio @ `LatheCollisionZoneEngine.ts:43`). The flag is CORRECT for a real 3mm blade -> the fix is generator-side, NOT a collision-check change. BUILD (R15, never-soften): (1) pure `selectPartingBladeWidth(partRadiusMm, maxRatio)` -> min standard width >= extension/maxRatio, picked from REAL standard parting-insert widths (SOURCE a vendor/ISO parting-blade catalog from the tribal corpus -- e.g. Iscar/Sandvik parting widths ~1.4/2/3/4/5/6mm; CITE it, do NOT invent); if even the widest standard can't reach (extension/widest > maxRatio) return the widest + `oversized:true` so a genuinely-too-large bar STILL FLAGS (never softens). (2) WIRE into the parting tool selection in the turning print-to-program pipeline (set `tool.blade_width_mm` on the part_off op) -- find the parting-tool-selection site first (R8). (3) collision check UNCHANGED; it just reads the now-specified realistic width. (4) TEST: a 12mm-radius bar selects a wider blade -> relieved; a 60mm-radius bar exceeds standards -> still UNSAFE (R9 never-soften invariant: a revert to `?? 3` must fail a test). (5) GATE: physics-reviewer agent (mandatory -- force/rigidity formula). Memory: [[reference_whiskey_rungb_safety_finding_boring_collision_2026_06_26]].
