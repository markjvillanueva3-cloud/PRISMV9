#!/usr/bin/env node
// tier: T4
/**
 * posttool-curiosity-tick.mjs — hook_idle_curiosity_v2 (PP-0.18 U-AGI5)
 *
 * Fires PostTool. Increments a persistent counter; every N=50 calls it
 * emits ONE curiosity-queue candidate into CURIOSITY_QUEUE.jsonl. The
 * engine-side dedup (`${kind}:${target}`) makes it safe to re-observe
 * the same candidate across sessions.
 *
 * Rate-limits curiosity so production work isn't drowned in exploration
 * noise. Anti-pattern guard (plan line 758): "rate limit 1 exploration / 50".
 */

import * as fs from "fs";
import * as path from "path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const COUNTER_FILE = "H:/prism/mcp-server/data/state/CURIOSITY_TICK_COUNTER.json";
const QUEUE_LEDGER = "H:/prism/mcp-server/data/state/CURIOSITY_QUEUE.jsonl";
const ENGINES_DIR = "H:/prism/mcp-server/src/engines";
const TESTS_DIR = "H:/prism/mcp-server/src/__tests__";
const TELEMETRY = `${process.env.USERPROFILE || process.env.HOME}/.prism/telemetry/phase-018-curiosity-tick.jsonl`;
const TICK_EVERY = 50;

function loadCounter() { try { return JSON.parse(fs.readFileSync(COUNTER_FILE, "utf-8")); } catch { return { count: 0 }; } }
function saveCounter(c) { try { fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true }); fs.writeFileSync(COUNTER_FILE, JSON.stringify(c)); } catch { /* ignore */ } }

function logTelemetry(ev) {
  try {
    const dir = TELEMETRY.replace(/[^/\\]+$/, "");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TELEMETRY, JSON.stringify({ at: new Date().toISOString(), ...ev }) + "\n");
  } catch { /* ignore */ }
}

function pickUntestedEngine() {
  try {
    if (!fs.existsSync(ENGINES_DIR) || !fs.existsSync(TESTS_DIR)) return null;
    const engines = fs.readdirSync(ENGINES_DIR).filter((f) => f.endsWith("Engine.ts"));
    const tests = new Set(fs.readdirSync(TESTS_DIR).filter((f) => f.endsWith(".test.ts")).map((f) => f.replace(/\.test\.ts$/, "")));
    const untested = engines.filter((e) => !tests.has(e.replace(/\.ts$/, "")));
    if (untested.length === 0) return null;
    const pick = untested[Math.floor(Math.random() * untested.length)];
    const full = path.join(ENGINES_DIR, pick);
    const stat = fs.statSync(full);
    const ageDays = Math.max(0, Math.round((Date.now() - stat.mtimeMs) / 86_400_000));
    return { kind: "zero-citation-tip", target: full.replace(/\\/g, "/"), ageDays, context: "untested engine flagged by idle-curiosity tick" };
  } catch { return null; }
}

function appendObservation(obs) {
  try {
    fs.mkdirSync(path.dirname(QUEUE_LEDGER), { recursive: true });
    const record = { at: new Date().toISOString(), source: "hook_idle_curiosity_v2", ...obs };
    fs.appendFileSync(QUEUE_LEDGER, JSON.stringify(record) + "\n");
  } catch { /* ignore */ }
}

async function main() {
  const input = readStdinSafe();
  let data = null;
  try { data = JSON.parse(input); } catch { /* proceed with empty */ }

  const toolName = data?.tool_name || "";
  if (!toolName) process.exit(0);

  const counter = loadCounter();
  counter.count = (counter.count || 0) + 1;
  const shouldTick = counter.count % TICK_EVERY === 0;
  saveCounter(counter);

  if (!shouldTick) { logTelemetry({ tick: false, count: counter.count }); process.exit(0); }

  const obs = pickUntestedEngine();
  if (!obs) { logTelemetry({ tick: true, count: counter.count, observation: "none-available" }); process.exit(0); }
  appendObservation(obs);
  logTelemetry({ tick: true, count: counter.count, observation: obs.target });
  process.exit(0);
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
