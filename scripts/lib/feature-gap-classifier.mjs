/**
 * feature-gap-classifier.mjs — pure classifier for FEATURE-GAP-AUDIT-MS0 units
 * ============================================================================
 *
 * Unit: FEATURE-GAP-AUDIT-MS0::U-FEATURE-GAP-DEDUP-WIN-RECONCILER (slot india, 2026-05-19).
 *
 * The FEATURE-GAP-AUDIT-2026-05-17 audit (juliett /forge-audit-v2) produced 68
 * units across 13 domains. R8 inspection of the india/post wedge of that audit
 * (this session) found that the AUDIT SIGNAL HAS ROTTED — 4 of the 5 sampled
 * post-domain units (U-BRIDGE-WIRE-OKUMA, U-GAP-POST-GCODE-BACKPLOT,
 * U-GAP-POST-RL-POSTPROCESSOR, U-GAP-POST-JMDIE-LEARNING) turn out to be DEDUP
 * WINS — the engines exist on disk, are wired into dispatchers, and have test
 * coverage. The audit's "digest=0, absent" / "unwired" claims were
 * digest-staleness false-positives, the same class as
 * `reference_feature_gap_audit_cad_dedup_wins_2026_05_18` from delta /loop
 * yesterday (5/8 R8 dedup-wins in that batch).
 *
 * This classifier is the META TOOL that closes the loop: scan each audit unit
 * against actual disk reality (engine class exists? dispatcher wired? tests
 * present?) and emit a verdict per unit. Pure + injected-deps so the unit
 * tests don't touch the filesystem.
 *
 * DESIGN — Pure-core + injected-deps (R8 obey, R9 verify intent):
 *   - extractEngineSignatures(title)  → pure title-parser
 *   - classifyUnit(unit, fs)          → pure, fs is the injected reader bag
 *   - buildLedger(units, fs)          → pure, maps + aggregates
 *
 * CLI is a separate thin shell (`feature-gap-dedup-win-reconciler.mjs`).
 */

// ─────────────────────────────────────────────────────────────────────
// Title parsing
// ─────────────────────────────────────────────────────────────────────

/** Verdict enum — kept stable for the ledger schema. */
export const VERDICTS = Object.freeze({
  DEDUP_WIN: "DEDUP-WIN",              // engine + dispatcher + test all present
  PARTIAL_NO_WIRING: "PARTIAL-NO-WIRING",
  PARTIAL_NO_TESTS: "PARTIAL-NO-TESTS",
  PARTIAL_PORT_ONLY: "PARTIAL-PORT-ONLY",  // engine exists, no dispatcher, no test
  GENUINE_GAP: "GENUINE-GAP",          // no engine on disk
  BATCH_WIRE: "BATCH-WIRE",            // "Wire the ~N unwired X engines" pattern
  UNKNOWN: "UNKNOWN",                  // title doesn't match a known pattern
});

/** Title patterns. The audit's prose is restricted enough that two regexes cover ~90% of it. */
const RE_REMODULARIZE = /^Re-modularize\s+(PRISM_[A-Z0-9_]+_ENGINE|PRISM_[A-Z0-9_]+)\b/;
const RE_PRISM_TOKEN = /PRISM_[A-Z0-9_]+/g;           // global — catches every PRISM_X in compound titles
// "Re-modularize v8.89 X engines: A, B, C" — a third audit prose shape
// (U-GAP-MISC-OPTIMIZERS / U-GAP-MISC-DATA-STRUCTURES / U-GAP-ACADEMY-MIT-KERNELS).
// Capture the colon-tail engine list so they don't all silently fall to UNKNOWN.
const RE_REMODULARIZE_LIST = /^Re-modularize\b[^:]+:\s*([^()]+?)(?:\s+from\s+|\s*$|\s*\()/i;
const RE_WIRE_BATCH   = /^Wire\s+(?:the\s+)?~?\s*(\d+)\s+unwired\s+(\w+)\s+engines?\b/i;
const RE_WIRE_BATCH_NO_COUNT = /^Wire\s+(?:the\s+)?(\w+)\s+engines?\s+(?:to|into)\b/i;
// Pulls any parenthesized text — caller filters tokens that look like engine class names.
const RE_ENGINE_LIST  = /\(([^()]+)\)/;
// A token in a parenthesized list qualifies as a candidate engine name if it
// is PascalCase (starts upper, alnum thereafter) AND ≥4 chars (filters "s",
// "i", noise). Stored as a const so the parens-extractor and unit tests agree.
const RE_PASCALCASE_ENGINE = /^[A-Z][A-Za-z0-9]{3,}$/;
// Acronym threshold: a leading all-caps run-on token ≤ this many chars is
// treated as an acronym worth preserving in a candidate variant (FFT, RL, JM,
// GCODE). 5 covers GCODE, NURBS, FANUC etc; longer all-caps strings are rare
// enough that emitting noise variants outweighs the win.
const ACRONYM_PRESERVE_MAX_LEN = 5;

/**
 * Extract engine identity from a unit title.
 *
 * @param {string} title
 * @returns {{kind:"remodularize"|"wire-batch"|"wire-batch-no-count"|"unknown",
 *           prismToken?:string,
 *           engineCandidates:string[],
 *           batchDomain?:string,
 *           batchCount?:number,
 *           rawTitle:string}}
 */
export function extractEngineSignatures(title) {
  const t = String(title ?? "").trim();
  if (!t) return { kind: "unknown", engineCandidates: [], rawTitle: t };

  // 1) Re-modularize PRISM_X[_ENGINE] from v8.89 monolith
  //    Composite shape `PRISM_X + PRISM_Y` (9/32 real units) is handled here too:
  //    we collect EVERY PRISM_ token globally so a unit whose second engine is
  //    already shipped can dedup-win on that token alone.
  let m = t.match(RE_REMODULARIZE);
  if (m) {
    const primaryToken = m[1];
    const allTokens = [...t.matchAll(RE_PRISM_TOKEN)].map(x => x[0]);
    /** @type {string[]} */
    const allCandidates = [];
    for (const tok of allTokens) {
      const stripped = tok.replace(/^PRISM_/, "").replace(/_ENGINE$/, "");
      const parts = stripped.split("_").filter(Boolean);
      for (const c of generateEngineCandidates(parts)) {
        if (!allCandidates.includes(c)) allCandidates.push(c);
      }
    }
    return {
      kind: "remodularize",
      prismToken: primaryToken,
      prismTokens: allTokens,
      engineCandidates: allCandidates,
      rawTitle: t,
    };
  }

  // 1b) Re-modularize <prose> X engines: A, B, C — colon-tail engine list
  //     (U-GAP-MISC-OPTIMIZERS / U-GAP-MISC-DATA-STRUCTURES / U-GAP-ACADEMY-MIT-KERNELS).
  //     Falls through to UNKNOWN today, classifier should at least try the named engines.
  m = t.match(RE_REMODULARIZE_LIST);
  if (m) {
    const listTail = m[1];
    const engineCandidates = extractEngineListFromText(listTail);
    return {
      kind: "remodularize-list",
      engineCandidates,
      rawTitle: t,
    };
  }

  // 2) Wire the ~N unwired DOMAIN engines (E1, E2, ...) — count present
  m = t.match(RE_WIRE_BATCH);
  if (m) {
    const batchCount = Number(m[1]);
    const batchDomain = m[2].toLowerCase();
    const namedEngines = extractEngineList(t);
    return {
      kind: "wire-batch",
      batchCount: Number.isFinite(batchCount) ? batchCount : undefined,
      batchDomain,
      engineCandidates: namedEngines,
      rawTitle: t,
    };
  }

  // 3) Wire <Domain> engines to <something> — count absent
  m = t.match(RE_WIRE_BATCH_NO_COUNT);
  if (m) {
    const batchDomain = m[1].toLowerCase();
    const namedEngines = extractEngineList(t);
    return {
      kind: "wire-batch-no-count",
      batchDomain,
      engineCandidates: namedEngines,
      rawTitle: t,
    };
  }

  return { kind: "unknown", engineCandidates: [], rawTitle: t };
}

/** Pull engine class names from a parenthesized list in a wire-batch title. */
function extractEngineList(title) {
  const m = title.match(RE_ENGINE_LIST);
  if (!m) return [];
  return extractEngineListFromText(m[1]);
}

/** Pure list-text extractor used by both the parens path and the colon-tail path. */
function extractEngineListFromText(text) {
  return String(text ?? "")
    .split(/[,;]|\s+\+\s+/)
    .map(s => s.trim())
    .filter(s => RE_PASCALCASE_ENGINE.test(s))
    .flatMap(s => (s.endsWith("Engine") ? [s] : [s, `${s}Engine`]));
}

/**
 * Generate engine-class-name candidates from a stripped PRISM token list.
 *
 * PRISM convention emits engine class names that either preserve the leading
 * acronym (`FFTPredictiveChatterEngine`, `RLPostProcessorEngine`) OR drop the
 * modality prefix (`BackplotEngine` from `PRISM_GCODE_BACKPLOT_ENGINE`). This
 * combinator emits BOTH the all-TitleCase variant AND the acronym-preserved
 * variant for every suffix (drop-N-leading-tokens, N=0..len-1), so the disk
 * reader has all the naming shapes the real codebase actually uses.
 *
 * @param {string[]} tokens — uppercase tokens, e.g. ["GCODE","BACKPLOT"]
 * @returns {string[]} candidate class names (deduped, deterministic order)
 */
function generateEngineCandidates(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  const out = new Set();
  for (let dropLeft = 0; dropLeft < tokens.length; dropLeft++) {
    const sub = tokens.slice(dropLeft);
    if (sub.length === 0) continue;
    // All-TitleCase variant: every token gets Capitalized-then-lowercased-rest.
    const titleCase = sub.map(toTitleCase).join("");
    out.add(`${titleCase}Engine`);
    // Acronym-preserved variant: keep leading all-caps token as-is, TitleCase
    // the rest. Only fires when the leading token looks like an acronym
    // (all upper-alphanum and ≤ ACRONYM_PRESERVE_MAX_LEN chars).
    if (/^[A-Z0-9]+$/.test(sub[0]) && sub[0].length <= ACRONYM_PRESERVE_MAX_LEN) {
      const headPreserved = sub[0] + sub.slice(1).map(toTitleCase).join("");
      out.add(`${headPreserved}Engine`);
    }
    // Acronym-prefix-split variant: handles tokens like "JMDIE" → "JM"+"Die"
    // where the audit author concatenated an acronym + a word into one
    // upper-case run. Only fires for leading all-caps tokens of length 4-5
    // (longer tokens generate too much noise). We split at position 2 (the
    // most common 2-char acronym boundary: JM, NC, FE, AI, ...).
    if (/^[A-Z]+$/.test(sub[0]) && sub[0].length >= 4 && sub[0].length <= 5) {
      const prefix = sub[0].slice(0, 2);
      const suffix = sub[0].slice(2);
      const splitHead = prefix + toTitleCase(suffix);
      const splitVariant = splitHead + sub.slice(1).map(toTitleCase).join("");
      out.add(`${splitVariant}Engine`);
    }
  }
  return [...out];
}

/** Capitalize first char + lowercase the rest. "FFT" → "Fft", "BACKPLOT" → "Backplot". */
function toTitleCase(tok) {
  if (!tok) return "";
  return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────
// Per-unit classification
// ─────────────────────────────────────────────────────────────────────

/**
 * Classify a single audit unit. PURE — takes an injected `fs` reader bag.
 *
 * @param {{unit_id:string, domain?:string, milestone?:string, title:string}} unit
 * @param {{
 *   findEngineFile: (candidate:string) => string|null,
 *   countDispatcherRefs: (engineFileBase:string) => number,
 *   findTestFiles: (engineFileBase:string) => string[],
 *   hasWireExempt: (engineFileBase:string) => boolean,
 * }} fs
 * @returns {{
 *   unit_id:string, title:string, kind:string, verdict:string,
 *   matched_engines: Array<{candidate:string, file:string, dispatcherRefs:number, testFiles:string[], wireExempt:boolean}>,
 *   findings: string[],
 *   confidence: number,
 * }}
 */
export function classifyUnit(unit, fs) {
  // ── malformed-unit guard (R12 fail-loud at the input boundary) ────
  if (!unit || typeof unit !== "object" || !unit.unit_id || typeof unit.title !== "string") {
    return {
      unit_id: unit?.unit_id ?? "(missing)",
      title: typeof unit?.title === "string" ? unit.title : "(missing)",
      kind: "malformed",
      verdict: VERDICTS.UNKNOWN,
      matched_engines: [],
      findings: ["malformed unit object: missing unit_id or non-string title"],
      confidence: 0,
    };
  }
  const sig = extractEngineSignatures(unit.title);
  const findings = [];
  /** @type {Array<{candidate:string, file:string, dispatcherRefs:number, testFiles:string[], wireExempt:boolean}>} */
  const matched = [];

  for (const candidate of sig.engineCandidates) {
    const file = fs.findEngineFile(candidate);
    if (!file) continue;
    // Strip BOTH `.test.ts` and `.ts` (in that order) and take the basename so a
    // future caller that hands a test-path doesn't get a wrong key.
    const fileBase = file.replace(/\.test\.ts$/, "").replace(/\.ts$/, "").split(/[\\/]/).pop();
    const dispatcherRefs = fs.countDispatcherRefs(fileBase);
    const testFiles = fs.findTestFiles(fileBase) || [];
    const wireExempt = !!fs.hasWireExempt(fileBase);
    matched.push({ candidate, file, dispatcherRefs, testFiles, wireExempt });
  }

  // ── verdict ────────────────────────────────────────────────────────
  if (sig.kind === "unknown") {
    findings.push("title does not match remodularize/wire-batch patterns");
    return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.UNKNOWN, matched_engines: matched, findings, confidence: 0 };
  }

  if (sig.kind === "wire-batch" || sig.kind === "wire-batch-no-count") {
    // Wire-batch is too coarse to dedup-win here — the named engines are
    // *representatives*, not an exhaustive list. We surface what we can verify
    // (named engines + their wiring) but pin the verdict to BATCH-WIRE so the
    // CLI report tells the operator to inspect with BUILD_STATE.NEEDS_WIRING.
    if (matched.length > 0) {
      const wiredCount = matched.filter(m => m.dispatcherRefs > 0 || m.wireExempt).length;
      findings.push(`wire-batch unit: ${wiredCount}/${matched.length} named representatives already wired (${matched.map(m => m.file.split(/[\\/]/).pop()).join(", ")})`);
    } else if (sig.engineCandidates.length > 0) {
      findings.push(`wire-batch unit: 0/${sig.engineCandidates.length} named representatives found on disk (${sig.engineCandidates.join(", ")})`);
    } else {
      findings.push("wire-batch unit: no named representatives in title");
    }
    return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.BATCH_WIRE, matched_engines: matched, findings, confidence: matched.length > 0 ? 0.6 : 0.3 };
  }

  // sig.kind === "remodularize" OR "remodularize-list"
  if (matched.length === 0) {
    findings.push(`no engine class matched candidates: ${sig.engineCandidates.join(", ")}`);
    return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.GENUINE_GAP, matched_engines: matched, findings, confidence: 0.7 };
  }

  // Pick the strongest matched engine. Score weighting (anti-shadowing):
  //   tests are worth MORE than wiring so a wired+tested non-exempt engine
  //   always wins over a WIRE-EXEMPT-no-tests sibling. Without this re-weight,
  //   stable-sort tie-break would silently shadow real DEDUP-WIN evidence
  //   behind a no-tests exempt match (arm-B P1).
  const best = matched.slice().sort((a, b) => {
    const score = m => (m.wireExempt || m.dispatcherRefs > 0 ? 1 : 0) + (m.testFiles.length > 0 ? 2 : 0);
    return score(b) - score(a);
  })[0];

  const hasWiring = best.dispatcherRefs > 0 || best.wireExempt;
  const hasTests = best.testFiles.length > 0;

  if (hasWiring && hasTests) {
    findings.push(
      `engine ${best.file.split(/[\\/]/).pop()} exists, ` +
      `${best.wireExempt ? "WIRE-EXEMPT" : best.dispatcherRefs + " dispatcher ref(s)"}, ` +
      `${best.testFiles.length} test file(s)`
    );
    return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.DEDUP_WIN, matched_engines: matched, findings, confidence: 0.95 };
  }
  if (hasWiring && !hasTests) {
    findings.push(`engine + wiring present, NO test coverage — real gap is tests`);
    return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.PARTIAL_NO_TESTS, matched_engines: matched, findings, confidence: 0.85 };
  }
  if (!hasWiring && hasTests) {
    findings.push(`engine + tests present, NO dispatcher wiring — real gap is wiring`);
    return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.PARTIAL_NO_WIRING, matched_engines: matched, findings, confidence: 0.85 };
  }
  findings.push(`engine ${best.file.split(/[\\/]/).pop()} on disk, but neither wired nor tested`);
  return { unit_id: unit.unit_id, title: unit.title, kind: sig.kind, verdict: VERDICTS.PARTIAL_PORT_ONLY, matched_engines: matched, findings, confidence: 0.8 };
}

// ─────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────

/**
 * @param {Array<{unit_id:string, domain?:string, milestone?:string, title:string}>} units
 * @param {{findEngineFile, countDispatcherRefs, findTestFiles, hasWireExempt}} fs
 * @returns {{schemaVersion:string, generatedAt:string, advisoryOnly:true, mustHumanVerify:true,
 *           summary:Record<string,number>, perDomain:Record<string,Record<string,number>>,
 *           units:Array<ReturnType<typeof classifyUnit> & {domain?:string, milestone?:string}>}}
 */
export function buildLedger(units, fs, { generatedAt = new Date().toISOString() } = {}) {
  const classified = units.map(u => ({
    ...classifyUnit(u, fs),
    domain: u.domain,
    milestone: u.milestone,
  }));

  const summary = {};
  const perDomain = {};
  for (const v of Object.values(VERDICTS)) summary[v] = 0;

  for (const c of classified) {
    summary[c.verdict] = (summary[c.verdict] ?? 0) + 1;
    const dom = c.domain ?? "(no-domain)";
    perDomain[dom] = perDomain[dom] ?? {};
    perDomain[dom][c.verdict] = (perDomain[dom][c.verdict] ?? 0) + 1;
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    advisoryOnly: true,
    mustHumanVerify: true,
    note: "Per-unit verdict against actual codebase reality. DEDUP-WIN units are ALREADY SHIPPED — close them out (status: completed). PARTIAL-* units name the REAL gap (tests vs wiring vs port). GENUINE-GAP / UNKNOWN need human review.",
    summary,
    perDomain,
    units: classified,
  };
}

/**
 * Render the ledger as a human-readable markdown report.
 *
 * @param {ReturnType<typeof buildLedger>} ledger
 * @returns {string}
 */
export function renderLedgerMarkdown(ledger) {
  const lines = [];
  lines.push(`# FEATURE-GAP-AUDIT-MS0 — Dedup-Win Reconciler Ledger`);
  lines.push("");
  lines.push(`Generated: ${ledger.generatedAt}`);
  lines.push(`Advisory only — must human-verify before flipping unit status.`);
  lines.push("");
  lines.push(`## Summary (${ledger.units.length} units)`);
  lines.push("");
  for (const [verdict, n] of Object.entries(ledger.summary)) {
    if (n > 0) lines.push(`- **${verdict}**: ${n}`);
  }
  lines.push("");
  lines.push(`## Per-domain breakdown`);
  lines.push("");
  for (const [dom, counts] of Object.entries(ledger.perDomain).sort()) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    lines.push(`### ${dom} (${total})`);
    for (const [verdict, n] of Object.entries(counts).sort()) {
      lines.push(`- ${verdict}: ${n}`);
    }
    lines.push("");
  }
  lines.push(`## DEDUP-WIN — close these out (status: completed)`);
  lines.push("");
  const dedup = ledger.units.filter(u => u.verdict === VERDICTS.DEDUP_WIN);
  if (dedup.length === 0) lines.push("_(none)_");
  for (const u of dedup) {
    lines.push(`- **${u.unit_id}** — ${u.findings.join("; ")}`);
  }
  lines.push("");
  lines.push(`## PARTIAL — real gap is named below (rescope the unit)`);
  lines.push("");
  const partials = ledger.units.filter(u => u.verdict.startsWith("PARTIAL-"));
  if (partials.length === 0) lines.push("_(none)_");
  for (const u of partials) {
    lines.push(`- **${u.unit_id}** [${u.verdict}] — ${u.findings.join("; ")}`);
  }
  lines.push("");
  lines.push(`## GENUINE-GAP — engine not on disk, port is real work`);
  lines.push("");
  const genuine = ledger.units.filter(u => u.verdict === VERDICTS.GENUINE_GAP);
  if (genuine.length === 0) lines.push("_(none)_");
  for (const u of genuine) {
    lines.push(`- **${u.unit_id}** — ${u.findings.join("; ")}`);
  }
  lines.push("");
  lines.push(`## BATCH-WIRE — coarse units, inspect BUILD_STATE.NEEDS_WIRING`);
  lines.push("");
  const batch = ledger.units.filter(u => u.verdict === VERDICTS.BATCH_WIRE);
  if (batch.length === 0) lines.push("_(none)_");
  for (const u of batch) {
    lines.push(`- **${u.unit_id}** — ${u.findings.join("; ")}`);
  }
  lines.push("");
  lines.push(`## UNKNOWN — title did not match audit conventions`);
  lines.push("");
  const unknown = ledger.units.filter(u => u.verdict === VERDICTS.UNKNOWN);
  if (unknown.length === 0) lines.push("_(none)_");
  for (const u of unknown) {
    lines.push(`- **${u.unit_id}** — ${u.title}`);
  }
  lines.push("");
  return lines.join("\n");
}
