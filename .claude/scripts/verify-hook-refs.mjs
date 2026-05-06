#!/usr/bin/env node
/**
 * verify-hook-refs.mjs — SessionStart guardrail.
 *
 * Audits every hook registration in H:/.claude/settings.json and
 * H:/PRISM/.claude/settings.json (and .local.json) for:
 *
 *   1. BROKEN_PATH      — hook command points to a script that does not exist
 *   2. DUPLICATE_TRIPLE — same (event, matcher, command) registered more than once
 *   3. DUPLICATE_MATCHER— same (event, matcher) appears as multiple blocks
 *   4. INVALID_JSON     — settings file does not parse
 *
 * Exit codes:
 *   0 — clean (or only INFO findings)
 *   1 — at least one BROKEN_PATH or INVALID_JSON (hooks will silently fail)
 *   2 — DUPLICATE_TRIPLE or DUPLICATE_MATCHER (potential double-fire)
 *
 * Output: one-line summary on stdout for the SessionStart additionalContext.
 *         Detailed findings on stderr.
 *
 * Designed to fit a 5s SessionStart budget. No subprocess spawns; no
 * network. Pure JSON parse + fs.existsSync.
 */

import fs from "node:fs";

const SETTINGS_FILES = [
  "H:/.claude/settings.json",
  "H:/PRISM/.claude/settings.json",
  "H:/PRISM/.claude/settings.local.json",
];

const SCRIPT_PATH_RE =
  /[A-Za-z]:[\\/][^\s"'$&|;]+\.(?:mjs|js|ts|cjs|mts|py|sh|ps1)/g;

const findings = {
  brokenPaths: [],
  invalidJSON: [],
  duplicateMatchers: [],
  duplicateTriples: [],
};

function extractScriptPaths(cmd) {
  if (typeof cmd !== "string") return [];
  return cmd.match(SCRIPT_PATH_RE) || [];
}

function normalizePath(p) {
  return p.split("\\").join("/");
}

function audit(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return; // optional file, OK
    findings.invalidJSON.push({ file, error: `read failed: ${e.message}` });
    return;
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    findings.invalidJSON.push({ file, error: e.message });
    return;
  }
  const hooks = json && json.hooks;
  if (!hooks || typeof hooks !== "object") return;

  for (const event of Object.keys(hooks)) {
    const blocks = Array.isArray(hooks[event]) ? hooks[event] : [];
    const matcherSeen = new Map();
    const tripleSeen = new Map();
    for (const block of blocks) {
      const matcherKey = String(block && block.matcher != null ? block.matcher : "*");
      matcherSeen.set(matcherKey, (matcherSeen.get(matcherKey) || 0) + 1);
      const hookList = Array.isArray(block && block.hooks) ? block.hooks : [];
      for (const h of hookList) {
        const cmd = (h && h.command) || "";
        const tripleKey = `${event}::${matcherKey}::${cmd}`;
        tripleSeen.set(tripleKey, (tripleSeen.get(tripleKey) || 0) + 1);
        for (const p of extractScriptPaths(cmd)) {
          const norm = normalizePath(p);
          if (!fs.existsSync(norm)) {
            findings.brokenPaths.push({
              file,
              event,
              matcher: matcherKey,
              missing: norm,
              cmdHead: String(cmd).slice(0, 90),
            });
          }
        }
      }
    }
    for (const [key, count] of matcherSeen) {
      if (count > 1) findings.duplicateMatchers.push({ file, event, matcher: key, count });
    }
    for (const [key, count] of tripleSeen) {
      if (count > 1) {
        const [, , cmdPart] = key.split("::");
        findings.duplicateTriples.push({ file, key, count, cmdHead: cmdPart.slice(0, 80) });
      }
    }
  }
}

for (const f of SETTINGS_FILES) audit(f);

const broken = findings.brokenPaths.length;
const invalid = findings.invalidJSON.length;
const dupMatch = findings.duplicateMatchers.length;
const dupTriple = findings.duplicateTriples.length;

if (broken === 0 && invalid === 0 && dupMatch === 0 && dupTriple === 0) {
  process.stdout.write("verify-hook-refs: ✓ all hook references resolve, no duplicates\n");
  process.exit(0);
}

const summary = [
  broken > 0 ? `${broken} broken path(s)` : null,
  invalid > 0 ? `${invalid} invalid JSON` : null,
  dupMatch > 0 ? `${dupMatch} dup matcher(s)` : null,
  dupTriple > 0 ? `${dupTriple} dup hook(s)` : null,
].filter(Boolean).join(", ");

process.stdout.write(`verify-hook-refs: ⚠ ${summary}\n`);

if (broken > 0) {
  process.stderr.write("\nBROKEN_PATH findings:\n");
  for (const f of findings.brokenPaths) {
    process.stderr.write(
      `  ${f.file} :: ${f.event} :: missing ${f.missing}\n    cmd: ${f.cmdHead}\n`,
    );
  }
}
if (invalid > 0) {
  process.stderr.write("\nINVALID_JSON findings:\n");
  for (const f of findings.invalidJSON) {
    process.stderr.write(`  ${f.file} :: ${f.error}\n`);
  }
}
if (dupMatch > 0) {
  process.stderr.write("\nDUPLICATE_MATCHER findings (silent double-fire risk):\n");
  for (const f of findings.duplicateMatchers) {
    process.stderr.write(
      `  ${f.file} :: ${f.event}::${f.matcher} appears ${f.count} times\n`,
    );
  }
}
if (dupTriple > 0) {
  process.stderr.write("\nDUPLICATE_TRIPLE findings (same hook registered twice):\n");
  for (const f of findings.duplicateTriples) {
    process.stderr.write(`  ${f.key} (×${f.count})\n`);
  }
}

if (broken > 0 || invalid > 0) process.exit(1);
process.exit(2);
