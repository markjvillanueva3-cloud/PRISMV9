#!/usr/bin/env node
// tier: T3
/**
 * posttool-error-explain.mjs — PostToolUse Bash hook
 *
 * Scans Bash tool_response for tsc/vitest/node error signatures and attaches
 * a plain-language explanation + minimal fix + unblock command. Mirrors the
 * rule set from ErrorExplainerEngine (mcp-server/src/engines/ErrorExplainerEngine.ts)
 * — kept in sync manually because hooks can't import from TS source at runtime.
 *
 * Fires only when the bash output actually contains error signatures. Silent
 * on clean runs. Rate-limited to one explanation per (category, toolId) per
 * 2 minutes so a failing test loop doesn't flood the conversation.
 *
 * Non-blocking — additionalContext only.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";

// ── Rate limit state ─────────────────────────────────────────────
const RATE_WINDOW_MS = 2 * 60 * 1000;
const RATE_FILE = join(os.tmpdir(), "prism-hook-state", "posttool-error-explain.last.json");
function loadRate() { try { return JSON.parse(readFileSync(RATE_FILE, "utf8")); } catch { return {}; } }
function saveRate(s) {
  try {
    const d = dirname(RATE_FILE);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ── ErrorExplainerEngine rule mirror ─────────────────────────────
const MATCHERS = [
  {
    category: "heap_oom",
    test: (m) => /heap out of memory|FATAL ERROR.*OOM/i.test(m),
    explain: () => ({
      plain: "Node ran out of heap. For PRISM builds this usually means the `--max-old-space-size` flag is missing.",
      fix: "Use the project's `npm run build` (which sets 16GB) rather than raw `tsc`.",
      unblock: "cd mcp-server && npm run build",
    }),
  },
  {
    category: "port_in_use",
    test: (m) => /EADDRINUSE/.test(m),
    explain: (m) => {
      const portMatch = /:(\d{2,5})/.exec(m);
      const port = portMatch?.[1] ?? "that port";
      return {
        plain: `Another process is already listening on ${port}.`,
        fix: "Either stop the other process or run this server on a different port.",
        unblock: port !== "that port" ? `netstat -ano | findstr :${port}` : "netstat -ano",
      };
    },
  },
  {
    category: "enoent",
    test: (m) => /ENOENT/.test(m),
    explain: (m) => {
      const pathMatch = /ENOENT.*'([^']+)'/.exec(m);
      const p = pathMatch?.[1] ?? "the path";
      return {
        plain: `Node cannot find ${p}.`,
        fix: "Check the path, check the working directory, and confirm the file exists before the call.",
        unblock: "ls",
      };
    },
  },
  {
    category: "module_not_found",
    test: (m) => /Cannot find module/i.test(m) || /MODULE_NOT_FOUND/.test(m),
    explain: () => ({
      plain: "An import points to a file or package that does not exist.",
      fix: "Fix the import path, install the package, or rebuild (`npm run build:fast`).",
      unblock: "cd mcp-server && npm run build:fast",
    }),
  },
  {
    category: "type_mismatch",
    test: (m) => /is not assignable to/i.test(m) || /Argument of type/.test(m),
    explain: () => ({
      plain: "You are passing a value whose type does not match what the function or variable expects.",
      fix: "Inspect the interface at the referenced line and adjust the shape — do NOT add `any`.",
      unblock: "node node_modules/typescript/lib/tsc.js --noEmit",
    }),
  },
  {
    category: "missing_property",
    test: (m) => /Property '.*' does not exist on type/i.test(m),
    explain: () => ({
      plain: "Reading a property the compiler does not believe exists on this value.",
      fix: "Check the object's interface; add the missing property or narrow the value with a type guard.",
      unblock: "node node_modules/typescript/lib/tsc.js --noEmit",
    }),
  },
  {
    category: "test_timeout",
    test: (m) => /timeout|timed out/i.test(m) && /vitest|jest|test/i.test(m),
    explain: () => ({
      plain: "A test did not finish within its time budget, usually because a promise never resolved.",
      fix: "Look for a missing `await`, unresolved mock, or infinite loop in the system under test.",
      unblock: "node node_modules/vitest/vitest.mjs run --reporter=verbose",
    }),
  },
  {
    category: "assertion_failed",
    test: (m) => /AssertionError|expected .* to (?:be|equal|deep)/i.test(m),
    explain: () => ({
      plain: "A test assertion got a different value than it expected.",
      fix: "Decide which is correct — the test or the code. Fix the wrong one. Never weaken the assertion just to pass.",
      unblock: "node node_modules/vitest/vitest.mjs run",
    }),
  },
  {
    category: "null_access",
    test: (m) => /Cannot read (?:property|properties)(?: [^\n]*?)? of (?:null|undefined)/.test(m),
    explain: () => ({
      plain: "You tried to read a property of something that was null or undefined at that moment.",
      fix: "Guard the access with a null check, or fix the producer so the value is always present.",
      unblock: "",
    }),
  },
  {
    category: "syntax_error",
    test: (m) => /SyntaxError|Unexpected token|Unexpected end of input/.test(m),
    explain: () => ({
      plain: "The file is not valid JavaScript/TypeScript — the parser gave up.",
      fix: "Open the file at the reported line and look for unmatched braces, quotes, or comment terminators.",
      unblock: "node node_modules/typescript/lib/tsc.js --noEmit",
    }),
  },
];

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (input.tool_name !== "Bash") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const resp = input.tool_response || {};
  const combined = [resp.stdout, resp.stderr, resp.output, resp.error]
    .filter(Boolean)
    .join("\n");
  if (!combined || combined.length < 20) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  for (const m of MATCHERS) {
    if (!m.test(combined)) continue;
    // Rate-limit per category (not per exact command — the same category
    // firing 10 times in a row is exactly what we want to suppress).
    const now = Date.now();
    const rate = loadRate();
    const key = m.category;
    if (now - (rate[key] ?? 0) < RATE_WINDOW_MS) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    rate[key] = now;
    for (const k of Object.keys(rate)) {
      if (now - rate[k] > RATE_WINDOW_MS * 10) delete rate[k];
    }
    saveRate(rate);

    const body = m.explain(combined);
    const lines = [
      `🔎 ERROR TRIAGE [${m.category}]`,
      `  ${body.plain}`,
      `  Fix: ${body.fix}`,
    ];
    if (body.unblock) lines.push(`  Run: ${body.unblock}`);

    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: lines.join("\n"),
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

try { main(); } catch { console.log(JSON.stringify({ continue: true })); }
