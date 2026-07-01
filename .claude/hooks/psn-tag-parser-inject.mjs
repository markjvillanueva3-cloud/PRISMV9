#!/usr/bin/env node
// tier: T2
// ZULU-ORCHESTRATOR-MS3 / U-ZPSN03 — psn-tag-parser-inject UserPromptSubmit hook.
//
// Closes the closed-loop value gap surfaced by U-ZPSN02's arm-2 assessment.
// U-ZPSN01 (PSN-aware SendKeys directive) + U-ZPSN02 (slot-souls populated
// fleet-wide) made every zulu-emitted /checkin-<slot> directive carry a
//   [psn:domain=X,role=Y,queue=Z,tribal=W]
// tag, but the target chat resuming on the directive saw the tag as inline
// prompt text — no structured surfacing. This hook is that structured
// surfacing. When the incoming user prompt contains a [psn:...] tag, the
// hook injects a one-line slot capability brief as `additionalContext`
// BEFORE any other hook injection runs.
//
// Pure parsing is delegated to scripts/lib/psn-tag-parse.mjs (32 tests
// node:test green). This hook is the I/O wrapper — stdin → parse → emit.
//
// Disable: PRISM_PSN_PARSER_DISABLE=1.
// Verbose: PRISM_PSN_PARSER_VERBOSE=1 (appends `_(raw: <tag>)_` footer).
//
// Wired from: C:\Users\<user>\.claude\settings.json UserPromptSubmit chain
// (auto-mirrored to H:/.claude/settings.json by the c-to-h-mirror hook).
// Position priority: AFTER slot-bind-enforce + slot-soul-inject (those
// resolve identity first) but BEFORE master-index-precheck-inject so the
// PSN frame anchors before search nudges run.
//
// Safety: NEVER throws. Every error path emits {continue:true} and exits 0
// so the user prompt is never blocked / dropped by this hook.

import { parsePsnTag, buildBriefFromPsn } from "../../scripts/lib/psn-tag-parse.mjs";

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
function emitEmpty() { emit({ continue: true }); }

async function readStdin() {
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  } catch { return ""; }
}

async function main() {
  if (process.env.PRISM_PSN_PARSER_DISABLE === "1") return emitEmpty();

  const raw = await readStdin();
  if (!raw) return emitEmpty();

  let env;
  try { env = JSON.parse(raw); } catch { return emitEmpty(); }

  // UserPromptSubmit envelope shape: { session_id, prompt, ... }.
  const prompt = typeof env?.prompt === "string" ? env.prompt : "";
  if (!prompt) return emitEmpty();

  let parsed;
  try { parsed = parsePsnTag(prompt); } catch { return emitEmpty(); }
  if (!parsed) return emitEmpty();

  let brief;
  try { brief = buildBriefFromPsn(parsed); } catch { return emitEmpty(); }
  if (!brief) return emitEmpty();

  // Verbose mode appends the raw tag for operator debugging — never the
  // unsanitised inner content (we already stripped it during parse, but
  // emit only parsed.raw which is the literal matched substring).
  if (process.env.PRISM_PSN_PARSER_VERBOSE === "1" && parsed.raw) {
    brief += `\n\n_(raw: \`${parsed.raw}\`)_`;
  }

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: brief,
    },
  });
}

main().catch(() => emitEmpty());
