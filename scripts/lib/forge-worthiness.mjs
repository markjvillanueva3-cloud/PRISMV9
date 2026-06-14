// forge-worthiness.mjs -- EXTRACTION-FORGE-MS0 (slot:bravo 2026-06-12)
//
// Coarse PRE-FILTER: is a piece of extracted content a candidate to become a new
// computational CAPABILITY (engine/algorithm/formula via /forge-triple), vs a plain
// knowledge TIP (already ingested by the tribal-intake)? This is a deliberately
// conservative gate -- the REAL worthiness decision is /forge-triple itself (Claude
// judgment + DuplicationGuard) when the autonomous /loop drains the queue. Two stages
// keep the queue from flooding while never auto-building anything.
//
// Thresholds + the FORGE-QUEUE decision concept mirror scripts/lib/course-data-router-lib.mjs
// (the Lane-C forge gate) so the two mechanisms agree on what "forge-worthy" means.

// Mirror of course-data-router-lib THRESHOLDS (engines need more justification than algorithms).
export const FORGE_THRESHOLDS = Object.freeze({ algorithm: 0.5, engine: 0.6, formula: 0.3 });
const MIN_LEN = 40; // chars -- below this there is not enough to judge a capability

// Capability language: a COMPUTABLE method/model/formula (positive signal).
const CAPABILITY_RE = /\b(algorithm|formula|equation|theorem|coefficient|solver|optimiz(?:e|ation)|deriv(?:e|ation)|comput(?:e|ation|es)|calculat(?:e|ion|es)|predict(?:s|ion)?|estimat(?:e|ion|es)|interpolat\w*|regression|kinematics?|dynamics?|stability\s+lobe|tool\s*life|chip\s*thinning)\b/gi;
// A real formula/equation pattern (strong capability signal).
const MATH_RE = /[A-Za-z_]\w*\s*=\s*[^=\n]{2,}|[)\d]\s*[*/^]\s*[A-Za-z(]/;
// System/component language => engine-kind candidate.
const ENGINE_RE = /\b(engine|pipeline|orchestrat\w*|framework|generator|classifier|detector|simulat\w*|state\s*machine)\b/gi;
// Advice/fact framing (negative -- a tip, not a capability).
const TIP_RE = /\b(tip|remember|make sure|best practice|rule of thumb|pro tip|don'?t forget|you should|always\b|never\b|avoid\b|recommend\w*)\b/gi;

function count(re, text) { const m = text.match(re); return m ? m.length : 0; }

/**
 * Classify extracted content. Returns {worthy, kind, score, conceptName, reason}.
 * `kind` is one of engine|algorithm|formula|null. Pure.
 */
export function classifyForgeWorthiness(text, meta = {}) {
  if (typeof text !== "string" || text.trim().length < MIN_LEN) {
    return { worthy: false, kind: null, score: 0, conceptName: null, reason: "too short/empty" };
  }
  const words = Math.max(1, text.split(/\s+/).length);
  const norm = Math.sqrt(words); // length-normalize so a long doc is not auto-worthy
  const cap = count(CAPABILITY_RE, text);
  const tip = count(TIP_RE, text);
  const eng = count(ENGINE_RE, text);
  const hasMath = MATH_RE.test(text);

  // Score in [0,1]: capability density (+ a real equation) minus tip-framing density.
  let score = (cap / norm) * 6 + (hasMath ? 0.35 : 0) - (tip / norm) * 4;
  score = Math.max(0, Math.min(1, score));

  // Kind by descending justification bar. Engine needs system-language too.
  let kind = null;
  if (score >= FORGE_THRESHOLDS.engine && eng > 0) kind = "engine";
  else if (score >= FORGE_THRESHOLDS.algorithm && cap > 0) kind = "algorithm";
  else if (score >= FORGE_THRESHOLDS.formula && hasMath) kind = "formula";

  const worthy = kind !== null;
  return {
    worthy,
    kind,
    score: Number(score.toFixed(3)),
    conceptName: worthy ? deriveConceptName(text, meta) : null,
    reason: worthy
      ? `cap=${cap} math=${hasMath} eng=${eng} tip=${tip} -> ${kind}@${score.toFixed(2)}`
      : `score ${score.toFixed(2)} < forge floor (cap=${cap} tip=${tip} math=${hasMath})`,
  };
}

/** Derive a short concept name from frontmatter title, first heading, or first sentence. Pure. */
export function deriveConceptName(text, meta = {}) {
  if (meta && typeof meta.title === "string" && meta.title.trim()) return meta.title.trim().slice(0, 80);
  const body = typeof text === "string" ? text : "";
  const h = body.match(/^#{1,6}\s+(.+)$/m);
  if (h) return h[1].trim().slice(0, 80);
  return (body.trim().split(/[.\n]/)[0] || "").trim().slice(0, 80) || "untitled-concept";
}

/** The /forge-triple invocation a queued candidate maps to. Pure. */
export function forgeActionFor(candidate) {
  const kind = candidate && candidate.kind ? candidate.kind : "engine";
  const name = (candidate && candidate.conceptName ? candidate.conceptName : "concept")
    .replace(/[^A-Za-z0-9 ]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 60);
  return `/forge-triple ${kind}:${name}`;
}
