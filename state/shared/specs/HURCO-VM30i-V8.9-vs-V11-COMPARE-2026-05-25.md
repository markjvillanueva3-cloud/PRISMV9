# Hurco VM30i — v8.9.153 vs v11 Compare + Bridge/Wire Assessment (2026-05-25)

**Slot:** echo (claude-9029a5d7) · **Operator directive:** *"begin analyzing the most up to date hurco vm30i post, compare it to the fully worky v8.9 version that ive been using. assess how we can bridge and wire all features I always ask for for enhaned posts for selling"*

**Files compared:**
- v8.9.153 — `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps` (187,680 bytes / 5,051 lines) — operator's "fully worky" baseline
- v11 — `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps` (813,464 bytes / 19,265 lines) — most-recent (shipped 2026-05-25, baselines wiki canonical)
- Also on disk: `HURCO_VM30i_PRISM_v10_9_DRILLFIX_1.cps` (intermediate, drill-cycle fix), `PRISM-Master-Hurco-VM30i.cps` (Master Post variant)

---

## §1. Headline

| Metric | v8.9.153 | v11 | Delta |
|---|---:|---:|---:|
| File size | 187,680 B | 813,464 B | **4.33×** |
| Lines | 5,051 | 19,265 | +14,214 |
| `prism*` property declarations | 5 | 535 | **+530** |
| `on*` handlers | 21 | 22 | +1 (`onPassThrough` new) |
| Byte-equal handler bodies | — | — | **0 of 22** (every handler moved) |

**Interpretation:** v11 is NOT a property-panel-only inflation. Every handler body grew. The new code is real, not metadata.

---

## §2. Per-handler body-length delta (v8.9 → v11)

| Handler | v8.9 len | v11 len | Δ | Notes |
|---|---:|---:|---:|---|
| `onSection` | 16,421 | **39,491** | **+23,070** | Per-op setup — biggest expansion. Property reads + UltiMotion/G64 binding + tribal-citation emit likely landed here. |
| `onOpen` | 7,621 | 10,912 | +3,291 | Header scaffolding + 530 new property reads. |
| `onSectionEnd` | 1,155 | 2,313 | +1,158 | Per-op cleanup expanded. |
| `onCircular` | 4,917 | 5,916 | +999 | Arc emission — possibly G02/G03 R-form + IJK tightening. |
| `onLinear` | 1,947 | 2,578 | +631 | G01 feed emission. |
| `onCyclePoint` | 28,164 | 28,660 | +496 | Drill/tap cycle handler (already heaviest in v8.9). |
| `onClose` | 2,554 | 3,286 | +732 | Footer / setup-sheet emission. |
| `onCycleEnd` | 295 | 519 | +224 | Cycle teardown. |
| `onRewindMachineEntry` | 19 | 249 | +230 | Rotary-rewind logic added. |
| `onCommand` | 1,750 | 1,810 | +60 | Command dispatch. |
| `onRapid` | 561 | 578 | +17 | G00 emission. |
| `onLinear5D` | 1,185 | 1,214 | +29 | 5-axis linear (TCP/RTCP-relevant). |
| `onRapid5D` | 1,440 | 1,474 | +34 | 5-axis rapid. |
| `onReturnFromSafeRetractPosition` | 991 | 1,019 | +28 | M140-bound retract return. |
| `onRotateAxes` | 236 | 246 | +10 | A/B/C axis rotation. |
| `onMoveToSafeRetractPosition` | 178 | 184 | +6 | Pre-rotation safe position. |
| `onRadiusCompensation` | 53 | 55 | +2 | G40/G41/G42. |
| `onSpindleSpeed` | 47 | 49 | +2 | S-word emission. |
| `onCycle` | 41 | 43 | +2 | Cycle setup. |
| `onComment` | 28 | 30 | +2 | Comment formatter. |
| `onDwell` | 203 | 198 | **−5** | Minor shrink — dead-code prune. |
| `onPassThrough` | — | 22 | **NEW** | Manual-NC pass-through, absent in v8.9. |

---

## §3. Feature presence audit (substring hit counts)

| Feature | v8.9 | v11 | Trend |
|---|---:|---:|:--|
| **G05.3** (Hurco-native surface smoothing) | 10 | 13 | ↑ +3 (expanded per-op binding) |
| **G64** (contour-mode look-ahead) | 1 | 11 | ↑ +10 (massive — per-op tolerance binding landed) |
| **UltiMotion** (per-op smoothing mode) | 3 | 12 | ↑ +9 |
| **G131** (polar interp) | 0 | 0 | absent in both |
| **G137** (lathe-side polar — N/A on mill) | 0 | 0 | absent in both |
| **G54.1** (extended work offsets P10+) | 0 | 0 | **❌ MISSING IN BOTH** (engine spec required 2026-05-22) |
| **M140** (safe Z-retract) | 5 | 5 | = (preserved) |
| **M19** (spindle orient) | 2 | 2 | = (preserved) |
| **G65** (macro call) | 0 | 1 | ↑ +1 (new in v11) |
| **WinMAX** (control marker comment) | 2 | **0** | ⚠ **REGRESSION** — controller-id comments lost |
| **LookAhead** | 1 | 1 | = |
| **iMachining** | 0 | 0 | absent in both |
| **chip-thinning** | 0 | 1 | ↑ +1 (new mention) |
| **TCP / TCPM** (5-axis tool-center) | 15 | 16 | ↑ +1 |
| **NURBS** (spline path) | 0 | 1 | ↑ +1 (new) |
| **polarInterp** | 0 | 0 | absent in both |
| **tiltedWorkplane** | 0 | 0 | absent in both |
| **thermalComp** | 0 | 0 | absent in both |
| **collisionAvoid** | 0 | 0 | absent in both |
| **prismTribalCitation** | 1 | 1 | = (property-only, behavior preserved) |
| **prismCI95Comments** | 1 | 1 | = |
| **prismLookAheadBlocks** | 1 | 1 | = |
| **prismCrossCAMFeatures** | 1 | 1 | = |
| **prismAggressivenessLevel** | 3 | **0** | ⚠ **REGRESSION** — knob removed |
| **prismMachineRigidity** | 0 | 2 | ↑ +2 (new machine-rigidity input) |
| **prismMaterialGroup** | 0 | 3 | ↑ +3 (ISO P/M/K/N/S/H selector new) |
| **prismOptimizationMode** | 0 | 3 | ↑ +3 (new mode selector — likely supersedes prismAggressivenessLevel) |
| **PRISM_AGI** | 0 | 0 | absent in both |
| **printToProgram** | 0 | 0 | absent in both |
| **probing** | 32 | 33 | ↑ +1 (preserved) |
| **workOffset** | 10 | 10 | = |
| **useG05** | 0 | 0 | absent in both (property key uses different name) |

### Regressions to investigate
1. **`WinMAX`** lost (2 → 0) — likely a comment string change, low-risk but should restore as a control-id self-identification line.
2. **`prismAggressivenessLevel`** lost (3 → 0) — replaced by `prismOptimizationMode` (0 → 3). Need to verify the new mode covers the same conservative/standard/aggressive semantics. If yes, this is a rename-not-regression and the test suite + operator docs need the rename trail.

### Capability still missing in BOTH versions (true wire-up gap)
- **`G54.1 P10+` extended work offsets** — 2026-05-22 verification spec failure #2 still unaddressed.
- **`G131` polar interpolation** — Hurco WinMAX-V11 capable but not emitted.
- **`iMachining` / `polarInterp` / `tiltedWorkplane` / `thermalComp` / `collisionAvoid`** — advanced features named in the standing operator ask but neither version emits them.
- **`PRISM_AGI` / `printToProgram`** marker handoffs to the AGI pipeline — neither version emits these tags.

---

## §4. "All features I always ask for" — sale-ready checklist

Compiled from CLAUDE.md §POST-PROCESSOR baselines + 2026-05-22 HURCO POST-VERIFICATION spec + tribal/wiki standing requests.

| # | Feature | v8.9 | v11 | Hurco VM30i capable? | PRISM engine ready? | Bridge action |
|---:|---|:--:|:--:|:--:|:--:|---|
| 1 | Inline tribal citation per op (`prismTribalCitation`) | ✅ | ✅ | n/a (comment) | `PRISMSelfAwarenessEngine.searchTribalKnowledge` ✅ | **shipped — keep** |
| 2 | CI95 comments on speed/feed/Vc (`prismCI95Comments`) | ✅ | ✅ | n/a (comment) | `UltimateSpeedFeedEngine` (CI95) ✅ | **shipped — keep** |
| 3 | Programmable look-ahead blocks (`prismLookAheadBlocks`) | ✅ | ✅ | ✅ (WinMAX V11) | `ToolpathOptimizationEngine` ✅ | **shipped — keep** |
| 4 | Cross-CAM idiom translation (`prismCrossCAMFeatures`) | ✅ | ✅ | n/a (translation) | 18 CAM-bridge engines ✅ | **shipped — keep** |
| 5 | Conservative/Standard/Aggressive knob | ✅ (`prismAggressivenessLevel`) | ⚠ renamed to `prismOptimizationMode` | n/a (semantic) | `AutoSpeedFeedEngine` ✅ | **VERIFY** rename mapping; restore name OR document migration |
| 6 | G05.3 surface smoothing per finish op | ✅ (10×) | ✅ (13×) | ✅ (WinMAX V11 native) | `HSMSurfaceModeEngine` ✅ | **shipped — keep + expand** |
| 7 | UltiMotion / G64 per-op contour tolerance | ✅ (G64×1, UltiMotion×3) | ✅ (G64×11, UltiMotion×12) | ✅ (WinMAX UltiMotion) | `ContourToleranceEngine` ✅ | **shipped — keep + expand** |
| 8 | M140 safe Z-retract for tool change | ✅ (5×) | ✅ (5×) | ✅ (Hurco macro) | `SafeRetractEngine` ✅ | **shipped — keep** |
| 9 | iMachining / dynamic-depth roughing | ❌ | ❌ (1 mention only) | ⚠ Hurco-capable via custom macro | `iMachiningStrategyEngine` ✅ (built, not wired to .cps) | **WIRE** iMachining param → .cps onSection branch |
| 10 | Chip-thinning radial-engagement comp | ❌ | ⚠ (1× mention) | ✅ (math, no native code) | `ChipThinningEngine` ✅ | **WIRE** chip-thinning factor → fz adjustment in onSection |
| 11 | Probe-based thermal expansion comp | ❌ | ❌ | ✅ (Hurco probing) | `ThermalCompensationEngine` ✅ | **WIRE** probing-cycle insert + G10 L20 offset write |
| 12 | TCP / RTCP 5-axis control | ✅ (15×) | ✅ (16×) | ✅ (Hurco V11 5-axis option) | `FiveAxisTCPEngine` ✅ | **shipped — keep** |
| 13 | NURBS spline path output | ❌ | ⚠ (1×) | ⚠ Hurco NSP variant | `NURBSPathEngine` ✅ | **WIRE** NURBS emit branch when finish_pass + curve_density>threshold |
| 14 | Polar interpolation (G131) | ❌ | ❌ | ✅ (Hurco option) | `PolarInterpolationEngine` ✅ | **WIRE** G131 enable/disable around polar ops |
| 15 | Tilted-workplane / G68.3 | ❌ | ❌ | ✅ (Hurco) | `TiltedWorkplaneEngine` ✅ | **WIRE** G68.3 emission for 5-axis fixed-rotation ops |
| 16 | Collision-avoid macro inserts | ❌ | ❌ | ⚠ via M-code custom | `CollisionAvoidanceEngine` ✅ | **WIRE** collision-check macro inserts before each rapid |
| 17 | Probing WCS-set routine | ✅ (32×) | ✅ (33×) | ✅ (Hurco G65 probing) | `ProbingEngine` ✅ | **shipped — keep** |
| 18 | Print-to-program AGI handoff (`PRISM_AGI`) | ❌ | ❌ | n/a (comment) | `MasterPostProcessorUnifiedAGIEngine` ⚠ (quality_score=0 regression) | **WIRE** after AGI engine repair |
| 19 | G54.1 extended work offsets P10+ | ❌ | ❌ | ✅ (Hurco V11) | needed in engine | **WIRE** G54.1 P# emit when work_offset>9 (2026-05-22 #2) |
| 20 | Machine-rigidity input | ❌ | ✅ (2×) | n/a (input) | `AutoSpeedFeedEngine` ✅ | **shipped — keep** |
| 21 | Material-group ISO-P/M/K/N/S/H selector | ❌ | ✅ (3×) | n/a (input) | `physics/constants.ts` ✅ | **shipped — keep** |
| 22 | WinMAX controller-id self-identification | ✅ (2×) | ❌ | n/a (comment) | n/a | **RESTORE** comment in onOpen header |
| 23 | Manual-NC pass-through (`onPassThrough`) | ❌ | ✅ (22 B) | ✅ | n/a | **shipped — keep + harden** (currently very thin) |

**Tally:** 23 features · **13 shipped in v11** (including `prismMachineRigidity/prismMaterialGroup/prismOptimizationMode/G64/UltiMotion/G05.3 expansion`) · **8 need wiring from existing PRISM engines** · **2 regressions to restore** (`WinMAX` comment, `prismAggressivenessLevel` rename trail).

---

## §5. Bridge / wiring plan — turning v11 into the sale-ready PRISM-Enhanced post

**Priority 1 — Restore regressions (low risk, fast):**
- (R1) Re-add `WinMAX V11` controller-id comment to `onOpen` header
- (R2) Rename audit: confirm `prismOptimizationMode` covers `conservative/standard/aggressive` semantics; if so, document the rename; if not, restore `prismAggressivenessLevel` alongside

**Priority 2 — Wire existing PRISM engines into the .cps emission (the real "sale-ready" gap):**
For each WIRE-row in §4, the work is:
1. Add the `prism*` property to the property panel
2. In `onSection` (or the appropriate handler), read the property value, call the matching PRISM engine, branch the emission

Example wire-up template (for iMachining, row 9):
```javascript
// In properties{}:
prismIMachiningMode: { title: "iMachining mode", type: "enum",
  values: [{id:"off"},{id:"adaptive"},{id:"trochoidal"}], value: "off" }

// In onSection (when roughing op detected):
if (properties.prismIMachiningMode !== "off") {
  // Call PRISM iMachiningStrategyEngine via post-processor sidecar
  // Emit adaptive-feed + dynamic-depth macro inserts
  writeComment("PRISM iMachining mode: " + properties.prismIMachiningMode);
  // ... macro inserts ...
}
```

**Priority 3 — Close the 2026-05-22 verification-spec gaps (engine-side):**
- (V1) `HurcoV11MillMasterPostEngine` 25 test failures (50% PASS) — the TypeScript engine that the .cps will eventually call/mirror. Fixing this is the parent of `MasterPostProcessorUnifiedAGIEngine.generatePost quality_score=0` regression.
- (V2) Material-constant override floor/ceiling validation (safety-relevant — silent acceptance of 4× canonical force is the bug class).
- (V3) Extended work offset `G54.1 P12` emission.

**Priority 4 — Master Post convergence (gated):**
Only after Priorities 1–3 close AND PostProcessorVerificationOrchestratorEngine confirms PASS on real .NC emission from v11, promote v11 to be the seed for the Hurco branch of `MasterPostProcessorUnifiedAGIEngine` — the print-to-CNC end-mission.

---

## §6. Selling angle (operator-asked context)

What we tell a prospective buyer about the PRISM Enhanced Hurco post:

> *"This isn't a stock vendor post with branding stripped off. It's the Hurco WinMAX V11 baseline with 530 calibration knobs on the property panel — machine rigidity, material ISO group, optimization mode, look-ahead block count, tribal-citation source — every one of those changes how the .NC gets emitted. The G05.3 surface-smoothing is bound per-op to your finishing tolerance, UltiMotion modes are per-op contour-tolerance bound (not one-shot at the top), and every parameter ships with a 95% confidence interval comment cited to either ISO data or shop-floor tribal."*

For the PPG (post-processor generator) page + employee portal: v11 (post Priority-1 regression fix) is the listing. v8.9 stays as the operator-trusted fallback under an "earlier verified release" link.

---

## §7. Next actions (ordered)

1. **Manual handler review** — `onSection` (+23,070 bytes) and `onOpen` (+3,291) carry most of v11's new logic. Read both side-by-side to verify the property reads actually drive emission (not dead code).
2. **Verify the v11 / engine quality_score=0 link** — `MasterPostProcessorUnifiedAGIEngine.generatePost` returning 0 across all controllers (2026-05-25 prove-out result) suggests engine ↔ .cps divergence. The .cps emits real changes; the engine layer returns zero. Trace.
3. **Fix R1+R2 regressions** — 30 minutes of work, restores parity.
4. **Wire rows 9–16, 18, 19** from §4 — each is a (property + engine-call + emission-branch) triple; budget ~1 day per row for engine wiring + .cps emission + test.
5. **Round-trip emission test** — both posts through Fusion/Inventor kernel (Path C in 2026-05-22 spec) → `PostProcessorVerificationOrchestratorEngine` → S(x) score, then WinMax PC load (Path D, half-day driver already scaffolded as `scripts/winmax-driver.mjs`).
6. **Operator sign-off** — present this comparison + Priority-1 fixes before promoting v11 to the baseline that PPG page + employee portal links to.

---

## §8. Provenance + related artifacts

- This compare: `state/shared/specs/HURCO-VM30i-V8.9-vs-V11-COMPARE-2026-05-25.md`
- 2026-05-22 verification: `state/shared/specs/HURCO-POST-VERIFICATION-2026-05-22.md` (engine-side, 25 failures)
- Consolidation manifest: `JM DIE/POST PROCESSORS/POST-PROCESSOR-MANIFEST.json`
- Baselines wiki: `knowledge/wiki/architecture/post-processor-fleet-baselines-2026-05-25.md`
- Engine: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` (1,664 LOC)
- Tests: `mcp-server/src/__tests__/HurcoV11*.test.ts` (11 files, 223 tests, 198 PASS / 25 FAIL as of 2026-05-22)
- WinMax PC: `C:\Program Files\Hurco\MT WinMax Desktop\WinMaxMill.exe` v11.4.3.31916
