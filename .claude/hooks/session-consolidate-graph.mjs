#!/usr/bin/env node
// tier: T4
/**
 * session-consolidate-graph.mjs — SessionEnd / Stop hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U02.
 *
 * Maintains the deliverable counter at
 * `mcp-server/data/state/consolidation-counter.json` and POSTs
 * `prism_memory:record_session_end` to the running MCP. The dispatcher
 * action increments the engine's own counter and (when auto-consolidate
 * is on and N>=5) runs `consolidate()` automatically. When a
 * consolidation report comes back we mirror the consolidated patterns
 * into `H:/prism/knowledge/tribal/` as `pattern-<id>.md` so the vault
 * compounding loop stays in sync.
 *
 * Stdin: SessionEnd / Stop hook event (any shape — we only read for
 *        optional session_id).
 * Stdout: hookSpecificOutput.additionalContext describing the run
 *         (counter, ranConsolidate, patternsMirrored).
 * Exit: always 0 — never blocks session end.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U02
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
// Opportunistic no-elevation sidecar refresh (complement to the elevation-gated
// PRISM Brain Refresh task) -- detach-spawns rebuilds for stale recall sidecars.
import { runSidecarFreshness, defaultPaths } from "../../scripts/lib/sidecar-freshness.mjs";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const COUNTER_FILE = join(STATE_DIR, "consolidation-counter.json");
const PATTERNS_FILE = join(STATE_DIR, "consolidated_patterns.json");
const TRIBAL_VAULT = "H:/prism/knowledge/tribal";
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const REQUEST_TIMEOUT_MS = 8_000;
const MIN_SESSIONS_BEFORE_CONSOLIDATE = 5;

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function loadCounter() {
  try {
    const raw = readFileSync(COUNTER_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.sessionsSinceLast !== "number") return null;
    return parsed;
  } catch { return null; }
}

function saveCounter(state) {
  ensureDir(dirname(COUNTER_FILE));
  writeFileSync(COUNTER_FILE, JSON.stringify(state, null, 2));
}

function defaultCounter() {
  return {
    schemaVersion: "1.0.0",
    sessionsSinceLast: 0,
    minSessionsBeforeConsolidate: MIN_SESSIONS_BEFORE_CONSOLIDATE,
    totalConsolidations: 0,
    lastConsolidation: null,
    lastUpdate: new Date().toISOString(),
  };
}

async function postRecordSessionEnd(sessionId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "prism_memory",
          arguments: {
            action: "record_session_end",
            params: { session_id: sessionId, auto_consolidate: true },
          },
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try { return { ok: true, body: JSON.parse(inner) }; }
    catch { return { ok: false, reason: "bad-inner-json" }; }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

function slugifyPatternId(id) {
  return String(id ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "pattern";
}

function escapeYaml(v) {
  if (v == null) return '""';
  const s = String(v).replace(/\r?\n/g, " ").replace(/"/g, '\\"');
  return `"${s}"`;
}

function renderPatternMd(p) {
  const indexedAt = new Date().toISOString();
  const lines = [
    "---",
    `id: ${escapeYaml(p.id)}`,
    `type: ${escapeYaml(p.type ?? "")}`,
    `occurrences: ${Number.isFinite(Number(p.occurrences)) ? Number(p.occurrences) : 0}`,
    `confidence: ${Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0}`,
    `first_seen: ${escapeYaml(p.firstSeen ?? "")}`,
    `last_seen: ${escapeYaml(p.lastSeen ?? "")}`,
    `kind: pattern`,
    `indexed_at: ${indexedAt}`,
    "---",
    "",
    `# Pattern: ${(p.description ?? p.id ?? "").toString().trim()}`,
    "",
    "## Context",
    "```json",
    JSON.stringify(p.context ?? {}, null, 2),
    "```",
    "",
    "## Source nodes",
    Array.isArray(p.source_nodes) && p.source_nodes.length > 0
      ? p.source_nodes.map((s) => `- ${s}`).join("\n")
      : "_(none)_",
    "",
  ];
  return lines.join("\n");
}

function mirrorPatternsToVault() {
  if (!existsSync(PATTERNS_FILE)) return { mirrored: 0, skipped: 0, missing: true };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(PATTERNS_FILE, "utf8"));
  } catch {
    return { mirrored: 0, skipped: 0, error: "parse-failed" };
  }
  const patterns = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.patterns) ? parsed.patterns : [];
  if (patterns.length === 0) return { mirrored: 0, skipped: 0 };
  ensureDir(TRIBAL_VAULT);
  let mirrored = 0;
  let skipped = 0;
  for (const p of patterns) {
    if (!p || typeof p !== "object") continue;
    const slug = slugifyPatternId(p.id);
    const target = join(TRIBAL_VAULT, `pattern-${slug}.md`);
    const md = renderPatternMd(p);
    if (existsSync(target)) {
      try {
        const existing = readFileSync(target, "utf8");
        const stripFm = (s) => s.replace(/^---[\s\S]*?---\n+/, "");
        if (stripFm(existing) === stripFm(md)) { skipped++; continue; }
      } catch { /* fall through to overwrite */ }
    }
    writeFileSync(target, md);
    mirrored++;
  }
  return { mirrored, skipped, totalSeen: patterns.length };
}

// Detach-spawn a rebuild script so the heavy work survives the hook exit and
// never eats the ~5 s Stop budget. process.execPath is the same (portable) node
// running this hook.
function detachedSpawn(script, args) {
  const child = spawn(process.execPath, [script, ...args], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

// Reachability probe gating the embeddings-rebuild spawn. SEMANTICS (papa/zulu
// 2026-06-12, [[reference_ollama_probe_crywolf_2026_06_12]]): /api/tags can
// take SECONDS while UP under concurrent fleet generation, so an abort/timeout
// means up-but-busy -> spawning is SAFE (the rebuild just runs slower). Only a
// REFUSAL/HTTP-error means the daemon is down and the spawn is doomed. The old
// 1.5s abort->false skipped the embed refresh exactly when content churned
// most. Probe stays short (2.5s) because it runs inside the decision-lock
// window (2-min-TTL stale-reclaim makes a harness kill self-healing).
async function ollamaUp() {
  const base = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => { try { ctrl.abort(); } catch { /* gone */ } }, 2500);
  try {
    const res = await fetch(base + "/api/tags", { signal: ctrl.signal });
    return !!(res && res.ok);
  } catch (e) {
    const msg = String((e && e.message) || e);
    return (e && e.name === "AbortError") || /abort/i.test(msg); // busy=UP, refused=DOWN
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const input = readStdin() ?? {};
  const sessionId = typeof input.session_id === "string" ? input.session_id
    : typeof input.sessionId === "string" ? input.sessionId
    : undefined;

  // Local counter mirror (deliverable artifact). Source of truth is the
  // engine; this file is informational + survives MCP downtime.
  const local = loadCounter() ?? defaultCounter();
  local.sessionsSinceLast = (Number(local.sessionsSinceLast) || 0) + 1;
  local.lastUpdate = new Date().toISOString();
  saveCounter(local);

  const r = await postRecordSessionEnd(sessionId);
  let mirrorReport = { mirrored: 0, skipped: 0 };
  let counterEcho = local.sessionsSinceLast;
  let ranConsolidate = false;

  if (r.ok && r.body?.ok === true) {
    counterEcho = typeof r.body.sessions_since_last === "number" ? r.body.sessions_since_last : counterEcho;
    ranConsolidate = r.body.ran_consolidate === true;
    if (ranConsolidate) {
      // engine already wrote consolidated_patterns.json; mirror new ones
      mirrorReport = mirrorPatternsToVault();
      // sync local counter with engine reset
      local.sessionsSinceLast = 0;
      local.totalConsolidations = (Number(local.totalConsolidations) || 0) + 1;
      local.lastConsolidation = new Date().toISOString();
      saveCounter(local);
    }
  }

  // Opportunistic sidecar freshness (no elevation): detach-spawn rebuilds for
  // any stale recall sidecar (master-index, memory embeddings). Lock + 20-min
  // cooldown keep the 26-chat fleet from a thundering herd. Spawns are detached,
  // so the Stop budget is safe; wrapped so it can never block session end.
  let freshness = null;
  try {
    const { lockPath, stampPath } = defaultPaths(STATE_DIR);
    freshness = await runSidecarFreshness({
      now: Date.now(),
      lockPath,
      stampPath,
      spawnImpl: detachedSpawn,
      ollamaProbe: ollamaUp,
    });
  } catch { /* never block session end on a freshness hiccup */ }

  const freshTag = freshness
    ? (freshness.ran ? ` sidecar-refresh=${freshness.spawned.join("+")}` : ` sidecar=${freshness.reason}`)
    : "";
  const summary = (r.ok
    ? `consolidate-graph: counter=${counterEcho} ranConsolidate=${ranConsolidate} mirrored=${mirrorReport.mirrored}`
    : `consolidate-graph: counter=${counterEcho} mcp-down (${r.reason ?? "unknown"})`) + freshTag;

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: summary,
    },
  }));
}

main().catch((e) => {
  process.stderr.write(`session-consolidate-graph error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
});
