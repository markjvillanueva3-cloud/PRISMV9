#!/usr/bin/env node
// scripts/ollama-offload.mjs
// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the FIRST live consumer of
// the verifiedOffload keystone (scripts/lib/ollama-verified-offload.mjs) -- a
// reusable, fleet-callable offload primitive that runs a task on LOCAL Ollama and
// returns the result ONLY when a code verifier passes, else a safe fallback. This
// is the R15-step-3 live proof (the keystone's 15 tests are hermetic/injected;
// this exercises it against real Ollama via callOllamaOnce).
//
// Two 100%-safe offloads (free Claude tokens, local compute):
//   offloadClassify(text, allowed)  -- pick ONE of a fixed enum. 100% because the
//       enumMember verifier rejects any hallucinated value -> fallback {value:null}.
//   offloadDigest(text)             -- summarize for a digest. Verified non-empty;
//       fallback = the truncated raw text (caller always gets SOMETHING usable).
//
// CLI:  node scripts/ollama-offload.mjs classify "<text>" <opt1> <opt2> ...
//       node scripts/ollama-offload.mjs digest "<text-or-@file>"
// Knob: PRISM_OLLAMA_OFFLOAD_MODEL (default gpt-oss:20b -- fast + tool-capable).
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifiedOffload, enumMember, nonEmptyText } from "./lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";
// U-HERMES-VERIFIED-TIER-WIRE (2026-06-24, slot:alpha): the strong-tier variants
// route the SAME verified classify/digest through Hermes(strong) -> Ollama(free) ->
// the SAME safe fallback, lighting the (previously dark) ask-hermes lane on the
// canonical offload CLI. The verifier is unchanged, so a hallucinated Hermes answer
// is rejected exactly like a hallucinated Ollama one.
import { verifiedTieredOffload, makeHermesRunner, makeOllamaRunner } from "./lib/verified-offload-tiered.mjs";
import { atomicOffloadStatsRMW, ensureOffloadBucket, clampSaved } from "./lib/offload-stats-bump.mjs";

const DEFAULT_MODEL = process.env.PRISM_OLLAMA_OFFLOAD_MODEL || "gpt-oss:20b";

// U-LOCAL-OFFLOAD-VISIBLE (2026-06-24, slot:alpha): the LOCAL verified offloads (classify/
// digest/digest-files) recorded NOTHING -- only the *-strong tiers logged byHook["ask-hermes"].
// So a successful $0-Claude local offload was invisible to gradeOllamaUtilization + the offload
// dashboard (the sibling gap of U-FILE-DIGEST-OFFLOAD-RECORD). recordLocalOffload counts a
// verified local offload under byHook["ollama-offload-cli"] {offloaded>0 + byMode} -- the
// dashboard live-byHook scan auto-recognizes offloaded>0 as a real off-Claude run. Fail-safe
// atomic RMW, never creates the file, never throws. Mirrors recordFileDigestOffload (R11). It
// deliberately does NOT bump the top-level executedOffloads (that is ask-ollama-scoped per
// gradeOllamaUtilization; these run via callOllamaOnce, a distinct lane -- R7, not conflated).
// DEDUP (U-OFFLOAD-STATS-BUMP-DEDUP, 2026-06-24): the atomic-RMW envelope this once inlined
// (+ 3 siblings: ask-hermes#recordUsage, recordTieredUsage, recordFileDigestOffload) is now the
// shared ./lib/offload-stats-bump.mjs; recordLocalOffload keeps only its OWN
// byHook["ollama-offload-cli"] + byMode mutate (R7 surface-don't-fork).
const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const STATS_PATH = process.env.PRISM_OLLAMA_OFFLOAD_CLI_STATS_PATH || resolve(REPO_ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const CLI_STATS_KEY = "ollama-offload-cli";

/**
 * Record a SUCCESSFUL verified LOCAL offload (classify/digest/digest-files) under
 * byHook[CLI_STATS_KEY] so the local lever is visible to the dashboard, via the shared
 * fail-safe atomic-RMW envelope (./lib/offload-stats-bump.mjs) -- never CREATES the
 * file, never throws. Keeps its OWN byMode bucket mutate (R7 surface-don't-fork).
 * @param {{mode?:string, tokensSaved?:number, statsPath?:string}} o
 * @returns {boolean} true iff the stats file was updated
 */
export function recordLocalOffload({ mode = "unknown", tokensSaved = 0, statsPath = STATS_PATH } = {}) {
  return atomicOffloadStatsRMW(statsPath, (stats) => {
    const h = ensureOffloadBucket(stats, CLI_STATS_KEY, { withByMode: true });
    h.fired = (h.fired | 0) + 1;
    h.offloaded = (h.offloaded | 0) + 1;
    h.tokensSaved = (h.tokensSaved | 0) + clampSaved(tokensSaved);
    h.byMode[mode] = (h.byMode[mode] | 0) + 1;
  });
}

// Default ollama runner: returns the trimmed text, or "" on any failure (-> the
// verifiedOffload run-empty path -> fallback). Injectable for hermetic tests.
function ollamaRunner(prompt, opts = {}) {
  return async () => {
    const r = await callOllamaOnce(prompt, { model: opts.model || DEFAULT_MODEL, timeoutMs: opts.timeoutMs || 30000, temperature: 0 });
    return r && r.ok ? r.text : "";
  };
}

/**
 * offloadClassify -- classify `text` into exactly one of `allowed` on local Ollama.
 * 100% accurate by construction: enumMember rejects anything not in the set, so a
 * hallucinated label falls back to {value:null} rather than returning garbage.
 * @returns the verifiedOffload record {value, source, verified, fellBack, reason}
 */
export async function offloadClassify(text, allowed, opts = {}) {
  if (!Array.isArray(allowed) || allowed.length === 0) throw new TypeError("offloadClassify: allowed must be a non-empty array");
  const prompt =
    `Classify the following into EXACTLY ONE of these categories: ${allowed.join(", ")}.\n` +
    `Reply with ONLY the category, nothing else.\n\n---\n${String(text ?? "").slice(0, 8000)}\n---`;
  const run = opts.runImpl ? () => opts.runImpl(prompt) : ollamaRunner(prompt, opts);
  return verifiedOffload({
    run,
    verify: enumMember(allowed),
    fallback: async () => (typeof opts.fallback === "function" ? opts.fallback() : null),
    label: "offloadClassify",
    onResult: opts.onResult,
  });
}

/**
 * offloadDigest -- summarize `text` to <= `maxWords` for a digest on local Ollama.
 * Verified non-empty; fallback = the truncated raw text (the caller always gets a
 * usable string -- a digest failure must never blank the field).
 */
export async function offloadDigest(text, opts = {}) {
  const maxWords = Number.isFinite(opts.maxWords) ? opts.maxWords : 60;
  const src = String(text ?? "");
  const prompt =
    `Summarize the following in <= ${maxWords} words, plain prose, no preamble:\n\n---\n${src.slice(0, 16000)}\n---`;
  const run = opts.runImpl ? () => opts.runImpl(prompt) : ollamaRunner(prompt, opts);
  return verifiedOffload({
    run,
    verify: nonEmptyText(opts.minLen || 12),
    fallback: async () => src.slice(0, opts.fallbackChars || 400),
    label: "offloadDigest",
    onResult: opts.onResult,
  });
}

/**
 * offloadClassifyStrong -- classify `text` into one of `allowed` via the TIERED
 * ladder: Hermes(strong, stronger-than-Ollama) first, then local Ollama, then the
 * safe fallback (default null -- a hallucinated label can never surface, identical
 * to offloadClassify). Records the off-Claude call into byHook["ask-hermes"], so a
 * verified Hermes classification lights the otherwise-dark lane. Injectable
 * hermesRunImpl/ollamaRunImpl/record for hermetic tests.
 * @returns the verifiedTieredOffload record {value, source, tier, verified, fellBack, reason}
 */
export async function offloadClassifyStrong(text, allowed, opts = {}) {
  if (!Array.isArray(allowed) || allowed.length === 0) throw new TypeError("offloadClassifyStrong: allowed must be a non-empty array");
  const prompt =
    `Classify the following into EXACTLY ONE of these categories: ${allowed.join(", ")}.\n` +
    `Reply with ONLY the category, nothing else.\n\n---\n${String(text ?? "").slice(0, 8000)}\n---`;
  return verifiedTieredOffload({
    verify: enumMember(allowed),
    fallback: async () => (typeof opts.fallback === "function" ? opts.fallback() : null),
    hermesRun: opts.hermesRunImpl ? () => opts.hermesRunImpl(prompt) : makeHermesRunner({ mode: "classify", input: prompt, model: opts.hermesModel }),
    ollamaRun: opts.ollamaRunImpl ? () => opts.ollamaRunImpl(prompt) : makeOllamaRunner({ input: prompt, model: opts.model }),
    tier: opts.tier || "strong",
    mode: "classify",
    input: prompt,
    record: opts.record,
    label: "offloadClassifyStrong",
  });
}

/**
 * offloadDigestStrong -- summarize `text` via the TIERED ladder (Hermes -> Ollama ->
 * truncated-raw fallback, identical floor to offloadDigest so the caller always gets
 * a usable string). Verified non-empty on every tier. Records into byHook["ask-hermes"].
 * @returns the verifiedTieredOffload record augmented with tier/source
 */
export async function offloadDigestStrong(text, opts = {}) {
  const maxWords = Number.isFinite(opts.maxWords) ? opts.maxWords : 60;
  const src = String(text ?? "");
  const prompt =
    `Summarize the following in <= ${maxWords} words, plain prose, no preamble:\n\n---\n${src.slice(0, 16000)}\n---`;
  return verifiedTieredOffload({
    verify: nonEmptyText(opts.minLen || 12),
    fallback: async () => src.slice(0, opts.fallbackChars || 400),
    hermesRun: opts.hermesRunImpl ? () => opts.hermesRunImpl(prompt) : makeHermesRunner({ mode: "summarize", input: prompt, model: opts.hermesModel }),
    ollamaRun: opts.ollamaRunImpl ? () => opts.ollamaRunImpl(prompt) : makeOllamaRunner({ input: prompt, model: opts.model }),
    tier: opts.tier || "strong",
    mode: "summarize",
    input: prompt,
    record: opts.record,
    label: "offloadDigestStrong",
  });
}

/**
 * offloadFilesDigest -- read N files, aggregate, and verified-digest the whole set
 * on local Ollama. Consumer #9 (chat-bus / multi-handoff condense): the single-file
 * `digest @file` path can't condense the 92-unread chat-bus (many JSONL message
 * files) or a multi-handoff fileset. This reads each path (fail-soft: a missing /
 * unreadable file is SKIPPED, not fatal), concatenates with labeled separators,
 * bounds the total to `maxChars` (default 16000 -- the offloadDigest input cap), and
 * verified-digests the aggregate. Fallback inherits offloadDigest's (the truncated
 * raw aggregate), so the caller ALWAYS gets a usable string even when Ollama is down.
 * Returns the verifiedOffload record augmented with `sources` (the files actually
 * read) -- empty `sources` + a synthetic record when NOTHING was readable (R12: the
 * caller can see it digested nothing rather than a silent empty).
 *
 * @param {string[]} paths repo-relative or absolute file paths (leading `@` tolerated)
 * @param {{readImpl?, maxChars?, ...offloadDigestOpts}} opts readImpl injectable for tests
 */
export async function offloadFilesDigest(paths, opts = {}) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new TypeError("offloadFilesDigest: paths must be a non-empty array");
  }
  const read = typeof opts.readImpl === "function"
    ? opts.readImpl
    : (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };
  const maxChars = Number.isFinite(opts.maxChars) ? opts.maxChars : 16000;
  const sources = [];
  const chunks = [];
  let total = 0;
  for (const raw of paths) {
    if (typeof raw !== "string" || raw.length === 0) continue;
    const p = raw.startsWith("@") ? raw.slice(1) : raw;
    const body = read(p);
    if (body == null || String(body).length === 0) continue; // fail-soft skip
    const base = p.replace(/\\/g, "/").split("/").pop() || p;
    const labeled = `=== ${base} ===\n${String(body)}`;
    chunks.push(labeled);
    sources.push(p);
    total += labeled.length;
    if (total >= maxChars) break; // bound the aggregate; offloadDigest re-caps anyway
  }
  if (sources.length === 0) {
    return { value: "", source: "none", verified: false, fellBack: true, reason: "no-readable-files", sources: [] };
  }
  const aggregate = chunks.join("\n\n").slice(0, maxChars);
  const rec = await offloadDigest(aggregate, opts);
  return { ...rec, sources };
}

// ---- CLI ----
async function main(argv) {
  const [mode, ...rest] = argv;
  if (mode === "classify") {
    const [text, ...allowed] = rest;
    if (!text || allowed.length === 0) { process.stderr.write("usage: classify \"<text>\" <opt1> <opt2> ...\n"); return 2; }
    const r = await offloadClassify(text, allowed);
    process.stdout.write(JSON.stringify(r) + "\n");
    // Record the $0 local offload so the lever is visible (only on a verified ollama run).
    // classify saving = input-only by design (the verified output is a single short enum label, ~0 tokens).
    if (r && r.source === "ollama" && r.verified) recordLocalOffload({ mode: "classify", tokensSaved: Math.round(String(text).length / 4) });
    return 0;
  }
  if (mode === "digest") {
    let text = rest[0] || "";
    if (text.startsWith("@")) { try { text = readFileSync(text.slice(1), "utf8"); } catch { process.stderr.write("cannot read file\n"); return 2; } }
    const r = await offloadDigest(text);
    process.stdout.write(JSON.stringify(r) + "\n");
    if (r && r.source === "ollama" && r.verified) {
      const outLen = JSON.stringify(r.value ?? "").length;
      recordLocalOffload({ mode: "digest", tokensSaved: Math.round(Math.max(0, String(text).length - outLen) / 4) });
    }
    return 0;
  }
  if (mode === "digest-files") {
    // Multi-source verified digest (consumer #9). Each arg is a file path (leading
    // @ tolerated). Missing files are skipped fail-soft; nothing readable -> reason.
    if (rest.length === 0) { process.stderr.write("usage: digest-files <path1> <path2> ...\n"); return 2; }
    const r = await offloadFilesDigest(rest);
    process.stdout.write(JSON.stringify(r) + "\n");
    if (r && r.source === "ollama" && r.verified) {
      let inBytes = 0;
      for (const f of (r.sources || [])) { try { inBytes += statSync(f).size; } catch { /* unreadable -> skip its bytes */ } }
      const outLen = JSON.stringify(r.value ?? "").length;
      recordLocalOffload({ mode: "digest-files", tokensSaved: Math.round(Math.max(0, inBytes - outLen) / 4) });
    }
    return 0;
  }
  if (mode === "classify-strong") {
    const [text, ...allowed] = rest;
    if (!text || allowed.length === 0) { process.stderr.write("usage: classify-strong \"<text>\" <opt1> <opt2> ...\n"); return 2; }
    const r = await offloadClassifyStrong(text, allowed);
    process.stdout.write(JSON.stringify(r) + "\n");
    return 0;
  }
  if (mode === "digest-strong") {
    let text = rest[0] || "";
    if (text.startsWith("@")) { try { text = readFileSync(text.slice(1), "utf8"); } catch { process.stderr.write("cannot read file\n"); return 2; } }
    const r = await offloadDigestStrong(text);
    process.stdout.write(JSON.stringify(r) + "\n");
    return 0;
  }
  process.stderr.write("modes: classify | digest | digest-files | classify-strong | digest-strong\n");
  return 2;
}

const invokedDirectly = (() => { try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } })();
if (invokedDirectly) main(process.argv.slice(2)).then((c) => process.exit(c || 0)).catch((e) => { process.stderr.write(`ollama-offload fatal: ${e && e.message}\n`); process.exit(1); });
