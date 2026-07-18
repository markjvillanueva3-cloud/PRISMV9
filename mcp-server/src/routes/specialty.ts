import { Router } from "express";
import type { CallToolFn } from "./index.js";

/**
 * Specialty-process REST bridge for the SPA (forming / grinding / welding).
 *
 * U-FE-SPECIALTY-CONTRACT (slot:sierra 2026-06-18). The SPA's
 * web/src/api/{grinding,forming,welding}.ts POST to /api/v1/{domain}/{endpoint}
 * and cast the WHOLE response body to their result type. The prior router
 * called 6 aspirational actions that do not exist on the dispatchers, so it was
 * never mounted (index.ts deferral marker).
 *
 * This router serves the GRINDING cluster against the REAL prism_grinding
 * actions (grinding_force, surface_finish_predict, wheel_select, dress_params)
 * with faithful param/result adapters -- every adapter line documents its source
 * field. Fields a real engine does NOT produce are OMITTED (left undefined), not
 * fabricated; the two derived fields (wheel_wear_ratio = 1/G, burn_risk label)
 * are flagged inline.
 *
 * forming/* and welding/* return 501 with the VERIFIED contract finding (the
 * code-archaeology map): they need either a not-yet-wired engine
 * (InjectionMoldingEngine for /forming/molding), a new NDT engine
 * (/welding/inspection), or per-endpoint adapters whose result types span
 * multiple engines (deferred to U-FE-SPECIALTY-{FORMING,WELDING}-CONTRACT).
 * A 501-with-reason is fail-loud (R12) and strictly more informative to the
 * frontend than the silent 404 it returns today.
 */

// AtomicValue-or-bare reader. prism_grinding force/finish engines return
// AtomicValue objects ({value, unit, source, ...}); slimResponse keeps them as
// nested objects (it only strips null/undefined/empty-array). wheel_select /
// dress_params return bare numbers. atom() reads either shape safely.
function atom(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "object" && typeof v.value === "number" && Number.isFinite(v.value)) return v.value;
  return undefined;
}

// Frontend GrindingParams.operation -> engine GrindingMode enum
// (surface | cylindrical_external | cylindrical_internal | creep_feed | centerless).
const OPERATION_TO_MODE: Record<string, string> = {
  surface: "surface",
  cylindrical: "cylindrical_external",
  internal: "cylindrical_internal",
  centerless: "centerless",
};

// Present the engine's numeric burn_risk (0..1) as the string label the SPA
// GrindingResult.burn_risk expects. Labels a REAL computed number -- not a proxy.
function burnLabel(risk: any): string | undefined {
  const r = atom(risk);
  if (r == null) return undefined;
  if (r < 0.3) return "low";
  if (r < 0.6) return "moderate";
  if (r < 0.85) return "high";
  return "severe";
}

// A dispatcher error surfaces as { error } from callTool. Map to a 400 with the
// SPA-facing `message` field its api client reads (res.json().message).
function isToolError(r: any): r is { error: string } {
  return r != null && typeof r === "object" && typeof r.error === "string";
}

// Frontend free-string SheetMetalParams.material -> PressBrakeEngine's 6-material enum
// (mild_steel | stainless_304 | aluminum_5052 | aluminum_6061 | copper | brass). Unmapped
// names fall back to the engine's own default (mild_steel) -- the adapter does NOT invent the
// tensile/yield the engine derives from this table, so this mapping IS the faithful contract
// surface. Keys are normalized (lowercase, spaces/dashes -> underscore) before lookup.
const SHEET_MATERIAL_TO_ENUM: Record<string, string> = {
  mild_steel: "mild_steel", steel: "mild_steel", carbon_steel: "mild_steel", a36: "mild_steel", cold_rolled_steel: "mild_steel",
  stainless: "stainless_304", stainless_304: "stainless_304", stainless_steel: "stainless_304", ss304: "stainless_304", "304": "stainless_304", "304_stainless": "stainless_304",
  aluminum: "aluminum_6061", aluminium: "aluminum_6061", al: "aluminum_6061", aluminum_6061: "aluminum_6061", aluminium_6061: "aluminum_6061", "6061": "aluminum_6061",
  aluminum_5052: "aluminum_5052", aluminium_5052: "aluminum_5052", "5052": "aluminum_5052",
  copper: "copper", cu: "copper",
  brass: "brass",
};
function sheetMaterialEnum(m: any): string {
  const key = String(m ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return SHEET_MATERIAL_TO_ENUM[key] ?? "mild_steel";
}

// 1 metric tonne-force = 9.80665 kN (standard gravity). PressBrakeEngine reports tonnage in
// tonnes; the SPA SheetMetalResult.bending_force_kN wants kilonewtons.
const TONNE_FORCE_TO_KN = 9.80665;

// ---- WELDING free-string -> engine-enum mappers (each maps the SPA's loose string to the
// exact enum its target engine accepts; unmapped -> the engine's own safe default). --------
// SPA WeldingParams.process -> WeldingEngine WeldProcess (AWS process code).
const WELD_PROCESS_TO_ENUM: Record<string, string> = {
  mig: "gmaw", gmaw: "gmaw", mag: "gmaw", gas_metal_arc: "gmaw",
  tig: "gtaw", gtaw: "gtaw", gas_tungsten_arc: "gtaw",
  stick: "smaw", smaw: "smaw", mma: "smaw", arc: "smaw", shielded_metal_arc: "smaw",
  flux: "fcaw", fcaw: "fcaw", flux_core: "fcaw", flux_cored: "fcaw",
  sub_arc: "saw", saw: "saw", submerged_arc: "saw",
  laser: "laser", lbw: "laser",
  eb: "electron_beam", ebw: "electron_beam", electron_beam: "electron_beam",
};
function weldProcessEnum(v: any): string {
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return WELD_PROCESS_TO_ENUM[k] ?? "gmaw";
}
// SPA joint_type -> WeldDistortionEngine joint enum.
const WELD_DISTORTION_JOINT: Record<string, string> = {
  butt: "butt", groove: "butt",
  fillet: "fillet_t", fillet_t: "fillet_t", tee: "fillet_t", t: "fillet_t", t_joint: "fillet_t",
  lap: "fillet_lap", fillet_lap: "fillet_lap", lap_joint: "fillet_lap",
  corner: "corner",
};
function weldDistortionJoint(v: any): string {
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return WELD_DISTORTION_JOINT[k] ?? "fillet_t";
}
// SPA material -> WeldDistortionEngine material enum.
const WELD_DISTORTION_MATERIAL: Record<string, string> = {
  mild_steel: "mild_steel", steel: "mild_steel", carbon_steel: "mild_steel", a36: "mild_steel",
  stainless: "stainless", stainless_304: "stainless", stainless_steel: "stainless", ss304: "stainless", "304": "stainless", "316": "stainless",
  aluminum: "aluminum", aluminium: "aluminum", al: "aluminum",
  high_strength: "high_strength", hsla: "high_strength", high_strength_steel: "high_strength",
};
function weldDistortionMaterial(v: any): string {
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return WELD_DISTORTION_MATERIAL[k] ?? "mild_steel";
}
// SPA filler_material -> WeldStrengthEngine electrode enum (undefined -> engine default E70).
const WELD_ELECTRODE: Record<string, string> = {
  e60: "E60", e6010: "E60", e6011: "E60", e6013: "E60",
  e70: "E70", e7018: "E70", e7014: "E70", e70s: "E70", er70s: "E70", er70s_6: "E70",
  e80: "E80", e8018: "E80", er80s: "E80",
  e90: "E90", e9018: "E90",
  e110: "E110", e11018: "E110",
};
function weldElectrode(v: any): string | undefined {
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return WELD_ELECTRODE[k]; // undefined -> WeldStrengthEngine defaults to E70
}
// SPA joint_type -> WeldStrengthEngine weld_type enum.
const WELD_STRENGTH_TYPE: Record<string, string> = {
  butt: "butt_full", groove: "butt_full", butt_full: "butt_full", full_penetration: "butt_full",
  butt_partial: "butt_partial", partial_penetration: "butt_partial",
  fillet: "fillet", tee: "fillet", t: "fillet", lap: "fillet", corner: "fillet",
  plug: "plug",
};
function weldStrengthType(v: any): string {
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return WELD_STRENGTH_TYPE[k] ?? "fillet";
}
// SPA JointDesignParams.load_type -> WeldStrengthEngine force_direction.
const WELD_LOAD_TYPE_TO_DIR: Record<string, string> = {
  shear: "parallel", longitudinal: "parallel", parallel: "parallel",
  tension: "transverse", tensile: "transverse", transverse: "transverse", perpendicular: "transverse",
  bending: "combined", combined: "combined", torsion: "combined", mixed: "combined",
};
function weldForceDirection(v: any): string {
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return WELD_LOAD_TYPE_TO_DIR[k] ?? "parallel";
}
// AWS D1.1 Table 2.1 minimum fillet leg (mm) by base-metal thickness -- the smallest weld size the
// code permits for the plate, used as the lower bound of the /welding/joint-design size search.
function awsMinFilletLeg(thickness_mm: number): number {
  if (!(thickness_mm > 0) || thickness_mm <= 6) return 3;
  if (thickness_mm <= 12) return 5;
  if (thickness_mm <= 20) return 6;
  return 8;
}
// Standard fillet weld leg sizes (mm) searched, smallest-first, by /welding/joint-design.
const STANDARD_FILLET_LEGS_MM = [3, 4, 5, 6, 8, 10, 12, 16, 20];
// engine t8/5 cooling TIME (s) -> SPA cooling_rate_C_s (degC/s over the 800->500degC range).
const WELD_T85_RANGE_C = 300; // 800 - 500

const SPECIALTY_DEFERRED = {
  forming: {
    deferredTo: "U-FE-SPECIALTY-FORMING-CONTRACT",
    endpoints: {
      casting: "casting_defect_analyze covers only the risk side; pouring_rate_kg_s, riser_volume_cm3, cooling_rate_C_s, mold_fill_time_s are not produced by any forming action.",
      molding: "VERIFIED 2026-06-19 (slot:bravo): InjectionMoldingEngine IS wired -- prism_calc:injection_molding_calc (NOT a missing action, correcting the earlier note). Real blocker is a CONTRACT GAP: (1) InjectionMoldingInput REQUIRES projected_area_cm2 which the SPA MoldingParams does not collect (and clamp force scales with it -- a volume/wall estimate is unreliable across solid-vs-shell geometry, so not faithfully derivable); (2) the engine outputs clamp/shot/injection_pressure/melt+mold_temp/part_weight but NOT the SPA's fill_time_s/packing_pressure_MPa/shrinkage_pct/warp_risk/sink_mark_risk -- only cooling_time_s + cycle_time_s overlap cleanly. Proper fix is a forming-domain unit: add projected_area_cm2 to MoldingParams + extend InjectionMoldingEngine (fill/pack/shrinkage/warp/sink), OR trim MoldingResult to what the engine produces. Not an honest thin adapter.",
    },
  },
  welding: {
    deferredTo: "U-FE-SPECIALTY-WELDING-CONTRACT",
    endpoints: {
      calculate: "welding_calculate exists; result needs merge with weld_strength_calculate (weld_strength_MPa) + weld_distortion_calculate (distortion_mm); thickness_mm->plate_thickness_mm rename.",
      "joint-design": "weld_strength_calculate exists; needs material->yield-MPa lookup + load_type->force_direction remap + utilization derive; groove_angle_deg/root_gap_mm not produced.",
      inspection: "Frontend InspectionParams wants NDT/QA acceptance criteria; NO prism_welding action produces inspection criteria (0 field overlap with weld_distortion). Needs a new weld-inspection engine + action.",
    },
  },
} as const;

function deferred(res: any, domain: "forming" | "welding", endpoint: string): void {
  const d = SPECIALTY_DEFERRED[domain];
  const reason = (d.endpoints as Record<string, string>)[endpoint] ?? "not yet wired";
  res.status(501).json({
    message: `${domain}/${endpoint} not yet wired -- ${d.deferredTo}`,
    error: "not_implemented",
    deferredTo: d.deferredTo,
    reason,
  });
}

export function createSpecialtyRouter(callTool: CallToolFn): Router {
  const router = Router();

  // ---- GRINDING (real prism_grinding actions) --------------------------------

  // /grinding/calculate -> MERGE grinding_force (force/power/thermal/mrr) +
  // surface_finish_predict (surface_finish_Ra). Both actions are real and share
  // the same engine-side param names; we adapt the frontend GrindingParams once.
  router.post("/grinding/calculate", async (req, res, next) => {
    try {
      const p = req.body ?? {};
      const engineParams: Record<string, any> = {
        wheel_diameter_mm: p.wheel_diameter_mm,
        wheel_speed_m_s: p.wheel_speed_m_s,
        work_speed_m_min: p.table_speed_m_min, // rename: frontend table_speed_m_min -> engine work_speed_m_min
        depth_of_cut_mm: p.depth_of_cut_mm,
        // Best-available proxy: the frontend collects only wheel_width_mm; the engine
        // wants width_of_cut_mm. Exact for full-width surface/creep-feed grinding; for
        // cylindrical/centerless the true contact width is set by infeed/traverse, so
        // force/MRR may be over-stated there (documented approximation, not a silent default).
        width_of_cut_mm: p.wheel_width_mm,
        grinding_mode: OPERATION_TO_MODE[String(p.operation ?? "surface")] ?? "surface",
        workpiece_diameter_mm: p.workpiece_diameter_mm,
        coolant_type: p.coolant_type,
      };
      const [gf, sf] = await Promise.all([
        callTool("prism_grinding", "grinding_force", engineParams),
        callTool("prism_grinding", "surface_finish_predict", engineParams),
      ]);
      if (isToolError(gf)) { res.status(400).json({ message: gf.error }); return; }
      if (isToolError(sf)) { res.status(400).json({ message: sf.error }); return; }

      const mrrPerS = atom(gf.mrr_mm3_per_s);
      const gRatio = atom(gf.g_ratio_estimate);
      const out = {
        surface_finish_Ra: atom(sf.predicted_Ra_um),
        specific_energy_J_mm3: atom(gf.specific_energy_J_mm3),
        power_kW: atom(gf.grinding_power_kW),
        temperature_C: atom(gf.surface_temperature_C),
        // wheel_wear_ratio = volume of wheel worn / volume of work removed = 1/G,
        // where G (g_ratio_estimate) = work-removed / wheel-worn. Standard inverse.
        wheel_wear_ratio: gRatio && gRatio > 0 ? 1 / gRatio : undefined,
        mrr_mm3_min: mrrPerS != null ? mrrPerS * 60 : undefined, // per-second -> per-minute
        force_normal_N: atom(gf.normal_force_N),
        force_tangential_N: atom(gf.tangential_force_N),
        burn_risk: burnLabel(gf.burn_risk),
        recommendations: [
          ...(Array.isArray(gf.recommendations) ? gf.recommendations : []),
          ...(Array.isArray(sf.recommendations) ? sf.recommendations : []),
        ],
      };
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  // /grinding/wheel-select -> wheel_select (params + result adapter)
  router.post("/grinding/wheel-select", async (req, res, next) => {
    try {
      const p = req.body ?? {};
      const r = await callTool("prism_grinding", "wheel_select", {
        material: p.workpiece_material, // rename
        operation: p.operation,
        target_Ra_um: p.target_finish_Ra, // rename
        hardness_hrc: p.hardness_HRC, // rename (case)
      });
      if (isToolError(r)) { res.status(400).json({ message: r.error }); return; }
      res.json({
        abrasive_type: r.abrasive_type,
        grain_size: r.grit_size != null ? String(r.grit_size) : undefined, // number -> string
        grade: r.hardness_grade, // rename
        // structure: OMITTED -- wheel_select does not return spec.structure.
        bond_type: r.bond_type,
        wheel_specification: r.wheel_specification,
        // Engine emits a single recommended speed, not a range. Present it as a
        // degenerate [v, v] tuple rather than inventing a spread we did not compute.
        speed_range_m_s:
          typeof r.recommended_speed_m_s === "number"
            ? [r.recommended_speed_m_s, r.recommended_speed_m_s]
            : undefined,
        notes: [], // engine produces no notes for this action
      });
    } catch (e) {
      next(e);
    }
  });

  // /grinding/dressing -> dress_params (params + result adapter; mm<->um)
  router.post("/grinding/dressing", async (req, res, next) => {
    try {
      const p = req.body ?? {};
      const r = await callTool("prism_grinding", "dress_params", {
        wheel_diameter_mm: p.wheel_diameter_mm,
        dresser_type: p.dresser_type,
        dress_depth_um: p.dressing_depth_mm != null ? p.dressing_depth_mm * 1000 : undefined, // mm -> um
        dress_lead_mm_rev: p.dressing_lead_mm_rev, // rename
      });
      if (isToolError(r)) { res.status(400).json({ message: r.error }); return; }
      res.json({
        dressing_depth_mm: r.dress_depth_um != null ? r.dress_depth_um / 1000 : undefined, // um -> mm
        dressing_lead_mm_rev: r.dress_lead_mm_rev,
        overlap_ratio: r.overlap_ratio,
        dresser_traverse_speed_mm_min: r.traverse_speed_mm_min, // rename
        wheel_speed_rpm: r.wheel_speed_rpm,
        estimated_passes: r.passes, // rename
        // post_dress_finish_Ra: OMITTED -- dress_params does not predict finish.
        recommendations: r.recommendation ? [r.recommendation] : [], // singular -> array
      });
    } catch (e) {
      next(e);
    }
  });

  // ---- FORMING --------------------------------------------------------------

  // /forming/sheet-metal -> press_brake_calculate (real prism_forming action).
  // U-FE-SPECIALTY-FORMING-CONTRACT (slot:bravo 2026-06-19). The SPA SheetMetalResult is
  // bend-centric and PressBrakeEngine is the matching engine. Adapter: renames the two geometry
  // params the contract flagged (bend_radius_mm->inside_radius_mm, die_opening_mm->v_die_opening_mm),
  // maps the free-string material to the engine's 6-material enum, unwraps AtomicValue results, and
  // converts tonnes-force->kN. Fields the engine does NOT produce are OMITTED, not fabricated:
  //   - minimum_bend_radius_mm: the engine has no min-bend-radius output; its inside_radius<thickness
  //     cracking floor is surfaced via `recommendations`, not asserted as a computed minimum.
  //   - blank_size_mm: needs per-flange geometry SheetMetalParams does not carry.
  router.post("/forming/sheet-metal", async (req, res, next) => {
    try {
      const p = req.body ?? {};
      const r = await callTool("prism_forming", "press_brake_calculate", {
        material: sheetMaterialEnum(p.material),
        thickness_mm: p.thickness_mm,
        bend_length_mm: p.bend_length_mm,
        bend_angle_deg: p.bend_angle_deg,
        inside_radius_mm: p.bend_radius_mm, // rename: SPA bend_radius_mm -> engine inside_radius_mm
        v_die_opening_mm: p.die_opening_mm, // rename: SPA die_opening_mm -> engine v_die_opening_mm
      });
      if (isToolError(r)) { res.status(400).json({ message: r.error }); return; }
      const tonnage = atom(r.required_tonnage);
      res.json({
        bend_allowance_mm: atom(r.bend_allowance),
        bend_deduction_mm: atom(r.bend_deduction),
        springback_angle_deg: atom(r.springback_angle),
        // tonnes-force -> kN (1 tonne-force = 9.80665 kN), derived from the same required_tonnage.
        bending_force_kN: tonnage != null ? tonnage * TONNE_FORCE_TO_KN : undefined,
        tonnage_required: tonnage,
        recommendations: Array.isArray(r.warnings) ? r.warnings : [],
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/forming/casting", (_req, res) => deferred(res, "forming", "casting"));
  router.post("/forming/molding", (_req, res) => deferred(res, "forming", "molding"));

  // ---- WELDING --------------------------------------------------------------

  // /welding/calculate -> MERGE welding_calculate (heat input, HAZ, t8/5, deposition, preheat)
  // + weld_distortion_calculate (distortion + carbon equivalent, fed step-1's heat input)
  // + weld_strength_calculate (electrode weld-metal allowable stress). U-FE-SPECIALTY-WELDING-
  // CONTRACT (slot:bravo). All 3 actions round-trip now (schemas realigned to engines, prior
  // commit). weld_strength is called only for its force/geometry-INDEPENDENT allowable_stress;
  // its load-specific warnings are intentionally NOT surfaced here (no real load was supplied --
  // that is the /welding/joint-design endpoint's job).
  router.post("/welding/calculate", async (req, res, next) => {
    try {
      const p = req.body ?? {};
      const w = await callTool("prism_welding", "welding_calculate", {
        process: weldProcessEnum(p.process),
        joint_type: p.joint_type,
        voltage_V: p.voltage_V,
        current_A: p.current_A,
        travel_speed_mm_min: p.travel_speed_mm_min,
        plate_thickness_mm: p.thickness_mm, // rename: SPA thickness_mm -> engine plate_thickness_mm
        preheat_temp_C: p.preheat_temp_C,
        interpass_temp_C: p.interpass_temp_C,
      });
      if (isToolError(w)) { res.status(400).json({ message: w.error }); return; }

      const heatInput = atom(w.heat_input_kJ_mm);
      const [d, s] = await Promise.all([
        callTool("prism_welding", "weld_distortion_calculate", {
          joint_type: weldDistortionJoint(p.joint_type),
          plate_thickness_mm: p.thickness_mm,
          material: weldDistortionMaterial(p.material),
          heat_input_kj_mm: heatInput, // chain step-1's heat input into the distortion model
        }),
        callTool("prism_welding", "weld_strength_calculate", {
          weld_type: weldStrengthType(p.joint_type),
          electrode: weldElectrode(p.filler_material),
        }),
      ]);
      if (isToolError(d)) { res.status(400).json({ message: d.error }); return; }
      if (isToolError(s)) { res.status(400).json({ message: s.error }); return; }

      const t85 = atom(w.cooling_rate_800_500_s);
      const preheatC = atom(w.preheat_required_C);
      res.json({
        heat_input_kJ_mm: heatInput,
        // electrode weld-metal allowable stress (force/geometry-independent).
        weld_strength_MPa: atom(s.allowable_stress),
        distortion_mm: atom(d.transverse_shrinkage),
        haz_width_mm: atom(w.haz_width_mm),
        // t8/5 cooling TIME (s) -> degC/s over the 800->500degC range.
        cooling_rate_C_s: t85 != null && t85 > 0 ? WELD_T85_RANGE_C / t85 : undefined,
        deposition_rate_kg_h: atom(w.deposition_rate_kg_h),
        // preheat_required_C is the engine's REQUIRED-MINIMUM preheat (AWS CE floor), not the
        // operator's applied value -- 0 means none required. The SPA shows this as the
        // recommended preheat to apply; preheat_required is just whether that floor is > 0.
        preheat_required: preheatC != null ? preheatC > 0 : undefined,
        preheat_temp_C: preheatC,
        carbon_equivalent: atom(d.carbon_equivalent),
        recommendations: [
          ...(Array.isArray(w.recommendations) ? w.recommendations : []),
          ...(Array.isArray(d.warnings) ? d.warnings : []),
        ],
      });
    } catch (e) {
      next(e);
    }
  });

  // /welding/joint-design -> weld_strength_calculate, run as a SIZING SEARCH: pick the smallest
  // standard fillet leg (>= the AWS D1.1 code minimum for the plate) whose computed safety factor
  // meets the target (JointDesignParams.safety_factor, default 1.5 / AISC). The engine analyzes the
  // stresses at each candidate; this adapter owns only the deterministic smallest-feasible search.
  // U-FE-SPECIALTY-WELDING-CONTRACT (slot:bravo). Joint-prep fields (effective_length_mm,
  // groove_angle_deg, root_gap_mm) are OMITTED -- the strength engine analyzes a weld, it does not
  // emit joint-prep geometry; the SPA JointDesignResult marks those three optional.
  router.post("/welding/joint-design", async (req, res, next) => {
    try {
      const p = req.body ?? {};
      const weldType = weldStrengthType(p.joint_type);
      const dir = weldForceDirection(p.load_type);
      const targetSF = Number(p.safety_factor) > 0 ? Number(p.safety_factor) : 1.5;
      const minLeg = awsMinFilletLeg(Number(p.thickness_mm) || 0);
      // Upper bound = the engine's own max fillet leg (plate thickness - 1.5mm, WeldStrengthEngine
      // AWS rule); never search a leg the code would flag as over-size. Math.max keeps >=1 candidate
      // for thin plates where the AWS min already exceeds the max (the engine then warns honestly).
      const maxLeg = Number(p.thickness_mm) > 0 ? Number(p.thickness_mm) - 1.5 : 20;
      const candidates = STANDARD_FILLET_LEGS_MM.filter((l) => l >= minLeg && l <= Math.max(minLeg, maxLeg));

      let chosen: { leg: number; r: any } | null = null;
      let last: { leg: number; r: any } | null = null;
      for (const leg of candidates) {
        const r = await callTool("prism_welding", "weld_strength_calculate", {
          weld_type: weldType,
          leg_size_mm: leg,
          weld_length_mm: p.weld_length_mm,
          plate_thickness_mm: p.thickness_mm,
          force_n: p.load_N,
          force_direction: dir,
        });
        if (isToolError(r)) { res.status(400).json({ message: r.error }); return; }
        last = { leg, r };
        const allow = atom(r.allowable_stress);
        const act = atom(r.combined_stress);
        const sf = allow != null && act != null && act > 0 ? allow / act : Infinity;
        if (sf >= targetSF) { chosen = { leg, r }; break; }
      }
      const pick = chosen ?? last;
      // Defensive: `candidates` is always non-empty given the Math.max lower-bound + the fallback
      // maxLeg of 20, so `last` is always set. This guard future-proofs against STANDARD_FILLET_LEGS_MM
      // ever shrinking and keeps the SPA fail-loud rather than emitting a partial body.
      if (!pick) { res.status(400).json({ message: "no candidate weld sizes for the given thickness" }); return; }

      const r = pick.r;
      const allowable = atom(r.allowable_stress);
      const actual = atom(r.combined_stress);
      res.json({
        weld_size_mm: pick.leg, // smallest standard fillet leg meeting the target safety factor
        throat_thickness_mm: atom(r.throat_thickness),
        allowable_stress_MPa: allowable,
        actual_stress_MPa: actual,
        utilization_pct: allowable != null && allowable > 0 && actual != null ? (actual / allowable) * 100 : undefined,
        recommendations: [
          ...(chosen ? [] : [`No standard fillet leg up to ${pick.leg}mm meets a ${targetSF} safety factor under the given load -- increase weld length, use a higher-strength electrode, or a full-penetration joint.`]),
          ...(Array.isArray(r.warnings) ? r.warnings : []),
        ],
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/welding/inspection", (_req, res) => deferred(res, "welding", "inspection"));

  return router;
}
