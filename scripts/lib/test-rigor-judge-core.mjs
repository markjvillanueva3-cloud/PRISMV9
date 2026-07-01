// tier: T3
// test-rigor-judge-core.mjs -- pure (no-IO, no-LLM) core of the AI test-rigor
// judge. The judge is the SEMANTIC layer the deterministic rigor floor
// (detectShallowCriticalTest in test-legitimacy-core.mjs) explicitly defers to:
// regex can flag a THIN critical-domain test but cannot tell a valuable
// regression-lock from a lazy stub. An LLM reads the TEST + its SOURCE (SUT)
// and answers "would at least one assertion FAIL if the source regressed?".
//
// This module is pure so it is fully unit-testable WITHOUT a live model:
//   - resolveSutPath: find the source file a test exercises
//   - buildJudgePrompt: deterministic prompt assembly
//   - parseJudgeResponse: robust JSON extraction + normalization
// The CLI (scripts/test-rigor-judge.mjs) supplies the IO + the LLM call.
import path from "node:path";
import fs from "node:fs";

const REL_IMPORT_RE = /import\s+[^'"]*from\s+['"](\.\.?\/[^'"]+)['"]/g;
const SUT_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
// Imports that are clearly NOT the subject under test.
const NON_SUT_RE = /(?:vitest|jest|@testing-library|test-utils|\/setup|\.setup|mock|fixture|helpers?\/)/i;

// Verdict score bands + prompt budget (named so they are not "magic numbers").
const RIGOROUS_MIN_SCORE = 70;
const SHALLOW_MIN_SCORE = 40;
const DEFAULT_MAX_CHARS = 12000;
const MAX_MISSING_ITEMS = 12;
const MAX_RATIONALE_CHARS = 400;

/** Every relative (`./` or `../`) import specifier in the file, in source order. */
export function extractRelativeImports(content = "") {
  const out = [];
  for (const m of String(content).matchAll(REL_IMPORT_RE)) out.push(m[1]);
  return out;
}

function baseToken(p) {
  return path.posix
    .basename(String(p).replace(/\\/g, "/"))
    .replace(/\.(test|spec)\.[^.]+$/i, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Resolve the SUT (source-under-test) path for a test file. Picks the relative
 * import whose basename best matches the test basename; else the first
 * non-framework relative import. Tries common extensions + /index. `exists` is
 * injectable so this is unit-testable against a virtual filesystem.
 * Returns an absolute forward-slash path, or null if none resolves.
 */
export function resolveSutPath(testFilePath, testContent, exists = fs.existsSync) {
  if (!testFilePath) return null;
  const dir = path.dirname(testFilePath);
  const imports = extractRelativeImports(testContent).filter((s) => !NON_SUT_RE.test(s));
  if (imports.length === 0) return null;

  const testBase = baseToken(testFilePath);
  const ranked = [...imports].sort(
    (a, b) => (baseToken(a) === testBase ? 0 : 1) - (baseToken(b) === testBase ? 0 : 1),
  );

  for (const spec of ranked) {
    const baseAbs = path.resolve(dir, spec);
    // TS NodeNext: imports carry a `.js` specifier but the source is `.ts`/`.tsx`.
    // Strip any JS/TS extension and re-try every source extension on the base,
    // so `../engines/X.js` resolves to the real `../engines/X.ts` on disk.
    const noExt = baseAbs.replace(/\.(?:js|jsx|mjs|cjs|ts|tsx)$/i, "");
    const candidates = [];
    if (/\.[a-z]+$/i.test(spec)) candidates.push(baseAbs); // literal (e.g. a real .json/.css)
    for (const ext of SUT_EXTS) candidates.push(noExt + ext);
    for (const ext of SUT_EXTS) candidates.push(path.join(baseAbs, "index" + ext));
    for (const c of candidates) {
      try { if (exists(c)) return c.replace(/\\/g, "/"); } catch { /* keep trying */ }
    }
  }
  return null;
}

function clip(s, n) {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n) + "\n/* ...truncated for prompt budget... */" : t;
}

/**
 * Deterministic judge prompt. Instructs the model to return ONLY a JSON verdict.
 * SOURCE + TEST are clipped to a char budget so local models stay in context.
 */
export function buildJudgePrompt(testContent, sutContent, opts = {}) {
  const maxSut = opts.maxSutChars || DEFAULT_MAX_CHARS;
  const maxTest = opts.maxTestChars || DEFAULT_MAX_CHARS;
  return [
    "You are a strict test-quality auditor for a CNC manufacturing platform.",
    "Given a SOURCE module (the subject under test) and its TEST file, decide whether the test genuinely verifies the source's behavior: would at least one assertion FAIL if the source's core logic regressed?",
    "",
    "Respond with ONLY a single JSON object. No prose. No markdown fence.",
    '{"rigorScore": <integer 0-100>, "wouldCatchRegression": <true|false>, "verdict": "rigorous"|"shallow"|"weak", "missingCoverage": [<short strings>], "rationale": "<one sentence>"}',
    "",
    "Scoring rules:",
    '- "weak": only assertions that cannot change when logic breaks (tautologies, hardcoded echoes, presence-only checks). Set wouldCatchRegression=false.',
    '- "shallow": real reference-value assertions but NO error-path, edge-input, or adversarial coverage.',
    '- "rigorous": real reference values AND failure-mode (throws/rejects) and/or adversarial (NaN/Infinity/boundary/overflow) coverage.',
    "missingCoverage: concrete failure modes or edge inputs the SOURCE handles that the TEST does not probe (empty if none).",
    "",
    "----- SOURCE BEGIN -----",
    clip(sutContent, maxSut),
    "----- SOURCE END -----",
    "",
    "----- TEST BEGIN -----",
    clip(testContent, maxTest),
    "----- TEST END -----",
  ].join("\n");
}

const VERDICTS = ["rigorous", "shallow", "weak"];

function normalizeVerdict(o) {
  const n = Number(o && o.rigorScore);
  const score = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  const verdict = VERDICTS.includes(o && o.verdict)
    ? o.verdict
    : score >= RIGOROUS_MIN_SCORE ? "rigorous" : score >= SHALLOW_MIN_SCORE ? "shallow" : "weak";
  return {
    rigorScore: score,
    wouldCatchRegression: (o && o.wouldCatchRegression) === true,
    verdict,
    missingCoverage: Array.isArray(o && o.missingCoverage) ? o.missingCoverage.map(String).slice(0, MAX_MISSING_ITEMS) : [],
    rationale: o && typeof o.rationale === "string" ? o.rationale.slice(0, MAX_RATIONALE_CHARS) : "",
  };
}

/**
 * Robustly extract the JSON verdict from a model response: strips a code fence,
 * finds the first balanced {...} (quote-aware), parses, and normalizes / clamps
 * the shape. Returns { ok:true, verdict } or { ok:false, error }.
 */
export function parseJudgeResponse(text) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "empty-response" };
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();

  const start = raw.indexOf("{");
  if (start < 0) return { ok: false, error: "no-json-object" };

  let depth = 0, end = -1, inStr = false, quote = null;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (c === quote) {
        // Count the run of preceding backslashes -- an EVEN count means the
        // quote is unescaped (a single-char check mis-handles "...\\\\" and
        // would never close the string -> false unbalanced-json).
        let bs = 0;
        for (let k = i - 1; k >= start && raw[k] === "\\"; k--) bs++;
        if (bs % 2 === 0) inStr = false;
      }
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return { ok: false, error: "unbalanced-json" };

  let obj;
  try { obj = JSON.parse(raw.slice(start, end + 1)); }
  catch (e) { return { ok: false, error: "json-parse: " + (e && e.message) }; }
  if (!obj || typeof obj !== "object") return { ok: false, error: "not-an-object" };
  return { ok: true, verdict: normalizeVerdict(obj) };
}
