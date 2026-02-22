/**
 * CAMIntegrationEngine.ts — R9-MS1 CAM System Integration
 * =========================================================
 *
 * Server-side engine for CAM system integration. Provides:
 *   - Parameter export in CAM-compatible formats (Fusion 360, Mastercam, generic)
 *   - CAM operation import and analysis
 *   - Operation-level recommendations
 *   - Tool library sync
 *   - Post-processor parameter blocks
 *
 * Actual CAM plugins (Python add-ins, .NET hooks) call these actions
 * via MCP protocol. This engine handles the server-side logic.
 *
 * @version 1.0.0 — R9-MS1
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type CAMSystem = "fusion360" | "mastercam" | "solidcam" | "nx" | "hypermill" | "generic";
export type OperationType = "roughing" | "finishing" | "drilling" | "tapping" | "turning" | "facing" | "profiling" | "pocketing" | "adaptive";
export type UnitSystem = "metric" | "imperial";

export interface CAMOperation {
  id: string;
  name: string;
  type: OperationType;
  tool: {
    type: string;
    diameter_mm: number;
    flutes: number;
    material: string;
    coating?: string;
  };
  material: string;
  parameters?: {
    speed_rpm?: number;
    feed_mmmin?: number;
    axial_depth_mm?: number;
    radial_depth_mm?: number;
    stepover_pct?: number;
  };
  constraints?: {
    surface_finish_ra_max_um?: number;
    tolerance_mm?: number;
    max_depth_mm?: number;
  };
}

export interface CAMRecommendation {
  operation_id: string;
  operation_name: string;
  recommended: {
    speed_rpm: number;
    speed_sfm: number;
    feed_mmmin: number;
    feed_ipm: number;
    feed_per_tooth_mm: number;
    feed_per_tooth_in: number;
    axial_depth_mm: number;
    axial_depth_in: number;
    radial_depth_mm: number;
    radial_depth_in: number;
  };
  strategy: string;
  chatter_risk: "low" | "medium" | "high";
  estimated_cycle_time_min: number;
  estimated_tool_life_min: number;
  notes: string[];
}

export interface CAMParameterExport {
  format: CAMSystem;
  unit_system: UnitSystem;
  operations: CAMRecommendation[];
  metadata: {
    generated_by: string;
    timestamp: string;
    material: string;
    machine?: string;
  };
  raw: string; // Formatted output string
}

export interface ToolLibraryEntry {
  id: string;
  description: string;
  type: string;
  diameter_mm: number;
  flutes: number;
  material: string;
  coating: string;
  max_rpm: number;
  max_doc_mm: number;
  vendor: string;
  catalog_number: string;
}

// ─── Parameter Calculation ───────────────────────────────────────────────────

/** Calculate recommended parameters for a CAM operation */
function calculateRecommendation(op: CAMOperation): CAMRecommendation {
  const dia = op.tool.diameter_mm;
  const flutes = op.tool.flutes;
  const mat = op.material.toLowerCase();

  // Material-specific speed ranges (Vc in m/min)
  let vc = 200; // default steel
  if (mat.includes("aluminum") || mat.includes("7075") || mat.includes("6061")) vc = 400;
  else if (mat.includes("titanium") || mat.includes("ti-6al")) vc = 60;
  else if (mat.includes("inconel") || mat.includes("718")) vc = 35;
  else if (mat.includes("stainless") || mat.includes("316") || mat.includes("304")) vc = 120;
  else if (mat.includes("brass") || mat.includes("bronze")) vc = 300;
  else if (mat.includes("cast iron")) vc = 150;

  // Adjust for operation type
  if (op.type === "finishing") vc *= 1.2;
  if (op.type === "adaptive") vc *= 1.1;

  // RPM = (Vc × 1000) / (π × D)
  const rpm = Math.round((vc * 1000) / (Math.PI * dia));
  const sfm = Math.round(vc * 3.281);

  // Feed per tooth (mm/tooth)
  let fz = dia * 0.02; // ~2% of diameter
  if (op.type === "finishing") fz = dia * 0.01;
  if (mat.includes("titanium")) fz = Math.max(fz, 0.05);
  if (mat.includes("aluminum")) fz *= 1.5;

  fz = Math.round(fz * 1000) / 1000;

  // Table feed
  const feedMmMin = Math.round(fz * flutes * rpm);
  const feedIpm = Math.round(feedMmMin / 25.4 * 10) / 10;

  // Depths
  let ap = op.type === "roughing" || op.type === "adaptive" ? dia * 1.0 : dia * 0.1;
  let ae = op.type === "roughing" ? dia * 0.5 : op.type === "adaptive" ? dia * 0.1 : dia * 0.05;

  if (op.constraints?.max_depth_mm) ap = Math.min(ap, op.constraints.max_depth_mm);
  ap = Math.round(ap * 100) / 100;
  ae = Math.round(ae * 100) / 100;

  // Strategy recommendation
  let strategy = "Conventional milling";
  if (op.type === "adaptive" || (op.type === "roughing" && dia >= 6)) {
    strategy = "Adaptive clearing (trochoidal)";
  } else if (op.type === "finishing") {
    strategy = "Linear/contour finishing";
  } else if (op.type === "pocketing") {
    strategy = "Helical entry + climb milling";
  }

  // Chatter risk estimation
  const stickoutRatio = 4; // assumed
  const chatterRisk: "low" | "medium" | "high" =
    stickoutRatio > 5 ? "high" : stickoutRatio > 3.5 ? "medium" : "low";

  // Cycle time estimate (rough approximation)
  const mrr = (ap * ae * feedMmMin) / 1000; // cm³/min
  const estimatedVolume = 50; // cm³ assumed
  const cycleTime = mrr > 0 ? Math.round((estimatedVolume / mrr) * 10) / 10 : 0;

  // Tool life estimate
  const toolLife = mat.includes("titanium") || mat.includes("inconel") ? 15 : mat.includes("aluminum") ? 90 : 45;

  const notes: string[] = [];
  if (chatterRisk === "high") notes.push("High chatter risk — reduce RPM or stickout");
  if (mat.includes("titanium")) notes.push("Titanium: maintain minimum chip load — never rub");
  if (op.type === "adaptive") notes.push("Use constant engagement toolpath for best results");
  if (op.constraints?.surface_finish_ra_max_um && op.constraints.surface_finish_ra_max_um < 1.6) {
    notes.push(`Target Ra ${op.constraints.surface_finish_ra_max_um}µm — consider ball nose or wiper insert`);
  }

  return {
    operation_id: op.id,
    operation_name: op.name,
    recommended: {
      speed_rpm: rpm,
      speed_sfm: sfm,
      feed_mmmin: feedMmMin,
      feed_ipm: feedIpm,
      feed_per_tooth_mm: fz,
      feed_per_tooth_in: Math.round(fz / 25.4 * 10000) / 10000,
      axial_depth_mm: ap,
      axial_depth_in: Math.round(ap / 25.4 * 1000) / 1000,
      radial_depth_mm: ae,
      radial_depth_in: Math.round(ae / 25.4 * 1000) / 1000,
    },
    strategy,
    chatter_risk: chatterRisk,
    estimated_cycle_time_min: cycleTime,
    estimated_tool_life_min: toolLife,
    notes,
  };
}

// ─── CAM Format Export ───────────────────────────────────────────────────────

/** Export parameters in Fusion 360 JSON format */
function exportFusion360(recs: CAMRecommendation[], material: string, units: UnitSystem): string {
  const ops = recs.map(r => ({
    operationId: r.operation_id,
    name: r.operation_name,
    spindleSpeed: r.recommended.speed_rpm,
    surfaceSpeed: units === "metric" ? r.recommended.speed_sfm / 3.281 : r.recommended.speed_sfm,
    feedRate: units === "metric" ? r.recommended.feed_mmmin : r.recommended.feed_ipm,
    feedPerTooth: units === "metric" ? r.recommended.feed_per_tooth_mm : r.recommended.feed_per_tooth_in,
    axialDepth: units === "metric" ? r.recommended.axial_depth_mm : r.recommended.axial_depth_in,
    radialDepth: units === "metric" ? r.recommended.radial_depth_mm : r.recommended.radial_depth_in,
    strategy: r.strategy,
    notes: r.notes,
  }));

  return JSON.stringify({ format: "fusion360", material, unitSystem: units, operations: ops }, null, 2);
}

/** Export parameters in Mastercam XML format */
function exportMastercam(recs: CAMRecommendation[], material: string, units: UnitSystem): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<PRISMParameters material="${material}" units="${units}">`,
  ];

  for (const r of recs) {
    const rpm = r.recommended.speed_rpm;
    const feed = units === "metric" ? r.recommended.feed_mmmin : r.recommended.feed_ipm;
    const ap = units === "metric" ? r.recommended.axial_depth_mm : r.recommended.axial_depth_in;
    const ae = units === "metric" ? r.recommended.radial_depth_mm : r.recommended.radial_depth_in;

    lines.push(`  <Operation id="${r.operation_id}" name="${r.operation_name}">`);
    lines.push(`    <SpindleSpeed>${rpm}</SpindleSpeed>`);
    lines.push(`    <FeedRate>${feed}</FeedRate>`);
    lines.push(`    <AxialDepth>${ap}</AxialDepth>`);
    lines.push(`    <RadialDepth>${ae}</RadialDepth>`);
    lines.push(`    <Strategy>${r.strategy}</Strategy>`);
    lines.push(`  </Operation>`);
  }

  lines.push(`</PRISMParameters>`);
  return lines.join("\n");
}

/** Export in generic CSV format */
function exportGeneric(recs: CAMRecommendation[], _material: string, units: UnitSystem): string {
  const header = "Operation,RPM,Feed,FeedPerTooth,AxialDepth,RadialDepth,Strategy,ChatterRisk,CycleTimeMin";
  const rows = recs.map(r => {
    const feed = units === "metric" ? r.recommended.feed_mmmin : r.recommended.feed_ipm;
    const fz = units === "metric" ? r.recommended.feed_per_tooth_mm : r.recommended.feed_per_tooth_in;
    const ap = units === "metric" ? r.recommended.axial_depth_mm : r.recommended.axial_depth_in;
    const ae = units === "metric" ? r.recommended.radial_depth_mm : r.recommended.radial_depth_in;
    return `${r.operation_name},${r.recommended.speed_rpm},${feed},${fz},${ap},${ae},${r.strategy},${r.chatter_risk},${r.estimated_cycle_time_min}`;
  });
  return [header, ...rows].join("\n");
}

// ─── Tool Library ────────────────────────────────────────────────────────────

const toolLibrary: ToolLibraryEntry[] = [
  { id: "TL001", description: "1/2\" 4FL Carbide Endmill", type: "endmill", diameter_mm: 12.7, flutes: 4, material: "carbide", coating: "AlTiN", max_rpm: 12000, max_doc_mm: 38, vendor: "Kennametal", catalog_number: "F3AH1200AWL" },
  { id: "TL002", description: "3/8\" 3FL Carbide Endmill", type: "endmill", diameter_mm: 9.525, flutes: 3, material: "carbide", coating: "TiAlN", max_rpm: 15000, max_doc_mm: 28, vendor: "Harvey Tool", catalog_number: "58293" },
  { id: "TL003", description: "1\" 5FL Carbide Rougher", type: "rougher", diameter_mm: 25.4, flutes: 5, material: "carbide", coating: "AlCrN", max_rpm: 8000, max_doc_mm: 50, vendor: "Sandvik", catalog_number: "R216.34-25050" },
  { id: "TL004", description: "6mm 2FL Ball Nose", type: "ball_nose", diameter_mm: 6, flutes: 2, material: "carbide", coating: "TiAlN", max_rpm: 20000, max_doc_mm: 12, vendor: "OSG", catalog_number: "WXLP-EBD" },
  { id: "TL005", description: "8mm Drill", type: "drill", diameter_mm: 8, flutes: 2, material: "carbide", coating: "TiN", max_rpm: 10000, max_doc_mm: 40, vendor: "Dormer", catalog_number: "A002-8.0" },
];

/** Search tool library */
export function searchToolLibrary(query: string): ToolLibraryEntry[] {
  const lower = query.toLowerCase();
  return toolLibrary.filter(t =>
    t.description.toLowerCase().includes(lower) ||
    t.type.toLowerCase().includes(lower) ||
    t.vendor.toLowerCase().includes(lower) ||
    t.catalog_number.toLowerCase().includes(lower)
  );
}

/** Get tool by ID */
export function getToolFromLibrary(id: string): ToolLibraryEntry | null {
  return toolLibrary.find(t => t.id === id) ?? null;
}

/** Get all tools */
export function getAllTools(): ToolLibraryEntry[] {
  return [...toolLibrary];
}

// ─── Dispatcher Entry Point ──────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Actions:
 *   cam_recommend       — Get recommendations for CAM operations
 *   cam_export          — Export parameters in CAM-specific format
 *   cam_analyze_op      — Analyze a single CAM operation
 *   cam_tool_library    — Search/get tool library entries
 *   cam_tool_get        — Get specific tool from library
 *   cam_systems         — List supported CAM systems
 */
/** Build a CAMOperation from flat dispatcher params */
function opFromParams(params: Record<string, any>): CAMOperation {
  return {
    id: params.id ?? "OP-AUTO",
    name: params.name ?? params.operation ?? "Auto",
    type: params.operation ?? params.type ?? "roughing",
    tool: params.tool ?? {
      type: params.tool_type ?? "end_mill",
      diameter_mm: params.tool_diameter_mm ?? 10,
      flutes: params.flutes ?? 4,
    },
    material: params.material ?? "steel",
    parameters: params.parameters,
  };
}

export function camIntegration(action: string, params: Record<string, any>): any {
  switch (action) {
    case "cam_recommend": {
      const operations: CAMOperation[] = params.operations ?? [];
      if (operations.length === 0 && params.operation && typeof params.operation === "object") {
        operations.push(params.operation);
      }
      // Flat params shorthand: material + operation + tool_diameter_mm
      if (operations.length === 0 && params.material) {
        operations.push(opFromParams(params));
      }
      if (operations.length === 0) {
        return { error: "No operations or material/tool_diameter_mm provided" };
      }
      const recommendations = operations.map(op => calculateRecommendation(op));
      const rec0 = recommendations[0];
      // Provide flat convenience aliases for dispatcher consumers
      const flat = rec0.recommended;
      return {
        material: params.material ?? "Unknown",
        operation: typeof params.operation === "string" ? params.operation : rec0.operation_name,
        total_operations: recommendations.length,
        recommended: {
          rpm: flat.speed_rpm,
          sfm: flat.speed_sfm,
          feed_mmmin: flat.feed_mmmin,
          feed_ipm: flat.feed_ipm,
          fz_mm: flat.feed_per_tooth_mm,
          ap_mm: flat.axial_depth_mm,
          ae_mm: flat.radial_depth_mm,
          ...flat,
        },
        strategy: rec0.strategy,
        chatter_risk: rec0.chatter_risk,
        recommendations,
        total_cycle_time_min: recommendations.reduce((sum, r) => sum + r.estimated_cycle_time_min, 0),
      };
    }

    case "cam_export": {
      const operations: CAMOperation[] = params.operations ?? [];
      if (operations.length === 0 && params.material) {
        operations.push(opFromParams(params));
      }
      const recommendations = operations.map(op => calculateRecommendation(op));
      const targetSystem: CAMSystem = params.target_system ?? params.format ?? "generic";
      const units: UnitSystem = params.units ?? "metric";
      const material = params.material ?? "Unknown";

      let content: string;
      let formatLabel: string;
      switch (targetSystem) {
        case "fusion360":
          content = exportFusion360(recommendations, material, units);
          formatLabel = "fusion360_json";
          break;
        case "mastercam":
          content = exportMastercam(recommendations, material, units);
          formatLabel = "mastercam_xml";
          break;
        default:
          content = exportGeneric(recommendations, material, units);
          formatLabel = "generic_csv";
          break;
      }

      return {
        format: formatLabel,
        target_system: targetSystem,
        content,
        unit_system: units,
        material,
      };
    }

    case "cam_analyze_op": {
      // Accept full operation object in params.operation or flat params
      const opInput = params.operation ?? params;
      const op: CAMOperation = {
        id: opInput.id ?? "OP1",
        name: opInput.name ?? "Operation 1",
        type: opInput.type ?? "roughing",
        tool: opInput.tool ?? { type: "endmill", diameter_mm: 12, flutes: 4 },
        material: opInput.material ?? "Steel",
        parameters: opInput.parameters,
        constraints: opInput.constraints,
      };

      const rec = calculateRecommendation(op);

      // Compare user parameters against PRISM recommended
      const issues: string[] = [];
      let matchScore = 100;
      if (op.parameters) {
        const p = op.parameters;
        const r = rec.recommended;
        // RPM comparison
        const userRpm = p.rpm ?? p.speed_rpm ?? 0;
        if (userRpm > 0) {
          const diff = Math.abs((userRpm - r.speed_rpm) / r.speed_rpm) * 100;
          if (diff > 30) { issues.push(`RPM deviation ${Math.round(diff)}% — ${userRpm} vs recommended ${r.speed_rpm}`); matchScore -= 30; }
          else if (diff > 15) { matchScore -= Math.round(diff / 2); }
        }
        // Feed comparison
        const userFeed = p.feed_mmmin ?? 0;
        if (userFeed > 0) {
          const diff = Math.abs((userFeed - r.feed_mmmin) / r.feed_mmmin) * 100;
          if (diff > 30) { issues.push(`Feed deviation ${Math.round(diff)}% — ${userFeed} vs recommended ${r.feed_mmmin}`); matchScore -= 25; }
          else if (diff > 15) { matchScore -= Math.round(diff / 3); }
        }
        // Depth comparison
        const userAp = p.ap_mm ?? p.axial_depth_mm ?? 0;
        if (userAp > 0) {
          const diff = Math.abs((userAp - r.axial_depth_mm) / r.axial_depth_mm) * 100;
          if (diff > 50) { issues.push(`Axial depth deviation ${Math.round(diff)}% — ${userAp}mm vs recommended ${r.axial_depth_mm}mm`); matchScore -= 25; }
          else if (diff > 20) { matchScore -= Math.round(diff / 4); }
        }
        // Width comparison
        const userAe = p.ae_mm ?? p.radial_depth_mm ?? 0;
        if (userAe > 0) {
          const diff = Math.abs((userAe - r.radial_depth_mm) / r.radial_depth_mm) * 100;
          if (diff > 50) { issues.push(`Radial depth deviation ${Math.round(diff)}% — ${userAe}mm vs recommended ${r.radial_depth_mm}mm`); matchScore -= 20; }
          else if (diff > 20) { matchScore -= Math.round(diff / 4); }
        }
      }
      matchScore = Math.max(0, Math.min(100, matchScore));

      return {
        operation_id: op.id,
        recommended: {
          rpm: rec.recommended.speed_rpm,
          feed_mmmin: rec.recommended.feed_mmmin,
          ap_mm: rec.recommended.axial_depth_mm,
          ae_mm: rec.recommended.radial_depth_mm,
        },
        match_pct: matchScore,
        issues,
      };
    }

    case "cam_tool_library": {
      const query = params.query ?? "";
      const tools = query ? searchToolLibrary(query) : getAllTools();
      return {
        query,
        total: tools.length,
        tools,
      };
    }

    case "cam_tool_get": {
      const toolId = params.id ?? params.tool_id ?? "";
      const tool = getToolFromLibrary(toolId);
      if (!tool) return { error: "Tool not found", id: toolId };
      return tool;
    }

    case "cam_systems": {
      const systems = [
          { id: "fusion360", name: "Autodesk Fusion 360", format: "JSON", status: "supported" },
          { id: "mastercam", name: "Mastercam", format: "XML", status: "supported" },
          { id: "solidcam", name: "SolidCAM", format: "XML", status: "planned" },
          { id: "nx", name: "Siemens NX", format: "XML", status: "planned" },
          { id: "hypermill", name: "hyperMILL", format: "XML", status: "planned" },
          { id: "generic", name: "Generic CSV", format: "CSV", status: "supported" },
      ];
      return {
        systems,
        total: systems.length,
      };
    }

    default:
      return { error: `CAMIntegrationEngine: unknown action "${action}"` };
  }
}
