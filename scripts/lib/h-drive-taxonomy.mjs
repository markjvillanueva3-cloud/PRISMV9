/**
 * h-drive-taxonomy.mjs -- pure SSOT classifier for the H-drive -> Obsidian vault
 * categorization layer (H-DRIVE-VAULT-SYNERGY, slot:papa).
 *
 * Maps ANY filesystem path to a single category + galaxy + purpose + fileClass,
 * and classifies H: top-level directories into a domain CLASS (canonical-repo /
 * worktree-clone / knowledge-asset / infra-tool / skip-junk). No fs access, no
 * side effects -- this is the rule SSOT consumed by scripts/h-drive-to-vault.mjs
 * and exercised directly by the test oracle.
 *
 * Design: ordered rule lists, FIRST MATCH WINS. Skip rules run first so junk can
 * never be miscategorized as content. Path matching is done on a normalized
 * (forward-slash, lower-cased) copy; the original string is never mutated.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY  @unit U-1  slot:papa
 */

/** Directory/segment names that must NEVER be walked or vaulted (junk/transient/vendor). */
export const SKIP_SEGMENTS = new Set([
  "node_modules", ".git", ".hg", ".svn", "__pycache__", ".pytest_cache",
  ".cache", ".hf-cache", ".uv-cache", ".uv-python", ".serena",
  ".venv", ".venv2", ".venv-wedm-lora", "venv", "env",
  "dist", "build", "_build", "_BUILD", "out", "coverage", ".turbo", ".next",
  ".tmp", "tmp", "temp", "codextmp", "$recycle.bin", "system volume information",
  "found.000", "found.001", "found.002", "found.003", "found.004",
  "bios", "dockerdata", "blobs", ".statsig", "shell-snapshots", ".ide",
]);

/** Substring/suffix patterns (matched against a lower-cased top-level dir name) that mark junk. */
export const SKIP_PATTERNS = [
  /^found\.\d+$/,            // chkdsk recovery
  /^\$/,                     // $RECYCLE.BIN, $SysReset
  /^%.*%$/,                  // %SystemDrive%
  /-backup-\d+/,             // *-backup-YYYYMMDD
  /recovery-backup/,
  /\.bak-/,
  /^\.cache$/,
  /cache$/,                  // *-cache, .hf-cache (covered) etc.
];

/** Extensions that make an individual file worth a per-FILE knowledge note. */
export const KNOWLEDGE_EXTS = new Set([
  ".md", ".pdf", ".txt", ".rst", ".doc", ".docx",
  ".stp", ".step", ".igs", ".iges", ".dxf", ".dwg", ".sldprt", ".sldasm",
  ".nc", ".cps", ".tap", ".eia", ".mpf", ".h", ".ptp",
]);

/** Extensions treated as manufacturing/CAD/CAM assets (binary geometry/programs). */
export const MFG_ASSET_EXTS = new Set([
  ".stp", ".step", ".igs", ".iges", ".dxf", ".dwg", ".sldprt", ".sldasm",
  ".x_t", ".x_b", ".prt", ".catpart", ".3dm", ".stl", ".obj",
  ".nc", ".cps", ".tap", ".eia", ".mpf", ".ptp", ".min", ".pim",
]);

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go"]);
const DATA_EXTS = new Set([".json", ".jsonl", ".csv", ".tsv", ".ndjson", ".parquet"]);
const DOC_EXTS = new Set([".md", ".rst", ".txt", ".pdf", ".html", ".adoc"]);
const CONFIG_EXTS = new Set([".yml", ".yaml", ".toml", ".ini", ".env", ".lock"]);

/** Known PRISM galaxy slugs (from mcp-server/src/engines/<galaxy>/). */
const GALAXY_KEYWORDS = [
  "mill", "lathe", "wedm", "cam", "cad", "speed-feed", "post-processor",
  "quoting", "business", "academy", "frontend-app", "blueprint-vision",
  "ai-training", "system-viz", "fleet-hygiene", "discovery", "backend-helper",
  "agent-orchestration", "wiring", "bug-hunting", "dormant-data",
  "compliance-safety", "quality", "shop-floor", "knowledge-conversion",
  "corpus-aggregation", "mit-curriculum", "pdf-corpus", "tribal-knowledge",
  "cad-fusion-live", "token-optimization", "hermes-zulu", "database-expansion",
];

/** Normalize a path for matching: forward slashes, lower case, no trailing slash. */
export function normPath(p) {
  if (typeof p !== "string") return "";
  let s = p.replace(/\\/g, "/").toLowerCase();
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

/** Lower-cased extension including the dot, or "" if none. */
export function extOf(p) {
  const s = normPath(p);
  const base = s.slice(s.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

/**
 * Classify an H: TOP-LEVEL directory name into a domain class.
 * @param {string} name bare dir name (e.g. "prism", "prism-slot-papa", ".cache")
 * @returns {{class: string, skip: boolean, dedupeTo?: string}}
 */
export function classifyTopLevel(name) {
  const n = String(name || "").trim();
  const low = n.toLowerCase();
  if (!n) return { class: "skip-junk", skip: true };

  if (SKIP_SEGMENTS.has(low) || SKIP_PATTERNS.some((re) => re.test(low))) {
    return { class: "skip-junk", skip: true };
  }
  // Canonical repo exactly.
  if (low === "prism") return { class: "canonical-repo", skip: false };
  // Worktree clones / milestone clones: prism-<anything>. Dedupe to canonical.
  if (/^prism[-_.]/.test(low) || low.startsWith("prism--")) {
    return { class: "worktree-clone", skip: false, dedupeTo: "prism" };
  }
  // Knowledge assets at root (high value).
  if (/^(obsidian|knowledge|docustrata|jmd |jm |manifests|cad-engine)/.test(low)) {
    return { class: "knowledge-asset", skip: false };
  }
  // Infra / tooling.
  if (/^(\.tools|\.codex|\.claude|claude-plugins|hermes-install|launch|new-pc-setup|\.appdata|\.auto-memory|\.remote-plugins|\.playwright|mcp-)/.test(low)) {
    return { class: "infra-tool", skip: false };
  }
  // Default: treat unknown root dirs as infra-tool (still summarized, never silently dropped -- R12).
  return { class: "infra-tool", skip: false };
}

const CATEGORY_PURPOSE = {
  "galaxy-engine": "build",
  dispatcher: "build",
  schema: "build",
  physics: "build",
  hook: "infra",
  skill: "infra",
  script: "build",
  test: "build",
  frontend: "build",
  "knowledge-wiki": "knowledge",
  "knowledge-memory": "knowledge",
  "knowledge-corpus": "knowledge",
  "manufacturing-asset": "asset",
  "state-data": "runtime-state",
  "build-config": "config",
  doc: "doc",
  other: "other",
};

/** Resolve a galaxy slug from a path, or null. */
export function resolveGalaxy(normalized) {
  const m = normalized.match(/(?:^|\/)engines\/([a-z0-9-]+)\//);
  if (m && GALAXY_KEYWORDS.includes(m[1])) return m[1];
  for (const g of GALAXY_KEYWORDS) {
    // word-ish boundary so "cam" doesn't match "camera"; allow path-segment or dash boundaries.
    const re = new RegExp(`(?:^|/|-)${g}(?:$|/|-|\\.)`);
    if (re.test(normalized)) return g;
  }
  return null;
}

function fileClassOf(ext, category) {
  if (category === "test") return "test";
  if (SOURCE_EXTS.has(ext)) return "source";
  if (DATA_EXTS.has(ext)) return "data";
  if (DOC_EXTS.has(ext)) return "doc";
  if (CONFIG_EXTS.has(ext)) return "config";
  if (MFG_ASSET_EXTS.has(ext)) return "binary";
  return "binary";
}

/**
 * Classify any path (relative to a walk root, or absolute) into a category.
 * FIRST MATCH WINS; skip rules run first.
 * @param {string} p
 * @returns {{category: string, galaxy: string|null, purpose: string, fileClass: string, skip: boolean}}
 */
export function classifyPath(p) {
  const s = normPath(p);
  const ext = extOf(s);
  const galaxy = resolveGalaxy(s);

  const out = (category) => ({
    category,
    galaxy,
    purpose: CATEGORY_PURPOSE[category] || "other",
    fileClass: fileClassOf(ext, category),
    skip: false,
  });

  // 1. Skip: any path segment in the skip set.
  const segs = s.split("/");
  if (segs.some((seg) => SKIP_SEGMENTS.has(seg)) || /\.git\/objects/.test(s)) {
    return { category: "skip", galaxy: null, purpose: "skip", fileClass: "skip", skip: true };
  }

  // 2. Tests (regardless of location) -- before galaxy-engine, since engine tests live in __tests__.
  if (/(^|\/)__tests__\//.test(s) || /\.(test|spec)\.[a-z]+$/.test(s)) return out("test");

  // 3. PRISM-native structural categories (most specific first).
  if (/(^|\/)engines\/[a-z0-9-]+\//.test(s)) return out("galaxy-engine");
  if (/(^|\/)tools\/dispatchers\//.test(s)) return out("dispatcher");
  if (/(^|\/)src\/schemas\//.test(s) || /(^|\/)schemas\//.test(s)) return out("schema");
  if (/(^|\/)src\/physics\//.test(s) || /(^|\/)physics\//.test(s)) return out("physics");
  if (/(^|\/)\.claude\/hooks\//.test(s) || /(^|\/)hooks\//.test(s)) return out("hook");
  if (/(^|\/)\.claude\/commands\//.test(s) || /(^|\/)commands\//.test(s)) return out("skill");
  if (/(^|\/)mcp-server\/web\//.test(s) || /(^|\/)web\/(app|components|src)\//.test(s)) return out("frontend");
  if (/(^|\/)knowledge\/wiki\//.test(s)) return out("knowledge-wiki");
  if (/(^|\/)knowledge\/memories\//.test(s) || /(^|\/)memories\//.test(s)) return out("knowledge-memory");

  // 4. Knowledge corpus + manufacturing assets (raw asset trees, by location or ext).
  if (/(^|\/)(resources|jm die|docustrata|corpus|courses|mit-ocw)(\/|$)/.test(s)) return out("knowledge-corpus");
  if (MFG_ASSET_EXTS.has(ext)) return out("manufacturing-asset");

  // 5. State/data + build config.
  if (/(^|\/)mcp-server\/data\//.test(s) || /(^|\/)state\//.test(s) || /(^|\/)data\//.test(s)) return out("state-data");
  if (/(^|\/)scripts\//.test(s)) return out("script");
  if (/(^|\/)\.github\//.test(s) || /(package\.json|tsconfig.*\.json|.*\.config\.(js|ts|mjs|cjs|json))$/.test(s) || CONFIG_EXTS.has(ext)) {
    return out("build-config");
  }

  // 6. Docs (markdown outside wiki/memories).
  if (ext === ".md" || DOC_EXTS.has(ext)) return out("doc");

  // 7. Fallback.
  return out("other");
}

/** All category names this taxonomy can emit (for completeness assertions). */
export const ALL_CATEGORIES = [
  "galaxy-engine", "dispatcher", "schema", "physics", "hook", "skill",
  "script", "test", "frontend", "knowledge-wiki", "knowledge-memory",
  "knowledge-corpus", "manufacturing-asset", "state-data", "build-config",
  "doc", "other", "skip",
];

/** True if a file (by ext) deserves a per-FILE knowledge note (vs folder-only index). */
export function isKnowledgeFile(p) {
  return KNOWLEDGE_EXTS.has(extOf(p));
}
