#!/usr/bin/env node
// tier: T4
/**
 * coding-pattern-hint.mjs — Coding Standards Auto-Inject
 * =======================================================
 *
 * PreToolUse hook that injects relevant coding patterns based on
 * the target file path. Reminds of conventions without being verbose.
 *
 * FIRES ON: PreToolUse(Write|Edit)
 *
 * Pattern detection by path:
 *   src/engines/*.ts     → Engine pattern (static methods, Zod, JSDoc)
 *   src/dispatchers/*.ts → Dispatcher pattern (action enum, schema, lazy import)
 *   __tests__/*.ts       → Test pattern (real assertions, no stubs)
 *   src/hooks/*.ts       → Hook pattern (event types, continue/block)
 *   src/physics/*.ts     → Physics pattern (constants import, citations)
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import * as path from "path";

const PATTERNS = {
  engine: {
    match: /src[\\/]engines[\\/].*\.ts$/,
    hint: "Engine: static methods · Zod input schema · JSDoc @param/@returns · constants from physics/constants.ts"
  },
  dispatcher: {
    match: /src[\\/](?:tools[\\/])?dispatchers[\\/].*\.ts$/,
    hint: "Dispatcher: action enum · Zod schema per action · lazy import engines · return typed result"
  },
  test: {
    match: /__tests__[\\/].*\.(?:test|spec)\.ts$/,
    hint: "Test: real assertions (no toBeDefined stubs) · happy path + 3 failure modes · invoke via dispatcher"
  },
  hook: {
    match: /src[\\/]hooks[\\/].*\.ts$/,
    hint: "Hook: export register function · typed event input · return {continue} or {block, reason}"
  },
  physics: {
    match: /src[\\/]physics[\\/].*\.ts$/,
    hint: "Physics: import constants (kc1_1, mc, n, C) · cite literature · Kienzle: Fc=kc1.1*ap*fz^(1-mc)"
  },
  claudeHook: {
    match: /\.claude[\\/]hooks[\\/].*\.mjs$/,
    hint: "Claude hook: read stdin JSON · output {continue:true} · hookEventName must match event"
  },
  skill: {
    match: /\.claude[\\/](?:commands|skills)[\\/].*\.md$/,
    hint: "Skill: frontmatter (name, description) · clear steps · reference existing engines/actions"
  }
};

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function detectPattern(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");

  for (const [name, config] of Object.entries(PATTERNS)) {
    if (config.match.test(filePath) || config.match.test(normalized)) {
      return { name, hint: config.hint };
    }
  }
  return null;
}

async function main() {
  if (_hp_shouldSkip("coding-pattern-hint")) { console.log(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};

  // Only fire on Write (new file creation). Edits to existing files
  // already follow the pattern — the reminder is redundant noise.
  if (toolName !== "Write") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || toolInput.filePath || "";

  // Suppress when the file already exists on disk — this is effectively
  // a rewrite, not a first-time create, so the pattern hint is not useful.
  try {
    const fs = await import("node:fs");
    if (filePath && fs.existsSync(filePath)) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }
  } catch { /* fall through */ }

  const pattern = detectPattern(filePath);

  if (pattern) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `📐 ${pattern.hint}`,
      },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
