# CAM Galaxy Completeness Audit — slot:kilo (2026-05-29)

> **Method:** Workflow (5 parallel Claude dimension-assessors + synthesizer, 6 agents / 1.01M subagent tokens / 106 tool uses) **+ independent ground-truth** (Codex was attempted twice but is unavailable in this env — first call hit the 600 s ceiling, retry failed `CryptUnprotectData failed: 2148073483` under the read-only sandbox; the 6 Codex checks were run directly via Bash instead). The two arms converge.
> **Verdict: `MOSTLY_COMPLETE`** — structurally strong galaxy, **1 P0 safety gap**, 4 P1 missing capabilities, P2/P3 polish. Advisory; every unit human-verify before flip.

## Per-dimension verdicts
| Dimension | Verdict | Headline |
|---|---|---|
| Artifacts | **COMPLETE** | 5 brain files + soul + wiki + awareness surface + knowledge index + verify(9/9 PASS) + master back-pointer all present & consistent |
| PSN synergy | MOSTLY_COMPLETE | 9/11 legs wired + 8 symmetric edges; PRISM OS leg absent; 4 edges asymmetric/mischaracterized |
| Engine wiring | MOSTLY_COMPLETE | 130/177 engines wired (~73%); 47 true orphans; NaN-guard gap real |
| Knowledge | MOSTLY_COMPLETE | 928-tip live corpus (tier-1 solid) but ~2,600 tier-2/3 vendor tips excluded by allowlist |
| Domain scope | MOSTLY_COMPLETE | full pipeline capability exists but collision gate + e2e orchestrator not code-enforced |

## P0 — safety-invariant violation — ✅ FIXED 2026-05-29 (commit U-CAM-COLLISION-GATE-ENFORCE)
> **RESOLVED.** `camDispatcher.toolpath_generate` now runs `collisionDetectionEngine.checkFull` (when bodies/moves present) and attaches a real `safety_gate{cleared, minimum_clearance_mm, severity}` — cleared IFF `severity==="safe"` AND clearance finite > 0; no-geometry → `performed:false, cleared:false` (fail-loud, never silently safe). `post_process` refuses any toolpath carrying an explicit `cleared:false`/`blocked` marker (legacy bare-param callers pass through — non-breaking). Merged NaN class fixed: `assertFiniteResult()` wraps all 6 physics actions (kienzle/taylor/feedrate/deflection/coolant/omega) so none return NaN/Infinity-as-success. Tests: `camDispatcher.collision-gate-wire.test.ts` 26/26 (pure-helper unit + `toolpath_generate→post_process` E2E refusal + adversarial NaN/throw/clearance_violation). 0 new tsc errors. The remaining P1/P2 units below are still open.

- **U-CAM-COLLISION-GATE-ENFORCE** — ~~the collision/gouge gate ("no toolpath ships without a clearance number") is enforced ONLY as procedural step 4 in `cam-route-kilo.md` + an anti-pattern bullet in CLAUDE.md. **No code path blocks it.**~~ (fixed — see note above) `ToolpathGenerationEngine.ts:374` returns `collision_warnings: []` (empty) and never calls `collisionDetectionEngine.checkFull`; `cam_collision_check_full` is a SEPARATE optional action. A `toolpath_generate → post_process` call ships an unvalidated toolpath with no error. **Merge with the NaN-passthrough class:** `cam_feedrate_chipload`/`cam_tool_deflection`/`cam_coolant_strategy`/`cam_omega_score` handlers (camDispatcher ~L2553/2559/2565/2571) + `CAMFeedrateChiploadEngine`/`CAMToolStickoutDeflectionEngine`/`CAMCoolantStrategyEngine` have zero `Number.isFinite` guards → can return NaN-as-success. **Fix:** mandatory in-code collision+finite gate; no toolpath result reaches post_process without a real `minimum_clearance_mm`; no physics action returns NaN-as-success; add negative/missing-param tests (the happy-path-only suite is why this deferred).

## P1 — missing capabilities
- **U-CAM-E2E-ORCHESTRATOR** — `CAMPrintToProgramOrchestratorEngine.ts` is only a 4-stage chain (classify→select-op→template→click-sequence, L87-135) terminating at a click recipe; no toolpath/collision/safety/post/outcome stages. Canonical flow is LLM-follows-runbook, no inter-stage contract → stages (incl. the P0 collision gate) silently skippable. **Architectural root cause of the P0.**
- **U-CAM-PRISMOS-WIRE** — PRISM OS (PSN leg #2) has ZERO CAM connection (0 grep matches for `prism_operating_system` in any galaxy file). CAM's op-sequence/cycle-time/tooling output is exactly what the OS program-release + shop-floor scheduling surfaces consume. True missing leg.
- **U-CAM-TRIBAL-ALLOWLIST-EXPAND** — `scripts/emit-cam-tribal-tips.mjs` L25 hardcodes `TARGET_SYSTEMS=['hypermill','mastercam','esprit','fusion360','nxcam']`. 13+ vendor catalogs exist in `mcp-server/src/data/*-cam-tips.ts` (powermill/solidcam/camworks/worknc/sprutcam/edgecam/cimatron/catia/bobcad/surfcam/tebis/topsolid/gibbscam, ~400 records each = ~2,600 tips) never reach the live corpus. **Low-effort, data already exists.** Extend allowlist → re-emit → regen CAM-KNOWLEDGE-INDEX. Side-effect: lifts thin swarf/trochoidal/waterline/plunge-roughing coverage.
- **U-CAM-WIRE-ORPHANS** — 47 true orphan CAM engines (~27%), none WIRE-EXEMPT-tagged. High-value (wire into prism_cam): `CAMSafetyValidatorEngine` (relevant to P0!), `CAMOperatorGateEngine`, `CAMOperationSequencePlannerEngine`, `CAMMultiSetupPlannerEngine`, `CAMFixtureSelectionEngine`, `CAMMachineSelectionEngine`, `CAMCycleTimeEstimatorEngine`, `CAMToolpathStrategyClassifierEngine`, + hypermill/ mapping family (incl. `HyperMillDeflectionThermalMappingEngine` 181K). Wire the high-value subset; archive/WIRE-EXEMPT-tag the rest (never-delete-only-disable).

## P2 — integrity / hardening
- **U-CAM-PSN-EDGE-RECONCILE** — fix 4 asymmetric/mischaracterized edges (R7 surface-conflicts, don't average): (a) **tango** mislabeled — it owns the DISCOVERY/anti-dup galaxy, NOT a geometry-math lib; named `geodesic`/`BVH` algos return 0 matches; no cam back-ref. Add a real `mcp-server/src/algorithms/` leg-#8 pointer instead. (b) **charlie (quoting)** CONTRADICTED — `quoting/CLAUDE.md:15` excludes CAM strategy selection + routes machining-time basis to mill/lathe/wedm, not kilo. Resolve (add back-edge or revise CAM claim). (c) **foxtrot/whiskey** cut-physics edge one-way, never names kilo. (d) **juliett** unreciprocated (CAM's own note acknowledges pending).
- **U-CAM-WIRE-PHYS-HARDEN** (subsumed into P0 fix) — add `?? {error}` null/NaN fallback to feedrate/deflection/coolant cases (kienzle/taylor already have it).
- **U-CAM-DATACAT-DEEPEN** — 13 `datacat/<vendor>-cam-tips.md` wiki pages are ~53-line auto-gen metadata stubs (no tip bodies), inflating the 519-leaf count; tip text lives only in `.ts` source. Deepen or deduct metadata-only leaves.
- **silent-no-op hardening** — `toolpath_generate`(L2245)/`toolpath_optimize`(L2271)/`tool_assembly`(L2308)/`fixture_setup`(L2313) degrade to fabricated success objects when engine method absent → fake success on broken wiring. Harden to fail-loud (R12).

## P3 — minor
- **U-CAM-PATHS-RECONCILE** — PATHS.md stale: "71 CAM*/68 hyperMILL" (actual 99/17+61); names non-existent `TrochoidalToolpathEngine`/`ScallopHeightEngine` (actual `AdaptiveToolpathRouterEngine`/`NovelToolpathEngine`/`PHCurveToolpathEngine`/`FiveAxisToolpathSynthesisEngine`). Add GSD.md to the verify oracle's brain-file check (currently only 4/5) + to the `{CLAUDE,MEMORY,PATHS,TOOLBELT}` brace shorthand across files + awareness footer.
- **CAMPhase5Stubs.ts** — dead stub `recommend()/optimize()/validate()` returning null/no-op, present + orphaned in active engines/ dir. Add `// SUPERSEDED-BY` marker or archive.

## Strengths (what IS complete & good)
5 brain files consistent (header correctly supersedes the HONEST-STUB) · soul cam-specialist + 5 refuses + domain_filter · verify 9/9 PASS · 8 recently-wired physics actions in BOTH enum+switch with real literature-value tests (no false-green) · collision *capability* is real (engine returns a real clearance number — gap is enforcement, not capability) · CAMStrategyRecommender (44-entry scored corpus) + CAMFeedbackLoop (9 wired actions) + 5-axis TCP/singularity all production · physics rails import from constants.ts (0 inlined) · 9/11 PSN legs + 8 symmetric edges · 928-tip corpus + 33 memories + 519 wiki leaves + 22 vendor skills · 130/177 engines wired.

## Remediation order (ROI)
1. **U-CAM-COLLISION-GATE-ENFORCE** (P0 safety — do first; also closes NaN class)
2. **U-CAM-TRIBAL-ALLOWLIST-EXPAND** (P1, cheapest — data exists, 1-file + re-emit)
3. **U-CAM-WIRE-ORPHANS** (P1 — wire CAMSafetyValidator first, feeds #1)
4. **U-CAM-E2E-ORCHESTRATOR** (P1 — structural fix removing the silent-skip class)
5. **U-CAM-PRISMOS-WIRE** (P1 — missing PSN leg)
6. **U-CAM-PSN-EDGE-RECONCILE** + **U-CAM-PATHS-RECONCILE** + **U-CAM-DATACAT-DEEPEN** (P2/P3)

— Audited by slot:kilo claude-1981bb83. Raw workflow output: ephemeral temp (`weh3zibgl.output`). This spec is the durable backlog.

---

## Phase 2 grounded-source FEASIBILITY (CORRECTION — slot:kilo claude-1981bb83, 2026-05-29)

> The original plan (`H:/.claude/plans/rippling-inventing-hopper.md` §Phase 2) assumed the missing ~40% of Fusion/Mastercam params would be extracted from "vendor PDFs / OPEN MIND E-Learning / Mastercam X8 docs / running seats." A grounded source-availability probe (below) **falsifies that premise for local, text-parseable sources**. Recording the truth here so no slot burns sessions on an impossible bulk-fill.

### What the coverage numbers actually mean (verified, NOT a measurement bug)
The audit is **sound** — checked and confirmed, did NOT "fix" a non-bug:
- `claimed` denominator uses `Math.max(claimedFor(file))` (audit L87), **not a sum** → the consolidated↔split file overlap does NOT inflate it.
- `observedParams` is de-duped by `(op,param-key)` across all files (110 raw ops → 56 deduped for Mastercam proves overlap collapses correctly).
- `machine-simulation.json` contributes 0/0 and carries no `total_parameters`, so it's a no-op in the math (it's a **machine-preset catalog** — 7 presets DMG/Matsuura/Hermle/Okuma/Haas/Mazak/generic — a separate coverage axis, not a thin op).
- The `module.total_params` claims (e.g. `2d_high_speed: 312`) are **author-recorded aspirational targets** — the actual `toolpaths.<op>.params` arrays in BOTH the consolidated `MASTERCAM_X8_2D_3D_HS_CATALOG.json` AND its splits are *empty*; the real params live in a nested `pages`/dialog structure the engine walks (e.g. `dynamic_mill` → 32 grounded params recovered cross-file). So 55%/59% = real grounded params ÷ author target. **The gap is genuine data ABSENCE, not an extraction miss.**

### Grounded-source probe (why local exhaustive fill is blocked)
| Candidate local source | Verdict |
|---|---|
| `mcamX8/.../SharedDefaults/{mill,lathe,wire}/Ops/*.DEFAULTS-8 / *.OPERATIONS-8` | ❌ **Binary** (`file`→"data"; first bytes non-printable). Mastercam operation defaults need the Mastercam SDK / live seat to decode — not text-parseable. |
| `mcamX8/documentation/*.pdf` (Administrator/Installation/Post/Quick-Ref/WhatsNew/Transition) | ❌ Admin/install guides — **zero toolpath-parameter enumeration**. |
| Feature tutorials (`Dynamic_Milling.pdf` 78 p, `Tool_Manager_GSG.pdf`, `Getting Started Solids`) | ⚠️ **Workflow** docs, not param references. `Dynamic_Milling.pdf` keyword density: `Stepover`×2, `Min toolpath radius`×0, `retract`×0, `tip comp`×0. Yields a handful of passing-mention params, most WITHOUT grounded defaults/ranges. |
| `cad-cam-resources-pdf-index.json` (1 MB) | ❌ **File catalog only** — 0/3936 entries carry extracted text (fields: source/relPath/domain/software/top/sizeBytes). |
| `*.xml` in the mcamX8 tree | ❌ All CATIA-interop metadata (`catiadata/` tree), not Mastercam toolpath params. |

**Conclusion (R12):** there is **no cheap, complete, text-parseable, grounded LOCAL source** for the missing ~40% Mastercam params (and the same applies to the Fusion gap). The path that already worked for hyperMILL (152% — filled from its **structured DB/menu export**) is the model: a **structured enumeration of the live application's operation dialogs**, not PDF scraping.

### Corrected Phase 2 source strategy (3 viable grounded paths, ranked)
1. **★ Live-seat dialog enumeration via `CAMAddInFrameworkEngine` (76 K, already built; `/cam-bridge` skill).** Generate a Mastercam C-Hook/NET-Hook (and Fusion `adsk.cam` Python add-in) that walks every operation's parameter definitions in the running seat and exports them to the `cam-functions/<system>/*.json` schema (id/type/default/min/max/unit/enumValues/uiTab + `source:"<app> vX live-enum"`). The ONLY path to true exhaustiveness, PRISM-native, grounded by construction (values come from the app, never invented). **Requires:** the running seat + operator green-light to deploy the add-in.
2. **Online official help scrape** (Mastercam/Autodesk help portals) — external/network + permission; param NAMES grounded but defaults/ranges often absent (mark `unverified`).
3. **Binary `.DEFAULTS-8` decode** via the Mastercam SDK — complex, no SDK present; lowest ROI.

### Concrete extraction punch list (grounded, from current coverage — thinnest ops first)
Priority order follows CLAUDE-BRIEF CAM tier: **Fusion > hyperMILL > Mastercam**. hyperMILL is at 152% (done); fill targets are Fusion + Mastercam.
- **Fusion360 (59%, 497/847) — thinnest:** `turning_profile_finishing`(9), `turning_face`(9), `part_alignment`(9), `spiral`(10), `ramp`(10), `turning_groove`(10), `scallop`(11), `horizontal`(11), `trimming`(12), `surface_inspection`(12). Reference-rich shape: `adaptive_clearing_3d`(71), `multi_axis_contour`(43), `parallel`(34).
- **Mastercam (55%, 510/923) — thinnest:** `Blade Platform`(2), `Blade Top Cutting`(2), `Blade Tangent`(2), `Impeller Hub/Blade/Fillet/Edge Finishing`(3 ea), `Blade Swarf`(3), `Dental Bridge`(3), `horizontal_area_3d`(4). Reference-rich: `twoAxisContour`(34), `dynamic_mill`(32), `tool_parameters`(24).

### Status
- Phase 1 (utilize + measure) — ✅ shipped (`CAMCatalogQueryEngine` + `cam_catalog_*` actions + audit; commit `946919f63f`).
- Phase 2 (grounded fill) — ⏸ **BLOCKED on source decision.** Path #1 (add-in enumeration) recommended; awaiting operator green-light on which seat(s) to deploy against (Fusion-first per CAM tier). NOT a stall — bulk fill from local files was proven impossible; hallucinating params is forbidden (unsafe G-code).

— Source-feasibility audit by slot:kilo claude-1981bb83, 2026-05-29.
