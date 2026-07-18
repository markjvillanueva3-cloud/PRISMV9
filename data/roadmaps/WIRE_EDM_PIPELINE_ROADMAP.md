# Wire EDM Print-to-Part Pipeline Roadmap (WEDM-P2P)

**Goal**: Build the complete pipeline from receiving an engineering drawing to shipping a finished wire EDM part — every decision physics-justified, every parameter optimized, every risk quantified. The same depth and rigor as POST-ULT but applied to the unique physics of electrical discharge machining.

**What makes wire EDM different from milling**: No cutting forces — material is removed by electrical spark erosion. No tool wear in the traditional sense (wire is consumed). Surface integrity is dominated by thermal damage (recast layer, HAZ, microcracks), not mechanical damage. Accuracy depends on wire deflection under discharge pressure, not tool deflection under cutting forces. Multi-pass strategy (rough → trim → finish) is mandatory for precision, not optional.

**Existing PRISM EDM assets**: 10 engines (~2,000 lines) — EDMEngine, EDMWireEngine, EDMParameterEngine, WireEDMSettingsEngine, SinkerEDMCalculatorEngine, StochasticEDMEngine, RecastLayerEngine, EDMSurfaceIntegrityEngine, MicroEDMEngine, ElectrochemicalMachiningEngine. 6 machines in catalog (Makino U6, U86, EDAF2, EDAF3). 16 dispatcher actions.

**Baseline**: 6 EDM machines, 18 workpiece materials, 6 electrode/wire types, 4 test files, stochastic EDM models already validated.

---

## The Wire EDM Print-to-Part Pipeline

```
ENGINEERING DRAWING / CAD MODEL
    ↓
[1] DRAWING INTERPRETATION ─── Feature recognition, GD&T extraction, EDM feature classification
    ↓
[2] FEASIBILITY ASSESSMENT ─── Conductivity check, geometry feasibility, tolerance achievability
    ↓
[3] MATERIAL ASSESSMENT ──── Electrical/thermal properties, recast risk, machinability classification
    ↓
[4] MACHINE SELECTION ─────── Which wire EDM, travel, tank size, controller, wire capability
    ↓
[5] WIRE SELECTION ─────────── Brass/coated/moly/tungsten, diameter vs corner radius vs height
    ↓
[6] START HOLE PLANNING ───── Pre-drill vs EDM start, diameter, location, quantity
    ↓
[7] WORKHOLDING & SETUP ──── Fixture design, datum alignment, leveling, submerge level
    ↓
[8] TOOLPATH STRATEGY ─────── 2-axis/4-axis, open/closed, approach/departure, corner strategy
    ↓
[9] MULTI-PASS PLANNING ──── Rough→semi→finish→super-finish, offset per pass, energy cascade
    ↓
[10] CUTTING PARAMETERS ──── Pulse on/off, current, voltage, servo, wire speed/tension per pass
    ↓
[11] FLUSHING STRATEGY ────── Submerged/spray, pressure, nozzle position, debris management
    ↓
[12] WIRE & SLUG MANAGEMENT ─ Threading, break prediction, tab placement, slug removal
    ↓
[13] CORNER & TAPER ────────── Wire lag compensation, over-travel, taper geometry (UV axes)
    ↓
[14] PROCESS MONITORING ───── Gap voltage, wire break, abnormal discharge, speed tracking
    ↓
[15] SURFACE INTEGRITY ────── Recast layer, HAZ, microcracks, residual stress, fatigue impact
    ↓
[16] POST-PROCESS PLANNING ── Recast removal, stress relief, shot peen, etch, coating
    ↓
[17] G-CODE GENERATION ────── EDM controller post (Fanuc/Sodick/Makino/Mitsubishi/AgieCharmilles)
    ↓
[18] QUALITY VERIFICATION ──── CMM, surface finish, recast inspection, GD&T compliance
    ↓
[19] COST ESTIMATION ────────── Machine time, wire, dielectric, post-ops, inspection, total
    ↓
[20] DOCUMENTATION ──────────── Setup sheet, tech table, inspection plan, safety notes
    ↓
FINISHED PART + COMPLETE JOB PACKAGE
```

---

## Wave 1: Drawing Interpretation & Feasibility

### WEDM-MS1: Drawing Interpretation for Wire EDM
**Units: 6 | Priority: P0**

Parse engineering drawings/CAD models to identify features that require wire EDM and extract all relevant specifications.

| Unit | Name | Description |
|------|------|-------------|
| U01 | EDMFeatureClassifier | Classify part features as EDM-specific: through-profiles (wire EDM), blind cavities (sinker EDM), small holes (hole-popper), or non-EDM. Wire EDM requires through-features — if a profile doesn't go all the way through, it can't be wire-cut |
| U02 | GDTExtractionForEDM | Extract GD&T callouts relevant to wire EDM: profile tolerances (±0.005mm typical), positional tolerances on profiles, surface finish requirements (Ra 0.2-3.2μm), perpendicularity of cut faces, flatness of cut surfaces |
| U03 | ToleranceToPassMapper | Map drawing tolerances to required number of EDM passes: Ra>3.2μm=1 pass (rough only), Ra 1.6-3.2=2 passes, Ra 0.8-1.6=3 passes, Ra 0.4-0.8=4 passes, Ra<0.4=5+ passes (mirror finish). Map dimensional tolerance to pass count: ±0.1mm=1 pass, ±0.05=2, ±0.025=3, ±0.01=4, ±0.005=5 |
| U04 | MaterialCalloutParser | Parse material specification from drawing: identify alloy, condition (annealed/hardened/heat-treated), hardness requirement. Flag materials with high carbon content (recast crack risk) or low conductivity (EDM difficulty) |
| U05 | PartThicknessAnalyzer | Determine workpiece thickness at each profile location. Thickness dramatically affects cutting speed (√(50/thickness) correction), wire tension requirements, flushing effectiveness, and wire break risk. Handle variable-thickness parts (stepped, tapered stock) |
| U06 | ProcessSelectionAdvisor | Recommend wire EDM vs. alternatives: if tolerance > ±0.05mm AND Ra > 1.6μm → milling may be faster. If blind cavity → sinker EDM. If non-conductive → laser/waterjet. If < 50μm features → micro EDM. Output: process recommendation with physics justification |

---

### WEDM-MS2: Feasibility & Geometry Assessment
**Units: 7 | Priority: P0**

Determine if the part CAN be wire-cut and identify geometric constraints.

| Unit | Name | Description |
|------|------|-------------|
| U01 | ConductivityVerifier | Verify material is electrically conductive (resistivity < 300 μΩ·cm for reliable EDM). Flag marginal conductors: some ceramics, composites, diamond. Warn for high-resistivity materials (Ti alloys: 178 μΩ·cm — slow but possible, vs. copper: 1.7 μΩ·cm — fast) |
| U02 | GeometryFeasibilityChecker | Check every profile for wire EDM feasibility: (a) is it a through-feature? (b) minimum inside corner radius ≥ wire radius + spark gap (0.13mm for 0.25mm wire), (c) minimum slot width ≥ wire diameter + 2× spark gap, (d) maximum part height within machine Z travel, (e) taper angle within machine UV capability |
| U03 | ToleranceAchievabilityEngine | Given material + thickness + machine + wire type: can we achieve the drawing tolerance? Model: achievable tolerance degrades with thickness (±0.003mm at 50mm → ±0.008mm at 200mm → ±0.015mm at 400mm). Factor in machine accuracy, wire type, and number of skim passes |
| U04 | StartHoleAccessChecker | For each closed profile: is there room for a start hole? Check minimum distance from start hole center to nearest feature edge (need ≥ wire radius + spark gap + 1mm safety). Identify profiles that can share start holes |
| U05 | TaperFeasibilityChecker | For tapered features: calculate required UV travel from taper angle and workpiece height. Check against machine UV limits (typically ±30mm). Flag impossible tapers. Calculate taper accuracy (wire guide distance matters — closer guides = better accuracy) |
| U06 | WireAccessAnalyzer | Can the wire physically reach all cut positions? Check for interference with clamps, fixtures, tank walls. Analyze wire path between profiles — can the wire traverse without colliding with already-cut features or free-standing slugs? |
| U07 | CuttingTimeFeasibilityEstimator | Quick feasibility estimate: total profile length × material factor × thickness factor × pass count. Compare against delivery deadline. Flag jobs that need multiple machines or 24/7 running. Wire EDM is SLOW (5-300 mm²/min MRR) — feasibility often comes down to time |

---

## Wave 2: Material, Machine & Wire Selection

### WEDM-MS3: Material Assessment for EDM
**Units: 5 | Priority: P0**

Comprehensive material characterization for EDM process optimization.

| Unit | Name | Description |
|------|------|-------------|
| U01 | EDMMachinabilityClassifier | Classify material EDM machinability: Class A (easy: aluminum, copper, brass — MRR factor 1.4-2.0), Class B (standard: tool steels D2/A2/H13, carbon steel — factor 1.0), Class C (moderate: stainless, titanium — factor 0.5-0.8), Class D (difficult: carbide, PCD, Inconel — factor 0.3-0.6) |
| U02 | ThermalPropertyResolver | Resolve thermal properties critical for EDM: melting point (determines energy needed), thermal conductivity (affects heat dissipation), thermal diffusivity (controls recast depth), specific heat capacity, latent heat of fusion. Source from material database or estimate from alloy composition |
| U03 | RecastRiskAssessor | Predict recast layer risk BEFORE cutting: carbon content (>0.4% C = high crack risk), pre-hardened vs. annealed (hardened = more brittle recast), alloy composition (chromium carbides = worse recast). Wire `RecastLayerEngine` for quantitative prediction. Output: recast depth estimate, crack probability, recommended skim passes for removal |
| U04 | ElectricalPropertyMapper | Map electrical properties: resistivity (affects spark gap voltage), dielectric breakdown voltage of material, secondary discharge risk (workpiece re-melting at low gap). Affect servo control strategy — high-resistivity materials need higher open voltage |
| U05 | HeatTreatmentStateChecker | Determine if material should be EDM'd before or after heat treatment. Rule: wire EDM hardened materials (HRC 45-65) is normal and preferred — EDM doesn't care about hardness. But pre-hardened parts may have internal stresses that cause distortion when material is removed. Recommend stress-relief between rough and finish if distortion risk is high |

---

### WEDM-MS4: Machine Selection & Wire Selection
**Units: 6 | Priority: P0**

Select the optimal wire EDM machine and wire type for the job.

| Unit | Name | Description |
|------|------|-------------|
| U01 | EDMMachineSelector | Match job requirements to available machines: (a) X/Y travel ≥ part envelope + start holes, (b) Z travel ≥ workpiece height + clearance, (c) UV travel ≥ taper requirement, (d) tank size ≥ workpiece + fixture, (e) controller has required features (auto-thread, taper, corner strategy). Score and rank machines. Extend catalog beyond current 6 Makino machines to include Sodick, Mitsubishi, AgieCharmilles, Accutex |
| U02 | WireTypeSelector | Select optimal wire: (a) Standard brass 0.25mm — default for general cutting, (b) Coated brass (zinc/diffusion-annealed) — 15-30% faster but more expensive, (c) Brass 0.20mm — for finer corners (min radius 0.11mm vs 0.13mm), (d) Molybdenum 0.10mm — for micro features (min radius 0.06mm), (e) Tungsten 0.05mm — for ultra-fine features. Decision matrix: required corner radius × workpiece height × material |
| U03 | WireDiameterOptimizer | Optimize wire diameter: larger wire = faster cutting (more discharge area) but larger minimum corner radius. Solve: what's the largest wire that still meets all corner radius requirements? If all corners ≥ 0.15mm → use 0.25mm. If some corners 0.08-0.15mm → use 0.20mm. If < 0.08mm → use 0.10mm moly |
| U04 | WireTensionCalculator | Calculate optimal wire tension for the job: higher tension = straighter wire = better accuracy, but too high = wire break. Tension depends on: wire material tensile strength, workpiece height (taller = more wire between guides = more deflection), cutting energy (higher discharge force needs more tension). Model: T_optimal = f(wire_UTS, height, discharge_energy) with safety factor 0.7 |
| U05 | WireConsumptionEstimator | Estimate total wire consumption: wire_length_m = cut_time_min × wire_speed_m_min. Convert to kg using wire density and diameter. Add 10% waste for threading, breaks, lead-in/out. Estimate cost: brass ~$8-15/kg, coated ~$15-25/kg, moly ~$80-120/kg |
| U06 | EDMControllerCapabilityMapper | Map controller capabilities per machine: Fanuc α-C (auto-thread, taper, corner control, power master), Sodick Mark IX/X (linear motors, SF-Liner, K-SMC), Makino Hyper-i (HS wire, anti-electrolysis, HyperCut), Mitsubishi M800 (tubular shaft motor, V500, optical fiber). Match capabilities to job requirements |

---

## Wave 3: Start Holes, Workholding & Setup

### WEDM-MS5: Start Hole Planning
**Units: 5 | Priority: P0**

Plan all start holes — the entry points for wire threading into closed profiles.

| Unit | Name | Description |
|------|------|-------------|
| U01 | StartHolePlanner | For each closed profile: determine start hole location (inside waste area, away from finish surfaces), diameter (typically 1.0-3.0mm — larger = easier threading but uses more stock), depth (must go through entire workpiece). Optimize: minimize number of start holes (can one hole serve multiple profiles?) |
| U02 | StartHoleMethodSelector | Choose method: (a) Conventional drill (fast, cheap, but size limited by drill availability and material hardness — can't drill hardened tool steel), (b) EDM hole popper (slow but works in any conductive material, any hardness), (c) Pre-existing hole (use existing bore/slot as start point). Decision: if material HRC > 45 → EDM hole popper required |
| U03 | StartHolePositionOptimizer | Optimize start hole position within waste area: (a) maximize distance from profile edges (wire doesn't cut straight at start), (b) minimize wire travel from start to profile approach point, (c) avoid thin walls between start hole and profile edge, (d) if multiple profiles share a waste area, place start hole to serve all profiles with minimum repositioning |
| U04 | StartHoleDrillingParams | If drilling: calculate drill parameters for the specific material. If EDM hole popping: calculate electrode diameter, rotation speed, flushing pressure, pecking depth. Estimate time for all start holes. For hardened materials: recommend EDM + electrode material (brass tube or copper tube) |
| U05 | ThreadingSequencePlanner | Plan wire threading sequence through all start holes: which profile to cut first (consider slug management — don't trap slugs), threading direction (top or bottom), auto-thread capability check, manual thread contingency. If machine has auto-thread: verify start hole diameter is compatible (typically ≥ 1.0mm for auto-thread) |

---

### WEDM-MS6: Workholding, Setup & Datum
**Units: 5 | Priority: P0**

Design fixturing and plan the complete machine setup.

| Unit | Name | Description |
|------|------|-------------|
| U01 | EDMFixtureDesigner | Design workholding for wire EDM: (a) magnetic chuck (for ferrous, flat bottom — most common), (b) precision vise (for rectangular stock), (c) 3R/Erowa pallet system (for repeat jobs — sub-micron repeatability), (d) dedicated fixture (complex shapes, multi-piece). Key constraint: fixture must not obstruct wire path or flushing nozzles. Must allow slug to fall free |
| U02 | DatumAlignmentPlanner | Plan datum alignment: (a) edge-finding with wire (touch X-face, Y-face, establish G54), (b) hole center-finding (for radial datum features), (c) optical probe (if machine equipped), (d) indicator alignment for angular datum. For wire EDM, Z-datum is typically top-of-part or bottom-of-part (affects cut direction) |
| U03 | WorkpieceLevelingGuide | Wire EDM requires the workpiece to be perfectly level — any tilt creates taper error. Plan: (a) indicate top surface with DTI (target < 0.005mm over part length), (b) shim and adjust, (c) for large parts, use leveling screws. Calculate: max tilt error that still meets profile tolerance |
| U04 | SubmergedLevelCalculator | Calculate dielectric fluid level: must cover top of workpiece by ≥ 20mm for submerged cutting. Too high = waste fluid and slow fill. Too low = spray flushing only (worse surface finish, more wire breaks). For tall parts: verify tank depth is sufficient. Calculate fill volume and time |
| U05 | SetupSequenceGenerator | Generate complete setup checklist: 1) Clean tank and fixtures, 2) Mount workpiece, 3) Level to < 0.005mm, 4) Set dielectric level, 5) Thread wire through first start hole, 6) Edge-find and set WCS, 7) Load technology table, 8) Verify first-move clearance, 9) Start cut with operator monitoring. Estimate total setup time |

---

## Wave 4: Toolpath Strategy & Multi-Pass Planning

### WEDM-MS7: Toolpath Strategy Engine
**Units: 7 | Priority: P0**

Generate optimal wire EDM toolpaths for all profile types.

| Unit | Name | Description |
|------|------|-------------|
| U01 | ProfileTypeClassifier | Classify each profile: (a) closed external (punch/die shape — wire cuts around outside), (b) closed internal (hole/pocket — wire cuts inside, slug falls out), (c) open profile (edge trim — no slug), (d) island (multiple nested profiles). Classification drives toolpath direction and slug management |
| U02 | CuttingDirectionOptimizer | Determine optimal cutting direction: CW vs CCW matters for wire EDM because wire deflects toward the discharge side. Convention: cut CW for external profiles (finish on outside), CCW for internal profiles (finish on inside). But material flow (debris) favors the opposite — optimize per job |
| U03 | ApproachDepartureGenerator | Generate lead-in and lead-out moves: (a) tangent arc approach (smooth entry, no witness mark), (b) perpendicular approach (simple but leaves mark), (c) angle approach (compromise). Lead length = typically 2-5mm. Lead-out should NOT re-enter the finished profile — use tangent departure into waste |
| U04 | CornerStrategySelector | For each corner in the profile: (a) sharp corner (wire pauses + over-travel to straighten), (b) radius corner (wire follows arc — minimum radius = wire_radius + spark_gap), (c) tangent blend (smooth transitions). For corners tighter than wire radius: impossible with this wire → recommend smaller wire or geometry change |
| U05 | TaperToolpathGenerator | For tapered profiles: calculate UV axis offsets from taper angle and workpiece height. `U_offset = tan(angle) × height / 2`, `V_offset = similar for Y-taper`. Handle variable taper (different angle on each segment). Check UV travel limits. Generate 4-axis toolpath (XY + UV simultaneous) |
| U06 | TabPlacementOptimizer | Place tabs (bridges) to prevent slugs from falling: (a) minimum 2 tabs per slug (for stability), (b) tab width: 0.3-1.0mm (must be small enough to remove but large enough to hold), (c) tab placement: on non-critical edges where tab witness mark is acceptable, (d) for heavy slugs: more/wider tabs. Calculate slug weight and required tab strength |
| U07 | CutSequenceOptimizer | Optimize the order of profile cuts: (a) cut inside profiles before outside profiles (maintain rigidity), (b) cut small features before large ones (thermal distortion management), (c) group profiles by start hole (minimize re-threading), (d) consider slug management — don't trap slugs behind cut profiles. Use graph-based sequencing with constraints |

---

### WEDM-MS8: Multi-Pass Strategy Engine
**Units: 8 | Priority: P0**

**This is the heart of wire EDM** — the multi-pass rough→trim→finish strategy determines accuracy, surface finish, and total cutting time.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PassCountDeterminer | Determine number of passes from tolerance + surface finish requirements: analyze drawing specs → lookup pass count table → output: {rough: 1, semi: N, finish: M, super_finish: K}. Wire `WireEDMSettingsEngine` skim count logic. Total passes typically 1-7 |
| U02 | RoughCutPlanner | Plan the first (rough) cut: maximum energy for speed, leaves 0.10-0.20mm stock per side for trim passes. Offset = wire_radius + spark_gap + stock_allowance. This is the slowest pass — all remaining passes are much faster (wire doesn't need to evacuate large amounts of material) |
| U03 | TrimPassCascadeEngine | Plan the cascade of trim (skim) passes: each pass reduces energy, removes less material, improves surface finish and accuracy. Model: Pass 1 offset=0.15mm, Pass 2=0.06mm, Pass 3=0.02mm, Pass 4=0.005mm. Energy reduces ~40% per pass. Speed increases ~50% per pass (less material to remove) |
| U04 | OffsetCompensationCalculator | Calculate wire offset for each pass: offset = wire_radius + spark_gap + remaining_stock. Spark gap varies by pass (rough: 15-20μm, semi: 8-12μm, finish: 3-5μm, super: 1-3μm). Wire `EDMParameterEngine` spark gap models. Total offset stack must converge to zero (last pass = final dimension) |
| U05 | EnergyPerPassOptimizer | Optimize discharge energy per pass for minimum total time while meeting finish/recast specs: rough = max energy within wire break limit, each subsequent pass = energy reduced to meet that pass's target Ra. Use `StochasticEDMEngine` for energy-to-Ra prediction: Ra ∝ E^0.33 × t_on^0.18 |
| U06 | PassTimeEstimator | Estimate cutting time per pass per profile: rough_time = profile_length × thickness / (MRR_rough × material_factor). Trim passes: time ≈ profile_length / trim_speed (much faster than rough because material removal is minimal). Sum all passes for total cut time. Wire consumption per pass |
| U07 | DistortionCompensationPlanner | For precision work: plan stress-relief between rough and finish passes. When the rough cut removes large amounts of material from hardened steel, internal stresses release → part distorts. Strategy: rough all profiles → remove from machine → stress relieve at 150-200°C → re-mount → trim to final dimension |
| U08 | AdaptivePassStrategy | Adaptive multi-pass: after rough cut, measure actual dimension → adjust trim offsets to compensate for any distortion. In-process measurement (touch probe or machine feedback) enables closed-loop accuracy. Calculate: if measured deviation = Δ, adjust next pass offset by -Δ |

---

## Wave 5: Cutting Parameters & Flushing

### WEDM-MS9: Cutting Parameter Optimization Engine
**Units: 7 | Priority: P0**

Optimize all electrical discharge parameters per pass per material.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PulseParameterOptimizer | Optimize pulse on-time (t_on), off-time (t_off), peak current (I_p) per pass. Rough: t_on=1-8μs, I_p=10-30A. Finish: t_on=0.1-0.5μs, I_p=1-5A. Wire existing `EDMParameterEngine` pulse data. Material-specific: titanium needs longer t_off (debris clearing), aluminum needs lower t_on (low melting point → excessive overcut) |
| U02 | ServoControlOptimizer | Optimize servo feed control: servo voltage (determines gap), servo speed (feed rate adaptation), short-circuit retract distance. Higher servo voltage = more stable but slower. Lower = faster but more wire breaks. Adaptive: start conservative, ramp up as cut stabilizes |
| U03 | WireSpeedOptimizer | Optimize wire feed rate per pass: rough = higher speed (8-12 m/min for brass, fresh wire for every discharge). Finish = can reduce speed (fewer discharges, less wire wear needed). Molybdenum: lower speed (2-4 m/min, wire is reused on reciprocating machines). Calculate wire consumption |
| U04 | DischargEnergyCalculator | Wire `StochasticEDMEngine`: E = V × I × t_on. Model energy distribution (not every discharge is identical — exponential energy distribution). Calculate: mean crater size, MRR, surface roughness from energy parameters. Include stochastic uncertainty bounds |
| U05 | TechnologyTableMapper | Map optimized parameters to machine-specific technology tables: Makino E-packs, Sodick SF tables, Mitsubishi STD files, Fanuc condition codes. Each machine vendor has their own parameter numbering system — translate PRISM physics-optimized parameters to the machine's native table format |
| U06 | WireBreakPredictor | Predict wire break probability: function of duty cycle, material, thickness, flushing effectiveness, wire tension, and wire type. Model: P(break) = 1 - exp(-λ × thickness × duty_cycle / flush_factor). Wire `StochasticEDMEngine` short-circuit probability model. Recommend parameter reduction when P(break) > threshold |
| U07 | CapacitanceCircuitOptimizer | For machines with RC (relaxation) circuits: optimize capacitance value for micro-finishing. C determines energy per discharge (E = 0.5 × C × V²). Lower C = finer finish but slower. Used for Ra < 0.4μm. Not all machines have RC circuit — flag when needed but not available |

---

### WEDM-MS10: Flushing Strategy Engine
**Units: 5 | Priority: P0**

Optimize dielectric flushing — critical for cut quality and wire break prevention.

| Unit | Name | Description |
|------|------|-------------|
| U01 | FlushingModeSelector | Select flushing mode: (a) submerged (best finish, fewer breaks, uniform flushing — preferred for finish cuts), (b) spray/jet (upper and lower nozzles, better debris evacuation for thick parts — preferred for rough cuts in tall parts), (c) combined (submerged + jet boost). Decision factors: part height, cut type (rough/finish), accessibility |
| U02 | NozzlePositionOptimizer | Optimize flushing nozzle position: (a) distance from workpiece face (closer = better flushing but collision risk), (b) for open profiles: nozzles can be close on both sides, (c) for closed profiles: inside nozzle may not fit — increase pressure. Optimal distance: 0.5-2mm from workpiece face for nozzles, workpiece must not block nozzle |
| U03 | FlushingPressureCalculator | Calculate optimal flushing pressure per pass: rough = higher pressure (8-15 bar for jet, 3-5 bar submerged) for debris evacuation. Finish = lower pressure (2-4 bar) to prevent wire vibration that degrades surface finish. Tall parts need higher pressure to flush through the full kerf height |
| U04 | DielectricConditionMonitor | Monitor and manage dielectric fluid: (a) conductivity (target: 2-10 μS/cm for deionized water), (b) temperature (target: 20±2°C — affects MRR and accuracy), (c) filtration (particle count affects recast quality), (d) deionizer resin life. Predict: when to change fluid, when to replace filters/resin |
| U05 | DebrisEvacuationModeler | Model debris particle flow in the spark gap: particle size distribution from discharge energy (craters → spherical debris 1-50μm), settling velocity in dielectric, gap flushing velocity required to prevent debris accumulation → secondary discharge (re-melting of debris). Critical for tall parts where flushing path is long |

---

## Wave 6: Wire Management, Corners & Taper

### WEDM-MS11: Wire & Slug Management Engine
**Units: 6 | Priority: P0**

Manage wire threading, break recovery, and slug handling.

| Unit | Name | Description |
|------|------|-------------|
| U01 | WireThreadingSequencer | Generate wire threading sequence: (a) initial thread through start hole, (b) re-thread after intentional cut (moving to new profile), (c) re-thread after wire break (auto or manual). Thread method: jet threading (water pressure pushes wire through start hole or kerf), mechanical threading (wire guide alignment). Generate controller codes for auto-thread |
| U02 | WireBreakRecoveryPlanner | Plan wire break recovery: (a) retract to last known good position, (b) re-thread, (c) back up along cut path by overlap distance (typically 2-5mm) to ensure clean reconnection, (d) resume cutting. Track break location to identify problem areas (tight corners, thick sections, debris accumulation zones) |
| U03 | SlugManagementEngine | Manage slugs (waste pieces): (a) predict slug weight from profile area × thickness × density, (b) verify slug can fall free (not trapped by fixture or other cuts), (c) for heavy slugs: add support tabs or manual intervention points, (d) slug ejection sequence (pause program, remove slug, resume). Safety: free-falling slugs can damage lower wire guide |
| U04 | TabCuttingSequencer | Plan tab removal: after all profiles are cut with tabs, return to each tab and cut it. Sequence: cut all tabs on one profile before moving to next (slug falls as last tab is cut). For precision parts: cut tabs with finish parameters (tab stub must meet profile tolerance). Generate tab-cutting subprogram |
| U05 | WireGuideManagement | Monitor wire guide wear: guides wear over time → wire position drifts → accuracy degrades. Track cutting distance per guide set, recommend replacement intervals (typically every 100-200 hours). Guide types: diamond (long life, expensive), sapphire (standard), carbide (economy) |
| U06 | AutoThreadingCapabilityCheck | Verify auto-threading will work: (a) start hole diameter ≥ minimum for auto-thread (typically 1.0mm), (b) dielectric level correct for jet threading, (c) wire tip condition (sharp, not kinked), (d) kerf clear of debris (for re-threading mid-cut). If auto-thread unreliable: plan for manual intervention and add operator alert points |

---

### WEDM-MS12: Corner Accuracy & Taper Engine
**Units: 6 | Priority: P0**

Master corner accuracy and taper cutting — the two hardest aspects of wire EDM.

| Unit | Name | Description |
|------|------|-------------|
| U01 | WireLagCompensator | Model and compensate wire lag: the wire bows in the direction of the cut due to discharge pressure. At corners, the wire must "straighten" before changing direction. Lag model: `lag = F_discharge × L² / (8 × T_wire)` where L=distance between guides, T=tension. Compensate by: over-travel past corner, dwell for wire to straighten, then proceed in new direction |
| U02 | CornerOverTravelCalculator | Calculate over-travel distance at each corner: depends on corner angle (sharper = more over-travel), wire lag amount, and required corner accuracy. Model: `over_travel = lag × sin(θ/2) / sin(θ)` where θ = corner angle. For 90° corners: over_travel ≈ lag. For sharp corners (< 30°): over_travel >> lag → may need multiple passes just for corner |
| U03 | CornerDwellTimeCalculator | Calculate dwell (pause) time at corners: wire must settle to zero deflection before changing direction. Dwell = f(wire_type, tension, height, discharge_energy). Higher tension = shorter dwell. Taller parts = longer dwell. Typical: 0.1-2.0 seconds per corner. Trade-off: longer dwell = better corner but slower cycle |
| U04 | TaperGeometrySolver | Calculate UV axis coordinates for taper cutting: given desired taper angle and workpiece height, compute the offset between upper and lower wire guide positions. `U = X_upper - X_lower = tan(α) × (guide_distance/2 ± workpiece_offset)`. Handle variable taper (different angle per segment). Generate 4-axis interpolation moves |
| U05 | TaperAccuracyPredictor | Predict achievable taper accuracy: depends on guide distance, wire diameter, wire tension, workpiece height within guides. Model: taper_error ∝ wire_diameter / guide_distance × height. For 10° taper on 50mm part with 0.25mm wire: error ≈ ±0.005mm at surface. For extreme tapers: error increases exponentially |
| U06 | VariableTaperProfileGenerator | Generate profiles with varying taper along the contour: e.g., 3° clearance on sides, 0° (straight) on top, 5° draft on bottom. Each segment needs different UV offsets. Interpolate between segments with smooth UV transitions. Handle corner behavior during taper changes |

---

## Wave 7: Process Monitoring & Surface Integrity

### WEDM-MS13: Process Monitoring & Adaptive Control
**Units: 5 | Priority: P1**

Real-time process monitoring and adaptive parameter adjustment.

| Unit | Name | Description |
|------|------|-------------|
| U01 | GapVoltageMonitor | Monitor spark gap voltage in real-time: normal discharge (40-80V), open circuit (no discharge — gap too large), short circuit (0V — wire touching workpiece). Track ratio: normal:open:short should be ~70:20:10. Too many shorts → retract and increase gap. Too many opens → advance and decrease gap |
| U02 | CuttingSpeedTracker | Track instantaneous cutting speed vs. predicted: if actual < 80% of predicted → investigate (debris accumulation, wire wear, material inclusion). If actual > 120% → material may be softer than expected or previous pass left less stock. Feed back to parameter adjustment |
| U03 | AbnormalDischargeDetector | Detect and classify abnormal discharges: (a) arcing (sustained discharge at one point → surface damage), (b) secondary discharge (debris re-melting → poor surface), (c) wire erosion (wire thinning → break imminent). Each type needs different response: reduce energy, increase flushing, retract and re-approach |
| U04 | AdaptiveParameterAdjuster | Adjust parameters in real-time based on monitoring: if wire break risk rises → reduce energy 10%, increase t_off, increase wire tension. If cut speed drops → increase servo speed, check flushing. If surface finish degrading → increase t_off (better debris clearing). Model: PID-style control loop on gap statistics |
| U05 | ThermalDriftCompensator | Compensate for thermal drift during long cuts: machine structure expands (steel: ~12 μm/m/°C), dielectric temperature changes affect spark gap. For multi-hour cuts: monitor ambient and dielectric temperature, apply compensation. Critical for parts with ±0.005mm tolerance on features cut hours apart |

---

### WEDM-MS14: Surface Integrity Assessment Engine
**Units: 6 | Priority: P0 (Safety Critical)**

Predict and manage thermal damage — the #1 quality concern in wire EDM.

| Unit | Name | Description |
|------|------|-------------|
| U01 | RecastLayerPredictor | Wire existing `RecastLayerEngine`: predict recast depth per pass from energy parameters. Rough cut: 10-30μm recast. After 1 skim: 7-20μm. After 2 skims: 4-12μm. After 3 skims: 2-5μm. After 4 skims: 0.5-2μm. Submerged flushing reduces recast by 25% vs. spray. Output: predicted recast depth after all planned skim passes |
| U02 | HAZDepthCalculator | Calculate heat-affected zone: HAZ ≈ 3× recast depth. Wire `RecastLayerEngine` HAZ model. HAZ causes: temper softening in hardened steels (loss of surface hardness), microstructural changes (martensite → retained austenite), grain growth. For tool steels at HRC 60: HAZ can reduce surface hardness by 5-10 HRC |
| U03 | MicrocrackPredictor | Wire `EDMSurfaceIntegrityEngine`: predict microcrack density and depth. Factors: carbon content (high C = more cracks), discharge energy, thermal shock (rapid quenching by dielectric). For D2 tool steel (2.1% C): high crack risk. For aluminum: almost zero crack risk (ductile, low C). Output: crack density rating and depth estimate |
| U04 | ResidualStressEstimator | Estimate residual stress in EDM surface: always tensile (thermal contraction of re-solidified layer). Magnitude: 200-800 MPa depending on energy and material. Higher energy = higher stress. Stress causes: reduced fatigue life (up to 70% reduction), potential delayed cracking. Wire `EDMSurfaceIntegrityEngine` stress models |
| U05 | FatigueLifeImpactCalculator | Calculate fatigue life reduction from EDM surface condition: combine recast depth, microcrack density, residual stress. For aerospace/medical: if fatigue reduction > 20% → MUST specify post-processing (shot peening restores 50-80% of fatigue life, chemical etch removes recast). Wire existing fatigue models |
| U06 | SpecComplianceChecker | Check against industry specifications: AMS 2628 (aerospace — 0μm recast allowed, 25μm max HAZ), medical device specs (5μm recast, 50μm HAZ), automotive (25μm recast acceptable). Given material + spec + planned passes → PASS/FAIL with recommendations for additional skim passes or post-processing |

---

## Wave 8: Post-Processing, G-Code & Documentation

### WEDM-MS15: Post-Process Planning Engine
**Units: 5 | Priority: P0**

Plan all operations after wire EDM to achieve final part requirements.

| Unit | Name | Description |
|------|------|-------------|
| U01 | RecastRemovalPlanner | Plan recast layer removal: (a) chemical etching (HF/HNO3 acid etch — removes 5-15μm per cycle, ~30 min per cycle), (b) lapping/polishing (mechanical removal, better control but slower), (c) electrochemical polishing (for complex geometries), (d) additional EDM skim passes (if machine is still available). Choose method based on material, required depth, accessibility |
| U02 | StressReliefPlanner | Plan stress relief if needed: (a) thermal stress relief (150-200°C for 1-2 hours for tool steels — below tempering temperature), (b) shot peening (compressive surface stress to counteract EDM tensile stress — +50-80% fatigue life recovery), (c) vibration stress relief (for large parts). Recommend based on application criticality and material |
| U03 | PostEDMInspectionPlanner | Plan inspection sequence: (a) dimensional (CMM — all GD&T features), (b) surface finish (profilometer — Ra, Rz, Rmax), (c) recast inspection (cross-section metallography — cut, mount, polish, etch, measure recast depth under microscope), (d) hardness (micro-indentation at surface and 50μm depth), (e) crack detection (fluorescent dye penetrant) |
| U04 | SurfaceTreatmentPlanner | Plan surface treatments: (a) PVD/CVD coating (TiN, TiAlN for wear resistance — common for die/mold EDM surfaces), (b) nitriding (for improved wear — must be done before coating), (c) chrome plating (for corrosion protection), (d) passivation (stainless steel). Consider: treatment temperature vs. part temper |
| U05 | PostProcessSequencer | Sequence all post-processing: EDM → stress relief → recast removal → inspection → hardness test → crack detection → surface treatment → final inspection → clean → package. Calculate total post-process time and cost. Flag critical path items |

---

### WEDM-MS16: Wire EDM G-Code Generation Engine
**Units: 7 | Priority: P0**

Generate controller-specific G-code for wire EDM machines — completely different from milling G-code.

| Unit | Name | Description |
|------|------|-------------|
| U01 | EDMControllerPostEngine | Base post processor for wire EDM controllers. Wire EDM G-code is fundamentally different: no spindle, no tool changes, no Z-depth — instead: wire threading codes, technology table selection, multi-pass offset management. Header: machine setup, wire type, tank level, threading sequence |
| U02 | FanucWireEDMPost | Fanuc α-C/α-Ci wire EDM controller: G-code with C-axis (wire offset per pass), technology tables (E-pack numbers), M50 (wire thread), M60 (wire cut), C offset registers, corner control (G61.1/G64). Generate: header → thread → rough pass → re-thread → trim passes → tab cuts |
| U03 | SodickWireEDMPost | Sodick Mark IX/X controller: proprietary format with condition codes (C### series), linear motor rapid positioning, SF-Liner servo. K-SMC auto-threader codes. Corner conditions (K parameters). Multi-pass with M10/M11/M12 codes |
| U04 | MakinoWireEDMPost | Makino Hyper-i controller: E-pack technology selection, HS wire mode, anti-electrolysis parameters, HyperCut finish conditions. Corner strategy codes. Wire threading M-codes. Submerged/spray flushing codes |
| U05 | MitsubishiWireEDMPost | Mitsubishi M700/M800: V500 conditions, tubular shaft drive rapids, optical fiber servo, power master technology tables. D-code offsets per pass. Corner strategy registers |
| U06 | AgieCharmillesWireEDMPost | AgieCharmilles CUT series: ISPG/IPG generator conditions, ACO (Automatic Cut Optimization), TAPER-EXPERT codes, wire threading (M50 series). Corner EXPERT conditions |
| U07 | MultiPassGCodeOrchestrator | Orchestrate multi-pass G-code: generate complete program with all passes sequenced. Pass 1 (rough) → wire offset D01 → cut all profiles with tabs. Pass 2 (trim 1) → wire offset D02 → re-cut all profiles (wire follows previous kerf — much faster). Pass 3-N → decreasing offsets. Tab cuts as final pass. Handle re-threading between profiles if needed |

---

### WEDM-MS17: Cost Estimation Engine
**Units: 5 | Priority: P0**

Comprehensive cost estimation for wire EDM jobs.

| Unit | Name | Description |
|------|------|-------------|
| U01 | MachineTimeCostCalculator | Calculate machine time cost: cutting_time × machine_rate (typically $40-120/hr for wire EDM). Include: setup time (1-4 hours), cutting time (from PassTimeEstimator), tab cutting, wire threading time, idle time between profiles. Night/weekend unattended running reduces effective rate |
| U02 | WireCostCalculator | Calculate wire consumption cost: wire_length_m = total_cut_time × wire_speed. Cost = length × $/m (brass ~$0.02/m, coated ~$0.04/m, moly ~$0.15/m). For a typical job: 50-200m of wire. Long jobs on thick parts: 500-2000m |
| U03 | ConsumablesCostCalculator | Calculate consumable costs: (a) dielectric water/fluid (deionization resin replacement), (b) filters (paper, cartridge — replace when differential pressure exceeds limit), (c) wire guides (diamond guides: $50-200 each, replace every 100-200 hours), (d) power nozzles (ceramic, replace when worn), (e) electrode tubes for start holes |
| U04 | PostProcessCostCalculator | Calculate post-processing costs: (a) recast removal (chemical etch: $50-200 per batch depending on size), (b) stress relief heat treatment ($100-500 depending on furnace run), (c) shot peening ($50-150 per part), (d) inspection (CMM: $100-300/hr, metallography: $200-500 per cross-section), (e) surface treatment (PVD coating: $100-500 depending on size/batch) |
| U05 | TotalJobCostAggregator | Aggregate all costs: material (stock), start hole drilling/EDM, setup, machine time, wire, consumables, post-processing, inspection, overhead, margin. Output: cost per part at quantities 1, 5, 10, 25, 100. Show cost breakdown pie chart data. Compare to alternative processes (milling + grinding, laser, waterjet) |

---

### WEDM-MS18: Documentation & Setup Sheet Engine
**Units: 5 | Priority: P1**

Generate complete job documentation package.

| Unit | Name | Description |
|------|------|-------------|
| U01 | EDMSetupSheetGenerator | Generate wire EDM setup sheet: machine, wire type/diameter, dielectric type/level, workpiece material/dimensions, fixture type, datum location, start hole locations/sizes, technology table references, estimated run time. Printable format for operator |
| U02 | TechnologyTableReference | Generate technology table reference card: per-pass parameters (current, on-time, off-time, voltage, servo, wire speed, tension, flushing pressure). Map to machine-native table numbers. Include skim cut offset values per pass |
| U03 | CutSequenceDocumentation | Document the cutting sequence: which profile first, wire path between profiles, where tabs are placed, when to stop for slug removal, when to re-thread. Include estimated time per profile and per pass. Visual: profile order diagram with numbered sequence |
| U04 | InspectionPlanGenerator | Generate inspection plan: what to measure, what tolerance, what instrument (CMM, comparator, surface tester), when to measure (after rough, after finish, after post-process). Include measurement points diagram. Reference drawing callouts |
| U05 | SafetyNotesGenerator | Generate safety notes: (a) dielectric fluid handling (deionized water is non-hazardous, oil-based is flammable), (b) electrical hazards (high voltage during discharge), (c) sharp edges on EDM surfaces, (d) slug handling (heavy slugs, sharp edges), (e) fume extraction if cutting certain materials (beryllium copper, lead-containing alloys) |

---

## Wave 9: Quality, Learning & Integration

### WEDM-MS19: Quality Verification Engine
**Units: 5 | Priority: P0**

Verify finished part meets all specifications.

| Unit | Name | Description |
|------|------|-------------|
| U01 | DimensionalVerificationPlanner | Plan CMM measurement routine: probe all GD&T features, compare to nominal ± tolerance. For wire EDM: measure profile at multiple Z-heights (top, middle, bottom) to check for taper error, barrel error, or hourglassing. Calculate: Cpk from measurement data if batch production |
| U02 | SurfaceFinishVerifier | Verify surface finish meets spec: predict Ra from cutting parameters (existing StochasticEDMEngine), compare to drawing requirement. If measurement available: record actual vs. predicted, feed back to calibrate model. For each profile face: predict Ra at that pass's energy level |
| U03 | ProfileAccuracyAnalyzer | Analyze profile accuracy: compare actual cut profile (from CMM data) to nominal. Identify: corner radius deviations, straightness errors (wire bow), taper errors, position errors. Root cause analysis: corner error → wire lag compensation needed, straightness error → wire tension or guide wear |
| U04 | RecastComplianceVerifier | Verify recast layer compliance: if spec requires recast < N μm, verify that planned skim passes + flushing mode will achieve it. If metallography data available: compare actual recast to prediction, calibrate model. For aerospace: this is a mandatory hold point — parts cannot ship without recast verification |
| U05 | FirstArticleReportGenerator | Generate first-article inspection report: all dimensions measured vs. nominal, surface finish measurements, recast inspection results (if applicable), hardness readings, all pass/fail determinations. Format per AS9102 (aerospace) or PPAP (automotive) |

---

### WEDM-MS20: Pipeline Orchestrator & Learning
**Units: 5 | Priority: P0**

Orchestrate the complete print-to-part pipeline and learn from results.

| Unit | Name | Description |
|------|------|-------------|
| U01 | WireEDMPipelineOrchestrator | Chain all 19 milestones into a single pipeline: Drawing Interpretation → Feasibility → Material → Machine/Wire Selection → Start Holes → Workholding → Toolpath → Multi-Pass → Parameters → Flushing → Wire/Slug Management → Corner/Taper → Monitoring → Surface Integrity → Post-Process → G-Code → Cost → Documentation → Quality. Each stage receives output from previous stages. Stage-gate: feasibility check can abort pipeline early |
| U02 | JobHistoryTracker | Track historical job data: material, thickness, machine, wire, parameters, cut time (predicted vs actual), surface finish (predicted vs actual), dimensional accuracy, wire breaks, post-processing. Build database for learning and prediction |
| U03 | ParameterLearningEngine | Learn from job history: (a) calibrate MRR predictions from actual cut times, (b) calibrate Ra predictions from actual measurements, (c) calibrate wire break predictions from actual break frequency, (d) learn material-specific speed corrections. Bayesian updating: prior (physics model) + likelihood (observed data) → posterior (calibrated model) |
| U04 | SimilarJobRecommender | When a new job arrives: search history for similar jobs (same material, similar thickness, similar tolerances). Recommend: machine, wire, parameters based on best historical outcome. Confidence score based on similarity match quality |
| U05 | ContinuousImprovementTracker | Track key metrics over time: cycle time accuracy (predicted/actual ratio), surface finish accuracy, dimensional accuracy, wire break rate, cost accuracy. Identify systematic biases. Generate monthly improvement report. Flag when model calibration drift exceeds threshold |

---

## Summary

| Wave | Milestones | Units | Focus |
|------|-----------|-------|-------|
| 1 — Interpretation & Feasibility | MS1-MS2 | 13 | Drawing interpretation, geometry feasibility, process selection |
| 2 — Material, Machine & Wire | MS3-MS4 | 11 | Material assessment, machine selection, wire optimization |
| 3 — Start Holes & Setup | MS5-MS6 | 10 | Start hole planning, workholding, datum alignment |
| 4 — Toolpath & Multi-Pass | MS7-MS8 | 15 | Profile toolpaths, multi-pass rough→finish strategy |
| 5 — Parameters & Flushing | MS9-MS10 | 12 | Pulse optimization, flushing, debris management |
| 6 — Wire, Corners & Taper | MS11-MS12 | 12 | Wire management, slug handling, corner accuracy, taper geometry |
| 7 — Monitoring & Surface | MS13-MS14 | 11 | Process monitoring, recast/HAZ/microcrack prediction |
| 8 — Post-Process, G-Code & Cost | MS15-MS18 | 22 | Post-processing, EDM controller posts, cost, documentation |
| 9 — Quality & Learning | MS19-MS20 | 10 | Quality verification, pipeline orchestration, continuous learning |
| **Total** | **20** | **116** | |

---

## Existing Engine Integration Map

Shows which existing PRISM EDM engines feed into which pipeline stages:

| Existing Engine | Lines | Pipeline Stages |
|----------------|-------|-----------------|
| `EDMEngine` | 294 | MS9 (cutting speed, wire feed, tension), MS10 (flushing) |
| `EDMWireEngine` | 132 | MS4 (wire types), MS9 (discharge energy, taper capability) |
| `EDMParameterEngine` | 196 | MS9 (pulse parameters), MS8 (MRR per pass) |
| `WireEDMSettingsEngine` | 199 | MS8 (skim count from Ra), MS4 (wire data), MS9 (speed factors) |
| `SinkerEDMCalculatorEngine` | 364 | MS3 (material database — 18 workpieces), MS4 (machine context) |
| `StochasticEDMEngine` | 337 | MS9 (energy distribution), MS14 (recast stochastic), MS8 (Ra prediction) |
| `RecastLayerEngine` | 203 | MS14 (recast depth), MS15 (removal planning), MS19 (compliance) |
| `EDMSurfaceIntegrityEngine` | 214 | MS14 (microcracks, stress, fatigue), MS15 (post-process mandate) |
| `MicroEDMEngine` | 156 | MS2 (micro-feature feasibility), MS4 (micro-wire selection) |
| `ElectrochemicalMachiningEngine` | 300 | MS1 (process selection — ECM as alternative) |

---

## Physics Models Required (New)

| Model | Formula | Application |
|-------|---------|-------------|
| Wire lag | `δ = F × L² / (8T)` | MS12 corner compensation |
| Corner over-travel | `OT = δ × sin(θ/2) / sin(θ)` | MS12 corner accuracy |
| Taper UV offset | `U = tan(α) × H/2` | MS12 taper geometry |
| Tolerance vs thickness | `tol = k₀ + k₁×√H` | MS2 achievability |
| Skim Ra reduction | `Ra_n = Ra_0 × 0.4^n` | MS8 pass planning |
| Wire break probability | `P = 1-exp(-λ×H×DC/FF)` | MS9 safety |
| Debris settling | `v_s = (ρ_p-ρ_f)×g×d²/(18μ)` | MS10 flushing |
| Recast thermal penetration | `d = 2√(α×t_on)` | MS14 recast depth |
| Fatigue debit | `ΔN_f = min(70%, d_rc×1.2 + σ_r×0.02)` | MS14 fatigue |
| MRR from energy | `MRR = η×E×f/(ρ×(c×ΔT+L_m))` | MS9 material removal |

---

## Critical Path

```
MS1 (Drawing) → MS2 (Feasibility) → MS3 (Material)
                                          ↓
    MS4 (Machine/Wire) → MS5 (Start Holes) → MS6 (Setup)
                                                  ↓
    MS7 (Toolpath) → MS8 (Multi-Pass) → MS9 (Parameters)
                                              ↓
    MS10 (Flushing) → MS11 (Wire/Slug) → MS12 (Corner/Taper)
                                                ↓
    MS14 (Surface Integrity) → MS15 (Post-Process) → MS16 (G-Code)
                                                          ↓
                              MS17 (Cost) → MS18 (Docs) → MS19 (Quality)
                                                               ↓
                                                     MS20 (Orchestrator)
```

**Parallel tracks**: MS13 (Monitoring) can proceed independently once MS9 is done.

---

## What Makes This Different From Other Wire EDM Systems

1. **Physics-first parameter selection** — not just looking up a technology table, but calculating discharge energy from material thermal properties, predicting MRR from stochastic models, and selecting skim passes from Ra physics
2. **Recast layer is a first-class citizen** — tracked from initial planning through every pass to post-processing. Not an afterthought
3. **Wire break prediction** — probabilistic model prevents breaks before they happen by adjusting parameters
4. **Corner accuracy from physics** — wire lag model drives over-travel and dwell calculations, not just "use corner mode 3"
5. **Integrated post-processing** — the pipeline doesn't stop at G-code. Recast removal, stress relief, inspection — all planned and costed
6. **Continuous learning** — Bayesian calibration from actual job data improves predictions over time
7. **Complete cost model** — wire, consumables, electricity, post-processing, inspection. Not just machine time
8. **Multi-controller support** — Fanuc, Sodick, Makino, Mitsubishi, AgieCharmilles. Real post processors, not generic G-code
