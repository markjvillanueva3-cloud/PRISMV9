#!/usr/bin/env node
// migrate-zebra-to-zulu.mjs — deterministic zebra->zulu migration (slot:bravo 2026-05-30).
// Operator chose maximal scope: rename the non-NATO legacy slot `zebra` to the canonical
// NATO `zulu` across code/infra/knowledge/milestone-IDs.
//
//   node scripts/migrate-zebra-to-zulu.mjs --dry-run   # report only, no changes
//   node scripts/migrate-zebra-to-zulu.mjs             # perform git mv + content replace
//
// Does NOT touch: CAM "zebra stripes" (CAD term), HZP-*/HZD- IDs (no 'zebra' substring),
// git history, *.bak/*.archive, handoffs, system-viz giant JSON, node_modules/dist/.git.
// COLLISIONS (souls, skill wrappers where a zulu twin already exists) are NOT auto-renamed —
// they are reported for explicit handling. Uses execFileSync (no shell) for git mv.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
const C_MEMORY = "C:/Users/wompu/.claude/projects/H--prism/memory";
const DRY = process.argv.includes("--dry-run");

const ROOTS = [
  `${ROOT}/mcp-server/src`,
  `${ROOT}/.claude/commands`,
  `${ROOT}/.claude/hooks`,
  `${ROOT}/.claude/helpers`,
  `${ROOT}/scripts`,
  `${ROOT}/state/shared`,
  `${ROOT}/knowledge`,
  C_MEMORY,
];
const SINGLE_FILES = [`${ROOT}/CLAUDE.md`];

const EXCLUDE_DIR = /[/\\](node_modules|dist|\.git|chunks|\.cache)[/\\]/i;
const EXCLUDE_PATH = /(\.bak|\.archive\.|[/\\]handoffs[/\\]|[/\\]system-viz[/\\].*\.json$|\.jsonl$|\.heapsnapshot$|\.png$|\.gz$)/i;
const TEXT_EXT = /\.(ts|tsx|js|mjs|cjs|md|json|html|ps1|txt|ya?ml)$/i;
const MAX_SIZE = 2 * 1024 * 1024;

// Line-level content exclusion: CAM "zebra stripes" surface-analysis term (NOT the slot).
const LINE_EXCLUDE = /zebra[\s_-]?strip/i;

// Collisions handled separately (a zulu twin already exists): do NOT auto-rename these names.
const COLLISION_BASENAMES = new Set([
  "zebra.md", "zebra.html",
  "checkin-zebra.md", "precompact-zebra.md", "handoff-zebra.md", "startup-zebra.md",
  "galaxy-buildout-zebra.md", "smart-zebra.md", "galaxy-verify-zebra.md",
]);

function hasZebra(s) { return /zebra/i.test(s); }
function toZulu(s) {
  return s.replace(/ZEBRA/g, "ZULU").replace(/Zebra/g, "Zulu").replace(/zebra/g, "zulu");
}

function walk(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name).replace(/\\/g, "/");
    if (EXCLUDE_DIR.test(p + "/")) continue;
    if (e.isDirectory()) { out.dirs.push(p); walk(p, out); }
    else if (e.isFile()) out.files.push(p);
  }
}

const found = { files: [], dirs: [] };
for (const r of ROOTS) if (fs.existsSync(r)) walk(r, found);
for (const f of SINGLE_FILES) if (fs.existsSync(f)) found.files.push(f);

// ── 1) Content replace ──────────────────────────────────────────────────────
let contentChanged = 0, linesChanged = 0, exclusionHits = 0;
const contentFiles = [];
for (const f of found.files) {
  if (EXCLUDE_PATH.test(f) || !TEXT_EXT.test(f)) continue;
  let st; try { st = fs.statSync(f); } catch { continue; }
  if (st.size > MAX_SIZE) continue;
  let txt; try { txt = fs.readFileSync(f, "utf8"); } catch { continue; }
  if (!hasZebra(txt)) continue;
  const eol = txt.includes("\r\n") ? "\r\n" : "\n";
  const lines = txt.split(/\r?\n/);
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (LINE_EXCLUDE.test(lines[i])) { if (/zebra/i.test(lines[i])) exclusionHits++; continue; }
    if (/zebra/i.test(lines[i])) { const nl = toZulu(lines[i]); if (nl !== lines[i]) { lines[i] = nl; n++; } }
  }
  if (n > 0) {
    contentChanged++; linesChanged += n; contentFiles.push({ f, n });
    if (!DRY) fs.writeFileSync(f, lines.join(eol), "utf8");
  }
}

// ── 2) File + dir renames (git mv, no shell), skipping collisions ────────────
const renames = [], collisions = [], renameErrors = [];
function gitmv(oldP, newP) {
  if (fs.existsSync(newP)) {
    // COLLISION: a zulu twin already exists. The content-replaced zebra source now
    // targets zulu (and carries orchestrator-specific content for smart/soul), so it
    // becomes canonical: overwrite the zulu target with it, then drop the zebra source.
    collisions.push({ oldP, newP });
    if (!DRY) {
      try {
        fs.copyFileSync(oldP, newP);
        try { execFileSync("git", ["-C", ROOT, "rm", "-f", "--", oldP], { stdio: "pipe" }); }
        catch { try { fs.unlinkSync(oldP); } catch { /* ignore */ } }
      } catch (e) { renameErrors.push({ oldP, err: "collision-resolve: " + String(e.message || e) }); }
    }
    return;
  }
  renames.push({ oldP, newP });
  if (!DRY) {
    try {
      fs.mkdirSync(path.dirname(newP), { recursive: true });
      execFileSync("git", ["-C", ROOT, "mv", "--", oldP, newP], { stdio: "pipe" });
    } catch {
      try { fs.renameSync(oldP, newP); } catch (e2) { renameErrors.push({ oldP, err: String(e2.message || e2) }); }
    }
  }
}
// Real collisions (target zulu file already exists) are detected per-path by gitmv's
// existsSync and reported — no blunt basename pre-filter (which wrongly excluded the
// per-slot-galaxy-buildout/zebra.md that HAS no zulu twin).
const fileRenameTargets = found.files
  .filter((f) => hasZebra(path.basename(f)) && !EXCLUDE_PATH.test(f))
  .sort((a, b) => b.length - a.length);
for (const f of fileRenameTargets) gitmv(f, path.join(path.dirname(f), toZulu(path.basename(f))).replace(/\\/g, "/"));

const dirRenameTargets = found.dirs
  .filter((d) => hasZebra(path.basename(d)) && !EXCLUDE_DIR.test(d + "/"))
  .sort((a, b) => b.length - a.length);
for (const d of dirRenameTargets) gitmv(d, path.join(path.dirname(d), toZulu(path.basename(d))).replace(/\\/g, "/"));

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n=== migrate-zebra-to-zulu ${DRY ? "(DRY-RUN)" : "(LIVE)"} ===`);
console.log(`content: ${contentChanged} files, ${linesChanged} lines changed; ${exclusionHits} CAM 'zebra-stripe' lines EXCLUDED`);
console.log(`renames (file+dir): ${renames.length}`);
for (const r of renames) console.log(`  mv ${r.oldP.replace(ROOT, ".").replace(C_MEMORY, "C:mem")}  ->  ${path.basename(r.newP)}`);
console.log(`COLLISIONS (target exists, NOT auto-renamed -> handle manually): ${collisions.length}`);
for (const c of collisions) console.log(`  !! ${c.oldP.replace(ROOT, ".")}  (target ${path.basename(c.newP)} exists)`);
if (renameErrors.length) { console.log(`RENAME ERRORS: ${renameErrors.length}`); for (const e of renameErrors) console.log(`  xx ${e.oldP}: ${e.err}`); }
console.log(`\ntop content files:`);
for (const c of contentFiles.sort((a, b) => b.n - a.n).slice(0, 20)) console.log(`  ${c.n}\t${c.f.replace(ROOT, ".").replace(C_MEMORY, "C:mem")}`);
console.log(`\n${DRY ? "DRY-RUN — no changes written." : "LIVE migration complete."}`);
