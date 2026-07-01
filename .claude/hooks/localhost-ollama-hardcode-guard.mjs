#!/usr/bin/env node
// tier: T3
// localhost-ollama-hardcode-guard.mjs - PreToolUse:Write|Edit advisory guard.
//
// RATE-LIMIT-FIX / regression-prevention (slot:bravo, 2026-06-09). The Windows localhost->IPv6
// bug (localhost resolves to ::1 but Ollama binds IPv4 127.0.0.1) silently broke ~33 fleet files
// and was the hidden cause of the chronic ~6-7% Ollama offload rate. It was FIRST found 2026-05-30,
// "fixed fleet-wide", and REGRESSED -- 10 days later 33 files still hardcode it, because new code
// keeps getting written with the `http://localhost:11434` default. A per-file sweep does not hold.
// This is the missing LAYER-2 durable fix: catch a NEW hardcode AT WRITE TIME so the regression
// vector is closed (layer-1 = the OLLAMA_URL env var, already set). See
// [[reference_ollama_localhost_systemic_2026_06_09]].
//
// SCOPE: matches a QUOTED `http(s)://localhost:11434` URL VALUE (the broken form), NOT the word
// "localhost" in prose/comments (so it does NOT flag the very fix-comments that explain the bug,
// e.g. "127.0.0.1 NOT localhost"). Advisory only: emits a warning + continues -- never blocks a
// write (a perf/correctness bug is not a safety hard-block; an over-eager block would break legit
// edits). Fail-OPEN on any error. Knob: PRISM_LOCALHOST_GUARD_DISABLE=1.
//
// Karpathy: CLASSIFY=PreToolUse content scan | TECHNIQUE=anchored regex on the quoted-URL value
// | EDGE=Edit vs Write payload, prose-comment mention, the legit :6333 Qdrant port, doc/test/memory
// files | FAILURE=malformed stdin / non-string content -> fail-open silent.

import process from "node:process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The broken pattern as a STRING-LITERAL VALUE: a quote/backtick, then http(s)://localhost:11434.
// Prose like `// localhost:11434 is unreachable` has no leading quote -> not matched. The fixed
// form `'http://127.0.0.1:11434'` -> not matched. Only a re-introduced hardcoded localhost URL hits.
const BROKEN_URL = /['"`]https?:\/\/localhost:11434/;

// Files that legitimately DISCUSS the bug (docs/tests/memories/this guard) -> never flag.
const EXEMPT_PATH = /(\.test\.|\.md$|\/memory\/|\\memory\\|knowledge[\\/]|localhost-ollama-hardcode-guard)/i;

export function extractContent(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return "";
  // Write -> content; Edit/MultiEdit -> new_string (+ edits[]); fall through gracefully.
  if (typeof toolInput.content === "string") return toolInput.content;
  if (typeof toolInput.new_string === "string") return toolInput.new_string;
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((e) => (e && typeof e.new_string === "string" ? e.new_string : "")).join("\n");
  }
  return "";
}

// Decide whether to warn. Pure + testable. Returns { warn:boolean, reason?:string }.
export function decideWarn({ toolName, filePath, content }) {
  if (process.env.PRISM_LOCALHOST_GUARD_DISABLE === "1") return { warn: false };
  if (typeof content !== "string" || !content) return { warn: false };
  if (typeof filePath === "string" && EXEMPT_PATH.test(filePath)) return { warn: false };
  if (!BROKEN_URL.test(content)) return { warn: false };
  return {
    warn: true,
    reason:
      "New hardcoded `http://localhost:11434` detected. On Windows localhost resolves to IPv6 ::1 " +
      "but Ollama binds IPv4 127.0.0.1 -> UNREACHABLE (the systemic offload bug, regressed since " +
      "2026-05-30). Use `process.env.OLLAMA_URL || 'http://127.0.0.1:11434'`. See " +
      "reference_ollama_localhost_systemic_2026_06_09.",
  };
}

function main() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }
  let payload = {};
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }
  const toolName = payload.tool_name || payload.toolName || "";
  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || "";
  const content = extractContent(toolName, toolInput);
  const d = decideWarn({ toolName, filePath, content });
  if (!d.warn) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }
  // Advisory: surface the warning via systemMessage, do NOT block the write.
  process.stdout.write(
    JSON.stringify({
      continue: true,
      systemMessage: `localhost-ollama-hardcode-guard: ${d.reason}`,
    }) + "\n",
  );
}

// Only run when invoked directly (not when imported by the test).
const isDirect = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (isDirect) {
  try {
    main();
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  }
}
