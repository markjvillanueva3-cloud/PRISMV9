// c-to-h-mirror-shared.mjs - shared walk/compare for P6-U01 audit + bootstrap.
// Mirrors the rule set in .claude/hooks/c-to-h-mirror.mjs (single source of truth):
//   - root files: settings.json, settings.local.json, .mcp.json, CLAUDE.md, keybindings.json
//   - subdirs:    commands/, hooks/, agents/, plugins/, skills/, rules/

import { readdirSync, statSync, lstatSync, readFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { createHash } from "node:crypto";

export const MIRRORED_ROOT = new Set([
  "settings.json",
  "settings.local.json",
  ".mcp.json",
  "CLAUDE.md",
  "keybindings.json",
]);

export const MIRRORED_SUBDIRS = [
  "commands",
  "hooks",
  "agents",
  "plugins",
  "skills",
  "rules",
];

export function resolveCRoot() {
  // Resolve the C: equivalent of $HOME/.claude regardless of WSL vs native shell.
  const profile = process.env.USERPROFILE || process.env.HOME || "";
  if (!profile) return null;
  return profile.replace(/\\/g, "/").replace(/\/$/, "") + "/.claude";
}

export const H_ROOT = "H:/.claude";

function isJunctionOrSymlink(absPath) {
  try {
    return lstatSync(absPath).isSymbolicLink();
  } catch {
    return false;
  }
}

function listFilesUnder(dir, accumulator = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return accumulator;
  }
  for (const ent of entries) {
    const full = join(dir, ent.name).replace(/\\/g, "/");
    // Don't recurse into symlinked directories (junction-cycle protection).
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      listFilesUnder(full, accumulator);
    } else if (ent.isFile()) {
      accumulator.push(full);
    }
  }
  return accumulator;
}

function sha256(absPath) {
  try {
    const buf = readFileSync(absPath);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

// Returns { rootFiles[], subdirFiles[] } — relative paths only — present on C:.
// Junctions are skipped at the directory level so we don't re-walk H: through C:.
export function listCFiles(cRoot = resolveCRoot()) {
  if (!cRoot || !existsSync(cRoot)) return { rootFiles: [], subdirFiles: [] };
  const rootFiles = [];
  for (const f of MIRRORED_ROOT) {
    const abs = `${cRoot}/${f}`;
    if (!existsSync(abs)) continue;
    if (isJunctionOrSymlink(abs)) continue;
    rootFiles.push(f);
  }
  const subdirFiles = [];
  for (const sd of MIRRORED_SUBDIRS) {
    const subdirAbs = `${cRoot}/${sd}`;
    if (!existsSync(subdirAbs)) continue;
    // Skip if the subdir itself is a junction — files there land on H: directly.
    if (isJunctionOrSymlink(subdirAbs)) continue;
    const collected = listFilesUnder(subdirAbs);
    for (const abs of collected) {
      // Convert to subdir-relative path: e.g. "commands/foo.md".
      const rel = abs.slice(cRoot.length + 1);
      subdirFiles.push(rel);
    }
  }
  return { rootFiles, subdirFiles };
}

// Compares one file's C: side vs H: side, returning a structured verdict.
//   "identical"   — both exist, hashes match
//   "diverged"    — both exist, hashes differ
//   "c_only"      — exists on C: but not H: (mirror gap)
//   "h_only"      — exists on H: only (not a regression; H: is canonical)
//   "absent"      — neither exists (shouldn't happen given listCFiles is C-anchored)
export function compareFile(relPath, cRoot = resolveCRoot()) {
  const cAbs = `${cRoot}/${relPath}`;
  const hAbs = `${H_ROOT}/${relPath}`;
  const cExists = existsSync(cAbs) && !isJunctionOrSymlink(cAbs);
  const hExists = existsSync(hAbs) && !isJunctionOrSymlink(hAbs);
  if (!cExists && !hExists) return { verdict: "absent", cAbs, hAbs };
  if (cExists && !hExists) return { verdict: "c_only", cAbs, hAbs };
  if (!cExists && hExists) return { verdict: "h_only", cAbs, hAbs };
  const cHash = sha256(cAbs);
  const hHash = sha256(hAbs);
  if (cHash && hHash && cHash === hHash) return { verdict: "identical", cAbs, hAbs, hash: cHash };
  return { verdict: "diverged", cAbs, hAbs, cHash, hHash };
}

export function buildAuditReport(cRoot = resolveCRoot()) {
  if (!cRoot) {
    return { ok: false, error: "No USERPROFILE/HOME — cannot resolve C: .claude root" };
  }
  if (!existsSync(cRoot)) {
    return {
      ok: true,
      cRoot,
      generated_at: new Date().toISOString(),
      summary: { total: 0, identical: 0, diverged: 0, c_only: 0, h_only: 0 },
      diverged: [],
      c_only: [],
      h_only: [],
      note: "C: .claude root does not exist on this box — H: mirror is N/A.",
    };
  }
  const { rootFiles, subdirFiles } = listCFiles(cRoot);
  const allRel = [...rootFiles, ...subdirFiles];
  const summary = { total: allRel.length, identical: 0, diverged: 0, c_only: 0, h_only: 0 };
  const diverged = [];
  const cOnly = [];
  for (const rel of allRel) {
    const r = compareFile(rel, cRoot);
    if (r.verdict === "identical") summary.identical++;
    else if (r.verdict === "diverged") { summary.diverged++; diverged.push({ rel, ...r }); }
    else if (r.verdict === "c_only") { summary.c_only++; cOnly.push({ rel, ...r }); }
  }
  // Detect h_only by walking H: and subtracting C: set.
  const cSet = new Set(allRel);
  const hOnly = [];
  for (const sd of MIRRORED_SUBDIRS) {
    const hSubdir = `${H_ROOT}/${sd}`;
    if (!existsSync(hSubdir)) continue;
    const collected = listFilesUnder(hSubdir);
    for (const abs of collected) {
      const rel = abs.slice(H_ROOT.length + 1);
      if (!cSet.has(rel)) {
        hOnly.push({ rel, hAbs: abs });
        summary.h_only++;
      }
    }
  }
  for (const f of MIRRORED_ROOT) {
    const hAbs = `${H_ROOT}/${f}`;
    if (existsSync(hAbs) && !cSet.has(f)) {
      hOnly.push({ rel: f, hAbs });
      summary.h_only++;
    }
  }
  return {
    ok: true,
    cRoot,
    hRoot: H_ROOT,
    generated_at: new Date().toISOString(),
    summary,
    diverged,
    c_only: cOnly,
    h_only: hOnly,
  };
}
