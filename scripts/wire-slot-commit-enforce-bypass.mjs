#!/usr/bin/env node
/**
 * wire-slot-commit-enforce-bypass.mjs -- idempotent applier that wires the pure commitBypass
 * decision into slot-commit-worktree-enforce.mjs (U-SLOT-COMMIT-ENFORCE-LIVE, slot:india 2026-06-11).
 *
 * WHY A SCRIPT (not a hand edit): slot-commit-worktree-enforce.mjs is a harness-exec hook; a
 * worktree chat's Edit tool is firewall-blocked from it. This applier encodes the EXACT,
 * anchor-asserted patch so the change is reviewable, idempotent, and EOL-preserving. Run from the
 * main tree after review:
 *   node scripts/wire-slot-commit-enforce-bypass.mjs            # dry-run (default)
 *   node scripts/wire-slot-commit-enforce-bypass.mjs --apply    # write the change
 *
 * THE FIX (see scripts/lib/slot-commit-bypass.mjs for the full rationale): the hook's one-shot
 * migration escape `if (cmd.includes(BOOTSTRAP_MARKER)) allow("bootstrap-marker");` became the
 * standard commit prefix fleet-wide and silently neutered the gate on EVERY commit. This patch
 * routes the bypass decision through `commitBypass(cmd, env)` -- [BOOTSTRAP-SLOT-ENFORCE] now
 * bypasses ONLY inside an operator-opened transition window; [MAIN-FORCE] is the narrow audited
 * cross-cutting escape. The hook's local `BOOTSTRAP_MARKER` const (used in the deny message) is
 * left intact -- we import ONLY `commitBypass` to avoid a redeclare conflict.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const J = (eol, ...lines) => lines.join(eol);

// Add the import directly after the spawnSync import line (top of the hook's import block).
const IMPORT_ANCHOR = `import { spawnSync } from "node:child_process";`;
const importAdd = (eol) =>
  J(eol,
    IMPORT_ANCHOR,
    "// U-SLOT-COMMIT-ENFORCE-LIVE (slot:india 2026-06-11): the [BOOTSTRAP-SLOT-ENFORCE] marker became the",
    "// universal commit prefix and silently neutered this gate fleet-wide. Route the bypass decision",
    "// through a pure, tested function: marker bypass is now opt-in; [MAIN-FORCE] is the cross-cutting escape.",
    'import { commitBypass } from "../../scripts/lib/slot-commit-bypass.mjs";');

// Replace the blanket marker bypass with the routed decision.
const BYPASS_ANCHOR = `  if (cmd.includes(BOOTSTRAP_MARKER)) allow("bootstrap-marker");`;
const bypassNew = (eol) =>
  J(eol,
    "  // Bypass decision (kill-switch > [MAIN-FORCE] > opt-in bootstrap window). Default: ENFORCE.",
    "  const bypass = commitBypass(cmd, process.env);",
    "  if (bypass) allow(bypass);");

const TARGETS = [".claude/hooks/slot-commit-worktree-enforce.mjs"];

export function wireOne(text) {
  if (text.includes("slot-commit-bypass")) return { changed: false, reason: "already-wired", text };
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  if (!text.includes(IMPORT_ANCHOR)) return { changed: false, reason: "import-anchor-missing", text };
  if (!text.includes(BYPASS_ANCHOR)) return { changed: false, reason: "bypass-anchor-missing", text };
  const out = text.replace(IMPORT_ANCHOR, importAdd(eol)).replace(BYPASS_ANCHOR, bypassNew(eol));
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
      console.log(`${rel}: WOULD WIRE (import + routed bypass). Run with --apply to write.`);
    }
  }
  if (!anyChange && !apply) console.log("(nothing to change -- target already wired or anchors absent)");
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
