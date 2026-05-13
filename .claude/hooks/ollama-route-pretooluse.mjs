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
 *   PRISM_OLLAMA_ROUTE_MIN_KB        → min file size to bother (default 24)
 *   OLLAMA_URL                       → Ollama base URL (default http://127.0.0.1:11434)
 *   PRISM_OLLAMA_ROUTE_MODEL         → model for the auto summary (default qwen2.5-coder:7b)
 */

import * as fs from "node:fs";
import * as path from "node:path";

const KB = 1024;
const DEFAULT_MIN_KB = 24;
const READ_FOR_SUMMARY_CAP = 48 * KB; // bytes of the file we'll feed to qwen in auto mode

const SRC_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".c", ".h",
  ".cpp", ".hpp", ".cc", ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".sh", ".ps1",
  ".sql", ".css", ".scss", ".less", ".html", ".htm", ".vue", ".svelte", ".lua", ".pl", ".r",
]);
const BULK_EXT = new Set([".log", ".jsonl", ".ndjson", ".csv", ".tsv", ".txt", ".out"]);
// .json / .md / .xml / .yaml count as "bulk data" only when they live somewhere report-y.
// First alternative: a directory segment named state / data/state / logs / cache / tmp / archive
// / exports, anchored to a path-segment boundary (start-of-string OR a slash) so a *relative*
// path like "state/shared/x.md" still matches. Second: a filename token like "-report.", "_inventory.".
const BULK_PATH_HINT =
  /(^|[\\/])(state|data[\\/]+state|logs?|cache|tmp|temp|archive|exports?)([\\/]|$)|[-_.](report|digest|inventory|baseline|telemetry|snapshot|dump|export|audit)[-_.]/i;
const REPORTISH_EXT = new Set([".json", ".md", ".markdown", ".xml", ".yaml", ".yml"]);

export function isDisabled(env = process.env) {
  return String(env.PRISM_OLLAMA_ROUTE ?? "") === "0";
}
function minBytes(env = process.env) {
  const n = Number(env.PRISM_OLLAMA_ROUTE_MIN_KB);
  return (Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_KB) * KB;
}

/**
 * Is this Read target a bulk-data file (vs source / small / something being edited)?
 * @returns {{consumable:boolean, kind:string, reason:string}}
 */
export function classifyReadTarget(filePath) {
  const fp = typeof filePath === "string" ? filePath : "";
  if (!fp) return { consumable: false, kind: "", reason: "no path" };
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
 * Pure routing decision.
 * @param {{filePath:string, exists:boolean, sizeBytes:number, mode:"suggest"|"auto", ollamaReachable:boolean, minBytes:number}} p
 * @returns {{action:"pass"|"suggest"|"reroute", kind:string, sizeBytes:number, reason:string}}
 */
export function decideRoute({ filePath, exists, sizeBytes, mode, ollamaReachable, minBytes: min }) {
  if (!exists) return { action: "pass", kind: "", sizeBytes: 0, reason: "file does not exist" };
  if (!(sizeBytes >= min)) return { action: "pass", kind: "", sizeBytes: sizeBytes || 0, reason: `under ${Math.round(min / KB)}KB` };
  const c = classifyReadTarget(filePath);
  if (!c.consumable) return { action: "pass", kind: c.kind, sizeBytes, reason: c.reason };
  if (mode === "auto" && ollamaReachable) return { action: "reroute", kind: c.kind, sizeBytes, reason: "auto + ollama up" };
  return { action: "suggest", kind: c.kind, sizeBytes, reason: c.reason };
}

// ── IO / Ollama ───────────────────────────────────────────────────────────────

function ollamaBase(env = process.env) {
  return (env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
}

/** Cheap reachability ping (used only in auto mode). */
async function ollamaReachable(env = process.env, timeoutMs = 1200) {
  try {
    const r = await fetch(`${ollamaBase(env)}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Default summariser: read the file (capped), ask qwen for a gist, return string|null. */
async function defaultOllamaSummarize(filePath, env = process.env, timeoutMs = 9000) {
  let content;
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(READ_FOR_SUMMARY_CAP);
      const n = fs.readSync(fd, buf, 0, READ_FOR_SUMMARY_CAP, 0);
      content = buf.subarray(0, n).toString("utf8");
    } finally { fs.closeSync(fd); }
  } catch { return null; }
  const model = env.PRISM_OLLAMA_ROUTE_MODEL || "qwen2.5-coder:7b";
  const prompt =
    `You are a code/data triage assistant. Summarise the following file concisely for an engineer ` +
    `who has NOT read it: what it is, its structure, the key facts/numbers, and anything actionable. ` +
    `Be terse — bullet points, no preamble.\n\nFILE: ${filePath}\n\n${content}`;
  try {
    const r = await fetch(`${ollamaBase(env)}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const out = typeof j?.response === "string" ? j.response.trim() : "";
    return out || null;
  } catch {
    return null;
  }
}

function telemetry(env, rec) {
  try {
    const root = (() => {
      let cur = process.cwd();
      for (let i = 0; i < 10; i++) {
        if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
        const p = path.dirname(cur); if (p === cur) break; cur = p;
      }
      return process.cwd();
    })();
    const f = path.join(root, ".claude", "cache", "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "ollama-route-pretooluse", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

/**
 * The decision + (in auto mode) the Ollama call. IO is injectable for tests.
 * @returns {{action:"pass"|"suggest"|"reroute", message:string, kind:string, sizeKB:number}}
 */
export async function runRoute({ stdin, env = process.env, statFn = (p) => fs.statSync(p), reachableFn = ollamaReachable, summarizeFn = defaultOllamaSummarize }) {
  if (isDisabled(env)) return { action: "pass", message: "", kind: "", sizeKB: 0 };
  const filePath = stdin?.tool_input?.file_path;
  if (typeof filePath !== "string" || !filePath) return { action: "pass", message: "", kind: "", sizeKB: 0 };

  let exists = false, sizeBytes = 0;
  try { const st = statFn(filePath); exists = st.isFile(); sizeBytes = st.size; } catch { exists = false; }

  const mode = String(env.PRISM_OLLAMA_ROUTE_AUTO ?? "") === "1" ? "auto" : "suggest";
  const reach = mode === "auto" ? await reachableFn(env) : false;
  const d = decideRoute({ filePath, exists, sizeBytes, mode, ollamaReachable: reach, minBytes: minBytes(env) });
  const sizeKB = Math.round(d.sizeBytes / KB);

  if (d.action === "pass") return { action: "pass", message: "", kind: d.kind, sizeKB };

  if (d.action === "suggest") {
    return {
      action: "suggest", kind: d.kind, sizeKB,
      message:
        `💡 "${filePath}" is ~${sizeKB}KB (${d.kind}). If you only need a summary / classification of it, ` +
        `prefer \`/ollama-summarize "${filePath}"\` or \`/ollama-classify "${filePath}"\` — that routes to the ` +
        `local qwen and costs ~no Claude tokens. Reading it directly is fine if you actually need the raw bytes.`,
    };
  }

  // reroute (auto mode + ollama up): try the substitution; fail OPEN to a normal Read.
  const summary = await summarizeFn(filePath, env);
  if (!summary) return { action: "pass", message: "", kind: d.kind, sizeKB }; // ollama failed → just let the Read happen
  return {
    action: "reroute", kind: d.kind, sizeKB,
    message:
      `📄 Ollama pre-read summary of "${filePath}" (~${sizeKB}KB) — the raw file was NOT loaded into context:\n\n${summary}\n\n` +
      `(Need the full content after all? Read it again with offset/limit, or set PRISM_OLLAMA_ROUTE_AUTO=0.)`,
  };
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

async function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch { stdin = null; }

  let res;
  try { res = await runRoute({ stdin }); }
  catch { return emit({ continue: true }); }

  if (res.action === "pass") return emit({ continue: true });

  telemetry(process.env, { event: res.action, kind: res.kind, sizeKB: res.sizeKB, file: stdin?.tool_input?.file_path ?? null, session: stdin?.session_id ?? null });

  if (res.action === "suggest") {
    return emit({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: res.message } });
  }
  // reroute → deny the raw Read, hand back the summary
  return emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Routed to local qwen (PRISM_OLLAMA_ROUTE_AUTO=1) — summary below.`,
      additionalContext: res.message,
    },
  });
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("ollama-route-pretooluse.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
