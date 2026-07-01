#!/usr/bin/env node
// tier: T1
/**
 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
 *
 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
 *
 * WHY: a 50 KB .log / .jsonl / generated report dragged into Claude's context is
 * ~12k tokens of mostly-noise. A local qwen2.5-coder can read it and hand Claude
 * a ~500-token gist instead — a ~95% saving on that one read. The catch is the
 * hook can't *know* whether the model wants the gist or the raw bytes, so by
 * default it only NUDGES (additionalContext suggesting /ollama-summarize); the
 * automatic substitute-and-deny path is opt-in via PRISM_OLLAMA_ROUTE_AUTO=1
 * (and even then it fails OPEN — if Ollama is down/slow the Read just proceeds).
 *
 * Only ever touches *bulk-data* targets (logs, jsonl/csv dumps, big reports/digests
 * under state/ or data/state/). Source files, small files, and anything the model
 * is plausibly about to edit are left strictly alone.
 *
 * @hook PreToolUse:Read (wired into .claude/hooks/bundles/read-bundle.mjs READ_HOOKS)
 *
 * Env:
 *   PRISM_OLLAMA_ROUTE=0             → disable entirely (passthrough)
 *   PRISM_OLLAMA_ROUTE_AUTO=1        → automatic mode: substitute an Ollama summary
 *                                      and deny the raw Read (fails open if Ollama down)
 *   PRISM_OLLAMA_ROUTE_AUTO=0        → force suggest mode (overrides config-file mode:auto)
 *   PRISM_OLLAMA_ROUTE_MIN_KB        → min file size to bother (default 24, floor 8)
 *   PRISM_OLLAMA_ROUTE_MODEL         → model for the auto summary (default qwen2.5-coder:1.5b,
 *                                      the fast trivial tier; the gist runs in the Read path
 *                                      under a 30s timeout, so a heavy reasoner would time out)
 *   PRISM_OLLAMA_ROUTE_CONFIG        → override path for the config-file fallback
 *   OLLAMA_URL                       → Ollama base URL (default http://127.0.0.1:11434)
 *
 * Config-file fallback (NEW in GPU-OFFLOAD-MAXIMIZE-MS0/U1):
 *   `mcp-server/data/state/ollama-route-config.json` schema:
 *     { "mode": "auto" | "suggest", "minKb": >=8, "model": "qwen2.5-coder:1.5b" }
 *   A retired/missing config model auto-resolves to a live FAST_ROUTE_TIER model
 *   (resolveRouteModel) so a deleted model still offloads instead of failing open.
 *   Env vars STILL take precedence — config is only consulted when the env var is unset.
 *   Post-parse schema validation: malicious `{minKb:0}` (DoS-by-route) silently dropped.
 *   Cascade short-circuit (R12 fail-loud): if /api/tags itself fails OR the configured
 *   model is not in the live allowlist, auto mode short-circuits to raw-Read pass-through
 *   — NOT to substitute-with-default (which would itself fail) and NOT to suggest mode
 *   (which writes an advisory the caller might ignore). Raw Read is the only correct
 *   fail-open path when allowlist verification itself is broken.
 *
 * Telemetry unification (NEW in GPU-OFFLOAD-MAXIMIZE-MS0/U1):
 *   Every fire appends to BOTH `.claude/cache/hook-telemetry.jsonl` (per-event audit trail)
 *   AND `mcp-server/data/state/ollama-offload-stats.json` `byHook.ollama-route-pretooluse`
 *   (atomic RMW). Without the unification the offload dashboard could not see file-read
 *   offloads — making U1's success unmeasurable. See envelope GPU-OFFLOAD-MAXIMIZE-MS0/U1.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { decayDecision } from "../../scripts/lib/advisory-decay.mjs";

const KB = 1024;
const DEFAULT_MIN_KB = 24;
const MIN_KB_FLOOR = 8; // never route reads below this regardless of config (DoS guard floor)
const READ_FOR_SUMMARY_CAP = 48 * KB; // bytes of the file we'll feed to qwen in auto mode
const MODEL_NAME_RE = /^[\w./:-]{1,64}$/;

/**
 * Read-path-fast gist tiers, fastest first. The auto summary runs INSIDE the Read
 * path under a ~30s timeout, so the model must cold-load + infer well under it. A
 * log/dump gist is a TRIVIAL task -- never a heavy reasoner (32b/120b cold-load >30s
 * -> timeout -> fail-open -> 0 offloads; the U-ZULU-ROUTE-MODEL-LATENCY bug). Used
 * as the retirement fallback so a deleted config model (the 2026-06-04 7b deletion)
 * still offloads via a live fast tier instead of failing open.
 */
export const FAST_ROUTE_TIER = [
  "qwen2.5-coder:1.5b",
  "qwen2.5-coder:7b",
  "qwen2.5-coder:14b",
  "qwen3-coder:30b",
];
/** Default route-gist model: the fast trivial tier, NOT the slow 32b reasoner. */
const DEFAULT_ROUTE_MODEL = "qwen2.5-coder:1.5b";

/**
 * Pick the effective route-gist model. If `preferred` is live, keep it. Otherwise
 * (the retirement case that broke the offloader twice) fall to the first
 * FAST_ROUTE_TIER model that IS live -- a retired/missing config model still
 * offloads via a live fast tier instead of cascade-failing-open to a raw Read.
 * Returns null only when NOTHING usable is live (caller short-circuits to pass).
 * @param {string} preferred  configured/default model name
 * @param {string[]} liveModels  /api/tags model names
 * @returns {string|null}
 */
export function resolveRouteModel(preferred, liveModels) {
  const live = Array.isArray(liveModels) ? liveModels : [];
  if (preferred && live.includes(preferred)) return preferred;
  for (const m of FAST_ROUTE_TIER) if (live.includes(m)) return m;
  return null;
}

const SRC_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".c", ".h",
  ".cpp", ".hpp", ".cc", ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".sh", ".ps1",
  ".sql", ".css", ".scss", ".less", ".html", ".htm", ".vue", ".svelte", ".lua", ".pl", ".r",
]);
const BULK_EXT = new Set([".log", ".jsonl", ".ndjson", ".csv", ".tsv", ".txt", ".out"]);
const BULK_PATH_HINT =
  /(^|[\\/])(state|data[\\/]+state|logs?|cache|tmp|temp|archive|exports?)([\\/]|$)|[-_.](report|digest|inventory|baseline|telemetry|snapshot|dump|export|audit)[-_.]/i;
const REPORTISH_EXT = new Set([".json", ".md", ".markdown", ".xml", ".yaml", ".yml"]);

const DEFAULT_CONFIG_REL = path.join("mcp-server", "data", "state", "ollama-route-config.json");
const DEFAULT_STATS_REL = path.join("mcp-server", "data", "state", "ollama-offload-stats.json");

/**
 * Hook self-exemption (Reviewer B P1, scrutiny round 2026-05-22): files where Claude
 * MUST see the raw bytes for the system to function correctly. A chat reading its own
 * MILESTONE_PROGRESS or BUILD_STATE expects the actual JSON, not an Ollama gist of it.
 * Also exempts the hook's own config + stats (substituting either would break activation
 * + measurement). Checked by basename — path-agnostic so peer copies are also exempt.
 */
const EXEMPT_BASENAMES = new Set([
  "ollama-route-config.json",
  "ollama-offload-stats.json",
  "MILESTONE_PROGRESS.json",
  "BUILD_STATE.json",
  "chat-slots.json",
  "slot-task-claims.json",
  "CLOSE-OUT-CANDIDATES.json",
  "AWARENESS-SNAPSHOT.json",
  "BASELINE_INVENTORY.json",
  "system-graph.json",
  "loop-state.json",
  "scrutiny-ledger.json",
  "PENDING_GAP_ENGINES.json",
  "HOOK_REGISTRY.json",
  "STOP_HOOK_REGISTRY.json",
]);

function findProjectRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  return start;
}

export function isDisabled(env = process.env) {
  return String(env.PRISM_OLLAMA_ROUTE ?? "") === "0";
}

/**
 * Pure config-file loader. Returns null when the file is absent or unreadable; otherwise
 * an object containing ONLY validated fields (invalid fields silently omitted, with a
 * telemetry event recorded). Env vars always take precedence over config — this is the
 * FALLBACK source, never the override.
 *
 * Schema (post-parse range validation enforced here, not at the consumer):
 *  - mode: 'auto' | 'suggest' (enum) — anything else dropped (config_bad_mode)
 *  - minKb: integer >= MIN_KB_FLOOR (8) — guards against malicious {minKb:0} that would
 *    route EVERY read (denial-of-Claude-context attack)
 *  - model: matches /^[\w./:-]{1,64}$/ — live /api/tags allowlist verification happens in
 *    runRoute (needs IO and cannot be done purely here)
 *
 * IO is injectable (`readFn`, `telemetryFn`) for tests.
 */
export function loadRouteConfig({ configPath, readFn = fs.readFileSync, telemetryFn = () => {} } = {}) {
  const cp = configPath || path.join(findProjectRoot(), DEFAULT_CONFIG_REL);
  let raw;
  try {
    raw = readFn(cp, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return null; // file absent is normal
    telemetryFn({ event: "config_read_error", code: err?.code || "unknown" });
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    telemetryFn({ event: "config_parse_error" });
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const out = {};
  if (parsed.mode === "auto" || parsed.mode === "suggest") out.mode = parsed.mode;
  else if (parsed.mode !== undefined) telemetryFn({ event: "config_bad_mode", value: String(parsed.mode).slice(0, 32) });
  if (Number.isInteger(parsed.minKb) && parsed.minKb >= MIN_KB_FLOOR) out.minKb = parsed.minKb;
  else if (parsed.minKb !== undefined) telemetryFn({ event: "config_bad_minKb", value: parsed.minKb });
  if (typeof parsed.model === "string" && MODEL_NAME_RE.test(parsed.model)) out.model = parsed.model;
  else if (parsed.model !== undefined) telemetryFn({ event: "config_bad_model", value: String(parsed.model).slice(0, 64) });
  return out;
}

/**
 * Is this Read target a bulk-data file (vs source / small / something being edited)?
 * @returns {{consumable:boolean, kind:string, reason:string}}
 */
export function classifyReadTarget(filePath) {
  const fp = typeof filePath === "string" ? filePath : "";
  if (!fp) return { consumable: false, kind: "", reason: "no path" };
  const base = path.basename(fp);
  if (EXEMPT_BASENAMES.has(base)) {
    return { consumable: false, kind: "exempt", reason: `load-bearing file '${base}' exempt from substitution` };
  }
  const ext = path.extname(fp).toLowerCase();
  if (SRC_EXT.has(ext)) return { consumable: false, kind: "source", reason: `source file (${ext})` };
  if (BULK_EXT.has(ext)) return { consumable: true, kind: ext.slice(1) || "data", reason: `bulk-data extension ${ext}` };
  const hinted = BULK_PATH_HINT.test(fp);
  if (REPORTISH_EXT.has(ext)) {
    return hinted
      ? { consumable: true, kind: "data-doc", reason: `${ext} under a report/state path` }
      : { consumable: false, kind: "doc", reason: `${ext} but not in a report/state path` };
  }
  if (!ext || ext === ".bak" || ext === ".old") {
    return hinted
      ? { consumable: true, kind: "data", reason: "extensionless file under a report/state path" }
      : { consumable: false, kind: "other", reason: "extensionless and not in a report/state path" };
  }
  return { consumable: false, kind: "other", reason: `unrecognised bulk type (${ext})` };
}

/**
 * Curated gist-only allowlist (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-AUTO-ROUTE-ALLOWLIST).
 *
 * Even with auto-route enabled, ONLY genuinely gist-only files may be summary-
 * substituted: raw logs, text dumps, and archived streams that are read for
 * "what generally happened", never for an exact value. Structured / decision-
 * bearing data (.json/.jsonl/.csv/.md digests, inventory, baseline, audit,
 * snapshot, telemetry, reports) is read for EXACT values — substituting a lossy
 * 14B summary there yields wrong answers AND an expensive full re-read (net
 * negative). Those stay suggest-only even in auto mode. This makes flipping
 * `mode:auto` / PRISM_OLLAMA_ROUTE_AUTO=1 safe-by-construction: the worst case
 * is a log gets summarized, never a digest the chat needed verbatim.
 *
 * Empirical basis: the route NUDGE take-rate sits near 0% across thousands of
 * fires — i.e. when offered, summary substitution is almost never wanted — so a
 * conservative allowlist is the correct default. See memory
 * reference_blackwell_token_synergy_ms0_2026_06_03 + the operator decision
 * (2026-06-03) to ship the narrow allowlist rather than blanket auto-route.
 */
const GIST_SAFE_EXT = new Set([".log", ".txt", ".out"]);
const GIST_SAFE_PATH = /(^|[\\/])(logs?|archive|archives)([\\/]|$)|[-_.]dump[-_.]/i;

/**
 * Is this consumable file safe to AUTO-summarize (read for gist, not exact value)?
 * Conservative by design: raw log/text/dump/archive streams only. Structured
 * data docs (.json/.jsonl/.csv/.md/.yaml) are always excluded — they are the
 * exact-value class. Callers should only consult this for files already deemed
 * `consumable` by classifyReadTarget.
 * @returns {boolean}
 */
export function isGistSafe(filePath) {
  const fp = typeof filePath === "string" ? filePath : "";
  if (!fp) return false;
  const ext = path.extname(fp).toLowerCase();
  // Structured data docs are never gist-safe even under a logs/archive path
  // (e.g. logs/metrics-snapshot.json is still an exact-value read).
  if (REPORTISH_EXT.has(ext)) return false;
  if (GIST_SAFE_EXT.has(ext)) return true;
  return GIST_SAFE_PATH.test(fp);
}

/**
 * Pure routing decision.
 *
 * Cascade short-circuit (envelope GPU-OFFLOAD-MAXIMIZE-MS0/U1 R2/R1): in auto mode,
 * if EITHER ollamaReachable is false OR modelOk is false, return action:"pass" — NOT
 * "suggest" (which writes an advisory the caller may ignore) and NOT "reroute" (which
 * would silently degrade to a substitute backed by a broken substrate). Raw Read is the
 * only correct fail-open path when allowlist verification cannot complete.
 */
export function decideRoute({ filePath, exists, sizeBytes, mode, ollamaReachable, modelOk, minBytes: min }) {
  if (!exists) return { action: "pass", kind: "", sizeBytes: 0, reason: "file does not exist" };
  if (!(sizeBytes >= min)) return { action: "pass", kind: "", sizeBytes: sizeBytes || 0, reason: `under ${Math.round(min / KB)}KB` };
  const c = classifyReadTarget(filePath);
  if (!c.consumable) return { action: "pass", kind: c.kind, sizeBytes, reason: c.reason };
  if (mode === "auto") {
    if (!ollamaReachable) {
      return { action: "pass", kind: c.kind, sizeBytes, reason: "auto mode but ollama /api/tags unreachable — cascade short-circuit to raw Read" };
    }
    if (!modelOk) {
      return { action: "pass", kind: c.kind, sizeBytes, reason: "auto mode but configured model not in /api/tags allowlist — cascade short-circuit to raw Read" };
    }
    // Curated allowlist: auto-substitute ONLY gist-only files (logs/dumps/
    // archives). Decision-bearing data (digests/inventory/state/audit) is
    // consumable but exact-value — downgrade to suggest so it is never
    // silently summarized. Keeps blanket auto-route safe-by-construction.
    if (!isGistSafe(filePath)) {
      return { action: "suggest", kind: c.kind, sizeBytes, reason: `auto mode but '${c.kind}' is exact-value class — suggest only (curated gist allowlist)` };
    }
    return { action: "reroute", kind: c.kind, sizeBytes, reason: "auto + gist-safe + ollama up + model verified in allowlist" };
  }
  return { action: "suggest", kind: c.kind, sizeBytes, reason: c.reason };
}

// ── IO / Ollama ───────────────────────────────────────────────────────────────

function ollamaBase(env = process.env) {
  return (env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
}

/**
 * Combined reachability + model-list fetch. ONE /api/tags call serves both purposes —
 * the live model allowlist must come from the same call that proves reachability,
 * otherwise the cascade short-circuit would need two separate IO calls per Read.
 * @returns {{ok:boolean, models:string[]}}
 */
async function ollamaTagsFetch(env = process.env, timeoutMs = 1500) {
  try {
    const r = await fetch(`${ollamaBase(env)}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return { ok: false, models: [] };
    const j = await r.json();
    const models = Array.isArray(j?.models)
      ? j.models.map((m) => (m && typeof m.name === "string" ? m.name : null)).filter(Boolean)
      : [];
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  }
}

/** Default summariser: read the file (capped), ask qwen for a gist, return {summary, contentSha} | null. */
async function defaultOllamaSummarize(filePath, model, env = process.env, timeoutMs = 30000) {
  // COLD-START-FIX (2026-06-10, slot:zulu): bumped 9000->30000. A warm qwen2.5-coder:32b
  // gist of a 48KB cap takes ~8s; under any load that crossed the old 9s ceiling and
  // fail-opened (no offload). Live root cause of the byHook.ollama-route-pretooluse
  // 2/4357 offload rate -- mode was already 'auto', the model just kept timing out cold.
  let content;
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(READ_FOR_SUMMARY_CAP);
      const n = fs.readSync(fd, buf, 0, READ_FOR_SUMMARY_CAP, 0);
      content = buf.subarray(0, n);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
  const contentSha = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
  const prompt =
    `You are a code/data triage assistant. Summarise the following file concisely for an engineer ` +
    `who has NOT read it: what it is, its structure, the key facts/numbers, and anything actionable. ` +
    `Be terse — bullet points, no preamble.\n\nFILE: ${filePath}\n\n${content.toString("utf8")}`;
  try {
    const r = await fetch(`${ollamaBase(env)}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, keep_alive: "30m" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const out = typeof j?.response === "string" ? j.response.trim() : "";
    if (!out) return null;
    return { summary: out, contentSha };
  } catch {
    return null;
  }
}

function telemetry(env, rec) {
  try {
    const root = findProjectRoot();
    const f = path.join(root, ".claude", "cache", "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "ollama-route-pretooluse", t: new Date().toISOString(), ...rec }) + "\n");
  } catch {
    /* ignore */
  }
}

/**
 * Telemetry unification: append a per-fire decision to the offload dashboard's data
 * store at `mcp-server/data/state/ollama-offload-stats.json` so the dashboard can see
 * file-read offloads (previously invisible — they only landed in hook-telemetry.jsonl).
 *
 * Atomic RMW via PID-temp + rename. Race-tolerant: rare concurrent fires can lose at
 * most one increment per race. Never crashes the Read on stats-write failure (the file
 * read MUST proceed even if telemetry is broken — R12 keep-the-machine-running).
 */
function updateOffloadStats({ decision, sizeKB }) {
  try {
    const root = findProjectRoot();
    const f = path.join(root, DEFAULT_STATS_REL);
    let stats;
    try {
      stats = JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {
      return; // file absent/corrupt — skip unification rather than create a parallel state
    }
    if (!stats.byHook || typeof stats.byHook !== "object") stats.byHook = {};
    if (!stats.byHook["ollama-route-pretooluse"]) {
      stats.byHook["ollama-route-pretooluse"] = { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
    }
    const h = stats.byHook["ollama-route-pretooluse"];
    h.fired += 1;
    if (decision === "reroute") {
      h.offloaded += 1;
      // Rough estimate: 1 KB ≈ 250 tokens for json/text/log (conservative — real ratio varies)
      h.tokensSaved += Math.max(0, Math.round(sizeKB * 250));
    } else if (decision === "suggest") {
      h.suggested += 1;
    } else if (decision === "pass") {
      h.kept += 1;
    }
    stats.lastUpdated = new Date().toISOString();
    const tmp = `${f}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(stats, null, 2));
    fs.renameSync(tmp, f);
  } catch {
    /* stats-write failure must never break a Read */
  }
}

/**
 * The decision + (in auto mode) the Ollama call. IO is injectable for tests.
 * @returns {{action:"pass"|"suggest"|"reroute", message:string, kind:string, sizeKB:number}}
 */
export async function runRoute({
  stdin,
  env = process.env,
  statFn = (p) => fs.statSync(p),
  tagsFetchFn = ollamaTagsFetch,
  summarizeFn = defaultOllamaSummarize,
  configFn = loadRouteConfig,
  statsFn = updateOffloadStats,
} = {}) {
  if (isDisabled(env)) return { action: "pass", message: "", kind: "", sizeKB: 0 };
  const filePath = stdin?.tool_input?.file_path;
  if (typeof filePath !== "string" || !filePath) return { action: "pass", message: "", kind: "", sizeKB: 0 };

  let exists = false,
    sizeBytes = 0;
  try {
    const st = statFn(filePath);
    exists = st.isFile();
    sizeBytes = st.size;
  } catch {
    exists = false;
  }
  if (!exists) return { action: "pass", message: "", kind: "", sizeKB: 0 };

  // Config-file fallback (env vars take precedence over config).
  const config =
    configFn({
      configPath: env.PRISM_OLLAMA_ROUTE_CONFIG,
      telemetryFn: (rec) => telemetry(env, rec),
    }) || {};

  // Mode resolution: env > config > default 'suggest'
  let mode;
  if (env.PRISM_OLLAMA_ROUTE_AUTO === "1") mode = "auto";
  else if (env.PRISM_OLLAMA_ROUTE_AUTO === "0") mode = "suggest";
  else if (config.mode) mode = config.mode;
  else mode = "suggest";

  // minBytes resolution: env > config > default 24 KB (floor MIN_KB_FLOOR enforced in both paths)
  let min;
  const envKbNum = Number(env.PRISM_OLLAMA_ROUTE_MIN_KB);
  if (Number.isFinite(envKbNum) && envKbNum >= MIN_KB_FLOOR) min = envKbNum * KB;
  else if (config.minKb) min = config.minKb * KB;
  else min = DEFAULT_MIN_KB * KB;

  // Model resolution: env > config > default (the FAST trivial tier, not 32b).
  let model = env.PRISM_OLLAMA_ROUTE_MODEL || config.model || DEFAULT_ROUTE_MODEL;

  // In auto mode, verify Ollama reachable + model is in the live allowlist BEFORE proposing
  // a substitution. If the configured/default model is NOT live (retirement), resolve to a
  // live FAST tier so a deleted model still offloads instead of failing open (U-ZULU-ROUTE-
  // MODEL-RESOLVE). Cascade short-circuit handles the no-usable-model path in decideRoute.
  let tagsOk = false;
  let modelOk = false;
  if (mode === "auto") {
    const tags = await tagsFetchFn(env);
    tagsOk = tags.ok;
    if (tagsOk) {
      const resolved = resolveRouteModel(model, tags.models);
      if (resolved && resolved !== model) {
        telemetry(env, { event: "route_model_resolved", file: filePath, from: model, to: resolved });
        model = resolved;
      }
      modelOk = resolved !== null; // resolveRouteModel only returns a model that IS live (or null)
    }
    if (!tagsOk) telemetry(env, { event: "cascade_unreachable", file: filePath });
    else if (!modelOk) telemetry(env, { event: "cascade_model_missing", file: filePath, model, available: tags.models.length });
  }

  const d = decideRoute({ filePath, exists, sizeBytes, mode, ollamaReachable: tagsOk, modelOk, minBytes: min });
  const sizeKB = Math.round(d.sizeBytes / KB);

  if (d.action === "pass") {
    statsFn({ decision: "pass", sizeKB });
    return { action: "pass", message: "", kind: d.kind, sizeKB };
  }

  if (d.action === "suggest") {
    statsFn({ decision: "suggest", sizeKB });
    return {
      action: "suggest",
      kind: d.kind,
      sizeKB,
      message:
        `💡 "${filePath}" is ~${sizeKB}KB (${d.kind}). If you only need a summary / classification of it, ` +
        `prefer \`/ollama-summarize "${filePath}"\` or \`/ollama-classify "${filePath}"\` — that routes to the ` +
        `local qwen and costs ~no Claude tokens. Reading it directly is fine if you actually need the raw bytes.`,
    };
  }

  // reroute (auto mode + ollama up + model in allowlist): try the substitution; fail OPEN to a normal Read.
  const result = await summarizeFn(filePath, model, env);
  if (!result) {
    telemetry(env, { event: "summarize_failed", file: filePath, model });
    statsFn({ decision: "pass", sizeKB });
    return { action: "pass", message: "", kind: d.kind, sizeKB }; // ollama failed → just let the Read happen
  }
  const { summary, contentSha } = result;
  statsFn({ decision: "reroute", sizeKB });
  return {
    action: "reroute",
    kind: d.kind,
    sizeKB,
    message:
      `[OLLAMA-SUBSTITUTE model=${model} sha256=${contentSha} bytes=${sizeBytes} route=auto kind=${d.kind}]\n\n` +
      `${summary}\n\n` +
      `(Need the full content after all? Read it again with offset/limit, or set PRISM_OLLAMA_ROUTE_AUTO=0 / write {"mode":"suggest"} to mcp-server/data/state/ollama-route-config.json.)`,
  };
}

function emit(o) {
  process.stdout.write(JSON.stringify(o));
}

async function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch {
    stdin = null;
  }

  let res;
  try {
    res = await runRoute({ stdin });
  } catch {
    return emit({ continue: true });
  }

  if (res.action === "pass") return emit({ continue: true });

  telemetry(process.env, {
    event: res.action,
    kind: res.kind,
    sizeKB: res.sizeKB,
    file: stdin?.tool_input?.file_path ?? null,
    session: stdin?.session_id ?? null,
  });

  if (res.action === "suggest") {
    // advisory-decay gate (U-ADVISORY-DECAY): suppress the nudge if route-pretooluse
    // has degraded to proven noise (>= 50 injections at < 5% offload-take). The
    // `suggested` counter was already bumped by statsFn inside runRoute, so the
    // epsilon-probe counter advances even when suppressed (self-revival). The
    // `reroute` path below (an actual offload = a conversion) is NEVER gated --
    // only the nudge. Today route is insufficient-data (~13 injections < 50) ->
    // always fires; this arms it. Reads route's OWN resolved stats path so
    // read-path == write-path (slot-worktree safe).
    const decay = decayDecision("ollama-route-pretooluse", {
      statsPath: path.join(findProjectRoot(), DEFAULT_STATS_REL),
    });
    if (!decay.fire) return emit({ continue: true });
    return emit({
      continue: true,
      hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: res.message },
    });
  }
  // reroute → deny the raw Read, hand back the summary
  return emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Routed to local qwen — see [OLLAMA-SUBSTITUTE ...] banner in additionalContext for sha+bytes audit.`,
      additionalContext: res.message,
    },
  });
}

const invokedDirectly = (() => {
  try {
    return path.resolve(process.argv[1] || "").endsWith("ollama-route-pretooluse.mjs");
  } catch {
    return false;
  }
})();
if (invokedDirectly) main();
