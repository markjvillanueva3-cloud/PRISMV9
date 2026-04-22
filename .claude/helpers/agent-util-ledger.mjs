#!/usr/bin/env node
/**
 * agent-util-ledger.mjs — append-only telemetry helper
 *
 * Phase 0.17 U-PLG9 from MASTER-AI-SYSTEM-ROADMAP. Records a single
 * Task-tool invocation as one JSONL line in AGENT_UTILIZATION_LEDGER.jsonl.
 *
 * Record shape (v1):
 *   {
 *     ulid:          "01HZ...",           // monotonic id
 *     ts:            "2026-04-19T...",    // ISO-8601 UTC
 *     agent:         "Task",              // tool name
 *     subagent_type: "Explore",           // agent kind, null if none
 *     description:   "short desc",        // tool_input.description
 *     durationMs:    1234,                // optional
 *     exitCode:      0,                   // 0=ok; 1=fail; 2=blocked
 *     correlationId: "claude-28fc3e03",   // stable session id
 *     invokedBy:     "claude"             // family: claude|codex|...
 *   }
 *
 * Writes are O_APPEND (atomic up to PIPE_BUF on POSIX; on Windows we
 * rely on Node's appendFileSync serializing writes via open/write/close).
 * ULIDs prevent collision even if two processes interleave.
 *
 * CLI:
 *   node agent-util-ledger.mjs append --agent Task --subagent Explore \
 *        --desc "..." --duration 1234 --exit 0 --corr claude-28fc3e03 \
 *        --by claude
 *   node agent-util-ledger.mjs stats [--since 7d]
 */

import { appendFileSync, mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const LEDGER = resolve("H:/prism/state/shared/AGENT_UTILIZATION_LEDGER.jsonl");
const MAX_BYTES = 32 * 1024 * 1024; // 32 MB soft cap; rotation deferred

function makeUlid() {
  // ULID-like: 48-bit ms timestamp + 80-bit randomness, Crockford Base32.
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const ms = Date.now();
  let tsChars = "";
  let n = BigInt(ms);
  for (let i = 0; i < 10; i++) {
    tsChars = alphabet[Number(n % 32n)] + tsChars;
    n /= 32n;
  }
  const rnd = randomBytes(10);
  let rndChars = "";
  for (const byte of rnd) {
    rndChars += alphabet[byte % 32];
  }
  return tsChars + rndChars.slice(0, 16);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt === undefined || nxt.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = nxt;
        i++;
      }
    }
  }
  return out;
}

function ensureDir() {
  try {
    mkdirSync(dirname(LEDGER), { recursive: true });
  } catch { /* ignore */ }
}

function cmdAppend(args) {
  ensureDir();
  const rec = {
    ulid: makeUlid(),
    ts: new Date().toISOString(),
    agent: args.agent || "unknown",
    subagent_type: args.subagent || null,
    description: typeof args.desc === "string" ? args.desc.slice(0, 240) : null,
    durationMs: args.duration ? Number(args.duration) : null,
    exitCode: args.exit !== undefined ? Number(args.exit) : 0,
    correlationId: args.corr || null,
    invokedBy: args.by || null,
  };
  try {
    appendFileSync(LEDGER, JSON.stringify(rec) + "\n");
    console.log(`appended ${rec.ulid}`);
  } catch (err) {
    console.error(`append failed: ${err.message}`);
    process.exit(1);
  }
}

function cmdStats(args) {
  if (!existsSync(LEDGER)) {
    console.log("ledger empty");
    return;
  }
  const sinceDays = args.since ? parseSince(args.since) : null;
  const cutoff = sinceDays ? Date.now() - sinceDays * 86400_000 : 0;

  const raw = readFileSync(LEDGER, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const byAgent = new Map();
  const bySubagent = new Map();
  let total = 0;
  let fails = 0;
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      if (cutoff && new Date(r.ts).getTime() < cutoff) continue;
      total++;
      if (r.exitCode && r.exitCode !== 0) fails++;
      byAgent.set(r.agent, (byAgent.get(r.agent) || 0) + 1);
      if (r.subagent_type) {
        bySubagent.set(r.subagent_type, (bySubagent.get(r.subagent_type) || 0) + 1);
      }
    } catch { /* skip bad lines */ }
  }
  console.log(`total: ${total} invocations, fails: ${fails}${sinceDays ? ` (last ${sinceDays}d)` : ""}`);
  console.log("by agent:");
  for (const [k, v] of [...byAgent].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  if (bySubagent.size) {
    console.log("by subagent_type (top 10):");
    for (const [k, v] of [...bySubagent].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${k}: ${v}`);
    }
  }
  try {
    const sz = statSync(LEDGER).size;
    console.log(`ledger size: ${(sz / 1024).toFixed(1)} KB (cap ${MAX_BYTES / 1024 / 1024} MB)`);
  } catch { /* ignore */ }
}

function parseSince(s) {
  const m = /^(\d+)([dh])$/.exec(String(s));
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "d" ? n : n / 24;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (cmd) {
    case "append": return cmdAppend(args);
    case "stats": return cmdStats(args);
    default:
      console.error("usage: agent-util-ledger.mjs <append|stats> [...args]");
      process.exit(1);
  }
}

main();
