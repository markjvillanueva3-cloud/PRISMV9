#!/usr/bin/env node
// wire-ups-domain-bundle.mjs -- one-shot, IDEMPOTENT wiring for the UPS domain
// bundle (FORK-STORM-CONSOLIDATION, slot:india 2026-06-14).
//
// Removes the 9 standalone slot-specific domain-awareness injectors from the
// UserPromptSubmit hook array and inserts the single bundle hook in their place
// (same matcher group), so they run as node-children of one process instead of 9
// per-hook portable-node bash.exe wrappers on every prompt for every slot.
//
// Writes BOTH settings.json copies (C: canonical + H: mirror -- the c-to-h-mirror
// hook only fires on Edit/Write TOOL calls, NOT node fs.writes, so a script must
// write both). Backs each up first. Aborts WITHOUT writing if the removal count
// is unexpected or the result does not round-trip as JSON.
//
// Re-run safe: if the bundle is already wired it is a no-op (removed=0, exits 0).
// Revert: restore the .bak-forkstorm-ups backups, or re-add the 9 names below as
// individual UserPromptSubmit command entries.

import fs from "node:fs";

const C = "C:/Users/wompu/.claude/settings.json";
const H = "H:/.claude/settings.json";
const BUNDLE_BASENAME = "ups-domain-bundle.mjs";
const BUNDLE_CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/ups-domain-bundle.mjs';
const BUNDLE_TIMEOUT = 20000;
const EXPECTED_REMOVALS = 9;

// EXACT basenames of the 9 standalone wires being folded. Match by substring on
// the command so the differing roots (repo / global / lima-worktree) all match.
const NAMES = [
  "delta-cad-awareness-inject.mjs",
  "echo-post-domain-inject.mjs",
  "xray-blueprint-domain-inject.mjs",
  "foxtrot-mill-awareness-inject.mjs",
  "sierra-graph-health-inject.mjs",
  "lima-academy-awareness-inject.mjs",
  "charlie-quoting-awareness-inject.mjs",
  "charlie-quoting-knowledge-inject.mjs",
  "whiskey-lathe-context-inject.mjs",
];

function rewire(raw) {
  const j = JSON.parse(raw);
  const ups = j.hooks && j.hooks.UserPromptSubmit;
  if (!Array.isArray(ups)) throw new Error("hooks.UserPromptSubmit is not an array");

  let removed = 0;
  let bundleAlready = false;
  let insertGroup = null;

  for (const grp of ups) {
    if (!grp || !Array.isArray(grp.hooks)) continue;
    const before = grp.hooks.length;
    grp.hooks = grp.hooks.filter((h) => {
      const cmd = String((h && h.command) || "");
      if (cmd.includes(BUNDLE_BASENAME)) { bundleAlready = true; return true; }
      if (NAMES.some((n) => cmd.includes(n))) { removed++; return false; }
      return true;
    });
    if (grp.hooks.length < before && !insertGroup) insertGroup = grp;
  }

  if (!bundleAlready) {
    const entry = { type: "command", command: BUNDLE_CMD, timeout: BUNDLE_TIMEOUT };
    if (insertGroup) insertGroup.hooks.push(entry);
    else ups.push({ matcher: "", hooks: [entry] });
  }

  // prune any group left with zero hooks
  j.hooks.UserPromptSubmit = ups.filter((g) => g && Array.isArray(g.hooks) && g.hooks.length > 0);

  const out = JSON.stringify(j, null, 2);
  JSON.parse(out); // re-validate -- throws on any corruption before we write
  return { out, removed, bundleAlready };
}

function main() {
  const craw = fs.readFileSync(C, "utf8");
  const { out, removed, bundleAlready } = rewire(craw);
  console.log(`C: removed=${removed} bundleAlready=${bundleAlready}`);

  if (!bundleAlready && removed !== EXPECTED_REMOVALS) {
    console.error(`ABORT: expected ${EXPECTED_REMOVALS} removals, got ${removed}. No files written.`);
    process.exit(2);
  }
  if (bundleAlready && removed === 0) {
    console.log("Already wired -- no-op.");
    return;
  }

  // C: backup + write
  fs.writeFileSync(C + ".bak-forkstorm-ups", craw);
  fs.writeFileSync(C, out);

  // H: mirror -- it may differ slightly; rewire ITS own content for fidelity,
  // fall back to the C: output if H: is unreadable.
  try {
    const hraw = fs.readFileSync(H, "utf8");
    fs.writeFileSync(H + ".bak-forkstorm-ups", hraw);
    let hout;
    try { hout = rewire(hraw).out; } catch { hout = out; }
    fs.writeFileSync(H, hout);
    console.log(`Wrote C (${out.length}B) + H (${hout.length}B), backups .bak-forkstorm-ups`);
  } catch (e) {
    console.log(`H: mirror not written (${e.message}); wrote C: only`);
  }
}

main();
