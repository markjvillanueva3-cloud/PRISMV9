/**
 * FusionToolExportEngine — Export PRISM tools as Fusion 360 tool library
 *
 * Converts tools from our 73,827-tool catalog into Fusion 360's JSON
 * tool library format with auto-filled cutting parameters per material.
 *
 * Output: Fusion 360 .tools JSON file with geometry + start-values presets
 */

import { toolCatalogEngine } from "./ToolCatalogEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { ultimateSpeedFeedEngine, type Operation, type ToolMaterial } from "./UltimateSpeedFeedEngine.js";
import { holderSelectionEngine } from "./HolderSelectionEngine.js";
import type { ISOGroup } from "../physics/constants.js";

// Last-resort COARSE EMPIRICAL fallback Vc (m/min) / fz (mm/tooth) per ISO
// group. NOT Kienzle-derived (Kienzle is a force model, not a speed model) —
// these only apply when BOTH the vendor catalog cutting_data AND the
// physics-optimal SFC lookup are unavailable for a tool (e.g. tapping rows,
// whose table fz is 0). See the _generatePresets priority chain.
const DEFAULT_VC: Record<string, number> = {
  P: 150, M: 100, K: 200, N: 400, S: 50, H: 120,
};
const DEFAULT_FZ: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.06, H: 0.05,
};

export interface FusionTool {
  BMC: string;
  HAND: string;
  type: string;
  unit: string;
  geometry: {
    DC: number;      // cutting diameter
    SFDM: number;    // shank diameter
    LCF: number;     // flute length
    OAL: number;     // overall length
    NOF: number;     // flute count
    RE: number;      // corner radius
    HA?: number;     // helix angle
  };
  "start-values": {
    presets: Array<{
      name: string;
      f_n: number;      // feed per tooth
      n: number;         // spindle RPM
      n_ramp: number;    // ramp RPM
      f_ramp: number;    // ramp feed mm/min
      stepdown: number;  // axial DOC
      stepover: number;  // radial DOC
      tool_coolant?: string;
    }>;
  };
  /** Holder geometry for Fusion 3D visualization */
  holder?: {
    description: string;
    vendor?: string;
    "product-id"?: string;
    geometry: {
      DC: number;      // holder body diameter
      LB: number;      // holder body length
      LH: number;      // holder gauge length
      /** Taper type for spindle interface */
      connection?: string;
    };
    /** Segments for multi-diameter holder profile */
    segments?: Array<{
      "upper-diameter": number;
      "lower-diameter": number;
      height: number;
    }>;
  };
  /** Shaft geometry (between cutting edge and holder) */
  shaft?: {
    segments: Array<{
      "upper-diameter": number;
      "lower-diameter": number;
      height: number;
    }>;
  };
  /** 3D model reference (STL/STEP path or URL) */
  "3d-model"?: {
    file?: string;
    url?: string;
    format?: "stl" | "step" | "stp";
  };
  description: string;
  vendor: string;
  "product-id": string;
  "product-link"?: string;
  comment?: string;
}

export interface FusionToolLibrary {
  version: number;
  tools: FusionTool[];
  metadata: {
    generated_by: string;
    generated_at: string;
    tool_count: number;
    material_presets: string[];
  };
}

export interface FusionExportRequest {
  material_iso_group?: string;
  tool_type?: string;
  diameter_range_mm?: [number, number];
  manufacturer?: string;
  max_tools?: number;
  include_holders?: boolean;
}

export class FusionToolExportEngine {
  /**
   * Export tools from PRISM catalog as Fusion 360 tool library.
   */
  export(req?: FusionExportRequest): FusionToolLibrary {
    const iso = req?.material_iso_group || "P";
    const maxTools = req?.max_tools || 50;

    // Query PRISM tool catalog
    let catalogTools: any[] = [];
    try {
      if (toolCatalogEngine?.search) {
        catalogTools = toolCatalogEngine.search({
          type: req?.tool_type,
          iso_group: iso,
          diameter_range: req?.diameter_range_mm,
          manufacturer: req?.manufacturer,
          max_results: maxTools,
        }) || [];
      }
    } catch { /* catalog optional */ }

    // If no catalog, generate common tools
    if (catalogTools.length === 0) {
      catalogTools = this._generateCommonTools();
    }

    // Convert to Fusion format
    const fusionTools = catalogTools
      .slice(0, maxTools)
      .map(t => this._convertTool(t, iso));

    // Materials for presets
    const materials = ["P", "M", "K", "N", "S", "H"];
    const presetNames = materials.map(m => ({
      P: "Steel", M: "Stainless", K: "Cast Iron",
      N: "Aluminum", S: "Superalloy", H: "Hardened",
    }[m] || m));

    return {
      version: 2,
      tools: fusionTools,
      metadata: {
        generated_by: "PRISM CAM Kernel v9",
        generated_at: new Date().toISOString(),
        tool_count: fusionTools.length,
        material_presets: presetNames,
      },
    };
  }

  /**
   * Export an array of CatalogTool objects as a Fusion 360 library.
   * Used by /fusion-export-tools and fusion_export_tool_library action.
   */
  exportLibrary(tools: any[]): FusionToolLibrary {
    const fusionTools = tools.map(t => this._convertTool(t, "P"));
    return {
      version: 2,
      tools: fusionTools,
      metadata: {
        generated_by: "PRISM CAM Kernel v9",
        generated_at: new Date().toISOString(),
        tool_count: fusionTools.length,
        material_presets: ["Steel", "Stainless", "Cast Iron", "Aluminum", "Superalloy", "Hardened"],
      },
    };
  }

  /**
   * Validate F360 export coverage for a set of tools.
   * Returns quality grades: A (full), B (dims+basic S/F), C (dims only), D (incomplete).
   */
  validateCoverage(tools: any[]): { total: number; gradeA: number; gradeB: number; gradeC: number; gradeD: number; pctBOrAbove: number } {
    let gradeA = 0, gradeB = 0, gradeC = 0, gradeD = 0;
    for (const t of tools) {
      const dc = t.physical?.cutting_diameter_mm ?? t.cutting_diameter_mm ?? 0;
      const oal = t.physical?.overall_length_mm ?? t.overall_length_mm ?? 0;
      const loc = t.physical?.flute_length_mm ?? t.flute_length_mm ?? 0;
      const hasCutData = t.cutting_data && Object.keys(t.cutting_data).length > 0;
      const hasFlutes = !!(t.flute_count || t.physical?.flute_count);
      if (dc <= 0) { gradeD++; continue; }
      if (oal > 0 && loc > 0 && hasCutData && hasFlutes) gradeA++;
      else if (dc > 0 && hasCutData) gradeB++;
      else if (dc > 0) gradeC++;
      else gradeD++;
    }
    const total = tools.length;
    return { total, gradeA, gradeB, gradeC, gradeD, pctBOrAbove: total > 0 ? Math.round((gradeA + gradeB) / total * 100) : 0 };
  }

  /**
   * Export a single tool with multi-material presets.
   */
  exportSingleTool(
    tool: {
      diameter_mm: number;
      flute_count: number;
      flute_length_mm: number;
      overall_length_mm: number;
      corner_radius_mm?: number;
      helix_angle_deg?: number;
      coating?: string;
      manufacturer?: string;
      designation?: string;
      type?: string;
    },
  ): FusionTool {
    return this._convertTool(tool, "P");
  }

  /**
   * Convert a PRISM catalog tool to Fusion 360 format.
   */
  private _convertTool(tool: any, primaryISO: string): FusionTool {
    const d = tool.physical?.cutting_diameter_mm
      || tool.cutting_diameter_mm || tool.diameter_mm || 10;
    const shankD = tool.physical?.shank_diameter_mm
      || tool.shank_diameter_mm || d;
    const loc = tool.physical?.flute_length_mm
      || tool.flute_length_mm || d * 3;
    const oal = tool.physical?.overall_length_mm
      || tool.overall_length_mm || d * 6;
    const flutes = tool.flute_count
      || tool.physical?.flute_count || 3;
    const cr = tool.physical?.corner_radius_mm
      || tool.corner_radius_mm || 0;
    const helix = tool.helix_angle_deg || 30;
    const coating = tool.coating || "TiAlN";
    const tType = tool.type || "end_mill";

    // Determine Fusion tool type
    const toolType = this._fusionToolType(tType, cr, d);

    // Generate cutting parameter presets for all ISO groups.
    // Priority per group: vendor catalog cutting_data → physics-optimal SFC
    // (UltimateSpeedFeedEngine) → Kienzle defaults.
    const presets = this._generatePresets(
      d, flutes, loc, tool.cutting_data, tType, this._fusionBMC(coating),
    );

    const vendor = tool.manufacturer || "Generic";
    const designation = tool.designation || tool.series
      || `Ø${d}mm ${flutes}FL`;
    const productId = tool.id || `prism-${vendor}-${d}-${flutes}fl`
      .toLowerCase().replace(/\s+/g, "-");

    // Build shaft geometry (neck between cutting edge and holder)
    const shaftSegments: Array<{ "upper-diameter": number; "lower-diameter": number; height: number }> = [];
    if (shankD !== d) {
      // Neck transition from cutting diameter to shank
      shaftSegments.push({
        "upper-diameter": d,
        "lower-diameter": shankD,
        height: 2,
      });
    }
    shaftSegments.push({
      "upper-diameter": shankD,
      "lower-diameter": shankD,
      height: oal - loc - 2,
    });

    // Build holder geometry — 17 taper types supported
    const HP: Record<string, [number, number, string]> = {
      "ER16": [26, 35, "ER16 Collet Chuck"], "ER20": [34, 40, "ER20 Collet Chuck"],
      "ER25": [42, 40, "ER25 Collet Chuck"], "ER32": [50, 46, "ER32 Collet Chuck"],
      "ER40": [63, 55, "ER40 Collet Chuck"], "HSK-A63": [63, 80, "HSK-A63"],
      "HSK-A100": [80, 100, "HSK-A100"], "CAT40": [63, 85, "CAT40 V-Flange"],
      "CAT50": [80, 105, "CAT50 V-Flange"], "BT30": [46, 50, "BT30"],
      "BT40": [63, 65, "BT40"], "BT50": [80, 85, "BT50"],
      "Capto-C4": [40, 55, "Capto C4"], "Capto-C6": [63, 80, "Capto C6"],
      "Capto-C8": [80, 100, "Capto C8"], "Shrink-Fit": [0, 60, "Shrink Fit"],
      "Hydraulic": [0, 70, "Hydraulic Chuck"],
    };
    const hi = (tool as any).holder_interface;
    const taperType = hi && HP[hi] ? hi : (shankD <= 6 ? "ER16" : shankD <= 13 ? "ER20" : shankD <= 16 ? "ER25" : shankD <= 20 ? "ER32" : shankD <= 25 ? "ER40" : "CAT40");
    const [hpBody, hpGauge] = HP[taperType] ?? HP["ER32"];
    const holderBodyDiam = hpBody > 0 ? hpBody : Math.max(shankD + 8, 26);
    const holderLength = hpGauge;
    const holderGaugeLen = holderLength + oal - loc;

    // Real-holder lookup (CATALOG-APP-WIRING-MS0/U-HOLDER-WIRE-FUSION, slot:romeo):
    // prefer an ACTUAL cataloged holder (HAIMER / GUHRING / BIG DAISHOWA, 643 records)
    // matched to the spindle taper + shank, replacing the synthetic vendor="Generic"
    // geometry above. Spindle taper defaults to CAT40 (JM's common interface) unless the
    // tool names a real spindle taper; collet-size hi values (ER*) are NOT spindle tapers.
    // Falls back to the synthetic holder when no catalog holder fits (fail-soft).
    const spindleTaper =
      (tool as any).spindle_taper ||
      (hi && /^(CAT|BT|SK|HSK|DIN)/i.test(String(hi)) ? hi : "CAT40");
    const realHolder = holderSelectionEngine.select({
      taper: spindleTaper,
      shankDiameterMm: shankD,
      typePreference: shankD <= 12 ? "shrink_fit" : "hydraulic",
    });
    const holderDescription = realHolder
      ? `${realHolder.brand} ${realHolder.designation}`.trim()
      : (HP[taperType] ?? HP["ER32"])[2];
    const holderVendor = realHolder ? realHolder.brand : "Generic";
    const holderConnection = realHolder ? realHolder.taper : taperType;
    const holderDC = realHolder?.bodyDiaMm ?? holderBodyDiam;
    const holderLH = realHolder?.gaugeMm ?? holderGaugeLen;

    const holderSegments = [
      { "upper-diameter": holderBodyDiam, "lower-diameter": holderBodyDiam, height: holderLength * 0.7 },
      { "upper-diameter": holderBodyDiam, "lower-diameter": holderBodyDiam * 1.3, height: holderLength * 0.15 },
      { "upper-diameter": holderBodyDiam * 1.3, "lower-diameter": holderBodyDiam * 0.6, height: holderLength * 0.15 },
    ];

    return {
      BMC: this._fusionBMC(coating),
      HAND: "R",
      type: toolType,
      unit: "millimeters",
      geometry: {
        DC: d,
        SFDM: shankD,
        LCF: loc,
        OAL: oal,
        NOF: flutes,
        RE: cr,
        ...(helix && { HA: helix }),
      },
      shaft: { segments: shaftSegments },
      holder: {
        description: holderDescription,
        vendor: holderVendor,
        geometry: {
          DC: holderDC,
          LB: holderLength,
          LH: holderLH,
          connection: holderConnection,
        },
        segments: holderSegments,
      },
      "start-values": { presets },
      description: `PRISM: ${vendor} ${designation} ${coating}`,
      vendor,
      "product-id": productId,
      comment: `Physics-backed S/F from PRISM (Kienzle/Taylor). Holder: ${holderDescription} [${holderConnection}]${this._enrichComment(tType, d)}`,
    };
  }

  /**
   * Generate cutting parameter presets for all 6 ISO material groups.
   *
   * Per-group cutting data is resolved by a 3-tier priority chain so every
   * preset carries the most physically-correct numbers available:
   *   1. vendor catalog `cutting_data[iso]` (manufacturer-published, diameter-specific)
   *   2. PRISM physics-optimal — `UltimateSpeedFeedEngine.calculate()` per ISO group
   *      (Kienzle/Taylor/Merchant-backed, geometry- and tool-material-aware)
   *   3. coarse Kienzle DEFAULT_VC/DEFAULT_FZ (last-resort fail-soft)
   *
   * @param d cutting diameter (mm)
   * @param flutes flute count
   * @param loc length of cut / flute length (mm)
   * @param cuttingData optional vendor catalog cutting data keyed by ISO group
   * @param toolType PRISM/Fusion tool-type string (drives op + coolant + ramp)
   * @param toolMaterial Fusion BMC class ("carbide"|"hss"|"cbn"|"pcd"|"ceramic")
   * @returns one preset object per ISO group (P,M,K,N,S,H)
   */
  private _generatePresets(
    d: number, flutes: number, loc: number,
    cuttingData?: Record<string, {
      vc_min: number; vc_max: number;
      fz_min: number; fz_max: number;
      ap_max?: number; ae_max?: number;
    }>,
    toolType?: string,
    toolMaterial: string = "carbide",
  ) {
    const groups: Array<{ iso: string; name: string }> = [
      { iso: "P", name: "Steel (P)" },
      { iso: "M", name: "Stainless (M)" },
      { iso: "K", name: "Cast Iron (K)" },
      { iso: "N", name: "Aluminum (N)" },
      { iso: "S", name: "Superalloy (S)" },
      { iso: "H", name: "Hardened (H)" },
    ];

    // Roughing-oriented ap/ae from actual tool geometry (last-resort default)
    const roughAp = Math.round(loc * 0.5 * 100) / 100;
    const roughAe = Math.round(d * 0.5 * 100) / 100;

    return groups.map(g => {
      const cd = cuttingData?.[g.iso];
      // Only consult the (heavier) physics engine when no vendor data exists.
      const sfc = cd
        ? null
        : this._sfcOptimal(g.iso, toolType || "end_mill", d, flutes, loc, toolMaterial);

      // Vc (m/min): catalog avg → SFC optimal → Kienzle default
      const vc = cd
        ? (cd.vc_min + cd.vc_max) / 2
        : sfc
          ? sfc.vc
          : (DEFAULT_VC[g.iso] || 150);
      // fz (mm/tooth): catalog avg → SFC optimal → Kienzle default
      const fz = cd
        ? (cd.fz_min + cd.fz_max) / 2
        : sfc
          ? sfc.fz
          : (DEFAULT_FZ[g.iso] || 0.1);

      // fz precision by source: vendor-catalog fz and SFC fz are ALREADY
      // diameter-specific (SFC applies its 12mm-anchored diameterFzFactor table
      // internally). DEFAULT_FZ is a single 10mm-reference constant, so it alone
      // gets the sqrt(d/10) up-scale. Two distinct scaling laws by design — do
      // NOT add a second scale to the catalog/SFC branch.
      const scaledFz = (cd || sfc)
        ? Math.round(fz * 1000) / 1000
        : Math.round(fz * Math.sqrt(d / 10) * 1000) / 1000;
      const rpm = Math.round((vc * 1000) / (Math.PI * d));
      const feedMmMin = Math.round(scaledFz * flutes * rpm);

      // Stepdown/stepover: catalog ap_max/ae_max → SFC ap/ae → geometry roughing
      const stepdown = cd?.ap_max
        ? Math.round(Math.min(cd.ap_max, loc) * 100) / 100
        : sfc
          ? Math.round(Math.min(sfc.ap, loc) * 100) / 100
          : roughAp;
      const stepover = cd?.ae_max
        ? Math.round(Math.min(cd.ae_max, d) * 100) / 100
        : sfc
          ? Math.round(Math.min(sfc.ae, d) * 100) / 100
          : roughAe;

      // Coolant strategy based on tool type
      const coolant = this._coolantForPreset(g.iso, toolType || "end_mill", d);

      // Ramp parameters: tool-type-aware angle, RPM, and feed scaling
      const ramp = this._rampParams(toolType || "end_mill");

      return {
        name: g.name,
        f_n: scaledFz,
        n: rpm,
        n_ramp: Math.round(rpm * ramp.rpmScale),
        f_ramp: Math.round(feedMmMin * ramp.feedScale),
        stepdown,
        stepover,
        tool_coolant: coolant,
      };
    });
  }

  /** Memoization for the physics-optimal SFC lookup (keyed by tool signature). */
  private _sfcCache: Map<string, { vc: number; fz: number; ap: number; ae: number } | null> = new Map();

  /**
   * Map a Fusion/PRISM tool-type string to the SFC engine's operation enum.
   */
  private _sfcOperation(toolType: string): Operation {
    if (/drill/i.test(toolType)) return "drilling";
    if (/tap/i.test(toolType)) return "tapping";
    if (/ream/i.test(toolType)) return "reaming";
    if (/bor/i.test(toolType)) return "boring";
    if (/thread.*mill/i.test(toolType)) return "thread_milling";
    return "milling";
  }

  /**
   * Physics-optimal cutting parameters for one ISO group via the SFC engine's
   * lightweight `lookupCuttingData` table path (NOT the full `calculate()`
   * physics suite — that is far too slow to call 6×/tool across a large
   * library). Returns Vc (m/min), fz (mm/tooth — for milling; feed-per-rev
   * divided by flutes for single-point ops so the downstream `fz*flutes*rpm`
   * recovers the correct feedrate), ap (mm) and ae (mm). Returns null on any
   * failure so the caller fails soft to the coarse Kienzle defaults. Results
   * are memoized by tool signature.
   *
   * @returns optimal {vc, fz, ap, ae} or null if no cutting-data row resolves
   */
  private _sfcOptimal(
    iso: string, toolType: string, d: number, flutes: number,
    loc: number, toolMaterial: string,
  ): { vc: number; fz: number; ap: number; ae: number } | null {
    const op = this._sfcOperation(toolType);
    const validMat: ToolMaterial = ["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"].includes(toolMaterial)
      ? (toolMaterial as ToolMaterial) : "carbide";
    const key = `${iso}|${op}|${d.toFixed(2)}|${flutes}|${validMat}|${loc.toFixed(1)}`;
    if (this._sfcCache.has(key)) return this._sfcCache.get(key)!;

    let result: { vc: number; fz: number; ap: number; ae: number } | null = null;
    try {
      if (ultimateSpeedFeedEngine?.lookupCuttingData) {
        const lk = ultimateSpeedFeedEngine.lookupCuttingData({
          iso_group: iso as ISOGroup,
          operation: op,
          cut_type: "roughing",
          tool_diameter_mm: d,
          tool_material: validMat,
        });
        if (lk && Number.isFinite(lk.vc) && lk.vc > 0 && Number.isFinite(lk.fz) && lk.fz > 0) {
          // milling/thread-milling fz is per-tooth; single-point ops report
          // per-rev — divide by flutes so fz*flutes*rpm = correct feedrate.
          const isMillingOp = op === "milling" || op === "thread_milling";
          const fz = isMillingOp ? lk.fz : (flutes > 0 ? lk.fz / flutes : lk.fz);
          result = {
            vc: lk.vc,
            fz,
            ap: lk.ap > 0 ? lk.ap : loc * 0.5,
            ae: lk.ae > 0 ? lk.ae : d * 0.5,
          };
        }
      }
    } catch { /* SFC engine unavailable — caller falls back to Kienzle defaults */ }

    this._sfcCache.set(key, result);
    return result;
  }

  /**
   * Determine coolant strategy based on tool type and ISO group.
   */
  private _coolantForPreset(
    iso: string, toolType: string, d: number,
  ): string {
    if (/drill/i.test(toolType)) {
      return d >= 3 ? "through tool" : "flood";
    }
    if (/tap/i.test(toolType)) return "flood";
    if (/ball/i.test(toolType)) return "mist";
    // end_mill / face_mill default
    if (/face/i.test(toolType)) return "flood";
    // General ISO-based defaults for end mills
    const isoDefault: Record<string, string> = {
      P: "flood", M: "flood", K: "disabled",
      N: "flood", S: "through tool", H: "disabled",
    };
    return isoDefault[iso] || "flood";
  }

  /**
   * Map PRISM tool type to Fusion 360 tool type string.
   */
  private _fusionToolType(
    type: string, cornerRadius: number, diameter: number,
  ): string {
    if (/ball/i.test(type) || cornerRadius >= diameter / 2 - 0.1) {
      return "ball end mill";
    }
    if (/bull|corner/i.test(type) || (cornerRadius > 0 && cornerRadius < diameter / 2 - 0.1)) {
      return "bull nose end mill";
    }
    if (/face/i.test(type)) return "face mill";
    if (/drill/i.test(type)) return "drill";
    if (/tap/i.test(type)) return "tap right hand";
    if (/ream/i.test(type)) return "reamer";
    if (/chamfer/i.test(type)) return "chamfer mill";
    if (/bore/i.test(type)) return "boring bar";
    if (/thread.*mill/i.test(type)) return "thread mill";
    return "flat end mill";
  }

  /**
   * Enrich tool comment with MachiningPlaybook tips (sync).
   * Returns playbook snippet or empty string if unavailable.
   */
  private _enrichComment(toolType: string, diameter: number): string {
    try {
      if (!machiningPlaybookEngine?.advise) return "";
      const op = /drill/i.test(toolType) ? "drilling"
        : /tap/i.test(toolType) ? "tapping"
        : /ball/i.test(toolType) ? "finishing"
        : "milling";
      const result = machiningPlaybookEngine.advise({
        operation_type: op,
        material_iso: "P",
        features: [`diameter_${diameter}`],
      });
      if (result?.rules?.length) {
        const topTips = result.rules
          .slice(0, 2)
          .map((r: any) => r.title || r.id)
          .join("; ");
        return ` | Playbook: ${topTips}`;
      }
    } catch { /* playbook not available */ }
    return "";
  }

  /**
   * Get ramp angle (degrees) and feed/RPM scaling factors by tool type.
   * Ball nose can plunge steeper; drills do full plunge.
   */
  private _rampParams(toolType: string): { angleDeg: number; rpmScale: number; feedScale: number } {
    if (/drill/i.test(toolType)) return { angleDeg: 90, rpmScale: 1.0, feedScale: 1.0 };
    if (/ball/i.test(toolType)) return { angleDeg: 5, rpmScale: 0.7, feedScale: 0.4 };
    // End mills, face mills, etc.: conservative 2-3 deg ramp
    return { angleDeg: 2.5, rpmScale: 0.6, feedScale: 0.3 };
  }

  /**
   * Map coating to Fusion BMC (body material class).
   */
  private _fusionBMC(coating: string): string {
    if (/HSS|hss/i.test(coating)) return "hss";
    if (/CBN|cbn/i.test(coating)) return "cbn";
    if (/PCD|pcd|diamond/i.test(coating)) return "pcd";
    if (/ceramic/i.test(coating)) return "ceramic";
    return "carbide";
  }

  /**
   * Generate a set of common tools when no catalog available.
   */
  private _generateCommonTools(): any[] {
    const diameters = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25];
    const tools: any[] = [];

    for (const d of diameters) {
      // Flat end mill
      tools.push({
        type: "end_mill", diameter_mm: d,
        flute_count: d <= 6 ? 3 : 4,
        flute_length_mm: d * 3,
        overall_length_mm: d * 6,
        corner_radius_mm: 0,
        coating: d <= 10 ? "TiAlN" : "AlCrN",
        manufacturer: "PRISM Generic",
        designation: `Ø${d} Flat ${d <= 6 ? 3 : 4}FL`,
      });

      // Ball end mill
      if (d >= 4) {
        tools.push({
          type: "ball_mill", diameter_mm: d,
          flute_count: 2,
          flute_length_mm: d * 2,
          overall_length_mm: d * 5,
          corner_radius_mm: d / 2,
          coating: "TiAlN",
          manufacturer: "PRISM Generic",
          designation: `Ø${d} Ball 2FL`,
        });
      }

      // Drill
      tools.push({
        type: "drill", diameter_mm: d,
        flute_count: 2,
        flute_length_mm: d * 5,
        overall_length_mm: d * 8,
        corner_radius_mm: 0,
        coating: "TiN",
        manufacturer: "PRISM Generic",
        designation: `Ø${d} Drill 140°`,
      });
    }

    return tools;
  }
}

export const fusionToolExportEngine = new FusionToolExportEngine();
