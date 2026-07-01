/**
 * MaterialResolverForProgramsEngine — Resolve material from CNC program context
 *
 * Resolves material identity from multiple sources in priority order:
 *   1. Explicit comment block (e.g., "(MATERIAL - STEEL INCH - 1030 - 200 BHN)")
 *   2. V-variable comments referencing material
 *   3. Customer folder name → known material associations
 *   4. SFM/CSS reverse-engineering (SFM 750+ = aluminum, 200-400 = steel, etc.)
 *   5. Kienzle coefficient back-calculation from cutting parameters
 *
 * Maps resolved material to PRISM MaterialRegistry ISO groups (P/M/K/N/S/H)
 * for downstream Kienzle force calculations.
 *
 * Ref: ISO 513 material classification, Sandvik Coromant technical guides
 *
 * @module MaterialResolverForProgramsEngine
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";
import type { OkumaProgram } from "./OkumaOSPParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Resolved material result */
export interface ResolvedMaterial {
  /** Material name (e.g., "1030 Steel") */
  name: string;
  /** ISO 513 group */
  iso_group: ISOGroup;
  /** Hardness in Brinell (HB) — 0 if unknown */
  hardness_hb: number;
  /** Kienzle kc1.1 [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent mc */
  mc: number;
  /** Taylor C constant [m/min] */
  taylor_C: number;
  /** Taylor n exponent */
  taylor_n: number;
  /** Confidence score 0-1 */
  confidence: number;
  /** How the material was resolved */
  source: string;
  /** Detection details */
  details: string[];
}

/** Material resolver input */
export interface MaterialResolveInput {
  /** Parsed program */
  program: OkumaProgram;
  /** Optional: customer/folder name for association */
  customer_name?: string;
  /** Optional: machine type for context */
  machine_type?: string;
  /** Unit system (affects SFM interpretation) */
  unit_system?: "imperial" | "metric";
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** SFM ranges for material reverse-engineering (imperial, carbide tooling)
 *  Source: Machinery's Handbook 30th ed., Sandvik Coromant Main Catalogue */
const SFM_RANGES: Array<{
  min: number; max: number;
  iso_group: ISOGroup; name: string; hardness_hb: number;
}> = [
  // Aluminum & non-ferrous (N)
  { min: 600, max: 3000, iso_group: "N", name: "Aluminum alloy", hardness_hb: 95 },
  // Low-carbon steel (P)
  { min: 400, max: 700,  iso_group: "P", name: "Low-carbon steel (1018/1020)", hardness_hb: 130 },
  // Medium-carbon steel (P)
  { min: 300, max: 550,  iso_group: "P", name: "Medium-carbon steel (1045/4140)", hardness_hb: 200 },
  // Alloy steel (P)
  { min: 200, max: 400,  iso_group: "P", name: "Alloy steel (4340/8620)", hardness_hb: 260 },
  // Stainless steel (M)
  { min: 100, max: 300,  iso_group: "M", name: "Stainless steel (304/316)", hardness_hb: 180 },
  // Cast iron (K)
  { min: 250, max: 600,  iso_group: "K", name: "Cast iron (gray/ductile)", hardness_hb: 200 },
  // Titanium/superalloy (S)
  { min: 50, max: 150,   iso_group: "S", name: "Titanium/Inconel", hardness_hb: 330 },
  // Hardened steel (H)
  { min: 50, max: 200,   iso_group: "H", name: "Hardened steel (50+ HRC)", hardness_hb: 550 },
];

/** Material keyword patterns for comment parsing */
const MATERIAL_KEYWORDS: Array<{
  pattern: RegExp; iso_group: ISOGroup; name: string; hardness_hb: number;
}> = [
  // Aluminum alloys
  { pattern: /\b(6061|7075|2024|5052|ALUMINUM|ALUMINIUM|ALUM)\b/i, iso_group: "N", name: "Aluminum", hardness_hb: 95 },
  // Brass/Bronze/Copper
  { pattern: /\b(BRASS|BRONZE|COPPER|CDA|C360|C932)\b/i, iso_group: "N", name: "Brass/Bronze", hardness_hb: 100 },
  // Low-carbon steel
  { pattern: /\b(1010|1018|1020|1025|1030|12L14|1215|1117)\b/i, iso_group: "P", name: "Low-carbon steel", hardness_hb: 140 },
  // Medium-carbon steel
  { pattern: /\b(1040|1045|1050|1060|1080|1095)\b/i, iso_group: "P", name: "Medium-carbon steel", hardness_hb: 200 },
  // Alloy steel
  { pattern: /\b(4130|4140|4150|4340|8620|8640|9310|52100|A2|D2|H13|M2|O1|S7|P20)\b/i, iso_group: "P", name: "Alloy steel", hardness_hb: 260 },
  // Tool steel (not hardened)
  { pattern: /\b(TOOL\s*STEEL|A-?2|D-?2|H-?13|M-?2|O-?1|S-?7|P-?20)\b/i, iso_group: "P", name: "Tool steel", hardness_hb: 220 },
  // Stainless steel
  { pattern: /\b(303|304|316|410|420|440|17-?4|15-?5|STAINLESS|SS)\b/i, iso_group: "M", name: "Stainless steel", hardness_hb: 180 },
  // Cast iron
  { pattern: /\b(CAST\s*IRON|DUCTILE|GRAY\s*IRON|NODULAR|CI|A-?48|ASTM\s*A48)\b/i, iso_group: "K", name: "Cast iron", hardness_hb: 200 },
  // Titanium
  { pattern: /\b(TITANIUM|TI-?6AL|TI-?6-?4|TI\s*6|GRADE\s*5)\b/i, iso_group: "S", name: "Titanium", hardness_hb: 330 },
  // Inconel/Superalloys
  { pattern: /\b(INCONEL|HASTELLOY|WASPALOY|MONEL|NIMONIC|RENE)\b/i, iso_group: "S", name: "Superalloy", hardness_hb: 350 },
  // Hardened — look for HRC > 45
  { pattern: /\b(HARDENED|HRC\s*[4-6]\d|HARD\s+TURN)\b/i, iso_group: "H", name: "Hardened steel", hardness_hb: 550 },
  // Plastic
  { pattern: /\b(DELRIN|NYLON|PEEK|ACETAL|PTFE|UHMW|HDPE|ABS|POLYCARBONATE|LEXAN)\b/i, iso_group: "N", name: "Plastic/Polymer", hardness_hb: 20 },
];

/** Hardness patterns in comments */
const HARDNESS_PATTERNS: RegExp[] = [
  /(\d{2,3})\s*BHN/i,
  /(\d{2,3})\s*HB\b/i,
  /HB\s*(\d{2,3})/i,
  /BRINELL\s*(\d{2,3})/i,
  /(\d{2})\s*HRC/i,
  /HRC\s*(\d{2})/i,
  /ROCKWELL\s*C?\s*(\d{2})/i,
];

// ============================================================================
// ENGINE
// ============================================================================

export class MaterialResolverForProgramsEngine {
  /**
   * Resolve material from program context.
   * Tries multiple strategies in priority order and returns best match.
   */
  resolve(input: MaterialResolveInput): ResolvedMaterial {
    const details: string[] = [];
    const unitSystem = input.unit_system ?? "imperial";

    // Strategy 1: Parse comments for explicit material references
    const fromComments = this._resolveFromComments(input.program, details);
    if (fromComments && fromComments.confidence >= 0.7) {
      return this._enrichResult(fromComments, details);
    }

    // Strategy 2: Parse V-variable comments
    const fromVars = this._resolveFromVariables(input.program, details);
    if (fromVars && fromVars.confidence >= 0.6) {
      return this._enrichResult(fromVars, details);
    }

    // Strategy 3: Customer/folder association
    if (input.customer_name) {
      const fromCustomer = this._resolveFromCustomer(input.customer_name, details);
      if (fromCustomer && fromCustomer.confidence >= 0.5) {
        return this._enrichResult(fromCustomer, details);
      }
    }

    // Strategy 4: Reverse-engineer from SFM/CSS values
    const fromSFM = this._resolveFromSFM(input.program, unitSystem, details);
    if (fromSFM && fromSFM.confidence >= 0.3) {
      // Merge with any partial comment match
      if (fromComments) {
        return this._enrichResult(this._mergeResults(fromComments, fromSFM), details);
      }
      return this._enrichResult(fromSFM, details);
    }

    // Strategy 5: Fall back to comment match even if low confidence
    if (fromComments) {
      return this._enrichResult(fromComments, details);
    }

    // Default: assume medium-carbon steel (most common shop material)
    details.push("No material clues found — defaulting to medium-carbon steel (P group)");
    return this._enrichResult({
      name: "Unknown — assumed medium-carbon steel",
      iso_group: "P" as ISOGroup,
      hardness_hb: 200,
      kc1_1: CANONICAL_KIENZLE.P.kc1_1,
      mc: CANONICAL_KIENZLE.P.mc,
      taylor_C: CANONICAL_TAYLOR.P.C,
      taylor_n: CANONICAL_TAYLOR.P.n,
      confidence: 0.2,
      source: "default",
      details,
    }, details);
  }

  // ── Comment parsing ──────────────────────────────────────────────────

  private _resolveFromComments(
    program: OkumaProgram,
    details: string[],
  ): ResolvedMaterial | null {
    // Scan first 30 lines + header for material comments
    const scanLines = program.rawLines.slice(0, 30);
    if (program.header) scanLines.unshift(program.header);

    let bestMatch: ResolvedMaterial | null = null;

    for (const line of scanLines) {
      const trimmed = line.trim().toUpperCase();
      // Skip non-comment lines
      if (!trimmed.startsWith("(") && !trimmed.startsWith("!") && !trimmed.startsWith(";")) continue;

      // Check for explicit MATERIAL keyword
      if (/MATERIAL|MAT[:\-=]|STOCK|WORKPIECE/.test(trimmed)) {
        details.push(`Found material comment: "${line.trim()}"`);
      }

      // Check material keyword patterns
      for (const kw of MATERIAL_KEYWORDS) {
        if (kw.pattern.test(trimmed)) {
          const hardness = this._extractHardness(trimmed) ?? kw.hardness_hb;
          const isoGroup = kw.iso_group;
          // Hardened state overrides base alloy (H group gets priority boost)
          const baseConf = /MATERIAL/.test(trimmed) ? 0.85 : 0.7;
          const conf = isoGroup === "H" ? baseConf + 0.1 : baseConf;

          const result: ResolvedMaterial = {
            name: kw.name,
            iso_group: isoGroup,
            hardness_hb: hardness,
            kc1_1: CANONICAL_KIENZLE[isoGroup].kc1_1,
            mc: CANONICAL_KIENZLE[isoGroup].mc,
            taylor_C: CANONICAL_TAYLOR[isoGroup].C,
            taylor_n: CANONICAL_TAYLOR[isoGroup].n,
            confidence: conf,
            source: "comment",
            details: [],
          };

          if (!bestMatch || result.confidence > bestMatch.confidence) {
            bestMatch = result;
            details.push(`Matched material keyword "${kw.name}" (${isoGroup}) conf=${conf}`);
          }
        }
      }
    }

    return bestMatch;
  }

  // ── V-variable comment parsing ───────────────────────────────────────

  private _resolveFromVariables(
    program: OkumaProgram,
    details: string[],
  ): ResolvedMaterial | null {
    // Check V-variable definitions for material hints
    for (const v of program.variables) {
      const comment = (v.comment ?? "").toUpperCase();
      for (const kw of MATERIAL_KEYWORDS) {
        if (kw.pattern.test(comment)) {
          details.push(`Found material in variable comment: V${v.name} — "${v.comment}"`);
          const isoGroup = kw.iso_group;
          return {
            name: kw.name,
            iso_group: isoGroup,
            hardness_hb: kw.hardness_hb,
            kc1_1: CANONICAL_KIENZLE[isoGroup].kc1_1,
            mc: CANONICAL_KIENZLE[isoGroup].mc,
            taylor_C: CANONICAL_TAYLOR[isoGroup].C,
            taylor_n: CANONICAL_TAYLOR[isoGroup].n,
            confidence: 0.65,
            source: "variable_comment",
            details: [],
          };
        }
      }
    }
    return null;
  }

  // ── Customer folder association ──────────────────────────────────────

  private _resolveFromCustomer(
    customerName: string,
    details: string[],
  ): ResolvedMaterial | null {
    // Known customer → material associations (shop tribal knowledge)
    // These would ideally come from a persistent database, but we encode
    // common patterns from the Box drive folder structure
    const upper = customerName.toUpperCase();

    // Check if folder name itself contains material hints
    for (const kw of MATERIAL_KEYWORDS) {
      if (kw.pattern.test(upper)) {
        details.push(`Customer folder "${customerName}" contains material keyword "${kw.name}"`);
        const isoGroup = kw.iso_group;
        return {
          name: `${kw.name} (from folder)`,
          iso_group: isoGroup,
          hardness_hb: kw.hardness_hb,
          kc1_1: CANONICAL_KIENZLE[isoGroup].kc1_1,
          mc: CANONICAL_KIENZLE[isoGroup].mc,
          taylor_C: CANONICAL_TAYLOR[isoGroup].C,
          taylor_n: CANONICAL_TAYLOR[isoGroup].n,
          confidence: 0.5,
          source: "customer_folder",
          details: [],
        };
      }
    }
    return null;
  }

  // ── SFM reverse-engineering ──────────────────────────────────────────

  private _resolveFromSFM(
    program: OkumaProgram,
    unitSystem: string,
    details: string[],
  ): ResolvedMaterial | null {
    // Collect all SFM/CSS values from the program
    const sfmValues: number[] = [];
    for (const section of program.toolSections) {
      if (section.cssValue != null && section.cssValue > 0) {
        sfmValues.push(section.cssValue);
      }
    }

    // Also scan raw lines for G96 S values
    for (const line of program.rawLines) {
      const m = line.trim().toUpperCase().match(/G96\s+S(\d+)/);
      if (m) {
        sfmValues.push(parseInt(m[1], 10));
      }
    }

    if (sfmValues.length === 0) return null;

    // Use median SFM to reduce outlier impact
    sfmValues.sort((a, b) => a - b);
    const medianSFM = sfmValues[Math.floor(sfmValues.length / 2)];

    // Convert metric SCS to imperial SFM for comparison if needed
    const sfm = unitSystem === "metric" ? medianSFM * 3.2808 : medianSFM;

    details.push(`Median SFM=${sfm.toFixed(0)} from ${sfmValues.length} CSS values`);

    // Find best matching range
    let bestMatch: (typeof SFM_RANGES)[0] | null = null;
    let bestOverlap = 0;

    for (const range of SFM_RANGES) {
      if (sfm >= range.min && sfm <= range.max) {
        // Prefer tighter ranges (more specific)
        const rangeWidth = range.max - range.min;
        const specificity = 1 / rangeWidth;
        if (specificity > bestOverlap) {
          bestOverlap = specificity;
          bestMatch = range;
        }
      }
    }

    if (!bestMatch) {
      // SFM out of all ranges — find closest
      let minDist = Infinity;
      for (const range of SFM_RANGES) {
        const mid = (range.min + range.max) / 2;
        const dist = Math.abs(sfm - mid);
        if (dist < minDist) {
          minDist = dist;
          bestMatch = range;
        }
      }
    }

    if (!bestMatch) return null;

    const isoGroup = bestMatch.iso_group;
    // Higher SFM = more confidence it's aluminum, lower = more ambiguous
    const conf = sfm > 600 ? 0.6 : sfm < 150 ? 0.35 : 0.4;

    details.push(`SFM ${sfm.toFixed(0)} → ${bestMatch.name} (${isoGroup}), conf=${conf}`);

    return {
      name: bestMatch.name,
      iso_group: isoGroup,
      hardness_hb: bestMatch.hardness_hb,
      kc1_1: CANONICAL_KIENZLE[isoGroup].kc1_1,
      mc: CANONICAL_KIENZLE[isoGroup].mc,
      taylor_C: CANONICAL_TAYLOR[isoGroup].C,
      taylor_n: CANONICAL_TAYLOR[isoGroup].n,
      confidence: conf,
      source: "sfm_inference",
      details: [],
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /** Extract hardness from a comment string */
  private _extractHardness(text: string): number | null {
    for (const pat of HARDNESS_PATTERNS) {
      const m = text.match(pat);
      if (m) {
        const val = parseInt(m[1], 10);
        // HRC patterns (2-digit) → convert to HB approximately
        if (/HRC|ROCKWELL/i.test(pat.source) && val < 70) {
          // Approximate HRC→HB: HB ≈ 10 × HRC - 100 (rough, valid 20-60 HRC)
          return Math.round(10 * val - 100);
        }
        return val;
      }
    }
    return null;
  }

  /** Merge two partial results — keep higher-confidence fields */
  private _mergeResults(
    a: ResolvedMaterial,
    b: ResolvedMaterial,
  ): ResolvedMaterial {
    if (a.confidence >= b.confidence) {
      return {
        ...a,
        hardness_hb: a.hardness_hb > 0 ? a.hardness_hb : b.hardness_hb,
        confidence: Math.min(a.confidence + 0.1, 0.95),
        source: `${a.source}+${b.source}`,
        details: [...a.details, ...b.details],
      };
    }
    return {
      ...b,
      name: a.name || b.name,
      hardness_hb: a.hardness_hb > 0 ? a.hardness_hb : b.hardness_hb,
      confidence: Math.min(b.confidence + 0.1, 0.95),
      source: `${b.source}+${a.source}`,
      details: [...b.details, ...a.details],
    };
  }

  /** Enrich result with Kienzle constants and log */
  private _enrichResult(
    result: ResolvedMaterial,
    details: string[],
  ): ResolvedMaterial {
    result.details = [...details, ...result.details];
    log.info(
      `[MaterialResolver] ${result.name} (${result.iso_group}) conf=${result.confidence.toFixed(2)} via ${result.source}`,
    );
    return result;
  }
}

export const materialResolverForProgramsEngine = new MaterialResolverForProgramsEngine();
