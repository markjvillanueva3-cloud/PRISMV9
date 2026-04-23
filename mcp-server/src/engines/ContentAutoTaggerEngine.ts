/**
 * ContentAutoTaggerEngine — NLP Entity Extraction for CNC Content
 *
 * Extracts manufacturing-relevant entities from raw text:
 * - Materials (ISO group, alloy names, hardness)
 * - Operations (milling, turning, drilling, grinding...)
 * - Machines (brands, models, controller types)
 * - Tools (types, diameters, coatings)
 * - Controllers (Fanuc, Siemens, Haas...)
 * - Speeds/feeds (RPM, feed rate, cutting speed)
 *
 * Uses fuzzy matching against PRISM's registries (2,957 materials,
 * 910 machines, 95,608 tools) for entity resolution.
 *
 * @milestone LEARN-MS0 U-LEARN02
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TagResult {
  materials: MaterialTag[];
  operations: OperationTag[];
  machines: MachineTag[];
  tools: ToolTag[];
  controllers: ControllerTag[];
  parameters: ParameterTag[];
  confidence: number;
  raw_text_length: number;
}

export interface MaterialTag {
  name: string;
  iso_group: string;
  confidence: number;
  match_span: [number, number];
}

export interface OperationTag {
  type: string;
  confidence: number;
  match_span: [number, number];
}

export interface MachineTag {
  brand: string;
  model?: string;
  confidence: number;
  match_span: [number, number];
}

export interface ToolTag {
  type: string;
  diameter_mm?: number;
  material?: string;
  confidence: number;
  match_span: [number, number];
}

export interface ControllerTag {
  name: string;
  family: string;
  confidence: number;
  match_span: [number, number];
}

export interface ParameterTag {
  type: "rpm" | "feed" | "cutting_speed" | "depth" | "width" | "hardness" | "temperature";
  value: number;
  unit: string;
  confidence: number;
  match_span: [number, number];
}

// ============================================================================
// LOOKUP TABLES (fuzzy match targets)
// ============================================================================

const MATERIAL_PATTERNS: Array<{ pattern: RegExp; name: string; iso_group: string }> = [
  // ISO P — Steel
  { pattern: /\b(1018|1020|1045|4130|4140|4340|8620|A36|1080|1095)\b/i, name: "$1 Steel", iso_group: "P" },
  { pattern: /\b(mild\s+steel|carbon\s+steel|alloy\s+steel|tool\s+steel|steel)\b/i, name: "Steel", iso_group: "P" },
  { pattern: /\bA2\s+tool\s+steel\b/i, name: "A2 Tool Steel", iso_group: "P" },
  { pattern: /\bD2\b(?:\s+(?:tool\s+)?steel)?/i, name: "D2 Tool Steel", iso_group: "P" },
  { pattern: /\bH13\b/i, name: "H13 Tool Steel", iso_group: "P" },
  { pattern: /\bS7\b(?:\s+(?:tool\s+)?steel)?/i, name: "S7 Tool Steel", iso_group: "P" },
  // ISO M — Stainless
  { pattern: /\b(303|304|316|316L|17-4|17-4\s*PH|410|420|440C)\b/i, name: "$1 Stainless", iso_group: "M" },
  { pattern: /\b(stainless\s+steel|stainless|inox)\b/i, name: "Stainless Steel", iso_group: "M" },
  // ISO K — Cast Iron
  { pattern: /\b(cast\s+iron|ductile\s+iron|gray\s+iron|grey\s+iron|nodular\s+iron)\b/i, name: "Cast Iron", iso_group: "K" },
  { pattern: /\b(GG\d+|GGG\d+|FC\d+)\b/i, name: "$1 Cast Iron", iso_group: "K" },
  // ISO N — Non-ferrous
  { pattern: /\b(6061|7075|2024|5052|6082|7050)\b(?:\s*-?\s*T\d+)?/i, name: "$1 Aluminum", iso_group: "N" },
  { pattern: /\b(aluminum|aluminium)\b/i, name: "Aluminum", iso_group: "N" },
  { pattern: /\b(brass|bronze|copper)\b/i, name: "$1", iso_group: "N" },
  // ISO S — Superalloy
  { pattern: /\b(inconel|hastelloy|waspaloy|monel|nimonic|rene)\s*(\d+)?\b/i, name: "$1 $2", iso_group: "S" },
  { pattern: /\b(titanium|ti-?6al-?4v|ti\s*6-4|grade\s*5\s*titanium)\b/i, name: "Titanium", iso_group: "S" },
  // ISO H — Hardened
  { pattern: /\bhardened\s+steel\b/i, name: "Hardened Steel", iso_group: "H" },
  { pattern: /\b(\d{2,3})\s*(?:HRC|Rockwell\s*C)\b/i, name: "Hardened ($1 HRC)", iso_group: "H" },
  // Plastics/composites
  { pattern: /\b(delrin|acetal|nylon|peek|ultem|polycarbonate|acrylic|abs|pom|ptfe|teflon)\b/i, name: "$1", iso_group: "N" },
  { pattern: /\b(carbon\s+fiber|cfrp|gfrp|fiberglass|composite)\b/i, name: "$1", iso_group: "N" },
];

const OPERATION_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(face\s*mill|facing|face\s+cut)\b/i, type: "face_milling" },
  { pattern: /\b(slot|slotting)\b/i, type: "slotting" },
  { pattern: /\b(pocket|pocketing)\b/i, type: "pocketing" },
  { pattern: /\b(profile|profiling|contour|contouring)\b/i, type: "profiling" },
  { pattern: /\b(rough|roughing)\b/i, type: "roughing" },
  { pattern: /\b(finish|finishing)\b/i, type: "finishing" },
  { pattern: /\b(drill|drilling|hole\s*making)\b/i, type: "drilling" },
  { pattern: /\b(tap|tapping)\b/i, type: "tapping" },
  { pattern: /\b(ream|reaming)\b/i, type: "reaming" },
  { pattern: /\b(bore|boring)\b/i, type: "boring" },
  { pattern: /\b(thread|threading)\b/i, type: "threading" },
  { pattern: /\b(turn|turning|lathe)\b/i, type: "turning" },
  { pattern: /\b(grind|grinding)\b/i, type: "grinding" },
  { pattern: /\b(mill|milling)\b/i, type: "milling" },
  { pattern: /\b(engrave|engraving)\b/i, type: "engraving" },
  { pattern: /\b(chamfer|chamfering|deburr|deburring)\b/i, type: "chamfering" },
  { pattern: /\b(plunge|plunging)\b/i, type: "plunge_milling" },
  { pattern: /\b(ramp|ramping)\b/i, type: "ramping" },
  { pattern: /\b(HSM|high\s*speed\s*machining|high.speed)\b/i, type: "hsm" },
  { pattern: /\b(adaptive|trochoidal)\b/i, type: "adaptive_milling" },
  { pattern: /\b(5[\s-]*axis|five[\s-]*axis|simultaneous|swarf)\b/i, type: "5_axis" },
  { pattern: /\b(EDM|wire\s*EDM|sinker\s*EDM|electrical\s*discharge)\b/i, type: "edm" },
  { pattern: /\b(laser\s*cut|waterjet|plasma\s*cut)\b/i, type: "non_traditional" },
];

const MACHINE_BRAND_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /\b(Haas)\b/i, brand: "Haas" },
  { pattern: /\b(DMG\s*Mori|DMG|Mori\s*Seiki)\b/i, brand: "DMG Mori" },
  { pattern: /\b(Mazak|Mazatrol)\b/i, brand: "Mazak" },
  { pattern: /\b(Okuma)\b/i, brand: "Okuma" },
  { pattern: /\b(Makino)\b/i, brand: "Makino" },
  { pattern: /\b(Doosan|DN\s*Solutions)\b/i, brand: "Doosan" },
  { pattern: /\b(Hurco)\b/i, brand: "Hurco" },
  { pattern: /\b(Brother)\b/i, brand: "Brother" },
  { pattern: /\b(Citizen)\b/i, brand: "Citizen" },
  { pattern: /\b(Star)\b/i, brand: "Star" },
  { pattern: /\b(Tsugami)\b/i, brand: "Tsugami" },
  { pattern: /\b(Fanuc\s*Robo\s*Drill|RoboDrill)\b/i, brand: "Fanuc" },
  { pattern: /\b(Matsuura)\b/i, brand: "Matsuura" },
  { pattern: /\b(Kitamura)\b/i, brand: "Kitamura" },
  { pattern: /\b(Toyoda)\b/i, brand: "Toyoda" },
  { pattern: /\b(Hardinge)\b/i, brand: "Hardinge" },
  { pattern: /\b(Sodick)\b/i, brand: "Sodick" },
  { pattern: /\b(Mitsubishi)\b(?!\s*carbide)/i, brand: "Mitsubishi" },
  { pattern: /\b(Nakamura[\s-]?Tome)\b/i, brand: "Nakamura-Tome" },
];

const MACHINE_MODEL_PATTERNS: Array<{ pattern: RegExp; brand: string; model: string }> = [
  { pattern: /\bVF[\s-]?([1-9](?:SS)?)\b/i, brand: "Haas", model: "VF-$1" },
  { pattern: /\bUMC[\s-]?(500|750|1000|1500)\b/i, brand: "Haas", model: "UMC-$1" },
  { pattern: /\bST[\s-]?(10|15|20|25|30|35)\b/i, brand: "Haas", model: "ST-$1" },
  { pattern: /\bDMU[\s-]?(40|50|60|65|80|100|125)\b/i, brand: "DMG Mori", model: "DMU-$1" },
  { pattern: /\bVCN[\s-]?(430|530|700)\b/i, brand: "Mazak", model: "VCN-$1" },
  { pattern: /\bMB[\s-]?(46|56|66|5000|8000)\w*\b/i, brand: "Okuma", model: "MB-$1" },
  { pattern: /\bSpeedio\b/i, brand: "Brother", model: "Speedio" },
];

const CONTROLLER_PATTERNS: Array<{ pattern: RegExp; name: string; family: string }> = [
  { pattern: /\b(Fanuc|FANUC)\s*(0i|0-i|16i|18i|30i|31i|35i)?\b/i, name: "Fanuc $2", family: "fanuc" },
  { pattern: /\b(Siemens|SINUMERIK)\s*(810|828|840|ONE)?\s*[Dd]?\b/i, name: "Siemens $2", family: "siemens" },
  { pattern: /\b(Heidenhain|TNC)\s*(530|620|640|7)?\b/i, name: "Heidenhain $2", family: "heidenhain" },
  { pattern: /\b(Mazatrol)\s*(Matrix|Smooth|SmoothAi|SmoothG)?\b/i, name: "Mazatrol $2", family: "mazak" },
  { pattern: /\b(OSP[\s-]?P?\s*(200|300|500))\b/i, name: "Okuma $1", family: "okuma" },
  { pattern: /\b(Haas\s*NGC|Next\s*Gen(?:eration)?\s*Control)\b/i, name: "Haas NGC", family: "haas" },
  { pattern: /\b(LinuxCNC|Mach[34]|GRBL|grbl)\b/i, name: "$1", family: "generic" },
];

const TOOL_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(end\s*mill|endmill)\b/i, type: "endmill" },
  { pattern: /\b(bull\s*nose|corner\s*radius|bull\s*mill)\b/i, type: "bull_nose_endmill" },
  { pattern: /\b(ball\s*(?:end\s*)?mill|ball\s*nose)\b/i, type: "ball_endmill" },
  { pattern: /\b(face\s*mill|facemill|shell\s*mill)\b/i, type: "face_mill" },
  { pattern: /\b(insert|indexable)\b/i, type: "indexable_insert" },
  { pattern: /\b(drill\s*bit|twist\s*drill|drill)\b/i, type: "drill" },
  { pattern: /\b(tap|tapping\s*tool)\b/i, type: "tap" },
  { pattern: /\b(reamer)\b/i, type: "reamer" },
  { pattern: /\b(boring\s*bar)\b/i, type: "boring_bar" },
  { pattern: /\b(spot\s*drill|center\s*drill)\b/i, type: "spot_drill" },
  { pattern: /\b(chamfer\s*(?:mill|tool))\b/i, type: "chamfer_mill" },
  { pattern: /\b(thread\s*mill)\b/i, type: "thread_mill" },
  { pattern: /\b(fly\s*cutter)\b/i, type: "fly_cutter" },
  { pattern: /\b(roughing\s*(?:end\s*)?mill|corncob)\b/i, type: "roughing_endmill" },
  { pattern: /\b(T[\s-]?slot\s*cutter)\b/i, type: "t_slot_cutter" },
];

const PARAMETER_PATTERNS: Array<{ pattern: RegExp; type: ParameterTag["type"]; unit: string; group: number }> = [
  { pattern: /\b(\d{2,5})\s*(?:RPM|rpm|rev\/min)\b/, type: "rpm", unit: "rpm", group: 1 },
  { pattern: /\bS\s*(\d{2,5})\b/, type: "rpm", unit: "rpm", group: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:mm\/min|mm\/rev|ipm|ipr|IPM|IPR)\b/, type: "feed", unit: "mm/min", group: 1 },
  { pattern: /\bF\s*(\d+(?:\.\d+)?)\b/, type: "feed", unit: "mm/min", group: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:m\/min|SFM|sfm|ft\/min)\b/, type: "cutting_speed", unit: "m/min", group: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:mm|")\s*(?:DOC|depth\s+of\s+cut|axial\s+depth|ap)\b/i, type: "depth", unit: "mm", group: 1 },
  { pattern: /\b(?:DOC|depth|ap)\s*(?:=|:|\s)\s*(\d+(?:\.\d+)?)\s*mm\b/i, type: "depth", unit: "mm", group: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:mm|")\s*(?:WOC|stepover|radial\s+depth|ae)\b/i, type: "width", unit: "mm", group: 1 },
  { pattern: /\b(?:ae|stepover|WOC)\s*(?:=|:|\s)\s*(\d+(?:\.\d+)?)\s*mm\b/i, type: "width", unit: "mm", group: 1 },
  { pattern: /\b(\d{1,3})\s*(?:HRC|Rockwell\s*C)\b/i, type: "hardness", unit: "HRC", group: 1 },
  { pattern: /\b(\d{2,3})\s*(?:HB|Brinell)\b/i, type: "hardness", unit: "HB", group: 1 },
];

const TOOL_DIAMETER_PATTERN = /\b(\d+(?:\.\d+)?)\s*(?:mm|")\s*(?:end\s*mill|endmill|drill|reamer|tap|ball|bull|tool|cutter|dia(?:meter)?)\b/i;
const TOOL_DIAMETER_ALT = /\b(?:end\s*mill|endmill|drill|reamer|tap|tool|cutter|dia(?:meter)?)\s*(?:=|:|\s)\s*(\d+(?:\.\d+)?)\s*(?:mm|")\b/i;

// ============================================================================
// ENGINE
// ============================================================================

class ContentAutoTaggerEngineImpl {

  /**
   * Extract manufacturing-relevant tags from raw text.
   */
  tag(text: string): TagResult {
    if (!text || text.trim().length === 0) {
      return { materials: [], operations: [], machines: [], tools: [], controllers: [], parameters: [], confidence: 0, raw_text_length: 0 };
    }

    const materials = this._extractMaterials(text);
    const operations = this._extractOperations(text);
    const machines = this._extractMachines(text);
    const tools = this._extractTools(text);
    const controllers = this._extractControllers(text);
    const parameters = this._extractParameters(text);

    const totalTags = materials.length + operations.length + machines.length + tools.length + controllers.length + parameters.length;
    const confidence = totalTags === 0 ? 0 : Math.min(100, 30 + totalTags * 10);

    return { materials, operations, machines, tools, controllers, parameters, confidence, raw_text_length: text.length };
  }

  /**
   * Generate a flat list of tag strings for storage in TribalKnowledgeEngine.
   */
  toFlatTags(result: TagResult): string[] {
    const tags: string[] = [];
    for (const m of result.materials) tags.push(`material:${m.iso_group}`, `material:${m.name}`);
    for (const o of result.operations) tags.push(`operation:${o.type}`);
    for (const m of result.machines) tags.push(`machine:${m.brand}`);
    for (const t of result.tools) tags.push(`tool:${t.type}`);
    for (const c of result.controllers) tags.push(`controller:${c.family}`);
    return [...new Set(tags)];
  }

  /**
   * Infer a KnowledgeCategory from tags.
   */
  inferCategory(result: TagResult): string {
    if (result.parameters.some(p => p.type === "rpm" || p.type === "feed" || p.type === "cutting_speed")) return "speeds_feeds";
    if (result.operations.some(o => o.type === "threading" || o.type === "tapping")) return "thread";
    if (result.tools.length > 0) return "tooling";
    if (result.operations.some(o => o.type === "grinding" || o.type === "edm" || o.type === "non_traditional")) return "process_engineering";
    if (result.operations.length > 0) return "setup";
    if (result.materials.length > 0) return "materials_science";
    return "troubleshooting";
  }

  // ── Private extractors ──

  private _extractMaterials(text: string): MaterialTag[] {
    const results: MaterialTag[] = [];
    for (const { pattern, name, iso_group } of MATERIAL_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        const resolved = name.replace("$1", match[1] || "").replace("$2", match[2] || "").trim();
        results.push({
          name: resolved,
          iso_group,
          confidence: match[1] && /\d/.test(match[1]) ? 90 : 70,
          match_span: [match.index, match.index + match[0].length],
        });
      }
    }
    return this._dedup(results, r => r.iso_group + ":" + r.name);
  }

  private _extractOperations(text: string): OperationTag[] {
    const results: OperationTag[] = [];
    for (const { pattern, type } of OPERATION_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        results.push({ type, confidence: 85, match_span: [match.index, match.index + match[0].length] });
      }
    }
    return this._dedup(results, r => r.type);
  }

  private _extractMachines(text: string): MachineTag[] {
    const results: MachineTag[] = [];
    // Check specific models first
    for (const { pattern, brand, model } of MACHINE_MODEL_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        const resolvedModel = model.replace("$1", match[1] || "").trim();
        results.push({ brand, model: resolvedModel, confidence: 95, match_span: [match.index, match.index + match[0].length] });
      }
    }
    // Then brands
    for (const { pattern, brand } of MACHINE_BRAND_PATTERNS) {
      const match = pattern.exec(text);
      if (match && !results.some(r => r.brand === brand)) {
        results.push({ brand, confidence: 80, match_span: [match.index, match.index + match[0].length] });
      }
    }
    return results;
  }

  private _extractTools(text: string): ToolTag[] {
    const results: ToolTag[] = [];
    for (const { pattern, type } of TOOL_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        results.push({ type, confidence: 85, match_span: [match.index, match.index + match[0].length] });
      }
    }
    // Extract diameter
    const diaMatch = TOOL_DIAMETER_PATTERN.exec(text) || TOOL_DIAMETER_ALT.exec(text);
    if (diaMatch) {
      const dia = parseFloat(diaMatch[1]);
      if (dia > 0 && dia < 100) {
        if (results.length > 0) {
          results[0].diameter_mm = dia;
        } else {
          results.push({ type: "unknown", diameter_mm: dia, confidence: 70, match_span: [diaMatch.index, diaMatch.index + diaMatch[0].length] });
        }
      }
    }
    // Detect tool material (carbide, HSS, ceramic, CBN, PCD)
    const coatingMatch = /\b(carbide|HSS|high[\s-]?speed\s+steel|ceramic|CBN|PCD|cermet|diamond)\b/i.exec(text);
    if (coatingMatch && results.length > 0) {
      results[0].material = coatingMatch[1].toLowerCase();
    }
    return this._dedup(results, r => r.type);
  }

  private _extractControllers(text: string): ControllerTag[] {
    const results: ControllerTag[] = [];
    for (const { pattern, name, family } of CONTROLLER_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        const resolved = name.replace("$1", match[1] || "").replace("$2", match[2] || "").trim();
        results.push({ name: resolved, family, confidence: 90, match_span: [match.index, match.index + match[0].length] });
      }
    }
    return this._dedup(results, r => r.family);
  }

  private _extractParameters(text: string): ParameterTag[] {
    const results: ParameterTag[] = [];
    for (const { pattern, type, unit, group } of PARAMETER_PATTERNS) {
      const match = pattern.exec(text);
      if (match && match[group]) {
        const value = parseFloat(match[group]);
        if (!isNaN(value) && value > 0) {
          results.push({ type, value, unit, confidence: 85, match_span: [match.index, match.index + match[0].length] });
        }
      }
    }
    return results;
  }

  private _dedup<T>(items: T[], key: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const k = key(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
}

export const contentAutoTaggerEngine = new ContentAutoTaggerEngineImpl();
