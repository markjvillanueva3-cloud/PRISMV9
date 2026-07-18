#!/usr/bin/env node
/**
 * hook-archive-crossref.mjs — U-OBF-F4-ARCHIVE-CROSSREF
 *
 * U-OBF-F4 (2026-05-18) categorized 516 zero-fire hooks into 136 wired-but-silent
 * + 380 unwired-on-disk. The punch list at
 * `state/shared/specs/U-OBF-F4-HOOK-FIRE-AUDIT-PUNCHLIST-2026-05-18.md` flagged
 * that the 380 unwired-on-disk set CANNOT be filesystem-archived blindly —
 * some "unwired" hooks may actually be referenced by other surfaces (skills,
 * scripts, docs) and need to be caught before archive.
 *
 * This script is the cross-reference check the punch list requires. For each
 * candidate hook, it scans the live tree for any `<name>.mjs` reference under
 * skills, hooks, bundles, scripts, wiki, and root docs. A hook with zero
 * references outside its own source file is safe-to-archive. Anything with
 * a reference is kept active pending operator review.
 *
 * Output is ADVISORY ONLY: emits a safe-to-archive list and a referenced
 * list; an operator-gated follow-up unit `U-OBF-F4-ARCHIVE` does the actual
 * archive on the safe subset only. Doctrine: never delete, only disable
 * [[feedback_never_delete_only_disable]].
 *
 * Pure core (`crossReferenceHook`, `categorizeForArchive`, `findMatches`) +
 * thin CLI shell. No state mutation.
 *
 * Usage:
 *   node scripts/hook-archive-crossref.mjs                 # human summary
 *   node scripts/hook-archive-crossref.mjs --json          # machine-readable
 *   node scripts/hook-archive-crossref.mjs --emit          # write spec artifacts
 *   node scripts/hook-archive-crossref.mjs --audit <path>  # custom input audit
 *
 * Exit: 0 ok, 2 input failure.
 */
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve, basename, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const DEFAULT_AUDIT = resolve(REPO_ROOT, "state/shared/specs/U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18.json");

const SEARCH_ROOTS = [
  { root: ".claude/commands", ext: ".md", recurse: true },
  { root: ".claude/hooks", ext: ".mjs", recurse: true, skipDirs: ["_archive", "archived", "node_modules"] },
  { root: ".claude/hooks/bundles", ext: ".mjs", recurse: false },
  { root: "scripts", ext: ".mjs", recurse: true, skipDirs: ["node_modules"] },
  { root: "knowledge/wiki", ext: ".md", recurse: true },
];

const FLAT_FILES = [
  ".claude/settings.json",
  ".claude/settings.local.json",
  "CLAUDE.md",
];

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const EXT_MJS = ".mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (testable, no I/O)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all references to <hookName>.mjs in a single file's content.
 * @param {string} hookName - basename without .mjs suffix
 * @param {string} content - file content
 * @returns {Array<{lineNumber: number, snippet: string, offset: number}>}
 */
export function findMatches(hookName, content) {
  if (typeof hookName !== "string" || hookName.length === 0) return [];
  if (typeof content !== "string" || content.length === 0) return [];
  const literal = hookName.concat(EXT_MJS);
  const matches = [];
  let idx = 0;
  while (true) {
    const found = content.indexOf(literal, idx);
    if (found === -1) break;
    const beforeChar = found > 0 ? content[found - 1] : "";
    if (beforeChar && /[a-zA-Z0-9_.\-]/.test(beforeChar)) {
      idx = found + literal.length;
      continue;
    }
    let lineNumber = 1;
    for (let i = 0; i < found; i++) if (content.charCodeAt(i) === 10) lineNumber++;
    const nlBefore = content.lastIndexOf("\n", found - 1);
    const lineStart = nlBefore === -1 ? 0 : nlBefore + 1;
    const nlAfter = content.indexOf("\n", found);
    const lineEnd = nlAfter === -1 ? content.length : nlAfter;
    let snippet = content.slice(lineStart, lineEnd).trim();
    if (snippet.length > 160) snippet = snippet.slice(0, 157).concat("...");
    matches.push({ lineNumber, snippet, offset: found });
    idx = found + literal.length;
  }
  return matches;
}

/**
 * Cross-reference one hook against a pre-loaded corpus.
 * @param {object} args
 * @param {string} args.hookName
 * @param {Array<{path: string, content: string}>} args.corpus
 * @param {string} [args.selfFile]
 * @returns {object}
 */
export function crossReferenceHook({ hookName, corpus, selfFile = "" }) {
  if (typeof hookName !== "string" || hookName.length === 0) {
    return { hook: hookName, references: [], referenceCount: 0, safeToArchive: false, riskClass: "invalid" };
  }
  const refs = [];
  if (Array.isArray(corpus)) {
    for (const file of corpus) {
      if (!file || typeof file.path !== "string" || typeof file.content !== "string") continue;
      if (selfFile && (file.path === selfFile || file.path.endsWith(selfFile) || selfFile.endsWith(file.path))) continue;
      const hits = findMatches(hookName, file.content);
      for (const hit of hits) refs.push({ file: file.path, lineNumber: hit.lineNumber, snippet: hit.snippet });
    }
  }
  const safeToArchive = refs.length === 0;
  let riskClass;
  if (safeToArchive) {
    riskClass = "safe";
  } else if (refs.some((r) => r.file.includes("CLAUDE.md") || r.file.toUpperCase().includes("MEMORY.md"))) {
    riskClass = "doctrine-reference";
  } else if (refs.some((r) => r.file.includes("/bundles/") || r.file.includes(sep + "bundles" + sep))) {
    riskClass = "bundle-reference";
  } else if (refs.some((r) => r.file.includes("/commands/") || r.file.includes(sep + "commands" + sep))) {
    riskClass = "skill-reference";
  } else if (refs.some((r) => r.file.includes("/hooks/") || r.file.includes(sep + "hooks" + sep))) {
    riskClass = "hook-reference";
  } else if (refs.some((r) => r.file.includes("/wiki/") || r.file.includes(sep + "wiki" + sep))) {
    riskClass = "wiki-reference";
  } else if (refs.some((r) => r.file.includes("settings.json"))) {
    riskClass = "settings-reference";
  } else {
    riskClass = "other-reference";
  }
  return { hook: hookName, references: refs, referenceCount: refs.length, safeToArchive, riskClass };
}

/**
 * Run the cross-reference for every hook in unwiredList.
 * @param {object} args
 * @param {string[]} args.unwiredList
 * @param {Array<{path: string, content: string}>} args.corpus
 * @param {Map<string, string>} [args.selfFileMap]
 * @returns {object}
 */
export function categorizeForArchive({ unwiredList, corpus, selfFileMap = new Map() }) {
  const list = Array.isArray(unwiredList) ? unwiredList : [];
  const safeToArchive = [];
  const referencedElsewhere = [];
  for (const hookName of list) {
    const selfFile = selfFileMap.get(hookName) || "";
    const r = crossReferenceHook({ hookName, corpus, selfFile });
    if (r.safeToArchive) safeToArchive.push(r);
    else referencedElsewhere.push(r);
  }
  safeToArchive.sort((a, b) => a.hook.localeCompare(b.hook));
  referencedElsewhere.sort((a, b) => a.hook.localeCompare(b.hook));
  const riskHistogram = {};
  for (const r of referencedElsewhere) riskHistogram[r.riskClass] = (riskHistogram[r.riskClass] || 0) + 1;
  return {
    counts: {
      total: list.length,
      safeToArchive: safeToArchive.length,
      referencedElsewhere: referencedElsewhere.length,
    },
    riskHistogram,
    safe_to_archive: safeToArchive,
    referenced_elsewhere: referencedElsewhere,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// I/O helpers (CLI shell)
// ─────────────────────────────────────────────────────────────────────────────

function safeReadFile(path) {
  try {
    const st = statSync(path);
    if (!st.isFile()) return null;
    if (st.size > MAX_FILE_BYTES) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function walkDir(dir, opts) {
  const { ext, recurse, skipDirs = [] } = opts;
  const found = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!recurse) continue;
      if (skipDirs.includes(e.name)) continue;
      found.push(...walkDir(join(dir, e.name), opts));
    } else if (e.isFile()) {
      if (!ext || e.name.endsWith(ext)) found.push(join(dir, e.name));
    }
  }
  return found;
}

export function buildCorpus({
  rootDir = REPO_ROOT,
  searchRoots = SEARCH_ROOTS,
  flatFiles = FLAT_FILES,
  userClaudeRoot = "H:/.claude",
  userClaudeFiles = ["settings.json", "CLAUDE.md"],
} = {}) {
  const corpus = [];
  const visitedPaths = new Set();
  for (const r of searchRoots) {
    const fullRoot = resolve(rootDir, r.root);
    if (!existsSync(fullRoot)) continue;
    const files = walkDir(fullRoot, r);
    for (const p of files) {
      if (visitedPaths.has(p)) continue;
      visitedPaths.add(p);
      const content = safeReadFile(p);
      if (content !== null) corpus.push({ path: p, content });
    }
  }
  for (const f of flatFiles) {
    const p = resolve(rootDir, f);
    if (visitedPaths.has(p)) continue;
    visitedPaths.add(p);
    const content = safeReadFile(p);
    if (content !== null) corpus.push({ path: p, content });
  }
  if (userClaudeRoot) {
    for (const f of userClaudeFiles) {
      const p = resolve(userClaudeRoot, f);
      if (visitedPaths.has(p)) continue;
      visitedPaths.add(p);
      const content = safeReadFile(p);
      if (content !== null) corpus.push({ path: p, content });
    }
  }
  return corpus;
}

export function buildSelfFileMap({ rootDir = REPO_ROOT } = {}) {
  const map = new Map();
  const hooksDir = resolve(rootDir, ".claude/hooks");
  if (!existsSync(hooksDir)) return map;
  const files = walkDir(hooksDir, { ext: EXT_MJS, recurse: true, skipDirs: ["_archive", "archived", "node_modules"] });
  for (const p of files) {
    const name = basename(p, EXT_MJS);
    if (!map.has(name)) map.set(name, p);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI shell
// ─────────────────────────────────────────────────────────────────────────────

function atomicWriteJson(path, data) {
  const tmp = path.concat(".tmp");
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, path);
}

function atomicWriteText(path, text) {
  const tmp = path.concat(".tmp");
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

function renderMarkdown(result, audit) {
  const lines = [];
  lines.push("# U-OBF-F4-ARCHIVE-CROSSREF — Hook archive cross-reference (2026-05-18)");
  lines.push("");
  lines.push("**Source audit:** " + audit.path);
  lines.push("**Audit baseline:** " + (audit.generatedAt || "unknown"));
  lines.push("**Audit ledger window:** " + (audit.ledgerWindowHours || "?") + "h");
  lines.push("");
  lines.push("## Headline");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|---|---|");
  lines.push("| Unwired-on-disk candidates (input) | " + result.counts.total + " |");
  lines.push("| **Safe to archive** (zero external refs) | **" + result.counts.safeToArchive + "** |");
  lines.push("| Referenced elsewhere (keep active) | " + result.counts.referencedElsewhere + " |");
  lines.push("");
  lines.push("## Risk-class histogram (referenced-elsewhere bucket)");
  lines.push("");
  const classOrder = ["doctrine-reference", "bundle-reference", "skill-reference", "hook-reference", "wiki-reference", "settings-reference", "other-reference"];
  for (const cls of classOrder) {
    const n = result.riskHistogram[cls] || 0;
    if (n > 0) lines.push("- **" + cls + "**: " + n);
  }
  lines.push("");
  lines.push("## Safe-to-archive — top 25");
  lines.push("");
  lines.push("These have zero references outside their own source file. Archive-safe pending operator review.");
  lines.push("");
  const safeTop = result.safe_to_archive.slice(0, 25);
  for (const r of safeTop) lines.push("- `" + r.hook + "`");
  if (result.safe_to_archive.length > 25) lines.push("- ... (+" + (result.safe_to_archive.length - 25) + " more in JSON artifact)");
  lines.push("");
  lines.push("## Referenced-elsewhere — top 25");
  lines.push("");
  lines.push("These are referenced by skills, docs, bundles, or scripts. KEEP wired pending per-hook source review.");
  lines.push("");
  const refTop = result.referenced_elsewhere.slice(0, 25);
  for (const r of refTop) {
    lines.push("- `" + r.hook + "` (" + r.referenceCount + " refs, class=" + r.riskClass + ")");
    for (const hit of r.references.slice(0, 2)) {
      const rel = hit.file.replace(/\\/g, "/").replace(REPO_ROOT.replace(/\\/g, "/") + "/", "");
      lines.push("  - `" + rel + ":" + hit.lineNumber + "` — `" + hit.snippet.replace(/`/g, "'") + "`");
    }
    if (r.referenceCount > 2) lines.push("  - ... (+" + (r.referenceCount - 2) + " more in JSON artifact)");
  }
  if (result.referenced_elsewhere.length > 25) lines.push("- ... (+" + (result.referenced_elsewhere.length - 25) + " more in JSON artifact)");
  lines.push("");
  lines.push("## Next step");
  lines.push("");
  lines.push("`U-OBF-F4-ARCHIVE` (queued, operator-gated):");
  lines.push("");
  lines.push("1. Create archive directory `.claude/hooks/_archive/2026-05-18-unwired-orphans/`");
  lines.push("2. Iterate the `safe_to_archive` list and emit a git-mv command per entry, source `.claude/hooks/<name>.mjs` to the archive directory. Per [[feedback_never_delete_only_disable]]: move, never delete; git mv preserves history.");
  lines.push("3. Verify Grep and Glob no longer surface the archived names.");
  lines.push("4. Commit with subject `[SCOPE]/U-OBF-F4-ARCHIVE: archive N unwired-on-disk hooks (zero external refs)`");
  lines.push("");
  lines.push("Advisory only. Per-hook operator review still recommended for any name that overlaps with a planned-but-not-yet-built milestone.");
  lines.push("");
  return lines.join("\n");
}

function main(argv) {
  const args = argv.slice(2);
  let auditPath = DEFAULT_AUDIT;
  let emitJson = false;
  let emitArtifacts = false;
  let topN = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") emitJson = true;
    else if (args[i] === "--emit") emitArtifacts = true;
    else if (args[i] === "--audit") auditPath = args[++i];
    else if (args[i] === "--top-n") topN = parseInt(args[++i], 10);
  }
  if (!existsSync(auditPath)) {
    process.stderr.write("ERROR: audit JSON not found: " + auditPath + "\n");
    process.exit(2);
  }
  let auditJson;
  try {
    auditJson = JSON.parse(readFileSync(auditPath, "utf8"));
  } catch (e) {
    process.stderr.write("ERROR: cannot parse audit JSON: " + e.message + "\n");
    process.exit(2);
  }
  const unwiredList = Array.isArray(auditJson.unwiredOnDisk) ? auditJson.unwiredOnDisk : [];
  if (unwiredList.length === 0) {
    process.stderr.write("ERROR: audit JSON has no unwiredOnDisk array.\n");
    process.exit(2);
  }
  if (typeof topN === "number" && topN > 0 && topN < unwiredList.length) {
    unwiredList.length = topN;
  }
  const corpus = buildCorpus();
  const selfFileMap = buildSelfFileMap();
  const result = categorizeForArchive({ unwiredList, corpus, selfFileMap });
  const audit = { path: auditPath, generatedAt: auditJson.generatedAt, ledgerWindowHours: auditJson.ledgerWindowHours };
  const output = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "hook-archive-crossref.mjs U-OBF-F4-ARCHIVE-CROSSREF",
    audit,
    corpusSize: corpus.length,
    ...result,
  };
  if (emitArtifacts) {
    const specDir = resolve(REPO_ROOT, "state/shared/specs");
    const jsonPath = resolve(specDir, "U-OBF-F4-ARCHIVE-CROSSREF-2026-05-18.json");
    const mdPath = resolve(specDir, "U-OBF-F4-ARCHIVE-CROSSREF-2026-05-18.md");
    atomicWriteJson(jsonPath, output);
    atomicWriteText(mdPath, renderMarkdown(result, audit));
    process.stderr.write("EMITTED: " + jsonPath + "\nEMITTED: " + mdPath + "\n");
  }
  if (emitJson) {
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  } else {
    process.stdout.write("U-OBF-F4-ARCHIVE-CROSSREF\n");
    process.stdout.write("  audit:     " + auditPath + "\n");
    process.stdout.write("  corpus:    " + corpus.length + " files scanned\n");
    process.stdout.write("  input:     " + result.counts.total + " unwired-on-disk hooks\n");
    process.stdout.write("  safe:      " + result.counts.safeToArchive + "\n");
    process.stdout.write("  refd:      " + result.counts.referencedElsewhere + "\n");
    process.stdout.write("  risk hist: " + JSON.stringify(result.riskHistogram) + "\n");
  }
  process.exit(0);
}

const isMain = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main(process.argv);
