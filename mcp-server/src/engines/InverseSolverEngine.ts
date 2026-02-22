/**
 * InverseSolverEngine.ts — R10-Rev2 Inverse Problem Solving
 * ==========================================================
 *
 * Paradigm shift: Instead of "Given inputs, what parameters?" (forward),
 * this solves "Given a BAD RESULT, what went wrong?" (inverse).
 *
 * Inverse problem types:
 *   1. Bad surface finish → root cause analysis
 *   2. Short tool life → failure mode diagnosis
 *   3. Dimensional error → error source identification
 *   4. Chatter → stability analysis & fix recommendation
 *   5. General troubleshooting → multi-symptom diagnosis
 *
 * Each inverse solver works backward from the observed symptom through
 * physics-based models to identify likely causes ranked by probability.
 *
 * @version 1.0.0 — R10-Rev2
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type InverseProblemType = "surface_finish" | "tool_life" | "dimensional" | "chatter" | "general";
export type Severity = "low" | "medium" | "high" | "critical";
export type Confidence = "low" | "medium" | "high" | "very_high";

export interface InverseProblemInput {
  problem_type: InverseProblemType;
  material?: string;
  tool_diameter_mm?: number;
  tool_type?: string;
  flutes?: number;
  operation?: string;
  rpm?: number;
  feed_mmmin?: number;
  doc_mm?: number;
  woc_mm?: number;
  coolant?: string;
  machine?: string;
  // Symptom-specific
  measured_ra_um?: number;
  expected_ra_um?: number;
  tool_life_min?: number;
  expected_tool_life_min?: number;
  dimensional_error_mm?: number;
  error_direction?: "oversize" | "undersize" | "inconsistent";
  chatter_frequency_hz?: number;
  symptoms?: string[];
}

export interface RootCause {
  cause: string;
  probability: number; // 0-1
  severity: Severity;
  explanation: string;
  physics_basis: string;
  fixes: Fix[];
}

export interface Fix {
  action: string;
  effectiveness: number; // 0-1
  difficulty: "easy" | "moderate" | "hard";
  cost: "low" | "medium" | "high";
  details: string;
}

export interface InverseSolution {
  problem_id: string;
  problem_type: InverseProblemType;
  symptom_summary: string;
  root_causes: RootCause[];
  primary_cause: string;
  recommended_fix: string;
  confidence: Confidence;
  additional_data_needed?: string[];
}

// ─── Material Properties ─────────────────────────────────────────────────────

interface MaterialProps {
  vc_range: [number, number]; // m/min
  thermal_conductivity: number; // W/m·K
  hardness_hrc: number;
  work_hardening: boolean;
  bue_tendency: "low" | "medium" | "high";
  chip_type: "continuous" | "segmented" | "bue_prone";
  abrasiveness: number; // 0-1
}

const MATERIAL_DB: Record<string, MaterialProps> = {
  aluminum: { vc_range: [200, 600], thermal_conductivity: 167, hardness_hrc: 5, work_hardening: false, bue_tendency: "high", chip_type: "continuous", abrasiveness: 0.1 },
  steel: { vc_range: [100, 300], thermal_conductivity: 50, hardness_hrc: 20, work_hardening: false, bue_tendency: "medium", chip_type: "continuous", abrasiveness: 0.3 },
  stainless: { vc_range: [60, 180], thermal_conductivity: 16, hardness_hrc: 25, work_hardening: true, bue_tendency: "high", chip_type: "continuous", abrasiveness: 0.5 },
  titanium: { vc_range: [30, 80], thermal_conductivity: 7, hardness_hrc: 36, work_hardening: true, bue_tendency: "medium", chip_type: "segmented", abrasiveness: 0.7 },
  inconel: { vc_range: [20, 60], thermal_conductivity: 11, hardness_hrc: 40, work_hardening: true, bue_tendency: "low", chip_type: "segmented", abrasiveness: 0.9 },
  cast_iron: { vc_range: [80, 250], thermal_conductivity: 46, hardness_hrc: 22, work_hardening: false, bue_tendency: "low", chip_type: "segmented", abrasiveness: 0.4 },
};

function getMaterial(name?: string): MaterialProps {
  if (!name) return MATERIAL_DB.steel;
  const key = name.toLowerCase().replace(/[\s-_]/g, "");
  if (key.includes("alum") || key.includes("6061") || key.includes("7075")) return MATERIAL_DB.aluminum;
  if (key.includes("inconel") || key.includes("718") || key.includes("nickel")) return MATERIAL_DB.inconel;
  if (key.includes("titan") || key.includes("ti6al")) return MATERIAL_DB.titanium;
  if (key.includes("stainless") || key.includes("304") || key.includes("316") || key.includes("17-4")) return MATERIAL_DB.stainless;
  if (key.includes("cast") || key.includes("iron")) return MATERIAL_DB.cast_iron;
  return MATERIAL_DB.steel;
}

// ─── Counter ─────────────────────────────────────────────────────────────────

let problemCounter = 0;

// ─── Surface Finish Inverse Solver ───────────────────────────────────────────

function solveSurfaceFinish(input: InverseProblemInput): InverseSolution {
  problemCounter++;
  const id = `INV-SF-${String(problemCounter).padStart(4, "0")}`;
  const mat = getMaterial(input.material);
  const d = input.tool_diameter_mm ?? 10;
  const z = input.flutes ?? 4;
  const rpm = input.rpm ?? 3000;
  const feed = input.feed_mmmin ?? 1000;
  const fz = z > 0 ? feed / (rpm * z) : 0.1;
  const measuredRa = input.measured_ra_um ?? 3.2;
  const expectedRa = input.expected_ra_um ?? 1.6;

  // Calculate theoretical Ra from feed marks: Ra ≈ fz² / (32 * r)
  const noseRadius = d > 6 ? 0.8 : 0.4; // mm estimate
  const theoreticalRa = (fz * fz) / (32 * noseRadius) * 1000; // µm

  const causes: RootCause[] = [];

  // Cause 1: Feed too high (feed marks dominate)
  if (theoreticalRa > expectedRa * 1.2) {
    causes.push({
      cause: "Feed rate too high",
      probability: 0.85,
      severity: "medium",
      explanation: `At fz=${(fz*1000).toFixed(1)} µm/tooth, theoretical Ra from feed marks alone is ${theoreticalRa.toFixed(1)} µm, which exceeds your target of ${expectedRa} µm.`,
      physics_basis: "Ra_theoretical = fz² / (32 × nose_radius). Feed marks are the dominant surface texture when fz is too large relative to tool nose radius.",
      fixes: [
        { action: "Reduce feed per tooth", effectiveness: 0.9, difficulty: "easy", cost: "low", details: `Reduce fz to ${Math.sqrt(expectedRa * 32 * noseRadius / 1000).toFixed(3)} mm/tooth to achieve Ra=${expectedRa} µm` },
        { action: "Use tool with larger nose radius", effectiveness: 0.8, difficulty: "moderate", cost: "medium", details: "Larger nose radius reduces theoretical Ra at the same feed rate" },
        { action: "Add a spring pass", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "A spring pass at same depth with no radial load produces better finish" },
      ],
    });
  }

  // Cause 2: Chatter marks
  const toothPassFreq = rpm * z / 60;
  if (measuredRa > theoreticalRa * 2) {
    causes.push({
      cause: "Chatter vibration",
      probability: measuredRa > theoreticalRa * 3 ? 0.8 : 0.5,
      severity: "high",
      explanation: `Measured Ra (${measuredRa} µm) is ${(measuredRa / theoreticalRa).toFixed(1)}× worse than theoretical (${theoreticalRa.toFixed(1)} µm). This gap suggests vibration is adding texture beyond feed marks.`,
      physics_basis: "When measured Ra >> theoretical Ra, external vibration sources (chatter, resonance) are superimposing additional surface texture. Chatter marks appear as regular waviness at the dominant vibration frequency.",
      fixes: [
        { action: "Change RPM to stable pocket", effectiveness: 0.85, difficulty: "easy", cost: "low", details: `Try RPM ±10-15% to find a stable lobe. Tooth passing frequency is currently ${toothPassFreq.toFixed(0)} Hz.` },
        { action: "Reduce DOC", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "Reducing depth of cut reduces cutting force and moves the process further from stability boundary" },
        { action: "Use shorter tool overhang", effectiveness: 0.8, difficulty: "moderate", cost: "low", details: "Shorter stick-out increases tool stiffness and raises natural frequency" },
      ],
    });
  }

  // Cause 3: Tool deflection
  const stickout = d * 4; // assume 4×D
  const deflection_um = (input.doc_mm ?? 1) * 50 / (d * d * d) * stickout * stickout * stickout * 0.001; // rough estimate
  if (deflection_um > 5) {
    causes.push({
      cause: "Tool deflection",
      probability: 0.6,
      severity: "medium",
      explanation: `Estimated tool deflection is ~${deflection_um.toFixed(1)} µm. Excessive deflection causes inconsistent engagement and surface texture variation.`,
      physics_basis: "Tool deflection δ ∝ F × L³ / (E × I). Long overhang with small diameter creates significant deflection that modulates the cutting surface.",
      fixes: [
        { action: "Use shorter tool", effectiveness: 0.85, difficulty: "moderate", cost: "medium", details: "Reducing overhang from 4×D to 2.5×D reduces deflection by ~75%" },
        { action: "Reduce radial depth of cut", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "Lower ae reduces cutting force, proportionally reducing deflection" },
        { action: "Use larger diameter tool", effectiveness: 0.6, difficulty: "moderate", cost: "medium", details: "Moment of inertia scales with D⁴ — doubling diameter reduces deflection 16×" },
      ],
    });
  }

  // Cause 4: BUE (built-up edge)
  if (mat.bue_tendency !== "low") {
    const vcActual = Math.PI * d * rpm / 1000;
    const vcLow = mat.vc_range[0];
    if (vcActual < vcLow * 0.7) {
      causes.push({
        cause: "Built-Up Edge (BUE)",
        probability: mat.bue_tendency === "high" ? 0.75 : 0.45,
        severity: "medium",
        explanation: `Cutting speed Vc=${vcActual.toFixed(0)} m/min is well below the recommended minimum of ${vcLow} m/min for ${input.material ?? "this material"}. At low speeds, material adheres to the cutting edge, creating an unstable BUE that periodically tears off, leaving a rough, smeared surface.`,
        physics_basis: "BUE forms when cutting temperature is too low for the chip to flow smoothly past the rake face. The material welds to the tool under pressure, grows until mechanically unstable, then breaks away — taking coating and creating surface defects.",
        fixes: [
          { action: "Increase cutting speed", effectiveness: 0.9, difficulty: "easy", cost: "low", details: `Increase Vc to at least ${vcLow} m/min (RPM=${Math.round(vcLow * 1000 / (Math.PI * d))})` },
          { action: "Apply high-pressure coolant", effectiveness: 0.6, difficulty: "moderate", cost: "medium", details: "Through-tool coolant at >70 bar helps flush BUE formation" },
          { action: "Use polished rake face insert", effectiveness: 0.7, difficulty: "moderate", cost: "medium", details: "Polished inserts reduce adhesion tendency" },
        ],
      });
    }
  }

  // Cause 5: Tool wear
  causes.push({
    cause: "Excessive tool wear",
    probability: 0.4,
    severity: "medium",
    explanation: "A worn cutting edge produces progressively worse surface finish. Flank wear increases the contact area, generating more friction and heat, which degrades surface quality.",
    physics_basis: "As VB (flank wear land) increases, the effective nose radius changes and ploughing increases. Surface finish degrades roughly linearly with flank wear width.",
    fixes: [
      { action: "Replace or index the tool", effectiveness: 0.95, difficulty: "easy", cost: "medium", details: "If the tool has been running for more than 70% of estimated life, replace it" },
      { action: "Reduce cutting speed", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Lower Vc reduces wear rate but extends cycle time" },
    ],
  });

  // Sort by probability
  causes.sort((a, b) => b.probability - a.probability);

  return {
    problem_id: id,
    problem_type: "surface_finish",
    symptom_summary: `Surface finish Ra=${measuredRa} µm, target was ${expectedRa} µm (${((measuredRa / expectedRa - 1) * 100).toFixed(0)}% worse than expected)`,
    root_causes: causes,
    primary_cause: causes[0]?.cause ?? "Unknown",
    recommended_fix: causes[0]?.fixes[0]?.action ?? "Inspect tool and parameters",
    confidence: causes[0]?.probability > 0.7 ? "high" : causes[0]?.probability > 0.4 ? "medium" : "low",
  };
}

// ─── Tool Life Inverse Solver ────────────────────────────────────────────────

function solveToolLife(input: InverseProblemInput): InverseSolution {
  problemCounter++;
  const id = `INV-TL-${String(problemCounter).padStart(4, "0")}`;
  const mat = getMaterial(input.material);
  const d = input.tool_diameter_mm ?? 10;
  const rpm = input.rpm ?? 3000;
  const fz_mm = input.flutes && input.feed_mmmin ? input.feed_mmmin / (rpm * input.flutes) : 0.08;
  const vcActual = Math.PI * d * rpm / 1000;
  const actualLife = input.tool_life_min ?? 10;
  const expectedLife = input.expected_tool_life_min ?? 45;
  const lifeRatio = actualLife / expectedLife;

  const causes: RootCause[] = [];

  // Cause 1: Speed too high
  const vcHigh = mat.vc_range[1];
  if (vcActual > vcHigh * 0.9) {
    // Taylor's equation: V*T^n = C → T = (C/V)^(1/n)
    // Doubling speed reduces life by factor of 2^(1/n) ≈ 8× for n=0.3
    const excessPct = ((vcActual / vcHigh) - 1) * 100;
    causes.push({
      cause: "Cutting speed too high",
      probability: Math.min(0.95, 0.5 + excessPct / 100),
      severity: excessPct > 20 ? "critical" : "high",
      explanation: `Vc=${vcActual.toFixed(0)} m/min ${excessPct > 0 ? `exceeds` : `is near`} the recommended max of ${vcHigh} m/min. By Taylor's equation, a ${Math.abs(excessPct).toFixed(0)}% speed increase can reduce tool life by ${Math.round(Math.pow(1 + excessPct / 100, 1 / 0.25) * 100 - 100)}%.`,
      physics_basis: "Taylor's tool life equation: V × T^n = C. Tool life is exponentially sensitive to cutting speed. For carbide tools (n≈0.25), a 20% speed increase reduces life by ~60%.",
      fixes: [
        { action: "Reduce cutting speed", effectiveness: 0.9, difficulty: "easy", cost: "low", details: `Reduce Vc to ${Math.round(vcHigh * 0.8)} m/min (RPM=${Math.round(vcHigh * 0.8 * 1000 / (Math.PI * d))})` },
        { action: "Switch to more wear-resistant grade", effectiveness: 0.7, difficulty: "moderate", cost: "medium", details: "A harder carbide grade or more heat-resistant coating extends life at higher speeds" },
      ],
    });
  }

  // Cause 2: Chip thickness too thin (rubbing)
  if (fz_mm < 0.03) {
    causes.push({
      cause: "Chip too thin — rubbing wear",
      probability: 0.7,
      severity: "high",
      explanation: `Feed per tooth fz=${(fz_mm * 1000).toFixed(1)} µm is very thin. Below the minimum chip thickness (~30 µm for carbide), the tool rubs instead of cutting, causing rapid flank wear from friction heat.`,
      physics_basis: "Below minimum chip thickness (hmin ≈ 0.3 × edge radius), the tool ploughs rather than shears. This generates heat without removing material, accelerating diffusion and abrasive wear mechanisms.",
      fixes: [
        { action: "Increase feed per tooth", effectiveness: 0.85, difficulty: "easy", cost: "low", details: `Increase fz to at least 0.04-0.06 mm/tooth to ensure proper chip formation` },
        { action: "Use a sharper tool (smaller edge radius)", effectiveness: 0.6, difficulty: "moderate", cost: "medium", details: "Sharp-ground tools have lower minimum chip thickness" },
      ],
    });
  }

  // Cause 3: Material harder than expected
  if (mat.hardness_hrc > 30) {
    causes.push({
      cause: "Material harder than expected",
      probability: lifeRatio < 0.3 ? 0.6 : 0.35,
      severity: "medium",
      explanation: `${input.material ?? "This material"} at ${mat.hardness_hrc} HRC. Batch variation in hardness (±3 HRC is common) significantly impacts tool life. A batch on the hard end can reduce life by 30-50%.`,
      physics_basis: "Cutting force scales with material hardness. Higher hardness increases tool-chip interface temperature and mechanical stress on the cutting edge, accelerating both abrasive and diffusion wear.",
      fixes: [
        { action: "Verify material hardness with portable tester", effectiveness: 0.3, difficulty: "easy", cost: "low", details: "Measure actual hardness to confirm it matches specification" },
        { action: "Reduce speed for harder material", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "If hardness is higher than spec, reduce Vc proportionally" },
        { action: "Switch to harder grade insert", effectiveness: 0.6, difficulty: "moderate", cost: "medium", details: "Harder carbide grade or different coating for higher-hardness range" },
      ],
    });
  }

  // Cause 4: Inadequate coolant
  if (mat.thermal_conductivity < 20) {
    causes.push({
      cause: "Inadequate coolant delivery",
      probability: 0.5,
      severity: "high",
      explanation: `${input.material ?? "This material"} has low thermal conductivity (${mat.thermal_conductivity} W/m·K). Heat concentrates at the cutting edge. Without effective coolant delivery, tool-chip interface temperature can exceed coating limits.`,
      physics_basis: "In low-conductivity materials, ~80% of cutting heat goes into the chip but the remainder concentrates in the tool. Effective coolant reduces tool temperature by 150-300°C, dramatically extending life.",
      fixes: [
        { action: "Apply high-pressure through-tool coolant", effectiveness: 0.8, difficulty: "moderate", cost: "medium", details: "Through-tool coolant at >40 bar targets the cutting zone directly" },
        { action: "Increase coolant concentration", effectiveness: 0.4, difficulty: "easy", cost: "low", details: "Higher concentration improves lubricity and cooling effectiveness" },
        { action: "Switch to MQL if appropriate", effectiveness: 0.5, difficulty: "moderate", cost: "medium", details: "MQL can be more effective than flood for some materials by reducing thermal shock" },
      ],
    });
  }

  // Cause 5: Interrupted cut
  causes.push({
    cause: "Mechanical impact from interrupted cut",
    probability: 0.3,
    severity: "medium",
    explanation: "If the cut is interrupted (holes, slots, keyways in the workpiece), each entry/exit creates a mechanical shock on the cutting edge that can cause micro-chipping and accelerated wear.",
    physics_basis: "Each tool entry generates impact loading up to 2-3× the steady-state cutting force. Repeated impacts cause fatigue cracking along the cutting edge, leading to edge chipping or catastrophic failure.",
    fixes: [
      { action: "Use tougher (less hard) insert grade", effectiveness: 0.7, difficulty: "moderate", cost: "medium", details: "Tougher grades absorb impact without chipping. Trade some wear resistance for impact resistance." },
      { action: "Reduce entry speed", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Program reduced feed rate during tool entry to soften the impact" },
      { action: "Use arc-in entry instead of linear", effectiveness: 0.6, difficulty: "moderate", cost: "low", details: "Arc-in gradually loads the tool instead of sudden full engagement" },
    ],
  });

  // Cause 6: Wrong tool grade
  if (mat.abrasiveness > 0.6) {
    causes.push({
      cause: "Wrong tool grade for material",
      probability: 0.55,
      severity: "high",
      explanation: `${input.material ?? "This material"} is highly abrasive (index ${mat.abrasiveness.toFixed(1)}). Using a standard carbide grade without appropriate coating leads to rapid abrasive wear.`,
      physics_basis: "Abrasive materials contain hard particles (carbides, oxides) that scratch the flank face. Only coatings with hardness exceeding the abrasive particles (AlTiN, TiAlN, diamond-like) provide protection.",
      fixes: [
        { action: "Switch to AlTiN or TiAlN-coated grade", effectiveness: 0.8, difficulty: "moderate", cost: "medium", details: "These coatings resist abrasive wear and high temperatures" },
        { action: "Consider ceramic or CBN insert", effectiveness: 0.7, difficulty: "hard", cost: "high", details: "For extreme abrasion, ceramic or CBN provides superior wear resistance" },
      ],
    });
  }

  causes.sort((a, b) => b.probability - a.probability);

  return {
    problem_id: id,
    problem_type: "tool_life",
    symptom_summary: `Tool lasted ${actualLife} min vs expected ${expectedLife} min (${Math.round(lifeRatio * 100)}% of expected life)`,
    root_causes: causes,
    primary_cause: causes[0]?.cause ?? "Unknown",
    recommended_fix: causes[0]?.fixes[0]?.action ?? "Review cutting parameters",
    confidence: causes[0]?.probability > 0.7 ? "high" : causes[0]?.probability > 0.4 ? "medium" : "low",
  };
}

// ─── Dimensional Error Inverse Solver ────────────────────────────────────────

function solveDimensional(input: InverseProblemInput): InverseSolution {
  problemCounter++;
  const id = `INV-DIM-${String(problemCounter).padStart(4, "0")}`;
  const mat = getMaterial(input.material);
  const d = input.tool_diameter_mm ?? 10;
  const errorMm = input.dimensional_error_mm ?? 0.05;
  const errorUm = errorMm * 1000;
  const direction = input.error_direction ?? "undersize";

  const causes: RootCause[] = [];

  // Cause 1: Tool deflection (usually undersize)
  if (direction === "undersize") {
    const stickout = d * 4;
    const estForce = (input.doc_mm ?? 1) * (input.woc_mm ?? d * 0.5) * 20; // rough force estimate in N
    const deflUm = estForce * Math.pow(stickout, 3) / (3 * 200e3 * Math.PI * Math.pow(d / 2, 4) / 4) * 1000;
    causes.push({
      cause: "Tool deflection under cutting load",
      probability: errorUm > 10 && errorUm < 100 ? 0.8 : 0.5,
      severity: errorUm > 50 ? "high" : "medium",
      explanation: `Estimated tool deflection is ~${deflUm.toFixed(1)} µm. At ${d}mm diameter with ~4×D overhang, the tool bends away from the workpiece, leaving material behind.`,
      physics_basis: "Tool deflection δ = F×L³/(3×E×I). For a Ø10mm carbide endmill at 4×D overhang under 200N, deflection ≈ 25 µm. This produces consistent undersize errors.",
      fixes: [
        { action: "Add a spring pass", effectiveness: 0.85, difficulty: "easy", cost: "low", details: "A spring pass at the same programmed depth removes residual stock because the tool is now unloaded (no deflection)" },
        { action: "Use shorter tool overhang", effectiveness: 0.8, difficulty: "moderate", cost: "low", details: `Reduce overhang from 4×D to 2.5×D to reduce deflection by ~75%` },
        { action: "Program compensating oversize", effectiveness: 0.7, difficulty: "easy", cost: "low", details: `Program ${errorMm.toFixed(3)}mm deeper/wider to compensate for deflection` },
        { action: "Reduce cutting force", effectiveness: 0.6, difficulty: "easy", cost: "low", details: "Lower DOC or feed to reduce the force causing deflection" },
      ],
    });
  }

  // Cause 2: Thermal growth
  causes.push({
    cause: "Machine thermal growth",
    probability: direction === "inconsistent" ? 0.75 : 0.45,
    severity: "medium",
    explanation: `CNC machines grow as they warm up. Spindle thermal expansion can cause 10-50 µm of Z-axis drift over the first 30-60 minutes. Your error of ${errorUm.toFixed(0)} µm is within this range.`,
    physics_basis: "Steel spindle/column thermal expansion: α ≈ 12 µm/m/°C. A 5°C temperature rise on a 500mm Z column = 30 µm growth. Warm-up drift is the #1 cause of morning-shift dimensional variation.",
    fixes: [
      { action: "Warm up the machine for 15-30 min before critical cuts", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "Run the spindle at mid-range RPM for 15-30 min to stabilize thermal equilibrium" },
      { action: "Re-zero after warm-up", effectiveness: 0.8, difficulty: "easy", cost: "low", details: "Touch off your reference surface after the machine is thermally stable" },
      { action: "Use in-machine probing for periodic offset updates", effectiveness: 0.9, difficulty: "moderate", cost: "medium", details: "Probe a reference datum every N parts to track and compensate drift" },
    ],
  });

  // Cause 3: Material springback
  if (mat.hardness_hrc > 25 || mat.work_hardening) {
    causes.push({
      cause: "Elastic springback of workpiece",
      probability: direction === "undersize" ? 0.5 : 0.3,
      severity: "medium",
      explanation: `${input.material ?? "This material"} has significant elastic recovery. The material deforms elastically under the tool, then springs back after cutting, leaving less material removed than programmed.`,
      physics_basis: "Elastic recovery δ_e = σ/E × contact_length. Higher yield strength materials recover more. For hardened steel, elastic recovery can be 5-15 µm per pass.",
      fixes: [
        { action: "Take a finishing pass with minimal DOC", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "A light finishing pass (0.05-0.1mm) minimizes elastic deflection of the workpiece" },
        { action: "Use a sharper tool", effectiveness: 0.5, difficulty: "moderate", cost: "medium", details: "Sharper edge radius reduces the deformation zone and springback" },
      ],
    });
  }

  // Cause 4: Tool wear compensation not updating
  causes.push({
    cause: "Tool wear not compensated",
    probability: direction === "undersize" ? 0.55 : direction === "oversize" ? 0.4 : 0.3,
    severity: "medium",
    explanation: "As the tool wears, the effective diameter decreases (for milling) or the edge recedes (for turning). If wear compensation is not applied, parts gradually drift out of tolerance.",
    physics_basis: "Flank wear (VB) reduces the effective cutting radius by approximately VB × sin(clearance_angle). A VB of 0.2mm with 7° clearance = ~25 µm diameter loss.",
    fixes: [
      { action: "Implement automatic tool wear compensation", effectiveness: 0.85, difficulty: "moderate", cost: "low", details: "Update tool length/radius offset after each tool life interval" },
      { action: "Use in-process gauging", effectiveness: 0.9, difficulty: "hard", cost: "high", details: "Measure part during production and adjust offsets automatically" },
    ],
  });

  // Cause 5: Workpiece thermal expansion
  if (mat.thermal_conductivity < 30) {
    causes.push({
      cause: "Workpiece thermal expansion during cutting",
      probability: direction === "oversize" ? 0.6 : 0.3,
      severity: "low",
      explanation: "Heat from cutting causes the workpiece to expand locally. Parts measured hot appear oversize; when cooled, they may be correct or even undersize.",
      physics_basis: "For steel: α ≈ 12 µm/m/°C. A 10°C local temperature rise on a 100mm feature = 12 µm expansion. Parts should be measured at 20°C reference temperature.",
      fixes: [
        { action: "Let part cool before measuring", effectiveness: 0.8, difficulty: "easy", cost: "low", details: "Wait 15-30 min or use coolant to bring part to reference temperature" },
        { action: "Improve coolant delivery", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Better cooling reduces workpiece temperature rise during cutting" },
      ],
    });
  }

  causes.sort((a, b) => b.probability - a.probability);

  return {
    problem_id: id,
    problem_type: "dimensional",
    symptom_summary: `Part is ${errorMm.toFixed(3)}mm ${direction} (${errorUm.toFixed(0)} µm error)`,
    root_causes: causes,
    primary_cause: causes[0]?.cause ?? "Unknown",
    recommended_fix: causes[0]?.fixes[0]?.action ?? "Inspect setup and offsets",
    confidence: causes[0]?.probability > 0.7 ? "high" : causes[0]?.probability > 0.4 ? "medium" : "low",
  };
}

// ─── Chatter Inverse Solver ──────────────────────────────────────────────────

function solveChatter(input: InverseProblemInput): InverseSolution {
  problemCounter++;
  const id = `INV-CH-${String(problemCounter).padStart(4, "0")}`;
  const d = input.tool_diameter_mm ?? 10;
  const z = input.flutes ?? 4;
  const rpm = input.rpm ?? 3000;
  const doc = input.doc_mm ?? 2;
  const chatterFreq = input.chatter_frequency_hz;

  const toothPassFreq = rpm * z / 60;
  // Estimate tool natural frequency (simplified cantilever beam)
  const stickout = d * 4; // mm
  const toolNatFreq = 3.516 / (2 * Math.PI) * Math.sqrt(200e9 * Math.PI * Math.pow(d / 2000, 4) / 4 / (7800 * Math.PI * Math.pow(d / 2000, 2) * Math.pow(stickout / 1000, 4)));

  const causes: RootCause[] = [];

  // Cause 1: Regenerative chatter (most common)
  causes.push({
    cause: "Regenerative chatter — unstable cutting at current RPM",
    probability: 0.7,
    severity: "high",
    explanation: `At ${rpm} RPM with ${z} flutes, tooth passing frequency is ${toothPassFreq.toFixed(0)} Hz. The tool assembly's estimated natural frequency is ~${toolNatFreq.toFixed(0)} Hz. ${Math.abs(toothPassFreq - toolNatFreq) < toolNatFreq * 0.3 ? "These are close, indicating likely resonance." : "The current RPM may be in an unstable lobe of the stability diagram."}`,
    physics_basis: "Regenerative chatter occurs when the vibration from one tooth pass modulates the chip thickness for the next tooth. When the phase relationship amplifies oscillations (positive feedback), the system becomes unstable. This depends on RPM, DOC, and the dynamic stiffness of the tool-workpiece system.",
    fixes: [
      { action: "Change RPM to a stable pocket", effectiveness: 0.85, difficulty: "easy", cost: "low", details: `Try ${Math.round(rpm * 0.85)} or ${Math.round(rpm * 1.15)} RPM. Stability lobes are typically spaced at intervals of 60/z × natural_frequency.` },
      { action: "Reduce axial depth of cut", effectiveness: 0.8, difficulty: "easy", cost: "low", details: `Current DOC=${doc}mm. Reduce to ${(doc * 0.5).toFixed(1)}mm to move below the stability limit (critical depth). Compensate with higher radial width if needed.` },
      { action: "Use variable-pitch or variable-helix tool", effectiveness: 0.75, difficulty: "moderate", cost: "medium", details: "Variable geometry breaks the regenerative feedback loop by disrupting the phase relationship between successive tooth passes" },
    ],
  });

  // Cause 2: Forced vibration
  causes.push({
    cause: "Forced vibration from unbalanced tool or spindle",
    probability: chatterFreq && Math.abs(chatterFreq - rpm / 60) < 10 ? 0.8 : 0.3,
    severity: "medium",
    explanation: chatterFreq
      ? `Chatter frequency ${chatterFreq} Hz ${Math.abs(chatterFreq - rpm / 60) < 10 ? "matches" : "does not match"} spindle frequency ${(rpm / 60).toFixed(1)} Hz. ${Math.abs(chatterFreq - rpm / 60) < 10 ? "This indicates unbalance or runout." : ""}`
      : "If the vibration frequency equals the spindle rotation frequency (1×RPM), the cause is likely tool or spindle unbalance.",
    physics_basis: "Forced vibration at 1× spindle speed indicates mass imbalance. At 2× indicates misalignment. The amplitude grows with RPM² for unbalance-driven vibration.",
    fixes: [
      { action: "Balance the tool holder assembly", effectiveness: 0.8, difficulty: "moderate", cost: "medium", details: "Use a balancing machine or balanceable holder. G2.5 or better at operating speed." },
      { action: "Check spindle runout with dial indicator", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Mount a dial indicator on the spindle nose and check TIR. Should be < 5 µm." },
      { action: "Replace tool holder if runout exceeds 10 µm", effectiveness: 0.7, difficulty: "moderate", cost: "medium", details: "Worn or damaged holders cause excessive runout that amplifies vibration" },
    ],
  });

  // Cause 3: Workpiece flexibility
  causes.push({
    cause: "Workpiece vibration — insufficient fixturing",
    probability: 0.4,
    severity: "high",
    explanation: "If the workpiece is not rigidly clamped, it can vibrate independently of the tool, creating chatter marks. This is common with thin-walled parts, long overhangs, or weak clamping.",
    physics_basis: "The workpiece has its own natural frequencies. If cutting forces excite these frequencies, the workpiece vibrates and the surface finish and dimensional accuracy degrade. The stability boundary depends on the combined dynamic stiffness of both tool AND workpiece.",
    fixes: [
      { action: "Add workholding support near the cutting zone", effectiveness: 0.8, difficulty: "moderate", cost: "low", details: "Add a support jack, steady rest, or additional clamp near where cutting occurs" },
      { action: "Increase clamping force", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Ensure clamps are tight and positioned to resist cutting forces directly" },
      { action: "Reduce cutting forces", effectiveness: 0.6, difficulty: "easy", cost: "low", details: "Lower DOC and feed to reduce the excitation force below the workpiece's vibration threshold" },
    ],
  });

  // Cause 4: Wrong strategy
  causes.push({
    cause: "Conventional milling instead of climb — increased vibration tendency",
    probability: 0.25,
    severity: "low",
    explanation: "Conventional milling starts with zero chip thickness and increases, which creates more vibration tendency. Climb milling starts thick and reduces, which is inherently more stable.",
    physics_basis: "In conventional milling, the cutting force direction reverses at entry. This force reversal excites the tool at the tooth passing frequency. Climb milling maintains consistent force direction, improving stability.",
    fixes: [
      { action: "Switch to climb milling", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Change toolpath from conventional to climb. Most modern CAM defaults to climb." },
    ],
  });

  causes.sort((a, b) => b.probability - a.probability);

  return {
    problem_id: id,
    problem_type: "chatter",
    symptom_summary: `Chatter detected at ${rpm} RPM, DOC=${doc}mm${chatterFreq ? `, frequency ~${chatterFreq} Hz` : ""}`,
    root_causes: causes,
    primary_cause: causes[0]?.cause ?? "Unknown",
    recommended_fix: causes[0]?.fixes[0]?.action ?? "Adjust RPM to find stable pocket",
    confidence: causes.length > 0 && causes[0].probability > 0.6 ? "high" : "medium",
    additional_data_needed: chatterFreq ? undefined : ["Chatter frequency (from sound analysis or accelerometer) would narrow diagnosis significantly"],
  };
}

// ─── General Troubleshooter ──────────────────────────────────────────────────

function solveGeneral(input: InverseProblemInput): InverseSolution {
  problemCounter++;
  const id = `INV-GEN-${String(problemCounter).padStart(4, "0")}`;
  const symptoms = input.symptoms ?? [];

  const causes: RootCause[] = [];

  // Map symptoms to likely causes
  const symptomMap: Record<string, RootCause> = {
    "blue_chips": {
      cause: "Excessive cutting temperature",
      probability: 0.9, severity: "high",
      explanation: "Blue/purple chips indicate cutting temperature > 300°C for steel. This is above the temper color threshold and means the tool is running too hot.",
      physics_basis: "Oxide film thickness on steel chips corresponds to temperature: straw=220°C, brown=260°C, purple=280°C, blue=300°C+. Blue chips mean tool-chip interface likely exceeds 600°C.",
      fixes: [
        { action: "Reduce cutting speed by 20-30%", effectiveness: 0.8, difficulty: "easy", cost: "low", details: "Lower Vc directly reduces cutting temperature" },
        { action: "Improve coolant delivery", effectiveness: 0.6, difficulty: "moderate", cost: "medium", details: "Ensure coolant reaches the cutting zone effectively" },
      ],
    },
    "long_stringy_chips": {
      cause: "Feed too low — poor chip control",
      probability: 0.8, severity: "medium",
      explanation: "Long, stringy chips indicate feed per tooth is too low. Thin chips don't break naturally and wrap around the tool, causing surface damage and safety hazards.",
      physics_basis: "Chip breaking depends on chip thickness and material ductility. Below critical thickness, chips curl continuously without breaking. Increasing fz produces thicker, shorter chips that break on ejection.",
      fixes: [
        { action: "Increase feed per tooth by 30-50%", effectiveness: 0.85, difficulty: "easy", cost: "low", details: "Thicker chips break more readily. This also improves tool life by avoiding rubbing." },
        { action: "Use a chipbreaker geometry tool", effectiveness: 0.7, difficulty: "moderate", cost: "medium", details: "Chipbreaker inserts curl and break chips mechanically" },
      ],
    },
    "vibration": {
      cause: "Chatter or resonance", probability: 0.75, severity: "high",
      explanation: "Vibration during cutting indicates chatter (self-excited vibration) or forced vibration from unbalance/misalignment.",
      physics_basis: "See chatter inverse solver for detailed analysis.",
      fixes: [
        { action: "Change RPM by ±10-15%", effectiveness: 0.8, difficulty: "easy", cost: "low", details: "Find a stable pocket in the stability lobe diagram" },
        { action: "Reduce depth of cut", effectiveness: 0.7, difficulty: "easy", cost: "low", details: "Move below the critical stability limit" },
      ],
    },
    "tool_breakage": {
      cause: "Mechanical overload or collision", probability: 0.8, severity: "critical",
      explanation: "Tool breakage indicates the cutting forces exceeded the tool's mechanical strength. This can be from excessive parameters, collision, or a hard inclusion in the material.",
      physics_basis: "Tool failure occurs when stress exceeds the transverse rupture strength of the carbide. This can be bending stress from excessive force, impact from interrupted cut, or fatigue from cyclic loading.",
      fixes: [
        { action: "Reduce DOC and feed significantly", effectiveness: 0.8, difficulty: "easy", cost: "low", details: "Start at 50% of previous parameters and work up" },
        { action: "Check program for collisions", effectiveness: 0.7, difficulty: "moderate", cost: "low", details: "Verify rapid moves, retract heights, and clearance planes" },
        { action: "Use a tougher tool grade", effectiveness: 0.6, difficulty: "moderate", cost: "medium", details: "Higher toughness grade resists fracture but may wear faster" },
      ],
    },
    "poor_finish": {
      cause: "Surface finish issues — multiple possible causes", probability: 0.6, severity: "medium",
      explanation: "Poor surface finish can result from feed marks, chatter, tool wear, BUE, or deflection. Use the dedicated surface finish solver for detailed analysis.",
      physics_basis: "Surface texture is the superposition of: feed marks (kinematic), vibration marks (dynamic), and material-side effects (BUE tearing, smearing).",
      fixes: [
        { action: "Run surface finish inverse solver for detailed analysis", effectiveness: 0.9, difficulty: "easy", cost: "low", details: "Use problem_type='surface_finish' with measured Ra for targeted diagnosis" },
      ],
    },
    "noise": {
      cause: "Abnormal cutting conditions", probability: 0.6, severity: "medium",
      explanation: "Unusual noise during cutting (squealing, grinding, hammering) indicates the process is outside normal bounds. Squealing often indicates rubbing, grinding indicates wrong parameters, and hammering indicates chatter or interrupted cut impact.",
      physics_basis: "Audible frequency range 20 Hz - 20 kHz covers most machining vibration modes. Experienced machinists diagnose by ear because different failure modes produce characteristic sounds.",
      fixes: [
        { action: "Stop and inspect the tool", effectiveness: 0.5, difficulty: "easy", cost: "low", details: "Check for wear, chipping, or BUE before continuing" },
        { action: "Reduce parameters by 30%", effectiveness: 0.6, difficulty: "easy", cost: "low", details: "Reduce speed and feed to see if noise diminishes" },
      ],
    },
  };

  for (const symptom of symptoms) {
    const key = symptom.toLowerCase().replace(/[\s-]/g, "_");
    for (const [mapKey, cause] of Object.entries(symptomMap)) {
      if (key.includes(mapKey) || mapKey.includes(key)) {
        causes.push(cause);
        break;
      }
    }
  }

  // If no symptoms matched, provide general guidance
  if (causes.length === 0) {
    causes.push({
      cause: "Insufficient symptom data for diagnosis",
      probability: 0.3,
      severity: "low",
      explanation: "No specific symptoms matched known patterns. Provide more details about what you're observing.",
      physics_basis: "Manufacturing diagnosis requires specific observable symptoms to narrow the root cause.",
      fixes: [
        { action: "Describe the specific problem: surface finish, tool life, dimension, or chatter", effectiveness: 0.9, difficulty: "easy", cost: "low", details: "Use a specific problem_type for targeted analysis" },
      ],
    });
  }

  causes.sort((a, b) => b.probability - a.probability);

  return {
    problem_id: id,
    problem_type: "general",
    symptom_summary: symptoms.length > 0 ? `Symptoms reported: ${symptoms.join(", ")}` : "No specific symptoms provided",
    root_causes: causes,
    primary_cause: causes[0]?.cause ?? "Unknown",
    recommended_fix: causes[0]?.fixes[0]?.action ?? "Provide more details for targeted analysis",
    confidence: causes[0]?.probability > 0.7 ? "high" : causes[0]?.probability > 0.4 ? "medium" : "low",
    additional_data_needed: symptoms.length === 0 ? ["Specific symptoms (e.g., blue_chips, long_stringy_chips, vibration, tool_breakage, poor_finish, noise)"] : undefined,
  };
}

// ─── History ─────────────────────────────────────────────────────────────────

const solutionHistory: InverseSolution[] = [];

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Actions:
 *   inverse_solve          — Solve an inverse manufacturing problem
 *   inverse_surface        — Surface finish specific solver (shortcut)
 *   inverse_tool_life      — Tool life specific solver (shortcut)
 *   inverse_dimensional    — Dimensional error specific solver (shortcut)
 *   inverse_chatter        — Chatter specific solver (shortcut)
 *   inverse_troubleshoot   — General multi-symptom troubleshooter
 *   inverse_history        — Get previous inverse solutions
 *   inverse_get            — Get a specific solution by ID
 */
export function inverseSolver(action: string, params: Record<string, any>): any {
  switch (action) {
    case "inverse_solve": {
      const type = params.problem_type as InverseProblemType ?? "general";
      let solution: InverseSolution;
      switch (type) {
        case "surface_finish": solution = solveSurfaceFinish(params); break;
        case "tool_life": solution = solveToolLife(params); break;
        case "dimensional": solution = solveDimensional(params); break;
        case "chatter": solution = solveChatter(params); break;
        default: solution = solveGeneral(params); break;
      }
      solutionHistory.push(solution);
      return solution;
    }

    case "inverse_surface": {
      const solution = solveSurfaceFinish(params);
      solutionHistory.push(solution);
      return solution;
    }

    case "inverse_tool_life": {
      const solution = solveToolLife(params);
      solutionHistory.push(solution);
      return solution;
    }

    case "inverse_dimensional": {
      const solution = solveDimensional(params);
      solutionHistory.push(solution);
      return solution;
    }

    case "inverse_chatter": {
      const solution = solveChatter(params);
      solutionHistory.push(solution);
      return solution;
    }

    case "inverse_troubleshoot": {
      const solution = solveGeneral(params);
      solutionHistory.push(solution);
      return solution;
    }

    case "inverse_history":
      return {
        solutions: solutionHistory,
        total: solutionHistory.length,
        by_type: {
          surface_finish: solutionHistory.filter(s => s.problem_type === "surface_finish").length,
          tool_life: solutionHistory.filter(s => s.problem_type === "tool_life").length,
          dimensional: solutionHistory.filter(s => s.problem_type === "dimensional").length,
          chatter: solutionHistory.filter(s => s.problem_type === "chatter").length,
          general: solutionHistory.filter(s => s.problem_type === "general").length,
        },
      };

    case "inverse_get": {
      const id = params.problem_id ?? params.id ?? "";
      const solution = solutionHistory.find(s => s.problem_id === id);
      if (!solution) return { error: "Solution not found", id };
      return solution;
    }

    default:
      return { error: `InverseSolverEngine: unknown action "${action}"` };
  }
}
