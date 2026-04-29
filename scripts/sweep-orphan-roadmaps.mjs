#!/usr/bin/env node
/**
 * sweep-orphan-roadmaps.mjs — One-shot migration: list (and optionally move)
 * roadmap/milestone/position files that ended up outside H: on this machine.
 *
 * Mirrors the regex from .claude/hooks/stop_on_non_h_roadmap.mjs and scans
 * the same well-known C:/D: locations. Default mode is dry-run (list only).
 * Pass --apply to actually move orphans to H: under data/state/recovered-roadmaps/.
 *
 * Usage:
 *   node scripts/sweep-orphan-roadmaps.mjs              # dry-run
 *   node scripts/sweep-orphan-roadmaps.mjs --apply      # move orphans
 *   node scripts/sweep-orphan-roadmaps.mjs --json       # JSON output
 *
 * Exit codes:
 *   0 — clean (no orphans) OR successful migration
 *   1 — orphans found in dry-run (advisory)
 *   2 — apply mode failed for one or more files
 */
import { readdirSync, statSync, existsSync, mkdirSync, renameSync, copyFileSync, unlinkSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const ROADMAP_FILE_RE =
  /(?:^|[\\/])(?:[A-Z][A-Z0-9_-]*-?ROADMAP[A-Z0-9_-]*|roadmap-index|CURRENT_POSITION|MILESTONE-[A-Z0-9_-]+|[A-Z][A-Z0-9_-]*-MS\d+)\.(?:md|json)$/i;
const ROADMAP_DIR_RE = /(?:^|[\\/])(?:milestones|roadmap)[\\/]/;
const NON_H_DRIVE_RE = /^(?:[A-GI-Z]:|\/[a-gi-z]\/|\/mnt\/[a-gi-z]\/)/i;
const MAX_DEPTH = 4;

const APPLY = process.argv.includes("--apply");
const JSON_OUT = process.argv.includes("--json");
const TARGET_DIR = "H:/prism/mcp-server/data/state/recovered-roadmaps";

function getScanRoots() {
  const roots = [];
  try {
    const userHomes = readdirSync("C:/Users", { withFileTypes: true }).filter(
      (d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "Public",
    );
    for (const home of userHomes) {
      const base = join("C:/Users", home.name);
      for (const sub of ["Desktop", "Documents", "Downloads"]) {
        const target = join(base, sub).replace(/\\/g, "/");
        if (existsSync(target)) roots.push(target);
      }
    }
  } catch {
    /* C:/Users not enumerable on this host — skip */
  }
  for (const tmp of ["C:/temp", "D:/temp", "C:/Users/Public/Documents"]) {
    if (existsSync(tmp)) roots.push(tmp);
  }
  return roots;
}

function walk(dir, cb, depth = 0) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        walk(full, cb, depth + 1);
      } else if (entry.isFile()) {
        cb(full);
      }
    } catch {
      /* ignore permission / transient errors */
    }
  }
}

function isRoadmapPath(p) {
  const norm = p.replace(/\\/g, "/");
  return ROADMAP_FILE_RE.test(norm) || ROADMAP_DIR_RE.test(norm);
}

function findOrphans() {
  const orphans = [];
  for (const root of getScanRoots()) {
    if (!NON_H_DRIVE_RE.test(root)) continue;
    walk(root, (file) => {
      if (isRoadmapPath(file)) orphans.push(file.replace(/\\/g, "/"));
    });
  }
  return orphans;
}

function moveOne(src) {
  const baseName = basename(src);
  // Avoid collisions: prefix with a sanitized parent-dir tag.
  const parentTag = dirname(src).replace(/[\\/:]/g, "_").slice(-40);
  const targetName = `${parentTag}__${baseName}`;
  const target = join(TARGET_DIR, targetName).replace(/\\/g, "/");
  mkdirSync(TARGET_DIR, { recursive: true });
  if (existsSync(target)) {
    return { ok: false, reason: `target already exists: ${target}` };
  }
  try {
    renameSync(src, target);
    return { ok: true, target };
  } catch (err) {
    // Cross-volume rename can fail on Windows (EXDEV). Fall back to copy+delete.
    if (err && (err.code === "EXDEV" || err.code === "EPERM")) {
      try {
        copyFileSync(src, target);
        unlinkSync(src);
        return { ok: true, target, fallback: "copy+delete" };
      } catch (e2) {
        return { ok: false, reason: `copy+delete failed: ${e2?.message || e2}` };
      }
    }
    return { ok: false, reason: err?.message || String(err) };
  }
}

function main() {
  const orphans = findOrphans();
  const records = [];

  if (!APPLY) {
    for (const path of orphans) {
      records.push({ source: path, action: "list-only", suggestedTarget: TARGET_DIR });
    }
  } else {
    for (const path of orphans) {
      const r = moveOne(path);
      records.push({ source: path, action: r.ok ? "moved" : "failed", ...r });
    }
  }

  const summary = {
    scanned_roots: getScanRoots(),
    total_orphans: orphans.length,
    mode: APPLY ? "apply" : "dry-run",
    target_dir: TARGET_DIR,
    moved: records.filter((r) => r.action === "moved").length,
    failed: records.filter((r) => r.action === "failed").length,
    records,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Sweep mode: ${summary.mode}`);
    console.log(`Scanned ${summary.scanned_roots.length} root(s)`);
    console.log(`Found ${summary.total_orphans} orphan roadmap file(s)`);
    if (summary.total_orphans === 0) {
      console.log("✓ Clean — no orphans on non-H: drives.");
    } else {
      for (const r of records) {
        const tag = r.action === "moved" ? "MOVED →" : r.action === "failed" ? "FAILED" : "ORPHAN";
        const detail = r.target ? `→ ${r.target}` : r.reason || `→ ${TARGET_DIR}/`;
        console.log(`  [${tag}] ${r.source} ${detail}`);
      }
      if (APPLY) {
        console.log(`Moved: ${summary.moved}, Failed: ${summary.failed}`);
      } else {
        console.log("Run with --apply to migrate these to H:.");
      }
    }
  }

  if (summary.failed > 0) process.exit(2);
  if (!APPLY && summary.total_orphans > 0) process.exit(1);
  process.exit(0);
}

main();
