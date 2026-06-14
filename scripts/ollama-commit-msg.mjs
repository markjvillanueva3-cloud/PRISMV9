#!/usr/bin/env node
// scripts/ollama-commit-msg.mjs
// U-VERIFIED-OFFLOAD-COMMITMSG (2026-06-09, slot:alpha): a verified-offload consumer
// that drafts a commit SUBJECT line on local Ollama -- free Claude tokens on an
// action that happens constantly fleet-wide. Built on the verifiedOffload keystone:
// the model proposes a subject, a code verifier enforces the shape, and on any
// failure it falls back to a DETERMINISTIC subject built from the changed files.
// 100% net: you ALWAYS get a valid, shape-checked subject.
//
// VERIFIER (subjectShape): first non-empty line, trimmed, 8..120 chars, single
// line, ASCII printable, not an obvious refusal/preamble. Rejects multi-line dumps,
// empty, or "Sure, here is..." chatter -> fallback.
//
// CLI:  git diff --cached | node scripts/ollama-commit-msg.mjs            # staged
//       node scripts/ollama-commit-msg.mjs --diff "<diff text>"
// It only DRAFTS -- the caller reviews + commits (the diff is ground truth; R5).
// Knob: PRISM_OLLAMA_OFFLOAD_MODEL (default gpt-oss:20b).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { verifiedOffload } from "./lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";

const DEFAULT_MODEL = process.env.PRISM_OLLAMA_OFFLOAD_MODEL || "gpt-oss:20b";
const REFUSAL_RX = /^(sure|here(?:'s| is)|okay|certainly|i (?:can|will|would)|as an ai|the commit)/i;
// printable-ASCII bounds (space .. tilde). A single-line commit subject carries no
// tabs/control chars by the time it reaches here (subjectShape trims first).
const ASCII_MIN = 0x20;
const ASCII_MAX = 0x7e;
// subject-length window + diff cap (git's own ~50-char guideline is advisory; we
// accept up to 120 so a model's slightly-long-but-valid subject still passes).
const SUBJECT_MIN = 8;
const SUBJECT_MAX = 120;
const DIFF_CAP = 12000; // subject only needs the gist -- cap the model+fallback input

// printable-ASCII check without a control-char regex literal (avoids the linter's
// control-char-in-regex flag; loop is equivalent + explicit).
function isAsciiPrintable(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < ASCII_MIN || c > ASCII_MAX) return false;
  }
  return true;
}

/** subjectShape -- PURE verifier. Returns {ok, value:<clean subject>} or false. */
export function subjectShape(raw) {
  if (typeof raw !== "string") return false;
  const first = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) || "";
  // strip surrounding quotes/backticks a model often wraps the subject in
  const s = first.replace(/^["'`]+/, "").replace(/["'`]+$/, "").trim();
  if (s.length < SUBJECT_MIN || s.length > SUBJECT_MAX) return false;
  if (!isAsciiPrintable(s)) return false;
  if (REFUSAL_RX.test(s)) return false; // model preamble/refusal, not a subject
  return { ok: true, value: s };
}

/** deterministic fallback subject from the changed-file list (parsed from the diff).
 *  File-first phrasing on purpose (avoids reading like a SQL statement). */
export function fallbackSubject(diff) {
  const files = [];
  for (const m of String(diff || "").matchAll(/^\+\+\+ b\/(.+)$/gm)) {
    if (m[1] && m[1] !== "/dev/null") files.push(m[1]);
  }
  if (files.length === 0) return "misc changes (no diff parsed)";
  const base = files[0].split(/[\\/]/).pop();
  if (files.length === 1) return `${base} -- changes`;
  return `${files.length} files changed (${base} + ${files.length - 1} more)`;
}

/**
 * draftCommitSubject -- verified-offload draft of a commit subject from a diff.
 * @returns the verifiedOffload record {value, source, verified, fellBack, reason}
 */
export async function draftCommitSubject(diff, opts = {}) {
  const d = String(diff || "").slice(0, DIFF_CAP);
  const prompt = `Write ONE concise git commit subject line (imperative mood, <= 72 chars, no body, no quotes) for this diff. Reply with ONLY the subject line.\n\n---\n${d}\n---`;
  const run = opts.runImpl ? () => opts.runImpl(prompt) : async () => {
    const r = await callOllamaOnce(prompt, { model: opts.model || DEFAULT_MODEL, timeoutMs: opts.timeoutMs || 30000, temperature: 0 });
    return r && r.ok ? r.text : "";
  };
  return verifiedOffload({
    run,
    verify: subjectShape,
    fallback: async () => fallbackSubject(d),
    label: "draftCommitSubject",
    onResult: opts.onResult,
  });
}

// ---- CLI ----
async function main(argv) {
  let diff = "";
  const di = argv.indexOf("--diff");
  if (di >= 0 && argv[di + 1]) diff = argv[di + 1];
  else { try { diff = readFileSync(0, "utf8"); } catch { diff = ""; } } // stdin (e.g. git diff --cached | ...)
  if (!diff.trim()) { process.stderr.write("usage: git diff --cached | node scripts/ollama-commit-msg.mjs   (or --diff text)\n"); return 2; }
  const r = await draftCommitSubject(diff);
  process.stdout.write(JSON.stringify(r) + "\n");
  return 0;
}

const invokedDirectly = (() => { try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } })();
if (invokedDirectly) main(process.argv.slice(2)).then((c) => process.exit(c || 0)).catch((e) => { process.stderr.write(`ollama-commit-msg fatal: ${e && e.message}\n`); process.exit(1); });
