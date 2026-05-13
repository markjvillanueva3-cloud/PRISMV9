#!/usr/bin/env node
// tier: T1
/**
 * dedup-auto-invoke.mjs — PreToolUse hook (HOOK-SYNERGY-MS0 / U-HOOK-COMPRESS H9)
 *
 * Runs the duplication check before Write creates a new engine/algorithm/hook,
 * surfaces potential duplicates as additionalContext. Engine-shim form: the
 * search logic lives in `.claude/helpers/duplication-guard.mjs` (single source
 * of truth, unit-testable). This hook is the I/O envelope and stays ≤30 lines
 * of actual logic.
 *
 * Compressed from 149 lines (pre-H9). The original inlined registry-JSON parse
 * + engines/index.ts regex search — now delegated to the helper.
 */

import { readFileSync, existsSync } from "node:fs";
import { findSimilarAssets, classifyAsset } from "../helpers/duplication-guard.mjs";

function approve() { process.stdout.write(JSON.stringify({ decision: "approve" })); }
function approveWith(context) {
  process.stdout.write(JSON.stringify({
    decision: "approve",
    hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: context },
  }));
}

let input;
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); }
catch { approve(); process.exit(0); }

const toolName = input?.tool_name || input?.tool || "";
if (toolName !== "Write") { approve(); process.exit(0); }

const filePath = input?.tool_input?.file_path || input?.input?.file_path || "";
const isNewAsset = /\/(engines|algorithms|hooks)\//.test(filePath.replace(/\\/g, "/"));
if (!isNewAsset || existsSync(filePath)) { approve(); process.exit(0); }

const { name, type } = classifyAsset(filePath);
const matches = findSimilarAssets(name, { max: 5 });

if (matches.length === 0) { approve(); process.exit(0); }

approveWith([
  "## POTENTIAL DUPLICATES DETECTED (AWARE-MS0 Auto-Dedup)",
  "",
  `Creating: **${name}** (${type})`,
  "",
  "Similar existing assets found:",
  ...matches.map((m) => `  - ${m}`),
  "",
  "**STOP:** Verify this is not a duplicate. If >50% overlap, use existing asset.",
].join("\n"));
