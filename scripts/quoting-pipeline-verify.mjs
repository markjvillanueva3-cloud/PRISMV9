#!/usr/bin/env node
/**
 * quoting-pipeline-verify — iter23: single-command health check for the entire
 * iter9-21 quoting calibration pipeline. Discovers every scripts/quoting-*.test.mjs,
 * runs `node --test` against each, parses the TAP summary, aggregates counts.
 *
 * Usage:
 *   node scripts/quoting-pipeline-verify.mjs               # human-readable
 *   node scripts/quoting-pipeline-verify.mjs --json        # machine-readable
 *
 * Exit codes: 0 = all pass · 1 = any test file failed · 2 = discovery/runner error.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-PIPELINE-VERIFY (charlie /goal-yolo iter23)
 */

import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

/**
 * Pure TAP-summary parser. node --test emits lines like:
 *   # tests 21
 *   # pass 21
 *   # fail 0
 *   # skipped 0
 *
 * Returns { tests, pass, fail, skipped }. Missing keys default to 0.
 */
export function parseTapSummary(text) {
  const out = { tests: 0, pass: 0, fail: 0, skipped: 0 };
  if (typeof text !== "string" || text.length === 0) return out;
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^# (tests|pass|fail|skipped)\s+(\d+)/);
    if (m) {
      const key = m[1];
      const val = parseInt(m[2], 10);
      if (Number.isFinite(val) && key in out) out[key] = val;
    }
  }
  return out;
}

/** Aggregate multiple file summaries into a fleet total. */
export function aggregateSummaries(perFile) {
  const total = { tests: 0, pass: 0, fail: 0, skipped: 0, file_count: 0, fail_files: [] };
  if (!Array.isArray(perFile)) return total;
  for (const f of perFile) {
    if (!f || typeof f !== "object") continue;
    total.file_count++;
    total.tests += f.tests ?? 0;
    total.pass += f.pass ?? 0;
    total.fail += f.fail ?? 0;
    total.skipped += f.skipped ?? 0;
    if ((f.fail ?? 0) > 0 || (f.exit_code ?? 0) !== 0) {
      total.fail_files.push(f.file ?? "(unknown)");
    }
  }
  return total;
}

// ---------- CLI ----------

async function discoverTestFiles(scriptsDir) {
  const entries = await fs.readdir(scriptsDir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    // iter32 fix: also catch install-quoting-* test files (iter26 cron-install
    // test was named install-quoting-pipeline-cron.test.mjs, not quoting-*,
    // and was silently excluded from coverage).
    if (/^(quoting-|install-quoting-).+\.test\.mjs$/.test(e.name)) {
      out.push(`${scriptsDir}/${e.name}`);
    }
  }
  out.sort();
  return out;
}

function runOneTestFile(filePath) {
  return new Promise((resolveP) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(process.execPath, ["--test", filePath], { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("close", code => {
      const summary = parseTapSummary(stdout);
      resolveP({
        file: filePath,
        ...summary,
        exit_code: code ?? -1,
        stderr_tail: stderr.split("\n").filter(l => l.toLowerCase().includes("error") || l.toLowerCase().includes("fail")).slice(0, 5),
      });
    });
  });
}

async function main() {
  const jsonOut = process.argv.includes("--json");
  const __filename = fileURLToPath(import.meta.url);
  const scriptsDir = dirname(__filename);

  let files;
  try {
    files = await discoverTestFiles(scriptsDir);
  } catch (e) {
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, stage: "discover", reason: String(e) }) + "\n");
    else process.stderr.write(`[pipeline-verify] FAIL discovery: ${e}\n`);
    process.exit(2);
  }

  if (files.length === 0) {
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, stage: "discover", reason: "no quoting-*.test.mjs files found" }) + "\n");
    else process.stderr.write(`[pipeline-verify] FAIL: no test files matched scripts/quoting-*.test.mjs\n`);
    process.exit(2);
  }

  const perFile = [];
  for (const f of files) {
    perFile.push(await runOneTestFile(f));
  }
  const agg = aggregateSummaries(perFile);
  const ok = agg.fail === 0 && agg.fail_files.length === 0;

  if (jsonOut) {
    process.stdout.write(JSON.stringify({
      ok,
      file_count: agg.file_count,
      tests: agg.tests,
      pass: agg.pass,
      fail: agg.fail,
      skipped: agg.skipped,
      fail_files: agg.fail_files,
      per_file: perFile.map(p => ({ file: p.file.replace(/^.*[\\/]/, ""), tests: p.tests, pass: p.pass, fail: p.fail, exit_code: p.exit_code })),
    }) + "\n");
  } else {
    const tag = ok ? "OK" : "FAIL";
    process.stdout.write(`[pipeline-verify] ${tag} | ${agg.file_count} files | ${agg.pass}/${agg.tests} passed | ${agg.fail} failed | ${agg.skipped} skipped\n`);
    for (const p of perFile) {
      const short = p.file.replace(/^.*[\\/]/, "");
      const stat = p.fail === 0 && p.exit_code === 0 ? "  PASS" : "  FAIL";
      process.stdout.write(`${stat} ${short.padEnd(50)} ${p.pass}/${p.tests}\n`);
    }
    if (!ok) {
      process.stderr.write(`[pipeline-verify] FAIL files: ${agg.fail_files.join(", ")}\n`);
    }
  }
  process.exit(ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[pipeline-verify] UNHANDLED: ${e}\n`);
    process.exit(2);
  });
}
