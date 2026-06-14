#!/usr/bin/env node
// scripts/build-h-drive-atlas.mjs
//
// "Ensure the Obsidian vault has everything contained in the entire H drive."
// (operator directive 2026-06-04, slot:bravo)
//
// The Obsidian vault is rooted at H:/PRISM/knowledge (its `.obsidian` config dir
// lives there). H:\ itself holds 145 top-level dirs — mostly transient git
// WORKTREE CLONES (prism-slot-*, prism-*-ms0), caches (.venv*, .hf-cache,
// $RECYCLE.BIN) and a handful of REAL unique resources. Pointing Obsidian at H:\
// directly would index 100K+ binaries / node_modules / .git and make the app
// unusable. So instead we generate a navigable ATLAS *inside* the vault: a
// markdown map of every top-level area on H:, classified + counted + linked, so
// from Obsidian you can see and reach EVERYTHING on the drive without drowning
// the indexer. The atlas auto-feeds the Obsidian graph as ordinary vault nodes.
//
// Output (under the vault): knowledge/h-drive-atlas/INDEX.md (master map) — one
// row per H: top-level dir, grouped by class, with child counts + a pointer to
// the 3 critical resource-root indexes (resources / JM DIE / Docustrata) that are
// already deep-indexed (never re-walked here — see CRITICAL-RESOURCE-ROOTS).
//
// Bounded + safe: top-level enumeration only (NO deep recursion into worktrees /
// node_modules / caches — that is the whole point). Access-denied system dirs
// ($RECYCLE.BIN, System Volume Information) are noted, never fatal. Idempotent —
// re-runnable; a scheduled task can keep the atlas fresh.
//
// Pure export: classifyHDir(name) — fully unit-tested. I/O: buildAtlas(opts).
//
// @module build-h-drive-atlas

import fs from "node:fs";
import path from "node:path";

const H_ROOT = process.env.PRISM_H_ROOT || "H:/";
const VAULT = process.env.PRISM_VAULT_ROOT || "H:/prism/knowledge";

/**
 * Classify an H: top-level directory by name. Pure. Returns { class, real, note }
 * where `real` flags genuine unique knowledge/resource content (vs a transient
 * worktree clone, cache, or system dir). Ordering of the checks matters — most
 * specific first.
 *
 * @param {string} name  the bare directory name
 * @returns {{cls:string, real:boolean, note:string}}
 */
export function classifyHDir(name) {
  const n = String(name);
  // The canonical repo + the vault itself.
  if (n === "PRISM" || n === "prism") return { cls: "main-repo", real: true, note: "the canonical PRISM monorepo (engines, dispatchers, hooks, scripts, knowledge)" };
  if (n === "knowledge") return { cls: "vault", real: true, note: "THIS Obsidian vault (wiki + memories + atlas)" };
  if (n === "OBSIDIAN") return { cls: "obsidian-app", real: true, note: "Obsidian application / portable install" };
  // Slot + feature worktrees — git clones of the monorepo, not unique content.
  if (/^prism-slot-[a-z]+$/i.test(n)) return { cls: "slot-worktree", real: false, note: "git worktree for a fleet slot (clone of the monorepo)" };
  if (/^prism[-_]/i.test(n) || /^prism--/i.test(n)) return { cls: "feature-worktree", real: false, note: "feature/milestone worktree clone (transient)" };
  // Real resource roots (already deep-indexed via CRITICAL-RESOURCE-ROOTS).
  if (/docustrata/i.test(n)) return { cls: "resource", real: true, note: "Docustrata document corpus (deep-indexed — search manifest.json + .index/, never re-OCR)" };
  if (/^jmd|jm[ _-]?die/i.test(n)) return { cls: "resource", real: true, note: "JM Die customer/program resources" };
  if (/^cad-engine$/i.test(n)) return { cls: "resource", real: true, note: "CAD engine assets / cadquery + extraction" };
  if (/^hermes-install$/i.test(n)) return { cls: "resource", real: true, note: "Hermes desktop agent install payload" };
  if (/^uploads$/i.test(n)) return { cls: "resource", real: true, note: "user-uploaded inputs (prints, docs)" };
  if (/^_imported/i.test(n)) return { cls: "imported", real: true, note: "imported external content" };
  // PRISM runtime data/state.
  if (/^(data|state|manifests|blobs)$/i.test(n)) return { cls: "data-state", real: true, note: "PRISM runtime data / state" };
  // Tooling.
  if (/^\.?tools$/i.test(n)) return { cls: "tooling", real: false, note: "portable toolchain (node/python/etc.) — binaries, not knowledge" };
  if (/^(Docker|DockerDesktopWSL|WSL)$/i.test(n)) return { cls: "tooling", real: false, note: "container / WSL runtime" };
  // Caches + venvs + claude/codex state dirs.
  if (/^\.(cache|venv|venv2|venv-|uv-cache|uv-python|hf-cache|tmp|tools|appdata|playwright|remote-plugins|codex|claude|auto-memory|cowork|prism-recovery)/i.test(n)) {
    return { cls: "cache-state", real: false, note: "cache / venv / agent-state dir (not knowledge content)" };
  }
  if (/^(temp|tmp|CodexTmp|recovery-logs|prism-backups)$/i.test(n)) return { cls: "transient", real: false, note: "temp / backup / recovery scratch" };
  // System / recycle / recovered-chains — usually access-restricted.
  if (/^\$|^System Volume|^found\.\d|RECYCLE|^%System|^BIOS$|^USER_PROFILE$|^LAUNCH$|^0$|^c$/i.test(n)) {
    return { cls: "system", real: false, note: "OS / system / recovered-fragment dir" };
  }
  if (/^_ORPHAN/i.test(n)) return { cls: "archived", real: false, note: "archived orphan (retired)" };
  return { cls: "other", real: false, note: "" };
}

/** Shallow child count for a dir (immediate entries only — never recurses). */
function shallowCount(dir, _fs = fs) {
  try { return _fs.readdirSync(dir).length; }
  catch { return null; } // access denied / not a dir
}

const CLASS_ORDER = [
  "main-repo", "vault", "obsidian-app", "resource", "data-state", "imported",
  "feature-worktree", "slot-worktree", "tooling", "cache-state", "transient",
  "archived", "system", "other",
];
const CLASS_TITLE = {
  "main-repo": "🧠 Canonical repo", "vault": "📓 The vault", "obsidian-app": "🪨 Obsidian app",
  "resource": "📦 Real resources (unique knowledge/content)", "data-state": "🗃️ PRISM data / state",
  "imported": "📥 Imported content", "feature-worktree": "🌿 Feature/milestone worktrees (clones)",
  "slot-worktree": "🔧 Fleet-slot worktrees (clones)", "tooling": "🛠️ Tooling / runtimes",
  "cache-state": "♻️ Caches / venvs / agent-state", "transient": "🧹 Temp / backup / recovery",
  "archived": "📁 Archived / orphan", "system": "⚙️ OS / system", "other": "❔ Unclassified",
};

/**
 * Build the H: drive atlas markdown. Pure-ish (I/O injectable for tests).
 * Returns { markdown, rows, counts }.
 */
export function buildAtlasMarkdown({ hRoot = H_ROOT, _fs = fs, now = "" } = {}) {
  let entries = [];
  try {
    entries = _fs.readdirSync(hRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    throw new Error(`cannot read H: root ${hRoot}: ${e.message}`);
  }
  entries.sort((a, b) => a.localeCompare(b));

  const rows = entries.map((name) => {
    const c = classifyHDir(name);
    const count = shallowCount(path.join(hRoot, name), _fs);
    return { name, ...c, count };
  });

  const byClass = new Map();
  for (const r of rows) {
    if (!byClass.has(r.cls)) byClass.set(r.cls, []);
    byClass.get(r.cls).push(r);
  }
  const counts = {
    total: rows.length,
    real: rows.filter((r) => r.real).length,
    worktrees: rows.filter((r) => r.cls === "slot-worktree" || r.cls === "feature-worktree").length,
  };

  const L = [];
  L.push("---");
  L.push("title: H: Drive Atlas");
  L.push("aliases: [H Drive Map, Everything on H, drive-atlas]");
  L.push("tags: [atlas, index, h-drive, vault-coverage]");
  if (now) L.push(`generated: ${now}`);
  L.push("---");
  L.push("");
  L.push("# 🗺️ H: Drive Atlas — everything on H:, mapped into the vault");
  L.push("");
  L.push(`This atlas makes the Obsidian vault (rooted at \`H:/PRISM/knowledge\`) aware of **everything on the H: drive** without forcing Obsidian to index 100K+ binaries. It is a navigable map of all **${counts.total}** top-level areas — **${counts.real}** real-content roots + **${counts.worktrees}** transient worktree clones + caches/system dirs.`);
  L.push("");
  L.push("> **Deep-indexed resource roots** (do NOT re-walk — they carry their own indexes): the 3 critical resource roots are catalogued in [[critical-resource-roots]] — `H:/PRISM/resources`, `H:/PRISM/JM DIE`, `H:/PRISM/Docustrata`. The full codebase map is the live `/system-viz` graph; the per-domain brains are the 34 galaxy cards ([[ALL-CARDS]]).");
  L.push("");
  L.push("> Regenerate: `node scripts/build-h-drive-atlas.mjs` (idempotent). A scheduled task can keep it fresh.");
  L.push("");

  for (const cls of CLASS_ORDER) {
    const group = byClass.get(cls);
    if (!group || group.length === 0) continue;
    L.push(`## ${CLASS_TITLE[cls] || cls} (${group.length})`);
    L.push("");
    L.push("| Dir | items | Note |");
    L.push("|-----|------:|------|");
    for (const r of group) {
      const items = r.count === null ? "—" : String(r.count);
      const note = (r.note || "").replace(/\|/g, "\\|");
      L.push(`| \`H:/${r.name}\` | ${items} | ${note} |`);
    }
    L.push("");
  }

  return { markdown: L.join("\n") + "\n", rows, counts };
}

/** Full build: write the atlas INDEX.md into the vault. Returns the result. */
export function buildAtlas({ hRoot = H_ROOT, vault = VAULT, _fs = fs, now = "" } = {}) {
  const { markdown, rows, counts } = buildAtlasMarkdown({ hRoot, _fs, now });
  const outDir = path.join(vault, "h-drive-atlas");
  _fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "INDEX.md");
  // atomic-ish write
  const tmp = outFile + ".tmp-" + process.pid;
  _fs.writeFileSync(tmp, markdown, "utf8");
  _fs.renameSync(tmp, outFile);
  return { outFile, counts, rowCount: rows.length };
}

// CLI
const __direct = (() => { try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("build-h-drive-atlas.mjs"); } catch { return false; } })();
if (__direct) {
  const stamp = new Date().toISOString().slice(0, 10); // top-level only; ISO date is fine
  try {
    const r = buildAtlas({ now: stamp });
    process.stdout.write(JSON.stringify({ ok: true, ...r }, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    process.exit(1);
  }
}
