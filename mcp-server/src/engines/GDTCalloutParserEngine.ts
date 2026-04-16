/**
 * GDTCalloutParserEngine
 * =======================
 *
 * Parses ASME Y14.5 / ISO 1101 GD&T feature control frames (FCF) from
 * plain-text drawing callouts into structured data.
 *
 * Input formats accepted:
 *   "|⌀|0.02|A|B(M)|"              — unicode with separators
 *   "POS 0.02 A B M"                 — shorthand
 *   "⟂ 0.05 A"                       — perpendicularity
 *   "PROF 0.1 A B C"                 — profile of a surface
 *   "◎ 0.02 A"                       — concentricity/coaxiality
 *
 * Recognizes 14 GD&T symbols (7 form/orientation + 5 location + 2 runout):
 *   Form: flatness, straightness, roundness, cylindricity
 *   Orientation: parallelism, perpendicularity, angularity
 *   Location: position, concentricity, symmetry
 *   Profile: profile-of-line, profile-of-surface
 *   Runout: circular, total
 *
 * Material modifiers: M (MMC), L (LMC), F (free state), unmodified (RFS).
 * Supports composite FCF (two lines: primary tol + refinement tol).
 *
 * Output: structured FCF object with symbol, tolerance, datums,
 * modifiers, and validation errors if syntax invalid.
 *
 * Canonical references:
 *   - ASME Y14.5-2018 (Dimensioning & Tolerancing)
 *   - ISO 1101:2017 (Geometrical tolerancing)
 *
 * @module engines/GDTCalloutParserEngine
 * @milestone LATHE-PRO-MS8
 */

export type GDTSymbol =
  | "flatness"
  | "straightness"
  | "roundness"
  | "cylindricity"
  | "parallelism"
  | "perpendicularity"
  | "angularity"
  | "position"
  | "concentricity"
  | "symmetry"
  | "profile_of_line"
  | "profile_of_surface"
  | "circular_runout"
  | "total_runout";

export type MaterialModifier = "M" | "L" | "F" | "RFS";

export interface DatumRef {
  label: string;
  modifier?: MaterialModifier;
}

export interface FCF {
  symbol: GDTSymbol;
  tolerance_mm: number;
  /** Diameter symbol prefix on tolerance? */
  diameter: boolean;
  material_modifier: MaterialModifier;
  datums: DatumRef[];
  /** Second line of composite FCF (refinement) */
  composite_refinement?: FCF;
  /** Free-text notes extracted */
  notes?: string[];
  /** Errors from validation */
  errors: string[];
}

// Unicode → symbol table (covers both Unicode GD&T block U+23E4-U+2BBF and ASCII shorthand)
const SYMBOL_MAP: Array<{ tokens: string[]; sym: GDTSymbol }> = [
  { tokens: ["⏥", "FLAT", "FLT"], sym: "flatness" },
  { tokens: ["⏤", "STR", "STRAIGHT"], sym: "straightness" },
  { tokens: ["○", "⚪", "ROUND", "CIRC"], sym: "roundness" },
  { tokens: ["⌭", "CYL"], sym: "cylindricity" },
  { tokens: ["∥", "PAR", "PARA"], sym: "parallelism" },
  { tokens: ["⟂", "⊥", "PERP"], sym: "perpendicularity" },
  { tokens: ["∠", "ANG"], sym: "angularity" },
  { tokens: ["⌖", "POS", "TP"], sym: "position" },
  { tokens: ["◎", "CONC", "COAX"], sym: "concentricity" },
  { tokens: ["⌯", "SYM"], sym: "symmetry" },
  { tokens: ["⌒", "PL", "PROFL"], sym: "profile_of_line" },
  { tokens: ["⌓", "PS", "PROFS", "PROF"], sym: "profile_of_surface" },
  { tokens: ["↗", "CR", "RO"], sym: "circular_runout" },
  { tokens: ["⌰", "TR"], sym: "total_runout" },
];

const FORM_SYMBOLS: GDTSymbol[] = ["flatness", "straightness", "roundness", "cylindricity"];
// Note: profile symbols CAN take datums (profile-relative-to-datum)

class GDTCalloutParserEngineImpl {
  parse(callout: string): FCF {
    const errors: string[] = [];
    const original = callout.trim();
    // Split by | or space
    const parts = original
      .split(/[\|]/)
      .flatMap((p) => p.split(/\s+/))
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 0) {
      return emptyFcf(["empty callout"]);
    }

    // Symbol: first token that matches any known symbol
    let symbol: GDTSymbol | null = null;
    let tolIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      const match = SYMBOL_MAP.find((m) => m.tokens.some((t) => parts[i]!.toUpperCase() === t));
      if (match) {
        symbol = match.sym;
        tolIdx = i + 1;
        break;
      }
    }
    if (!symbol) {
      return emptyFcf([`Unrecognized GD&T symbol in: "${original}"`]);
    }

    // Tolerance token: may have Ø prefix
    let tolToken = parts[tolIdx];
    let diameter = false;
    if (tolToken && /^[Ø⌀ø]/.test(tolToken)) {
      diameter = true;
      tolToken = tolToken.replace(/^[Ø⌀ø]/, "");
    } else if (tolToken === "Ø" || tolToken === "⌀") {
      // diameter marker as separate token
      diameter = true;
      tolIdx++;
      tolToken = parts[tolIdx];
    }
    const tolerance = tolToken !== undefined ? Number.parseFloat(tolToken) : NaN;
    if (Number.isNaN(tolerance)) {
      errors.push(`Tolerance value missing or not parseable: "${tolToken}"`);
    }

    // Material modifier attached to tolerance? e.g., "0.02(M)" or separate token
    let matMod: MaterialModifier = "RFS";
    const tolMatch = tolToken?.match(/\(([MLF])\)/i);
    if (tolMatch) {
      matMod = tolMatch[1]!.toUpperCase() as MaterialModifier;
    } else if (parts[tolIdx + 1] && /^\([MLF]\)$/i.test(parts[tolIdx + 1]!)) {
      matMod = parts[tolIdx + 1]!.replace(/[()]/g, "").toUpperCase() as MaterialModifier;
      tolIdx++;
    }

    // Datums: remaining parts. May be "A", "B(M)", or "A-B" (common datum).
    const datums: DatumRef[] = [];
    for (let i = tolIdx + 1; i < parts.length; i++) {
      const p = parts[i]!;
      if (/^\([MLF]\)$/i.test(p)) {
        const last = datums[datums.length - 1];
        if (last) last.modifier = p.replace(/[()]/g, "").toUpperCase() as MaterialModifier;
        continue;
      }
      const m = p.match(/^([A-Z0-9\-]+)(\(([MLF])\))?$/i);
      if (m) {
        datums.push({
          label: m[1]!,
          modifier: m[3] ? (m[3].toUpperCase() as MaterialModifier) : undefined,
        });
      } else {
        errors.push(`Unrecognized datum or modifier: "${p}"`);
      }
    }

    // Validation: form tolerances cannot have datums (flatness/straightness/roundness/cylindricity)
    if (FORM_SYMBOLS.includes(symbol) && datums.length > 0) {
      errors.push(
        `Form tolerance (${symbol}) must not reference datums — found: ${datums.map((d) => d.label).join(", ")}`
      );
    }
    // Diameter prefix only valid for position + coaxial-ish controls
    if (diameter && !["position", "concentricity", "circular_runout", "total_runout"].includes(symbol)) {
      errors.push(`Diameter prefix (Ø) invalid for ${symbol}`);
    }
    // Material modifier only valid for features of size (size tolerances), not form or surface profile (per ASME Y14.5)
    if (matMod !== "RFS" && ["flatness", "straightness"].includes(symbol)) {
      errors.push(`Material modifier (${matMod}) invalid for ${symbol}`);
    }
    // Position requires at least primary datum (except unusual cases)
    if (symbol === "position" && datums.length === 0) {
      errors.push("Position tolerance requires at least a primary datum");
    }

    return {
      symbol,
      tolerance_mm: Number.isNaN(tolerance) ? 0 : tolerance,
      diameter,
      material_modifier: matMod,
      datums,
      errors,
    };
  }

  parseComposite(line1: string, line2: string): FCF {
    const primary = this.parse(line1);
    const refinement = this.parse(line2);
    if (primary.symbol !== refinement.symbol) {
      primary.errors.push(
        `Composite FCF refinement symbol (${refinement.symbol}) must match primary (${primary.symbol})`
      );
    }
    if (refinement.tolerance_mm > primary.tolerance_mm) {
      primary.errors.push(
        `Composite refinement tolerance (${refinement.tolerance_mm}) must be ≤ primary (${primary.tolerance_mm})`
      );
    }
    primary.composite_refinement = refinement;
    return primary;
  }

  getStats(): { symbols_supported: number; form_symbols: GDTSymbol[] } {
    return {
      symbols_supported: SYMBOL_MAP.length,
      form_symbols: FORM_SYMBOLS,
    };
  }
}

function emptyFcf(errors: string[]): FCF {
  return {
    symbol: "flatness",
    tolerance_mm: 0,
    diameter: false,
    material_modifier: "RFS",
    datums: [],
    errors,
  };
}

export const gdtCalloutParserEngine = new GDTCalloutParserEngineImpl();
export type { GDTCalloutParserEngineImpl };
