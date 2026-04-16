/**
 * MaterialCalloutParserEngine — Engineering Drawing Material Callout Parser
 *
 * Parses material specification strings from engineering drawings and
 * cross-references them against the MaterialRegistry to resolve:
 *   - ISO material group (P/M/K/N/S/H)
 *   - Canonical material name
 *   - Kienzle/Taylor physics parameters
 *   - Heat treatment condition and hardness range
 *   - Surface requirements
 *
 * Handles formats:
 *   - AISI/SAE: "AISI 4140 QT 28-32 HRC", "SAE 1045"
 *   - DIN/EN: "DIN 1.7225", "EN 42CrMo4"
 *   - UNS: "UNS G41400", "UNS S31600"
 *   - Common: "SS316L", "Ti-6Al-4V ELI", "Al 6061-T6", "Inconel 718"
 *   - Japanese: "JIS S45C", "SUS304"
 *   - Shorthand: "mild steel", "tool steel", "brass"
 *
 * Cross-references:
 *   - ASTM/SAE → MaterialRegistry entry
 *   - DIN → SAE equivalent → MaterialRegistry
 *   - JIS → SAE equivalent → MaterialRegistry
 *   - UNS → SAE equivalent → MaterialRegistry
 *
 * References:
 *   - ASTM E527 (UNS numbering system)
 *   - ISO 4948-1 (steel classification)
 *   - Sandvik Coromant Material Classification Guide
 *
 * @module engines/MaterialCalloutParserEngine
 * @milestone LATHE-PRO-MS-1 U-LPI02
 */

import { log } from "../utils/Logger.js";
import type { TurningMaterial } from "./TurningPrintToProgramEngine.js";
import {
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed material data */
  material: TurningMaterial;
  /** ISO material group */
  iso_group: ISOGroup;
  /** Kienzle kc1_1 (specific cutting force at h=1mm, b=1mm) */
  kc1_1: number;
  /** Kienzle mc exponent */
  mc: number;
  /** Taylor C constant */
  taylor_C: number;
  /** Taylor n exponent */
  taylor_n: number;
  /** Heat treatment detected */
  heat_treatment?: string;
  /** Hardness range (HRC) */
  hardness_hrc?: { min: number; max: number };
  /** Hardness range (HB) */
  hardness_hb?: { min: number; max: number };
  /** Confidence of the parse (0-1) */
  confidence: number;
  /** Original callout string */
  raw_callout: string;
  /** Matched canonical name (if resolved) */
  canonical_name?: string;
  /** Warnings */
  warnings: string[];
  /** Cross-reference equivalents found */
  cross_references: string[];
}

// ============================================================================
// DIN → SAE CROSS-REFERENCE TABLE
// Reference: Stahlschlüssel (Key to Steel), 2019 edition
// ============================================================================

const DIN_TO_SAE: Record<string, { sae: string; iso: ISOGroup }> = {
  // DIN Werkstoffnummer → SAE equivalent
  "1.0037": { sae: "A36", iso: "P" },
  "1.0401": { sae: "1020", iso: "P" },
  "1.0503": { sae: "1045", iso: "P" },
  "1.7218": { sae: "4130", iso: "P" },
  "1.7225": { sae: "4140", iso: "P" },
  "1.6565": { sae: "4340", iso: "P" },
  "1.0715": { sae: "1215", iso: "P" },
  "1.4301": { sae: "304", iso: "M" },
  "1.4404": { sae: "316L", iso: "M" },
  "1.4057": { sae: "431", iso: "M" },
  "1.4542": { sae: "17-4PH", iso: "M" },
  "1.4021": { sae: "420", iso: "M" },
  "1.2379": { sae: "D2", iso: "H" },
  "1.3343": { sae: "M2", iso: "H" },
  "1.2344": { sae: "H13", iso: "H" },
  "1.2080": { sae: "D3", iso: "H" },
  // DIN symbolic names
  "c45": { sae: "1045", iso: "P" },
  "ck45": { sae: "1045", iso: "P" },
  "42crmo4": { sae: "4140", iso: "P" },
  "34crmo4": { sae: "4130", iso: "P" },
  "34crnimo6": { sae: "4340", iso: "P" },
  "x5crni18-10": { sae: "304", iso: "M" },
  "x2crnimo17-12-2": { sae: "316L", iso: "M" },
  "x155crvmo12-1": { sae: "D2", iso: "H" },
};

// ============================================================================
// JIS → SAE CROSS-REFERENCE TABLE
// Reference: JIS Handbook, Steel Standards
// ============================================================================

const JIS_TO_SAE: Record<string, { sae: string; iso: ISOGroup }> = {
  "s45c": { sae: "1045", iso: "P" },
  "s20c": { sae: "1020", iso: "P" },
  "scm440": { sae: "4140", iso: "P" },
  "scm435": { sae: "4130", iso: "P" },
  "sncm439": { sae: "4340", iso: "P" },
  "sus304": { sae: "304", iso: "M" },
  "sus316": { sae: "316", iso: "M" },
  "sus316l": { sae: "316L", iso: "M" },
  "sus410": { sae: "410", iso: "M" },
  "sus420j2": { sae: "420", iso: "M" },
  "skd11": { sae: "D2", iso: "H" },
  "skd61": { sae: "H13", iso: "H" },
  "skh51": { sae: "M2", iso: "H" },
  "fc250": { sae: "Class 40", iso: "K" },
  "fcd600": { sae: "80-55-06", iso: "K" },
};

// ============================================================================
// UNS → SAE CROSS-REFERENCE TABLE
// Reference: ASTM E527 (UNS designation system)
// ============================================================================

const UNS_TO_SAE: Record<string, { sae: string; iso: ISOGroup }> = {
  "g10200": { sae: "1020", iso: "P" },
  "g10450": { sae: "1045", iso: "P" },
  "g41300": { sae: "4130", iso: "P" },
  "g41400": { sae: "4140", iso: "P" },
  "g43400": { sae: "4340", iso: "P" },
  "g12150": { sae: "1215", iso: "P" },
  "g12144": { sae: "12L14", iso: "P" },
  "s30400": { sae: "304", iso: "M" },
  "s31600": { sae: "316", iso: "M" },
  "s31603": { sae: "316L", iso: "M" },
  "s17400": { sae: "17-4PH", iso: "M" },
  "s41000": { sae: "410", iso: "M" },
  "s42000": { sae: "420", iso: "M" },
  "t30402": { sae: "D2", iso: "H" },
  "t11302": { sae: "M2", iso: "H" },
  "t20813": { sae: "H13", iso: "H" },
  "n07718": { sae: "Inconel 718", iso: "S" },
  "n06600": { sae: "Inconel 600", iso: "S" },
  "r56400": { sae: "Ti-6Al-4V", iso: "S" },
  "a96061": { sae: "6061", iso: "N" },
  "a97075": { sae: "7075", iso: "N" },
  "c36000": { sae: "Free-Cutting Brass", iso: "N" },
};

// ============================================================================
// COMMON NAME → ISO GROUP CLASSIFICATION
// ============================================================================

interface MaterialPattern {
  pattern: RegExp;
  iso: ISOGroup;
  canonical?: string;
}

const MATERIAL_PATTERNS: MaterialPattern[] = [
  // Superalloys (S) — check first, these override generic matches
  { pattern: /inconel\s*718/i, iso: "S", canonical: "Inconel 718" },
  { pattern: /inconel\s*625/i, iso: "S", canonical: "Inconel 625" },
  { pattern: /inconel/i, iso: "S", canonical: "Inconel" },
  { pattern: /hastelloy/i, iso: "S", canonical: "Hastelloy" },
  { pattern: /waspaloy/i, iso: "S", canonical: "Waspaloy" },
  { pattern: /nimonic/i, iso: "S", canonical: "Nimonic" },
  { pattern: /monel/i, iso: "S", canonical: "Monel" },
  { pattern: /ti[-\s]?6al[-\s]?4v/i, iso: "S", canonical: "Ti-6Al-4V" },
  { pattern: /ti[-\s]?6[-\s]?4/i, iso: "S", canonical: "Ti-6Al-4V" },
  { pattern: /titanium\s+(?:grade|gr)\s*5/i, iso: "S", canonical: "Ti-6Al-4V" },
  { pattern: /titanium\s+(?:grade|gr)\s*2/i, iso: "S", canonical: "Ti Grade 2" },
  { pattern: /titanium/i, iso: "S", canonical: "Titanium" },
  { pattern: /\bti\b/i, iso: "S", canonical: "Titanium" },

  // Stainless (M) — before generic steel
  { pattern: /(?:ss|stainless)\s*316\s*l/i, iso: "M", canonical: "316L" },
  { pattern: /(?:ss|stainless)\s*316/i, iso: "M", canonical: "316" },
  { pattern: /(?:ss|stainless)\s*304\s*l/i, iso: "M", canonical: "304L" },
  { pattern: /(?:ss|stainless)\s*304/i, iso: "M", canonical: "304" },
  { pattern: /(?:ss|stainless)\s*303/i, iso: "M", canonical: "303" },
  { pattern: /(?:ss|stainless)\s*17[-\s]?4\s*ph/i, iso: "M", canonical: "17-4PH" },
  { pattern: /17[-\s]?4\s*ph/i, iso: "M", canonical: "17-4PH" },
  { pattern: /(?:ss|stainless)\s*410/i, iso: "M", canonical: "410" },
  { pattern: /(?:ss|stainless)\s*420/i, iso: "M", canonical: "420" },
  { pattern: /(?:ss|stainless)\s*440c/i, iso: "M", canonical: "440C" },
  { pattern: /stainless/i, iso: "M", canonical: "Stainless Steel" },
  { pattern: /duplex/i, iso: "M", canonical: "Duplex Stainless" },

  // Hardened / Tool steels (H)
  { pattern: /\bd2\b/i, iso: "H", canonical: "D2" },
  { pattern: /\bm2\b/i, iso: "H", canonical: "M2" },
  { pattern: /\bh13\b/i, iso: "H", canonical: "H13" },
  { pattern: /\bs7\b/i, iso: "H", canonical: "S7" },
  { pattern: /\ba2\b/i, iso: "H", canonical: "A2" },
  { pattern: /\bo1\b/i, iso: "H", canonical: "O1" },
  { pattern: /cpm\s*/i, iso: "H", canonical: "CPM Tool Steel" },
  { pattern: /tool\s+steel/i, iso: "H", canonical: "Tool Steel" },

  // Cast iron (K)
  { pattern: /cast\s*iron/i, iso: "K", canonical: "Cast Iron" },
  { pattern: /ductile\s*iron/i, iso: "K", canonical: "Ductile Iron" },
  { pattern: /gray\s*iron/i, iso: "K", canonical: "Gray Iron" },
  { pattern: /\ba48\b/i, iso: "K", canonical: "ASTM A48" },
  { pattern: /\ba536\b/i, iso: "K", canonical: "ASTM A536" },
  { pattern: /80[-\s]?55[-\s]?06/i, iso: "K", canonical: "80-55-06 Ductile" },

  // Non-ferrous (N)
  { pattern: /(?:al|aluminum|aluminium)\s*6061/i, iso: "N", canonical: "6061" },
  { pattern: /(?:al|aluminum|aluminium)\s*7075/i, iso: "N", canonical: "7075" },
  { pattern: /(?:al|aluminum|aluminium)\s*2024/i, iso: "N", canonical: "2024" },
  { pattern: /aluminum|aluminium/i, iso: "N", canonical: "Aluminum" },
  { pattern: /\b6061\b/, iso: "N", canonical: "6061" },
  { pattern: /\b7075\b/, iso: "N", canonical: "7075" },
  { pattern: /\b2024\b/, iso: "N", canonical: "2024" },
  { pattern: /brass/i, iso: "N", canonical: "Brass" },
  { pattern: /bronze/i, iso: "N", canonical: "Bronze" },
  { pattern: /copper/i, iso: "N", canonical: "Copper" },
  { pattern: /nylon/i, iso: "N", canonical: "Nylon" },
  { pattern: /delrin|acetal|pom/i, iso: "N", canonical: "Delrin" },
  { pattern: /peek/i, iso: "N", canonical: "PEEK" },
  { pattern: /ptfe|teflon/i, iso: "N", canonical: "PTFE" },

  // Carbon/alloy steels (P) — last, as they're the most common
  { pattern: /(?:aisi|sae)\s*4340/i, iso: "P", canonical: "4340" },
  { pattern: /(?:aisi|sae)\s*4140/i, iso: "P", canonical: "4140" },
  { pattern: /(?:aisi|sae)\s*4130/i, iso: "P", canonical: "4130" },
  { pattern: /(?:aisi|sae)\s*1045/i, iso: "P", canonical: "1045" },
  { pattern: /(?:aisi|sae)\s*1020/i, iso: "P", canonical: "1020" },
  { pattern: /(?:aisi|sae)\s*1018/i, iso: "P", canonical: "1018" },
  { pattern: /(?:aisi|sae)\s*8620/i, iso: "P", canonical: "8620" },
  { pattern: /(?:aisi|sae)\s*12l14/i, iso: "P", canonical: "12L14" },
  { pattern: /(?:aisi|sae)\s*1215/i, iso: "P", canonical: "1215" },
  { pattern: /\b4340\b/, iso: "P", canonical: "4340" },
  { pattern: /\b4140\b/, iso: "P", canonical: "4140" },
  { pattern: /\b4130\b/, iso: "P", canonical: "4130" },
  { pattern: /\b1045\b/, iso: "P", canonical: "1045" },
  { pattern: /\b1018\b/, iso: "P", canonical: "1018" },
  { pattern: /\b8620\b/, iso: "P", canonical: "8620" },
  { pattern: /mild\s+steel/i, iso: "P", canonical: "1018" },
  { pattern: /carbon\s+steel/i, iso: "P", canonical: "Carbon Steel" },
  { pattern: /alloy\s+steel/i, iso: "P", canonical: "Alloy Steel" },
  { pattern: /\bsteel\b/i, iso: "P", canonical: "Steel" },
];

// ============================================================================
// HEAT TREATMENT PARSING
// ============================================================================

const HEAT_TREATMENTS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bqt\b|quench(?:ed)?\s*(?:and|&)\s*temper(?:ed)?/i, name: "Quenched & Tempered" },
  { pattern: /\bq&t\b/i, name: "Quenched & Tempered" },
  { pattern: /\banneal(?:ed)?\b/i, name: "Annealed" },
  { pattern: /\bnormalize[d]?\b/i, name: "Normalized" },
  { pattern: /\bstress\s*reliev(?:ed|e)\b/i, name: "Stress Relieved" },
  { pattern: /\bthrough[-\s]?harden(?:ed)?\b/i, name: "Through Hardened" },
  { pattern: /\bcase[-\s]?harden(?:ed)?\b/i, name: "Case Hardened" },
  { pattern: /\bcarburiz(?:ed|e|ing)\b/i, name: "Carburized" },
  { pattern: /\bnitrid(?:ed|e|ing)\b/i, name: "Nitrided" },
  { pattern: /\binduction[-\s]?harden(?:ed)?\b/i, name: "Induction Hardened" },
  { pattern: /\bcold[-\s]?drawn\b/i, name: "Cold Drawn" },
  { pattern: /\bhot[-\s]?rolled\b/i, name: "Hot Rolled" },
  { pattern: /\bcold[-\s]?rolled\b/i, name: "Cold Rolled" },
  { pattern: /\bcold[-\s]?finished\b/i, name: "Cold Finished" },
  // Aluminum tempers
  { pattern: /[-\s]t6\b/i, name: "T6 (Solution Treated + Artificially Aged)" },
  { pattern: /[-\s]t651\b/i, name: "T651 (T6 + Stress Relieved)" },
  { pattern: /[-\s]t4\b/i, name: "T4 (Solution Treated + Naturally Aged)" },
  { pattern: /[-\s]t3\b/i, name: "T3 (Solution Treated + Cold Worked)" },
  { pattern: /[-\s]o\b/i, name: "O (Annealed)" },
  // Stainless conditions
  { pattern: /\bcondition\s*a\b/i, name: "Condition A (Solution Annealed)" },
  { pattern: /\bcondition\s*h900\b/i, name: "H900 (Precipitation Hardened)" },
  { pattern: /\bcondition\s*h1025\b/i, name: "H1025 (Precipitation Hardened)" },
  { pattern: /\beli\b/i, name: "ELI (Extra Low Interstitial)" },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MaterialCalloutParserEngine {

  /**
   * Parse a material callout string and resolve to physics parameters.
   *
   * @param callout - Raw material string from engineering drawing
   * @returns Parsed material with ISO group and Kienzle/Taylor parameters
   */
  parse(callout: string): MaterialParseResult {
    const raw = callout.trim();
    if (!raw) {
      return this.fallbackResult("", "No material callout provided");
    }

    const warnings: string[] = [];
    const crossRefs: string[] = [];
    let confidence = 0.5;
    let resolvedISO: ISOGroup = "P";
    let canonicalName: string | undefined;

    // ── Step 1: Check DIN Werkstoffnummer ─────────────────────────
    const dinMatch = raw.match(/(?:din\s*)?(\d\.\d{4})/i);
    if (dinMatch) {
      const entry = DIN_TO_SAE[dinMatch[1]];
      if (entry) {
        resolvedISO = entry.iso;
        canonicalName = entry.sae;
        crossRefs.push(`DIN ${dinMatch[1]} → SAE ${entry.sae}`);
        confidence = 0.95;
      }
    }

    // ── Step 2: Check DIN symbolic names ──────────────────────────
    if (!canonicalName) {
      const lower = raw.toLowerCase().replace(/\s+/g, "");
      for (const [dinName, entry] of Object.entries(DIN_TO_SAE)) {
        if (/^\d\.\d{4}$/.test(dinName)) continue; // Skip Werkstoffnummer (1.XXXX format)
        if (lower.includes(dinName)) {
          resolvedISO = entry.iso;
          canonicalName = entry.sae;
          crossRefs.push(`DIN ${dinName} → SAE ${entry.sae}`);
          confidence = 0.90;
          break;
        }
      }
    }

    // ── Step 3: Check JIS ─────────────────────────────────────────
    if (!canonicalName) {
      // JIS designations: S45C, SCM440, SUS304, SKD11, FC250, FCD600
      // Pattern: 1-4 letters + digits + optional trailing letter/digits
      const jisMatch = raw.match(/(?:jis\s+)?([a-z]{1,4}\d{2,4}[a-z]?\d*)/i);
      if (jisMatch) {
        const jisKey = jisMatch[1].toLowerCase();
        const entry = JIS_TO_SAE[jisKey];
        if (entry) {
          resolvedISO = entry.iso;
          canonicalName = entry.sae;
          crossRefs.push(`JIS ${jisMatch[1]} → SAE ${entry.sae}`);
          confidence = 0.90;
          // If matched with "JIS" prefix, higher confidence
          if (/jis\s/i.test(raw)) confidence = 0.95;
        }
      }
    }

    // ── Step 4: Check UNS ─────────────────────────────────────────
    if (!canonicalName) {
      const unsMatch = raw.match(/(?:uns\s+)?([a-z]\d{5})/i);
      if (unsMatch) {
        const unsKey = unsMatch[1].toLowerCase();
        const entry = UNS_TO_SAE[unsKey];
        if (entry) {
          resolvedISO = entry.iso;
          canonicalName = entry.sae;
          crossRefs.push(`UNS ${unsMatch[1].toUpperCase()} → SAE ${entry.sae}`);
          confidence = 0.95;
        }
      }
    }

    // ── Step 5: Pattern matching against common names ─────────────
    if (!canonicalName) {
      for (const mp of MATERIAL_PATTERNS) {
        if (mp.pattern.test(raw)) {
          resolvedISO = mp.iso;
          canonicalName = mp.canonical;
          confidence = 0.80;
          break;
        }
      }
    }

    // ── Step 6: Parse hardness ────────────────────────────────────
    let hardness_hrc: { min: number; max: number } | undefined;
    let hardness_hb: { min: number; max: number } | undefined;

    const hrcRange = raw.match(/(\d+)\s*[-–]\s*(\d+)\s*hrc/i);
    const hrcSingle = raw.match(/(\d+)\s*hrc/i);
    const hbRange = raw.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:hb|bhn|brinell)/i);

    if (hrcRange) {
      hardness_hrc = { min: parseInt(hrcRange[1]), max: parseInt(hrcRange[2]) };
      // Override ISO group for hardened materials
      if (hardness_hrc.min >= 45) {
        resolvedISO = "H";
        confidence = Math.max(confidence, 0.90);
      }
    } else if (hrcSingle) {
      const hrc = parseInt(hrcSingle[1]);
      hardness_hrc = { min: hrc - 2, max: hrc + 2 };
      if (hrc >= 45) resolvedISO = "H";
    }

    if (hbRange) {
      hardness_hb = { min: parseInt(hbRange[1]), max: parseInt(hbRange[2]) };
    }

    // ── Step 7: Parse heat treatment ──────────────────────────────
    let heat_treatment: string | undefined;
    for (const ht of HEAT_TREATMENTS) {
      if (ht.pattern.test(raw)) {
        heat_treatment = ht.name;
        break;
      }
    }

    // ── Step 8: Resolve Kienzle/Taylor from canonical DB ──────────
    const matDB = CANONICAL_MATERIAL_DB[resolvedISO];
    if (!matDB) {
      warnings.push(`ISO group ${resolvedISO} not in canonical material DB`);
    }

    const kc1_1 = matDB?.kc1_1 ?? 1800;
    const mc = matDB?.mc ?? 0.25;
    const taylor_C = matDB?.taylor_C ?? 350;
    const taylor_n = matDB?.taylor_n ?? 0.25;

    // ── Step 9: Build TurningMaterial ─────────────────────────────
    const materialName = canonicalName || raw;
    const avgHrc = hardness_hrc ? Math.round((hardness_hrc.min + hardness_hrc.max) / 2) : undefined;

    const material: TurningMaterial = {
      material_name: materialName,
      iso_group: resolvedISO,
      hardness_hrc: avgHrc,
    };

    if (confidence < 0.7) {
      warnings.push(`Low confidence (${(confidence * 100).toFixed(0)}%) — material classification may be incorrect. Verify ISO group.`);
    }

    log.info(`[MaterialCalloutParser] "${raw}" → ${resolvedISO} ${materialName} (conf=${confidence.toFixed(2)})`);

    return {
      success: true,
      material,
      iso_group: resolvedISO,
      kc1_1,
      mc,
      taylor_C,
      taylor_n,
      heat_treatment,
      hardness_hrc,
      hardness_hb,
      confidence,
      raw_callout: raw,
      canonical_name: canonicalName,
      warnings,
      cross_references: crossRefs,
    };
  }

  /**
   * Parse multiple material callouts and return the best match.
   * Useful when multiple callouts exist (e.g., title block + note).
   */
  parseBest(callouts: string[]): MaterialParseResult {
    if (callouts.length === 0) {
      return this.fallbackResult("", "No callouts provided");
    }

    let best: MaterialParseResult | null = null;
    for (const c of callouts) {
      const result = this.parse(c);
      if (!best || result.confidence > best.confidence) {
        best = result;
      }
    }
    return best!;
  }

  /** Fallback result for unparseable callouts */
  private fallbackResult(raw: string, warning: string): MaterialParseResult {
    return {
      success: false,
      material: { material_name: raw || "Unknown", iso_group: "P" },
      iso_group: "P",
      kc1_1: 1800,
      mc: 0.25,
      taylor_C: 350,
      taylor_n: 0.25,
      confidence: 0,
      raw_callout: raw,
      warnings: [warning],
      cross_references: [],
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const materialCalloutParserEngine = new MaterialCalloutParserEngine();
