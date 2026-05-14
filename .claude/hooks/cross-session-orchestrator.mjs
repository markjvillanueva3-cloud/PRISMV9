#!/usr/bin/env node
// tier: T1
/**
 * cross-session-orchestrator.mjs — PreToolUse / PostToolUse cross-session event bridge
 *
 * COORD-MS0/U-COORD05: Connects CrossSessionOrchestratorEngine to the harness
 * Edit/Write/MultiEdit/NotebookEdit lifecycle so other live PRISM sessions
 * (claude, codex, …) observe edit-start / edit-finish events and the broker
 * has an authoritative claim/release record for refactor blast-radius checks.
 *
 * Distinct from file-claim-guard.mjs:
 *   - file-claim-guard owns the ChatBus claims hard-block contract (advisory blocking).
 *   - this hook is a lightweight observability layer over AtomicClaimBroker +
 *     CrossTerminalBroadcast so other sessions see the lifecycle, NOT a duplicate
 *     blocking gate. The block path here is opt-in (PRISM_COORD_ORCH_BLOCK=1) for
 *     operators who want a stricter second-line defense.
 *
 * Usage in settings.json:
 *   PreToolUse  matcher "^(Edit|Write|MultiEdit|NotebookEdit)$" → "... cross-session-orchestrator.mjs --pre"
 *   PostToolUse matcher "Edit|Write|MultiEdit|NotebookEdit"    → "... cross-session-orchestrator.mjs --post"
 *
 * Knobs:
 *   PRISM_COORD_ORCH_DISABLE=1   skip all logic (emit {continue:true} immediately)
 *   PRISM_COORD_ORCH_BLOCK=1     block PreToolUse when another live session holds the claim
 *   PRISM_COORD_ORCH_TTL_MS=N    override default 15-min claim TTL
 *   PRISM_COORD_ORCH_DIST=<path> override dist engine module path (tests only)
 *
 * Defensive contract:
 *   - Malformed/empty stdin            → {continue:true}, exit 0
 *   - Tool not in matcher allowlist    → {continue:true}, exit 0
 *   - Missing file path                → {continue:true}, exit 0
 *   - Engine import/throw failure      → {continue:true}, exit 0 (no harness break)
 *   - Broadcast publish failure        → swallowed (already async/fire-and-forget)
 *
 * See: mcp-server/src/engines/CrossSessionOrchestratorEngine.ts (U-COORD04)
 */

import * as fs from "node:fs";

const DEFAULT_DIST = "file:///H:/prism/mcp-server/dist/engines/CrossSessionOrchestratorEngine.js";
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const PRE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.stdout.write("\n");
}

function ok() { emit({ continue: true }); }

function parseTtl() {
  const raw = process.env.PRISM_COORD_ORCH_TTL_MS;
  if (!raw) return DEFAULT_TTL_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_MS;
  return n;
}

function extractFilePath(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  if (toolName === "NotebookEdit") {
    return toolInput.notebook_path || toolInput.notebookPath || null;
  }
  return toolInput.file_path || toolInput.filePath || toolInput.path || null;
}

function sanitizePath(p) {
  // Strip null bytes (adversarial input); trim; reject empty or pathological lengths.
  const s = String(p || "").replace(/\0/g, "").trim();
  if (!s) return null;
  if (s.length > 4096) return null;
  return s;
}

function formatBlockReason(conflict, toolName, filePath) {
  return [
    `🔒 CROSS-SESSION ORCHESTRATOR — ${toolName} blocked (PRISM_COORD_ORCH_BLOCK=1)`,
    ``,
    `Target:    ${filePath}`,
    `Held by:   ${conflict.holder || "unknown"}`,
    `Reason:    ${conflict.error || "active claim in AtomicClaimBroker"}`,
    ``,
    `Another live session holds an orchestrator claim on this file.`,
    `Options:`,
    `  1. Wait for the peer to finish — claims expire on Stop / TTL.`,
    `  2. Coordinate via /broadcast or /chat to negotiate.`,
    `  3. Unset PRISM_COORD_ORCH_BLOCK to revert to advisory-only mode.`,
  ].join("\n");
}

async function loadEngine() {
  const distPath = process.env.PRISM_COORD_ORCH_DIST || DEFAULT_DIST;
  try {
    const mod = await import(distPath);
    return mod.crossSessionOrchestratorEngine || null;
  } catch {
    return null;
  }
}

/**
 * Return a unified broadcast callable. The current source (post-U-COORD04 refactor)
 * names the method `broadcastMessage`; older builds of dist may still expose `broadcast`
 * with a compatible partial-message shape. Tolerate both so the hook does not assume
 * a fresh build is available.
 */
function getBroadcaster(engine) {
  if (typeof engine.broadcastMessage === "function") return (m) => engine.broadcastMessage(m);
  if (typeof engine.broadcast === "function") return (m) => engine.broadcast(m);
  return null;
}

async function handlePre(engine, toolName, filePath) {
  // Safety check: is the file already claimed by a different session?
  let conflict = null;
  try {
    const probe = engine.isFileClaimedByOther(filePath);
    if (probe && probe.claimed) conflict = { holder: probe.holder };
  } catch { /* defensive */ }

  if (conflict && process.env.PRISM_COORD_ORCH_BLOCK === "1") {
    emit({ decision: "block", reason: formatBlockReason(conflict, toolName, filePath) });
    return;
  }

  // Attempt claim (idempotent: same-session re-claim refreshes TTL).
  try {
    const r = engine.claim({ resource: filePath, ttlMs: parseTtl(), reason: toolName });
    if (r && r.success === false && r.conflictingHolder) {
      // Cross-session conflict; advisory only unless BLOCK env is set above.
      // Still emit broadcast so the peer chat sees the bump request.
    }
  } catch { /* defensive */ }

  // Broadcast the edit_started event. Await the broadcaster so the JSONL write
  // is durably flushed before the hook process exits — Node's microtask queue
  // would otherwise race with process exit on short-lived hook invocations.
  // Bounded by a 250ms timeout so a stuck broadcaster cannot exceed the
  // harness PreToolUse latency budget.
  const broadcaster = getBroadcaster(engine);
  if (broadcaster) {
    try {
      await Promise.race([
        Promise.resolve(broadcaster({
          type: "info",
          content: "edit_started",
          payload: {
            file: filePath,
            tool: toolName,
            session: engine.getSessionId(),
          },
        })),
        new Promise(resolve => setTimeout(resolve, 250)),
      ]);
    } catch { /* swallowed */ }
  }

  ok();
}

async function handlePost(engine, toolName, filePath) {
  try {
    engine.release(filePath);
  } catch { /* defensive */ }

  const broadcaster = getBroadcaster(engine);
  if (broadcaster) {
    try {
      await Promise.race([
        Promise.resolve(broadcaster({
          type: "cache_invalidate",
          payload: {
            file: filePath,
            action: "edited",
            tool: toolName,
            session: engine.getSessionId(),
          },
        })),
        new Promise(resolve => setTimeout(resolve, 250)),
      ]);
    } catch { /* swallowed */ }
  }

  ok();
}

async function main() {
  if (process.env.PRISM_COORD_ORCH_DISABLE === "1") { ok(); return; }

  const mode = process.argv.includes("--post") ? "post" : "pre";
  const raw = readStdinSafe();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; }
  catch { ok(); return; }

  const toolName = payload.tool_name || payload.toolName || "";
  if (!PRE_TOOLS.has(toolName)) { ok(); return; }

  const toolInput = payload.tool_input || payload.toolInput || payload.input || {};
  const filePath = sanitizePath(extractFilePath(toolName, toolInput));
  if (!filePath) { ok(); return; }

  const engine = await loadEngine();
  if (!engine) { ok(); return; }

  if (mode === "post") await handlePost(engine, toolName, filePath);
  else await handlePre(engine, toolName, filePath);
}

main().catch(() => ok());
