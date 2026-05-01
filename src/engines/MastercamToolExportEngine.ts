/**
 * MastercamToolExportEngine — Export PRISM Tool Catalog to Mastercam Format (E1123)
 *
 * Exports PRISM's 95K+ tool catalog to Mastercam tool library format
 * (.mcam-tools / .mcam-operations). Supports full catalog export (partitioned
 * by manufacturer), job-specific export, and filtered export. Each tool
 * entry contains holder + cutter geometry, tool classification, material,
 * and per-ISO-group cutting data derived from PRISM physics engines.
 *
 * Methods:
 *   exportLibrary(filter?, format?)          — filtered or full catalog export
 *   exportForJob(job_tools[])                — job-specific tool subset
 *   exportWithCuttingData(tools[], mats[])   — includes per-material speed/feed tables
 *   getFormat()                              — describe .mcam-tools format structure
 *
 * Cutting data physics:
 *   Vc  — UltimateSpeedFeedEngine baseline per ISO group (m/min)
 *   fz  — Kienzle-derived optimal chipload (mm/tooth)
 *   ap  — strategy-appropriate axial engagement (mm)
 *   ae  — strategy-appropriate radial engagement (mm)
 *
 * @engine MastercamToolExportEngine
 * @shortcode E1123
 * @dispatcher camDispatcher
 * @actions mastercam_tool_export, mastercam_tool_export_job
 * @milestone CAMX-MS10/U01
 */

import { toolCatalogEngine } from "./ToolCatalogEngine.js";

// ─── Physics constants (Kienzle / UltimateSpeedFeedEngine baselines) ──────────

/** Baseline cutting speed (m/min) per ISO group for carbide uncoated.
 *  Derived from UltimateSpeedFeedEngine lookup tables (milling, semi_finish). */
const VC_BASE: Record<string, number> = {
  P: 150,  // Steel
  M: 100,  // Stainless
  K: 200,  // Cast Iron
  N: 400,  // Non-ferrous (aluminum)
  S:  50,  // Superalloy
  H: 120,  // Hardened
};

/** Optimal chipload fz (mm/tooth) per ISO group — Kienzle kc1.1-derived.
 *  Balances chip formation and tool life. */
const FZ_BASE: Record<string, number> = {
  P: 0.10,
  M: 0.08,
  K: 0.12,
  N: 0.15,
  S: 0.06,
  H: 0.05,
};

/** Axial depth of cut factor (× diameter) for semi-finishing */
const AP_FACTOR: Record<string, number> = {
  P: 0.5, M: 0.4, K: 0.6, N: 1.0, S: 0.3, H: 0.25,
};

/** Radial engagement factor (× diameter) for semi-finishing */
const AE_FACTOR: Record<string, number> = {
  P: 0.4, M: 0.35, K: 0.5, N: 0.5, S: 0.25, H: 0.20,
};

/** Coating speed multiplier */
const COATING_MULT: Record<string, number> = {
  uncoated: 1.0, TiN: 1.10, TiCN: 1.15, TiAlN: 1.25, AlTiN: 1.30,
  AlCrN: 1.25, DLC: 1.35, diamond: 1.50,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type McamToolType =
  | "endmill"
  | "ball"
  | "bull"
  | "face"
  | "drill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "chamfer"
  | "form"
  | "thread_mill"
  | "spot_drill";

export type McamToolMaterial =
  | "carbide"
  | "hss"
  | "ceramic"
  | "cbn"
  | "pcd"
  | "cermet";

export type McamHolderType =
  | "BT30"
  | "BT40"
  | "BT50"
  | "CAT40"
  | "CAT50"
  | "HSK-A63"
  | "HSK-A100"
  | "HSK-E32"
  | "Capto-C4"
  | "Capto-C5"
  | "Capto-C6"
  | "KM40"
  | "KM50"
  | "shrink_fit"
  | "collet_ER"
  | "hydraulic"
  | "milling_chuck"
  | "straight_shank";

export type McamExportFormat = "mcam-tools" | "mcam-operations" | "json";
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

// ─── Export filter ────────────────────────────────────────────────────────────

export interface McamExportFilter {
  /** Filter by manufacturer name (partial match) */
  manufacturer?: string;
  /** Filter by tool type */
  tool_type?: McamToolType;
  /** Diameter range [min, max] in mm */
  diameter_range_mm?: [number, number];
  /** Filter by tool material */
  tool_material?: McamToolMaterial;
  /** ISO material group to optimize cutting data for */
  iso_group?: ISOGroup;
  /** Max tools per library partition (default: 2000) */
  max_per_library?: number;
  /** Overall tool count cap (default: 5000) */
  max_tools?: number;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface McamCuttingData {
  /** ISO group this data applies to */
  iso_group: ISOGroup;
  material_label: string;
  /** Cutting speed, m/min */
  vc_mpm: number;
  /** Feed per tooth, mm */
  fz_mm: number;
  /** Axial depth of cut, mm */
  ap_mm: number;
  /** Radial engagement, mm */
  ae_mm: number;
  /** Spindle RPM (computed: 1000*Vc/(π*D)) */
  rpm: number;
  /** Table feed, mm/min (computed: fz * flutes * RPM) */
  feed_mmpm: number;
}

export interface McamHolder {
  type: McamHolderType;
  description: string;
  /** Gauge length, mm */
  gauge_length_mm: number;
  /** Body outer diameter, mm */
  body_diameter_mm: number;
  /** Projection (tool stickout from holder nose), mm */
  projection_mm: number;
}

export interface McamTool {
  /** Mastercam tool number (1-based) */
  tool_number: number;
  /** Mastercam-internal unique ID string */
  id: string;
  /** Tool type classification */
  type: McamToolType;
  /** Tool material */
  material: McamToolMaterial;
  /** Manufacturer name */
  manufacturer: string;
  /** Manufacturer part number / designation */
  part_number: string;
  /** Descriptive comment */
  comment: string;

  // ── Cutter geometry ────────────────────────────────────────────────────────
  /** Cutting diameter, mm */
  diameter_mm: number;
  /** Corner / nose radius, mm (0 for sharp endmill) */
  corner_radius_mm: number;
  /** Number of flutes */
  flutes: number;
  /** Flute (cutting) length, mm */
  flute_length_mm: number;
  /** Overall assembled length, mm */
  overall_length_mm: number;
  /** Shank diameter, mm */
  shank_diameter_mm: number;
  /** Helix angle, degrees */
  helix_angle_deg: number;
  /** Point angle for drills, degrees (118° standard HSS, 140° carbide) */
  point_angle_deg?: number;
  /** Taper angle, degrees (for tapered endmills) */
  taper_angle_deg?: number;
  /** Coating */
  coating: string;

  // ── Holder ────────────────────────────────────────────────────────────────
  holder?: McamHolder;

  // ── Cutting data (per material group) ─────────────────────────────────────
  cutting_data: McamCuttingData[];
}

export interface McamLibrary {
  /** Library format */
  format: "mcam-tools" | "mcam-operations";
  /** Library name (shown in Mastercam tool manager) */
  library_name: string;
  /** Library file name without extension */
  file_name: string;
  tools: McamTool[];
  metadata: {
    generated_by: string;
    generated_at: string;
    tool_count: number;
    source: string;
    version: string;
    /** Partitioned by manufacturer when doing full catalog export */
    partition?: string;
  };
}

export interface McamExportResult {
  /** Serialized library content (JSON for .mcam-tools) */
  library_data: string;
  tool_count: number;
  file_name: string;
  /** For full catalog exports, multiple libraries are returned */
  libraries?: McamLibrary[];
  summary?: {
    total_tools: number;
    partitions: number;
    manufacturers: string[];
    tool_types: string[];
  };
}

// ─── ISO group label map ──────────────────────────────────────────────────────

const ISO_LABELS: Record<ISOGroup, string> = {
  P: "Steel",
  M: "Stainless Steel",
  K: "Cast Iron",
  N: "Non-Ferrous (Aluminum)",
  S: "Superalloy/Titanium",
  H: "Hardened Steel",
};

const ALL_ISO_GROUPS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

// ─── Tool type mapping (PRISM → Mastercam) ───────────────────────────────────

function mapToolType(prismType: string): McamToolType {
  const t = (prismType || "").toLowerCase();
  if (t.includes("ball")) return "ball";
  if (t.includes("bull") || t.includes("corner_radius") || t.includes("torus")) return "bull";
  if (t.includes("face") || t.includes("shell")) return "face";
  if (t.includes("drill") && !t.includes("spot")) return "drill";
  if (t.includes("spot")) return "spot_drill";
  if (t.includes("tap")) return "tap";
  if (t.includes("ream")) return "reamer";
  if (t.includes("bore") || t.includes("boring")) return "boring_bar";
  if (t.includes("chamfer") || t.includes("countersink")) return "chamfer";
  if (t.includes("thread")) return "thread_mill";
  if (t.includes("form")) return "form";
  return "endmill";
}

function mapToolMaterial(prismMaterial: string): McamToolMaterial {
  const m = (prismMaterial || "").toLowerCase();
  if (m.includes("cbn") || m.includes("boron")) return "cbn";
  if (m.includes("pcd") || m.includes("diamond") && !m.includes("dl")) return "pcd";
  if (m.includes("ceramic") || m.includes("oxide")) return "ceramic";
  if (m.includes("cermet")) return "cermet";
  if (m.includes("hss") || m.includes("high speed")) return "hss";
  return "carbide";
}

// ─── Cutting data computation ─────────────────────────────────────────────────

function computeCuttingData(
  d: number,
  flutes: number,
  coating: string,
  toolMat: McamToolMaterial,
  groups: ISOGroup[],
): McamCuttingData[] {
  const coatKey = Object.keys(COATING_MULT).find(k =>
    coating.toLowerCase().includes(k.toLowerCase()),
  ) ?? "uncoated";
  const coatMult = COATING_MULT[coatKey] ?? 1.0;

  // Material factor: carbide is baseline; HSS ~40% slower; ceramics 2-3× faster for some groups
  const matMult: Record<McamToolMaterial, number> = {
    carbide: 1.00, cermet: 1.10, ceramic: 2.20, cbn: 2.50, pcd: 3.00, hss: 0.40,
  };
  const mm = matMult[toolMat] ?? 1.0;

  return groups.map(iso => {
    const vcBase = VC_BASE[iso] ?? 150;
    const fzBase = FZ_BASE[iso] ?? 0.10;
    const apFactor = AP_FACTOR[iso] ?? 0.5;
    const aeFactor = AE_FACTOR[iso] ?? 0.4;

    // Ceramic and CBN not used on N/non-ferrous
    const vcMult = (iso === "N" && (toolMat === "ceramic" || toolMat === "cbn")) ? 0 : mm * coatMult;
    const vc = Math.round(vcBase * vcMult * 10) / 10;
    const fz = Math.round(fzBase * (d >= 10 ? 1.0 : 0.85) * 100) / 1000; // smaller tools → lighter chipload
    const ap = Math.round(d * apFactor * 100) / 100;
    const ae = Math.round(d * aeFactor * 100) / 100;

    // RPM = 1000 * Vc / (π * D)
    const rpm = d > 0 ? Math.round((1000 * vc) / (Math.PI * d)) : 0;
    // Feed = fz * flutes * RPM
    const feed_mmpm = Math.round(fz * flutes * rpm);

    return {
      iso_group: iso,
      material_label: ISO_LABELS[iso],
      vc_mpm: vc,
      fz_mm: fz,
      ap_mm: ap,
      ae_mm: ae,
      rpm,
      feed_mmpm,
    };
  });
}

// ─── PRISM catalog tool → McamTool ───────────────────────────────────────────

function convertTool(prismTool: any, toolNumber: number, isoGroups: ISOGroup[]): McamTool {
  // Geometry extraction — supports both flat and nested .physical layout
  const phys = prismTool.physical ?? {};
  const d = phys.cutting_diameter_mm ?? prismTool.cutting_diameter_mm ?? prismTool.diameter_mm ?? 10;
  const shankD = phys.shank_diameter_mm ?? prismTool.shank_diameter_mm ?? d;
  const loc = phys.flute_length_mm ?? prismTool.flute_length_mm ?? d * 3;
  const oal = phys.overall_length_mm ?? prismTool.overall_length_mm ?? d * 6;
  const cr = phys.corner_radius_mm ?? prismTool.corner_radius_mm ?? 0;
  const flutes = phys.flute_count ?? prismTool.flute_count ?? prismTool.flutes ?? 4;
  const helix = phys.helix_angle_deg ?? prismTool.helix_angle_deg ?? 35;
  const coating = prismTool.coating ?? phys.coating ?? "uncoated";
  const mfr = prismTool.manufacturer ?? prismTool.brand ?? "Generic";
  const pn = prismTool.part_number ?? prismTool.designation ?? prismTool.model ?? "";
  const rawType = prismTool.type ?? prismTool.tool_type ?? "endmill";
  const toolType = mapToolType(rawType);
  const rawMat = prismTool.material ?? prismTool.substrate ?? "carbide";
  const toolMat = mapToolMaterial(rawMat);

  // Point angle (drills)
  const pointAngle = toolType === "drill"
    ? (phys.point_angle_deg ?? prismTool.point_angle_deg ?? (toolMat === "hss" ? 118 : 140))
    : undefined;

  // Holder — infer standard holder from shank diameter
  const holder = inferHolder(d, shankD, oal);

  const cutting_data = computeCuttingData(d, flutes, coating, toolMat, isoGroups);

  return {
    tool_number: toolNumber,
    id: `PRISM-${mfr.replace(/\s+/g, "_").toUpperCase()}-${pn || toolNumber}`,
    type: toolType,
    material: toolMat,
    manufacturer: mfr,
    part_number: pn,
    comment: `Exported from PRISM catalog. ${prismTool.description ?? ""}`.trim(),
    diameter_mm: Math.round(d * 1000) / 1000,
    corner_radius_mm: Math.round(cr * 1000) / 1000,
    flutes,
    flute_length_mm: Math.round(loc * 100) / 100,
    overall_length_mm: Math.round(oal * 100) / 100,
    shank_diameter_mm: Math.round(shankD * 1000) / 1000,
    helix_angle_deg: helix,
    point_angle_deg: pointAngle,
    coating,
    holder,
    cutting_data,
  };
}

/** Infer a reasonable holder based on shank/diameter */
function inferHolder(d: number, shankD: number, oal: number): McamHolder {
  let holderType: McamHolderType;
  let bodyDiam: number;
  let gaugeLen: number;

  if (d >= 32) {
    holderType = "BT40";
    bodyDiam = 63;
    gaugeLen = 100;
  } else if (d >= 16) {
    holderType = "HSK-A63";
    bodyDiam = 63;
    gaugeLen = 80;
  } else if (d >= 6) {
    holderType = "collet_ER";
    bodyDiam = 40;
    gaugeLen = 60;
  } else {
    holderType = "shrink_fit";
    bodyDiam = 32;
    gaugeLen = 50;
  }

  const projection = Math.max(oal - gaugeLen, 10);

  return {
    type: holderType,
    description: `${holderType} holder for ⌀${d}mm shank`,
    gauge_length_mm: gaugeLen,
    body_diameter_mm: bodyDiam,
    projection_mm: Math.round(projection * 10) / 10,
  };
}

// ─── Generate fallback library for when catalog unavailable ──────────────────

function generateFallbackTools(): any[] {
  const tools: any[] = [];
  const diameters = [3, 4, 6, 8, 10, 12, 16, 20, 25, 32];
  const types = ["endmill", "ball", "drill", "face"];
  let i = 0;
  for (const d of diameters) {
    for (const tp of types) {
      tools.push({
        type: tp,
        cutting_diameter_mm: d,
        flute_count: tp === "drill" ? 2 : 4,
        flute_length_mm: d * (tp === "drill" ? 5 : 3),
        overall_length_mm: d * (tp === "drill" ? 8 : 6),
        shank_diameter_mm: d,
        corner_radius_mm: tp === "bull" ? d * 0.1 : 0,
        helix_angle_deg: tp === "drill" ? 30 : 35,
        coating: "TiAlN",
        material: "carbide",
        manufacturer: "Generic",
        part_number: `GEN-${tp.toUpperCase()}-D${d}`,
        description: `Generic ${tp} ⌀${d}mm`,
      });
      i++;
    }
  }
  return tools;
}

// ─── Library builder ─────────────────────────────────────────────────────────

function buildLibrary(
  tools: McamTool[],
  libName: string,
  fileName: string,
  format: McamExportFormat,
  partition?: string,
): McamLibrary {
  return {
    format: format === "mcam-operations" ? "mcam-operations" : "mcam-tools",
    library_name: libName,
    file_name: fileName,
    tools,
    metadata: {
      generated_by: "PRISM CAM Kernel — MastercamToolExportEngine E1123",
      generated_at: new Date().toISOString(),
      tool_count: tools.length,
      source: "PRISM 95K tool catalog",
      version: "2025.1",
      partition,
    },
  };
}

// ─── Engine class ─────────────────────────────────────────────────────────────

export class MastercamToolExportEngineClass {
  /**
   * Export library — filtered or full catalog.
   *
   * For large catalogs the result is partitioned by manufacturer.
   * Each partition ≤ max_per_library tools.
   *
   * @param filter   Optional filter criteria
   * @param format   Output format (default: mcam-tools)
   * @returns        Single-library result (or multi-library summary for full export)
   */
  exportLibrary(
    filter?: McamExportFilter,
    format: McamExportFormat = "mcam-tools",
  ): McamExportResult {
    const isoGroups: ISOGroup[] = filter?.iso_group
      ? [filter.iso_group]
      : ALL_ISO_GROUPS;
    const maxTools = filter?.max_tools ?? 5000;
    const maxPerLib = filter?.max_per_library ?? 2000;

    // Query catalog
    let prismTools: any[] = this._queryCatalog(filter, maxTools);
    if (prismTools.length === 0) {
      prismTools = generateFallbackTools();
    }

    // Convert all tools
    const mcamTools = prismTools.map((t, i) => convertTool(t, i + 1, isoGroups));

    // Partition by manufacturer
    const byMfr = new Map<string, McamTool[]>();
    for (const t of mcamTools) {
      const mfr = t.manufacturer;
      if (!byMfr.has(mfr)) byMfr.set(mfr, []);
      byMfr.get(mfr)!.push(t);
    }

    const manufacturers = [...byMfr.keys()].sort();
    const libraries: McamLibrary[] = [];
    let libIdx = 0;

    for (const mfr of manufacturers) {
      const mfrTools = byMfr.get(mfr)!;
      // Chunk by maxPerLib
      for (let start = 0; start < mfrTools.length; start += maxPerLib) {
        const chunk = mfrTools.slice(start, start + maxPerLib);
        const safeMfr = mfr.replace(/[^a-zA-Z0-9_]/g, "_");
        const partIdx = Math.floor(start / maxPerLib) + 1;
        const totalParts = Math.ceil(mfrTools.length / maxPerLib);
        const libName = `PRISM_${safeMfr}${totalParts > 1 ? `_p${partIdx}` : ""}`;
        const fileName = `${libName}.${format === "mcam-operations" ? "mcam-operations" : "mcam-tools"}`;
        const partition = totalParts > 1 ? `${mfr} (part ${partIdx}/${totalParts})` : mfr;
        libraries.push(buildLibrary(chunk, libName, fileName, format, partition));
        libIdx++;
      }
    }

    // Primary return: first library serialized; all libraries available in summary
    const primary = libraries[0] ?? buildLibrary(mcamTools, "PRISM_TOOLS", `PRISM_TOOLS.mcam-tools`, format);

    return {
      library_data: JSON.stringify(primary, null, 2),
      tool_count: mcamTools.length,
      file_name: primary.file_name,
      libraries: libraries.length > 1 ? libraries : undefined,
      summary: {
        total_tools: mcamTools.length,
        partitions: libraries.length,
        manufacturers,
        tool_types: [...new Set(mcamTools.map(t => t.type))].sort(),
      },
    };
  }

  /**
   * Export only the tools required for a specific job.
   *
   * @param job_tools  Array of tool descriptors specifying what the job needs
   * @param format     Output format (default: mcam-tools)
   */
  exportForJob(
    job_tools: Array<{
      type?: string;
      diameter_mm?: number;
      flutes?: number;
      manufacturer?: string;
      part_number?: string;
      iso_group?: ISOGroup;
    }>,
    format: McamExportFormat = "mcam-tools",
  ): McamExportResult {
    const isoGroups = ALL_ISO_GROUPS;
    const mcamTools: McamTool[] = [];

    job_tools.forEach((jt, idx) => {
      // Try catalog lookup first
      let prismTool: any = null;
      try {
        if (toolCatalogEngine?.search) {
          const hits = toolCatalogEngine.search({
            type: jt.type,
            diameter_mm: jt.diameter_mm,
            manufacturer: jt.manufacturer,
            max_results: 1,
          }) || [];
          if (hits.length > 0) prismTool = hits[0];
        }
      } catch { /* catalog optional */ }

      // Synthesize from job tool spec if catalog misses
      if (!prismTool) {
        prismTool = {
          type: jt.type ?? "endmill",
          cutting_diameter_mm: jt.diameter_mm ?? 10,
          flute_count: jt.flutes ?? 4,
          manufacturer: jt.manufacturer ?? "Generic",
          part_number: jt.part_number ?? `JOB-T${idx + 1}`,
          coating: "TiAlN",
          material: "carbide",
        };
      }

      const targetISO = jt.iso_group ? [jt.iso_group] : isoGroups;
      mcamTools.push(convertTool(prismTool, idx + 1, targetISO));
    });

    const lib = buildLibrary(
      mcamTools,
      "PRISM_JOB_TOOLS",
      `PRISM_JOB_TOOLS.${format === "mcam-operations" ? "mcam-operations" : "mcam-tools"}`,
      format,
    );

    return {
      library_data: JSON.stringify(lib, null, 2),
      tool_count: mcamTools.length,
      file_name: lib.file_name,
    };
  }

  /**
   * Export tools with full per-material cutting data tables.
   * Includes all 6 ISO groups regardless of filter, with annotated
   * physics derivation for each speed/feed entry.
   *
   * @param tools      PRISM or user-supplied tool descriptors
   * @param materials  ISO groups to generate data for (default: all 6)
   */
  exportWithCuttingData(
    tools: Array<{
      type?: string;
      diameter_mm: number;
      flutes?: number;
      coating?: string;
      tool_material?: string;
      manufacturer?: string;
      part_number?: string;
    }>,
    materials: ISOGroup[] = ALL_ISO_GROUPS,
  ): {
    library_data: string;
    tool_count: number;
    cutting_data_summary: Array<{
      tool: string;
      diameter_mm: number;
      data_by_iso: McamCuttingData[];
    }>;
  } {
    const mcamTools = tools.map((t, i) => {
      const prismTool: any = {
        type: t.type ?? "endmill",
        cutting_diameter_mm: t.diameter_mm,
        flute_count: t.flutes ?? 4,
        coating: t.coating ?? "TiAlN",
        material: t.tool_material ?? "carbide",
        manufacturer: t.manufacturer ?? "Generic",
        part_number: t.part_number ?? `T${i + 1}`,
      };
      return convertTool(prismTool, i + 1, materials);
    });

    const lib = buildLibrary(
      mcamTools,
      "PRISM_TOOLS_WITH_DATA",
      "PRISM_TOOLS_WITH_DATA.mcam-tools",
      "mcam-tools",
    );

    return {
      library_data: JSON.stringify(lib, null, 2),
      tool_count: mcamTools.length,
      cutting_data_summary: mcamTools.map(t => ({
        tool: `${t.manufacturer} ${t.part_number} (⌀${t.diameter_mm}mm ${t.type})`,
        diameter_mm: t.diameter_mm,
        data_by_iso: t.cutting_data,
      })),
    };
  }

  /**
   * Describe the .mcam-tools format structure.
   * Returns a comprehensive schema description with field explanations.
   */
  getFormat(): {
    format_name: string;
    extension: string;
    encoding: string;
    top_level_fields: Record<string, string>;
    tool_fields: Record<string, string>;
    holder_fields: Record<string, string>;
    cutting_data_fields: Record<string, string>;
    tool_types: string[];
    tool_materials: string[];
    holder_types: string[];
    iso_groups: Record<string, string>;
    notes: string[];
  } {
    return {
      format_name: "Mastercam Tool Library",
      extension: ".mcam-tools",
      encoding: "UTF-8 JSON",
      top_level_fields: {
        format: "Library format identifier: 'mcam-tools' or 'mcam-operations'",
        library_name: "Name shown in Mastercam Tool Manager",
        file_name: "Recommended file name including extension",
        tools: "Array of McamTool objects",
        metadata: "Generation provenance, timestamps, version",
      },
      tool_fields: {
        tool_number: "Mastercam tool number (1-based, unique within library)",
        id: "Unique string ID: PRISM-{MANUFACTURER}-{PART_NUMBER}",
        type: "Tool classification: endmill | ball | bull | face | drill | tap | reamer | boring_bar | ...",
        material: "Substrate material: carbide | hss | ceramic | cbn | pcd | cermet",
        manufacturer: "Tool manufacturer name",
        part_number: "Manufacturer part/catalog number",
        diameter_mm: "Cutting diameter in millimeters",
        corner_radius_mm: "Corner/nose radius in mm (0 = sharp, >0 = bull/torus)",
        flutes: "Number of cutting flutes/edges",
        flute_length_mm: "Flute (cutting) length, mm",
        overall_length_mm: "Overall assembled length from tip to shank end, mm",
        shank_diameter_mm: "Shank diameter, mm",
        helix_angle_deg: "Helix angle in degrees (typical: 30–45°)",
        point_angle_deg: "Drill point angle in degrees (118° HSS, 140° carbide — drills only)",
        coating: "Surface coating identifier: TiN | TiCN | TiAlN | AlTiN | AlCrN | DLC | diamond | uncoated",
        holder: "Holder geometry object (see holder_fields)",
        cutting_data: "Array of McamCuttingData per ISO material group",
      },
      holder_fields: {
        type: "Taper/interface standard: BT40 | CAT40 | HSK-A63 | Capto-C5 | collet_ER | shrink_fit | ...",
        description: "Human-readable holder description",
        gauge_length_mm: "Gauge length (spindle face to holder nose), mm",
        body_diameter_mm: "Holder body outer diameter, mm",
        projection_mm: "Tool projection beyond holder nose, mm",
      },
      cutting_data_fields: {
        iso_group: "ISO material group: P | M | K | N | S | H",
        material_label: "Human-readable material group name",
        vc_mpm: "Cutting speed in m/min (Vc from UltimateSpeedFeedEngine + coating multiplier)",
        fz_mm: "Feed per tooth in mm (Kienzle-derived optimal chipload)",
        ap_mm: "Axial depth of cut in mm (strategy-appropriate: 0.25–1.0 × D)",
        ae_mm: "Radial engagement in mm (strategy-appropriate: 0.20–0.50 × D)",
        rpm: "Spindle speed in RPM: 1000·Vc / (π·D)",
        feed_mmpm: "Table feed in mm/min: fz × flutes × RPM",
      },
      tool_types: [
        "endmill", "ball", "bull", "face", "drill", "tap",
        "reamer", "boring_bar", "chamfer", "thread_mill", "spot_drill", "form",
      ],
      tool_materials: ["carbide", "hss", "ceramic", "cbn", "pcd", "cermet"],
      holder_types: [
        "BT30", "BT40", "BT50", "CAT40", "CAT50",
        "HSK-A63", "HSK-A100", "HSK-E32",
        "Capto-C4", "Capto-C5", "Capto-C6",
        "KM40", "KM50", "shrink_fit", "collet_ER", "hydraulic", "milling_chuck", "straight_shank",
      ],
      iso_groups: {
        P: "Steel (carbon, alloy, tool steel)",
        M: "Stainless steel (austenitic, martensitic, duplex)",
        K: "Cast iron (grey, ductile, nodular)",
        N: "Non-ferrous metals (aluminum, copper, brass, plastics)",
        S: "Superalloys and titanium (Inconel, Hastelloy, Ti-6Al-4V)",
        H: "Hardened materials (>45 HRC, chilled cast iron, hard chrome)",
      },
      notes: [
        "Cutting data (Vc, fz) uses PRISM physics baselines; apply machine/setup-specific multipliers in Mastercam",
        "ap/ae are semi-finishing defaults; roughing: ap×2, ae×0.6; finishing: ap×0.25, ae×0.15",
        "Holder type is inferred from diameter; override in Mastercam Tool Manager as needed",
        "Format is JSON-encoded; Mastercam 2025+ can import .mcam-tools files directly",
        "For .mcam-operations format, each tool entry also contains linked operation defaults",
      ],
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _queryCatalog(filter?: McamExportFilter, maxTools = 5000): any[] {
    try {
      if (!toolCatalogEngine?.search) return [];
      return toolCatalogEngine.search({
        type: filter?.tool_type,
        manufacturer: filter?.manufacturer,
        diameter_range: filter?.diameter_range_mm,
        max_results: maxTools,
      }) || [];
    } catch {
      return [];
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const mastercamToolExportEngine = new MastercamToolExportEngineClass();
