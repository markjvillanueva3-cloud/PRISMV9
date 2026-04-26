#!/usr/bin/env node
/**
 * fix-hook-schema.mjs
 * Patch hook scripts that emit Claude-Code-invalid JSON. Targets:
 *
 *   1. JSON payloads with `hookSpecificOutput` but no `continue` / `decision` —
 *      inject `continue: true`.
 *   2. `console.log(JSON.stringify({ additionalContext: ... }))` at top level —
 *      rewrap under hookSpecificOutput + continue:true.
 *   3. Payloads using `{result: ...}`, `{message: ...}`, `{ok: ...}` —
 *      rename to the correct schema keys.
 *   4. Plain text banner output (non-JSON) to stdout — wrap in
 *      `{continue:true, hookSpecificOutput:{hookEventName, additionalContext}}`.
 *      Only applied if the hook was registered for SessionStart / Stop.
 *
 * Run: node fix-hook-schema.mjs [--dry-run]
 *
 * Reversible via git — always run on a clean working tree.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");

// Registered-hook inventory from settings.json, classified by event type
const HOOKS_BY_EVENT = classifyFromSettings();

function classifyFromSettings() {
  const s = JSON.parse(readFileSync("H:/.claude/settings.json", "utf8"));
  const events = s.hooks || {};
  const map = new Map(); // hookName → array of eventName(s)
  for (const [eventName, chains] of Object.entries(events)) {
    for (const chain of chains) {
      for (const h of chain.hooks || []) {
        const cmd = h.command || "";
        const m = cmd.match(/([^"\s/\\]+)\.mjs\b/);
        if (!m) continue;
        const name = m[1];
        if (!map.has(name)) map.set(name, new Set());
        map.get(name).add(eventName);
      }
    }
  }
  const out = {};
  for (const [k, v] of map) out[k] = Array.from(v);
  return out;
}

function primaryEvent(name) {
  const events = HOOKS_BY_EVENT[name] || [];
  // Prefer PreToolUse > UserPromptSubmit > PostToolUse > Stop > SessionStart
  const order = ["PreToolUse", "UserPromptSubmit", "PostToolUse", "Stop", "SessionStart", "PreCompact"];
  for (const e of order) if (events.includes(e)) return e;
  return events[0] || "PreToolUse";
}

const FIXES = [
  {
    id: "hso_without_continue",
    // matches: JSON.stringify({\n? hookSpecificOutput: ...
    pattern: /JSON\.stringify\(\s*\{\s*(\r?\n\s*)?hookSpecificOutput:/g,
    replace: (match, nl) => `JSON.stringify({${nl || ""}  continue: true,${nl || ""}  hookSpecificOutput:`,
  },
  {
    id: "object_literal_hso_without_continue",
    // matches: const X = { hookSpecificOutput: ... }  (assigned to variable)
    pattern: /(=\s*\{\s*\r?\n\s*)hookSpecificOutput:/g,
    replace: (_m, prefix) => `${prefix}continue: true,\n    hookSpecificOutput:`,
  },
  {
    id: "top_level_additional_context",
    // matches: console.log(JSON.stringify({ additionalContext: "..." }))
    pattern: /JSON\.stringify\(\s*\{\s*additionalContext:\s*([^}]+?)\s*\}\s*\)/g,
    replace: (_m, ctx, offset, fullText, _groups, name) => {
      const event = primaryEvent(name || "");
      return `JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "${event}", additionalContext: ${ctx} } })`;
    },
  },
  {
    id: "result_top_level",
    // matches: console.log(JSON.stringify({ result: ... }))
    pattern: /JSON\.stringify\(\s*\{\s*result:\s*/g,
    replace: "JSON.stringify({ continue: true, systemMessage: ",
  },
  {
    id: "message_top_level",
    // matches: console.log(JSON.stringify({ message: ... }))
    pattern: /JSON\.stringify\(\s*\{\s*message:\s*/g,
    replace: "JSON.stringify({ continue: true, systemMessage: ",
  },
  {
    id: "ok_top_level",
    // matches: console.log(JSON.stringify({ ok: ... }))
    pattern: /JSON\.stringify\(\s*\{\s*ok:\s*true\s*,\s*/g,
    replace: "JSON.stringify({ continue: true, ",
  },
  {
    id: "inline_message_rename",
    // matches: { continue: true, message: "..." }  → rename message → systemMessage
    pattern: /(\{\s*continue:\s*true\s*,\s*)message:\s*/g,
    replace: "$1systemMessage: ",
  },
  {
    id: "inline_result_rename",
    // matches: { continue: true, result: ... }  → rename result → systemMessage
    pattern: /(\{\s*continue:\s*true\s*,\s*)result:\s*/g,
    replace: "$1systemMessage: ",
  },
  {
    id: "inline_status_rename",
    // matches: { continue: true, status: ... }  → rename status → systemMessage
    pattern: /(\{\s*continue:\s*true\s*,\s*)status:\s*/g,
    replace: "$1systemMessage: ",
  },
  {
    id: "inline_additional_context",
    // matches: { continue: true, additionalContext: "..." }  (top-level)
    // → wrap under hookSpecificOutput with event name injected dynamically
    pattern: /\{\s*continue:\s*true\s*,\s*additionalContext:\s*([^}]+?)\s*\}/g,
    replace: null, // handled specially below
  },
  {
    id: "decision_message_rename",
    // matches: { decision: 'X', message: ... } → message becomes reason (schema key)
    pattern: /(\{\s*\r?\n?\s*decision:\s*['"`]\w+['"`]\s*,\s*\r?\n?\s*)message:\s*/g,
    replace: "$1reason: ",
  },
  {
    id: "decision_result_rename",
    pattern: /(\{\s*\r?\n?\s*decision:\s*['"`]\w+['"`]\s*,\s*\r?\n?\s*)result:\s*/g,
    replace: "$1reason: ",
  },
  {
    id: "inline_multiline_message",
    // matches: { continue: true,\n    message: ... }  (multiline with continue)
    pattern: /(\{\s*\r?\n?\s*continue:\s*true\s*,\s*\r?\n?\s*)message:\s*/g,
    replace: "$1systemMessage: ",
  },
  {
    id: "multiline_top_hso_with_context",
    // matches standalone: console.log(JSON.stringify({\n additionalContext: ... \n}))
    // Multi-line version of top_level_additional_context
    pattern: /JSON\.stringify\(\s*\{\s*\r?\n\s*additionalContext:\s*([^}]+?)\s*\r?\n?\s*\}\s*\)/g,
    replace: null, // handled specially
  },
];

// Events that do NOT support hookSpecificOutput — use systemMessage instead
const NON_HSO_EVENTS = new Set(["Stop", "SessionStart", "PreCompact"]);

function applyFixes(name, src) {
  let out = src;
  const applied = [];
  for (const f of FIXES) {
    const before = out;
    if (f.id === "top_level_additional_context") {
      out = out.replace(f.pattern, (_m, ctx) => {
        const event = primaryEvent(name);
        // Stop/SessionStart/PreCompact: use systemMessage, not hookSpecificOutput
        if (NON_HSO_EVENTS.has(event)) {
          return `JSON.stringify({ continue: true, systemMessage: ${ctx} })`;
        }
        return `JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "${event}", additionalContext: ${ctx} } })`;
      });
    } else if (f.id === "inline_additional_context" || f.id === "multiline_top_hso_with_context") {
      out = out.replace(f.pattern, (_m, ctx) => {
        const event = primaryEvent(name);
        // Stop/SessionStart/PreCompact: use systemMessage, not hookSpecificOutput
        if (NON_HSO_EVENTS.has(event)) {
          return f.id === "inline_additional_context"
            ? `{ continue: true, systemMessage: ${ctx} }`
            : `JSON.stringify({ continue: true, systemMessage: ${ctx} })`;
        }
        if (f.id === "inline_additional_context") {
          return `{ continue: true, hookSpecificOutput: { hookEventName: "${event}", additionalContext: ${ctx} } }`;
        }
        return `JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "${event}", additionalContext: ${ctx} } })`;
      });
    } else {
      out = out.replace(f.pattern, f.replace);
    }
    if (out !== before) applied.push(f.id);
  }
  return { out, applied };
}

// Registered hooks we care about (from settings.json)
const TARGETS = Object.keys(HOOKS_BY_EVENT);

const SEARCH_DIRS = [
  "H:/prism/.claude/hooks",
  "H:/prism/.claude/helpers",
];

function findHook(name) {
  for (const d of SEARCH_DIRS) {
    const p = `${d}/${name}.mjs`;
    if (existsSync(p)) return p;
  }
  return null;
}

let changed = 0, skipped = 0, missing = 0;
for (const name of TARGETS) {
  const file = findHook(name);
  if (!file) { missing++; continue; }
  const src = readFileSync(file, "utf8");
  const { out, applied } = applyFixes(name, src);
  if (applied.length === 0) { skipped++; continue; }
  if (DRY) {
    console.log(`would-fix: ${name} [${applied.join(",")}]`);
  } else {
    writeFileSync(file, out);
    console.log(`fixed: ${name} [${applied.join(",")}]`);
  }
  changed++;
}

console.log(`\nsummary: changed=${changed}, skipped=${skipped}, missing=${missing}, total=${TARGETS.length}`);
