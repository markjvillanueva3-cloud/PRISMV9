/**
 * Chamfer / countersink callout normalizer (PRODUCTION clone of the script-side
 * `scripts/lib/ollama-vision-extract-lib.mjs::normalizeChamferCallout` + its `maybeChamfer` gate).
 *
 * Parses a CHAMFER / COUNTERSINK callout the VLM emits as free text ("82 DEG CSK .375", ".03 X 45
 * CHAMFER") into a canonical spec. KEYWORD-GATED (R12): the overloaded "<a> X <b>" notation
 * ("2 X .500 DRILL" = quantity x size, not a chamfer) requires an explicit CSK / C'SINK / COUNTERSINK or
 * CHAMFER keyword and never fabricates a feature from a bare X-pair.
 *
 * Documented cross-boundary CLONE: the production MCP bundle cannot import the `.mjs`, so the logic is
 * duplicated here and PINNED IDENTICAL by parallel test suites (so the clones cannot silently diverge).
 * Mirrors the `surfaceFinishNormalize.ts` / `threadCalloutNormalize.ts` / `gdtSymbolNormalize.ts` dual-home
 * pattern. Pure-ASCII source (no Unicode literals needed).
 */

export interface ChamferNorm {
  type: "chamfer" | "countersink" | null;
  /** Included/edge-break angle in degrees (82/90/100/118/120 for csk; 45/30/60 for a chamfer). */
  angle_deg: number | null;
  /** Countersink major diameter (inches) -- countersink only. */
  diameter_in: number | null;
  /** Chamfer leg size (inches) -- chamfer only. */
  size_in: number | null;
  resolved: boolean;
  raw: string | null;
}

// Chamfer-angle plausibility bounds for the no-DEG "X <n>" shorthand: below MIN a 2-digit int is a leg
// size (.xx"), above MAX it is not a physical edge-break angle. Common chamfer angles (45/60/82/90/118/120).
const CHAMFER_ANGLE_MIN_DEG = 15;
const CHAMFER_ANGLE_MAX_DEG = 120;

/**
 * Pure: parse a CHAMFER / COUNTERSINK callout into a canonical spec. resolved=false when not a
 * recognizable chamfer/csk. The angle is the integer before DEG, or the bare integer in an X-pair (no DEG);
 * a chamfer with no stated angle returns angle_deg=null (the 45deg convention is the consumer's, not
 * fabricated here).
 */
export function normalizeChamferCallout(raw: unknown): ChamferNorm {
  const NIL: ChamferNorm = { type: null, angle_deg: null, diameter_in: null, size_in: null, resolved: false, raw: null };
  if (raw == null) return { ...NIL };
  const s = String(raw).replace(/\p{Pd}/gu, "-").replace(/\s+/g, " ").trim();
  if (!s) return { ...NIL };
  const U = s.toUpperCase();
  // included angle: a 2-3 digit INTEGER immediately before DEG/DEGREE (never a decimal dimension).
  const angleM = U.match(/(\d{2,3})\s*(?:DEG|DEGREE)/);
  const angle = angleM ? Number(angleM[1]) : null;
  // plausible diameter/leg decimals (0 < v < 20in); a bare integer (like the angle) is excluded.
  const decs = (U.match(/\d*\.\d+/g) || []).map(Number).filter((v) => v > 0 && v < 20);
  // COUNTERSINK -- a diameter-dimensioned conical recess. Keyword required.
  if (/\bCSK\b|C['` ]?\s*SINK|COUNTERSINK|\bC['` ]?SK\b/.test(U)) {
    const dia = decs.length ? Math.max(...decs) : null; // the csk diameter is the larger decimal
    return { type: "countersink", angle_deg: angle, diameter_in: dia, size_in: null, resolved: dia != null || angle != null, raw: s };
  }
  // CHAMFER -- an edge break, leg size + optional angle. Keyword required.
  if (/\bCHAMF/.test(U)) {
    const size = decs.length ? Math.min(...decs) : null; // the chamfer leg is the smaller decimal
    // angle: prefer the explicit "<n> DEG"; else the bare INTEGER in an X-pair (".03 X 45" or "45 X .03").
    // Decimal-exclusion lookarounds ensure a size like ".03" is never read as the angle, and a size-X-size
    // pair (".250 X .125") fabricates no angle (R12). Bounded MIN..MAX.
    let ang = angle;
    if (ang == null) {
      const xAng = U.match(/X\s*(?!\d*\.)(\d{2,3})\b|(?<![.\d])(\d{2,3})(?!\.)\s*X/);
      if (xAng) {
        const v = Number(xAng[1] ?? xAng[2]);
        if (v >= CHAMFER_ANGLE_MIN_DEG && v <= CHAMFER_ANGLE_MAX_DEG) ang = v;
      }
    }
    return { type: "chamfer", angle_deg: ang, diameter_in: null, size_in: size, resolved: size != null || ang != null, raw: s };
  }
  return { ...NIL, raw: s };
}

/**
 * Resolve a chamfer/csk enrichment ONLY when the dim type or raw_text carries a chamfer/csk signal
 * (the keyword gate -- mirrors the .mjs `maybeChamfer`). Returns undefined for a plain linear dim so the
 * overloaded "X" notation never invents a chamfer.
 */
export function resolveChamfer(type: unknown, rawText: unknown): ChamferNorm | undefined {
  if (typeof rawText !== "string" || !rawText) return undefined;
  const t = String(type ?? "").toLowerCase();
  const isChamferType = t === "chamfer" || t === "countersink" || t === "csk";
  const up = rawText.toUpperCase();
  const looksChamfer = /\bCSK\b|C['` ]?\s*SINK|COUNTERSINK|\bCHAMF/.test(up);
  if (!isChamferType && !looksChamfer) return undefined;
  const spec = normalizeChamferCallout(rawText);
  return spec.resolved ? spec : undefined;
}
