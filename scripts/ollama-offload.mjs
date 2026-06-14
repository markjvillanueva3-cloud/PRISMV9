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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { verifiedOffload, enumMember, nonEmptyText } from "./lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";

const DEFAULT_MODEL = process.env.PRISM_OLLAMA_OFFLOAD_MODEL || "gpt-oss:20b";

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
    return 0;
  }
  if (mode === "digest") {
    let text = rest[0] || "";
    if (text.startsWith("@")) { try { text = readFileSync(text.slice(1), "utf8"); } catch { process.stderr.write("cannot read file\n"); return 2; } }
    const r = await offloadDigest(text);
    process.stdout.write(JSON.stringify(r) + "\n");
    return 0;
  }
  if (mode === "digest-files") {
    // Multi-source verified digest (consumer #9). Each arg is a file path (leading
    // @ tolerated). Missing files are skipped fail-soft; nothing readable -> reason.
    if (rest.length === 0) { process.stderr.write("usage: digest-files <path1> <path2> ...\n"); return 2; }
    const r = await offloadFilesDigest(rest);
    process.stdout.write(JSON.stringify(r) + "\n");
    return 0;
  }
  process.stderr.write("modes: classify | digest | digest-files\n");
  return 2;
}

const invokedDirectly = (() => { try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } })();
if (invokedDirectly) main(process.argv.slice(2)).then((c) => process.exit(c || 0)).catch((e) => { process.stderr.write(`ollama-offload fatal: ${e && e.message}\n`); process.exit(1); });
