#!/usr/bin/env node
/**
 * wire-lane-hooks-cd-aware.mjs -- idempotent applier that wires the cd-aware effective-cwd
 * resolver into the slot-lane git hooks (U-LANE-CD-AWARE, slot:india 2026-06-11).
 *
 * WHY A SCRIPT (not hand edits): the lane hooks are harness-exec files; a worktree chat's Edit
 * tool is firewall-blocked from them. This applier encodes the EXACT, anchor-asserted patch so
 * the change is reviewable, idempotent, and verifiable (--dry-run shows the diff; the hook test
 * suites verify no regression). Run from the main tree after review:
 *   node scripts/wire-lane-hooks-cd-aware.mjs --dry-run   # show what would change (default)
 *   node scripts/wire-lane-hooks-cd-aware.mjs --apply      # write the change
 * Then: node --test .claude/hooks/git-add-lane-guard.test.mjs  (must stay green)
 *
 * THE FIX: the lane hooks read cwd from the Bash payload (session-pinned slot worktree), but
 * `cd /h/prism && git add X` runs in the main tree -> the guard evaluated the wrong tree and
 * allowed the cross-lane stage. effectiveCwdFromCmd(cmd, payloadCwd) resolves the real cwd.
 * Fail-safe: no leading cd -> returns payloadCwd unchanged (byte-identical legacy behavior).
 *
 * SCOPE: wires git-add-lane-guard (the staging guard -- clean payload.cwd pattern + cmd in
 * scope). worktree-commit-route uses process.cwd() across several sites + has the [MAIN]
 * allowance; its cd-awareness + [MAIN]-narrowing is a separate, more careful patch (see
 * state/shared/specs/LANE-HOOK-CD-AWARE-WIRING-2026-06-11.md). main-tree-write-block gates
 * Edit/Write file targets (no bash cmd) -- the cd-fix does not apply there.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Anchors are built per-EOL (the hooks are CRLF; the repo is mostly LF -- match the file's own
// ending so the patch never introduces mixed line endings). `J(eol, ...lines)` joins with eol.
const J = (eol, ...lines) => lines.join(eol);

const IMPORT_ANCHOR = `import { exit } from "node:process";`;
const importAdd = (eol) =>
  J(eol,
    IMPORT_ANCHOR,
    "// U-LANE-CD-AWARE (slot:india 2026-06-11): resolve the REAL execution cwd. `cd /h/prism && git add X`",
    "// runs in the main tree even though the payload cwd is the slot worktree -- without this the guard",
    "// evaluated the wrong tree and allowed the cross-lane stage. Fail-safe: no leading cd -> fallback cwd.",
    'import { effectiveCwdFromCmd } from "../../scripts/lib/effective-cwd-from-cmd.mjs";');

const cwdAnchor = (eol) =>
  J(eol,
    "  const cwd =",
    "    payload?.cwd ||",
    "    payload?.tool_input?.cwd ||",
    "    process.env.CLAUDE_PROJECT_DIR ||",
    "    process.cwd();");
const cwdNew = (eol) =>
  J(eol,
    "  const payloadCwd =",
    "    payload?.cwd ||",
    "    payload?.tool_input?.cwd ||",
    "    process.env.CLAUDE_PROJECT_DIR ||",
    "    process.cwd();",
    "  // Resolve the cwd git ACTUALLY runs under (parses a leading `cd <path>` chain off the command).",
    "  const cwd = effectiveCwdFromCmd(cmd, payloadCwd);");

// Hooks whose cwd-resolution matches the clean `const cwd = payload?.cwd || ...` pattern AND have
// `cmd` (the bash command) in scope at that point. git-add-lane-guard qualifies. (main-tree-write-block
// shares the pattern but gates Edit/Write tool targets, not bash commands -- excluded by design.)
const TARGETS = [".claude/hooks/git-add-lane-guard.mjs"];

export function wireOne(text) {
  if (text.includes("effective-cwd-from-cmd")) return { changed: false, reason: "already-wired", text };
  const eol = text.includes("\r\n") ? "\r\n" : "\n"; // preserve the file's line ending (hooks are CRLF)
  if (!text.includes(IMPORT_ANCHOR)) return { changed: false, reason: "import-anchor-missing", text };
  const cwdA = cwdAnchor(eol);
  if (!text.includes(cwdA)) return { changed: false, reason: "cwd-anchor-missing", text };
  const out = text.replace(IMPORT_ANCHOR, importAdd(eol)).replace(cwdA, cwdNew(eol));
  return { changed: true, reason: "wired", text: out };
}

function main() {
  const apply = process.argv.includes("--apply");
  let anyChange = false;
  for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    let text;
    try { text = fs.readFileSync(abs, "utf8"); } catch { console.log(`SKIP ${rel}: unreadable`); continue; }
    const r = wireOne(text);
    if (!r.changed) { console.log(`${rel}: ${r.reason}`); continue; }
    anyChange = true;
    if (apply) {
      const tmp = `${abs}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, r.text, "utf8");
      fs.renameSync(tmp, abs);
      console.log(`${rel}: APPLIED`);
    } else {
      console.log(`${rel}: WOULD WIRE (import + cd-aware cwd). Run with --apply to write.`);
    }
  }
  if (!anyChange && !apply) console.log("(nothing to change -- all targets already wired or anchors absent)");
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
