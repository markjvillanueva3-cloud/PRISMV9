#!/usr/bin/env node
// migrate-stranded-obsidian-memos.mjs
// OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMDIR-HOMEDIR (slot:alpha, 2026-06-09)
//
// One-time recovery for the dead-foreign-path split-brain (see
// scripts/lib/obsidian-mem-dir.mjs header). The post-ship distiller
// (distill-session-learnings.mjs) had been writing reference_post_ship_*.md
// memos into a phantom tree
//   C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory
// that the C:->H: Obsidian feed + semantic recall never see (they read the
// canonical homedir-derived dir). Those memos are real distilled retention
// signal — strand-recovered here so they reach H: + the embedding cache.
//
// SAFE BY DEFAULT: dry-run unless --apply. Purely ADDITIVE — copies only
// files MISSING from canon; NEVER overwrites a canon file (canon is the
// live-fed source of truth). Files present in both are reported, not touched.
//
// CLI:
//   node scripts/migrate-stranded-obsidian-memos.mjs            # dry-run report
//   node scripts/migrate-stranded-obsidian-memos.mjs --apply    # copy missing → canon
//   --from <dir>  override the stranded source (default: the dead path)
//   --to <dir>    override canon (default: resolveObsidianMemDir())

import fs from "node:fs";
import path from "node:path";
import { resolveObsidianMemDir } from "./lib/obsidian-mem-dir.mjs";

const DEAD_DEFAULT = "C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function main() {
  const apply = process.argv.includes("--apply");
  const from = arg("--from") || DEAD_DEFAULT;
  const to = arg("--to") || resolveObsidianMemDir();

  if (path.resolve(from) === path.resolve(to)) {
    console.log(`Source and dest are the same dir (${to}) — nothing to migrate (path already fixed).`);
    return;
  }
  if (!fs.existsSync(from)) {
    console.log(`No stranded source dir at ${from} — nothing to recover.`);
    return;
  }
  if (!fs.existsSync(to)) {
    console.error(`Canon dir ${to} does not exist — refusing to migrate (would be writing into the void).`);
    process.exit(1);
  }

  const srcFiles = fs.readdirSync(from).filter(f => f.endsWith(".md"));
  const canonSet = new Set(fs.readdirSync(to).filter(f => f.endsWith(".md")));
  const missing = srcFiles.filter(f => !canonSet.has(f));
  const inBoth = srcFiles.filter(f => canonSet.has(f));

  // Classify the in-both set so we don't silently lose a dead-newer edit.
  let identical = 0, deadNewer = 0, canonNewer = 0;
  const deadNewerNames = [];
  for (const f of inBoth) {
    const db = fs.readFileSync(path.join(from, f));
    const cb = fs.readFileSync(path.join(to, f));
    if (db.equals(cb)) { identical++; continue; }
    const ds = fs.statSync(path.join(from, f)).mtimeMs;
    const cs = fs.statSync(path.join(to, f)).mtimeMs;
    if (ds > cs) { deadNewer++; deadNewerNames.push(f); } else { canonNewer++; }
  }

  console.log(`Stranded source: ${from}`);
  console.log(`Canon dest:      ${to}`);
  console.log(`.md in source:   ${srcFiles.length}`);
  console.log(`Missing from canon (additive copy targets): ${missing.length}`);
  console.log(`Already in both: ${inBoth.length} (identical=${identical}, dead-newer=${deadNewer}, canon-newer=${canonNewer})`);
  if (deadNewerNames.length) {
    console.log(`NOTE: ${deadNewerNames.length} file(s) exist in both but the stranded copy is NEWER (content differs).`);
    console.log(`      These are NOT auto-overwritten (canon is source of truth). Review manually:`);
    for (const f of deadNewerNames.slice(0, 20)) console.log(`        - ${f}`);
  }

  if (!apply) {
    console.log(`\nDRY-RUN (no files written). Re-run with --apply to copy the ${missing.length} missing memo(s) into canon.`);
    return;
  }

  let copied = 0;
  for (const f of missing) {
    fs.copyFileSync(path.join(from, f), path.join(to, f));
    copied++;
  }
  console.log(`\nAPPLIED: copied ${copied} stranded memo(s) → ${to}`);
  console.log(`These now propagate C:->H: on the next Stop (stop-obsidian-memory-feed.mjs) and get embedded by the recall cache.`);
}

main();
