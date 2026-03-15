/**
 * NLPCAMParserEngine — CK-MS12/U01
 * Parses natural language manufacturing descriptions into structured
 * CAMFeature[] interface for UnifiedCAMPipelineEngine.
 *
 * Examples:
 *   "pocket 80x50mm, 15mm deep, P20 steel, DMG DMU 50"
 *   "drill 10mm hole, 30mm deep, 304 stainless"
 *   "turn OD 50mm, 80mm long, Ti-6Al-4V"
 */

export interface ParsedCAMRequest {
  features: Array<{
    type: string;
    operation: "roughing" | "finishing" | "drilling" | "rest" | "facing";
    dimensions?: {
      length_mm?: number; width_mm?: number;
      depth_mm?: number; diameter_mm?: number;
    };
    tolerance_mm?: number;
    surface_finish_Ra?: number;
  }>;
  material?: string;
  material_iso_group?: string;
  machine_name?: string;
  confidence: number;
  parsed_tokens: string[];
}

// Feature type patterns
const FEATURE_PATTERNS: Array<{ pattern: RegExp; type: string; operation: string }> = [
  { pattern: /pocket/i, type: "pocket_rectangular", operation: "roughing" },
  { pattern: /slot/i, type: "slot", operation: "roughing" },
  { pattern: /contour|profile/i, type: "contour", operation: "finishing" },
  { pattern: /grind/i, type: "surface_grind", operation: "finishing" },
  { pattern: /face|facing/i, type: "face", operation: "facing" },
  { pattern: /drill|hole/i, type: "through_hole", operation: "drilling" },
  { pattern: /bore|boring/i, type: "bore", operation: "drilling" },
  { pattern: /tap|thread/i, type: "tapped_hole", operation: "drilling" },
  { pattern: /ream/i, type: "reaming", operation: "drilling" },
  { pattern: /turn|lathe|od|id/i, type: "od_roughing", operation: "roughing" },
  { pattern: /groov/i, type: "grooving", operation: "roughing" },
  { pattern: /part(?:ing|off)/i, type: "parting", operation: "roughing" },
  { pattern: /laser/i, type: "laser_cut", operation: "roughing" },
  { pattern: /waterjet|water.?jet/i, type: "waterjet_cut", operation: "roughing" },
  { pattern: /wire.?edm|wedm/i, type: "wire_edm_profile", operation: "roughing" },
  { pattern: /chamfer/i, type: "chamfer", operation: "finishing" },
  { pattern: /engrav/i, type: "engraving", operation: "finishing" },
  { pattern: /finish/i, type: "finishing", operation: "finishing" },
  { pattern: /rough/i, type: "pocket_rectangular", operation: "roughing" },
];

// Material patterns
const MATERIAL_PATTERNS: Array<{ pattern: RegExp; name: string; iso: string }> = [
  { pattern: /p20|1045|4140|4340|1018|a36|carbon.?steel|mild.?steel|alloy.?steel/i, name: "P20 Mold Steel", iso: "P" },
  { pattern: /304|316|17.?4|stainless|duplex|austenitic/i, name: "304 Stainless Steel", iso: "M" },
  { pattern: /cast.?iron|grey|ductile|ggg|fc\d/i, name: "Gray Cast Iron", iso: "K" },
  { pattern: /6061|7075|2024|a356|aluminum|aluminium/i, name: "6061-T6 Aluminum", iso: "N" },
  { pattern: /ti.?6al|titanium|ti-/i, name: "Ti-6Al-4V", iso: "S" },
  { pattern: /inconel|waspaloy|hastelloy|nimonic/i, name: "Inconel 718", iso: "S" },
  { pattern: /hardened|hrc|d2|h13|s7|a2|m2/i, name: "Hardened H13", iso: "H" },
  { pattern: /copper|brass|bronze/i, name: "Copper Alloy", iso: "N" },
  { pattern: /peek|nylon|delrin|acetal|plastic/i, name: "PEEK", iso: "N" },
  { pattern: /steel/i, name: "1045 Steel", iso: "P" },
];

// Dimension extraction patterns
const DIM_PATTERNS = {
  // "80x50mm" or "80 x 50 mm"
  wxh: /(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)\s*(?:mm)?/i,
  // "15mm deep" or "depth 15mm" or "15mm depth"
  depth: /(\d+\.?\d*)\s*mm\s*(?:deep|depth)|(?:depth?|deep)\s*(?:of\s*)?(\d+\.?\d*)\s*mm/i,
  // "10mm diameter" or "Ø10" or "dia 10mm"
  diameter: /(?:ø|dia(?:meter)?)\s*(\d+\.?\d*)|(\d+\.?\d*)\s*mm\s*(?:dia(?:meter)?|ø)|(\d+\.?\d*)\s*mm\s*(?:hole|drill)/i,
  // "80mm long" or "length 80mm"
  length: /(\d+\.?\d*)\s*mm\s*long|length\s*(?:of\s*)?(\d+\.?\d*)|(\d+\.?\d*)\s*mm\s*length/i,
  // "Ra 0.8" or "0.8 Ra" or "surface finish 0.8"
  ra: /ra\s*(\d+\.?\d*)|(\d+\.?\d*)\s*(?:μm|um)\s*ra|surface.?finish\s*(\d+\.?\d*)/i,
  // "±0.02" or "tolerance 0.02"
  tolerance: /[±]\s*(\d+\.?\d*)|tolerance\s*(?:of\s*)?(\d+\.?\d*)/i,
};

// Machine patterns
const MACHINE_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /dmg\s*dmu\s*(\d+)/i, name: "DMG DMU" },
  { pattern: /haas\s*(vf|st|umc|tm).?\s*(\d+)/i, name: "Haas" },
  { pattern: /mazak\s*(qt|nexus|integrex|variaxis)/i, name: "Mazak" },
  { pattern: /hermle\s*c\s*(\d+)/i, name: "Hermle C" },
  { pattern: /okuma\s*(lb|mu|genos|multus)/i, name: "Okuma" },
  { pattern: /makino\s*(d|a|f)\s*(\d+)/i, name: "Makino" },
  { pattern: /brother\s*(speedio|tc)/i, name: "Brother" },
  { pattern: /hurco\s*(vm|tmx)/i, name: "Hurco" },
];

export class NLPCAMParserEngine {
  /**
   * Parse natural language description into structured CAM request.
   */
  parse(text: string): ParsedCAMRequest {
    const tokens: string[] = [];
    let confidence = 0.5;

    // Extract feature type
    let featureType = "pocket_rectangular";
    let operation: "roughing" | "finishing" | "drilling" | "rest" | "facing" = "roughing";
    for (const fp of FEATURE_PATTERNS) {
      if (fp.pattern.test(text)) {
        featureType = fp.type;
        operation = fp.operation as any;
        tokens.push(`feature:${fp.type}`);
        confidence += 0.1;
        break;
      }
    }

    // Extract dimensions
    const dims: any = {};
    const wxhMatch = text.match(DIM_PATTERNS.wxh);
    if (wxhMatch) {
      dims.length_mm = parseFloat(wxhMatch[1]);
      dims.width_mm = parseFloat(wxhMatch[2]);
      tokens.push(`dims:${dims.length_mm}x${dims.width_mm}`);
      confidence += 0.1;
    }

    const depthMatch = text.match(DIM_PATTERNS.depth);
    if (depthMatch) {
      dims.depth_mm = parseFloat(depthMatch[1] || depthMatch[2]);
      tokens.push(`depth:${dims.depth_mm}`);
      confidence += 0.05;
    }

    const diaMatch = text.match(DIM_PATTERNS.diameter);
    if (diaMatch) {
      dims.diameter_mm = parseFloat(diaMatch[1] || diaMatch[2] || diaMatch[3]);
      tokens.push(`diameter:${dims.diameter_mm}`);
      confidence += 0.1;
    }

    const lenMatch = text.match(DIM_PATTERNS.length);
    if (lenMatch) {
      const val = parseFloat(lenMatch[1] || lenMatch[2] || lenMatch[3]);
      if (!dims.length_mm) dims.length_mm = val;
      tokens.push(`length:${val}`);
    }

    // Extract tolerances
    let tolerance: number | undefined;
    const tolMatch = text.match(DIM_PATTERNS.tolerance);
    if (tolMatch) {
      tolerance = parseFloat(tolMatch[1] || tolMatch[2]);
      tokens.push(`tolerance:${tolerance}`);
    }

    let ra: number | undefined;
    const raMatch = text.match(DIM_PATTERNS.ra);
    if (raMatch) {
      ra = parseFloat(raMatch[1] || raMatch[2] || raMatch[3]);
      tokens.push(`ra:${ra}`);
    }

    // Extract material
    let material: string | undefined;
    let iso: string | undefined;
    for (const mp of MATERIAL_PATTERNS) {
      if (mp.pattern.test(text)) {
        material = mp.name;
        iso = mp.iso;
        tokens.push(`material:${mp.name}`);
        confidence += 0.1;
        break;
      }
    }

    // Extract machine
    let machineName: string | undefined;
    for (const mp of MACHINE_PATTERNS) {
      const match = text.match(mp.pattern);
      if (match) {
        machineName = match[0];
        tokens.push(`machine:${machineName}`);
        confidence += 0.05;
        break;
      }
    }

    // Handle turning-specific dimensions
    if (/turn|od|id|lathe/i.test(text)) {
      operation = "roughing";
      if (dims.diameter_mm && !dims.length_mm) {
        // "OD 50mm, 80mm long" → diameter is OD, length is given
        const odMatch = text.match(/od\s*(\d+\.?\d*)/i);
        if (odMatch) dims.diameter_mm = parseFloat(odMatch[1]);
      }
      if (/finish/i.test(text)) operation = "finishing";
      if (/id|bore|internal/i.test(text)) featureType = "id_roughing";
    }

    return {
      features: [{
        type: featureType,
        operation,
        dimensions: Object.keys(dims).length > 0 ? dims : undefined,
        tolerance_mm: tolerance,
        surface_finish_Ra: ra,
      }],
      material,
      material_iso_group: iso as any,
      machine_name: machineName,
      confidence: Math.min(0.95, confidence),
      parsed_tokens: tokens,
    };
  }
}

export const nlpCAMParserEngine = new NLPCAMParserEngine();
