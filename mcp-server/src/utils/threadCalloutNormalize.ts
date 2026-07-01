/**
 * Thread-callout normalization.
 *
 * TS port of the canonical pure normalizer in
 * `scripts/lib/ollama-vision-extract-lib.mjs` (`normalizeThreadCallout`,
 * U-XRAY-THREAD-NORMALIZE). The MCP/TS bundle cannot cleanly import the scripts/.mjs
 * (separate runtime, untyped, node-only sibling imports), so this is a documented
 * cross-boundary CLONE -- keep the two in sync; both sides pin identical reference values
 * in tests. Sibling of `surfaceFinishNormalize.ts`.
 *
 * Threads are the most common blueprint callout and the VLM frequently garbles them
 * (letter O for 0, unicode dash for hyphen, multiplication-sign for x). This de-garbles +
 * resolves a canonical thread spec so downstream (quote/cam tapping ops) gets clean data
 * instead of raw text. Handles Unified inch ("1/4-20 UNC-2B", ".250-20", "#10-32 UNF",
 * "1-8 UNC"), metric ("M6x1.0", "M6", "M10X1.5-6H"), and NPT pipe ("1/4-18 NPT").
 *
 * SELF-SAFE (R12 -- never fabricate a thread): a bare integer-integer ("1-2", "10-32")
 * with no series/class/fraction/screw is a range, not a thread (resolved=false); a
 * tool-steel grade or hardness spec ("M2 STEEL", "D2 RC60", "HSS") is rejected even though
 * "M2" matches the metric pattern (JM Die runs M2/A2/D2 tool steels).
 */

/** Exact inch -> mm unit conversion (definition, not a physics material constant). */
const MM_PER_INCH = 25.4;
/** A thread major beyond this (inch) does not exist on a machined part -- a bare "14-20" is a range. */
const MAX_THREAD_MAJOR_IN = 4;

/** ISO 261 coarse-thread pitch (mm) by metric nominal major diameter (mm) -- fills a bare "M6". */
const M_COARSE_PITCH_MM: Readonly<Record<number, number>> = Object.freeze({
  1.6: 0.35, 2: 0.4, 2.5: 0.45, 3: 0.5, 3.5: 0.6, 4: 0.7, 5: 0.8, 6: 1.0,
  8: 1.25, 10: 1.5, 12: 1.75, 14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5, 24: 3.0,
});
/** ASME B1.1 / B18.6.3 machine-screw nominal MAJOR diameter (inch) by number size (#0..#12). */
const SCREW_MAJOR_DIA_IN: Readonly<Record<number, number>> = Object.freeze({
  0: 0.06, 1: 0.073, 2: 0.086, 3: 0.099, 4: 0.112, 5: 0.125, 6: 0.138, 8: 0.164, 10: 0.19, 12: 0.216,
});

// Multiplication sign (U+00D7) built via fromCharCode so this source stays pure ASCII while the
// regex still matches the VLM-emitted "M6<mult>1.0" form (byte-parity with the .mjs `/x/gi`).
const MULT_SIGN_RE = new RegExp(String.fromCharCode(0xd7), "gi");
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

export type ThreadSystem = "unified" | "metric" | "npt";

export interface ThreadNorm {
  system: ThreadSystem | null;
  series: string | null;
  major_dia_in: number | null;
  tpi: number | null;
  pitch_mm: number | null;
  class: string | null;
  resolved: boolean;
  assumed: boolean;
}

const unresolved = (): ThreadNorm => ({
  system: null, series: null, major_dia_in: null, tpi: null, pitch_mm: null, class: null, resolved: false, assumed: false,
});

/** Pure: fractional-inch token ("1/4", "27/64") -> decimal inch, else null. */
function fracInch(tok: string): number | null {
  const m = tok.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]), d = Number(m[2]);
  return d > 0 ? round4(n / d) : null;
}

/**
 * Parse a THREAD callout into a canonical, machine-usable spec. Pure.
 * @param raw the callout text, e.g. "1/4-20 UNC-2B", "M6x1.0", "1/4 NPT".
 * @returns the structured spec; resolved=false (major_dia_in=null) when it is not a recognizable
 *   thread -- never fabricated (R12).
 */
export function normalizeThreadCallout(raw: unknown): ThreadNorm {
  if (raw == null) return unresolved();
  let s = String(raw).trim();
  if (!s) return unresolved();
  // de-garble: any unicode dash (Pd category) -> hyphen, multiplication-sign -> x, collapse whitespace.
  s = s.replace(/\p{Pd}/gu, "-").replace(MULT_SIGN_RE, "x").replace(/\s+/g, " ").trim();
  const U = s.toUpperCase();

  // material/grade guard (R12): a tool-steel grade or hardness spec ("M2 STEEL", "D2 RC60", "HSS") is
  // NOT a thread even though "M2" matches the metric pattern. JM Die runs M2/A2/D2 tool steels.
  if (/\bSTEEL\b|\bHSS\b|\bCARBIDE\b|\bAISI\b|\bHARDNESS\b|\bHARDEN(?:ED)?\b|\bH?RC\b|\bTOOL\b|\bMATERIAL\b|\bMAT'?L\b/.test(U)) {
    return unresolved();
  }

  // METRIC: M<major>[xP][-class]. A bare "M6" implies the ISO-261 coarse pitch (flagged assumed).
  const mm = U.match(/\bM\s*(\d+(?:\.\d+)?)(?:\s*X\s*(\d+(?:\.\d+)?))?(?:\s*-\s*(\d[A-Z]+\d?[A-Z]?))?\b/);
  if (mm && !/\bMIN\b|\bMAX\b/.test(U)) {
    const majorMm = Number(mm[1]);
    let pitchMm: number | null = mm[2] != null ? Number(mm[2]) : null;
    let assumed = false;
    if (pitchMm == null) { pitchMm = M_COARSE_PITCH_MM[majorMm] ?? null; assumed = pitchMm != null; }
    return {
      system: "metric", series: "M", major_dia_in: majorMm > 0 ? round4(majorMm / MM_PER_INCH) : null,
      tpi: null, pitch_mm: pitchMm, class: mm[3] || null, resolved: majorMm > 0, assumed,
    };
  }

  // NPT/NPTF pipe: nominal pipe size is NOT the thread major diameter -> major_dia_in null (honest).
  if (/\bNPTF?\b/.test(U)) {
    const series = /\bNPTF\b/.test(U) ? "NPTF" : "NPT";
    const tpiM = U.match(/-\s*(\d{1,2})\s*NPT/);
    return {
      system: "npt", series, major_dia_in: null, tpi: tpiM ? Number(tpiM[1]) : null, pitch_mm: null,
      class: null, resolved: true, assumed: false,
    };
  }

  // UNIFIED inch: <size>-<tpi> [series] [class]. size = fraction (1/4), decimal (.250), screw (#10), int (1).
  const uni = U.match(/(#\s*\d{1,2}|\d+\s*\/\s*\d+|\d*\.\d+|\d+)\s*-\s*(\d{1,2})(?:\s*(UNEF|UNF|UNC|UNS|UN))?(?:\s*-?\s*(\d[AB]))?/);
  if (uni) {
    const sizeTok = uni[1].replace(/\s+/g, "");
    const hasSeries = uni[3] != null, hasClass = uni[4] != null;
    const strongSize = sizeTok.startsWith("#") || sizeTok.includes("/") || sizeTok.includes(".");
    // self-safe: a bare integer-integer with no series/class/fraction/screw is a RANGE, not a thread.
    if (strongSize || hasSeries || hasClass) {
      const tpi = Number(uni[2]);
      let majorIn: number | null = null;
      if (sizeTok.startsWith("#")) majorIn = SCREW_MAJOR_DIA_IN[Number(sizeTok.slice(1))] ?? null;
      else if (sizeTok.includes("/")) majorIn = fracInch(sizeTok);
      else {
        // a bare integer in #0..#12 with a SCREW-class tpi (>=16) is a NUMBER screw written without '#'
        // ("10-24 UNC" = #10 .190in, not a 10-INCH thread); a LOW tpi (<16) on a small int is an INCH
        // thread ("1-8 UNC" = 1in). Disambiguate by tpi.
        const n = Number(sizeTok);
        majorIn = (Number.isInteger(n) && n >= 0 && n <= 12 && SCREW_MAJOR_DIA_IN[n] != null && tpi >= 16)
          ? SCREW_MAJOR_DIA_IN[n] : n;
      }
      if (majorIn != null && majorIn > 0 && majorIn <= MAX_THREAD_MAJOR_IN && tpi > 0) {
        return {
          system: "unified", series: hasSeries ? (uni[3] as string) : "UN", major_dia_in: round4(majorIn),
          tpi, pitch_mm: null, class: uni[4] || null, resolved: true, assumed: !hasSeries,
        };
      }
    }
  }
  return unresolved();
}

/**
 * Resolve a dimension's thread enrichment ONLY when the context indicates a thread -- the dim type is
 * thread-ish, OR the raw_text carries a thread signature (metric MxP, a Unified series keyword, NPT, or a
 * fraction/screw-dash-tpi). This gate (beyond normalizeThreadCallout's self-safety) keeps a plain linear
 * "1-2" dim from ever being probed as a thread. Returns the resolved spec or undefined.
 */
export function resolveThread(type: unknown, rawText: unknown): ThreadNorm | undefined {
  if (typeof rawText !== "string" || !rawText) return undefined;
  const t = typeof type === "string" ? type.toLowerCase() : "";
  const isThreadType = t === "thread" || t === "tapped_hole" || t === "thread_callout" || t === "tap";
  const up = rawText.toUpperCase();
  const looksThread = /\bM\s*\d/.test(up) || /\bUN(C|F|EF|S)?\b/.test(up) || /\bNPTF?\b/.test(up)
    || /(?:\d\s*\/\s*\d+|#\s*\d{1,2})\s*-\s*\d/.test(rawText);
  if (!isThreadType && !looksThread) return undefined;
  const spec = normalizeThreadCallout(rawText);
  return spec.resolved ? spec : undefined;
}
