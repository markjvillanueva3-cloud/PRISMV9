# HM-REV: Impeller/Blisk Multi-Axis Coverage Scorecard + Skill Generation Plan

## Source Files Audited
- `H:/prism/mcp-server/src/engines/HyperMillMultiAxisEngine.ts` (657 LOC)
- `H:/prism/mcp-server/src/engines/MultiAxisPrintToProgramEngine.ts` (920 LOC)
- `H:/prism/mcp-server/src/engines/FiveAxisToolpathIntegrationEngine.ts` (1,360 LOC)
- `H:/prism/mcp-server/src/engines/TiltAngleOptimizationEngine.ts`
- `H:/prism/mcp-server/src/engines/ChatterStabilityLobeEngine.ts`
- `H:/prism/mcp-server/src/engines/ImpellerEngine.ts` (fluid design — NOT CAM)
- `H:/prism/mcp-server/src/data/hypermill-cam-tips-ext.ts` (1,300+ LOC, tips hm-118 to hm-160+)

---

## SCORE RESULTS (0-100)

### 1. Blade Cycle Coverage — SCORE: 72/100

**What exists:**
All 5 hyperMILL blade cycles are declared and parameterized in MULTI_AXIS_STRATEGIES:
- FBFX5 (Fillet) — stepover 0.15, full surface list
- FBPX5 (Platform) — stepover 0.20
- FBWX5 (Swarf) — triggered by wallAngleDeg 30-80°, no stepdown (correct — one-pass)
- FBTX5 (Top) — stepover 0.10
- FBGX5 (Tangent) — highest priority (12), stepover 0.10

**Gaps:**
- Required surfaces list is IDENTICAL for all 5 blade cycles. In practice FBTX5 and FBGX5
  do NOT need hub_surface — they only need blade tip/edge references. This causes
  unnecessary surface-definition checklist inflation.
- FBWX5 swarf trigger: wall angle check is correct but there is no "developable surface"
  check (doubly-curved surfaces gouge under swarf). The engine issues no warning for
  double-curvature blades (common in centrifugal compressor blades vs. axial turbine blades).
- No blade roughing cycle (BrX5) is registered. Only the 5 finishing/fillet blade cycles exist.
  Hub-to-shroud blade roughing is absent from the blade cycle group.
- No semi-finish blend pass between roughing and fillet finishing.
- FBGX5 "Tangent Cutting" is listed as point-contact with tangent-plane orientation —
  correct for axial turbine blades, but for high-camber centrifugal blades the engine
  provides no curvature-adaptive scallop control.

---

### 2. Impeller Channel Strategy — SCORE: 68/100

**What exists:**
3 roughing + 6 finishing + 1 probing cycle registered for impeller/blisk geometry.
- IrX5 (Standard Roughing): stepdown 0.8×D, stepover 0.4×D — reasonable
- IdX5 (Point Roughing): stepdown 0.5, stepover 0.3 — for deep/narrow channels
- ItmX5 (Tangent/Barrel Roughing): stepdown 0.6, stepover 0.35, barrel tool preferred for
  D≥8mm (correct MAXX Machining approach)
- IfX5 (Hub Finishing): stepover 0.15
- ItX5 (Fillet): stepover 0.10
- IpX5 (Point): stepover 0.10
- IkX5 (Flank): no stepover (single-pass swarf)
- IeX5 (Edge): no stepover (edge-specific)

**Gaps — CRITICAL:**
- **Open vs. closed channel discrimination is entirely absent.** Open impellers (no shroud ring,
  radial pumps) vs. closed/shrouded impellers (centrifugal fans, turbochargers) have
  fundamentally different strategies: closed impellers require tip clearance machining and
  shroud-surface collision avoidance. The engine treats them identically.
- **Hub-to-shroud flow direction not parameterized.** The channel flow ratio
  (hubShroudRatio) only triggers a "deep channel" warning at <0.3 — no strategy
  differentiation for radial-flow (90° turn) vs. mixed-flow vs. axial impellers.
- **Semi-finishing pass (pencil/residual) is missing.** After IrX5 roughing, going straight
  to IfX5 hub finishing leaves large stepdown corners. No rest-machining discriminator.
- **Blade leading/trailing edge transition** — the IeX5 cycle exists, but the engine provides
  no guidance on approach direction (axial vs. radial entry) or how to handle leading edge
  thinness relative to tool radius. For LE radius < tool_radius/3, special micro-routing is
  needed.
- **Splitter blade handling**: A warning is issued ("ensure splitter surfaces defined"),
  but there is no strategy adjustment — no second-pass sequencing or alternating strategy
  for channels with splitters (main blade then splitter blade channel, or simultaneous).

---

### 3. Blisk-Specific Handling — SCORE: 41/100

**What exists:**
- `blisk` appears as a valid `MultiAxisGeometry` type
- FBFX5, FBPX5, FBWX5, FBTX5, FBGX5 all list `["blade", "blisk"]` as applicable
- IrX5, IfX5, ItX5, IpX5, IkX5, IeX5, IcX5, IdX5, ItmX5 all list `["impeller", "blisk"]`
- One tribal knowledge tip (hm-129) mentions blisks: "Define hub, shroud, blade, splitter surfaces"

**Gaps — SEVERE:**
IBR (Integrally Bladed Rotor) machining is fundamentally different from assembled impellers:

1. **Disk machining before blade forming.** IBR/blisk manufacturing starts with a solid
   disk (titanium or nickel superalloy forging). The disk OD, bore, attachment features, and
   any rim geometry must be turned/milled before 5-axis blade forming begins. The engine
   has NO disk-profile roughing stage. The `turbine_root` feature in MultiAxisPrintToProgramEngine
   maps only to `indexed_contour` — not to the complex disk-slot rough/semi/finish sequence.

2. **No trochoidal disk slot roughing.** For blisk disk material removal between blade
   locations (the "plunge-trochoidal" or "wave roughing" approach), no cycle exists.
   This is the primary differentiator: blisk roughing requires axial plunge then radial
   wave passes, not standard spiral impeller roughing.

3. **Material: titanium/nickel.** Blisks are almost exclusively Ti-6Al-4V (ISO S) or
   IN718 (ISO S). The engine issues the ISO S generic warning ("reduce feeds 40%") but
   provides NO blisk-specific toolpath modifications:
   - No minimum engagement time limits (titanium work-hardening)
   - No heat accumulation warnings for thin blade proximity
   - No chip evacuation direction for vertical/radial blade orientation
   - No ISF (Improved Surface Finish) pass requirements per AS9100

4. **Blade root fillet geometry.** Blisk blade-to-disk fillets are critical fatigue zones
   with tight tolerances (often ±0.02mm). The IcX5 probing cycle exists but there is no
   blisk-specific fillet finishing strategy with adaptive feed rate based on remaining material.

5. **Datum scheme.** Blisks typically use the disk bore + face as datums with tight runout
   requirements. No workholding/datum awareness in the blisk path.

---

### 4. Barrel Cutter Integration — SCORE: 74/100

**What exists:**
- ItmX5 (Tangent Roughing) explicitly designed for barrel tools, preferred when D≥8mm
- `barrel_cutter` is a named tool_type in MultiAxisToolSelection
- `barrel_radius_mm` parameter in TiltAngleOptimizationEngine
- `barrel` | `lens` listed as tool_type in TiltAngleInput
- 10+ tribal tips (hm-118 to hm-119, hm-504 to hm-520 range) on MAXX Machining barrel
  cutter use, tilt calibration, Taguchi optimization, Weibull wear models
- Effective radius concept is present in TiltAngleOptimizationEngine

**Gaps:**
- **Barrel cutter effective radius formula is NOT wired to HyperMillMultiAxisEngine.**
  TiltAngleOptimizationEngine handles barrel, but HyperMillMultiAxisEngine uses a simple
  D≥8mm heuristic for ItmX5 selection — it does NOT calculate effective contact width
  from barrel radius, which is the actual determinant of step-over advantage.
- **No barrel cutter selection for finishing.** Only ItmX5 (roughing) uses barrel logic.
  For impeller blade finishing (IpX5 or FBGX5), barrel cutters dramatically reduce
  cycle time (60-80% per tip hm-118) but the engine always recommends ball endmill
  for these cycles.
- **Lens cutter geometry absent.** Lens cutters (convex face) for deep-undercut impeller
  channel finishing are not handled anywhere.
- **No step-over calculation from barrel radius.** The dominant advantage of barrel cutters
  is that step-over = f(barrel_radius, scallop_target) not f(D_tool). This formula is in
  TiltAngleOptimizationEngine but not in HyperMillMultiAxisEngine's output.

---

### 5. Thin Blade Physics — SCORE: 55/100

**What exists:**
- ChatterStabilityLobeEngine: full SLD generation (Altintas & Budak 1995), stable pockets,
  optimal RPM selection
- ChatterInput includes `radial_immersion_ratio` (critical for thin blade contact geometry)
- RegenerativeChatterPredictor, StochasticChatterEngine also exist
- TiltAngleOptimizationEngine handles interference-free zone calculation
- ToolDeflectionPredictionEngine, PartDeflectionEngine, ToolAssemblyDeflectionEngine exist

**Gaps:**
- **Blade wall thickness is NOT an input to any cycle in HyperMillMultiAxisEngine.**
  The engine has no parameter for blade wall thickness (0.5-2mm for thin blades).
  ChatterStabilityLobeEngine uses workpiece stiffness via FRF but has no auto-estimation
  of thin blade FRF from wall thickness + height + material.
- **No coupling between SLD and impeller cycle selection.** ChatterStabilityLobeEngine
  and HyperMillMultiAxisEngine are completely disconnected. There is no code path where
  ChatterStabilityLobeEngine output feeds into IrX5/IfX5 parameter selection.
- **Static deflection for thin blades not integrated.** PartDeflectionEngine exists but
  is not called from MultiAxisPrintToProgramEngine for blade features. A 1mm blade wall
  in titanium at 30mm height will deflect significantly under cutting forces — the engine
  never computes this or adjusts ap/ae accordingly.
- **No vibration mode shape awareness.** Thin blades have multiple vibration modes
  (bending, torsion, plate modes). The existing SLD engine treats the workpiece as a
  single-mode SDOF system. For blade-disk (blisk) coupled modes this is inadequate.
- **Damping strategies absent.** No knowledge of tuned mass dampers, passive blade
  damping (wax filling, low-melting alloy impregnation during machining), or fixture
  damping for thin section impellers.

---

### 6. Probing Integration — SCORE: 62/100

**What exists:**
- IcX5 (5X Impeller Probing) registered with full surface requirement list
- Goal `probing` is a valid MultiAxisGoal
- IcX5 description: "Verifies blade geometry against CAD model" — correct
- FAIEngine and MetrologyUncertaintyEngine exist in the broader system

**Gaps:**
- **IcX5 has zero unique parameters.** It shares the same requiredSurfaces, stepdown=null,
  stepover=null, cuttingMode="climb" as other cycles. A probing cycle should have:
  - Probe approach speed (distinct from cutting feed)
  - Measurement point density (how many points per blade surface)
  - Trigger type (touch, scanning)
  - Acceptance tolerance (blade profile tolerance, typically ±0.05-0.10mm for aerospace)
  - Compensation strategy (automatic datum shift, blade rework flag)
- **No adaptive loop.** The probing cycle is standalone — there is no code path where
  IcX5 results trigger re-machining of out-of-tolerance blades (in-process adaptive loop).
- **No leading/trailing edge probing.** LE/TE are the most critical aerodynamic features
  and the hardest to probe (sharp radii, fragile). No special LE/TE probe strategy.
- **No inter-blade comparison.** For impellers, blade-to-blade uniformity is as important
  as absolute position. No concept of comparing measured blade profiles across all N blades.
- **No integration with IcX5 → FAIEngine.** The FAI (AS9102) engine exists but
  is not connected to IcX5 probing output for aerospace first-article documentation.

---

## SUMMARY SCORECARD

| Dimension                | Score | Verdict              |
|--------------------------|-------|----------------------|
| Blade Cycle Coverage     | 72    | Solid foundation, missing roughing + gouge warnings |
| Impeller Channel Strategy| 68    | Good cycle set, missing open/closed + semi-finish   |
| Blisk-Specific Handling  | 41    | Critical gap — IBR disk roughing entirely absent    |
| Barrel Cutter Integration| 74    | MAXX tips strong, step-over formula not wired        |
| Thin Blade Physics       | 55    | SLD exists but disconnected from impeller cycles     |
| Probing Integration      | 62    | Cycle exists, parameters hollow, no adaptive loop    |
| **COMPOSITE**            | **62**| Below Omega=1.0 standard — action required          |

---

## SKILLS TO GENERATE

The following 6 skills should be built for impeller/blisk programming in hyperMILL.
Each skill maps to a specific gap above and integrates existing PRISM engines.

---

### SKILL 1: `impeller-channel-strategy`
**Trigger:** User asks about impeller roughing, channel strategy, open vs closed impeller
**Gap addressed:** Score #2 (Channel Strategy, -32 pts)
**What it does:**
1. Classifies impeller type: open (no shroud ring) vs. closed (shrouded) vs. semi-open
2. For open: recommends IrX5 → IdX5 rest → IfX5 → IeX5 sequence
3. For closed: adds shroud-surface collision avoidance warning + tip clearance finishing step
4. For high hub/shroud ratio (>0.6, shallow channel): prefers single IrX5 pass
5. For low ratio (<0.3, deep narrow): forces IdX5 point roughing with long-reach tool
6. Outputs blade count, splitter blade interleave sequence, channel flow direction
7. Feeds into `HyperMillMultiAxisEngine.calculate()` with correct geometry + goal

**Engine wiring:** HyperMillMultiAxisEngine → TiltAngleOptimizationEngine

---

### SKILL 2: `blisk-ibr-programming`
**Trigger:** User mentions blisk, IBR, integrally bladed rotor, disk-blade machining
**Gap addressed:** Score #3 (Blisk-Specific, -59 pts — most critical gap)
**What it does:**
1. **Phase 0 — Disk Prep:** Turning sequence for disk OD/bore, lathe strategy for disk profile
2. **Phase 1 — Trochoidal Disk Slot Roughing:** Between-blade material removal using plunge
   then radial wave passes. Maps to `IrX5` with modified ap (axial) pass structure.
3. **Phase 2 — Blade Roughing:** IrX5 or IdX5 based on channel geometry
4. **Phase 3 — Blade Semi-finishing:** IfX5 hub + IpX5 blade surfaces
5. **Phase 4 — Blade Root Fillet Finishing:** ItX5 with adaptive feed (remaining material aware)
6. **Phase 5 — Probing:** IcX5 with aerospace tolerances (±0.05mm profile, ±0.02mm fillet)
7. **Material:** Always ISO S (Ti-6Al-4V or IN718) — enforces low feed, climb milling,
   through-tool coolant, minimum 40% feed reduction vs. ISO P values
8. Outputs setup sheet with datum scheme (bore + face), runout requirements

**Engine wiring:** HyperMillMultiAxisEngine → MultiAxisPrintToProgramEngine (blisk_blade type) →
ChatterStabilityLobeEngine (blade-mode SLD) → IcX5 probing

---

### SKILL 3: `barrel-cutter-impeller`
**Trigger:** User asks about MAXX Machining, barrel cutters, step-over optimization, cycle time reduction
**Gap addressed:** Score #4 (Barrel Cutter Integration, -26 pts)
**What it does:**
1. Collects barrel cutter geometry: `barrel_radius_mm` (effective radius 100-500mm),
   `tip_radius_mm`, `taper_angle_deg`, `cutting_width_mm`
2. Computes optimal step-over from barrel geometry:
   `ae = 2 × sqrt(2 × R_barrel × h_scallop)` where h_scallop is target (typical 5-10μm)
3. Compares barrel step-over vs. ball endmill step-over — reports cycle time reduction factor
4. Determines tilt angle for contact zone maintenance (calls TiltAngleOptimizationEngine
   with `tool_type: "barrel"` and `barrel_radius_mm`)
5. Selects appropriate hyperMILL cycle:
   - Roughing: ItmX5 (Tangent Roughing)
   - Finishing: IpX5 or FBGX5 with barrel geometry override
6. Warns if surface is doubly-curved (barrel gouging risk) — requires concave radius check
   vs. barrel radius (barrel_radius < concave_radius required)
7. Outputs: tilt angle, step-over, estimated cycle time, scallop height confirmation

**Engine wiring:** TiltAngleOptimizationEngine (barrel mode) → HyperMillMultiAxisEngine →
HYPERMILL_IMPELLER_DEFAULTS enriched with barrel parameters

---

### SKILL 4: `thin-blade-vibration`
**Trigger:** User mentions thin wall, blade chatter, blade deflection, vibration in impeller
**Gap addressed:** Score #5 (Thin Blade Physics, -45 pts)
**What it does:**
1. Inputs: `blade_wall_thickness_mm` (0.5-10mm), `blade_height_mm`, `material_iso_group`,
   `blade_chord_mm`, `blade_count`
2. **Thin blade FRF estimation:** Cantilever plate model
   - `f_n = (π²/2L²) × sqrt(EI/ρA)` — first bending mode
   - Stiffness: `k = 3EI/L³` where I = (t³×c)/12, t=thickness, c=chord
3. Feeds estimated FRF into `ChatterStabilityLobeEngine` → stable lobe diagram
4. Identifies stable RPM pockets for IrX5/IfX5 operations
5. Computes static deflection at worst case ap/ae:
   `δ = F_cutting × L³ / (3EI)` — flags if >0.01mm (tolerance risk)
6. **Damping strategy recommendation:**
   - δ > 0.05mm: recommend wax impregnation of channels before finishing
   - Chatter risk high AND thin wall: recommend down-milling (conventional on suction side),
     reduced ae, increased axial passes
   - For blisks: recommend low-frequency spindle speed (avoid disk natural frequencies)
7. **Sequence adjustment:** Outputs modified ap/ae for each cycle stage, flagging
   blade-to-blade sequencing (machine alternate blades to equalize cutting forces)

**Engine wiring:** ChatterStabilityLobeEngine → PartDeflectionEngine (thin plate mode) →
HyperMillMultiAxisEngine (parameter override) → HYPERMILL_IMPELLER_DEFAULTS

---

### SKILL 5: `blade-probing-sequence`
**Trigger:** User asks about in-process blade measurement, probing after impeller machining,
  blade inspection, IcX5
**Gap addressed:** Score #6 (Probing Integration, -38 pts)
**What it does:**
1. Configures IcX5 probing parameters:
   - `probe_approach_speed_mm_min`: 500-2000 (not cutting speed)
   - `points_per_blade_surface`: 9-25 (3×3 to 5×5 grid, more for aerospace)
   - `trigger_type`: "touch" (Renishaw TP20) or "scanning" (Renishaw REVO)
   - `profile_tolerance_mm`: ±0.05 to ±0.15 (aerospace to commercial)
   - `fillet_tolerance_mm`: ±0.02 to ±0.05
2. **Blade-to-blade comparison:** Computes blade profile deviation across all N blades,
   reports max variation (uniformity spec, typically <0.03mm for aerospace)
3. **LE/TE probing strategy:** Approach from tangent direction to avoid probe tip crash
   on sharp edges; minimum 3 points per LE/TE profile for radius reconstruction
4. **Adaptive loop trigger:** If any blade exceeds tolerance:
   - Flag for re-machining (specific blade, specific surface)
   - Adjust datum offset for remaining blades if systematic error detected
5. **FAI output:** Maps probing data to AS9102 FAI format via FAIEngine integration
6. **Go/No-Go decision:** Pass if all blades within tolerance; fail triggers rework plan

**Engine wiring:** HyperMillMultiAxisEngine (IcX5) → FAIEngine → MetrologyUncertaintyEngine

---

### SKILL 6: `impeller-full-sequence`
**Trigger:** User wants complete impeller or blisk programming sequence, start-to-finish
**Gap addressed:** All 6 dimensions — orchestration skill
**What it does:**
Orchestrates skills 1-5 into a complete hyperMILL programming session:

```
STEP 1: Classify part (assembled impeller vs. blisk/IBR)
  → if blisk: invoke `blisk-ibr-programming` (disk prep + trochoidal + blade)
  → if impeller: invoke `impeller-channel-strategy` (open/closed + channel sequence)

STEP 2: Tool selection
  → Check blade wall thickness → invoke `thin-blade-vibration`
  → Determine barrel cutter viability → invoke `barrel-cutter-impeller`
  → Build tool list: roughing tool, semi-finish ball, finishing barrel/ball, fillet ball,
    edge tool, probe

STEP 3: Cycle sequence with hyperMILL cycle codes
  Roughing:     IrX5 → (if deep) IdX5 → (if barrel) ItmX5
  Semi-finish:  IfX5 (hub)
  Finishing:    IkX5 (flank/swarf for ruled blades) or IpX5 (point for freeform)
                IeX5 (leading/trailing edge)
                ItX5 (blade-hub fillet)
  Probing:      IcX5 → adaptive re-machine if needed

STEP 4: Physics validation
  → SLD check via ChatterStabilityLobeEngine for selected RPM
  → Deflection check via PartDeflectionEngine for thin blades
  → Barrel step-over confirmation via TiltAngleOptimizationEngine

STEP 5: Setup sheet generation
  → Datum scheme, fixturing, tool list, cycle codes, expected cycle time
  → For blisks: runout spec, AS9100 traceability note
```

**Engine wiring:** All 5 above skills + HyperMillMultiAxisEngine +
MultiAxisPrintToProgramEngine + ChatterStabilityLobeEngine + TiltAngleOptimizationEngine +
PartDeflectionEngine + IcX5 → FAIEngine

---

## IMPLEMENTATION PRIORITY ORDER

| Priority | Skill                      | Effort | Impact (gap closed) |
|----------|----------------------------|--------|---------------------|
| 1        | blisk-ibr-programming      | High   | +59 pts (Score #3)  |
| 2        | thin-blade-vibration       | Medium | +45 pts (Score #5)  |
| 3        | impeller-channel-strategy  | Low    | +32 pts (Score #2)  |
| 4        | blade-probing-sequence     | Medium | +38 pts (Score #6)  |
| 5        | barrel-cutter-impeller     | Low    | +26 pts (Score #4)  |
| 6        | impeller-full-sequence     | Low    | Orchestration       |

Build order: 3 → 5 → 1 → 4 → 2 → 6
(Foundation first: channel strategy + barrel, then blisk + probing, then physics, then orchestration)

---

## ENGINE GAPS REQUIRING CODE CHANGES (before skills can wire)

Before the skills above can be fully wired, these engine-level gaps must be addressed:

1. **HyperMillMultiAxisEngine**: Add `open_or_closed_channel` input parameter to
   `MultiAxisInput`, add `blade_wall_thickness_mm` field, differentiate requiredSurfaces
   by cycle (FBTX5/FBGX5 do not need hub_surface).

2. **HyperMillMultiAxisEngine**: Add barrel cutter effective step-over calculation using
   `ae = 2 × sqrt(2 × R_barrel × h_scallop)` for ItmX5 and IpX5 cycles.

3. **HyperMillMultiAxisEngine → ChatterStabilityLobeEngine bridge**: A thin-blade SLD
   pre-check should be called before issuing RPM recommendations for IrX5/IfX5.

4. **IcX5 cycle parameters**: Add probing-specific fields to `MultiAxisStrategy`:
   `probeSpeedMmMin`, `pointsPerSurface`, `acceptanceToleranceMm`.

5. **MultiAxisPrintToProgramEngine `autoOps()`**: `blisk_blade` currently maps to `5ax_blade`
   which selects ball_endmill only. Needs barrel_cutter option and IBR disk-roughing pre-op.

6. **ImpellerEngine.ts** (currently fluid design) should be separated from any CAM concern
   or explicitly namespaced so the CAM-side impeller logic is not confused with it.
