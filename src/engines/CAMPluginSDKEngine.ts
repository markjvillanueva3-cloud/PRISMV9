/**
 * CAMPluginSDKEngine — Lightweight API for CAM vendor integration
 *
 * Exposes PRISM's core physics (Kienzle, Taylor, stability) as fast,
 * self-contained methods with zero async imports. Designed for <50ms
 * response times so CAM plugins can call in real-time.
 *
 * Actions: sdk_optimize_sf, sdk_check_safety, sdk_suggest_tool,
 *          sdk_get_tip, sdk_batch
 *
 * INFRA-7-2 U-PLG1: Constants imported from canonical source (was inlined).
 *
 * @version 1.1.0
 */
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";
import type { ISOGroup } from "../physics/constants.js";

// ── Physics Tables (from canonical constants.ts) ──

/** Kienzle specific cutting force: kc = kc1_1 * h^(-mc) */
interface KienzleRow { kc1_1: number; mc: number }
const KIENZLE: Record<string, KienzleRow> = Object.fromEntries(
  (Object.entries(CANONICAL_KIENZLE) as [string, { kc1_1: number; mc: number }][])
);

/** Taylor tool life: T = (C / Vc)^(1/n), minutes */
interface TaylorRow { C: number; n: number }
const TAYLOR: Record<string, TaylorRow> = Object.fromEntries(
  (Object.entries(CANONICAL_TAYLOR) as [string, { C: number; n: number }][])
);

/** Recommended surface speed Vc (m/min) per ISO group × operation */
type OpKey =
  | "milling" | "drilling" | "turning"
  | "finishing" | "roughing";
const VC_TABLE: Record<string, Record<OpKey, number>> = {
  "P":  { milling: 200, drilling: 80,  turning: 220,
           finishing: 280, roughing: 150 },
  "M":  { milling: 140, drilling: 55,  turning: 160,
           finishing: 200, roughing: 100 },
  "K":  { milling: 250, drilling: 90,  turning: 280,
           finishing: 320, roughing: 180 },
  "N":  { milling: 500, drilling: 150, turning: 600,
           finishing: 700, roughing: 350 },
  "S":  { milling: 40,  drilling: 20,  turning: 50,
           finishing: 60,  roughing: 25  },
  "H":  { milling: 80,  drilling: 30,  turning: 90,
           finishing: 120, roughing: 50  },
};

/** Chip load fz (mm/tooth) defaults per ISO group */
const FZ_DEFAULT: Record<string, number> = {
  "P": 0.10, "M": 0.08, "K": 0.12,
  "N": 0.15, "S": 0.05, "H": 0.06,
};

/** Material alias → ISO group resolution */
const MATERIAL_MAP: Record<string, string> = {
  // Direct ISO codes
  "P": "P", "M": "M", "K": "K",
  "N": "N", "S": "S", "H": "H",
  // Common names (lowercase match)
  "steel": "P", "carbon steel": "P", "alloy steel": "P",
  "1018": "P", "1045": "P", "4140": "P", "4340": "P",
  "stainless": "M", "stainless steel": "M",
  "304": "M", "316": "M", "17-4": "M",
  "cast iron": "K", "gray iron": "K", "ductile iron": "K",
  "aluminum": "N", "aluminium": "N",
  "6061": "N", "7075": "N", "2024": "N",
  "inconel": "S", "titanium": "S", "ti-6al-4v": "S",
  "hastelloy": "S", "waspaloy": "S", "718": "S",
  "hardened": "H", "hardened steel": "H",
  "d2": "H", "h13": "H", "m2": "H",
};

/** Recommended tool types per ISO group × operation */
interface ToolRec {
  name: string;
  manufacturer: string;
  type: string;
  grade: string;
  reason: string;
}
const TOOL_RECS: Record<string, Record<string, ToolRec[]>> = {
  "P": {
    milling: [
      { name: "CoroMill 390", manufacturer: "Sandvik",
        type: "indexable_endmill", grade: "GC1130",
        reason: "Versatile steel milling, good wear resistance" },
      { name: "HARVI III", manufacturer: "Kennametal",
        type: "solid_carbide_endmill", grade: "KC630M",
        reason: "High metal removal in carbon/alloy steel" },
    ],
    drilling: [
      { name: "CoroDrill 860", manufacturer: "Sandvik",
        type: "solid_carbide_drill", grade: "GC1044",
        reason: "Excellent hole quality in steel" },
    ],
    turning: [
      { name: "CoroTurn 300", manufacturer: "Sandvik",
        type: "turning_insert", grade: "GC4325",
        reason: "First choice for steel turning" },
    ],
  },
  "N": {
    milling: [
      { name: "CoroMill Plura", manufacturer: "Sandvik",
        type: "solid_carbide_endmill", grade: "H10F",
        reason: "Polished flutes prevent BUE in aluminum" },
      { name: "F2AJ", manufacturer: "Kennametal",
        type: "indexable_facemill", grade: "KC725M",
        reason: "High-speed aluminum face milling" },
    ],
    drilling: [
      { name: "OSG A-SFT", manufacturer: "OSG",
        type: "solid_carbide_drill", grade: "WXL",
        reason: "Excellent chip evacuation in aluminum" },
    ],
    turning: [
      { name: "CCGT Insert", manufacturer: "Tungaloy",
        type: "turning_insert", grade: "KS05F",
        reason: "Sharp edge, uncoated PCD for aluminum" },
    ],
  },
  "M": {
    milling: [
      { name: "CoroMill 316", manufacturer: "Sandvik",
        type: "exchangeable_head_endmill", grade: "GC1030",
        reason: "Controlled heat in stainless" },
    ],
    drilling: [
      { name: "CoroDrill 860-GM", manufacturer: "Sandvik",
        type: "solid_carbide_drill", grade: "GC1044",
        reason: "Through-coolant for stainless" },
    ],
    turning: [
      { name: "WNMG Insert", manufacturer: "ISCAR",
        type: "turning_insert", grade: "IC8250",
        reason: "Built-up edge resistant in stainless" },
    ],
  },
};

/** Quick tribal knowledge tips — inline subset */
interface TipEntry {
  id: string;
  text: string;
  source: string;
  camSystem?: string;
  operation?: string;
  material?: string;
}
const TIPS: TipEntry[] = [
  { id: "sdk-001", text: "In aluminum, use uncoated polished "
    + "carbide to prevent BUE. 3×D max depth per pass.",
    source: "PRISM tribal", material: "N", operation: "milling" },
  { id: "sdk-002", text: "Stainless work-hardens — never dwell."
    + " Keep feed above 0.05 mm/tooth minimum.",
    source: "PRISM tribal", material: "M" },
  { id: "sdk-003", text: "For titanium, limit Vc to 60 m/min "
    + "max with carbide. Use high-pressure coolant >70 bar.",
    source: "PRISM tribal", material: "S" },
  { id: "sdk-004", text: "Cast iron generates abrasive dust — "
    + "use vacuum extraction. Dry cutting preferred.",
    source: "PRISM tribal", material: "K" },
  { id: "sdk-005", text: "In Fusion 360, enable 'Both Ways' on"
    + " adaptive clearing for 30% cycle time reduction.",
    source: "PRISM tribal", camSystem: "fusion360" },
  { id: "sdk-006", text: "Mastercam Dynamic Motion maintains "
    + "constant engagement — ideal for hard materials.",
    source: "PRISM tribal", camSystem: "mastercam" },
  { id: "sdk-007", text: "In hyperMILL, use 5X tangent plane "
    + "machining for blisk blades with barrel cutters.",
    source: "PRISM tribal", camSystem: "hypermill" },
  { id: "sdk-008", text: "When drilling >3×D, peck at 1×D "
    + "intervals and retract fully for chip evacuation.",
    source: "PRISM tribal", operation: "drilling" },
  { id: "sdk-009", text: "For finishing passes, spring pass at "
    + "0.02 mm DOC removes deflection error from roughing.",
    source: "PRISM tribal", operation: "finishing" },
  { id: "sdk-010", text: "Thread milling is safer than tapping "
    + "in hardened steel — no tap breakage risk.",
    source: "PRISM tribal", material: "H", operation: "milling" },
  { id: "sdk-011", text: "SolidCAM iMachining auto-calculates "
    + "optimal chip load — trust the algorithm for roughing.",
    source: "PRISM tribal", camSystem: "solidcam" },
  { id: "sdk-012", text: "Use climb milling in CNC (not "
    + "conventional) for better surface finish and tool life.",
    source: "PRISM tribal", operation: "milling" },
  { id: "sdk-013", text: "CAMWorks feature recognition works "
    + "best with well-defined prismatic features in SOLIDWORKS.",
    source: "PRISM tribal", camSystem: "camworks" },
  { id: "sdk-014", text: "NX Adaptive Milling keeps constant "
    + "cutter engagement — reduce radial depth to 15% D.",
    source: "PRISM tribal", camSystem: "nx" },
  { id: "sdk-015", text: "For roughing, prefer 2×D depth of "
    + "cut with 15% stepover for HSM toolpaths.",
    source: "PRISM tribal", operation: "roughing" },
];

// ── Interfaces ──

export interface SdkOptimizeSfInput {
  material: string;
  toolDiameter: number;
  fluteCount: number;
  operation?: string;
  depthOfCut?: number;
  widthOfCut?: number;
}

export interface SdkOptimizeSfResult {
  rpm: number;
  feedRate_mmMin: number;
  doc_mm: number;
  woc_mm: number;
  chipLoad_mm: number;
  power_kW: number;
  toolLife_min: number;
  confidence: number;
  warnings: string[];
}

export interface SafetyIssue {
  line: number;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface SdkCheckSafetyInput {
  gcode: string;
  machineType?: string;
}

export interface SdkCheckSafetyResult {
  safe: boolean;
  issues: SafetyIssue[];
  score: number;
}

export interface SdkSuggestToolInput {
  material: string;
  operation?: string;
  diameter?: number;
  machineType?: string;
}

export interface SdkSuggestToolResult {
  tools: ToolRec[];
  topPick: ToolRec | null;
}

export interface SdkGetTipInput {
  camSystem?: string;
  operation?: string;
  material?: string;
}

export interface SdkGetTipResult {
  tips: (TipEntry & { relevance: number })[];
  count: number;
}

export interface SdkBatchCall {
  action: string;
  params: Record<string, unknown>;
}

export interface SdkBatchResult {
  results: unknown[];
  totalTime_ms: number;
}

// ── Engine ──

export class CAMPluginSDKEngine {

  /** Resolve material string to ISO group code */
  private resolveISO(material: string): string {
    const key = material.trim().toLowerCase();
    return MATERIAL_MAP[key] ?? MATERIAL_MAP[material] ?? "P";
  }

  /** Resolve operation string to OpKey */
  private resolveOp(operation?: string): OpKey {
    if (!operation) return "milling";
    const op = operation.trim().toLowerCase();
    if (op.includes("drill")) return "drilling";
    if (op.includes("turn") || op.includes("lathe")) return "turning";
    if (op.includes("finish")) return "finishing";
    if (op.includes("rough")) return "roughing";
    return "milling";
  }

  /**
   * sdk_optimize_sf — Physics-backed speed/feed optimization.
   * Uses inline Kienzle force model + Taylor tool life + basic
   * stability check. Target: <10ms.
   */
  optimizeSF(input: SdkOptimizeSfInput): SdkOptimizeSfResult {
    const warnings: string[] = [];
    const iso = this.resolveISO(input.material);
    const op = this.resolveOp(input.operation);
    const D = input.toolDiameter;
    const z = input.fluteCount;

    if (D <= 0) {
      warnings.push("Invalid tool diameter; using 10 mm default");
    }
    const dEff = D > 0 ? D : 10;

    // Surface speed from table
    const vcTable = VC_TABLE[iso] ?? VC_TABLE["P"];
    const Vc = vcTable[op] ?? vcTable.milling;

    // RPM = (Vc * 1000) / (π * D)
    const rpm = Math.round((Vc * 1000) / (Math.PI * dEff));

    // Chip load
    const fzBase = FZ_DEFAULT[iso] ?? 0.10;
    // Scale fz with diameter: smaller tools need thinner chips
    const fzScale = Math.min(1.0, Math.sqrt(dEff / 12));
    const fz = +(fzBase * fzScale).toFixed(4);

    // Feed rate F = rpm * fz * z
    const feedRate = Math.round(rpm * fz * z);

    // Depth/width defaults
    const doc = input.depthOfCut ?? +(dEff * 1.0).toFixed(2);
    const woc = input.widthOfCut
      ?? +(op === "finishing" ? dEff * 0.05 : dEff * 0.25).toFixed(2);

    // Kienzle cutting force: kc = kc1_1 * h^(-mc)
    const kz = KIENZLE[iso] ?? KIENZLE["P"];
    const h = fz > 0 ? fz : 0.1;  // chip thickness ≈ fz
    const kc = kz.kc1_1 * Math.pow(h, -kz.mc);

    // Fc = kc * ap * fz (single tooth)
    const Fc = kc * doc * h;

    // Power = Fc * Vc / (60000)  [kW]
    const power = +((Fc * Vc) / 60000).toFixed(2);

    // Taylor tool life: T = (C / Vc)^(1/n)
    const tay = TAYLOR[iso] ?? TAYLOR["P"];
    const toolLife = Math.round(
      Math.pow(tay.C / Vc, 1 / tay.n)
    );

    // Basic stability check (simplified critical depth)
    // a_lim ≈ 1 / (2 * kc * 1e-6) — very simplified
    const aLim = 1 / (2 * kc * 1e-6);
    if (doc > aLim) {
      warnings.push(
        `DOC ${doc} mm may exceed stability limit `
        + `~${aLim.toFixed(1)} mm — risk of chatter`
      );
    }

    // Confidence based on ISO group certainty
    const confidence = KIENZLE[iso] && TAYLOR[iso] ? 0.85 : 0.60;

    if (toolLife < 10) {
      warnings.push(
        `Short tool life (${toolLife} min) — consider reducing Vc`
      );
    }
    if (power > 15) {
      warnings.push(
        `High power (${power} kW) — verify machine capability`
      );
    }

    return {
      rpm,
      feedRate_mmMin: feedRate,
      doc_mm: doc,
      woc_mm: woc,
      chipLoad_mm: fz,
      power_kW: power,
      toolLife_min: toolLife,
      confidence,
      warnings,
    };
  }

  /**
   * sdk_check_safety — Quick G-code safety scan.
   * Checks first 100 lines for common dangerous patterns.
   * Target: <15ms.
   */
  checkSafety(input: SdkCheckSafetyInput): SdkCheckSafetyResult {
    const issues: SafetyIssue[] = [];
    const lines = input.gcode
      .split(/\r?\n/)
      .slice(0, 100);

    let spindleOn = false;
    let toolSet = false;
    let lastRapid = false;
    let cuttingStarted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      const lineNum = i + 1;
      if (!line || line.startsWith("(") || line.startsWith("%")
          || line.startsWith("O")) {
        continue;
      }

      // Track spindle state
      if (/M0?3\b|M0?4\b/.test(line)) spindleOn = true;
      if (/M0?5\b/.test(line)) spindleOn = false;

      // Track tool changes
      if (/T\d+/.test(line) && /M0?6\b/.test(line)) toolSet = true;

      // Detect cutting moves (G01/G02/G03 with F)
      const isCut = /G0?[1-3]\b/.test(line) && /F\d/.test(line);
      if (isCut) cuttingStarted = true;

      // Rule 1: Rapid into material (G00 with Z- after cut)
      if (/G0?0\b/.test(line) && !isCut) {
        const zMatch = line.match(/Z(-?\d+\.?\d*)/);
        if (zMatch && parseFloat(zMatch[1]) < 0
            && cuttingStarted) {
          lastRapid = true;
          issues.push({
            line: lineNum,
            rule: "rapid_into_material",
            severity: "error",
            message: "Rapid move (G00) to negative Z after "
              + "cutting — possible crash",
          });
        } else {
          lastRapid = /G0?0\b/.test(line);
        }
      }

      // Rule 2: Cutting without spindle on
      if (isCut && !spindleOn) {
        issues.push({
          line: lineNum,
          rule: "spindle_off_during_cut",
          severity: "error",
          message: "Feed move without spindle running "
            + "(no M3/M4 before this line)",
        });
      }

      // Rule 3: Cutting without tool change
      if (isCut && !toolSet) {
        issues.push({
          line: lineNum,
          rule: "missing_tool_change",
          severity: "warning",
          message: "Feed move without prior tool change "
            + "(T/M6 not found)",
        });
      }

      // Rule 4: Excessive feed rate (>10000 mm/min)
      if (isCut) {
        const fMatch = line.match(/F(\d+\.?\d*)/);
        if (fMatch && parseFloat(fMatch[1]) > 10000) {
          issues.push({
            line: lineNum,
            rule: "excessive_feed",
            severity: "warning",
            message: `Feed rate F${fMatch[1]} exceeds `
              + "10000 mm/min — verify intentional",
          });
        }
      }

      // Rule 5: Excessive spindle speed (>30000 RPM)
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && parseInt(sMatch[1]) > 30000) {
        issues.push({
          line: lineNum,
          rule: "excessive_spindle",
          severity: "warning",
          message: `Spindle speed S${sMatch[1]} exceeds `
            + "30000 RPM — verify machine capability",
        });
      }

      // Rule 6: Missing coolant for deep cuts
      if (isCut && /Z(-?\d+\.?\d*)/.test(line)) {
        const zVal = parseFloat(
          line.match(/Z(-?\d+\.?\d*)/)![1]
        );
        if (zVal < -50
            && !/M0?[78]\b/.test(
              lines.slice(0, i + 1).join("\n")
            )) {
          issues.push({
            line: lineNum,
            rule: "deep_cut_no_coolant",
            severity: "info",
            message: "Deep cut (Z < -50) without coolant "
              + "command (M7/M8) — consider enabling",
          });
        }
      }
    }

    // Calculate safety score (100 = perfect)
    const errorCount = issues.filter(
      i => i.severity === "error"
    ).length;
    const warnCount = issues.filter(
      i => i.severity === "warning"
    ).length;
    const infoCount = issues.filter(
      i => i.severity === "info"
    ).length;
    const score = Math.max(
      0,
      100 - errorCount * 25 - warnCount * 10 - infoCount * 2
    );

    return {
      safe: errorCount === 0,
      issues,
      score,
    };
  }

  /**
   * sdk_suggest_tool — Tool recommendation from inline catalog.
   * Target: <5ms.
   */
  suggestTool(input: SdkSuggestToolInput): SdkSuggestToolResult {
    const iso = this.resolveISO(input.material);
    const op = this.resolveOp(input.operation);

    // Look up from inline recommendations
    const groupRecs = TOOL_RECS[iso];
    let tools: ToolRec[] = [];

    if (groupRecs) {
      tools = groupRecs[op] ?? groupRecs["milling"] ?? [];
    }

    // Fallback: generic recommendation
    if (tools.length === 0) {
      tools = [{
        name: "General Purpose Carbide",
        manufacturer: "Generic",
        type: op.includes("drill") ? "solid_carbide_drill"
          : "solid_carbide_endmill",
        grade: "submicron carbide",
        reason: `General purpose tool for ISO ${iso} ${op}`,
      }];
    }

    // Filter by diameter if provided
    if (input.diameter) {
      const d = input.diameter;
      // Prefer indexable for D > 20mm, solid for smaller
      if (d > 20) {
        const indexable = tools.filter(
          t => t.type.includes("indexable")
              || t.type.includes("facemill")
        );
        if (indexable.length > 0) tools = indexable;
      }
    }

    return {
      tools,
      topPick: tools[0] ?? null,
    };
  }

  /**
   * sdk_get_tip — Tribal knowledge lookup with relevance scoring.
   * Target: <5ms.
   */
  getTip(input: SdkGetTipInput): SdkGetTipResult {
    const iso = input.material
      ? this.resolveISO(input.material) : undefined;
    const op = input.operation
      ? this.resolveOp(input.operation) : undefined;
    const cam = input.camSystem?.trim().toLowerCase();

    const scored = TIPS.map(tip => {
      let relevance = 0.3; // base

      // Material match
      if (iso && tip.material === iso) relevance += 0.3;
      if (iso && !tip.material) relevance += 0.05;

      // Operation match
      if (op && tip.operation === op) relevance += 0.2;
      if (op && !tip.operation) relevance += 0.05;

      // CAM system match
      if (cam && tip.camSystem
          && tip.camSystem.includes(cam)) {
        relevance += 0.3;
      }

      // No filters = return all with base relevance
      if (!iso && !op && !cam) relevance = 0.5;

      return { ...tip, relevance: +relevance.toFixed(2) };
    });

    // Filter to relevance > 0.35 and sort descending
    const filtered = scored
      .filter(t => t.relevance > 0.35)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    return {
      tips: filtered,
      count: filtered.length,
    };
  }

  /**
   * sdk_batch — Execute multiple SDK calls in sequence.
   * Target: <50ms for 5 calls.
   */
  batch(input: { calls: SdkBatchCall[] }): SdkBatchResult {
    const start = Date.now();
    const results: unknown[] = [];

    for (const call of input.calls.slice(0, 20)) {
      try {
        const r = this.calculate(call.action, call.params);
        results.push(r);
      } catch (err: unknown) {
        const msg = err instanceof Error
          ? err.message : String(err);
        results.push({ error: msg });
      }
    }

    return {
      results,
      totalTime_ms: Date.now() - start,
    };
  }

  /**
   * Unified calculate entry point for dispatcher wiring.
   */
  calculate(
    action: string,
    params: Record<string, unknown>
  ): unknown {
    switch (action) {
      case "sdk_optimize_sf":
        return this.optimizeSF(
          params as unknown as SdkOptimizeSfInput
        );
      case "sdk_check_safety":
        return this.checkSafety(
          params as unknown as SdkCheckSafetyInput
        );
      case "sdk_suggest_tool":
        return this.suggestTool(
          params as unknown as SdkSuggestToolInput
        );
      case "sdk_get_tip":
        return this.getTip(
          params as unknown as SdkGetTipInput
        );
      case "sdk_batch":
        return this.batch(
          params as unknown as { calls: SdkBatchCall[] }
        );
      default:
        throw new Error(
          `CAMPluginSDKEngine: unknown action "${action}"`
        );
    }
  }
}

export const camPluginSDKEngine = new CAMPluginSDKEngine();
