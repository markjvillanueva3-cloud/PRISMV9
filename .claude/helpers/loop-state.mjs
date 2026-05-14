#!/usr/bin/env node
/**
 * loop-state.mjs — Per-session /loop iteration state helper.
 *
 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
 * chat has no idea the loop was running. This helper persists iteration metadata
 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
 *
 * Layout: state/shared/loop-state/loop-<session-id>.json
 *
 * Usage:
 *   node loop-state.mjs start --session <sid> --task "<task>" --target 20
 *   node loop-state.mjs tick  --session <sid> --status ok|fail --note "<one-line>"
 *   node loop-state.mjs read  --session <sid>             # JSON
 *   node loop-state.mjs end   --session <sid> --reason "<why>"
 *   node loop-state.mjs list                              # all active loops
 *   node loop-state.mjs reap                              # remove stale (>4h inactive)
 *
 * Iteration record: { iter, ts, status, note, tokensApprox }
 *
 * Karpathy R10: checkpoint after every significant step.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");
const STALE_MS = 4 * 60 * 60 * 1000; // 4h inactive → reap

function statePath(sid) {
  const safe = String(sid || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
  return path.join(STATE_DIR, `loop-${safe}.json`);
}

function ensureDir() { fs.mkdirSync(STATE_DIR, { recursive: true }); }

function read(sid) {
  try { return JSON.parse(fs.readFileSync(statePath(sid), "utf-8")); } catch { return null; }
}

function write(sid, state) {
  ensureDir();
  fs.writeFileSync(statePath(sid), JSON.stringify(state, null, 2) + "\n");
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = true;
    }
  }
  return flags;
}

function cmdStart(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = {
    schemaVersion: "1.0.0",
    sessionId: flags.session,
    task: flags.task || "(unspecified)",
    target: Number(flags.target) || 20,
    startedAt: new Date().toISOString(),
    lastTickAt: new Date().toISOString(),
    iter: 0,
    iterations: [],
    status: "running",
  };
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, started: true, target: state.target }) + "\n");
}

function cmdTick(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  if (!state) { process.stdout.write(JSON.stringify({ ok: false, error: "no loop state — run `start` first" }) + "\n"); return; }
  state.iter++;
  state.lastTickAt = new Date().toISOString();
  state.iterations.push({
    iter: state.iter,
    ts: state.lastTickAt,
    status: flags.status || "ok",
    note: flags.note || null,
  });
  // Runaway guard: if iter > 2× target, mark abandoned
  if (state.iter > state.target * 2) { state.status = "abandoned"; state.abandonReason = "exceeded 2× target"; }
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, iter: state.iter, target: state.target, status: state.status }) + "\n");
}

function cmdRead(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  process.stdout.write(JSON.stringify(state || { ok: false, error: "no state" }) + "\n");
}

function cmdEnd(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  if (!state) { process.stdout.write(JSON.stringify({ ok: false, error: "no state" }) + "\n"); return; }
  state.status = "ended";
  state.endedAt = new Date().toISOString();
  state.endReason = flags.reason || null;
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, ended: true, iter: state.iter }) + "\n");
}

function cmdList() {
  ensureDir();
  const files = fs.readdirSync(STATE_DIR).filter((f) => f.startsWith("loop-") && f.endsWith(".json"));
  const out = [];
  for (const f of files) {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(STATE_DIR, f), "utf-8"));
      out.push({
        sessionId: s.sessionId, task: s.task, iter: s.iter, target: s.target,
        status: s.status, lastTickAt: s.lastTickAt,
        staleMs: Date.now() - new Date(s.lastTickAt).getTime(),
      });
    } catch { /* skip */ }
  }
  out.sort((a, b) => a.staleMs - b.staleMs);
  process.stdout.write(JSON.stringify({ ok: true, count: out.length, loops: out }, null, 2) + "\n");
}

function cmdReap() {
  ensureDir();
  const now = Date.now();
  const files = fs.readdirSync(STATE_DIR).filter((f) => f.startsWith("loop-") && f.endsWith(".json"));
  let reaped = 0;
  for (const f of files) {
    try {
      const fp = path.join(STATE_DIR, f);
      const s = JSON.parse(fs.readFileSync(fp, "utf-8"));
      const age = now - new Date(s.lastTickAt || s.startedAt).getTime();
      if (s.status !== "running" && age > STALE_MS) { fs.unlinkSync(fp); reaped++; }
      else if (s.status === "running" && age > STALE_MS) {
        s.status = "stale";
        fs.writeFileSync(fp, JSON.stringify(s, null, 2) + "\n");
      }
    } catch { /* skip */ }
  }
  process.stdout.write(JSON.stringify({ ok: true, reaped }) + "\n");
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = parseFlags(argv.slice(1));
try {
  if (cmd === "start") cmdStart(flags);
  else if (cmd === "tick") cmdTick(flags);
  else if (cmd === "read") cmdRead(flags);
  else if (cmd === "end") cmdEnd(flags);
  else if (cmd === "list") cmdList();
  else if (cmd === "reap") cmdReap();
  else {
    process.stdout.write("loop-state.mjs — usage: start|tick|read|end|list|reap\n");
    process.exit(1);
  }
} catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(e?.message || e) }) + "\n");
  process.exit(1);
}
