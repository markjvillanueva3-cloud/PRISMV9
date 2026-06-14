/**
 * hook-broker-classifier.mjs — U-DOCKER-HOOK-BROKER-P1
 *
 * Pure-core hook content classifier. Given a Claude Code hook's source text,
 * decides which broker integration strategy that hook is compatible with:
 *
 *   - `module-safe`         — `export default fn(stdin)` shape, broker can
 *                             dynamic-import once and call in-process.
 *   - `cli-safe-stdin-stdout` — top-level reads stdin → writes JSON → exits;
 *                             broker can spawn-cache (warm subprocess + pipe).
 *   - `mutates-process`     — calls `spawnSync`, top-level `writeFileSync` to
 *                             non-test paths, or hard `process.exit(non-zero)`
 *                             outside the stdout-write path. Cannot share a
 *                             broker process; broker MUST spawn-isolate.
 *   - `imports-only`        — header-only shim (e.g. `_rpc-shim.mjs` itself),
 *                             no executable body. Broker ignores.
 *   - `empty`               — <100 bytes or no detectable hook logic.
 *   - `unknown`             — heuristics could not classify confidently.
 *
 * Heuristics are regex / line-scan, not full JS parsing. The classifier is
 * deliberately conservative — anything ambiguous lands in `unknown` so the
 * broker default is "spawn-isolate, don't share". This is the right side of
 * any error: a misclassified spawn-isolated hook costs cold-start; a
 * misclassified shared hook costs corrupted broker state.
 *
 * Mutation detection (`detectMutations`) runs against the full source text
 * intentionally — even mutations buried inside an exported async handler
 * disqualify a hook from in-process sharing, because the broker would
 * amplify those side effects across every chat using the shared module.
 * This means `mutates-process` is the *strongest* category: a hook lands
 * there whether the mutating call is at module scope or inside any handler.
 *
 * Known limitation (P1, accepted): `stripBlockBodies` is a brace counter,
 * not a parser. Regex literals containing `}` (e.g. `/}/`) inside a
 * function body can momentarily under-count depth, leaking body content
 * into the "top-level" view. The only downstream effect is that a hook
 * may be misclassified DOWN the safety ladder (module-safe → cli-safe or
 * cli-safe → unknown), never UP — `mutates-process` is determined by the
 * raw-text scan that ignores the brace counter entirely.
 *
 * @module hook-broker-classifier
 * @milestone U-DOCKER-HOOK-BROKER (Tier-1 prep — Phase 1 Survey)
 */

// ── Mutation regex set (scanned against the WHOLE file `text`, not the
// top-level stripped form — the broker's safety guarantee is that any
// hook which CAN mutate at runtime, even from inside an exported
// `async` handler, must be spawn-isolated. This is intentionally
// conservative: false-positives only cause more isolation, never less.)
// Closes Reviewer-B P0 #1 (missing fs.promises/exec/network detection)
// and P0 #2 (asymmetric module-scope vs file-wide checks).
const MUTATION_RE = Object.freeze({
  // child_process — every form
  spawnSync: /\bspawnSync\s*\(/,
  spawn: /(?<![A-Za-z0-9_$.])spawn\s*\(/,
  exec: /(?<![A-Za-z0-9_$.])exec\s*\(/,
  execSync: /\bexecSync\s*\(/,
  execFile: /\bexecFile(?:Sync)?\s*\(/,
  fork: /(?<![A-Za-z0-9_$.])fork\s*\(/,
  // fs — sync + async + promises
  writeFileSync: /\bwriteFileSync\s*\(/,
  writeFileAsync: /\bfs\.promises\.writeFile\s*\(|\bfsp\.writeFile\s*\(|\bwriteFile\s*\(/,
  appendFile: /\bappendFile(?:Sync)?\s*\(/,
  unlink: /\bunlink(?:Sync)?\s*\(/,
  rename: /\brename(?:Sync)?\s*\(/,
  mkdirSync: /\bmkdirSync\s*\(/,
  // network — fetch / http(s) / net
  fetch: /(?<![A-Za-z0-9_$.])fetch\s*\(/,
  httpRequest: /\bhttps?\.request\s*\(/,
  netConnect: /\bnet\.connect\s*\(|\bnet\.createConnection\s*\(/,
});

const RE = Object.freeze({
  // exports
  defaultExport: /^\s*export\s+default\s+/m,
  namedExportFn: /^\s*export\s+(async\s+)?function\s+\w+/m,
  // stdin / stdout / exit (top level only — line-anchored, not indented inside fn)
  // We require column-0 to avoid catching function-bodied versions.
  topStdinAwait: /^(?:await\s+)?(?:const|let|var)\s+\w+\s*=\s*await\s+new\s+Response\s*\(\s*process\.stdin\s*\)/m,
  topStdinHandler: /^process\.stdin\.(?:on|once)\s*\(/m,
  topStdoutWrite: /^process\.stdout\.write\s*\(/m,
  topConsoleLog: /^console\.log\s*\(/m,
  topProcessExit: /^process\.exit\s*\(/m,
  // imports (header signature)
  importLine: /^import\s+/m,
  // body indicators — any of these mean executable code exists
  anyFunctionDecl: /(?:^|\n)\s*(?:async\s+)?function\s+\w+/,
  anyArrowFn: /=>/,
  anyClassDecl: /(?:^|\n)\s*class\s+\w+/,
});

/**
 * Return true if any mutation regex matches the raw source text (NOT the
 * top-level-stripped form). Conservative-by-design: a hook that calls
 * `await fs.promises.writeFile(path, json)` inside an exported async handler
 * is still classified as `mutates-process` because the broker would amplify
 * those writes across every chat sharing the in-process module.
 *
 * @param {string} text
 * @returns {{ mutates: boolean, hits: string[] }}
 */
export function detectMutations(text) {
  const hits = [];
  for (const [name, re] of Object.entries(MUTATION_RE)) {
    if (re.test(text)) hits.push(name);
  }
  return { mutates: hits.length > 0, hits };
}

// Empty-classification threshold: a hook needs at least this much
// non-shebang / non-comment content to escape the `empty` category.
// 50 bytes is enough to fit a meaningful one-line stub like
//   `export default ()=>({continue:true});` (44 chars + nl)
// while still catching truly trivial files.
const MIN_NONEMPTY_BYTES = 50;

/**
 * @typedef {Object} HookClassification
 * @property {("module-safe"|"cli-safe-stdin-stdout"|"mutates-process"|"imports-only"|"empty"|"unknown")} category
 * @property {string[]} reasons     — bullet-list of WHY this category was chosen
 * @property {string[]} signals     — every signal hit (for downstream tooling)
 * @property {boolean} hasDefaultExport
 * @property {boolean} hasNamedExport
 * @property {boolean} readsStdin
 * @property {boolean} writesStdout
 * @property {boolean} hasTopProcessExit
 * @property {boolean} mutatesProcess
 */

/**
 * Strip a hook source down to its top-level statements ONLY — anything inside
 * a `function`, `=>` arrow body, or `class { ... }` block is excised so the
 * top-level regex anchors don't false-positive inside function bodies.
 *
 * This is a brace-counter, not a proper parser. It treats strings, template
 * literals, and comments as opaque content, so a regex like
 * `/}/` inside a string won't unbalance the brace count.
 *
 * @param {string} source
 * @returns {string} source with all `{...}` blocks replaced by single `{}`
 */
export function stripBlockBodies(source) {
  if (typeof source !== "string" || source.length === 0) return "";
  let out = "";
  let depth = 0;
  let i = 0;
  const n = source.length;
  let inStr = null; // null | '"' | "'" | "`" | "//" | "/*"
  while (i < n) {
    const ch = source[i];
    const next = i + 1 < n ? source[i + 1] : "";
    // ── string / comment tracking (opaque) ─────────────────────────────
    if (inStr === null) {
      if (ch === "/" && next === "/") { inStr = "//"; i += 2; if (depth === 0) out += "  "; continue; }
      if (ch === "/" && next === "*") { inStr = "/*"; i += 2; if (depth === 0) out += "  "; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; if (depth === 0) out += ch; i++; continue; }
    } else {
      // inside a string/comment — copy through at top level, skip in body
      if (inStr === "//") {
        if (ch === "\n") { inStr = null; if (depth === 0) out += "\n"; i++; continue; }
        if (depth === 0) out += ch;
        i++; continue;
      }
      if (inStr === "/*") {
        if (ch === "*" && next === "/") { inStr = null; i += 2; if (depth === 0) out += "  "; continue; }
        if (depth === 0) out += ch;
        i++; continue;
      }
      // string literal — handle escapes
      if (ch === "\\" && i + 1 < n) {
        if (depth === 0) out += ch + source[i + 1];
        i += 2; continue;
      }
      if (ch === inStr) {
        if (depth === 0) out += ch;
        inStr = null; i++; continue;
      }
      if (depth === 0) out += ch;
      i++; continue;
    }
    // ── brace counter ──────────────────────────────────────────────────
    if (ch === "{") {
      if (depth === 0) out += "{}";
      depth++; i++; continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      i++; continue;
    }
    if (depth === 0) out += ch;
    i++;
  }
  return out;
}

/**
 * Classify a single hook's source text. Returns the category + supporting
 * signals so callers (CLI reporter, downstream broker designer) can audit.
 *
 * @param {string} source
 * @returns {HookClassification}
 */
export function classifyHookContent(source) {
  const text = typeof source === "string" ? source : "";
  const stripped = text.length >= MIN_NONEMPTY_BYTES * 2 ? stripBlockBodies(text) : text;

  // ── empty / trivial ────────────────────────────────────────────────
  const nonEmptyBody = text.replace(/^\s*(?:#![^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*/gm, "").trim();
  if (nonEmptyBody.length < MIN_NONEMPTY_BYTES) {
    return classification("empty", ["<100 bytes of non-shebang/non-comment content"], [],
      { hasDefaultExport: false, hasNamedExport: false, readsStdin: false, writesStdout: false,
        hasTopProcessExit: false, mutatesProcess: false });
  }

  // ── signal extraction ──────────────────────────────────────────────
  const signals = [];
  const hasDefaultExport = RE.defaultExport.test(text);
  if (hasDefaultExport) signals.push("default-export");
  const hasNamedExport = RE.namedExportFn.test(text);
  if (hasNamedExport) signals.push("named-export-fn");

  const readsStdin = RE.topStdinAwait.test(stripped) || RE.topStdinHandler.test(stripped);
  if (readsStdin) signals.push("top-reads-stdin");
  const writesStdout = RE.topStdoutWrite.test(stripped) || RE.topConsoleLog.test(stripped);
  if (writesStdout) signals.push("top-writes-stdout");
  const hasTopProcessExit = RE.topProcessExit.test(stripped);
  if (hasTopProcessExit) signals.push("top-process-exit");

  // All mutation detection runs against the raw `text`, not the stripped
  // top-level form. See `detectMutations` doc for the safety rationale.
  const mutationScan = detectMutations(text);
  const mutatesProcess = mutationScan.mutates;
  for (const hit of mutationScan.hits) signals.push(`mutation:${hit}`);

  const meta = { hasDefaultExport, hasNamedExport, readsStdin, writesStdout, hasTopProcessExit, mutatesProcess };

  // ── mutates-process ────────────────────────────────────────────────
  // STRONGEST guarantee — checked FIRST, before module-safe / imports-only.
  // A hook that mutates (spawn / fs writes / network) must be spawn-isolated
  // regardless of its export shape or apparent imports-only-ness. Earlier
  // versions checked imports-only first, which let a hook like
  //   import { spawnSync } from 'node:child_process';
  //   const r = spawnSync(...);
  // misclassify as imports-only when no function decls were present.
  if (mutatesProcess) {
    const reasons = mutationScan.hits.map((h) => `mutation: ${h}`);
    return classification("mutates-process", reasons, signals, meta);
  }

  // ── imports-only check ─────────────────────────────────────────────
  const isImportsOnly =
    RE.importLine.test(text) &&
    !hasDefaultExport &&
    !hasNamedExport &&
    !readsStdin &&
    !writesStdout &&
    !RE.anyFunctionDecl.test(stripped) &&
    !RE.anyClassDecl.test(stripped);

  if (isImportsOnly) {
    return classification("imports-only", ["header-only — imports + no body"], signals, meta);
  }

  // ── module-safe ────────────────────────────────────────────────────
  // Must have an export, no top-level side effects, no top exit, no mutation.
  if ((hasDefaultExport || hasNamedExport) && !readsStdin && !writesStdout && !hasTopProcessExit && !mutatesProcess) {
    return classification("module-safe",
      ["has export-shape", "no top-level stdin/stdout/exit", "no spawn/writeFile"],
      signals, meta);
  }

  // ── cli-safe-stdin-stdout ──────────────────────────────────────────
  // Reads stdin AND writes stdout (or console.log) AND does NOT mutate.
  if (readsStdin && writesStdout) {
    return classification("cli-safe-stdin-stdout",
      ["top-level stdin → stdout pattern", "no process mutation"],
      signals, meta);
  }

  // ── unknown ────────────────────────────────────────────────────────
  return classification("unknown",
    ["could not match any known broker-integration pattern"],
    signals, meta);
}

function classification(category, reasons, signals, meta) {
  return Object.freeze({
    category,
    reasons: Object.freeze([...reasons]),
    signals: Object.freeze([...signals]),
    hasDefaultExport: meta.hasDefaultExport,
    hasNamedExport: meta.hasNamedExport,
    readsStdin: meta.readsStdin,
    writesStdout: meta.writesStdout,
    hasTopProcessExit: meta.hasTopProcessExit,
    mutatesProcess: meta.mutatesProcess,
  });
}

/**
 * Aggregate a list of per-hook classifications into a report shape suitable
 * for downstream rendering (JSON, markdown table).
 *
 * @param {Array<{filePath: string, classification: HookClassification}>} entries
 * @returns {{
 *   schemaVersion: string,
 *   total: number,
 *   byCategory: Record<string, number>,
 *   brokerStrategy: Record<string, number>,
 *   topMutators: string[],
 * }}
 */
export function summarizeReport(entries) {
  const total = entries.length;
  const byCategory = {
    "module-safe": 0,
    "cli-safe-stdin-stdout": 0,
    "mutates-process": 0,
    "imports-only": 0,
    "empty": 0,
    "unknown": 0,
  };
  // P1 (Reviewer B): bound mutators[] growth — keep first 25 + count.
  const MAX_MUTATORS_RETAINED = 25;
  const mutators = [];
  let mutatorsTruncated = 0;
  let invalidEntries = 0;
  for (const { filePath, classification: c } of entries) {
    if (!c || byCategory[c.category] === undefined) { invalidEntries++; continue; }
    byCategory[c.category]++;
    if (c.category === "mutates-process") {
      if (mutators.length < MAX_MUTATORS_RETAINED) mutators.push(filePath);
      else mutatorsTruncated++;
    }
  }
  const brokerStrategy = {
    sharable_in_process: byCategory["module-safe"],
    spawn_cache: byCategory["cli-safe-stdin-stdout"],
    spawn_isolate: byCategory["mutates-process"] + byCategory["unknown"],
    ignore: byCategory["imports-only"] + byCategory["empty"],
  };
  mutators.sort();
  // P1 (Reviewer B): freeze the returned object + nested arrays so callers
  // can't mutate aggregated state mid-render — matches the freeze policy of
  // `classification()` for consistency.
  return Object.freeze({
    schemaVersion: "1.0.0",
    total,
    byCategory: Object.freeze(byCategory),
    brokerStrategy: Object.freeze(brokerStrategy),
    topMutators: Object.freeze(mutators),
    mutatorsTruncated,
    invalidEntries,
  });
}
