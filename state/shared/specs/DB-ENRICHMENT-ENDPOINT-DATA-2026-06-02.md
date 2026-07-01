# DB Endpoint-Data Enrichment — full field-depth roadmap (slot:juliett, 2026-06-02)

> Operator directive: "enrich databases with as much endpoint data for all prism app features … all databases need as much data as we can plug into our system." Plus: "utilize logic + knowledge of what we're building to cover everything, including data points I may have missed that would be crucial for PRISM."
> Method: 6-domain schema-depth gap Workflow (`wpdfr84d6`) for the enumerated wishlist + this domain-reasoning addendum for the **missed-but-crucial** fields. juliett owns the SCHEMA + ingestion; the owning slot populates VALUES (never fabricate — fail-loud null).

## A. Per-domain schema-depth gap (workflow `wpdfr84d6`, 6 agents — current-vs-wishlist)
Schemas are already substantial; gaps are precise additive typed fields. **juliett owns schema+ingestion; owning slot populates VALUES (null-on-unknown, never fabricate).**

| Domain | Cov | Backing store | GAP fields (add as typed optional) | Value owner |
|--------|-----|---------------|-------------------------------------|-------------|
| **Machines** | 47% | `MachineRegistry.ts` (Machine + sub-ifaces; gwizard/hsm JSON carry power_curve/taper/accel) | way_type · construction_type · build_type · static_rigidity(N/µm) · thermal_deformation · jerk · rotary_axis_config · spindle power_curve(typed) · controller_language · optional_equipment · table_mass · g-force envelope · **units field (25.4× guard)** | foxtrot/whiskey/shop-floor |
| **Materials** | 80% | `MaterialRegistry.ts` (1047 mats × 127 params) | hazards · cutting_recs PER TOOL · dry/wet first-class · heat-dissipation rating · **zod ingestion schema** | oscar/speed-feed |
| **WorkHolding** | 38% | `WorkholdingSelectionEngine` + workholding-catalog (NOT prism-reference-db) | jaw_type · jaw_hardness_hrc+material · clamp_torque_Nm · clamp_depth/parallels_height · fixture_stiffness_N/µm · overhang · low_support · cutting_force_vector{Fx,Fy,Fz} · compensation_strategy · clamp_force_required_N | cam/mill |
| **ToolHolder** ⭐ | 44% | `ToolHolderDatabaseEngine.ToolHolderSpec` + holder-categorization.ts (**juliett-owned**) | vendor · **clampingType** enum(mill_chuck/collet/side_lock/arbor/hydraulic/shrink_fit/weldon/drill_chuck) · qualityGrade · runout_um · balanceGrade(ISO 1940) · stability(stiffness/damping/max_projection) · maxLoad(axial/radial/bending) · clampTorque | **juliett (schema+values)** |
| **Tooling** | 55% | `ToolRegistry.CuttingTool` + CoatingDB + `*-tool-catalog.ts` | substrateClass · cornerType · endmillProfile/helix · insertStyle · insertSeat · pointType · tapStyle · reamerStyle · toolFamily | oscar + mill/lathe |
| **ToolPath** | 45% | `ToolpathStrategyRegistry` (762+ records) | algorithm(typed) · parameters(typed envelope) · finishClass · surfaceFinishTarget(Ra band) · applicableConditions · axisCapability | cam/kilo |

**Execution routing (parallel — each slot builds in its lane):** juliett → ToolHolder schema+values ⭐ + the §B0 cross-cutting backbone (units-tagged-field + relational-key + provenance type module) + Materials/Machines zod-ingestion schemas; foxtrot/whiskey/shop-floor → Machine values; oscar → Material cutting-data + Tooling geometry values; cam/mill → WorkHolding force/compensation; cam/kilo → ToolPath algorithm tags. Build order (R13): §B0 backbone → ToolHolder (juliett full-lane proof) → per-domain owning-slot population.

## B. CRUCIAL data points the wishlist MISSED (domain reasoning — PRISM's print-to-program + closed-loop + quoting mission)

### B0. Cross-cutting essentials (apply to EVERY DB — highest leverage)
1. **Units on every dimensional field** — inch vs mm tagged at the field level. The 25.4× error class is PRISM's #1 safety rail; a value without a unit is unusable. UNITS-FIRST.
2. **Relational JOIN keys between DBs** — the "endpoint data for all features" is impossible without the glue: Material(ISO group) ↔ Tool(recommended-for-material) ↔ Coating ↔ Holder(taper/interface) ↔ Machine(spindle taper, HP) ↔ Strategy(material-applicable). PRISM composes a full recommendation by traversing these edges — they must be first-class fields, not implicit.
3. **Provenance + confidence per data point** — source (vendor catalog / manual / physics-derived / shop-measured) + a confidence/verified flag. The AI must know verified-vs-estimated; fail-loud doctrine depends on it.
4. **Cost / economics** — machine $/hr, material $/volume, tool $/edge + tool-life, setup time. The saleable products (SFC + Master Post + quoting) need cost on every record.
5. **Closed-loop outcome-storage schema** — actual-vs-predicted fields so the shop-floor→ERP learning loop can WRITE back: measured Ra, observed tool wear/life, actual cycle time, scrap/rework, chatter-observed. Without storage fields the closed loop has nowhere to land.
6. **Schema versioning + migration** on every store (juliett doctrine).

### B1. Machines (beyond kinematics/envelope/ways/rigidity/thermal/spindle/controller)
- **ATC**: type, capacity, max tool Ø/length/weight, tool-change time (cycle-time + tool-selection gate).
- **Coolant system**: flood/TSC/MQL, **through-spindle pressure (psi)** (deep-hole-drill gate), tank capacity.
- **Spindle**: max RPM, **taper/interface (CAT/BT/HSK/Capto)** + **BIG-PLUS/dual-contact** (← ties to holder-categorization), runout/TIR, bearing/duty rating (S1/S6), thermal-growth comp.
- **Axis dynamics**: rapid + feed limits, **accel/jerk per axis** (cycle time + path feasibility), positioning accuracy + repeatability (achievable tolerance).
- **Capability flags**: # axes + simultaneous (3/3+2/4/5), **probing (spindle probe + tool-setter)** (closed-loop), rigid tapping, high-pressure-coolant, live-tooling/sub-spindle/bar-feeder/parts-catcher (lathe), pallet/automation.
- **Interpolation/post**: arc/NURBS/spline support, min programmable increment (post-processor relevant).

### B2. Materials (beyond props/hardness/machinability/params/hazards/chip/heat/dry-wet)
- **ISO 513 group** (P/M/K/N/S/H) — the join key (have via tool-material-categorization).
- **kc1.1 + mc exponent** (Kienzle), **Taylor n/C** (tool life) — THE physics inputs (from constants.ts, never inline).
- Thermal conductivity + specific heat (heat partition), CTE (in-process growth → tolerance).
- Work-hardening + built-up-edge tendency (feed-floor / min-vc), abrasiveness (wear rate).
- Tensile/yield (cutting + clamping force), **material condition/temper** (annealed/hardened/cast — same alloy machines differently).
- **Stock forms + standard sizes + cost/volume** (quoting + stock optimization), coolant compatibility/corrosion.

### B3. WorkHolding (beyond fixture/jaw/torque-vs-depth/rigidity/overhang/low-support/force-comp)
- **Grip force vs clamp pressure** (the actual holding-force calc vs cutting force), max workpiece weight/size, clamping range/jaw travel.
- Locating **repeatability/accuracy** (zero-point/dowel), workholding **deflection under cutting load** (accuracy), vibration damping.
- 5-sided **tool-approach clearance**, hydraulic/pneumatic pressure spec, soft-jaw-machining requirement, magnetic holding force (grinding).

### B4. ToolHolder (beyond connection/vendor/quality/type/stability/rpm/load/torque)
- **Gauge length / projection** (stickout → deflection L³ — the dominant accuracy driver), **balance grade (G2.5@rpm)** (high-RPM safety), **runout/TIR** (finish + tool life).
- **Taper size** + **pull-stud/retention-knob** + **dual-contact/BIG-PLUS** (← all from holder-categorization.ts — wire them in as real fields), coolant-through + pressure, collet/clamping range, weight (ATC), shrink-fit temp, stiffness/damping.

### B5. Tooling (beyond material/coating/design-per-family)
- **Geometry**: Ø, flute length, OAL, shank Ø, reach, # flutes, corner (chamfer/radius/flat), helix, rake/relief, edge prep (deflection + collision + finish).
- **Cutting data per material**: vc/fz/ap/ae ranges, chip-load min/max, max DOC, ramp/plunge capability (the SFC link — oscar lane).
- **Tool life** (Taylor n/C), coating layers/thickness/max-temp, substrate grade.
- Inserts: grade, chipbreaker, nose radius, IC, thickness. Drills: point angle, web-thin, parabolic flute, peck, through-coolant. Threading: pitch/form/infeed.
- **Cost + vendor PN + stock-on-hand** (quoting + tool-crib ↔ MachineDB ATC).

### B6. ToolPath (beyond types/algorithms/finish-vs-rough)
- **Applicable material groups** per strategy, engagement-angle/stepover/stepdown defaults, entry/exit (ramp/helix/plunge), climb vs conventional.
- **Achievable Ra** per strategy, chip-thinning compensation (adaptive), rest-machining/stock-awareness, collision/gouge method, 5-axis tool-axis control + lead/lag, link/retract strategy, feed optimization (corners/arcs).

### B7. First-class domains the wishlist omitted entirely
- **Tolerance/GD&T** (ToleranceDB) — IT grades, fits, geometric tolerances → process selection + achievable-by-machine. The print-to-program INPUT.
- **Surface finish** (Ra/Rz target) as a first-class requirement driving strategy + parameters.
- **Safety/S(x) inputs** (spindle power headroom, torque limits, collision envelopes) — the non-negotiable gate.

## C. Execution model
juliett: define + version the SCHEMA fields above (typed interfaces + zod, nullable-on-unknown, units-tagged) + ingestion. Owning slots populate VALUES (foxtrot/whiskey/shop-floor=machines · oscar/speed-feed=materials+tooling-cutting-data · cam/kilo=toolpath · cam/mill=workholding · juliett=tool-holder). Physics from constants.ts. Closed-loop fields feed india's training. Relational keys + units + provenance are the cross-cutting backbone — build those FIRST (they unlock "endpoint data for all features").

_Workflow `wpdfr84d6` field-level per-domain gaps merge into §A on completion._
