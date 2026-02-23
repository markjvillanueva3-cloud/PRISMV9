/**
 * PRISM Product Engine — Speed & Feed Calculator (SFC)
 * =====================================================
 * MS0: Speed & Feed Calculator — 10 actions
 *
 * Composes ManufacturingCalculations (Kienzle, Taylor, Ra, MRR) into a
 * unified speed-and-feed product workflow with safety scoring, uncertainty
 * bounds, and sustainability metrics.
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */

import {
  calculateSpeedFeed,
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSurfaceFinish,
  calculateMRR,
  SAFETY_LIMITS,
  type SpeedFeedResult,
  type CuttingForceResult,
  type ToolLifeResult,
  type SurfaceFinishResult,
  type MRRResult,
} from "./ManufacturingCalculations.js";

import {
  MATERIAL_HARDNESS,
  resolveMaterial,
  calculateSafetyScore,
  mapOperation,
  type ProductTier,
  type SFCInput,
  type SFCResult,
  type SFCCompareResult,
  type SFCOptimizeResult,
} from "./ProductEngineShared.js";

// ─── SFC Engine Functions ───────────────────────────────────────────────────

function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
  const startTime = Date.now();
  const tier = params.tier ?? "pro";

  // Resolve material
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);

  // Defaults
  const toolMat = params.tool_material ?? "Carbide";
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const operation = params.operation ?? "milling";
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  // 1. Speed & Feed
  const sfResult: SpeedFeedResult = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: toolMat as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const rpm = sfResult.spindle_speed;
  const vf = sfResult.feed_rate;

  // 2. Cutting Force (Kienzle)
  const forceResult: CuttingForceResult = calculateKienzleCuttingForce(
    {
      cutting_speed: vc,
      feed_per_tooth: fz,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: toolDiam,
      number_of_teeth: numTeeth,
    },
    { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
  );

  // 3. Tool Life (Taylor)
  const taylorResult: ToolLifeResult = calculateTaylorToolLife(
    vc,
    { C: mat.C, n: mat.n, material_id: mat.name },
    fz,
    ap,
  );

  // 4. Surface Finish
  const noseRadius = toolDiam > 6 ? 0.8 : 0.4;
  const raResult: SurfaceFinishResult = calculateSurfaceFinish(
    fz * numTeeth, noseRadius, true, ae, toolDiam, operation,
  );

  // 5. MRR
  const mrrResult: MRRResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // 6. Safety scoring
  const safety = calculateSafetyScore(
    vc, fz, ap, ae, toolDiam,
    forceResult.power, params.machine_power_kw, forceResult.Fc,
  );

  // RPM machine limit check
  if (params.machine_max_rpm && rpm > params.machine_max_rpm) {
    safety.warnings.push(`Calculated RPM ${rpm} exceeds machine max ${params.machine_max_rpm}`);
    safety.score = Math.max(0, safety.score - 0.15);
  }

  // Material resolution warning
  if (!mat.resolved) {
    safety.warnings.push(`Material "${params.material}" not in product database — using defaults`);
  }

  // 7. Uncertainty bounds
  const uncertaintyFactor = mat.resolved ? 0.15 : 0.25;
  const uncertainty = {
    cutting_speed_range: [
      Math.round(vc * (1 - uncertaintyFactor)),
      Math.round(vc * (1 + uncertaintyFactor)),
    ] as [number, number],
    force_range: [
      Math.round(forceResult.Fc * (1 - uncertaintyFactor)),
      Math.round(forceResult.Fc * (1 + uncertaintyFactor)),
    ] as [number, number],
    tool_life_range: [
      Math.round(taylorResult.tool_life_minutes * (1 - uncertaintyFactor * 1.5)),
      Math.round(taylorResult.tool_life_minutes * (1 + uncertaintyFactor * 1.5)),
    ] as [number, number],
    surface_roughness_range: [
      Math.round(raResult.Ra * (1 - uncertaintyFactor) * 100) / 100,
      Math.round(raResult.Ra * (1 + uncertaintyFactor) * 100) / 100,
    ] as [number, number],
  };

  // 8. Sustainability (pro + enterprise only)
  let sustainability: SFCResult["sustainability"];
  if (tier !== "free") {
    const cuttingTimeMin = 10; // Assume 10 min per part for estimation
    const energyKwh = forceResult.power * (cuttingTimeMin / 60);
    const co2Kg = energyKwh * 0.5; // ~0.5 kg CO2/kWh grid average
    const coolantLph = operation.includes("drill") ? 5 : ae >= toolDiam * 0.8 ? 12 : 8;
    sustainability = {
      energy_kWh_per_part: Math.round(energyKwh * 100) / 100,
      co2_kg_per_part: Math.round(co2Kg * 100) / 100,
      coolant_liters_per_hour: coolantLph,
    };
  }

  // 9. Surface finish grade
  const ra = raResult.Ra;
  const sfGrade = ra <= 0.4 ? "N3 (mirror)" : ra <= 0.8 ? "N4 (fine)" : ra <= 1.6 ? "N5 (smooth)"
    : ra <= 3.2 ? "N6 (good)" : ra <= 6.3 ? "N7 (fair)" : "N8+ (rough)";

  // Formulas used
  const formulas = ["Kienzle cutting force", "Taylor tool life"];
  if (tier !== "free") {
    formulas.push("Theoretical surface roughness (Ra)", "Volumetric MRR");
  }

  // Tier limiting
  const tierLimited = tier === "free";

  const result: SFCResult = {
    cutting_speed_m_min: Math.round(vc),
    spindle_rpm: Math.round(rpm),
    feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
    table_feed_mm_min: Math.round(vf),
    depth_of_cut_mm: Math.round(ap * 10) / 10,
    width_of_cut_mm: Math.round(ae * 10) / 10,
    cutting_force_N: Math.round(forceResult.Fc),
    power_kW: Math.round(forceResult.power * 100) / 100,
    torque_Nm: Math.round(forceResult.torque * 100) / 100,
    specific_cutting_force_N_mm2: Math.round(forceResult.specific_force),
    tool_life_min: taylorResult.tool_life_minutes,
    optimal_speed_m_min: taylorResult.optimal_speed ?? vc,
    surface_roughness_Ra_um: Math.round(ra * 100) / 100,
    surface_finish_grade: sfGrade,
    mrr_cm3_min: Math.round(mrrResult.mrr * 100) / 100,
    safety_score: safety.score,
    safety_status: safety.status as "safe" | "warning" | "danger",
    safety_warnings: safety.warnings,
    uncertainty,
    sustainability,
    formulas_used: formulas,
    calculation_time_ms: Date.now() - startTime,
    tier,
    tier_limited: tierLimited,
  };

  return { result };
}

function sfcCompare(params: SFCInput): { result: SFCCompareResult } | { error: string } {
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  const toolMaterials = ["Carbide", "HSS", "Ceramic"];
  const approaches: SFCCompareResult["approaches"] = [];

  for (const tool of toolMaterials) {
    const sf = calculateSpeedFeed({
      material_hardness: mat.hardness,
      tool_material: tool as any,
      operation: mapOperation(params.operation ?? "milling"),
      tool_diameter: toolDiam,
      number_of_teeth: numTeeth,
    });

    const force = calculateKienzleCuttingForce(
      {
        cutting_speed: sf.cutting_speed,
        feed_per_tooth: sf.feed_per_tooth,
        axial_depth: ap,
        radial_depth: ae,
        tool_diameter: toolDiam,
        number_of_teeth: numTeeth,
      },
      { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
    );

    const tl = calculateTaylorToolLife(
      sf.cutting_speed,
      {
        C: mat.C * (tool === "HSS" ? 0.4 : tool === "Ceramic" ? 1.8 : 1.0),
        n: mat.n * (tool === "HSS" ? 1.0 : tool === "Ceramic" ? 0.8 : 1.0),
        material_id: mat.name,
      },
      sf.feed_per_tooth, ap,
    );

    const ra = calculateSurfaceFinish(
      sf.feed_per_tooth * numTeeth, 0.8, true, ae, toolDiam,
    );

    const mrr = calculateMRR({
      cutting_speed: sf.cutting_speed, feed_per_tooth: sf.feed_per_tooth,
      axial_depth: ap, radial_depth: ae,
      tool_diameter: toolDiam, number_of_teeth: numTeeth,
    });

    // Composite score: balanced across productivity, tool life, quality
    const score = (mrr.mrr / 100) * 0.3 + (tl.tool_life_minutes / 60) * 0.3
      + (1 / (ra.Ra + 0.1)) * 0.2 + (1 - force.power / 20) * 0.2;

    approaches.push({
      name: `${tool} endmill`,
      cutting_speed: Math.round(sf.cutting_speed),
      feed: Math.round(sf.feed_per_tooth * 1000) / 1000,
      tool_life: Math.round(tl.tool_life_minutes * 10) / 10,
      mrr: Math.round(mrr.mrr * 100) / 100,
      power: Math.round(force.power * 100) / 100,
      surface_roughness: Math.round(ra.Ra * 100) / 100,
      score: Math.round(score * 1000) / 1000,
    });
  }

  approaches.sort((a, b) => b.score - a.score);

  return {
    result: {
      approaches,
      recommended: approaches[0].name,
      comparison_notes: [
        `Material: ${mat.name} (${mat.group}, HB ${mat.hardness})`,
        `Best overall: ${approaches[0].name} (score ${approaches[0].score})`,
        approaches[0].name.includes("Carbide")
          ? "Carbide offers best balance of speed and tool life for most applications"
          : approaches[0].name.includes("Ceramic")
            ? "Ceramic recommended for high-speed finishing of hard materials"
            : "HSS suitable for low-speed operations or interrupted cuts",
      ],
    },
  };
}

function sfcOptimize(params: SFCInput & { objective?: string }): { result: SFCOptimizeResult } | { error: string } {
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;
  const objective = params.objective ?? "balanced";

  // Get baseline
  const sf = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: (params.tool_material ?? "Carbide") as any,
    operation: mapOperation(params.operation ?? "milling"),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // Optimization: grid search around baseline
  let bestVc = sf.cutting_speed;
  let bestFz = sf.feed_per_tooth;
  let bestAp = ap;
  let bestAe = ae;
  let bestScore = -Infinity;
  let iterations = 0;

  const vcRange = [sf.cutting_speed * 0.7, sf.cutting_speed * 1.3];
  const fzRange = [sf.feed_per_tooth * 0.7, sf.feed_per_tooth * 1.3];

  for (let vcMult = 0.7; vcMult <= 1.3; vcMult += 0.1) {
    for (let fzMult = 0.7; fzMult <= 1.3; fzMult += 0.1) {
      iterations++;
      const testVc = sf.cutting_speed * vcMult;
      const testFz = sf.feed_per_tooth * fzMult;

      const tl = calculateTaylorToolLife(
        testVc, { C: mat.C, n: mat.n, material_id: mat.name }, testFz, ap,
      );

      const mrr = calculateMRR({
        cutting_speed: testVc, feed_per_tooth: testFz,
        axial_depth: ap, radial_depth: ae,
        tool_diameter: toolDiam, number_of_teeth: numTeeth,
      });

      const force = calculateKienzleCuttingForce(
        {
          cutting_speed: testVc,
          feed_per_tooth: testFz,
          axial_depth: ap,
          radial_depth: ae,
          tool_diameter: toolDiam,
          number_of_teeth: numTeeth,
        },
        { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
      );

      const ra = calculateSurfaceFinish(
        testFz * numTeeth, 0.8, true, ae, toolDiam,
      );

      // Score based on objective
      let score = 0;
      if (objective === "productivity" || objective === "mrr") {
        score = mrr.mrr * 0.6 + tl.tool_life_minutes * 0.2 - force.power * 0.2;
      } else if (objective === "tool_life") {
        score = tl.tool_life_minutes * 0.6 + mrr.mrr * 0.2 - ra.Ra * 0.2;
      } else if (objective === "quality" || objective === "surface") {
        score = (1 / (ra.Ra + 0.01)) * 0.6 + tl.tool_life_minutes * 0.3 - force.power * 0.1;
      } else if (objective === "cost") {
        const toolCostPerMin = 0.5;
        const machineCostPerMin = 2.0;
        const costPerPart = (10 / mrr.mrr) * machineCostPerMin + (10 / tl.tool_life_minutes) * toolCostPerMin * 30;
        score = -costPerPart; // Minimize cost
      } else {
        // Balanced
        score = mrr.mrr * 0.25 + tl.tool_life_minutes * 0.25 + (1 / (ra.Ra + 0.1)) * 0.25 - force.power * 0.25;
      }

      // Safety constraint: reject dangerous parameters
      if (testVc > SAFETY_LIMITS.MAX_CUTTING_SPEED || testFz > SAFETY_LIMITS.MAX_FEED_PER_TOOTH) continue;
      if (tl.tool_life_minutes < 3) continue; // Minimum tool life constraint
      if (params.machine_power_kw && force.power > params.machine_power_kw * 0.95) continue;

      if (score > bestScore) {
        bestScore = score;
        bestVc = testVc;
        bestFz = testFz;
      }
    }
  }

  // Calculate improvement
  const origMRR = calculateMRR({
    cutting_speed: sf.cutting_speed, feed_per_tooth: sf.feed_per_tooth,
    axial_depth: ap, radial_depth: ae,
    tool_diameter: toolDiam, number_of_teeth: numTeeth,
  });
  const optMRR = calculateMRR({
    cutting_speed: bestVc, feed_per_tooth: bestFz,
    axial_depth: bestAp, radial_depth: bestAe,
    tool_diameter: toolDiam, number_of_teeth: numTeeth,
  });
  const improvement = origMRR.mrr > 0
    ? ((optMRR.mrr - origMRR.mrr) / origMRR.mrr) * 100
    : 0;

  return {
    result: {
      objective,
      original: {
        vc: Math.round(sf.cutting_speed),
        fz: Math.round(sf.feed_per_tooth * 1000) / 1000,
        ap: Math.round(ap * 10) / 10,
        ae: Math.round(ae * 10) / 10,
      },
      optimized: {
        vc: Math.round(bestVc),
        fz: Math.round(bestFz * 1000) / 1000,
        ap: Math.round(bestAp * 10) / 10,
        ae: Math.round(bestAe * 10) / 10,
      },
      improvement_pct: Math.round(improvement * 10) / 10,
      constraints_met: true,
      iterations,
    },
  };
}

function sfcQuick(params: { material?: string; operation?: string }): any {
  // Minimal input → full result using smart defaults
  return sfcCalculate({
    material: params.material ?? "4140",
    operation: params.operation ?? "milling",
    tool_material: "Carbide",
    tool_diameter: 12,
    number_of_teeth: 4,
    tier: "pro",
  });
}

function sfcMaterials(): { materials: Array<{ id: string; group: string; hardness: number }> } {
  return {
    materials: Object.entries(MATERIAL_HARDNESS).map(([id, m]) => ({
      id,
      group: m.group,
      hardness: m.hardness,
    })),
  };
}

function sfcTools(): { tools: Array<{ material: string; speed_range: string; applications: string }> } {
  return {
    tools: [
      { material: "HSS", speed_range: "10-60 m/min", applications: "General purpose, interrupted cuts, low cost" },
      { material: "Carbide", speed_range: "80-400 m/min", applications: "Most materials, best balance of speed and life" },
      { material: "Ceramic", speed_range: "200-1200 m/min", applications: "Hard materials, high-speed finishing" },
      { material: "CBN", speed_range: "150-500 m/min", applications: "Hardened steel (>45 HRC), cast iron" },
      { material: "Diamond", speed_range: "300-3000 m/min", applications: "Non-ferrous metals, composites, plastics" },
    ],
  };
}

function sfcFormulas(): { formulas: Array<{ name: string; use: string; equation: string }> } {
  return {
    formulas: [
      { name: "Kienzle", use: "Cutting force & power", equation: "Fc = kc1.1 × h^(1-mc) × ap × ae/D" },
      { name: "Taylor", use: "Tool life prediction", equation: "V × T^n = C" },
      { name: "Theoretical Ra", use: "Surface roughness", equation: "Ra = f²/(32×r)" },
      { name: "MRR", use: "Material removal rate", equation: "Q = Vc × fz × z × ap × ae / (π×D)" },
      { name: "Stability Lobes", use: "Chatter avoidance", equation: "RPM = 60×f/(z×(k+0.5))" },
    ],
  };
}

function sfcSafety(params: SFCInput): any {
  const mat = resolveMaterial(params.material, params.material_hardness);
  const sf = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: (params.tool_material ?? "Carbide") as any,
    operation: mapOperation(params.operation ?? "milling"),
    tool_diameter: params.tool_diameter ?? 12,
    number_of_teeth: params.number_of_teeth ?? 4,
  });
  const toolDiam = params.tool_diameter ?? 12;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  const force = calculateKienzleCuttingForce(
    {
      cutting_speed: sf.cutting_speed,
      feed_per_tooth: sf.feed_per_tooth,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: toolDiam,
      number_of_teeth: params.number_of_teeth ?? 4,
    },
    { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
  );

  return calculateSafetyScore(
    sf.cutting_speed, sf.feed_per_tooth, ap, ae, toolDiam,
    force.power, params.machine_power_kw, force.Fc,
  );
}

// ─── SFC History (in-memory for session) ────────────────────────────────────

const sfcHistory: Array<{ timestamp: string; action: string; input: any; material: string }> = [];

function recordHistory(action: string, input: any): void {
  sfcHistory.push({
    timestamp: new Date().toISOString(),
    action,
    input,
    material: input.material ?? "unknown",
  });
  if (sfcHistory.length > 100) sfcHistory.shift();
}

// ─── Main SFC Dispatcher ────────────────────────────────────────────────────

export function productSFC(action: string, params: Record<string, any>): any {
  recordHistory(action, params);

  switch (action) {
    case "sfc_calculate":
      return sfcCalculate(params as SFCInput);
    case "sfc_compare":
      return sfcCompare(params as SFCInput);
    case "sfc_optimize":
      return sfcOptimize(params as SFCInput & { objective?: string });
    case "sfc_quick":
      return sfcQuick(params);
    case "sfc_materials":
      return sfcMaterials();
    case "sfc_tools":
      return sfcTools();
    case "sfc_formulas":
      return sfcFormulas();
    case "sfc_safety":
      return sfcSafety(params as SFCInput);
    case "sfc_history":
      return { history: sfcHistory.slice(-50) };
    case "sfc_get":
      return {
        product: "Speed & Feed Calculator",
        version: "1.0.0",
        actions: ["sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick",
          "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety",
          "sfc_history", "sfc_get"],
        tiers: ["free", "pro", "enterprise"],
        materials_count: Object.keys(MATERIAL_HARDNESS).length,
        formulas: ["Kienzle", "Taylor", "Theoretical Ra", "MRR"],
      };
    default:
      return { error: `Unknown SFC action: ${action}` };
  }
}
