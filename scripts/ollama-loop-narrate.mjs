#!/usr/bin/env node
// scripts/ollama-loop-narrate.mjs
// U-VERIFIED-OFFLOAD-LOOPNARRATE (2026-06-09, slot:alpha): a verified-offload consumer
// that narrates a /loop iteration on local Ollama -- free Claude tokens on the
// per-iteration summary every loop produces. Built on the verifiedOffload keystone.
//
// THE HONESTY PROPERTY (why this is safe to auto-offload): the PASS/FAIL decision is
// `passed = isCleanExitZero(testExit)` -- PURE CODE, never the model, and FAIL-CLOSED
// (a missing/empty/malformed exit code is NOT a pass). The model only
// writes the advisory narration prose (verifier = nonEmptyText, the weakest tier,
// correct here because nothing ACTS on the prose). A model that hallucinates "all
// good" can NEVER flip a real test failure to passed -- the exit code is ground truth.
//
// CLI:  node scripts/ollama-loop-narrate.mjs --test-exit <N> [--diff <text>|stdin] [--test-output @file]
// Knob: PRISM_OLLAMA_OFFLOAD_MODEL (default gpt-oss:20b).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { verifiedOffload, nonEmptyText } from "./lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";

const DEFAULT_MODEL = process.env.PRISM_OLLAMA_OFFLOAD_MODEL || "gpt-oss:20b";
const DIFF_CAP = 12000;        // cap diff fed to the model (token bound)
const TEST_CAP = 4000;         // cap test-output fed to the model
const NARRATION_MIN_LEN = 16;  // a narration shorter than this is not useful -> fallback
const MAX_HEAD_FILES = 3;      // files named verbatim in the deterministic fallback

/**
 * isCleanExitZero -- true ONLY for a clean integer exit code of 0. FAIL-CLOSED:
 * missing/empty/malformed (undefined, null, "", "  ", false, [], "0.0") -> NOT passed.
 * Number("")/Number(null)/Number(false)/Number([]) all coerce to 0, which would
 * otherwise read a missing exit code as PASS -- a verdict we can't trust is not a pass.
 */
export function isCleanExitZero(v) {
  if (typeof v === "number") return Number.isInteger(v) && v === 0;
  if (typeof v === "string") { const t = v.trim(); return /^-?\d+$/.test(t) && Number(t) === 0; }
  return false;
}

/** deterministic narration from the diff's changed files + the (code-decided) pass flag. */
export function fallbackNarration(diff, passed) {
  const files = [];
  for (const m of String(diff || "").matchAll(/^\+\+\+ b\/(.+)$/gm)) {
    if (m[1] && m[1] !== "/dev/null") files.push(m[1].split(/[\\/]/).pop());
  }
  const status = passed ? "tests passed" : "tests FAILED";
  if (files.length === 0) return `Iteration complete; ${status}.`;
  const head = files.slice(0, MAX_HEAD_FILES).join(", ");
  const more = files.length > MAX_HEAD_FILES ? ` (+${files.length - MAX_HEAD_FILES} more)` : "";
  return `Iteration touched ${files.length} file(s): ${head}${more}; ${status}.`;
}

/**
 * narrateIteration -- verified-offload narration of one /loop iteration.
 * `passed` is derived from `testExit` ONLY (ground truth, never the model). The summary
 * is advisory model prose with a deterministic fallback.
 * @returns {passed, summary, source, verified, fellBack}
 */
export async function narrateIteration(opts = {}) {
  const passed = isCleanExitZero(opts.testExit); // GROUND TRUTH -- code decides (fail-CLOSED on malformed)
  const diff = String(opts.diff || "").slice(0, DIFF_CAP);
  const testOut = String(opts.testOutput || "").slice(0, TEST_CAP);
  const prompt =
    `In 2-3 plain sentences, summarize what this code iteration changed and that its ` +
    `tests ${passed ? "PASSED" : "FAILED"}. No preamble, no markdown.\n\n` +
    `=== DIFF ===\n${diff}\n=== TEST OUTPUT ===\n${testOut}`;
  const run = opts.runImpl ? () => opts.runImpl(prompt) : async () => {
    const r = await callOllamaOnce(prompt, { model: opts.model || DEFAULT_MODEL, timeoutMs: opts.timeoutMs || 45000, temperature: 0 });
    return r && r.ok ? r.text : "";
  };
  const res = await verifiedOffload({
    run,
    verify: nonEmptyText(opts.minLen || NARRATION_MIN_LEN),
    fallback: async () => fallbackNarration(diff, passed),
    label: "narrateIteration",
    onResult: opts.onResult,
  });
  return { passed, summary: res.value, source: res.source, verified: res.verified, fellBack: res.fellBack };
}

// ---- CLI ----
/** pure arg parser: returns RAW string values (--test-exit validated downstream by
 *  isCleanExitZero, so an empty/malformed code can't slip through as a finite 0). */
export function parseCliArgs(argv) {
  const valOf = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  return { testExit: valOf("--test-exit"), diff: valOf("--diff"), testOutputArg: valOf("--test-output") };
}

async function main(argv) {
  const { testExit, diff: diffArg, testOutputArg } = parseCliArgs(argv);
  if (testExit === undefined) { process.stderr.write("usage: node scripts/ollama-loop-narrate.mjs --test-exit <N> [--diff <text>|stdin] [--test-output @file]\n"); return 2; }
  let diff = diffArg;
  if (diff === undefined) { try { diff = readFileSync(0, "utf8"); } catch { diff = ""; } } // stdin fallback
  let testOutput = testOutputArg || "";
  if (testOutput.startsWith("@")) { try { testOutput = readFileSync(testOutput.slice(1), "utf8"); } catch { testOutput = ""; } }
  const r = await narrateIteration({ testExit, diff, testOutput });
  process.stdout.write(JSON.stringify(r) + "\n");
  return 0;
}

const invokedDirectly = (() => { try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } })();
if (invokedDirectly) main(process.argv.slice(2)).then((c) => process.exit(c || 0)).catch((e) => { process.stderr.write(`ollama-loop-narrate fatal: ${e && e.message}\n`); process.exit(1); });
