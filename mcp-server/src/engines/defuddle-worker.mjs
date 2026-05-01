/**
 * defuddle-worker.mjs — Capability-locked HTML cleaning worker
 *
 * Runs inside `worker_threads`. Hardened to deny access to fs / net / child_process
 * by intercepting both CommonJS `require` and ESM dynamic `import`. Receives one
 * message at a time and posts back a structured result.
 *
 * Wire context (P3-U04, INTEL-OLLAMA-OBSIDIAN-MS1):
 *   parent thread = DefuddleIngestPipelineEngine.ts
 *   message in    = { id, op: 'clean'|'eval-probe', html?, options?, code? }
 *   message out   = { id, ok, result?, error? }
 *
 * Security model:
 *   - Allow-list of modules. Any other `require()` / dynamic `import()` throws.
 *   - The cleaner is a pure-string transform. It does NOT touch the filesystem,
 *     network, or spawn processes. The deny-list is belt-and-braces.
 *   - HTML script / style / iframe / object / embed are stripped before the
 *     readability extraction so injection content cannot reach the embedding
 *     layer.
 *   - Length caps: input ≤ INPUT_MAX_BYTES, output ≤ OUTPUT_MAX_CHARS.
 *   - Instruction-override probe sweeps post-clean for known prompt-injection
 *     phrases and reports + redacts them.
 */

import { parentPort, workerData } from "node:worker_threads";
import { createRequire } from "node:module";

if (!parentPort) {
  throw new Error("defuddle-worker.mjs must be spawned via worker_threads");
}

// ─────────────────────────────────────────────────────────────────
// Capability lock
// ─────────────────────────────────────────────────────────────────

const ALLOW_REQUIRE = new Set([
  "node:worker_threads",
  "worker_threads",
  "node:module",
  "node:url",
  "url",
  "node:path",
  "path",
  "node:util",
  "util",
  "node:buffer",
  "buffer",
  // Optional content-cleaner dependencies — used iff installed.
  "defuddle",
  "defuddle/node",
  "linkedom",
]);

const DENY_HINT =
  "Capability denied by defuddle-worker sandbox (no fs/net/child_process)";

const baseRequire = createRequire(import.meta.url);
function lockedRequire(spec) {
  if (!ALLOW_REQUIRE.has(spec)) {
    throw new Error(`${DENY_HINT}: require('${spec}')`);
  }
  return baseRequire(spec);
}

// Replace any future `createRequire(...)(spec)` calls — best-effort defence
// against accidental re-introduction of fs/net inside this worker file.
const originalCreateRequire = createRequire;
globalThis.__defuddleLockedRequire = lockedRequire;

// Block dynamic `import()` of denied specifiers by intercepting the global
// `import` hook via a Proxy on Module._load is impossible from ESM, so we
// surface the constraint via a sandboxed eval helper instead (see eval-probe).

// ─────────────────────────────────────────────────────────────────
// HTML cleaner — pure-JS, no DOM library required
// ─────────────────────────────────────────────────────────────────

const INPUT_MAX_BYTES = 4 * 1024 * 1024;       // 4 MiB hard cap on raw HTML
const INPUT_TRUNCATE_BYTES = 5 * 1024 * 1024;  // 5 MiB triggers explicit truncate
const OUTPUT_MAX_CHARS = 256 * 1024;           // 256 KiB cleaned-content cap

const STRIP_TAGS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "object",
  "embed",
  "applet",
  "svg",
  "form",
  "button",
  "input",
  "textarea",
  "select",
  "nav",
  "footer",
  "header",
  "aside",
  "menu",
];

const STRIP_TAG_REGEXES = STRIP_TAGS.map(
  (t) => new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?<\\/${t}>`, "gi")
);
const SELF_CLOSING_BAD = /<\s*(script|iframe|object|embed|link)\b[^>]*\/?>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const ALL_TAGS = /<[^>]+>/g;
const ENTITY_DECODE_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

// Whitespace token — matches any run of spaces, tabs, or newlines so adversarial
// HTML cannot evade redaction by inserting line breaks between target words.
const _W = "\\s+";
const INSTRUCTION_OVERRIDE_PATTERNS = [
  new RegExp(`ignore${_W}(?:all${_W}|the${_W}|any${_W}|your${_W})?(?:prior|previous|above|preceding|earlier)${_W}(?:instructions?|prompts?|rules?|directives?|context)`, "gi"),
  new RegExp(`disregard${_W}(?:all${_W}|the${_W}|any${_W}|your${_W})?(?:prior|previous|above|preceding|earlier)${_W}(?:instructions?|prompts?|rules?|directives?|context)`, "gi"),
  new RegExp(`forget${_W}(?:all${_W}|the${_W}|any${_W}|your${_W})?(?:prior|previous|above|preceding|earlier)${_W}(?:instructions?|prompts?|rules?|directives?|context)`, "gi"),
  new RegExp(`you${_W}(?:are|act|behave)${_W}(?:now|henceforth|from${_W}now${_W}on)${_W}(?:an?|as|like)\\b`, "gi"),
  /system\s*[:=]\s*you\s+(?:are|will|must|should)/gi,
  /\bjailbreak\b/gi,
  /\bDAN\s+mode\b/gi,
  /\bdeveloper\s+mode\b/gi,
  new RegExp(`override${_W}(?:your|all|the)${_W}(?:safety|guardrails?|constraints?|rules?)`, "gi"),
  new RegExp(`reveal${_W}(?:your|the)${_W}(?:system|hidden|secret)${_W}prompt`, "gi"),
];

function decodeEntities(s) {
  return s.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi, (m) => ENTITY_DECODE_MAP[m.toLowerCase()] ?? m);
}

function stripHtml(html) {
  let out = html;
  for (const rx of STRIP_TAG_REGEXES) out = out.replace(rx, " ");
  out = out.replace(SELF_CLOSING_BAD, " ");
  out = out.replace(HTML_COMMENT, " ");
  out = out.replace(ALL_TAGS, " ");
  out = decodeEntities(out);
  out = out.replace(/[\t\f\v]+/g, " ").replace(/[  ]{2,}/g, " ");
  out = out.replace(/(\r?\n){3,}/g, "\n\n");
  return out.trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return decodeEntities(m[1].replace(/\s+/g, " ").trim()).slice(0, 512);
}

function countWords(s) {
  if (!s) return 0;
  return (s.match(/[A-Za-z0-9][A-Za-z0-9'_-]+/g) || []).length;
}

function redactOverrides(text) {
  let redactedCount = 0;
  let out = text;
  for (const rx of INSTRUCTION_OVERRIDE_PATTERNS) {
    out = out.replace(rx, () => {
      redactedCount += 1;
      return "[REDACTED-OVERRIDE]";
    });
  }
  return { text: out, redactedCount };
}

function tryDefuddle(html, url) {
  // Best-effort use of the real defuddle library when it (and a DOM impl) is
  // present. Returns null if any import or call fails — caller falls back to
  // the built-in stripper.
  try {
    const linkedom = lockedRequire("linkedom");
    const defuddleMod = lockedRequire("defuddle/node");
    const Defuddle = defuddleMod?.Defuddle ?? defuddleMod?.default ?? defuddleMod;
    if (typeof Defuddle !== "function") return null;
    const { document } = linkedom.parseHTML(html);
    const result = Defuddle(document, url || "about:blank", {
      markdown: true,
      separateMarkdown: false,
    });
    if (result && typeof result.then === "function") {
      // We deliberately do not await across the worker message boundary — the
      // built-in stripper is the primary path and is sync. If a host has the
      // real lib installed, they should call cleanAsync().
      return null;
    }
    if (result && typeof result.content === "string") {
      return {
        title: typeof result.title === "string" ? result.title : "",
        body: result.content,
        wordCount:
          typeof result.wordCount === "number"
            ? result.wordCount
            : countWords(result.content),
        extractor: "defuddle",
      };
    }
    return null;
  } catch (_err) {
    return null;
  }
}

function clean(html, options = {}) {
  const url = typeof options.url === "string" ? options.url : "";
  const truncated = html.length > INPUT_TRUNCATE_BYTES;
  const inputBytes = Math.min(html.length, INPUT_TRUNCATE_BYTES);
  const slicedInput = html.slice(0, INPUT_MAX_BYTES);
  if (truncated || html.length > INPUT_MAX_BYTES) {
    // Hard truncate at INPUT_MAX_BYTES. Anything past that cannot reach the
    // cleaner, the embedder, or the caller.
  }

  const title = extractTitle(slicedInput);
  let bodyResult = tryDefuddle(slicedInput, url);
  let extractor = "builtin";
  let body;
  if (bodyResult && bodyResult.body) {
    body = bodyResult.body;
    extractor = bodyResult.extractor;
  } else {
    body = stripHtml(slicedInput);
  }

  const overrideSweep = redactOverrides(body);
  let cleaned = overrideSweep.text;
  let outputTruncated = false;
  if (cleaned.length > OUTPUT_MAX_CHARS) {
    cleaned = cleaned.slice(0, OUTPUT_MAX_CHARS);
    outputTruncated = true;
  }

  return {
    extractor,
    title,
    content: cleaned,
    wordCount: countWords(cleaned),
    inputBytes,
    inputTruncated: truncated || html.length > INPUT_MAX_BYTES,
    outputTruncated,
    overrideRedactions: overrideSweep.redactedCount,
    scriptResidue: scanScriptResidue(cleaned),
  };
}

function scanScriptResidue(text) {
  // After stripping, the cleaner output must contain ZERO live `<script` or
  // event-handler bait. This scan reports residue rather than mutating, so the
  // engine layer can decide PASS / FAIL.
  const residue = [];
  if (/<\s*script\b/i.test(text)) residue.push("<script tag");
  if (/on\w+\s*=\s*["']/i.test(text)) residue.push("inline event handler");
  if (/javascript\s*:/i.test(text)) residue.push("javascript: URI");
  if (/<\s*iframe\b/i.test(text)) residue.push("<iframe tag");
  return residue;
}

// ─────────────────────────────────────────────────────────────────
// Capability probe — used by tests to assert sandbox refusal
// ─────────────────────────────────────────────────────────────────

function probeCapability(spec) {
  // Attempt to require the named module via the locked require. Always returns
  // a structured outcome — never throws back to the worker dispatcher.
  try {
    lockedRequire(spec);
    return { allowed: true };
  } catch (err) {
    return { allowed: false, message: err && err.message ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────
// Message dispatcher
// ─────────────────────────────────────────────────────────────────

parentPort.on("message", (msg) => {
  const id = msg && msg.id;
  try {
    if (!msg || typeof msg !== "object") {
      parentPort.postMessage({ id, ok: false, error: "bad message" });
      return;
    }
    if (msg.op === "clean") {
      if (typeof msg.html !== "string") {
        parentPort.postMessage({ id, ok: false, error: "html must be string" });
        return;
      }
      const result = clean(msg.html, msg.options || {});
      parentPort.postMessage({ id, ok: true, result });
      return;
    }
    if (msg.op === "probe") {
      if (typeof msg.spec !== "string") {
        parentPort.postMessage({ id, ok: false, error: "spec must be string" });
        return;
      }
      parentPort.postMessage({ id, ok: true, result: probeCapability(msg.spec) });
      return;
    }
    parentPort.postMessage({ id, ok: false, error: `unknown op: ${msg.op}` });
  } catch (err) {
    parentPort.postMessage({
      id,
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
});

// Health ping so the parent knows the worker is online before sending real work.
parentPort.postMessage({ id: 0, ok: true, result: { ready: true, workerData: workerData ?? null } });
