/**
 * CADDrawingNumberNormalizerEngine — U-FS-06 (PHASE-47)
 *
 * Parses and canonicalizes drawing numbers from mixed conventions,
 * builds a part-family hierarchy, and supports Levenshtein fuzzy lookup
 * with distance ≤ 2 by default.
 *
 * Normalization rules:
 *   - Trim whitespace
 *   - Uppercase
 *   - Replace every run of separator chars ({space, _, /, .}) with "-"
 *   - Collapse "--" runs to single "-"
 *   - Strip leading "-" and trailing "-"
 *   - Zero-pad pure-numeric bodies to 4 digits (e.g. "23" → "0023")
 *
 * Structure decomposition:
 *   "ALCOA-PN-100-01 Rev A"  →
 *     raw            : original
 *     canonical      : "ALCOA-PN-0100-01"
 *     prefix         : "ALCOA"
 *     numericBody    : "0100"
 *     configSuffix   : "01"
 *     familyKey      : "ALCOA-PN-0100"
 *
 * @module engines/CADDrawingNumberNormalizerEngine
 */

import {
  ParsedDrawingNumberSchema,
  PartFamilyNodeSchema,
  FuzzyMatchSchema,
  type ParsedDrawingNumber,
  type PartFamilyNode,
  type FuzzyMatch,
} from "../schemas/cadDrawingNumberSchema.js";

const SEPARATOR_REGEX = /[\s_/.]+/g;

// Levenshtein distance (classic DP), O(m*n). Cap for early exit.
function levenshtein(a: string, b: string, cap = Infinity): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > cap) return cap + 1;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev: number[] = new Array(n + 1);
  let curr: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

// Strip rev markers ("Rev.A", "_RevA", "-R3", "v3", trailing "_A") —
// if the trailing token looks like a rev token we don't want it fused into
// the canonical drawing-number. This is intentionally separate from
// CADRevisionDetectorEngine which produces rich metadata.
function stripRevSuffix(s: string): string {
  return s
    .replace(/[-\s_]?REV\.?\s*[-_]?\s*[A-Z0-9]+$/i, "")
    .replace(/[-\s_]REV[-]?[A-Z0-9]+$/i, "")
    .replace(/[-\s_]R\d+$/i, "")
    .replace(/[-\s_][vV]\d+$/, "")
    .replace(/\s+$/, "");
}

export class CADDrawingNumberNormalizerEngine {
  private families = new Map<string, PartFamilyNode>();
  private canonicalIndex = new Set<string>();

  /** Parse + canonicalize a raw drawing number. */
  parse(raw: string): ParsedDrawingNumber {
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new Error("Drawing number must be non-empty string");
    }
    let s = stripRevSuffix(raw.trim()).toUpperCase();
    s = s.replace(SEPARATOR_REGEX, "-");
    s = s.replace(/-{2,}/g, "-");
    s = s.replace(/^-+|-+$/g, "");

    const parts = s.split("-").filter((p) => p.length > 0);
    if (parts.length === 0) {
      throw new Error(`Drawing number "${raw}" is empty after normalization`);
    }

    // Find first numeric run, pad ONLY that one (the "body")
    const firstNumIdx = parts.findIndex((p) => /^\d+$/.test(p));
    const padded = parts.map((p, i) =>
      i === firstNumIdx ? p.padStart(4, "0") : p,
    );
    const canonical = padded.join("-");

    // Structural decomposition
    let prefix: string | undefined;
    let numericBody: string | undefined;
    let configSuffix: string | undefined;

    const numIdx = firstNumIdx;
    if (numIdx > 0) {
      prefix = padded.slice(0, numIdx).join("-");
    }
    if (numIdx >= 0) {
      numericBody = padded[numIdx];
    }
    if (numIdx >= 0 && numIdx + 1 < padded.length) {
      configSuffix = padded.slice(numIdx + 1).join("-");
    }

    // Family key = prefix + numericBody; if no numeric body, use full canonical.
    let familyKey: string;
    if (numIdx >= 0) {
      familyKey = padded.slice(0, numIdx + 1).join("-");
    } else {
      familyKey = canonical;
    }

    return ParsedDrawingNumberSchema.parse({
      raw,
      canonical,
      prefix,
      numericBody,
      configSuffix,
      familyKey,
    });
  }

  /** Canonicalize only — cheap path for comparisons. */
  canonicalize(raw: string): string {
    return this.parse(raw).canonical;
  }

  /** Register a drawing in the hierarchy. */
  register(raw: string): ParsedDrawingNumber {
    const parsed = this.parse(raw);
    this.canonicalIndex.add(parsed.canonical);

    let node = this.families.get(parsed.familyKey);
    if (!node) {
      node = PartFamilyNodeSchema.parse({
        familyKey: parsed.familyKey,
        configs: [],
        drawings: [],
      });
      this.families.set(parsed.familyKey, node);
    }
    if (!node.drawings.includes(parsed.canonical)) {
      node.drawings.push(parsed.canonical);
    }
    if (parsed.configSuffix && !node.configs.includes(parsed.configSuffix)) {
      node.configs.push(parsed.configSuffix);
    }
    return parsed;
  }

  /** Lookup a family by key. */
  getFamily(familyKey: string): PartFamilyNode | undefined {
    return this.families.get(familyKey);
  }

  listFamilies(): PartFamilyNode[] {
    return [...this.families.values()];
  }

  /** Levenshtein fuzzy match over registered canonical drawing numbers. */
  fuzzyFind(raw: string, maxDistance = 2): FuzzyMatch[] {
    const target = this.canonicalize(raw);
    const matches: FuzzyMatch[] = [];
    for (const cand of this.canonicalIndex) {
      const d = levenshtein(target, cand, maxDistance);
      if (d <= maxDistance) {
        const maxLen = Math.max(target.length, cand.length, 1);
        matches.push(
          FuzzyMatchSchema.parse({
            canonical: cand,
            distance: d,
            score: 1 - d / maxLen,
          }),
        );
      }
    }
    return matches.sort((a, b) => a.distance - b.distance || b.score - a.score);
  }

  /** Exact membership check. */
  has(raw: string): boolean {
    try {
      return this.canonicalIndex.has(this.canonicalize(raw));
    } catch {
      return false;
    }
  }

  /** Registered canonical count. */
  get size(): number {
    return this.canonicalIndex.size;
  }

  /** Clear all state. */
  clear(): void {
    this.canonicalIndex.clear();
    this.families.clear();
  }
}

export const cadDrawingNumberNormalizerEngine =
  new CADDrawingNumberNormalizerEngine();
