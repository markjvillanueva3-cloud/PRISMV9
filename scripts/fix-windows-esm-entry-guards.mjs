#!/usr/bin/env node
// scripts/fix-windows-esm-entry-guards.mjs
//
// One-shot codemod: add the Windows-safe `|| process.argv[1]?...endsWith(name)`
// fallback to the broken `import.meta.url === `file://${argv1}`` entry guards
// surfaced 2026-06-13 (see memory reference_windows_esm_entry_guard_silent_death).
// On Windows that bare guard never matches (file:///H:/ vs file://H:/) so main()
// never runs = silently-dead CLI. Appending the endsWith fallback revives it.
//
// SAFE: skips the 3 .claude/hooks/ files (reviving a blocking hook = behavior
// change, manual review). DRY-RUN by default; --apply writes. Each edit is
// validated with `node --check` in a temp file and is only committed if it
// still parses; otherwise the file is left untouched and reported as skipped.
//
// Usage: node scripts/fix-windows-esm-entry-guards.mjs [--apply] [--list <file>]

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const listIdx = process.argv.indexOf("--list");
const listFile = listIdx >= 0 ? process.argv[listIdx + 1] : "/tmp/broken-files.txt";

function fallbackFor(base) {
  // Produces, in the target source: || process.argv[1]?.replace(/\\/g, "/").endsWith("<base>")
  return ' || process.argv[1]?.replace(/\\\\/g, "/").endsWith(' + JSON.stringify(base) + ")";
}

function patchContent(content, base) {
  const lines = content.split("\n");
  let changed = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue; // skip comments/docs that merely mention the pattern
    if (!/import\.meta\.url ===/.test(line)) continue;
    if (!line.includes("file://${")) continue;
    if (line.includes("endsWith")) continue; // already has a fallback
    const idx = line.indexOf("}`"); // closing of the `file://${...}` template
    if (idx < 0) continue;
    const at = idx + 2;
    lines[i] = line.slice(0, at) + fallbackFor(base) + line.slice(at);
    changed++;
  }
  return { out: lines.join("\n"), changed };
}

function parses(code) {
  const tmp = path.join(os.tmpdir(), `guardcheck-${process.pid}-${Math.abs(hash(code))}.mjs`);
  try {
    fs.writeFileSync(tmp, code);
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    return true;
  } catch { return false; }
  finally { try { fs.unlinkSync(tmp); } catch {} }
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

const targets = fs.readFileSync(listFile, "utf8").trim().split("\n").map(s => s.trim()).filter(Boolean)
  .filter(f => /\.mjs$/.test(f))          // .mjs only (skip the .ts / binary-flagged grep noise)
  .filter(f => !f.includes(".claude/hooks/")); // skip hooks (manual review)

let fixed = 0, skipped = 0, noMatch = 0, parseFail = 0;
for (const rel of targets) {
  const f = path.resolve("H:/prism", rel);
  if (!fs.existsSync(f)) { console.log(`  ~ ${rel}: NOT FOUND`); skipped++; continue; }
  const before = fs.readFileSync(f, "utf8");
  const { out, changed } = patchContent(before, path.basename(f));
  if (!changed) { console.log(`  - ${rel}: no broken guard line matched`); noMatch++; continue; }
  if (!parses(out)) { console.log(`  ! ${rel}: patched form did NOT parse -- left untouched`); parseFail++; continue; }
  if (apply) { fs.writeFileSync(f, out); console.log(`  + ${rel}: FIXED (${changed} guard)`); }
  else { console.log(`  + ${rel}: would fix (${changed} guard) [dry-run]`); }
  fixed++;
}
console.log(`\n${apply ? "APPLIED" : "DRY-RUN"}: ${fixed} fixed, ${noMatch} no-match, ${parseFail} parse-fail-skipped, ${skipped} missing. (3 hooks excluded for manual review.)`);
