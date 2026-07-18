#!/usr/bin/env node
// tier: T0
/**
 * concurrency-test.mjs — CPP-MS1-U-CPP07
 *
 * Fires N=7 concurrent child processes, each writing a distinct JSON payload
 * to a shared target file using the same atomicWriteSync(tmp+rename) pattern
 * that .claude/helpers/per-agent-handoff.mjs + milestone-tracker.mjs +
 * roadmap-progress.mjs + roadmap-to-queue.mjs + tribal-auto-categorize.mjs use.
 *
 * Pass conditions:
 *   (a) target file parses as valid JSON after all children exit
 *   (b) content equals exactly one of the 7 writer payloads (last-writer-wins
 *       is acceptable; interleaved bytes are not)
 *   (c) no .tmp residue
 *   (d) all 7 children exit 0
 *
 * Runs 5 scenarios (one per atomized helper domain) to exercise
 * different payload sizes/paths.
 *
 * Usage:
 *   node .claude/hooks/__tests__/concurrency-test.mjs
 *   node .claude/hooks/__tests__/concurrency-test.mjs --writers 15  (stress)
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = new Set(process.argv.slice(2));
const writersArg = process.argv.find(a => a.startsWith("--writers="));
const WRITERS = writersArg ? parseInt(writersArg.split("=")[1], 10) : 7;
const VERBOSE = argv.has("--verbose");

function writerScript(target, payload) {
  return `
import { writeFileSync, renameSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
const target = ${JSON.stringify(target)};
const payload = ${JSON.stringify(payload)};
const tmp = target + "." + process.pid + "." + randomBytes(4).toString("hex") + ".tmp";
try { writeFileSync(tmp, payload); renameSync(tmp, target); }
catch (e) { try { unlinkSync(tmp); } catch {} process.exit(1); }
`.trim();
}

function spawnWriter(target, payload) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e", writerScript(target, payload)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    p.stderr.on("data", (c) => { err += c.toString(); });
    p.on("exit", (code) => resolve({ code, err }));
    p.on("error", (e) => resolve({ code: -1, err: e.message }));
  });
}

async function runScenario(name, payloadFactory) {
  const dir = mkdtempSync(join(tmpdir(), `prism-concurrency-${name}-`));
  const target = join(dir, "shared-state.json");

  const writers = Array.from({ length: WRITERS }, (_, i) => ({
    id: i,
    payload: payloadFactory(i),
  }));

  if (VERBOSE) process.stdout.write(`[${name}] spawning ${WRITERS} writers → ${target}\n`);

  const results = await Promise.all(writers.map(w => spawnWriter(target, w.payload)));

  const allOk = results.every(r => r.code === 0);
  let parsed = null;
  let parseOk = false;
  try { parsed = JSON.parse(readFileSync(target, "utf-8")); parseOk = true; }
  catch { /* invalid JSON */ }

  const payloadStrs = writers.map(w => w.payload);
  const finalStr = parseOk ? JSON.stringify(parsed) : null;
  const matchesOne = parseOk && payloadStrs.some(p => {
    try { return JSON.stringify(JSON.parse(p)) === finalStr; } catch { return false; }
  });

  const leftovers = readdirSync(dir).filter(f => f.endsWith(".tmp"));

  const pass = allOk && parseOk && matchesOne && leftovers.length === 0;

  try { rmSync(dir, { recursive: true, force: true }); } catch {}

  return {
    scenario: name,
    pass,
    writers: WRITERS,
    allChildrenOk: allOk,
    finalParses: parseOk,
    matchesOneWriter: matchesOne,
    tmpResidue: leftovers.length,
    firstError: results.find(r => r.code !== 0)?.err || null,
  };
}

async function main() {
  const scenarios = [
    {
      name: "handoff-markdown",
      factory: (i) => JSON.stringify({ terminal: `T${i}`, phase: "CPP-MS1", resume: `writer-${i}` }),
    },
    {
      name: "roadmap-index",
      factory: (i) => JSON.stringify({ completed_milestones: i * 10, updated_at: `2026-04-16`, writer: i }),
    },
    {
      name: "position-md",
      factory: (i) => JSON.stringify({ phase: `L0-P1-B${i}`, build: "PASS", writer_id: i }),
    },
    {
      name: "tips-db",
      factory: (i) => JSON.stringify({ tips: Array.from({ length: 5 }, (_, k) => ({ id: `tip-${i}-${k}`, category: "wedm" })) }),
    },
    {
      name: "task-queue",
      factory: (i) => JSON.stringify({ queue: [{ unit: `U-CPP${String(i).padStart(2, "0")}`, status: "pending" }] }),
    },
  ];

  const results = [];
  for (const s of scenarios) {
    const r = await runScenario(s.name, s.factory);
    results.push(r);
    const badge = r.pass ? "PASS" : "FAIL";
    process.stdout.write(`[${badge}] ${r.scenario} — writers=${r.writers} parse=${r.finalParses} match=${r.matchesOneWriter} tmp=${r.tmpResidue}\n`);
    if (!r.pass && r.firstError) process.stderr.write(`  err: ${r.firstError.slice(0, 200)}\n`);
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  process.stdout.write(`\nConcurrency test: ${passed}/${total} scenarios pass\n`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`harness error: ${e?.stack || e}\n`);
  process.exit(2);
});
