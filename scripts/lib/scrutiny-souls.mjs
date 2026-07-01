/**
 * scrutiny-souls.mjs -- the catalog of scrutiny "souls" (distinct reviewer personas) + the pure
 * verdict-parse / merge logic for the Hermes-soul scrutiny arm (OCTOPUS-SCRUTINY-SOULS Part B).
 *
 * The 3-of-3 scrutiny gate uses Codex + 2 Claude reviewer agents. This adds a CHEAP, $0/off-Claude
 * ADVISORY arm: N distinct souls each review the session diff via the Hermes (NVIDIA) lane with a
 * DISTINCT system prompt (persona), giving review DIVERSITY the 3 arms might miss -- at no Claude
 * token cost. ADVISORY ONLY: never blocks the strict 3-of-3 (R7 -- the 3 Claude arms stay canonical).
 *
 * Distinct from the octopus brainstorm lenses (safety-first/root-cause/...): these are CODE-REVIEW
 * souls. Pure functions (exported, unit-tested) + a thin impure shell (scrutiny-hermes-souls.mjs).
 *
 * Karpathy: CLASSIFY=transform(diff -> N persona reviews -> merged verdict); EDGE CASES=empty diff,
 * non-PASS/FAIL text, all-skip on Hermes-down; FAILURE MODES=Hermes lane down -> fail-soft skipped.
 */

/** The scrutiny souls -- each a distinct review LENS as a system prompt. Adding/removing a soul here
 *  is the single source of truth for the Hermes-soul arm. Kept terse: each bounds its own output. */
export const SCRUTINY_SOULS = [
  {
    id: "correctness-hawk",
    name: "Correctness Hawk",
    system:
      "You are the Correctness Hawk, a code reviewer obsessed with LOGIC errors. Review ONLY for: " +
      "wrong operators/conditions, off-by-one, unhandled null/undefined/empty/NaN/overflow, async races, " +
      "incorrect control flow, and edge cases the author missed. Ignore style. For each real issue give " +
      "file:line + one line. End your reply with a final line exactly 'VERDICT: PASS' (no logic defect found) " +
      "or 'VERDICT: FAIL' (a real logic defect found). Be terse.",
  },
  {
    id: "security-skeptic",
    name: "Security Skeptic",
    system:
      "You are the Security Skeptic. Review ONLY for: injection (shell/SQL/path-traversal), secret/credential " +
      "leakage into logs/commits/URLs, unsafe deserialization, missing input validation on external data, " +
      "auth/permission bypass, and unsafe file/network I/O. For each real risk give file:line + one line. End " +
      "with a final line exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Be terse.",
  },
  {
    id: "test-integrity",
    name: "Test Integrity",
    system:
      "You are the Test Integrity reviewer. Review ONLY the tests in the diff for: stub assertions " +
      "(toBeDefined/truthy with no real value), accidentally committed .skip/.only, hardcoded expected values " +
      "that would pass even if the logic broke, and missing failure-mode/edge-case coverage. A test that cannot " +
      "fail when the business logic changes is worthless. For each issue give file:line + one line. End with a " +
      "final line exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Be terse.",
  },
  {
    id: "regression-hunter",
    name: "Regression Hunter",
    system:
      "You are the Regression Hunter. Review ONLY for SILENT breakage: removed/changed behavior a caller " +
      "depends on, changed function/return contracts, a fix that greens one path while breaking another, and " +
      "blast-radius the diff does not account for. For each risk give file:line + one line. End with a final " +
      "line exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Be terse.",
  },
  {
    id: "convention-enforcer",
    name: "Convention Enforcer",
    system:
      "You are the Convention Enforcer for the PRISM codebase. Review ONLY for: inlined physics/magic " +
      "constants that should be imported from a canonical source, naming/idiom drift from surrounding code, " +
      "missing error handling vs the file's pattern, and code that does not read like its neighbors. For each " +
      "issue give file:line + one line. End with a final line exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Be terse.",
  },
];

/** Pure: extract a soul's PASS/FAIL verdict from its free-text reply. Looks for the canonical
 *  'VERDICT: PASS|FAIL' line (case-insensitive, last occurrence wins); a reply with neither token is
 *  treated as 'unknown' (advisory -> does not count as a FAIL, but is surfaced). Never throws.
 *  @param {string} text  the soul's reply
 *  @returns {{verdict: "pass"|"fail"|"unknown", line: string|null}} */
export function parseSoulVerdict(text) {
  if (typeof text !== "string" || !text.trim()) return { verdict: "unknown", line: null };
  const matches = [...text.matchAll(/VERDICT:\s*(PASS|FAIL)/gi)];
  if (matches.length === 0) {
    // tolerate a bare PASS/FAIL token if the model dropped the prefix
    if (/\bFAIL\b/i.test(text) && !/\bPASS\b/i.test(text)) return { verdict: "fail", line: null };
    return { verdict: "unknown", line: null };
  }
  const last = matches[matches.length - 1];
  return { verdict: last[1].toLowerCase() === "fail" ? "fail" : "pass", line: last[0] };
}

/** Pure: fold N per-soul results into an advisory summary. A result is
 *  {soul, name, ok (the Hermes call succeeded), verdict, findings}. Returns counts + the FAIL souls'
 *  findings + an overall advisory grade ('clean' = no FAIL among souls that answered; 'concerns' = >=1
 *  FAIL; 'degraded' = the Hermes lane answered for <2 souls so the arm is not trustworthy this run).
 *  ADVISORY: this never sets a blocking verdict -- the 3-of-3 Claude arms are the gate (R7).
 *  @param {Array<{soul:string,name:string,ok:boolean,verdict:string,findings:string}>} results
 *  @returns {{answered:number, total:number, fails:number, unknowns:number, grade:string, failSouls:Array, advisory:true}} */
export function mergeSoulReviews(results) {
  const list = Array.isArray(results) ? results : [];
  const answered = list.filter((r) => r && r.ok).length;
  const fails = list.filter((r) => r && r.ok && r.verdict === "fail");
  const unknowns = list.filter((r) => r && r.ok && r.verdict === "unknown").length;
  let grade;
  if (answered < 2) grade = "degraded"; // not enough souls reached the lane to trust the arm
  else if (fails.length > 0) grade = "concerns";
  else grade = "clean";
  return {
    answered,
    total: list.length,
    fails: fails.length,
    unknowns,
    grade,
    failSouls: fails.map((r) => ({ soul: r.soul, name: r.name, findings: (r.findings || "").slice(0, 800) })),
    advisory: true,
  };
}

/** Pure: a one-line human banner for the merged result (surfaced to the chat before it records the
 *  3-of-3 verdicts). Never blocks. */
export function renderSoulBanner(merged) {
  if (!merged || typeof merged !== "object") return "[hermes-souls] no result";
  const { answered, total, fails, grade } = merged;
  const tag = grade === "concerns" ? `${fails} soul(s) flagged concerns` : grade === "degraded" ? "lane degraded (advisory unreliable this run)" : "no soul concerns";
  return `[hermes-souls] ADVISORY ${answered}/${total} souls answered -- ${tag} (does NOT affect the 3-of-3 gate)`;
}
