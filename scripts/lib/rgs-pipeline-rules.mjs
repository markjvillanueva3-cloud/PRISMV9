/**
 * rgs-pipeline-rules.mjs
 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
 * Frozen rule arrays — mutation throws in strict mode.
 *
 * Exports:
 *   matchPipelines(unit) -> {skill, why, confidence}[]  (always >=1 entry)
 *   matchAgents(unit)    -> string[]  (deduped agent names, [] if no match)
 */

// ---------------------------------------------------------------------------
// Pipeline rules
// Each rule: { test: RegExp | { test(s:string):boolean }, skill: string, why: string, confidence: number }
// confidence range 0.6–0.85 for keyword matches; 0.3 for generic fallback.
// ---------------------------------------------------------------------------
const RULES = Object.freeze([
  {
    test: /pdf|document|catalog|manual|datasheet/i,
    skill: "/pdf-learn",
    why: "unit involves PDF/document ingestion or parsing",
    confidence: 0.80,
  },
  {
    test: /video|youtube|tutorial|webinar/i,
    skill: "/video-learn",
    why: "unit involves video or tutorial content",
    confidence: 0.80,
  },
  {
    // Requires an actual build signal: engine\b (right-boundary only, catches FooEngine)
    // paired with skill/hook anywhere in the text (order-independent, no span regex),
    // OR explicit forge-triple / new-engine phrase.
    // "Update README wording" has neither -> does NOT match.
    // Implementation: custom test function avoids catastrophic-backtrack risk of .{0,N} spans.
    test: { test: (s) => (/engine\b/i.test(s) && /\b(skill|hook)\b/i.test(s)) || /forge.?triple/i.test(s) || /\bnew engine\b/i.test(s) },
    skill: "/forge-triple",
    why: "unit creates an engine + skill + hook triple",
    confidence: 0.85,
  },
  {
    test: /wire|dispatcher|unwired|orphan|wiring/i,
    skill: "/wire-unwired",
    why: "unit involves wiring engines to dispatchers",
    confidence: 0.80,
  },
  {
    // \btest covers "test", "tests", "testing"; \bcoverage\b etc.
    test: /\btest(s|ing)?\b|coverage|vitest|\bspec\b/i,
    skill: "test-team",
    why: "unit involves tests or coverage",
    confidence: 0.75,
  },
  {
    test: /scrutin|review|audit|quality/i,
    skill: "/scrutinize",
    why: "unit involves scrutiny, review, audit, or quality",
    confidence: 0.70,
  },
  {
    test: /dedup|duplicate/i,
    skill: "/dedup",
    why: "unit involves deduplication",
    confidence: 0.75,
  },
]);

// Generic fallback — returned when NO rules match.
// Uses /scrutinize (not /forge-triple) so the contrapositive test holds:
//   a pure-docs unit must NOT produce /forge-triple.
const GENERIC_FALLBACK = Object.freeze([
  {
    skill: "/scrutinize",
    why: "generic review fallback — no keyword matched",
    confidence: 0.30,
  },
]);

// ---------------------------------------------------------------------------
// Agent rules
// Each rule: { test: RegExp, agent: string }
// ---------------------------------------------------------------------------
const AGENT_RULES = Object.freeze([
  {
    test: /physics|kienzle|taylor|force|thermal|feed|speed/i,
    agent: "physics-reviewer",
  },
  {
    test: /\btest(s|ing)?\b|coverage\b/i,
    agent: "test-review-agent",
  },
  {
    test: /wire|dispatcher|unwired/i,
    agent: "wiring-review-agent",
  },
]);

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * matchPipelines — maps a unit to applicable PRISM dev-pipeline skills.
 * @param {{ title: string, description: string }} unit
 * @returns {{ skill: string, why: string, confidence: number }[]}
 *   Always returns at least one entry (generic fallback when no rule matches).
 */
export function matchPipelines(unit) {
  const text = `${unit.title || ""} ${unit.description || ""}`;
  const matched = RULES.filter((r) => r.test.test(text)).map(({ skill, why, confidence }) => ({
    skill,
    why,
    confidence,
  }));
  return matched.length > 0 ? matched : [...GENERIC_FALLBACK];
}

/**
 * matchAgents — maps a unit to applicable review agent types.
 * @param {{ title: string, description: string }} unit
 * @returns {string[]} deduped agent names; [] if no rule matches
 */
export function matchAgents(unit) {
  const text = `${unit.title || ""} ${unit.description || ""}`;
  const seen = new Set();
  for (const { test, agent } of AGENT_RULES) {
    if (test.test(text)) seen.add(agent);
  }
  return [...seen];
}
