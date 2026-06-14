#!/usr/bin/env node
/**
 * loop-inject-cost-audit.mjs — empirical per-/loop-iteration token-cost audit
 * of the UserPromptSubmit (and optionally SessionStart) hook injection chain.
 *
 * FOXTROT-WORK 2026-05-18 — high-ROI token-saving node-connection audit.
 *
 * `audit-hook-stack-cost.mjs` estimates a flat 400 tokens for every "inject"
 * hook. That over-counts badly: most inject hooks are keyword-gated and emit
 * NOTHING for a given prompt, and several emit byte-identical content on every
 * /loop iteration (pure re-injection waste). This tool measures the REAL cost
 * by running each inject hook TWICE with a representative loop-continuation
 * stdin and classifying its output:
 *   - silent           : emits nothing            -> 0 cost, ignore
 *   - stable-redundant : identical across 2 runs   -> re-injection waste in /loop
 *   - volatile         : differs across 2 runs     -> genuinely fresh, keep
 *   - missing/timeout/error : could not be measured
 *
 * The sum of `stable-redundant` tokens is the per-iteration saving a loop-aware
 * dedup gate (the recommended high-ROI node connection) would recover.
 *
 * SIDE EFFECTS — this tool RUNS real hooks as subprocesses. Hooks known to
 * mutate fleet state (Ollama prewarm spawns, chat-bus appends, consensus queue,
 * the RGS picked-events ledger, per-chat reorient state files) are listed in
 * SIDE_EFFECT_HOOKS and are NEVER run — they are reported as `excluded`. The
 * remaining `inject`-role hooks are believed read-only, but this is a
 * best-effort NAME-keyed denylist, not a guarantee: a hook that gains a write
 * after this list was written would slip through. Run with a throwaway
 * --session id if unsure (the default sid is already a non-fleet placeholder).
 *
 * COVERAGE — only `inject`-role hooks are measured by default. Other hooks
 * (`-guard`/`-suggest`/`-snapshot`) can also inject context; the report
 * discloses how many were skipped so the saving figure is read as a FLOOR.
 *
 * Usage:
 *   node scripts/loop-inject-cost-audit.mjs            # measure + write Obsidian report
 *   node scripts/loop-inject-cost-audit.mjs --json     # machine-readable, no writes
 *   node scripts/loop-inject-cost-audit.mjs --all      # include SessionStart chain
 *   node scripts/loop-inject-cost-audit.mjs --all-roles# also run guard/compute hooks
 *   node scripts/loop-inject-cost-audit.mjs --no-write # skip Obsidian + baseline write
 *
 * Verify: re-run; if total `redundantTokens` drops below the baseline in
 * state/shared/LOOP-INJECT-COST-BASELINE.json a dedup landed; if it climbs,
 * regression.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { classifyHook } from "./audit-hook-stack-cost.mjs";

const SETTINGS = [
  "C:/Users/wompu/.claude/settings.json",
  "H:/.claude/settings.json",
];
const PRISM_ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
const OBSIDIAN_OUT = path.join(PRISM_ROOT, "knowledge/wiki/architecture/loop-inject-token-budget.md");
const BASELINE_OUT = path.join(PRISM_ROOT, "state/shared/LOOP-INJECT-COST-BASELINE.json");
const CHARS_PER_TOKEN = 4;                 // rough chars->tokens for English + markdown
const HARD_TIMEOUT_MS = 9000;              // ceiling per hook run regardless of settings timeout
const MAX_HOOK_OUTPUT_BYTES = 8 * 1024 * 1024;
const ILLUSTRATIVE_LOOP_ITERS = 20;        // for the "over N iterations" report figure
const SCHEMA_VERSION = "1.1.0";

// Hooks that mutate fleet state — NEVER run by the audit (reported as `excluded`).
const SIDE_EFFECT_HOOKS = new Set([
  "ollama-pipeline-injector",    // spawns detached curl /api/generate prewarm
  "ollama-prewarm-on-pipeline",  // spawns detached model prewarm
  "ollama-route-check-inject",   // may trigger ollama routing side effects
  "chat-bus-inject",             // appends to AGENT_CHAT.jsonl
  "auto-consensus-userprompt",   // queues a consensus job
  "pick-prefresh-inject",        // appends to state/shared/roadmap-tool-plan-picked.jsonl (RGS ledger)
  "session-reorient-inject",     // writes a per-chat reorientation-<sid>.json state file
]);

/* ---------------- pure helpers (exported for tests) ---------------- */

/**
 * Extract the interpreter-script path from a settings.json hook `command`.
 * Commands look like:  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/foo.mjs
 * The LAST script-extension token is the hook (the interpreter is never one).
 */
export function hookScriptPath(cmd) {
  if (!cmd || typeof cmd !== "string") return null;
  const matches = cmd.match(/[A-Za-z]:[\\/][^"'\s]*?\.(?:mjs|cjs|js|py)/g);
  if (!matches || !matches.length) return null;
  return matches[matches.length - 1].replace(/\\/g, "/");
}

/** Clean hook name (no path, no extension, no stray quote) — the unit `classifyHook` expects. */
export function hookName(cmd) {
  const script = hookScriptPath(cmd);
  const raw = script
    ? path.basename(script)
    : path.basename(String(cmd || "").trim().split(/\s+/).pop() || "");
  return raw.replace(/["']/g, "").replace(/\.(?:mjs|cjs|js|py)$/i, "");
}

/**
 * Pull injected context out of a hook's stdout. Hooks emit a JSON envelope;
 * non-JSON stdout is NOT structured injection and counts as 0. Identical strings
 * across the nested/flat/systemMessage fields are de-duplicated (no double-count).
 */
export function extractInjected(stdout) {
  const s = (stdout || "").trim();
  if (!s) return "";
  let j;
  try { j = JSON.parse(s); }
  catch { return ""; } // non-JSON stdout: not structured injection
  const seen = new Set();
  const parts = [];
  const add = (v) => {
    if (typeof v === "string" && v.length && !seen.has(v)) { seen.add(v); parts.push(v); }
  };
  const hso = j.hookSpecificOutput;
  if (hso && typeof hso.additionalContext === "string") add(hso.additionalContext);
  if (typeof j.additionalContext === "string") add(j.additionalContext);
  if (typeof j.systemMessage === "string") add(j.systemMessage);
  return parts.join("\n");
}

/**
 * Strip volatile tokens (timestamps, ages, iteration counters, hashes) so two
 * runs of a substantively-stable hook compare equal. The hash rule requires at
 * least one hex letter, so pure-decimal counts are NOT masked (avoids a stable
 * count being mistaken for a volatile hash).
 */
export function normalize(t) {
  return String(t == null ? "" : t)
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, "<TS>")
    .replace(/\d{4}-\d{2}-\d{2}/g, "<DATE>")
    .replace(/\b\d+(?:\.\d+)?(?:ms|hr|min|sec|[smhd])\b\s*(?:old|ago)?/gi, "<AGE>")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<TIME>")
    .replace(/\biter(?:ation)?\s*#?\d+/gi, "iter<N>")
    .replace(/\b(?=[0-9a-f]{8,40}\b)[0-9a-f]*[a-f][0-9a-f]*\b/gi, "<HASH>")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classify a hook from its two measured runs. */
export function classifyRun(run1, run2) {
  for (const bad of ["missing", "timeout", "error"]) {
    if (run1.status === bad || run2.status === bad) return bad;
  }
  if ((run1.bytes || 0) === 0 && (run2.bytes || 0) === 0) return "silent";
  if (normalize(run1.raw) === normalize(run2.raw)) return "stable-redundant";
  return "volatile";
}

export function estTokens(bytes) { return Math.round((bytes || 0) / CHARS_PER_TOKEN); }

/** Walk one event's hook chain out of a parsed settings.json. */
export function walkHooks(json, eventName) {
  const out = [];
  const groups = json && json.hooks && json.hooks[eventName];
  if (!Array.isArray(groups)) return out;
  for (const g of groups) {
    for (const h of (g.hooks || [])) {
      const cmd = h.command || "";
      const name = hookName(cmd);
      const { role } = classifyHook(name); // classifyHook needs a clean basename
      out.push({
        event: eventName,
        matcher: g.matcher || "*",
        command: cmd,
        script: hookScriptPath(cmd),
        timeout: Number(h.timeout) || 0,
        name,
        role,
      });
    }
  }
  return out;
}

/** Aggregate per-hook results into a summary. */
export function summarize(results) {
  const s = {
    measured: results.length,
    silent: 0, stableRedundant: 0, volatile: 0, problem: 0,
    injectedTokens: 0, redundantTokens: 0, volatileTokens: 0,
  };
  for (const r of results) {
    s.injectedTokens += r.tokens || 0;
    if (r.classification === "silent") s.silent++;
    else if (r.classification === "stable-redundant") { s.stableRedundant++; s.redundantTokens += r.tokens || 0; }
    else if (r.classification === "volatile") { s.volatile++; s.volatileTokens += r.tokens || 0; }
    else s.problem++;
  }
  return s;
}

/* ---------------- measurement (impure) ---------------- */

function loadSettings() {
  for (const p of SETTINGS) {
    try { return { json: JSON.parse(fs.readFileSync(p, "utf8")), path: p }; }
    catch { /* try next */ }
  }
  return null;
}

function makeStdin(sid, eventName) {
  return JSON.stringify({
    prompt: "/loop continue — generate high-ROI node connections, token saving, context retention, /goal",
    session_id: sid,
    transcript_path: "",
    cwd: PRISM_ROOT,
    hook_event_name: eventName,
  });
}

/**
 * Run a single hook subprocess and measure its injected output.
 * `spawnImpl` is injectable so the timeout/error paths are unit-testable.
 */
export function runHook(hook, stdin, spawnImpl) {
  const spawn = spawnImpl || spawnSync;
  const script = hook && hook.script;
  if (!script || !fs.existsSync(script)) return { status: "missing", bytes: 0, raw: "" };
  const isPy = /\.py$/i.test(script);
  const bin = isPy ? (process.env.PRISM_PYTHON || "python") : process.execPath;
  const timeoutMs = Math.min(hook.timeout || HARD_TIMEOUT_MS, HARD_TIMEOUT_MS) || HARD_TIMEOUT_MS;
  let r;
  try {
    r = spawn(bin, [script], {
      input: stdin, timeout: timeoutMs, encoding: "utf8",
      cwd: PRISM_ROOT, maxBuffer: MAX_HOOK_OUTPUT_BYTES,
    });
  } catch (e) {
    return { status: "error", bytes: 0, raw: String((e && e.message) || e) };
  }
  if (r.error && (r.error.code === "ETIMEDOUT" || r.signal === "SIGTERM")) {
    return { status: "timeout", bytes: 0, raw: "" };
  }
  if (r.error) return { status: "error", bytes: 0, raw: String(r.error.message || r.error) };
  const inj = extractInjected(r.stdout);
  return {
    status: r.status === 0 ? "ok" : `exit${r.status}`,
    bytes: Buffer.byteLength(inj, "utf8"),
    raw: inj,
  };
}

function recommendation(cls) {
  switch (cls) {
    case "stable-redundant": return "loop-dedup candidate (suppress re-injection on stable iters)";
    case "volatile": return "keep — content genuinely changes per prompt";
    case "silent": return "no-op for this prompt — keyword-gated, free";
    case "timeout": return "investigate — exceeded timeout, may stall the chain";
    case "error": return "investigate — hook errored under audit stdin";
    case "missing": return "settings.json references a script not on disk";
    default: return "—";
  }
}

function auditEvent(json, eventName, sid, allRoles, spawnImpl) {
  const all = walkHooks(json, eventName);
  let skippedByRole = 0;
  let excluded = 0;
  const toMeasure = [];
  for (const h of all) {
    if (!allRoles && h.role !== "inject") { skippedByRole++; continue; }
    if (SIDE_EFFECT_HOOKS.has(h.name)) { excluded++; continue; }
    toMeasure.push(h);
  }
  const results = [];
  for (const h of toMeasure) {
    const stdin = makeStdin(sid, eventName);
    const run1 = runHook(h, stdin, spawnImpl);
    const run2 = runHook(h, stdin, spawnImpl);
    const cls = classifyRun(run1, run2);
    const bytes = Math.max(run1.bytes, run2.bytes);
    results.push({
      name: h.name, role: h.role, event: eventName,
      classification: cls,
      bytes, tokens: estTokens(bytes),
      run1Status: run1.status, run2Status: run2.status,
      recommendation: recommendation(cls),
      script: h.script ? path.relative(PRISM_ROOT, h.script).replace(/\\/g, "/") : null,
    });
  }
  return { results, totalHooks: all.length, skippedByRole, excluded };
}

/* ---------------- rendering ---------------- */

function renderTable(results) {
  const lines = [
    "| Hook | Role | Class | Tokens | run1/run2 | Recommendation |",
    "|------|------|-------|-------:|-----------|----------------|",
  ];
  for (const r of results.slice().sort((a, b) => b.tokens - a.tokens)) {
    lines.push(`| \`${r.name}\` | ${r.role} | ${r.classification} | ${r.tokens} | ${r.run1Status}/${r.run2Status} | ${r.recommendation} |`);
  }
  return lines.join("\n");
}

function renderReport(report) {
  const L = [];
  L.push("---");
  L.push("title: Loop-iteration injection token budget");
  L.push("type: architecture");
  L.push("generated_by: scripts/loop-inject-cost-audit.mjs");
  L.push("status: auto-generated — do not hand-edit");
  L.push("---");
  L.push("");
  L.push("# Loop-iteration injection token budget");
  L.push("");
  L.push(`> Auto-generated ${report.generatedAt} by \`scripts/loop-inject-cost-audit.mjs\`.`);
  L.push("> Empirical measurement (run each inject hook twice with a representative");
  L.push("> /loop-continuation stdin) — supersedes the flat 400-token heuristic in");
  L.push("> `audit-hook-stack-cost.mjs`. Re-run to refresh.");
  L.push("");
  for (const ev of report.events) {
    const s = ev.summary;
    L.push(`## ${ev.event}`);
    L.push("");
    L.push(`- Hooks in chain: ${ev.totalHooks} · measured (inject-role): **${s.measured}** · `
      + `skipped (other roles — may also inject): ${ev.skippedByRole} · `
      + `excluded (side-effecting, not run): ${ev.excluded}`);
    L.push(`- Per-iteration injected tokens (real, measured set): **${s.injectedTokens}**`);
    L.push(`- stable-redundant (re-injection waste): **${s.redundantTokens} tokens** across ${s.stableRedundant} hook(s)`);
    L.push(`- volatile (genuinely fresh, keep): ${s.volatileTokens} tokens across ${s.volatile} hook(s)`);
    L.push(`- silent for this prompt: ${s.silent} hook(s) · measurement problems: ${s.problem}`);
    L.push("");
    L.push(renderTable(ev.results));
    L.push("");
  }
  const upEvent = report.events.find((e) => e.event === "UserPromptSubmit");
  const redundant = upEvent ? upEvent.summary.redundantTokens : 0;
  L.push("## High-ROI node connection");
  L.push("");
  L.push("The `stable-redundant` hooks above re-inject byte-identical content on");
  L.push("every /loop iteration — the model already holds it in context. The");
  L.push("recommended connection is a **loop-context dedup gate**: a coordination");
  L.push("node between the loop-state surface and the UserPromptSubmit inject chain");
  L.push("that suppresses re-injection of a hook whose normalized output is");
  L.push("unchanged since the prior iteration.");
  L.push("");
  L.push(`- Estimated saving (FLOOR — measured inject-role set only): **~${redundant} tokens / iteration**.`);
  L.push(`- Over a ${ILLUSTRATIVE_LOOP_ITERS}-iteration loop: ~${redundant * ILLUSTRATIVE_LOOP_ITERS} tokens — zero quality loss (identical content).`);
  L.push("- Improves context retention: less repeated noise crowding the window.");
  L.push("");
  L.push("> Advisory measurement — does NOT build the gate. The figure is a FLOOR:");
  L.push("> non-inject-role hooks (skipped) and side-effecting hooks (excluded) may");
  L.push("> also re-inject. Side-effecting hooks are listed in `SIDE_EFFECT_HOOKS`");
  L.push("> and are never run by this audit.");
  return L.join("\n");
}

/* ---------------- main ---------------- */

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const includeSessionStart = args.includes("--all");
  const allRoles = args.includes("--all-roles");
  const noWrite = args.includes("--no-write") || asJson;
  let sid = args.find((_, i) => args[i - 1] === "--session");
  if (sid && sid.startsWith("--")) {
    console.error(`loop-inject-cost-audit: --session value looks like a flag (${sid}); ignoring`);
    sid = null;
  }
  if (!sid) sid = "loop-inject-audit-session";

  const settings = loadSettings();
  if (!settings) { console.error("loop-inject-cost-audit: no readable settings.json"); process.exit(2); }

  const eventNames = ["UserPromptSubmit"];
  if (includeSessionStart) eventNames.push("SessionStart");

  const events = [];
  for (const ev of eventNames) {
    const a = auditEvent(settings.json, ev, sid, allRoles, null);
    events.push({
      event: ev, summary: summarize(a.results), results: a.results,
      totalHooks: a.totalHooks, skippedByRole: a.skippedByRole, excluded: a.excluded,
    });
  }

  const up = events.find((e) => e.event === "UserPromptSubmit");
  if (up && up.totalHooks === 0) {
    console.error("loop-inject-cost-audit: 0 hooks found in UserPromptSubmit — settings.json shape changed?");
    process.exit(3);
  }

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    settingsSource: settings.path,
    allRoles,
    events,
  };

  if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }

  const md = renderReport(report);
  console.log(md);

  if (!noWrite) {
    try {
      atomicWrite(OBSIDIAN_OUT, md + "\n");
      const baseline = {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: report.generatedAt,
        events: events.map((e) => ({
          event: e.event, totalHooks: e.totalHooks,
          skippedByRole: e.skippedByRole, excluded: e.excluded, ...e.summary,
        })),
      };
      atomicWrite(BASELINE_OUT, JSON.stringify(baseline, null, 2) + "\n");
      console.error(`\n[loop-inject-cost-audit] report -> ${path.relative(PRISM_ROOT, OBSIDIAN_OUT).replace(/\\/g, "/")}`);
      console.error(`[loop-inject-cost-audit] baseline -> ${path.relative(PRISM_ROOT, BASELINE_OUT).replace(/\\/g, "/")}`);
    } catch (e) {
      console.error(`[loop-inject-cost-audit] write FAILED: ${(e && e.message) || e}`);
      process.exit(4);
    }
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/loop-inject-cost-audit.mjs")) {
  main();
}
