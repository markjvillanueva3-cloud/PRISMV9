# Lathe Wizard — Exhaustive Gap Inventory (2026-06-29, slot:whiskey)

> **Source:** `lathe-wizard-gap-sweep` Workflow (run `wf_1fd636d8-746`, 6 sonnet finders + opus synthesis, 1.8M tokens, 197 tool calls). Operator directive: *"find all gaps and fill them."*
> **Scope:** `TurningPrintToProgramEngine.ts` (TP, slot:whiskey) + `OkumaB250LatheMasterPostEngine.ts` (OP, slot:echo / post-processor galaxy) + `prism_turning`/`prism_thread` wiring. JM Die fleet = 100% Okuma OSP-P300L.
>
> **Ownership split:** TP (runPipeline / mapOkumaOpType / toOkumaOperations / calculateCuttingParams) = **whiskey**. OP (cycle generators, emit dialect) = **echo** (cross-galaxy — coordinate; clone-don't-fork). Safety-gate wiring (`prism_safety:*`, `lathe_*_gate`) spans whiskey (call site) + the dispatcher.
>
> **STATUS LEGEND:** ✅ FILLED · 🔧 fill-this-session (whiskey, safe) · 🤝 echo-owned (post emit) · 🔬 needs JM .MIN + physics-reviewer before merge · 📋 queued.

## Status overview
- ✅ **G01** thread-routing — FILLED (`U-LW-THREAD-ROUTE`, commit `aea8059655`, cleared 3-of-3 + physics-reviewer): external threads emit G71, internal guarded fail-loud.
- ✅ **G24** bore_rough/bore_finish — RESOLVED (verified live: `mapOkumaOpType` already aliases bore_rough→id_rough, bore_finish→id_finish at TP:1579-1580). No action.
- ✅ **G18 + G31 + G40 — FILLED** (`U-LW-SAFETY-SURFACING`, commit `15d3345294`, cleared 3-of-3): collision critical_errors now block emission (fail-closed); the 4 silent safety-catches (chuck-jaw/boring-bar/chatter/workpiece-deflection) now surface warnings; cannedCycleFor metadata G76→G71. **G52 NOT filled** — `case "bore"` returns orientation 8 (correct internal), defensive not dead; finder mis-flagged.
- ✅ **G02 — FILLED** (`U-LW-OKUMA-FALLBACK-FAILCLOSED`, commit `680e404e90`, cleared 3-of-3): an Okuma-target post failure now BLOCKS emission (critical) instead of shipping a Fanuc-dialect program to the OSP fleet. **This MOOTS G11/G29/G37/G38/G39** as live hazards (the Fanuc fallback no longer ships on the Okuma fleet — those sub-fixes are now defense-in-depth only, demote to P3).
- ✅ **G23 — FILLED** (`U-LW-GROOVE-FINISH-ROUTE`, commit `8b0d5fbd70`, cleared 3-of-3): `groove_finish` now routes to the OSP groove cycle (was od_rough G85 roughing). G85_count===0 proven.
- 🔧 **Whiskey safe-additive (next):** G22 (taper mapper routing — needs a NEW geometry case: end_x from taper_angle, route to od_finish; verify generateFinishingPass interpolates linearly), then the safety-backbone (G07/G08/G09/G10/G14/G15) + AI-head orphan-wiring (G48 — the WO5 AI-at-the-head).
- ⚠️ **NEW gap flagged (scrutiny arm B, out-of-this-commit-scope):** `GrooveClassificationEngine.test.ts` has 5 failing tests — the turning dispatcher does NOT register `turning_groove_*` / `turning_partoff_optimize` actions (`unknown action`). Real dispatcher-wiring gap; add to the fill queue.
- 🤝 **Echo-owned (OP post emit) — hand to echo:** G03 G04 G05 G06 G12 G13 G16 G17 G19 G20 G21 G25 G26 G27 G33 G34 G35 G36 G41 G47.
- 🔬 **Highest JM-verification priority:** G04 (G12.1-vs-G112 dialect — finders DISAGREE), G01-internal-guard (geometry direction — done but verify vs JM .MIN), G05/G28 (thread multi-pass + ISO minor-dia math).
- 📋 **Safety-gate backbone (whiskey call-site + dispatcher):** G07 G08 G09 G10 G11 G14 G15. **Orphan-wiring:** G30 G32 G42 G43 G45 G46 G48. **Advisory/cleanup:** G47 G50 G51 G53 G54.

---

## Master Gap Table (G01–G54)

| ID | Gap | file:line | Sev | G-code? | Exact fix | Owner |
|----|-----|-----------|-----|---------|-----------|-------|
| G01 | Thread-routing: thread op types → od_rough → G85 roughing, never threaded | TP:1582 | P0 | Y | ✅ DONE route external→thread, guard internal | whiskey |
| G02 | Fanuc fallback emits on Okuma fleet when emitViaOkumaPost returns null (G71/72/75/76+T0101+M30 alarm on OSP) | TP:~1626-1655 | P0 | Y | Gate: wantsOkuma + post null → critical warning + suppress, never Fanuc fallthrough | whiskey 🔧 |
| G03 | G83 peck Q in mm not µm (Q2 = 0.002mm → micro-peck/alarm) | OP:1106 | P0 | Y | `Q${Math.round(peckDepth*1000)}` | echo 🤝 |
| G04 | C-axis: G12.1-vs-G112 polar + M203-vs-M133 live-tool + feed-mode (mm/min under modal G99) | OP:1136/1147/1132/1144 | P0 | Y | Resolve G12.1/G112 vs JM .MIN; M133; G94 before mill G01 then G99 | echo 🔬 |
| G05 | G71 threading single-pass only (op.thread_passes set TP:1565, never read by post); ≥2mm pitch snaps inserts | OP:898-901 | P0 | Y | Loop G71 decreasing infeed D=firstCut/sqrt(pass), passes from thread_passes, finish pass | echo 🔬 |
| G06 | All 6 live_* collapse to one axial G12.1 plunge; cross-drill/tap need radial M25+G83/G84 at C-angle | TP:1598;OP:1120-1150 | P0/P1 | Y | Expand op enum cross_drill/cross_tap; generateCrossHoleCycle; per-feature handlers | echo+whiskey 🔬 |
| G07 | No pre-emit safety predicate gate (lathe_safety_predicate_evaluate never called; no S(x)≥0.98) | TP runPipeline | P0 | Y(gates) | Call lathe_safety_predicate_evaluate before emit; block if S<0.98 | whiskey 📋 |
| G08 | No part-off safety gate (lathe_partoff_safety_gate never called) | TP;part-off TP:1538 | P0 | Y | Call lathe_partoff_safety_gate; fail-closed | whiskey 📋 |
| G09 | No jaw selection — hardcoded 20kN clamp regardless of chuck/jaw | TP:2361-2362 | P0 | Y | Call lathe_workholding_select_jaw; feed clamp into verify | whiskey 📋 |
| G10 | No spindle-torque check (check_spindle_torque never called; torque-bound at large dia) | TP:2258-2266 | P0 | Y | Call check_spindle_torque; reduce feed if over | whiskey 📋 |
| G11 | G50 clamp bypassed on Fanuc fallback (safeRpm only to Okuma post) | TP:1672-1673 | P0 | Y | Mooted by G02; defense-in-depth pass safeRpm to generateGCode | whiskey 🔧 |
| G12 | G85 LAP roughing leaves no finish — no paired G87 re-run | OP:791-797 | P1 | Y | After G80 emit G87 <label> | echo 🤝 |
| G13 | No clearance rapid before G85 + TNC comp before any G00 (collision + OSP startup alarm) | OP:774-775/791 | P1 | Y | Emit G42 G00 X Z clearance before G85 define | echo 🤝 |
| G14 | Chatter DOC limit computed but never constrains emitted DOC (only a note pushed) | TP:~2519 | P1 | Y | On !stable: doc = min(current, bLim*0.9); tag adjusted | whiskey 📋 |
| G15 | check_spindle_power reduces DOC but never recomputes physics (stale force/defl/chatter) | TP:2261-2266 | P1 | Y | Re-run calculateCuttingParams after DOC reduction | whiskey 📋 |
| G16 | performPhysicsChecks in post advisory-only — emits over-limit S/F/DOC | OP:1156-1192 | P1 | Y if clamped | Clamp css/feed/doc to computed max before emit | echo 🤝 |
| G17 | No G50 CSS clamp before G96 in facing/finish/groove (small-dia overspeed eject) | OP:847+ | P1 | Y | Prepend G50 S<max> before every G96 start | echo 🤝 |
| G18 | Collision critical_errors only log.warn — don't block emission (per-check critical DOES block) | TP:~2722 | P0 | Y(gates) | Push critical_errors into warnings severity:critical | whiskey 🔧 |
| G19 | Part-off no retract after dwell → G28 home from inside cavity (crash) | OP:964-965 | P1 | Y | Emit G00 X<start_x+10> after dwell | echo 🤝 |
| G20 | Part-off peck threshold >50 should be >25 (diametral); single peck doesn't clear chips | OP:951-954 | P1 | Y | if start_x>25; loop pecks min(10,start_x*0.25) | echo 🤝 |
| G21 | No retract/relief after G71 thread + 2mm lead-in below OSP ≥3-5×pitch sync | OP:877/898-903 | P1 | Y | leadIn=max(5,pitch*4); G00 X+5 then Z+leadIn after last G71 | echo 🔬 |
| G22 | taper op falls to od_rough catch-all → straight cut at wrong dia (scrap) | TP:1582/1514;OP:124 | P1 | Y | `if(s==="taper")return"od_finish"`; geom end_x=featOd-2*len*tan(angle) | whiskey 🔧 |
| G23 | groove_finish falls to od_rough → G85 roughing on finish-plunge feature | TP:1583/1589 | P1 | Y | Route groove_finish/groove_id/groove_od→groove; post groove_finish case | whiskey+echo 🔧 |
| G24 | bore_rough/bore_finish mapper | TP:1579-1580 | — | — | ✅ RESOLVED (already aliased in live revision) | — |
| G25 | Grooving no multi-plunge for wide grooves (picket-fence uncut) | OP:909-931 | P1 | Y | Multi-plunge passes when groove_width>tool_width | echo 🤝 |
| G26 | Facing single-pass only — no multi-pass for large face stock | OP:843-858 | P1 | Y | Loop Z-step in doc increments | echo 🤝 |
| G27 | Drill peck threshold flat 30mm instead of 3×D | OP:1104 | P1 | Y | Add drill_diameter_mm; gate depth>3*D, fallback >30 | echo 🤝 |
| G28 | Thread minor-dia featOd-2*(pitch*0.61)≈OD-1.22p wrong vs ISO 68-1 OD-1.2269p (~1.7mm shallow) | TP:1524-1532 | P1 | Y | minorDia=featOd-1.2269*pitch; single depth source | whiskey 🔬 |
| G29 | Fallback T0101+M30 wrong for OSP (T010101, M2) | TP:1677/2121 | P1 | Y | Mooted by G02; T<n><n><n>, M2 | whiskey 🔧 |
| G30 | Thread Vc/feed via generic Kienzle not prism_thread; insert hardcoded not select_thread_insert | TP:1117 | P1 | Y | Thread op → ThreadCalculatorEngine/prism_thread + thread insert selector | whiskey 📋 |
| G31 | Workholding/centrifugal/chatter catch blocks silent (operator never learns gate skipped) | TP:2373/2435/2529 | P1 | N | Push severity:warning on each catch | whiskey 🔧 |
| G32 | sub_spindle_transfer never populated from pipeline (generateSubSpindleTransfer wired but unset) | TP:1634-1645;OP:988 | P2 | Y | Add W-axis fields to TurningInput; populate config.sub_spindle_transfer | whiskey 📋 |
| G33 | Grooving dwell hardcoded 0.5s — too short for steel (JM G4 F3. steel) | OP:925/928 | P2 | Y | Map dwell by ISO group P/M/H→3.0 K→1.5 N/S→1.0 | echo 🤝 |
| G34 | Finish no spring pass for H/M (deflection leaves 0.01-0.02mm oversize) | OP:808-838 | P2 | Y | iso∈{H,M}: duplicate G01 contour as SPRING PASS | echo 🤝 |
| G35 | Finish approach clearance only 2mm — rapid into material | OP:829 | P2 | Y | G00 Z+5, then G00 X+1, then G01 | echo 🤝 |
| G36 | G85 D/U/W lack toFixed → raw float noise emitted | OP:791 | P2 | Y | toFixed(3) on D/U/W | echo 🤝 |
| G37 | Taper case in fallback generateGCode no CSS update | TP:1980-1990 | P2 | Y | Mooted by G02; prepend G96 | whiskey 🔧 |
| G38 | groove_finish in fallback runs full G75 peck not single plunge | TP:1881-1893 | P2 | Y | Mooted by G02; split case | whiskey 🔧 |
| G39 | G50 before G21/G40/G97 safe-start in fallback (non-standard modal order) | TP:1672-1674 | P2 | Y | Mooted by G02; reorder | whiskey 🔧 |
| G40 | cannedCycleFor reports G76 for thread_single_point in result metadata (should be G71) | TP:2954 | P2 | N | `return "G71"` | whiskey 🔧 |
| G41 | C-axis G12.1 emit has no C-word moves (face patterns/bolt circles impossible) | OP:1139-1144 | P2 | Y | C-axis contouring path from feature geom | echo 🤝 |
| G42 | Bolt-circle/polar hole pattern absent (no feature type/planner/emit) | TP:126-136 | P2 | Y | bolt_circle feature; plan as cross-drill per angle | whiskey+echo 📋 |
| G43 | Surface-finish feed cap not enforced (predictRaTurning computes but never clamps) | TP:1318 | P2 | Y | If ra_req set + predicted>req: f_max=sqrt(Ra*32*rn/1000) clamp | whiskey 📋 |
| G44 | Live-tool variants undifferentiated codes | TP:1586/1598 | P2 | Y | Folded into G06 | (dup) |
| G45 | Thermal-growth offset orphaned (LatheThermodynamics not called; U-LW-05 pending) | TP:20-68 | P2 | N→Y | Call thermodynamics; emit G10 L10 or end_x offset | whiskey 📋 |
| G46 | Tool-wear offset ramp orphaned (TurningWearPrediction/OffsetCompensation not called) | TP:20-68 | P2 | N→Y | VB(time)→radial offset; G10 L12 updates | whiskey 📋 |
| G47 | No spot-drill advisory for H-group; no center_drill post enum | OP:1092-1114 | P2 | N | iso=H + drill → SPOT DRILL warning | echo 🤝 |
| G48 | AI/LoRA engines orphaned (CSSOptimizer, ShopAwareOpt, LoRAInference, AIReasoning, AIOrchestration) | turningDispatcher:128/188/378 | P1/P2 | N | Wire CSS-optimizer as G50 cap; ShopAware post-pass; LoRA in calculateCuttingParams | whiskey 📋 |
| G49 | face_rough/face_finish single-pass (mapping ok, generateFacingPass one cut) | OP:843 | P2 | N | Folded into G26 | (dup) |
| G50 | center_drill params not lightened (twist-drill feed) | OP geom | P3 | N | Lighter feed for center-drill | echo 🤝 |
| G51 | Residual stress absent (ISO-S fatigue) | TP:20-68 | P3 | N | Advisory when iso=S + Vc>canonical | whiskey 📋 |
| G52 | okumaToolOrientation dead `case "bore"` (not an enum member) | TP:1607 | P3 | N | Remove dead case | whiskey 🔧 |
| G53 | generateCAxisMilling header comment says G112 but code emits G12.1 | OP:23 | P3 | N | Correct comment (resolve w/ G04) | echo 🤝 |
| G54 | Chatter catch swallows programming errors silently | TP:2498-2530 | P3 | N | Folded into G31 | (dup) |

---

## Recommended fill order (from synthesis)
- **Phase 0 — stop shipping scrap/crash:** G01 ✅ · G02 · G03 · G18.
- **Phase 1 — correct the cycles the fleet runs (physics-reviewer + JM .MIN):** G04 → unblocks G06/G41/G42/G53 · G05+G21+G28+G30 threading · G12/G13/G17/G19/G20.
- **Phase 2 — pre-emit safety backbone (S(x)):** G14/G15/G16/G31 actuate computed physics → G07 predicate → G08/G09/G10/G11.
- **Phase 3 — geometry/finish:** G22/G23/G25/G26/G27/G33/G34/G35/G36.
- **Phase 4 — capability + orphan-wiring + advisory:** G48/G32/G43/G45/G46/G47/G50/G51/G52.

## Two UNRESOLVED verification items (cannot close from reports alone)
1. **G04 G12.1 vs G112** — finders give contradictory OSP truth; read a JM C-axis live-tool `.MIN` before changing.
2. ~~G24 bore_* revision~~ — RESOLVED (confirmed aliased live).

## Hand-off to echo (post-processor galaxy)
The OP-side gaps (G03/G04/G05/G06/G12/G13/G16/G17/G19/G20/G21/G25/G26/G27/G33/G34/G35/G36/G41/G47/G53) are in `OkumaB250LatheMasterPostEngine.ts` (echo's domain). Posted to chat bus. Several are P0 (G03 micro-peck, G04 C-axis dialect, G05 single-pass threading). G04 + G05 + G21 need JM `.MIN` verification.
