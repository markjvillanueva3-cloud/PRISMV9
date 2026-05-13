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

// Read the proposed new content (Write) — for Edit/MultiEdit, fall back to
// existing on-disk content if the new content isn't directly in stdin.
let probeSrc = "";
const ti = input?.tool_input || {};
if (typeof ti.content === "string") probeSrc = ti.content;
else if (typeof ti.new_string === "string") probeSrc = ti.new_string;
else {
  try { probeSrc = readFileSync(filePath, "utf8"); } catch { probeSrc = ""; }
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
