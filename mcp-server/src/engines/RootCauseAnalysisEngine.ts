/**
 * RootCauseAnalysisEngine — R19-MS3
 *
 * Quality issue → probable cause tracing engine that uses Ishikawa (fishbone)
 * categorization, fault tree analysis, correlation-based diagnosis, and
 * automated corrective action planning.
 *
 * Actions:
 *   rca_diagnose    — diagnose a quality issue from symptoms + process data
 *   rca_tree        — generate fault tree (Ishikawa categories)
 *   rca_correlate   — correlate observed defect with process parameter variations
 *   rca_action_plan — generate corrective/preventive action plan (CAPA)
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface Symptom {
  type: string;
  description: string;
  severity: "minor" | "major" | "critical";
  measurement?: number;
  specification?: { nominal: number; upper: number; lower: number };
}

interface Cause {
  id: string;
  category: string;
  description: string;
  probability: number; // 0-1
  evidence_strength: "strong" | "moderate" | "weak" | "circumstantial";
  mechanism: string;
  verification_method: string;
}

interface CorrectiveAction {
  id: string;
  cause_id: string;
  type: "immediate" | "corrective" | "preventive";
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  estimated_effectiveness: number; // 0-1
  implementation_effort: "low" | "medium" | "high";
}

// ── Ishikawa Categories (6M) ──────────────────────────────────────────────

const ISHIKAWA_CATEGORIES = [
  "machine",
  "method",
  "material",
  "measurement",
  "man",
  "environment",
] as const;

type IshikawaCategory = typeof ISHIKAWA_CATEGORIES[number];

// ── Defect Type → Cause Knowledge Base ─────────────────────────────────────

const DEFECT_CAUSE_DB: Record<string, {
  category: IshikawaCategory;
  description: string;
  probability: number;
  mechanism: string;
  verification: string;
  related_params: string[];
}[]> = {
  oversized: [
    { category: "machine", description: "Spindle thermal growth", probability: 0.7, mechanism: "Thermal expansion of spindle increases effective tool length", verification: "Measure spindle growth over warm-up cycle", related_params: ["spindle_temperature", "warm_up_time"] },
    { category: "machine", description: "Axis backlash in feed direction", probability: 0.5, mechanism: "Lost motion during direction reversal", verification: "Perform backlash test on affected axis", related_params: ["axis_backlash_mm"] },
    { category: "method", description: "Tool deflection under cutting load", probability: 0.6, mechanism: "Radial force causes tool to spring away from workpiece", verification: "Calculate tool deflection from cutting forces", related_params: ["cutting_force_n", "tool_stickout_mm", "tool_diameter_mm"] },
    { category: "material", description: "Material springback", probability: 0.4, mechanism: "Elastic recovery after cutting", verification: "Compare material yield strength vs cutting pressure", related_params: ["material_yield_mpa", "hardness_hrc"] },
    { category: "measurement", description: "Probe calibration drift", probability: 0.3, mechanism: "Touch probe stylus wear or miscalibration", verification: "Re-calibrate probe against reference standard", related_params: ["probe_cal_date"] },
  ],
  undersized: [
    { category: "machine", description: "Tool wear beyond compensation limit", probability: 0.7, mechanism: "Flank wear increases effective cutting depth", verification: "Measure tool flank wear (VB)", related_params: ["tool_life_used_pct", "flank_wear_mm"] },
    { category: "method", description: "Excessive cutting depth per pass", probability: 0.5, mechanism: "Large depth causes increased tool pressure and material removal", verification: "Review depth of cut vs recommendation", related_params: ["depth_of_cut_mm", "recommended_ap_mm"] },
    { category: "machine", description: "Thermal contraction of cold workpiece", probability: 0.3, mechanism: "Part cools after machining, dimensions shrink", verification: "Measure at controlled temperature (20°C)", related_params: ["coolant_temp_c", "ambient_temp_c"] },
    { category: "measurement", description: "Measurement at non-standard temperature", probability: 0.4, mechanism: "Thermal expansion coefficient × temperature difference", verification: "Apply temperature compensation to measurement", related_params: ["measurement_temp_c"] },
  ],
  poor_surface_finish: [
    { category: "machine", description: "Spindle runout or vibration", probability: 0.6, mechanism: "Dynamic imbalance creates chatter marks", verification: "Measure spindle runout with indicator", related_params: ["spindle_runout_mm", "vibration_level"] },
    { category: "method", description: "Feed rate too high for finish cut", probability: 0.8, mechanism: "Ra ∝ f²/(32r) — high feed increases surface roughness", verification: "Calculate theoretical Ra from feed and nose radius", related_params: ["feed_per_tooth_mm", "nose_radius_mm"] },
    { category: "material", description: "Built-up edge (BUE) formation", probability: 0.5, mechanism: "Material adheres to cutting edge creating irregular surface", verification: "Inspect cutting edge under magnification", related_params: ["cutting_speed_m_min", "material"] },
    { category: "machine", description: "Chatter vibration at natural frequency", probability: 0.6, mechanism: "Regenerative chatter at stability lobe boundary", verification: "FFT analysis of vibration signal", related_params: ["spindle_rpm", "depth_of_cut_mm", "natural_freq_hz"] },
    { category: "method", description: "Worn or chipped cutting edge", probability: 0.7, mechanism: "Damaged edge creates irregular surface pattern", verification: "Inspect tool under magnification", related_params: ["tool_life_used_pct", "insert_condition"] },
  ],
  out_of_position: [
    { category: "machine", description: "Fixture datum misalignment", probability: 0.6, mechanism: "Part not seated correctly on fixture datums", verification: "Verify datum contact with indicator", related_params: ["fixture_type", "datum_scheme"] },
    { category: "machine", description: "Axis positioning error", probability: 0.4, mechanism: "Linear scale or encoder error", verification: "Run laser interferometer check", related_params: ["axis_accuracy_mm"] },
    { category: "method", description: "Work offset error", probability: 0.5, mechanism: "G54/G55 offset set incorrectly", verification: "Verify work offset against reference surface", related_params: ["work_offset", "reference_surface"] },
    { category: "man", description: "Incorrect part orientation in fixture", probability: 0.3, mechanism: "Part loaded in wrong orientation", verification: "Review setup sheet and operator training", related_params: ["setup_sheet_available", "poka_yoke"] },
  ],
  tool_breakage: [
    { category: "method", description: "Excessive cutting parameters", probability: 0.7, mechanism: "Force exceeds tool strength", verification: "Compare actual force to tool catalog limit", related_params: ["cutting_force_n", "max_tool_force_n"] },
    { category: "material", description: "Hard inclusions in workpiece", probability: 0.4, mechanism: "Sudden load spike on impact with inclusion", verification: "Check material certification for inclusion rating", related_params: ["material_cert", "inclusion_rating"] },
    { category: "machine", description: "Coolant failure during cut", probability: 0.3, mechanism: "Thermal shock or overheating causes edge failure", verification: "Verify coolant flow and pressure", related_params: ["coolant_flow_lpm", "coolant_pressure_bar"] },
    { category: "method", description: "Tool engagement angle too aggressive", probability: 0.5, mechanism: "Full-width slotting or aggressive entry causes overload", verification: "Review toolpath engagement strategy", related_params: ["engagement_angle_deg", "radial_depth_mm"] },
  ],
  burrs: [
    { category: "method", description: "Dull cutting edge", probability: 0.7, mechanism: "Worn edge pushes material instead of shearing", verification: "Inspect edge sharpness", related_params: ["tool_life_used_pct"] },
    { category: "material", description: "High ductility material", probability: 0.5, mechanism: "Ductile materials form burrs more easily", verification: "Check material ductility/elongation", related_params: ["material", "elongation_pct"] },
    { category: "method", description: "Exit burr from unsupported edge", probability: 0.6, mechanism: "No material support at exit creates burr", verification: "Review toolpath exit strategy", related_params: ["exit_strategy", "support_material"] },
  ],
  taper: [
    { category: "machine", description: "Axis alignment error (squareness)", probability: 0.6, mechanism: "X-Z or Y-Z axes not perpendicular", verification: "Measure axis squareness with test bar", related_params: ["squareness_error_mm_per_m"] },
    { category: "method", description: "Tool deflection gradient along cut length", probability: 0.5, mechanism: "Varying cutting force along workpiece creates taper", verification: "Calculate deflection at both ends of cut", related_params: ["cutting_force_n", "tool_stickout_mm", "cut_length_mm"] },
    { category: "machine", description: "Thermal gradient in machine structure", probability: 0.4, mechanism: "Uneven heating causes differential expansion", verification: "Monitor machine temperature at multiple points", related_params: ["machine_temp_front_c", "machine_temp_rear_c"] },
  ],
};

// ── Helper Functions ───────────────────────────────────────────────────────

function classifyDefectType(symptoms: Symptom[]): string[] {
  const types: string[] = [];
  for (const s of symptoms) {
    const t = s.type.toLowerCase();
    if (t.includes("oversize") || t.includes("too_large") || t.includes("diameter_high")) types.push("oversized");
    else if (t.includes("undersize") || t.includes("too_small") || t.includes("diameter_low")) types.push("undersized");
    else if (t.includes("surface") || t.includes("roughness") || t.includes("finish")) types.push("poor_surface_finish");
    else if (t.includes("position") || t.includes("location") || t.includes("offset")) types.push("out_of_position");
    else if (t.includes("break") || t.includes("fracture") || t.includes("tool_fail")) types.push("tool_breakage");
    else if (t.includes("burr")) types.push("burrs");
    else if (t.includes("taper") || t.includes("conicity")) types.push("taper");
    else types.push(t); // Use raw type as fallback
  }
  return [...new Set(types)];
}

function buildCauseList(
  defectTypes: string[],
  processData: Record<string, unknown>,
): Cause[] {
  const causes: Cause[] = [];
  let idCounter = 1;

  for (const dt of defectTypes) {
    const knownCauses = DEFECT_CAUSE_DB[dt] ?? [];
    for (const kc of knownCauses) {
      // Adjust probability based on available process data
      let adjustedProb = kc.probability;
      let evidenceStrength: Cause["evidence_strength"] = "circumstantial";

      // Check if related parameters provide evidence
      let evidenceCount = 0;
      for (const rp of kc.related_params) {
        if (processData[rp] !== undefined) evidenceCount++;
      }

      if (evidenceCount >= 2) {
        evidenceStrength = "strong";
        adjustedProb = Math.min(0.95, adjustedProb * 1.3);
      } else if (evidenceCount === 1) {
        evidenceStrength = "moderate";
        adjustedProb = Math.min(0.9, adjustedProb * 1.1);
      } else {
        evidenceStrength = kc.probability > 0.6 ? "moderate" : "weak";
      }

      // Specific parameter-based adjustments
      if (kc.description.includes("tool wear") && processData.tool_life_used_pct !== undefined) {
        const used = Number(processData.tool_life_used_pct);
        if (used > 80) adjustedProb = Math.min(0.95, adjustedProb * 1.4);
        else if (used < 30) adjustedProb *= 0.5;
      }

      if (kc.description.includes("feed rate") && processData.feed_per_tooth_mm !== undefined) {
        const fz = Number(processData.feed_per_tooth_mm);
        if (fz > 0.2) adjustedProb = Math.min(0.95, adjustedProb * 1.3);
        else if (fz < 0.05) adjustedProb *= 0.6;
      }

      if (kc.description.includes("thermal") && processData.ambient_temp_c !== undefined) {
        const temp = Number(processData.ambient_temp_c);
        if (Math.abs(temp - 20) > 5) adjustedProb = Math.min(0.95, adjustedProb * 1.3);
      }

      causes.push({
        id: `C${idCounter++}`,
        category: kc.category,
        description: kc.description,
        probability: Math.round(adjustedProb * 100) / 100,
        evidence_strength: evidenceStrength,
        mechanism: kc.mechanism,
        verification_method: kc.verification,
      });
    }
  }

  // Sort by probability descending
  causes.sort((a, b) => b.probability - a.probability);
  return causes;
}

function buildFaultTree(causes: Cause[]): Record<string, { causes: Cause[]; category_probability: number }> {
  const tree: Record<string, { causes: Cause[]; category_probability: number }> = {};

  for (const cat of ISHIKAWA_CATEGORIES) {
    const catCauses = causes.filter(c => c.category === cat);
    // P(any in category) = 1 - product(1 - p_i)
    const catProb = catCauses.length > 0
      ? 1 - catCauses.reduce((prod, c) => prod * (1 - c.probability), 1)
      : 0;
    tree[cat] = {
      causes: catCauses,
      category_probability: Math.round(catProb * 100) / 100,
    };
  }

  return tree;
}

function correlateParameters(
  processData: Record<string, unknown>,
  defectTypes: string[],
): { parameter: string; value: unknown; deviation_from_nominal: number | null; correlation_to_defect: "strong" | "moderate" | "weak"; explanation: string }[] {
  const correlations: {
    parameter: string;
    value: unknown;
    deviation_from_nominal: number | null;
    correlation_to_defect: "strong" | "moderate" | "weak";
    explanation: string;
  }[] = [];

  // Collect all related parameters from causes
  const relevantParams = new Set<string>();
  for (const dt of defectTypes) {
    const knownCauses = DEFECT_CAUSE_DB[dt] ?? [];
    for (const kc of knownCauses) {
      for (const rp of kc.related_params) relevantParams.add(rp);
    }
  }

  for (const param of relevantParams) {
    if (processData[param] === undefined) continue;
    const value = processData[param];

    // Determine correlation strength based on parameter characteristics
    let correlation: "strong" | "moderate" | "weak" = "weak";
    let explanation = "";

    if (param === "tool_life_used_pct") {
      const v = Number(value);
      if (v > 80) { correlation = "strong"; explanation = `Tool at ${v}% life — increased wear causes dimensional/surface issues`; }
      else if (v > 50) { correlation = "moderate"; explanation = `Tool at ${v}% life — monitor for wear-related changes`; }
      else { explanation = `Tool at ${v}% life — unlikely wear-related`; }
    } else if (param === "feed_per_tooth_mm") {
      const v = Number(value);
      if (v > 0.2) { correlation = "strong"; explanation = `High feed ${v}mm/tooth directly impacts surface finish (Ra ∝ f²)`; }
      else if (v > 0.1) { correlation = "moderate"; explanation = `Moderate feed ${v}mm/tooth — verify against surface finish requirement`; }
      else { explanation = `Feed ${v}mm/tooth in normal range`; }
    } else if (param === "cutting_speed_m_min") {
      const v = Number(value);
      if (v > 300) { correlation = "moderate"; explanation = `High cutting speed ${v}m/min increases thermal effects`; }
      else { explanation = `Cutting speed ${v}m/min in normal range`; }
    } else if (param === "depth_of_cut_mm") {
      const v = Number(value);
      if (v > 5) { correlation = "strong"; explanation = `Large depth of cut ${v}mm increases forces and deflection`; }
      else if (v > 2) { correlation = "moderate"; explanation = `Moderate depth ${v}mm — check tool deflection`; }
      else { explanation = `Depth ${v}mm in normal range`; }
    } else if (param === "spindle_temperature" || param === "ambient_temp_c") {
      const v = Number(value);
      const deviation = Math.abs(v - 20);
      if (deviation > 5) { correlation = "strong"; explanation = `Temperature ${v}°C deviates ${deviation.toFixed(1)}°C from 20°C reference`; }
      else if (deviation > 2) { correlation = "moderate"; explanation = `Temperature ${v}°C slightly elevated`; }
      else { explanation = `Temperature ${v}°C within normal range`; }
    } else if (param === "flank_wear_mm") {
      const v = Number(value);
      if (v > 0.3) { correlation = "strong"; explanation = `Flank wear ${v}mm exceeds VB limit (0.3mm)`; }
      else if (v > 0.2) { correlation = "moderate"; explanation = `Flank wear ${v}mm approaching limit`; }
      else { explanation = `Flank wear ${v}mm within limits`; }
    } else {
      explanation = `Parameter value: ${value}`;
      correlation = "weak";
    }

    correlations.push({
      parameter: param,
      value,
      deviation_from_nominal: typeof value === "number" ? null : null,
      correlation_to_defect: correlation,
      explanation,
    });
  }

  // Sort by correlation strength
  const order = { strong: 0, moderate: 1, weak: 2 };
  correlations.sort((a, b) => order[a.correlation_to_defect] - order[b.correlation_to_defect]);
  return correlations;
}

function generateActionPlan(
  causes: Cause[],
  defectTypes: string[],
): CorrectiveAction[] {
  const actions: CorrectiveAction[] = [];
  let idCounter = 1;

  // Take top 5 causes for action planning
  const topCauses = causes.slice(0, 5);

  for (const cause of topCauses) {
    // Immediate containment
    actions.push({
      id: `A${idCounter++}`,
      cause_id: cause.id,
      type: "immediate",
      description: `Verify: ${cause.verification_method}`,
      priority: cause.probability > 0.7 ? "critical" : cause.probability > 0.5 ? "high" : "medium",
      estimated_effectiveness: 0.3,
      implementation_effort: "low",
    });

    // Corrective action based on cause category
    const corrective = generateCorrective(cause);
    actions.push({
      id: `A${idCounter++}`,
      cause_id: cause.id,
      type: "corrective",
      description: corrective.description,
      priority: cause.probability > 0.6 ? "high" : "medium",
      estimated_effectiveness: corrective.effectiveness,
      implementation_effort: corrective.effort,
    });

    // Preventive action for high-probability causes
    if (cause.probability > 0.5) {
      const preventive = generatePreventive(cause);
      actions.push({
        id: `A${idCounter++}`,
        cause_id: cause.id,
        type: "preventive",
        description: preventive.description,
        priority: "medium",
        estimated_effectiveness: preventive.effectiveness,
        implementation_effort: preventive.effort,
      });
    }
  }

  return actions;
}

function generateCorrective(cause: Cause): { description: string; effectiveness: number; effort: "low" | "medium" | "high" } {
  switch (cause.category) {
    case "machine":
      if (cause.description.includes("thermal")) return { description: "Implement warm-up cycle and thermal compensation routine", effectiveness: 0.8, effort: "medium" };
      if (cause.description.includes("backlash")) return { description: "Adjust axis backlash compensation parameters", effectiveness: 0.9, effort: "medium" };
      if (cause.description.includes("spindle")) return { description: "Schedule spindle maintenance and runout check", effectiveness: 0.85, effort: "high" };
      if (cause.description.includes("alignment") || cause.description.includes("squareness")) return { description: "Perform machine geometry alignment", effectiveness: 0.9, effort: "high" };
      if (cause.description.includes("coolant")) return { description: "Restore coolant system and verify flow/pressure", effectiveness: 0.8, effort: "low" };
      return { description: "Schedule machine maintenance inspection", effectiveness: 0.7, effort: "medium" };
    case "method":
      if (cause.description.includes("feed")) return { description: "Reduce feed rate to match surface finish requirement", effectiveness: 0.85, effort: "low" };
      if (cause.description.includes("depth") || cause.description.includes("engagement")) return { description: "Reduce depth of cut and adjust toolpath strategy", effectiveness: 0.8, effort: "low" };
      if (cause.description.includes("deflection")) return { description: "Use shorter tool stick-out or increase tool diameter", effectiveness: 0.75, effort: "medium" };
      if (cause.description.includes("worn") || cause.description.includes("dull")) return { description: "Replace cutting tool and adjust tool change interval", effectiveness: 0.9, effort: "low" };
      if (cause.description.includes("offset")) return { description: "Re-verify and correct work coordinate offset", effectiveness: 0.95, effort: "low" };
      return { description: "Review and optimize cutting parameters", effectiveness: 0.7, effort: "low" };
    case "material":
      if (cause.description.includes("inclusion")) return { description: "Increase incoming material inspection and reject non-conforming lots", effectiveness: 0.7, effort: "medium" };
      if (cause.description.includes("springback")) return { description: "Add spring-pass or adjust finish cut allowance", effectiveness: 0.8, effort: "low" };
      if (cause.description.includes("BUE") || cause.description.includes("built-up")) return { description: "Increase cutting speed or apply coated insert to prevent adhesion", effectiveness: 0.75, effort: "low" };
      return { description: "Review material specification and incoming inspection", effectiveness: 0.6, effort: "medium" };
    case "measurement":
      return { description: "Re-calibrate measurement equipment against certified standard", effectiveness: 0.9, effort: "low" };
    case "man":
      return { description: "Review setup procedures with operator and update work instructions", effectiveness: 0.7, effort: "low" };
    case "environment":
      return { description: "Control ambient temperature and monitor environmental conditions", effectiveness: 0.75, effort: "high" };
    default:
      return { description: "Investigate and address root cause", effectiveness: 0.5, effort: "medium" };
  }
}

function generatePreventive(cause: Cause): { description: string; effectiveness: number; effort: "low" | "medium" | "high" } {
  switch (cause.category) {
    case "machine":
      return { description: "Establish preventive maintenance schedule and machine health monitoring", effectiveness: 0.8, effort: "high" };
    case "method":
      return { description: "Document optimized parameters in process sheet and add to SPC monitoring", effectiveness: 0.75, effort: "medium" };
    case "material":
      return { description: "Add material property verification to incoming inspection checklist", effectiveness: 0.7, effort: "medium" };
    case "measurement":
      return { description: "Implement regular calibration schedule and MSA program", effectiveness: 0.85, effort: "medium" };
    case "man":
      return { description: "Implement poka-yoke fixtures and update operator training program", effectiveness: 0.8, effort: "high" };
    case "environment":
      return { description: "Install environmental monitoring with automated alerts", effectiveness: 0.8, effort: "high" };
    default:
      return { description: "Implement monitoring and early detection system", effectiveness: 0.6, effort: "medium" };
  }
}

// ── Action Handlers ────────────────────────────────────────────────────────

function rcaDiagnose(params: Record<string, unknown>): unknown {
  const rawSymptoms = params.symptoms as Symptom[] | undefined;
  const symptoms: Symptom[] = rawSymptoms ?? [{
    type: String(params.defect_type ?? "oversized"),
    description: String(params.description ?? "Dimension out of tolerance"),
    severity: (params.severity as Symptom["severity"]) ?? "major",
  }];

  const processData = (params.process_data as Record<string, unknown>) ?? params;
  const defectTypes = classifyDefectType(symptoms);
  const causes = buildCauseList(defectTypes, processData);
  const faultTree = buildFaultTree(causes);

  // Top probable cause
  const topCause = causes[0] ?? null;

  return {
    defect_types: defectTypes,
    symptoms,
    total_causes_identified: causes.length,
    top_cause: topCause,
    causes_by_probability: causes.slice(0, 10),
    fault_tree_summary: Object.fromEntries(
      Object.entries(faultTree).map(([cat, data]) => [cat, {
        count: data.causes.length,
        probability: data.category_probability,
      }])
    ),
    recommended_verification: topCause ? topCause.verification_method : "No causes identified",
    confidence: topCause ? (topCause.probability > 0.7 ? "high" : topCause.probability > 0.5 ? "medium" : "low") : "none",
  };
}

function rcaTree(params: Record<string, unknown>): unknown {
  const defectType = String(params.defect_type ?? "oversized");
  const processData = (params.process_data as Record<string, unknown>) ?? params;
  const causes = buildCauseList([defectType], processData);
  const tree = buildFaultTree(causes);

  // Build Ishikawa diagram data
  const ishikawa: Record<string, string[]> = {};
  for (const [cat, data] of Object.entries(tree)) {
    ishikawa[cat] = data.causes.map(c => c.description);
  }

  return {
    defect_type: defectType,
    ishikawa_categories: ishikawa,
    fault_tree: tree,
    total_potential_causes: causes.length,
    most_likely_category: Object.entries(tree)
      .filter(([, d]) => d.category_probability > 0)
      .sort(([, a], [, b]) => b.category_probability - a.category_probability)[0]?.[0] ?? "unknown",
    category_ranking: Object.entries(tree)
      .filter(([, d]) => d.causes.length > 0)
      .sort(([, a], [, b]) => b.category_probability - a.category_probability)
      .map(([cat, d]) => ({ category: cat, probability: d.category_probability, cause_count: d.causes.length })),
  };
}

function rcaCorrelate(params: Record<string, unknown>): unknown {
  const defectType = String(params.defect_type ?? "oversized");
  const processData = (params.process_data as Record<string, unknown>) ?? params;
  const defectTypes = [defectType];
  const correlations = correlateParameters(processData, defectTypes);

  const strongCorrelations = correlations.filter(c => c.correlation_to_defect === "strong");
  const moderateCorrelations = correlations.filter(c => c.correlation_to_defect === "moderate");

  return {
    defect_type: defectType,
    total_parameters_analyzed: correlations.length,
    strong_correlations: strongCorrelations.length,
    moderate_correlations: moderateCorrelations.length,
    weak_correlations: correlations.filter(c => c.correlation_to_defect === "weak").length,
    correlations,
    primary_suspect: strongCorrelations[0]?.parameter ?? moderateCorrelations[0]?.parameter ?? "insufficient_data",
    recommendation: strongCorrelations.length > 0
      ? `Focus investigation on: ${strongCorrelations.map(c => c.parameter).join(", ")}`
      : moderateCorrelations.length > 0
        ? `Investigate: ${moderateCorrelations.map(c => c.parameter).join(", ")}`
        : "Insufficient process data — collect more measurements",
  };
}

function rcaActionPlan(params: Record<string, unknown>): unknown {
  const defectType = String(params.defect_type ?? "oversized");
  const processData = (params.process_data as Record<string, unknown>) ?? params;
  const defectTypes = [defectType];
  const causes = buildCauseList(defectTypes, processData);
  const actions = generateActionPlan(causes, defectTypes);

  const immediate = actions.filter(a => a.type === "immediate");
  const corrective = actions.filter(a => a.type === "corrective");
  const preventive = actions.filter(a => a.type === "preventive");

  return {
    defect_type: defectType,
    root_causes_addressed: Math.min(causes.length, 5),
    total_actions: actions.length,
    action_breakdown: {
      immediate: immediate.length,
      corrective: corrective.length,
      preventive: preventive.length,
    },
    priority_summary: {
      critical: actions.filter(a => a.priority === "critical").length,
      high: actions.filter(a => a.priority === "high").length,
      medium: actions.filter(a => a.priority === "medium").length,
      low: actions.filter(a => a.priority === "low").length,
    },
    actions,
    estimated_overall_effectiveness: actions.length > 0
      ? Math.round(actions.reduce((s, a) => s + a.estimated_effectiveness, 0) / actions.length * 100) / 100
      : 0,
    implementation_sequence: [
      { phase: "immediate", description: "Containment — verify and isolate", actions: immediate.map(a => a.id) },
      { phase: "corrective", description: "Fix — address root causes", actions: corrective.map(a => a.id) },
      { phase: "preventive", description: "Prevent — ensure non-recurrence", actions: preventive.map(a => a.id) },
    ],
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeRootCauseAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "rca_diagnose":    return rcaDiagnose(params);
    case "rca_tree":        return rcaTree(params);
    case "rca_correlate":   return rcaCorrelate(params);
    case "rca_action_plan": return rcaActionPlan(params);
    default:
      throw new Error(`RootCauseAnalysisEngine: unknown action "${action}"`);
  }
}
