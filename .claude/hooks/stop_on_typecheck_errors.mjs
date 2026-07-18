#!/usr/bin/env node
// tier: T2
/**
 * stop_on_typecheck_errors.mjs — the "never say complete with type errors" gate.
 *
 * DEV-STACK-FIX/U-TYPECHECK-GATE (2026-07-18). The inner-loop build is `build:fast`
 * (esbuild, NO tsc), so a session can edit .ts, commit, and declare "done" while the
 * code does not type-check — the 12-day typecheck-cold gap. This Stop hook runs
 * `tsc --noEmit --incremental` on mcp-server (fast when .tsbuildinfo is warm),
 * bounded by a hard timeout, and surfaces any type error before completion.
 *
 * Baseline is 0 errors (verified live 2026-07-18, even with the working tree dirty),
 * so ANY `error TS` counts.
 *
 * SAFETY (this hook can run on every session Stop fleet-wide — it must never brick):
 *   - DORMANT BY DEFAULT. Does nothing (silent continue) unless PRISM_TYPECHECK_GATE_ACTIVE=1.
 *     -> wiring it into the Stop bundle is a no-op until an operator opts in.
 *   - When active: ADVISORY (surfaces errors, continue:true) unless PRISM_TYPECHECK_GATE_ENFORCE=1,
 *     which makes it BLOCK.
 *   - FAIL-OPEN everywhere: tsc spawn failure, timeout, or ANY exception -> continue.
 *     A broken gate must never prevent a session from ending.
 *   - Override: append this session's stable id to state/shared/TYPECHECK_GATE_OVERRIDES.jsonl
 *     (one JSON line {sid,ts,reason}) to bypass the block for that session.
 *
 * Knobs:
 *   PRISM_TYPECHECK_GATE_ACTIVE=1   -- arm it (default: dormant no-op)
 *   PRISM_TYPECHECK_GATE_ENFORCE=1  -- block instead of advise (implies active)
 *   PRISM_TYPECHECK_GATE_DISABLE=1  -- hard off
 *   PRISM_TYPECHECK_GATE_TIMEOUT_MS -- tsc timeout (default 120000)
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const REPO = "H:/prism";
const MCP = REPO + "/mcp-server";
const TSC = MCP + "/node_modules/typescript/bin/tsc";
const OVERRIDE_LEDGER = REPO + "/state/shared/TYPECHECK_GATE_OVERRIDES.jsonl";
const TIMEOUT_MS = Number(process.env.PRISM_TYPECHECK_GATE_TIMEOUT_MS) > 0
  ? Number(process.env.PRISM_TYPECHECK_GATE_TIMEOUT_MS) : 120_000;
const ENFORCE = process.env.PRISM_TYPECHECK_GATE_ENFORCE === "1";
const ACTIVE = ENFORCE || process.env.PRISM_TYPECHECK_GATE_ACTIVE === "1";

/** Advisory / clean: continue:true (+ optional visible note). */
function cont(note) {
  const out = note
    ? { continue: true, hookSpecificOutput: { hookEventName: "Stop", additionalContext: note } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}
/** Enforce: block the Stop with a reason (Claude Code Stop-hook block contract). */
function block(reason) {
  try { process.stdout.write(JSON.stringify({ decision: "block", reason })); } catch { /* noop */ }
}

/** True if any override line references this session id (best-effort; absent ledger => false). */
function hasOverride(sid) {
  if (!sid || !existsSync(OVERRIDE_LEDGER)) return false;
  try { return readFileSync(OVERRIDE_LEDGER, "utf8").split("\n").some((l) => l.includes(sid)); }
  catch { return false; }
}

/** Drain stdin (bounded) and return the parsed Stop payload, or null. */
function readPayload() {
  return new Promise((resolve) => {
    let buf = "", done = false;
    const fin = () => { if (done) return; done = true; try { process.stdin.destroy(); } catch { /* */ }
      let p = null; try { if (buf.trim().startsWith("{")) p = JSON.parse(buf); } catch { /* */ } resolve(p); };
    try {
      const t = setTimeout(fin, 200);
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", () => { clearTimeout(t); fin(); });
      process.stdin.on("error", () => { clearTimeout(t); fin(); });
    } catch { fin(); }
  });
}

async function main() {
  const payload = await readPayload();

  if (process.env.PRISM_TYPECHECK_GATE_DISABLE === "1" || !ACTIVE) { cont(); return; } // dormant no-op

  const sid = payload && (payload.session_id || payload.sessionId || payload.stable_session_id);
  if (hasOverride(sid)) { cont("typecheck-gate: overridden for this session (ledger)."); return; }
  if (!existsSync(TSC)) { cont(); return; } // no tsc installed -> can't gate, fail-open silent

  let errorCount = 0;
  try {
    // Incremental keeps this cheap when .tsbuildinfo is warm. execFileSync throws on non-zero
    // exit (tsc exits 1/2 when there ARE errors) — we parse the captured output either way.
    execFileSync(process.execPath, ["--max-old-space-size=16384", TSC, "--noEmit", "--incremental"],
      { cwd: MCP, timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  } catch (e) {
    // A THROW here is either (a) tsc found errors (has stdout) or (b) it failed to run / timed out.
    const out = String((e && (e.stdout || "")) || "") + String((e && (e.stderr || "")) || "");
    if (e && (e.code === "ETIMEDOUT" || e.killed)) { cont(); return; } // timeout -> fail-open
    errorCount = (out.match(/error TS\d+/g) || []).length;
    if (errorCount === 0) { cont(); return; } // threw but no parseable TS errors -> fail-open
    const msg = `typecheck-gate: ${errorCount} TypeScript error(s) in mcp-server (baseline is 0). ` +
      `Run \`cd mcp-server && npm run build:tsc\` to see them.` +
      (ENFORCE ? " Fix them, or add this session id to state/shared/TYPECHECK_GATE_OVERRIDES.jsonl to bypass." : "");
    if (ENFORCE) block(msg); else cont(msg);
    return;
  }
  cont(); // clean compile
}

// Run only when invoked directly (not when a test imports helpers).
const direct = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("stop_on_typecheck_errors.mjs");
if (direct) { main().catch(() => cont()); }

export { hasOverride };
