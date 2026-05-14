#!/usr/bin/env node
// tier: T1
/**
 * hook-tier-validator.mjs — HOOK-SYNERGY-MS0 / U-HOOK-TIERS (H3)
 *
 * PreToolUse advisory: when Claude edits a `.claude/hooks/*.mjs`, verify the
 * file has a `// tier: T#` frontmatter line. If missing, emit a non-blocking
 * warning with a one-line fix command (run scripts/classify-hook-tiers.mjs).
 *
 * BLOCK MODE — set `PRISM_HOOK_TIER_VALIDATOR_BLOCK=1` to promote the warning
 * into a hard rejection. By default it's advisory so existing hooks added in
 * parallel by other chats don't get blocked mid-edit.
 *
 * Skips: _envelope.mjs (wrapper, no tier of its own), `lib/*` (helper modules),
 * `bundles/*` (aggregator wrappers handled by H1's settings dedup).
 */

import { readFileSync } from "node:fs";

const TIER_RE = /^\s*\/\/\s*tier\s*[:=]\s*T[0-4]\b/im;
const HOOK_EDIT_RE = /\/\.claude\/hooks\/[^/]+\.mjs$/i;
const SKIP_RE = /\/(lib|bundles)\//;

function passthrough() {
  process.stdout.write(JSON.stringify({ decision: "approve" }));
}

let input;
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); }
catch { passthrough(); process.exit(0); }

const tool = input?.tool_name || input?.tool || "";
if (!/^(Edit|Write|MultiEdit)$/.test(tool)) { passthrough(); process.exit(0); }

const filePath = String(
  input?.tool_input?.file_path ||
  input?.tool_input?.filePath ||
  input?.tool_input?.path ||
  "",
).replace(/\\/g, "/");

if (!HOOK_EDIT_RE.test(filePath)) { passthrough(); process.exit(0); }
if (SKIP_RE.test(filePath)) { passthrough(); process.exit(0); }

// Probe content per tool. The `// tier: T#` line lives on line ~2, so it is
// almost never inside an Edit/MultiEdit chunk — probing only the chunk
// false-positives on every mid-file edit of an already-tiered hook. So:
// Write uses the full new content; Edit/MultiEdit union the on-disk file
// (pre-edit state) with every new_string (covers "tier already there" AND
// "tier being added by this edit").
let probeSrc = "";
const ti = input?.tool_input || {};
if (typeof ti.content === "string") {
  probeSrc = ti.content;
} else {
  let onDisk = "";
  try { onDisk = readFileSync(filePath, "utf8"); } catch { onDisk = ""; }
  const chunks = [onDisk];
  if (typeof ti.new_string === "string") chunks.push(ti.new_string);
  if (Array.isArray(ti.edits)) {
    for (const e of ti.edits) {
      if (e && typeof e.new_string === "string") chunks.push(e.new_string);
    }
  }
  probeSrc = chunks.join("\n");
}

if (TIER_RE.test(probeSrc)) { passthrough(); process.exit(0); }

const msg = `[hook-tier-validator] '${filePath}' has no \`// tier: T#\` frontmatter. ` +
            `Run: node H:/prism/scripts/classify-hook-tiers.mjs to auto-classify, ` +
            `or add manually (T0=blocker, T1=soft gate, T2=injector, T3=observer, T4=async).`;

if (process.env.PRISM_HOOK_TIER_VALIDATOR_BLOCK === "1") {
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: msg,
  }));
  process.exit(0);
}

process.stdout.write(JSON.stringify({
  decision: "approve",
  hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: msg },
}));
