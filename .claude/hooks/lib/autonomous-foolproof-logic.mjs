// tier: T0
/**
 * autonomous-foolproof-logic — pure decision functions for U-AF01..04 hooks.
 *
 * Extracted from the .mjs hooks so tests can import them via static
 * vitest imports without hitting the shebang-parsing bug. Hooks delegate
 * decisions to these functions and only handle I/O glue (stdin/stdout/files).
 *
 * NO I/O. NO process.* access (except input args). Pure logic.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @units U-AF01..U-AF07
 */

const DEFAULT_IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// ──────────────────────────────────────────────────────────────────────
// U-AF01: autonomous-loop-watchdog
// ──────────────────────────────────────────────────────────────────────

/**
 * Decides whether the autonomous loop should be stopped due to idleness.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous - PRISM_AUTONOMOUS=1 set?
 * @param {object|null} input.state    - parsed AUTONOMOUS_STATE.json
 * @param {number} [input.nowMs]       - injectable clock for tests
 * @returns {{continue:boolean, reason:string, decision?:string,
 *            elapsed_ms?:number, threshold_ms?:number, last_commit_at?:string}}
 */
export function decideWatchdog({ isAutonomous, state, nowMs = Date.now() }) {
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (!state || typeof state !== "object") {
    return { continue: true, reason: "no-state" };
  }

  const lastTs = state.last_commit_at || state.started_at;
  if (!lastTs) {
    return { continue: true, reason: "no-timestamp" };
  }

  let lastMs;
  try {
    lastMs = new Date(lastTs).getTime();
  } catch {
    return { continue: true, reason: "bad-timestamp" };
  }
  if (!Number.isFinite(lastMs)) {
    return { continue: true, reason: "bad-timestamp" };
  }

  const threshold =
    state.caps && Number.isFinite(state.caps.idle_threshold_ms)
      ? Number(state.caps.idle_threshold_ms)
      : DEFAULT_IDLE_THRESHOLD_MS;

  const elapsed = nowMs - lastMs;
  if (elapsed > threshold) {
    return {
      continue: false,
      decision: "block",
      reason: "idle-exceeded",
      elapsed_ms: elapsed,
      threshold_ms: threshold,
      last_commit_at: lastTs,
    };
  }

  return { continue: true, reason: "active", elapsed_ms: elapsed };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF02: tsc-baseline-regression-gate
// ──────────────────────────────────────────────────────────────────────

/**
 * Detects git-commit-like commands. False-positive guards: `git committed`,
 * `echo 'git commit'` etc. Allows leading whitespace, `;`, `&&`, `||` chaining.
 */
export function isGitCommitCommand(cmd) {
  if (typeof cmd !== "string") return false;
  return /(?:^|\s|;|&&|\|\|)\s*git\s+commit(?:\s|$)/.test(cmd);
}

/**
 * Decides whether to block a commit due to tsc error count regression.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.isCommit
 * @param {boolean} input.allowRegression
 * @param {number|null} input.baseline
 * @param {number|null} input.current
 */
export function decideTscRegressionGate({
  isAutonomous,
  isCommit,
  allowRegression,
  baseline,
  current,
}) {
  if (!isCommit) {
    return { continue: true, reason: "not-a-commit" };
  }
  if (allowRegression) {
    return { continue: true, reason: "regression-explicitly-allowed" };
  }
  if (current === null || current === undefined) {
    return { continue: true, reason: "tsc-unavailable" };
  }
  if (baseline === null || baseline === undefined) {
    return {
      continue: true,
      reason: "baseline-initialized",
      initialize_to: current,
    };
  }
  if (current > baseline) {
    if (isAutonomous) {
      return {
        continue: false,
        decision: "block",
        reason: "regression",
        baseline,
        current,
        delta: current - baseline,
      };
    }
    return {
      continue: true,
      reason: "regression-warned",
      baseline,
      current,
      delta: current - baseline,
    };
  }
  return {
    continue: true,
    reason: current < baseline ? "improvement" : "stable",
    baseline,
    current,
  };
}

/**
 * Classify whether a `tsc --noEmit` subprocess RAN TO COMPLETION, so the caller
 * can decide whether its error count is trustworthy. This is the load-bearing
 * guard against a false-green: when tsc is killed mid-stream (OOM SIGKILL,
 * timeout SIGTERM, or maxBuffer overflow) it can still have flushed PARTIAL
 * stdout. A naive line-grep on that truncated stream returns a falsely-LOW
 * error count which -- fed into decideTscRegressionGate as `current` -- both
 * poisons the fingerprint cache AND (on first run) initializes the baseline far
 * too low, silently lowering the regression gate forever. (Observed slot:papa
 * 2026-06-11: `npx tsc` OOM'd under host memory pressure; the truncated output
 * grepped to ~0 errors, looking like a clean build.)
 *
 * Completion contract (verified live against this repo 2026-06-11) -- tsc sets a
 * normal exit code ONLY after it finishes type-checking and prints every
 * diagnostic, so a clean exit code IS the completion proof. A killed run never
 * reaches that return: it is terminated by a signal, or a V8 OOM flushes a
 * `FATAL ERROR` / `heap out of memory` marker and aborts. A run is COMPLETE iff:
 *   - exit code 0                          => clean, zero type errors (tsc is silent)
 *   - exit code 1 or 2 AND >=1 parsed error line => tsc finished with diagnostics
 *     (NOTE: `tsc --noEmit` with errors exits 1, not 2, and prints NO
 *      "Found N errors" footer on this repo -- completion must not depend on one)
 * Everything else is INCOMPLETE and its output MUST NOT be counted:
 *   - any kill signal (SIGKILL/SIGTERM/SIGABRT)       => killed-signal
 *   - the timeout flag / ETIMEDOUT                    => timed-out
 *   - ENOBUFS (maxBuffer overflow)                    => buffer-overflow
 *   - a V8/Node fatal OOM marker in the output        => node-fatal-oom
 *   - exit 1/2 but ZERO parsed error lines            => diagnostics-exit-no-error-lines
 *   - any other exit code (3 = bad tsconfig, etc)     => unexpected-exit
 *
 * Pure: no I/O. The returned errorCount is computed the SAME per-line way the
 * gate always counted, so a COMPLETE run's count -- and the baseline semantics
 * built on it -- are preserved byte-for-byte. This function only gates *trust*.
 *
 * @param {object} input
 * @param {number|null} input.status    subprocess exit code (spawnSync .status; null when signalled)
 * @param {string|null} input.signal    kill signal (spawnSync .signal) or null
 * @param {boolean} [input.timedOut]    true if spawnSync timed out (error.code === "ETIMEDOUT")
 * @param {string} input.stdout         merged stdout+stderr of the run
 * @param {{code?:string}|null} [input.error]  spawnSync .error (carries ETIMEDOUT/ENOBUFS)
 * @returns {{completed: boolean, reason: string, errorCount: number}}
 */
export function classifyTscRun({ status, signal, timedOut = false, stdout, error = null }) {
  const out = typeof stdout === "string" ? stdout : "";
  // Count error lines the SAME way the gate always has (per-line grep), so a
  // COMPLETE run's count stays byte-identical to the pre-guard behavior.
  const errorCount = out.split("\n").filter((l) => /\): error TS\d+/.test(l)).length;
  const ecode = error && typeof error.code === "string" ? error.code : null;

  // ---- INCOMPLETE: killed or crashed mid-check -- trust NOTHING it printed. ----
  // A POSIX kill signal: SIGKILL (often an OOM abort), SIGTERM (spawnSync timeout
  // or maxBuffer kill), SIGABRT (a V8 fatal on POSIX).
  if (signal) {
    return { completed: false, reason: `killed-signal:${signal}`, errorCount };
  }
  if (timedOut || ecode === "ETIMEDOUT") {
    return { completed: false, reason: "timed-out", errorCount };
  }
  if (ecode === "ENOBUFS") {
    return { completed: false, reason: "buffer-overflow", errorCount };
  }
  // A V8 / Node fatal OOM that exits WITHOUT a POSIX signal (the Windows path):
  // node flushes these markers to stderr just before aborting, so the diagnostic
  // stream is truncated even though `signal` is null. The markers are chosen to
  // be V8-RUNTIME-EXCLUSIVE (they never appear in a tsc diagnostic line), so a
  // COMPLETE run whose error text merely quotes "FATAL ERROR" can't trip this.
  if (/JavaScript heap out of memory|Reached heap limit Allocation failed|<--- Last few GCs --->/.test(out)) {
    return { completed: false, reason: "node-fatal-oom", errorCount };
  }

  // ---- COMPLETE: tsc set a normal exit code, which it only does AFTER it has
  // finished type-checking and printed every diagnostic. ----
  if (status === 0) {
    return { completed: true, reason: "clean", errorCount: 0 };
  }
  // Require >=1 parsed error line to corroborate exit 1/2 (which asserts
  // diagnostics ARE present): zero parsed lines on a 1/2 exit means the stream
  // was a non-diagnostic crash (e.g. an internal tsc exception), not "0 errors".
  if ((status === 1 || status === 2) && errorCount > 0) {
    return { completed: true, reason: "errors-found", errorCount };
  }
  if (status === 1 || status === 2) {
    return { completed: false, reason: "diagnostics-exit-no-error-lines", errorCount };
  }
  // Exit 3 (invalid tsconfig), 4 (project-ref cycle), null without signal, etc.
  return { completed: false, reason: `unexpected-exit:${status}`, errorCount };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF03: reviewer-fail-latch
// ──────────────────────────────────────────────────────────────────────

/**
 * Decides whether the autonomous loop is latched-FAIL by a prior reviewer
 * verdict in the current session.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.overrideEnabled
 * @param {string|null} input.currentSessionId
 * @param {Array|null} input.verdicts
 */
export function decideReviewerFailLatch({
  isAutonomous,
  overrideEnabled,
  currentSessionId,
  verdicts,
}) {
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (overrideEnabled) {
    return { continue: true, reason: "override-active" };
  }
  if (!currentSessionId) {
    return { continue: true, reason: "no-session-id" };
  }
  if (!Array.isArray(verdicts)) {
    return { continue: true, reason: "no-verdicts-file" };
  }

  const failed = verdicts.filter(
    (v) =>
      v &&
      typeof v === "object" &&
      v.session_id === currentSessionId &&
      typeof v.verdict === "string" &&
      v.verdict.toUpperCase() === "FAIL",
  );

  if (failed.length === 0) {
    return {
      continue: true,
      reason: "no-fails",
      verdict_count: verdicts.length,
    };
  }

  return {
    continue: false,
    decision: "block",
    reason: "fail-latched",
    fail_count: failed.length,
    first_fail: {
      unit_id: failed[0].unit_id ?? "<unknown>",
      summary: failed[0].summary ?? "",
      at: failed[0].at ?? "",
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF04: cost-ceiling-stop
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_COST_CAP_USD = 50.0;
const DEFAULT_TOKEN_CAP = 5_000_000;
const DEFAULT_WALL_TIME_MS = 5 * 60 * 60 * 1000; // 5 hours
const DEFAULT_UNIT_CAP = 25;

/**
 * Decides whether the autonomous loop should stop due to a cost ceiling
 * (any of: total cost USD, total tokens, wall-time, total units).
 *
 * Whichever cap is breached first wins. Multiple breaches reported.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.overrideEnabled
 * @param {object|null} input.state - AUTONOMOUS_STATE.json contents
 * @param {number} [input.nowMs]
 * @returns {{continue:boolean, reason:string, decision?:string,
 *            breaches?:Array<{cap:string, value:number, limit:number}>}}
 */
export function decideCostCeiling({
  isAutonomous,
  overrideEnabled,
  state,
  nowMs = Date.now(),
}) {
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (overrideEnabled) {
    return { continue: true, reason: "override-active" };
  }
  if (!state || typeof state !== "object") {
    return { continue: true, reason: "no-state" };
  }

  const caps = state.caps && typeof state.caps === "object" ? state.caps : {};
  const costLimit = Number.isFinite(caps.cost_usd)
    ? Number(caps.cost_usd)
    : DEFAULT_COST_CAP_USD;
  const tokenLimit = Number.isFinite(caps.token_max)
    ? Number(caps.token_max)
    : DEFAULT_TOKEN_CAP;
  const wallLimit = Number.isFinite(caps.wall_time_ms)
    ? Number(caps.wall_time_ms)
    : DEFAULT_WALL_TIME_MS;
  const unitLimit = Number.isFinite(caps.unit_max)
    ? Number(caps.unit_max)
    : DEFAULT_UNIT_CAP;

  const breaches = [];

  // Cost ceiling
  const costUsed = Number.isFinite(state.cost_used_usd)
    ? Number(state.cost_used_usd)
    : 0;
  if (costUsed >= costLimit) {
    breaches.push({ cap: "cost_usd", value: costUsed, limit: costLimit });
  }

  // Token ceiling
  const tokensUsed = Number.isFinite(state.tokens_used)
    ? Number(state.tokens_used)
    : 0;
  if (tokensUsed >= tokenLimit) {
    breaches.push({ cap: "tokens", value: tokensUsed, limit: tokenLimit });
  }

  // Wall time ceiling
  if (state.started_at) {
    let startMs;
    try {
      startMs = new Date(state.started_at).getTime();
    } catch {
      startMs = NaN;
    }
    if (Number.isFinite(startMs)) {
      const elapsed = nowMs - startMs;
      if (elapsed >= wallLimit) {
        breaches.push({ cap: "wall_time_ms", value: elapsed, limit: wallLimit });
      }
    }
  }

  // Unit count ceiling
  const commitsMade = Number.isFinite(state.commits_made)
    ? Number(state.commits_made)
    : 0;
  if (commitsMade >= unitLimit) {
    breaches.push({ cap: "unit_max", value: commitsMade, limit: unitLimit });
  }

  if (breaches.length === 0) {
    return {
      continue: true,
      reason: "within-caps",
      cost_used_usd: costUsed,
      tokens_used: tokensUsed,
      commits_made: commitsMade,
    };
  }

  return {
    continue: false,
    decision: "block",
    reason: "ceiling-breached",
    breaches,
  };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF05: anti-regression-auto-sweep
// ──────────────────────────────────────────────────────────────────────

/**
 * Decides whether the autonomous loop should treat a post-commit test
 * sweep result as a regression. This is the policy half — the I/O half
 * (running vitest, parsing output) lives in the hook script.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.isCommit         - was this a `git commit` invocation?
 * @param {object|null} input.sweepResult  - parsed vitest summary
 * @param {number} input.sweepResult.totalTests
 * @param {number} input.sweepResult.passed
 * @param {number} input.sweepResult.failed
 * @param {string[]} [input.sweepResult.failedFiles]
 */
export function decideAntiRegressionSweep({
  isAutonomous,
  isCommit,
  sweepResult,
}) {
  if (!isCommit) {
    return { continue: true, reason: "not-a-commit" };
  }
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (!sweepResult || typeof sweepResult !== "object") {
    return { continue: true, reason: "no-sweep-result" };
  }

  const totalTests = Number.isFinite(sweepResult.totalTests)
    ? Number(sweepResult.totalTests)
    : 0;
  const passed = Number.isFinite(sweepResult.passed) ? Number(sweepResult.passed) : 0;
  const failed = Number.isFinite(sweepResult.failed) ? Number(sweepResult.failed) : 0;

  if (totalTests === 0) {
    // No tests to compare — pass through (could be a docs-only commit, or
    // sweep was unable to find any U-WIRE/U-AF test files).
    return { continue: true, reason: "no-tests-found" };
  }

  if (failed > 0) {
    return {
      continue: false,
      decision: "regression-detected",
      reason: "post-commit-tests-failed",
      total_tests: totalTests,
      passed,
      failed,
      failed_files: Array.isArray(sweepResult.failedFiles)
        ? sweepResult.failedFiles
        : [],
    };
  }

  return {
    continue: true,
    reason: "all-tests-passing",
    total_tests: totalTests,
    passed,
  };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF06: ollama-engine-api-extractor
// ──────────────────────────────────────────────────────────────────────

const CONTRACT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ENGINE_FILE_PATTERN = /[\\/]engines[\\/][A-Z][A-Za-z0-9_]*Engine\.ts$/;

/**
 * Detect whether a file path is a PRISM engine source file.
 * Engine convention: src/engines/PascalCaseEngine.ts.
 */
export function isEngineSourceFile(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return false;
  return ENGINE_FILE_PATTERN.test(filePath);
}

/**
 * Parse Ollama's structured-extraction response into a typed contract.
 * Tolerates JSON wrapped in markdown fences, leading prose, etc.
 *
 * @param {string|null} rawResponse - Raw text from ollamaHookBridgeEngine.query
 * @returns {{ok:true, contract:object} | {ok:false, reason:string}}
 */
export function parseOllamaEngineContract(rawResponse) {
  if (typeof rawResponse !== "string" || rawResponse.trim().length === 0) {
    return { ok: false, reason: "empty-response" };
  }

  // Strip markdown fences if present
  let text = rawResponse.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Locate the first {...} JSON object
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return { ok: false, reason: "no-json-object" };
  }
  const jsonText = text.slice(firstBrace, lastBrace + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "not-an-object" };
  }

  // Normalize shape — accept loose responses, fill defaults
  const contract = {
    methods: Array.isArray(parsed.methods) ? parsed.methods : [],
    required_fields: Array.isArray(parsed.required_fields)
      ? parsed.required_fields
      : [],
    enums:
      parsed.enums && typeof parsed.enums === "object" && !Array.isArray(parsed.enums)
        ? parsed.enums
        : {},
  };

  return { ok: true, contract };
}

/**
 * Merge a freshly-extracted contract into the cache payload.
 * Cache entries are keyed by absolute file path.
 *
 * @param {object|null} existing - Prior cache contents
 * @param {string} filePath
 * @param {object} contract
 * @param {number} [nowMs]
 */
export function mergeContractCache(existing, filePath, contract, nowMs = Date.now()) {
  const cache =
    existing && typeof existing === "object" && existing.entries && typeof existing.entries === "object"
      ? { ...existing }
      : { schemaVersion: "1.0.0", entries: {} };

  cache.entries = { ...cache.entries };
  cache.entries[filePath] = {
    contract,
    extracted_at: new Date(nowMs).toISOString(),
  };
  cache.last_updated = new Date(nowMs).toISOString();

  return cache;
}

/**
 * Decide whether the extractor should run for this file.
 *
 * @param {object} input
 * @param {string} input.filePath
 * @param {boolean} input.isAutonomous
 * @param {object|null} input.cache
 * @param {number} [input.nowMs]
 */
export function decideExtractRun({ filePath, isAutonomous, cache, nowMs = Date.now() }) {
  if (!isEngineSourceFile(filePath)) {
    return { run: false, reason: "not-an-engine-file" };
  }
  if (!isAutonomous) {
    return { run: false, reason: "non-autonomous" };
  }

  const entry = cache?.entries?.[filePath];
  if (!entry) {
    return { run: true, reason: "cache-miss" };
  }

  let extractedMs;
  try {
    extractedMs = new Date(entry.extracted_at).getTime();
  } catch {
    return { run: true, reason: "cache-bad-timestamp" };
  }
  if (!Number.isFinite(extractedMs)) {
    return { run: true, reason: "cache-bad-timestamp" };
  }

  const age = nowMs - extractedMs;
  if (age > CONTRACT_CACHE_TTL_MS) {
    return { run: true, reason: "cache-stale", age_ms: age };
  }

  return { run: false, reason: "cache-fresh", age_ms: age };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF07: ollama-schema-engine-sync-gate
// ──────────────────────────────────────────────────────────────────────

const SCHEMA_FILE_PATTERN = /[\\/]schemas[\\/][A-Za-z0-9_]+\.ts$/;

/**
 * Detect whether a file path is a Zod schema source file. PRISM convention:
 * src/schemas/<dispatcherName>ActionSchemas.ts (or similar).
 */
export function isSchemaSourceFile(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return false;
  return SCHEMA_FILE_PATTERN.test(filePath);
}

/**
 * Extract z.enum([...]) literals from Zod schema source. Returns a flat
 * list of enum value sets keyed by best-effort field name. The parser is
 * intentionally lightweight (regex + manual quote scan) — it doesn't need
 * to be a full Zod AST, just good enough to flag drift.
 *
 * Returned shape:
 *   [{ field: string|null, values: string[], lineHint?: number }]
 *
 * @param {string} src - Zod schema source code
 */
export function extractZodEnumsFromSchema(src) {
  if (typeof src !== "string" || src.length === 0) return [];

  const results = [];
  // Match patterns like:  z.enum(["a","b","c"])
  // and:  field_name: z.enum([...])
  const enumPattern = /([A-Za-z_][A-Za-z0-9_]*)?\s*:?\s*z\.enum\(\s*\[([^\]]*)\]/g;

  let m;
  while ((m = enumPattern.exec(src)) !== null) {
    const rawField = m[1] ? m[1].trim() : null;
    const literalsBlock = m[2];

    // Pull "..." or '...' or `...` literals from inside the brackets
    const valuePattern = /["'`]([^"'`]+)["'`]/g;
    const values = [];
    let v;
    while ((v = valuePattern.exec(literalsBlock)) !== null) {
      values.push(v[1]);
    }

    if (values.length === 0) continue;
    // Find approximate line number (count newlines up to match start)
    const lineHint = src.slice(0, m.index).split("\n").length;
    results.push({ field: rawField, values, lineHint });
  }

  return results;
}

/**
 * Compare proposed schema enums against an engine's cached enums.
 * Returns a structured drift report. Only enum fields that exist in BOTH
 * sides are compared (drift on a field that isn't in the engine cache is
 * not a sync error — it's a new field).
 *
 * @param {Array<{field:string|null, values:string[]}>} schemaEnums
 * @param {Record<string, string[]>} engineEnums
 */
export function diffSchemaVsEngineEnums(schemaEnums, engineEnums) {
  const drifts = [];
  const matchable = (Array.isArray(schemaEnums) ? schemaEnums : []).filter(
    (e) => e && typeof e.field === "string" && e.field in (engineEnums ?? {}),
  );

  for (const entry of matchable) {
    const proposed = new Set(entry.values);
    const engine = new Set(engineEnums[entry.field]);

    const onlyInSchema = [...proposed].filter((v) => !engine.has(v));
    const onlyInEngine = [...engine].filter((v) => !proposed.has(v));

    if (onlyInSchema.length === 0 && onlyInEngine.length === 0) continue;

    drifts.push({
      field: entry.field,
      only_in_schema: onlyInSchema,
      only_in_engine: onlyInEngine,
      line_hint: entry.lineHint ?? null,
    });
  }

  return drifts;
}

/**
 * Decide whether to block a schema edit due to enum drift against cached
 * engine contracts.
 *
 * @param {object} input
 * @param {string} input.filePath           - schema file being edited
 * @param {string|null} input.proposedSrc   - new file content
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.overrideEnabled
 * @param {object|null} input.cache         - ENGINE_CONTRACTS_CACHE.json
 * @param {string[]} [input.relatedEngines] - engine paths to compare against
 *                                            (caller decides which engines this
 *                                            schema feeds; usually all cached)
 */
export function decideSchemaSyncGate({
  filePath,
  proposedSrc,
  isAutonomous,
  overrideEnabled,
  cache,
  relatedEngines,
}) {
  if (!isSchemaSourceFile(filePath)) {
    return { continue: true, reason: "not-a-schema-file" };
  }
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (overrideEnabled) {
    return { continue: true, reason: "override-active" };
  }
  if (typeof proposedSrc !== "string" || proposedSrc.length === 0) {
    return { continue: true, reason: "no-content" };
  }
  if (!cache || typeof cache !== "object" || !cache.entries) {
    return { continue: true, reason: "no-cache" };
  }

  const schemaEnums = extractZodEnumsFromSchema(proposedSrc);
  if (schemaEnums.length === 0) {
    return { continue: true, reason: "no-schema-enums" };
  }

  // Determine which engine cache entries to consult.
  const engineKeys =
    Array.isArray(relatedEngines) && relatedEngines.length > 0
      ? relatedEngines
      : Object.keys(cache.entries);

  // Aggregate enums from all related engines into a single fieldName→values map.
  const aggregatedEnums = {};
  for (const key of engineKeys) {
    const entry = cache.entries[key];
    if (!entry || typeof entry !== "object") continue;
    const enums = entry.contract?.enums;
    if (!enums || typeof enums !== "object") continue;
    for (const [field, vals] of Object.entries(enums)) {
      if (!Array.isArray(vals)) continue;
      // Engine enums are authoritative — last write wins on collision (rare).
      aggregatedEnums[field] = vals;
    }
  }

  if (Object.keys(aggregatedEnums).length === 0) {
    return { continue: true, reason: "no-engine-enums-cached" };
  }

  const drifts = diffSchemaVsEngineEnums(schemaEnums, aggregatedEnums);

  if (drifts.length === 0) {
    return {
      continue: true,
      reason: "no-drift",
      schema_enum_count: schemaEnums.length,
      compared_engine_enum_count: Object.keys(aggregatedEnums).length,
    };
  }

  return {
    continue: false,
    decision: "block",
    reason: "enum-drift",
    drifts,
    drift_count: drifts.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// U-AF08: ollama-reviewer-second-opinion
// PreToolUse on `git commit`. Runs Ollama against the staged diff, parses a
// PASS/CONCERN/FAIL verdict, and blocks the commit on FAIL when autonomous.
// ─────────────────────────────────────────────────────────────────────────────

const REVIEW_DIFF_MIN_LINES = 5;       // skip trivially tiny diffs
const REVIEW_DIFF_MAX_LINES = 5000;    // skip mega-diffs (Ollama can't reason)
const REVIEW_VALID_VERDICTS = new Set(["PASS", "CONCERN", "FAIL"]);

/**
 * Parse Ollama's review response into a structured verdict. The system prompt
 * (defined in the hook script) asks Ollama to return JSON of shape:
 *   { "verdict": "PASS"|"CONCERN"|"FAIL", "reason": string, "confidence": 0..1 }
 *
 * Tolerates markdown fences and prose-wrapped output. Defaults reason and
 * confidence to safe values when missing. Returns:
 *   { ok: true,  verdict, reason, confidence }
 *   { ok: false, reason: "empty-response"|"no-json-object"|"invalid-json"|"invalid-verdict" }
 *
 * @param {string|null|undefined} rawResponse
 */
export function parseOllamaReviewVerdict(rawResponse) {
  if (rawResponse == null) return { ok: false, reason: "empty-response" };
  const raw = String(rawResponse).trim();
  if (raw.length === 0) return { ok: false, reason: "empty-response" };

  // Strip ```json … ``` fences if present
  let candidate = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) candidate = fenceMatch[1].trim();

  // Pull the first balanced { … } block out of free-form prose
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, reason: "no-json-object" };
  }
  const jsonText = candidate.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "no-json-object" };
  }

  const verdict = typeof parsed.verdict === "string" ? parsed.verdict.toUpperCase() : "";
  if (!REVIEW_VALID_VERDICTS.has(verdict)) {
    return { ok: false, reason: "invalid-verdict" };
  }

  const reason = typeof parsed.reason === "string" && parsed.reason.length > 0
    ? parsed.reason.slice(0, 500)
    : "(no reason provided)";

  let confidence = Number.isFinite(parsed.confidence) ? Number(parsed.confidence) : 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  return { ok: true, verdict, reason, confidence };
}

/**
 * Decide whether to block a `git commit` based on Ollama's review verdict.
 *
 * Block matrix:
 *   isAutonomous=false              → continue ("non-autonomous")
 *   isCommit=false                  → continue ("not-a-commit")
 *   overrideEnabled=true            → continue ("override-active")
 *   diffLineCount < MIN             → continue ("diff-trivially-small")
 *   diffLineCount > MAX             → continue ("diff-too-large")
 *   ollamaVerdict.ok=false          → continue ("ollama-unavailable" or "ollama-parse-failed")
 *   verdict=PASS                    → continue ("review-pass")
 *   verdict=CONCERN                 → continue ("review-concern") + record verdict
 *   verdict=FAIL                    → BLOCK ("review-fail")
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.isCommit
 * @param {boolean} input.overrideEnabled
 * @param {number}  input.diffLineCount
 * @param {{ok:boolean, verdict?:string, reason?:string, confidence?:number, reason?:string}|null} input.ollamaVerdict
 */
export function decideOllamaReviewSecondOpinion({
  isAutonomous,
  isCommit,
  overrideEnabled,
  diffLineCount,
  ollamaVerdict,
}) {
  if (!isCommit) return { continue: true, reason: "not-a-commit" };
  if (!isAutonomous) return { continue: true, reason: "non-autonomous" };
  if (overrideEnabled) return { continue: true, reason: "override-active" };

  const lines = Number.isFinite(diffLineCount) ? Number(diffLineCount) : 0;
  if (lines < REVIEW_DIFF_MIN_LINES) {
    return { continue: true, reason: "diff-trivially-small", diff_line_count: lines };
  }
  if (lines > REVIEW_DIFF_MAX_LINES) {
    return { continue: true, reason: "diff-too-large", diff_line_count: lines };
  }

  if (!ollamaVerdict || ollamaVerdict.ok !== true) {
    const reasonKey = ollamaVerdict == null
      ? "ollama-unavailable"
      : `ollama-parse-failed:${ollamaVerdict.reason ?? "unknown"}`;
    return { continue: true, reason: reasonKey };
  }

  const verdict = ollamaVerdict.verdict;
  if (verdict === "PASS") {
    return {
      continue: true,
      reason: "review-pass",
      verdict,
      review_reason: ollamaVerdict.reason,
      confidence: ollamaVerdict.confidence,
    };
  }
  if (verdict === "CONCERN") {
    return {
      continue: true,
      reason: "review-concern",
      verdict,
      review_reason: ollamaVerdict.reason,
      confidence: ollamaVerdict.confidence,
      record_verdict: true,
    };
  }
  // verdict === "FAIL"
  return {
    continue: false,
    decision: "block",
    reason: "review-fail",
    verdict,
    review_reason: ollamaVerdict.reason,
    confidence: ollamaVerdict.confidence,
    record_verdict: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// U-AF09: AUTONOMOUS_STATE.json — canonical schema + initializer + merger
// Used by U-AF01 (watchdog), U-AF03 (fail-latch), U-AF04 (cost ceiling),
// U-AF05 (sweep), U-AF08 (reviewer). Single source of truth so the file
// fields cannot drift between hooks.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTONOMOUS_STATE_SCHEMA_VERSION = "1.0.0";

export const AUTONOMOUS_STATE_DEFAULT_CAPS = Object.freeze({
  cost_usd: 50,
  tokens: 5_000_000,
  wall_time_ms: 5 * 60 * 60 * 1000, // 5h
  unit_max: 25,
});

const AUTONOMOUS_STATE_REQUIRED_KEYS = [
  "schemaVersion",
  "session_id",
  "mode",
  "started_at",
  "last_commit_at",
  "last_user_input_at",
  "fail_count",
  "last_block_reason",
  "last_block_at",
  "cost_usd",
  "tokens_used",
  "wall_time_ms",
  "unit_count",
  "caps",
];

const VALID_MODES = new Set(["autonomous", "manual"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isIsoDateString(v) {
  return typeof v === "string" && ISO_DATE_RE.test(v);
}

function isIsoOrNull(v) {
  return v === null || isIsoDateString(v);
}

function isNonNegativeFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

/**
 * Validate that a payload matches the AUTONOMOUS_STATE schema.
 * Returns { ok, errors: string[] }. `errors` is empty iff `ok=true`.
 */
export function validateAutonomousState(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["payload-not-object"] };
  }
  for (const key of AUTONOMOUS_STATE_REQUIRED_KEYS) {
    if (!(key in payload)) errors.push(`missing-key:${key}`);
  }
  if (errors.length > 0) return { ok: false, errors };

  if (payload.schemaVersion !== AUTONOMOUS_STATE_SCHEMA_VERSION) {
    errors.push(`bad-schemaVersion:${payload.schemaVersion}`);
  }
  if (typeof payload.session_id !== "string" || payload.session_id.length === 0) {
    errors.push("bad-session_id");
  }
  if (!VALID_MODES.has(payload.mode)) {
    errors.push(`bad-mode:${payload.mode}`);
  }
  if (!isIsoDateString(payload.started_at)) errors.push("bad-started_at");
  if (!isIsoOrNull(payload.last_commit_at)) errors.push("bad-last_commit_at");
  if (!isIsoOrNull(payload.last_user_input_at)) errors.push("bad-last_user_input_at");
  if (!isIsoOrNull(payload.last_block_at)) errors.push("bad-last_block_at");

  if (!isNonNegativeFiniteNumber(payload.fail_count) || !Number.isInteger(payload.fail_count)) {
    errors.push("bad-fail_count");
  }
  if (payload.last_block_reason !== null && typeof payload.last_block_reason !== "string") {
    errors.push("bad-last_block_reason");
  }
  if (!isNonNegativeFiniteNumber(payload.cost_usd)) errors.push("bad-cost_usd");
  if (!isNonNegativeFiniteNumber(payload.tokens_used)) errors.push("bad-tokens_used");
  if (!isNonNegativeFiniteNumber(payload.wall_time_ms)) errors.push("bad-wall_time_ms");
  if (!isNonNegativeFiniteNumber(payload.unit_count) || !Number.isInteger(payload.unit_count)) {
    errors.push("bad-unit_count");
  }

  const caps = payload.caps;
  if (!caps || typeof caps !== "object" || Array.isArray(caps)) {
    errors.push("bad-caps");
  } else {
    for (const k of ["cost_usd", "tokens", "wall_time_ms", "unit_max"]) {
      if (!isNonNegativeFiniteNumber(caps[k])) errors.push(`bad-caps.${k}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Construct a fresh AUTONOMOUS_STATE payload. All time fields default to
 * `nowMs` (or Date.now()). `caps` defaults to AUTONOMOUS_STATE_DEFAULT_CAPS;
 * the caller may override individual cap dimensions via {caps: {...}}.
 *
 * @param {object} input
 * @param {string} input.sessionId
 * @param {"autonomous"|"manual"} [input.mode="autonomous"]
 * @param {number} [input.nowMs]
 * @param {Partial<typeof AUTONOMOUS_STATE_DEFAULT_CAPS>} [input.caps]
 */
export function buildInitialAutonomousState({ sessionId, mode = "autonomous", nowMs, caps } = {}) {
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("buildInitialAutonomousState: sessionId required");
  }
  if (!VALID_MODES.has(mode)) {
    throw new Error(`buildInitialAutonomousState: invalid mode "${mode}"`);
  }
  const t = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
  const startedAt = new Date(t).toISOString();
  return {
    schemaVersion: AUTONOMOUS_STATE_SCHEMA_VERSION,
    session_id: sessionId,
    mode,
    started_at: startedAt,
    last_commit_at: null,
    last_user_input_at: null,
    fail_count: 0,
    last_block_reason: null,
    last_block_at: null,
    cost_usd: 0,
    tokens_used: 0,
    wall_time_ms: 0,
    unit_count: 0,
    caps: { ...AUTONOMOUS_STATE_DEFAULT_CAPS, ...(caps ?? {}) },
  };
}

/**
 * Merge a partial patch into an existing AUTONOMOUS_STATE payload. Unknown
 * keys are dropped. `caps` is shallow-merged. Returns a NEW object — never
 * mutates `prev`. If prev is invalid, falls back to a fresh state and merges
 * onto that (caller should validate after).
 *
 * Numeric counters (fail_count, cost_usd, tokens_used, wall_time_ms,
 * unit_count) ADD when patch provides them with key prefixed `+` (e.g.
 * `{ "+fail_count": 1 }`). Without `+` they REPLACE.
 */
export function mergeAutonomousState(prev, patch) {
  const base = (prev && typeof prev === "object" && !Array.isArray(prev))
    ? { ...prev, caps: { ...(prev.caps ?? AUTONOMOUS_STATE_DEFAULT_CAPS) } }
    : null;
  const next = base ?? buildInitialAutonomousState({
    sessionId: "unknown-session",
    nowMs: 0,
  });
  if (!patch || typeof patch !== "object") return next;

  const replaceableKeys = new Set([
    "session_id", "mode", "started_at",
    "last_commit_at", "last_user_input_at",
    "last_block_reason", "last_block_at",
    "fail_count", "cost_usd", "tokens_used", "wall_time_ms", "unit_count",
  ]);
  const incrementableKeys = new Set([
    "fail_count", "cost_usd", "tokens_used", "wall_time_ms", "unit_count",
  ]);

  for (const [k, v] of Object.entries(patch)) {
    if (k === "caps" && v && typeof v === "object") {
      next.caps = { ...next.caps, ...v };
      continue;
    }
    if (k.startsWith("+")) {
      const realKey = k.slice(1);
      if (incrementableKeys.has(realKey) && typeof v === "number" && Number.isFinite(v)) {
        next[realKey] = (Number.isFinite(next[realKey]) ? next[realKey] : 0) + v;
      }
      continue;
    }
    if (replaceableKeys.has(k)) {
      next[k] = v;
    }
  }
  return next;
}
