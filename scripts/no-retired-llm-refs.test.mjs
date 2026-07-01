// tier: T4
// ANTI-REVERT GUARD — BLACKWELL-MODEL-UPGRADE-PLAN / U-BW-RESEARCH-REFINE (2026-06-04)
//
// The four small Ollama models below were DELETED from the Blackwell host so the
// fleet can never silently fall back to a low-quality model. Physical deletion
// (`ollama rm`) is the runtime lock; THIS test is the *source* lock — it fails
// the moment any executable code re-introduces a hardcoded default / request /
// fallback that routes to a retired tag. Even if someone re-pulls a small model,
// nothing in the codebase will route to it while this test is green.
//
// R9 (tests verify intent): this fails exactly when the "no accidental revert"
// invariant is violated — a reintroduced `DEFAULT_MODEL = "qwen2.5-coder:7b"`,
// `?? "deepseek-r1:14b"`, `model: "qwen2.5-coder:3b"`, etc. It scans real files,
// not a stub. Comment lines (history/explanation) are intentionally allowed —
// only EXECUTABLE assignment/request positions are policed.
//
// Run: node --test H:/prism/scripts/no-retired-llm-refs.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, ".."); // scripts/ is directly under repo root

/** The retired model tags. KEEP-IN-SYNC with BLACKWELL-MODEL-UPGRADE-PLAN §1. */
export const RETIRED_TAGS = [
  "qwen2.5-coder:3b",
  "qwen2.5-coder:7b",
  "qwen2.5-coder:14b",
  "deepseek-r1:14b",
];

/** Executable directories to police (relative to repo root). */
const SCAN_DIRS = [
  "scripts",
  ".claude/hooks",
  ".claude/helpers",
  ".claude/scripts",
  // U-BW-TS-ENGINES-RETIRE (2026-06-04): the .ts engine surface was the gap that
  // let OllamaHookBridgeEngine + 11 others keep DELETED-model defaults silently.
  // Policing it here makes the retirement permanently enforced across engines too.
  // (data/state config JSONs are intentionally NOT scanned — extraction-log is
  // append-only provenance history and per-host weak presets are legit; the one
  // live config bug, ollama-route-config.json, was fixed directly.)
  "mcp-server/src/engines",
  // U-BW-DISPATCHER-SCAN (2026-06-09, slot:charlie): the DISPATCHER tree was the
  // remaining blind spot — aiReasoningDispatcher's two_pass_cascade/cascade_run
  // defaulted to the retired :3b/:7b/:14b tags (un-pulled on Blackwell → the
  // cascade requested a missing model and silently failed), and the engines-only
  // scan never saw it. The U-BW sweep retired the tags everywhere it LOOKED;
  // dispatchers were not in SCAN_DIRS, so the gap survived. Policing them closes
  // it for every dispatcher, not just this one.
  "mcp-server/src/tools/dispatchers",
];

const CODE_EXT = /\.(mjs|js|ts|ps1)$/;
// Skip tests (they legitimately name retired tags in fixtures / this guard's own
// RETIRED_TAGS list), node_modules, and archived/scratch trees.
const SKIP_PATH = /(\.test\.|[\\/]__tests__[\\/]|[\\/]node_modules[\\/]|[\\/]commands-archive[\\/]|[\\/]\.scratch[\\/]|[\\/]scratch[\\/])/;

// Executable position = assignment / nullish / OR-fallback / object-key / open-paren
// (call-arg or `.default(...)`) / array-literal `[` (1st element) / `,` (2nd+ inline
// element) immediately before the quoted tag. Comment-only mentions (prose, JSDoc
// examples) are NOT flagged — we strip comment lines first.
//   • The `(` + `[` arms were added 2026-06-04 (U-BW-TS-ENGINES-RETIRE-2, scrutiny
//     arm-C) after a live `z.string().default("qwen2.5-coder:7b")` slipped the
//     `=|??|||:`-only matcher.
//   • The `,` arm was added 2026-06-06 (U-BW-GUARD-COMMA — the handoff-flagged residual
//     from U-BW-TS-ENGINES-RETIRE-2-SCRUTINY): a fallback chain like
//     `["gpt-oss:120b", "deepseek-r1:14b"]` routes to the retired tag via its 2nd
//     INLINE element, preceded by `,` not `[`, so the old matcher missed it.
//     Why this is safe vs the deliberate "don't flag a retired-tag LIST" intent
//     (discrimination test below): a multi-line list writes each element on its own
//     line — `  "deepseek-r1:14b",` — carrying a TRAILING comma and NO LEADING
//     operator, so a one-per-line `RETIRED_TAGS`-style denylist is still correctly
//     spared. Only an INLINE 2nd+ element trips, which for a retired tag is a routing
//     reference; an inline denylist that names a retired tag should be re-pointed or
//     split one-per-line. Proven by the live-green scan (the source lock's own R12).
const TAG_ALT = RETIRED_TAGS.map((t) => t.replace(/[.]/g, "\\.")).join("|");
const EXEC_RE = new RegExp(`(?:=|\\?\\?|\\|\\||:|\\(|\\[|,)\\s*["'\\\`](?:${TAG_ALT})["'\\\`]`);

/** Strip a JS/TS/PowerShell comment line so a documented example never trips the guard. */
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#");
}

/**
 * True when `line` routes to a retired tag in EXECUTABLE position (not a comment).
 * Exported so the executable-vs-comment discrimination is provable by unit test —
 * not merely by the historical fact that this guard once caught the deleted-model
 * engines. (U-BW-TS-ENGINES-RETIRE-2 scrutiny arm-B finding: a SCAN_DIRS extension
 * shipped with no positive test is an untested invariant.)
 */
/**
 * Cut a trailing `//` line-comment that is NOT inside a string/template literal, so a
 * retired tag named in a trailing EXAMPLE comment is documentation, not a routing
 * reference. The live-scan (U-BW-GUARD-COMMA, R12) surfaced exactly this: a
 * `voices: string[];  // ... (e.g. ["claude", "deepseek-r1:14b"])` field in
 * ConsensusAuditLogEngine.ts — the retired tag lives in the trailing comment, preceded
 * by `,`, which the new `,` arm would otherwise mis-flag. The executable HEAD before the
 * `//` is preserved, so `x ?? "qwen2.5-coder:7b"  // note` still trips.
 * Scope: `//` only — `#` is a PowerShell comment but ALSO a JS/TS private-field sigil
 * (`this.#m`), so cutting at `#` would mis-truncate .ts code; full-line `#` comments are
 * already handled by isCommentLine().
 */
export function stripTrailingComment(line) {
  let inStr = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === inStr && line[i - 1] !== "\\") inStr = null;
    } else if (c === '"' || c === "'" || c === "`") {
      inStr = c;
    } else if (c === "/" && line[i + 1] === "/") {
      return line.slice(0, i);
    }
  }
  return line;
}

export function isViolation(line) {
  return !isCommentLine(line) && EXEC_RE.test(stripTrailingComment(line));
}

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc; // dir may not exist on a partial checkout — non-fatal
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (SKIP_PATH.test(full)) continue;
    if (e.isDirectory()) {
      walk(full, acc);
    } else if (e.isFile() && CODE_EXT.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function findViolations() {
  const files = [];
  for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
  const hits = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isViolation(line)) {
        hits.push(`${f}:${i + 1}  ${line.trim().slice(0, 120)}`);
      }
    }
  }
  return { fileCount: files.length, hits };
}

test("no executable code routes to a retired (deleted) small LLM", () => {
  const { fileCount, hits } = findViolations();
  // Sanity: the walk actually found files (guards against a silently-empty scan
  // that would make the assertion below vacuously pass — R12 fail-loud).
  assert.ok(fileCount > 50, `expected to scan >50 executable files, scanned ${fileCount}`);
  assert.deepEqual(
    hits,
    [],
    `Executable reference(s) to a RETIRED model found — re-point to qwen2.5-coder:32b ` +
      `(or gpt-oss:120b/20b once pulled). The small models were deleted from the host; ` +
      `routing to them cold-fails. Offending lines:\n  ${hits.join("\n  ")}`,
  );
});

test("the retired-tag list is exactly the four deleted models (KEEP-IN-SYNC)", () => {
  assert.deepEqual([...RETIRED_TAGS].sort(), [
    "deepseek-r1:14b",
    "qwen2.5-coder:14b",
    "qwen2.5-coder:3b",
    "qwen2.5-coder:7b",
  ]);
});

// R9 discrimination proof (U-BW-TS-ENGINES-RETIRE-2): the guard's value is that it
// FIRES on a re-introduced retired tag in executable position AND stays silent on
// benign comment/prose/kept-model lines. Without this, the SCAN_DIRS extension is an
// untested invariant (scrutiny arm-B) and the `(`/`[` widening is unproven (arm-C).
test("isViolation fires on every executable position and spares comments/benign lines", () => {
  // EXECUTABLE positions → MUST flag (one per operator the matcher polices):
  assert.ok(isViolation('  const DEFAULT_MODEL = "qwen2.5-coder:7b";'), "= assignment");
  assert.ok(isViolation("  const m = x ?? 'deepseek-r1:14b';"), "?? nullish");
  assert.ok(isViolation('  const m = x || "qwen2.5-coder:14b";'), "|| OR-fallback");
  assert.ok(isViolation('    model: "qwen2.5-coder:3b",'), ": object-key");
  assert.ok(isViolation('  model: z.string().min(1).default("qwen2.5-coder:7b"),'), "( .default arg — arm-C regression that slipped the old matcher");
  assert.ok(isViolation('  await pull("deepseek-r1:14b");'), "( call-arg");
  assert.ok(isViolation('  const models = ["qwen2.5-coder:7b"];'), "[ array literal");
  assert.ok(isViolation('  const chain = ["gpt-oss:120b", "deepseek-r1:14b"];'), ", inline 2nd-element fallback-chain routing hole (U-BW-GUARD-COMMA — the handoff-flagged residual)");
  // NON-executable / benign → MUST NOT flag:
  assert.ok(!isViolation("  // was qwen2.5-coder:7b — deleted from Blackwell"), "// comment");
  assert.ok(!isViolation("   * deepseek-r1:14b reasoning specialist (history)"), "* jsdoc line");
  assert.ok(!isViolation("  # qwen2.5-coder:14b retired (powershell comment)"), "# comment");
  assert.ok(!isViolation('  "qwen2.5-coder:7b",'), "bare array element, no preceding operator (RETIRED_TAGS-style list)");
  assert.ok(!isViolation('  voices: string[];  // model names (e.g. ["claude", "deepseek-r1:14b"])'), "retired tag inside a TRAILING comment example is documentation, not routing (the live-scan false positive the , arm surfaced — ConsensusAuditLogEngine:67 shape)");
  assert.ok(isViolation('  const m = x ?? "qwen2.5-coder:7b";  // executable head still trips after trailing-comment strip'), "trailing comment does NOT mask an executable-head violation");
  assert.ok(!isViolation('  const m = "qwen2.5-coder:32b";'), "kept floor model is not retired");
  assert.ok(!isViolation('  const note = "we dropped the small coders";'), "prose, no tag");
});
