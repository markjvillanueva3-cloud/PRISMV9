/**
 * ProductionPackageEngine — CK-MS0/U05
 * Assembles complete production package: G-code + setup sheet + tool list +
 * physics report + tribal knowledge tips + cycle time + cost estimate.
 */

// Lazy-load tribal knowledge
let _tribalEngine: any = null;
function getTribal() {
  if (!_tribalEngine) {
    try {
      const m = require("./TribalKnowledgeEngine.js");
      _tribalEngine = m.tribalKnowledgeEngine ?? new m.TribalKnowledgeEngine();
    } catch { _tribalEngine = null; }
  }
  return _tribalEngine;
}

// ── Interfaces ────────────────────────────────────────────────
export interface ProductionPackageInput {
  gcode: string;
  toolpath_segments: Array<{
    x: number; y: number; z: number;
    feed_mmmin: number; rpm: number; type: string;
    ae_mm?: number; ap_mm?: number;
  }>;
  tool: {
    tool_id?: string;
    manufacturer?: string;
    designation?: string;
    diameter_mm: number;
    flute_length_mm: number;
    overall_length_mm: number;
    flute_count: number;
    coating?: string;
    type?: string;
    holder?: string;
    price_usd?: number;
  };
  physics: {
    max_force_N: number;
    max_power_kW: number;
    max_torque_Nm: number;
    max_deflection_mm: number;
    predicted_Ra_um: number;
    max_temperature_C: number;
    estimated_tool_life_min: number;
    cpk_estimate: number;
  };
  recommended_params: {
    speed_mpm: number;
    rpm: number;
    feed_mmpt: number;
    feed_mmmin: number;
    ap_mm: number;
    ae_mm: number;
  };
  verification: {
    verdict: string;
    warnings: string[];
    issues_count: number;
  };
  material_name: string;
  material_iso_group: string;
  machine_name: string;
  controller: string;
  operation_type: string;
  feature_description?: string;
  program_number?: number;
  programmer_name?: string;
  machine_rate_per_hour?: number;
}

export interface SetupSheet {
  program_number: number;
  date: string;
  machine: string;
  controller: string;
  material: string;
  programmer: string;
  wcs_origin: string;
  tools: Array<{
    position: number;
    id: string;
    description: string;
    diameter_mm: number;
    projection_mm: number;
    holder: string;
    speed_rpm: number;
    feed_mmmin: number;
    life_estimate_min: number;
  }>;
  operations: Array<{
    sequence: number;
    type: string;
    tool_position: number;
    depth_mm: number;
    notes: string;
  }>;
  cycle_time: { p50_min: number; p75_min: number; p95_min: number };
  critical_notes: string[];
  fixture_description: string;
}

export interface CostEstimate {
  tool_cost_per_part: number;
  machine_cost_per_part: number;
  energy_cost_per_part: number;
  total_cost_per_part: number;
  cost_breakdown_pct: {
    tooling: number;
    machine: number;
    energy: number;
  };
}

export interface ProductionPackage {
  program_header: {
    program_number: number;
    date: string;
    machine: string;
    controller: string;
    material: string;
    programmer: string;
    operation: string;
  };
  gcode: string;
  setup_sheet: SetupSheet;
  tool_list: Array<{
    manufacturer: string;
    part_number: string;
    description: string;
    diameter_mm: number;
    flute_count: number;
    coating: string;
    holder: string;
    projection_mm: number;
    life_estimate_min: number;
    price_usd: number;
  }>;
  physics_report: {
    per_operation: Array<{
      operation: string;
      force_N: number;
      power_kW: number;
      torque_Nm: number;
      deflection_mm: number;
      temperature_C: number;
      ra_um: number;
      cpk: number;
    }>;
    summary: string;
  };
  tribal_tips: Array<{
    id: string;
    title: string;
    body: string;
    relevance_score: number;
  }>;
  cycle_time: {
    p50_min: number;
    p75_min: number;
    p95_min: number;
    breakdown: Array<{ phase: string; time_min: number }>;
  };
  cost_estimate: CostEstimate;
  warnings: string[];
  verification_verdict: string;
  generated_at: string;
}

// ── Engine ─────────────────────────────────────────────────────
export class ProductionPackageEngine {
  /**
   * Assemble complete production package from pipeline outputs.
   */
  assemble(input: ProductionPackageInput): ProductionPackage {
    const progNum = input.program_number || 1000;
    const date = new Date().toISOString().split("T")[0];
    const programmer = input.programmer_name || "PRISM CAM Kernel";

    // ── Cycle time estimation with Monte Carlo CI ─────────────
    const cycleTime = this._estimateCycleTime(input);

    // ── Cost estimation ───────────────────────────────────────
    const cost = this._estimateCost(input, cycleTime.p50_min);

    // ── Tribal knowledge tips ─────────────────────────────────
    const tips = this._getTribalTips(input);

    // ── Setup sheet ───────────────────────────────────────────
    const setupSheet: SetupSheet = {
      program_number: progNum,
      date,
      machine: input.machine_name,
      controller: input.controller,
      material: `${input.material_name} (ISO ${input.material_iso_group})`,
      programmer,
      wcs_origin: "G54 — verify datum before running",
      tools: [{
        position: 1,
        id: input.tool.tool_id || input.tool.designation || "T01",
        description: `Ø${input.tool.diameter_mm}mm ${input.tool.flute_count}FL ${input.tool.coating || "Carbide"} ${input.tool.type || "End Mill"}`,
        diameter_mm: input.tool.diameter_mm,
        projection_mm: input.tool.overall_length_mm * 0.6,
        holder: input.tool.holder || "ER32 Collet",
        speed_rpm: input.recommended_params.rpm,
        feed_mmmin: input.recommended_params.feed_mmmin,
        life_estimate_min: input.physics.estimated_tool_life_min,
      }],
      operations: [{
        sequence: 1,
        type: input.operation_type,
        tool_position: 1,
        depth_mm: input.recommended_params.ap_mm,
        notes: `Vc=${input.recommended_params.speed_mpm}m/min, fz=${input.recommended_params.feed_mmpt}mm/tooth, ae=${input.recommended_params.ae_mm}mm`,
      }],
      cycle_time: { p50_min: cycleTime.p50_min, p75_min: cycleTime.p75_min, p95_min: cycleTime.p95_min },
      critical_notes: [
        ...input.verification.warnings.slice(0, 5),
        `Cpk estimate: ${input.physics.cpk_estimate.toFixed(2)}`,
        `Max deflection: ${(input.physics.max_deflection_mm * 1000).toFixed(1)}μm`,
      ],
      fixture_description: "Verify fixture and datum before first article",
    };

    // ── Physics report ────────────────────────────────────────
    const physicsReport = {
      per_operation: [{
        operation: input.operation_type,
        force_N: input.physics.max_force_N,
        power_kW: input.physics.max_power_kW,
        torque_Nm: input.physics.max_torque_Nm,
        deflection_mm: input.physics.max_deflection_mm,
        temperature_C: input.physics.max_temperature_C,
        ra_um: input.physics.predicted_Ra_um,
        cpk: input.physics.cpk_estimate,
      }],
      summary: `Fc=${input.physics.max_force_N}N, P=${input.physics.max_power_kW}kW, ` +
        `δ=${(input.physics.max_deflection_mm * 1000).toFixed(1)}μm, ` +
        `Ra=${input.physics.predicted_Ra_um.toFixed(2)}μm, ` +
        `Cpk=${input.physics.cpk_estimate.toFixed(2)}, ` +
        `Tool life≈${input.physics.estimated_tool_life_min}min`,
    };

    // ── Tool list ─────────────────────────────────────────────
    const toolList = [{
      manufacturer: input.tool.manufacturer || "Generic",
      part_number: input.tool.designation || input.tool.tool_id || "N/A",
      description: `Ø${input.tool.diameter_mm}mm ${input.tool.flute_count}FL ${input.tool.type || "End Mill"}`,
      diameter_mm: input.tool.diameter_mm,
      flute_count: input.tool.flute_count,
      coating: input.tool.coating || "TiAlN",
      holder: input.tool.holder || "ER32",
      projection_mm: Math.round(input.tool.overall_length_mm * 0.6),
      life_estimate_min: input.physics.estimated_tool_life_min,
      price_usd: input.tool.price_usd || 0,
    }];

    return {
      program_header: {
        program_number: progNum,
        date,
        machine: input.machine_name,
        controller: input.controller,
        material: input.material_name,
        programmer,
        operation: input.operation_type,
      },
      gcode: input.gcode,
      setup_sheet: setupSheet,
      tool_list: toolList,
      physics_report: physicsReport,
      tribal_tips: tips,
      cycle_time: cycleTime,
      cost_estimate: cost,
      warnings: input.verification.warnings,
      verification_verdict: input.verification.verdict,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Monte Carlo cycle time estimation with P50/P75/P95.
   */
  private _estimateCycleTime(input: ProductionPackageInput) {
    // Deterministic base from toolpath
    let totalDist = 0;
    let feedDist = 0;
    let rapidDist = 0;
    const segs = input.toolpath_segments;

    for (let i = 1; i < segs.length; i++) {
      const dx = segs[i].x - segs[i - 1].x;
      const dy = segs[i].y - segs[i - 1].y;
      const dz = segs[i].z - segs[i - 1].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalDist += dist;
      if (segs[i].type === "feed" || segs[i].type === "plunge") {
        feedDist += dist;
      } else {
        rapidDist += dist;
      }
    }

    const avgFeed = input.recommended_params.feed_mmmin || 2000;
    const rapidRate = 15000; // mm/min typical
    const toolChanges = 1;
    const toolChangeTime = 8; // seconds

    const feedTime = feedDist / avgFeed; // minutes
    const rapidTime = rapidDist / rapidRate;
    const baseTime = feedTime + rapidTime + (toolChanges * toolChangeTime / 60);

    // Monte Carlo: sample variability sources
    // Feed override ±10%, tool change ±5s, rapid settle ±0.3s
    const N = 200;
    const samples: number[] = [];
    for (let i = 0; i < N; i++) {
      const feedVar = 1 + (Math.random() - 0.5) * 0.2; // ±10%
      const tcVar = toolChangeTime + (Math.random() - 0.5) * 10; // ±5s
      const settleVar = segs.length * (Math.random() * 0.3) / 60; // ±0.3s per move
      const sample = (feedTime * feedVar) + rapidTime + (toolChanges * tcVar / 60) + settleVar;
      samples.push(sample);
    }
    samples.sort((a, b) => a - b);

    const p50 = samples[Math.floor(N * 0.50)] || baseTime;
    const p75 = samples[Math.floor(N * 0.75)] || baseTime * 1.05;
    const p95 = samples[Math.floor(N * 0.95)] || baseTime * 1.12;

    return {
      p50_min: Math.round(p50 * 100) / 100,
      p75_min: Math.round(p75 * 100) / 100,
      p95_min: Math.round(p95 * 100) / 100,
      breakdown: [
        { phase: "cutting", time_min: Math.round(feedTime * 100) / 100 },
        { phase: "rapid", time_min: Math.round(rapidTime * 100) / 100 },
        { phase: "tool_change", time_min: Math.round(toolChanges * toolChangeTime / 60 * 100) / 100 },
      ],
    };
  }

  /**
   * Cost estimation: tool + machine + energy.
   */
  private _estimateCost(input: ProductionPackageInput, cycleTimeMin: number) {
    const machineRate = input.machine_rate_per_hour || 85; // $/hr default
    const machineCost = (cycleTimeMin / 60) * machineRate;

    const toolPrice = input.tool.price_usd || 45;
    const toolLife = Math.max(1, input.physics.estimated_tool_life_min);
    const toolCost = (cycleTimeMin / toolLife) * toolPrice;

    const powerKw = input.physics.max_power_kW || 5;
    const energyRate = 0.12; // $/kWh
    const energyCost = (cycleTimeMin / 60) * powerKw * energyRate;

    const total = machineCost + toolCost + energyCost;

    return {
      tool_cost_per_part: Math.round(toolCost * 100) / 100,
      machine_cost_per_part: Math.round(machineCost * 100) / 100,
      energy_cost_per_part: Math.round(energyCost * 100) / 100,
      total_cost_per_part: Math.round(total * 100) / 100,
      cost_breakdown_pct: {
        tooling: total > 0 ? Math.round((toolCost / total) * 100) : 0,
        machine: total > 0 ? Math.round((machineCost / total) * 100) : 0,
        energy: total > 0 ? Math.round((energyCost / total) * 100) : 0,
      },
    };
  }

  /**
   * Query tribal knowledge for relevant tips.
   */
  private _getTribalTips(input: ProductionPackageInput) {
    const tips: Array<{ id: string; title: string; body: string; relevance_score: number }> = [];

    try {
      const tribal = getTribal();
      if (tribal?.query || tribal?.search) {
        const queryFn = tribal.query || tribal.search;
        const results = queryFn.call(tribal, {
          material: input.material_name,
          operation: input.operation_type,
          cam_system: "general",
          max_results: 5,
        });
        if (Array.isArray(results)) {
          for (const r of results.slice(0, 5)) {
            tips.push({
              id: r.id || "tip",
              title: r.title || "",
              body: r.body || r.content || "",
              relevance_score: r.confidence || r.score || 75,
            });
          }
        }
      }
    } catch { /* tribal knowledge is optional enrichment */ }

    // Always include at least one material-specific tip
    if (tips.length === 0) {
      const iso = input.material_iso_group;
      const matTips: Record<string, string> = {
        P: "Carbon/alloy steel: Use TiAlN-coated carbide, climb milling, flood coolant. Monitor flank wear.",
        M: "Stainless steel: Never dwell or reduce feed below 0.04mm/tooth — work-hardens. Climb only.",
        K: "Cast iron: Machine dry or with air blast. Short brittle chips. Coolant reduces tool life.",
        N: "Aluminum: Uncoated or DLC carbide, 300-500 m/min. Chip evacuation critical. No re-cutting.",
        S: "Superalloys: Through-spindle coolant 70+ bar. Never recut chips. Monitor spindle load.",
        H: "Hardened steel: CBN or nano-coated, air blast only. Target Ra 0.4-0.8μm from machining.",
      };
      tips.push({
        id: `material-${iso}`,
        title: `${iso} Material Tip`,
        body: matTips[iso] || "Verify cutting parameters against material data sheet.",
        relevance_score: 80,
      });
    }

    return tips;
  }
}

export const productionPackageEngine = new ProductionPackageEngine();
