#!/usr/bin/env node
// scripts/sfc-jm-accuracy-refresh.mjs
//
// SFC-JM-ACCURACY -- one-call refresh of the JM-program SFC accuracy pipeline:
//   1. sfc-jm-program-corpus.mjs  (INCREMENTAL by default -- resumes at cursor,
//      picks up newly-written JM programs; --full re-extracts everything)
//   2. sfc-jm-corpus-analyze.mjs  (re-flags outliers + gross-physical errors)
//
// Built to be pointed at a scheduler (PRISM scheduled-task / cron) so the
// "test SFC against ALL JM programs" corpus + outlier report stay current as the
// shop writes new programs. Sequential spawn; non-zero exit if either stage fails.
//
// USAGE: node scripts/sfc-jm-accuracy-refresh.mjs [--full] [--limit N] [--json]

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(script, scriptArgs) {
  return new Promise((res) => {
    const child = spawn(process.execPath, [resolve(REPO_ROOT, script), ...scriptArgs], {
      cwd: REPO_ROOT, stdio: "inherit", windowsHide: true,
    });
    child.on("exit", (code) => res(code ?? 1));
    child.on("error", () => res(1));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const full = argv.includes("--full");
  const json = argv.includes("--json");
  const limIdx = argv.indexOf("--limit");
  const limit = limIdx >= 0 ? argv[limIdx + 1] : null;

  const corpusArgs = ["--progress", "10000"];
  if (full) corpusArgs.push("--reset");
  if (limit) corpusArgs.push("--limit", limit);

  const c1 = await run("scripts/sfc-jm-program-corpus.mjs", corpusArgs);
  if (c1 !== 0) { console.error(`[refresh] corpus stage failed (${c1})`); process.exit(c1); }

  const c2 = await run("scripts/sfc-jm-corpus-analyze.mjs", json ? ["--json"] : []);
  if (c2 !== 0) { console.error(`[refresh] analyze stage failed (${c2})`); process.exit(c2); }

  // Stage 3: physics test-against (programmed lathe Vc vs canonical Taylor rec).
  // Self-reexecs under tsx to load CANONICAL_TAYLOR; non-fatal if tsx is absent.
  const c3 = await run("scripts/sfc-jm-physics-compare.mjs", json ? ["--json"] : []);
  if (c3 !== 0) console.error(`[refresh] physics-compare stage exit ${c3} (non-fatal -- needs tsx)`);

  console.log("[refresh] SFC JM accuracy pipeline refreshed: SFC-JM-CORPUS-ANALYSIS.json + SFC-JM-PHYSICS-COMPARE.json");
  process.exit(0);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) main().catch((e) => { console.error(`[refresh] fatal: ${e?.message || e}`); process.exit(1); });
