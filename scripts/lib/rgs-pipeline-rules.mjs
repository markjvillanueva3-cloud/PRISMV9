/**
 * rgs-pipeline-rules.mjs
 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
 * Frozen rule arrays — mutation throws in strict mode (deep-frozen via deepFreezeArray
 * per U-DOMAIN-RULES Arm A scrutiny P0-2; the docstring's contract now actually holds).
 *
 * Exports:
 *   matchPipelines(unit) -> {skill, why, confidence}[]  (always >=1 entry; all entries frozen)
 *   matchAgents(unit)    -> string[]  (deduped agent names, [] if no match)
 */

/**
 * Deep-freeze an array of plain-object entries so the docstring contract holds:
 * every entry's properties throw on assignment in strict mode (not just the
 * outer array's indices). Required because callers receive references to these
 * objects via .map() / [...spread]; shallow freeze let them mutate the shared
 * singleton state at runtime. Bounded depth — entries are flat shape only.
 */
function deepFreezeArray(arr) {
  for (const entry of arr) Object.freeze(entry);
  return Object.freeze(arr);
}

// ---------------------------------------------------------------------------
// Pipeline rules
// Each rule: { test: RegExp | { test(s:string):boolean }, skill: string, why: string, confidence: number }
// confidence range 0.6–0.85 for keyword matches; 0.3 for generic fallback.
// ---------------------------------------------------------------------------
const RULES = deepFreezeArray([
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
    // OR an explicit "new engine" phrase.
    // The literal `forge-triple` phrase was REMOVED as a trigger (P0-5): envelope
    // descriptions carry boilerplate "forge-triple ownership in milestone header"
    // which fired this rule on ~98.6% of units. A genuine triple is still caught
    // by the structural engine + skill/hook signal.
    // "Update README wording" matches neither -> does NOT match.
    // Implementation: custom test function avoids catastrophic-backtrack risk of .{0,N} spans.
    test: { test: (s) => (/engine\b/i.test(s) && /\b(skill|hook)\b/i.test(s)) || /\bnew engine\b/i.test(s) },
    skill: "/forge-triple",
    why: "unit creates an engine + skill + hook triple",
    confidence: 0.85,
  },
  {
    // U-DOMAIN-RULES tightening (RGS-TOOL-AUTOINVOKE-MS1): the original bare
    // /wire|dispatcher|unwired|orphan|wiring/i false-matched 'Wire EDM' units
    // on the literal token "wire" (punch-list P1 line: "'Wire EDM' units
    // false-match /wire-unwired"). The fix excludes wire-EDM context first,
    // then requires a structural wiring signal — \bunwired\b / \borphan\b /
    // \bdispatcher\b / \bwiring\b (gerund — narrower than bare "wire").
    // The existing regression test ("Wire BarEngine to dispatcher needs
    // wiring") still hits via the "dispatcher" + "wiring" branch.
    test: { test: (s) => {
      if (/\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i.test(s)) return false;
      return /\bunwired\b|\borphan\b|\bdispatcher\b|\bwiring\b/i.test(s);
    } },
    skill: "/wire-unwired",
    why: "unit involves wiring engines to dispatchers",
    confidence: 0.80,
  },
  // ---------------------------------------------------------------------------
  // U-DOMAIN-RULES (RGS-TOOL-AUTOINVOKE-MS1) — manufacturing-domain branches.
  // Routes units to the canonical Tier-3 parent skills (/mill, /lathe, /wedm,
  // /cam-strategy, /cad-from-blueprint). Closes the punch-list's 42% generic
  // fallback by giving the 5 highest-leverage process domains explicit rules.
  // All use \b word-boundaries to avoid false-fires (\bmill\b does NOT match
  // 'milligrams' or 'windmill'; \bcam\b does NOT match 'camera' or 'Cambridge').
  // Sub-skills (lathe-lora, wedm-audit, mill-studio, etc.) inherit through the
  // keyword cascade — they can register their own triggers later if needed.
  // ---------------------------------------------------------------------------
  {
    test: /\bmill(ing|-turn)?\b/i,
    skill: "/mill",
    why: "milling-domain unit — routes to the Tier-3 mill orchestrator",
    confidence: 0.80,
  },
  {
    // Polysemy guard (Arm A P0-1): bare `turning` matches "a turning point in
    // the project" and bare `okuma` matches "Okuma operator manual" — but
    // Okuma also builds HMCs/VMCs (MA-600, MB-46V, GENOS M460) and grinders,
    // so `okuma` solo is NOT a lathe-only signal. Structural test:
    //   • \blathe\b alone — unambiguous
    //   • \bmazak lathe\b — explicit pairing
    //   • okuma paired with a lathe-context model token (LT/LB/MULTUS/SimulTurn)
    //   • turning paired with a manufacturing-context noun
    test: { test: (s) => {
      if (/\blathe\b/i.test(s)) return true;
      if (/\bmazak\s+lathe\b/i.test(s)) return true;
      if (/\bokuma\b/i.test(s) && /\b(lt[-\s]?\d+|lb[-\s]?\d+|multus|simul[-\s]*turn|space[-\s]*turn|2sp|genos[-\s]*l)\b/i.test(s)) return true;
      if (/\bturning\b/i.test(s) && /\b(insert|tool|operation|program|cycle|cut|pass|finish|rough|center|spindle|chuck|sub[-\s]?spindle|css|toolpath|thread|groove|bore)\b/i.test(s)) return true;
      return false;
    } },
    skill: "/lathe",
    why: "lathe/turning-domain unit — routes to the Tier-3 lathe orchestrator",
    confidence: 0.80,
  },
  {
    test: /\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i,
    skill: "/wedm",
    why: "wire-EDM / sinker-EDM unit — routes to the Tier-3 WEDM orchestrator",
    confidence: 0.80,
  },
  {
    // "camming" is intentional — Mastercam's cam-feature/camming strategy
    // is a legitimate machining term (per Arm B P3 note).
    test: /\bcam(?:ming)?\b|\btoolpath\b/i,
    skill: "/cam-strategy",
    why: "CAM strategy / toolpath selection",
    confidence: 0.75,
  },
  {
    // Polysemy guard (Arm A P1-2): \bdrawing\b matched "drawing conclusions"
    // / "drawing power from the spindle" — too broad. Dropped. The remaining
    // tokens (\bcad\b, \bblueprint\b, \bprint-to-program\b) cover the real
    // CAD-intake surface. If a unit honestly says "engineering drawing review"
    // and matches nothing else, the operator can invoke /cad-from-blueprint
    // manually — R12 (fail loud) preferred over R12 (over-fire).
    test: /\bcad\b|\bblueprint\b|\bprint[-\s]*to[-\s]*program\b/i,
    skill: "/cad-from-blueprint",
    why: "CAD / blueprint intake — routes to the print-to-CAD pipeline",
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
const GENERIC_FALLBACK = deepFreezeArray([
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
const AGENT_RULES = deepFreezeArray([
  {
    test: /physics|kienzle|taylor|force|thermal|feed|speed/i,
    agent: "physics-reviewer",
  },
  {
    test: /\btest(s|ing)?\b|coverage\b/i,
    agent: "test-review-agent",
  },
  {
    // U-DOMAIN-RULES Arm A P3-2: the original /wire|dispatcher|unwired/i had
    // the EXACT same wire-EDM false-match bug class as the pipeline rule fixed
    // 30 lines above (a "Wire EDM corner physics fix" unit routed to
    // wiring-review-agent instead of physics-reviewer). Apply the same
    // structural exclusion: wire-EDM context => not wiring; otherwise require
    // a structural wiring noun.
    test: { test: (s) => {
      if (/\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b/i.test(s)) return false;
      return /\bunwired\b|\bdispatcher\b|\bwiring\b|\borphan\b/i.test(s);
    } },
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
