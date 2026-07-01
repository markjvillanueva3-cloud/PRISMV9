// scripts/ollama-compress-output.mjs
//
// U-OAB-U4 (OLLAMA-AUTORUN-BUILD) -- LLM output-compressor: the actual "upgrade RTK using the LLM/
// hardware leap". RTK's heuristic filter handles STRUCTURED output (git/tsc/vitest) but passes
// UNSTRUCTURED bulk (logs, stack traces, arbitrary dumps) through nearly unchanged. This is a stdin
// filter that semantically compresses that residue via a resident local LLM on the 96GB box:
//
//     <cmd> 2>&1 | rtk <filter> | node scripts/ollama-compress-output.mjs
//
// Four ORDERED guards (each fails to the SAFE side = raw passthrough):
//   1. SIZE GATE      -- input < MIN_BYTES passes through verbatim (LLM never invoked on the band
//                        RTK already handles; no point paying latency to compress a 2KB blob).
//   2. SAFETY DENYLIST (fail-CLOSED) -- if the text carries G-code / units / cutting-physics markers,
//                        pass through VERBATIM. A lossy summary of a feed/speed/units/G-code stream is
//                        a correctness hazard (the local<->cloud safety boundary). Better no savings
//                        than wrong numbers. ANY marker -> the WHOLE input passes raw.
//   3. FAIL-OPEN on LLM -- short timeout; daemon down / non-200 / empty / timeout -> raw passthrough,
//                        exit 0. The compressor must NEVER block or corrupt a Read.
//   4. QUALITY FLOOR  -- emit the summary ONLY if it is < QUALITY_RATIO x raw length and non-empty;
//                        otherwise raw. Footer states it's a summary + how to get exact bytes.
//
// NOT a fork: dsl-output-compressor.mjs is the REGEX compressor (different mechanism); ask-ollama.mjs
// `summarize` mode compresses a FILE/query (different input surface), and is ABSENT in this worktree.
// This calls /api/generate directly (consistent with ollama-codegen.mjs / ollama-capability-probe.mjs
// in this slot). GO-LIVE RECONCILIATION (#14): when ask-ollama.mjs is on the same tree, refactor the
// /api/generate call + truncate + footer to import its shared primitives instead of duplicating them.
// No child_process (uses the HTTP path).

import { readFileSync } from "node:fs";

const MIN_BYTES = Math.max(1, Number(process.env.PRISM_OLLAMA_COMPRESS_MIN_KB || 8) * 1024);
const MAX_SEND_BYTES = Number(process.env.PRISM_OLLAMA_COMPRESS_MAX_KB || 256) * 1024; // cap what we send to the LLM
const QUALITY_RATIO = 0.85;          // compressed must be < 85% of raw to be worth substituting
const TIMEOUT_MS = Number(process.env.PRISM_OLLAMA_COMPRESS_TIMEOUT_MS || 8000);
const MODEL = process.env.PRISM_OLLAMA_COMPRESS_MODEL || "gpt-oss:20b"; // resident fast workhorse (see U-OAB-U1)
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");

// Safety denylist (fail-CLOSED). Conservative by design: a false-positive only costs us a compression
// (output passes raw); a false-NEGATIVE could feed a lossy summary of safety-relevant numbers to the
// model. So we over-match. Markers:
//   - G-code motion / canned cycles:  G0 G00 G1..G3, G8x drilling, G4x comp
//   - M/S/F/T address words:          M03 S5000 F12.5 T01  (spindle / feed / tool)
//   - units codes:                    G20 (inch) / G21 (mm)
//   - cutting-physics vocabulary:     kienzle, taylor, johnson-cook, chip load, SFM/IPM/IPR, DOC/WOC
// All address-word patterns are case-INSENSITIVE and bounded by a negative-digit lookahead, NOT a
// trailing \b. A digit->letter transition ("G01X1.5", "s5000m03") is not a word boundary, so a
// trailing \b would MISS the no-space/lowercase forms many posts emit -- the exact bypass class that
// would leak a real NC stream to the model (reviewer P0, 2026-06-09). Over-matching ordinary logs
// ("AWS s3", "G20 release notes") is by-design fail-CLOSED: a false-positive only costs a compression.
const SAFETY_PATTERNS = [
  /\bg0?\d{1,2}(?!\d)/i,                       // G-codes (G0..G99, incl G01 / lowercase / no-space)
  /\bm0?\d{1,2}(?!\d)/i,                       // M-codes (spindle/coolant/program)
  /\b[sf]\d+(?:\.\d+)?/i,                      // S<spindle> / F<feed> address words
  /\bt0?\d{1,3}(?!\d)/i,                       // T<tool> address
  /\bg2[01](?!\d)/i,                           // units: G20 inch / G21 mm
  /\b(?:kienzle|taylor|johnson[\s-]?cook)\b/i,
  /\bkc\s?1\.1\b/i,                            // Kienzle kc1.1 specific-cutting-force coefficient (no "kienzle" word)
  /\b(?:sfm|ipm|ipr|rpm)\b/i,                  // speeds/feeds units
  /\b(?:chip\s?load|feed\s?rate|cutting\s?force|depth\s?of\s?cut|surface\s?feet)\b/i,
  /\bspindle\b.{0,12}\d/i,                     // spindle near a number ("spindle 5000", "spindle at 5000", "spindle speed 3000")
];

export function containsSafetyCritical(text) {
  if (typeof text !== "string" || !text) return false;
  return SAFETY_PATTERNS.some((re) => re.test(text));
}

export function byteLen(text) {
  return Buffer.byteLength(typeof text === "string" ? text : "", "utf8");
}

// Decide whether to attempt compression. Returns {compress, reason}.
export function decideCompress(text, { minBytes = MIN_BYTES } = {}) {
  if (typeof text !== "string" || text.length === 0) return { compress: false, reason: "empty input" };
  if (byteLen(text) < minBytes) return { compress: false, reason: `under ${Math.round(minBytes / 1024)}KB size gate` };
  if (containsSafetyCritical(text)) return { compress: false, reason: "safety-critical markers (G-code/units/physics) -- fail-closed, pass raw" };
  return { compress: true, reason: "large, no safety markers" };
}

// Quality floor: the summary must be non-empty AND meaningfully shorter than the raw input.
export function qualityOk(rawText, summary, ratio = QUALITY_RATIO) {
  if (typeof summary !== "string" || summary.trim().length === 0) return false;
  return byteLen(summary) < byteLen(rawText) * ratio;
}

export function buildPrompt(text) {
  return (
    "You are a terse triage assistant. Summarise the following command output for an engineer who " +
    "has NOT seen it: what it is, the key facts/numbers/errors, and anything actionable. Bullet points, " +
    "no preamble, no restating the prompt. Preserve exact error strings and counts.\n\n--- OUTPUT ---\n" +
    text
  );
}

// Call the local model. FAIL-OPEN: returns null on ANY failure (timeout / non-200 / empty / throw).
export async function compressViaOllama(text, { model = MODEL, timeoutMs = TIMEOUT_MS, fetchImpl = fetch, url = OLLAMA_URL, maxSendBytes = MAX_SEND_BYTES } = {}) {
  const sliced = byteLen(text) > maxSendBytes ? text.slice(0, maxSendBytes) : text;
  try {
    const res = await fetchImpl(`${url}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: buildPrompt(sliced), stream: false, keep_alive: "30m" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res || !res.ok) return null;
    const j = await res.json();
    const out = typeof j?.response === "string" ? j.response.trim() : "";
    return out || null;
  } catch {
    return null; // daemon down / timeout / parse error -> fail open
  }
}

function footer(model, rawText, summary, truncated, maxSendBytes) {
  const pct = Math.round((byteLen(summary) / Math.max(1, byteLen(rawText))) * 100);
  // R12 honesty: if the input was truncated before the LLM saw it, the summary is missing the tail.
  // Disclose it -- never imply the summary covers bytes the model never read.
  const trunc = truncated ? ` INPUT TRUNCATED to ${Math.round(maxSendBytes / 1024)}KB before summarising -- the tail was NOT seen.` : "";
  return `\n\n[ollama-compress model=${model} ${pct}% of raw -- SUMMARY ONLY.${trunc} Re-run the command raw (or unset PRISM_OLLAMA_COMPRESS) for exact bytes.]`;
}

// Orchestrator. IO-injectable for tests. Returns {action, output, reason}.
export async function runCompress({ input, env = process.env, fetchImpl = fetch, minBytes = MIN_BYTES, maxSendBytes = MAX_SEND_BYTES } = {}) {
  const text = typeof input === "string" ? input : "";
  const d = decideCompress(text, { minBytes });
  if (!d.compress) return { action: "passthrough", output: text, reason: d.reason };

  const model = env.PRISM_OLLAMA_COMPRESS_MODEL || MODEL;
  const summary = await compressViaOllama(text, { model, fetchImpl, maxSendBytes });
  if (summary === null) return { action: "passthrough", output: text, reason: "ollama unavailable/failed -- fail-open" };
  if (!qualityOk(text, summary)) return { action: "passthrough", output: text, reason: "summary not meaningfully shorter -- quality floor" };

  const truncated = byteLen(text) > maxSendBytes;
  return { action: "compress", output: summary + footer(model, text, summary, truncated, maxSendBytes), reason: "compressed" };
}

async function main() {
  let input = "";
  try {
    if (!process.stdin.isTTY) input = readFileSync(0, "utf8");
  } catch {
    input = "";
  }
  let res;
  try {
    res = await runCompress({ input });
  } catch {
    process.stdout.write(input); // never corrupt the pipe
    return;
  }
  process.stdout.write(res.output);
}

// Entry guard: suffix-match, NOT the pathToFileURL compare the siblings use. This runs as a PIPE
// FILTER, so a guard that fails to fire = the filter silently emits nothing -- exactly the Windows/bash
// pathToFileURL no-op that ollama-capability-probe (U10) hit. Suffix-match fires reliably when actually
// invoked; the false-fire risk (a coincidental path suffix) is acceptable for a filter. (reviewer R11)
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/ollama-compress-output.mjs");
if (invokedDirectly) {
  main();
}
