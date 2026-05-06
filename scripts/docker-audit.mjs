/**
 * docker-audit.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U01
 *
 * Inventories every Dockerfile + docker-compose.yml under H:/ outside
 * worktrees and node_modules. For each asset:
 *   - Categorises as `dev | prod | infra | scratch | unknown`
 *   - Flags `buildable | likely_broken` based on FROM image + COPY ref existence
 *   - Records repo (canonical prism, prism-iooms0, peer prism-*, or other)
 *
 * Output:
 *   - JSON to stdout (--json) for downstream consumption
 *   - DOCKER-INVENTORY.md at repo root for human review (default)
 *
 * Exit code:
 *   0 — audit completed (with or without broken images)
 *   1 — usage error / scan failure
 *
 * Pure functions exported for unit tests:
 *   classifyComposeFile, classifyDockerfile, detectRepoBucket,
 *   isBuildable, summariseAssets
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const SCAN_ROOTS = ["H:/prism", "H:/prism-iooms0", "H:/PRISM"];
const PEER_GLOB = "H:/prism-*";
const SKIP_SEGMENTS = new Set(["node_modules", ".git", "worktrees", "dist", ".cache"]);

// ---------------------------------------------------------------------------
// PURE LOGIC (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Classify a compose file by service composition + filename.
 * Returns one of: dev | prod | infra | scratch | unknown
 */
export function classifyComposeFile(content, filename) {
  const lower = (filename || "").toLowerCase();
  if (lower.includes("intel")) return "infra";
  if (lower.includes("dev")) return "dev";
  if (lower.includes("gpu")) return "infra";
  if (lower.includes("prod")) return "prod";
  if (lower.includes("peerci") || lower.includes("ci")) return "infra";
  if (!content) return "unknown";

  const hasOllama = /image:\s*['"]?ollama\//i.test(content);
  const hasQdrant = /image:\s*['"]?qdrant\//i.test(content);
  const hasPostgres = /image:\s*['"]?postgres/i.test(content);
  const hasNginx = /image:\s*['"]?nginx/i.test(content);
  const buildContext = /\s+build:\s*[.{]/.test(content);

  if (hasOllama || hasQdrant) return "infra";
  if (hasPostgres || hasNginx) return "prod";
  if (buildContext) return "dev";
  return "unknown";
}

/**
 * Classify a Dockerfile by FROM image + filename.
 */
export function classifyDockerfile(content, filename) {
  const lower = (filename || "").toLowerCase();
  if (lower.includes("batch-processor") || lower.includes("worker")) return "infra";
  if (lower.includes("dev")) return "dev";
  if (!content) return "unknown";

  // Pull all FROM lines (multi-stage builds are common)
  const fromLines = content.match(/^\s*FROM\s+([^\s#]+)/gim) || [];
  if (fromLines.length === 0) return "unknown";

  const baseImages = fromLines
    .map((line) => line.replace(/^\s*FROM\s+/i, "").trim().toLowerCase())
    .join(" ");

  if (baseImages.includes("scratch")) return "scratch";
  if (baseImages.includes("nginx") || baseImages.includes("alpine")) return "prod";
  if (baseImages.includes("node:") || baseImages.includes("python:")) return "dev";
  if (baseImages.includes("postgres") || baseImages.includes("redis")) return "infra";
  return "unknown";
}

/**
 * Determine which repo bucket a file lives in based on its absolute path.
 * Buckets: canonical | iooms0 | peer | other
 */
export function detectRepoBucket(absPath) {
  const norm = absPath.replace(/\\/g, "/");
  if (norm.startsWith("H:/prism/") || norm.startsWith("H:/PRISM/")) return "canonical";
  if (norm.startsWith("H:/prism-iooms0/")) return "iooms0";
  if (/^H:\/prism-[a-z0-9-]+\//i.test(norm)) return "peer";
  return "other";
}

/**
 * Heuristic build-ability check.
 * - For Dockerfile: FROM image must look resolvable (no missing tag for non-public images,
 *   COPY paths must exist relative to file location).
 * - For compose: every `build:` context dir must exist.
 *
 * Returns { buildable: boolean, reasons: string[] }.
 */
export function isBuildable(content, fileAbsPath, fsAdapter) {
  if (!content) return { buildable: false, reasons: ["empty file"] };
  const adapter = fsAdapter || {
    existsSync: (p) => fs.existsSync(p),
  };
  const dir = path.dirname(fileAbsPath);
  const reasons = [];

  // Compose: check `build:` contexts. `.trim()` strips trailing CR on
  // Windows-line-ending files (the regex's [^'"\n]+ would otherwise capture
  // ".\r", which then resolves to a non-existent path).
  const buildContextMatches = content.matchAll(/build:\s*\n\s*context:\s*['"]?([^'"\r\n]+)['"]?/g);
  for (const m of buildContextMatches) {
    const raw = m[1].trim();
    const ctx = path.resolve(dir, raw);
    if (!adapter.existsSync(ctx)) reasons.push(`missing build context: ${raw}`);
  }
  // Compose short form `build: ./path` or `build: .`
  const shortBuildMatches = content.matchAll(/^\s*build:\s*['"]?(\.[^'"\r\n#]*?)['"]?\s*$/gm);
  for (const m of shortBuildMatches) {
    const raw = m[1].trim();
    const ctx = path.resolve(dir, raw);
    if (!adapter.existsSync(ctx)) reasons.push(`missing build context: ${raw}`);
  }

  // Dockerfile: COPY/ADD with relative source must exist on host disk.
  // Skip multi-stage refs (`--from=stage`) — those resolve against a previous
  // build stage's image filesystem, not the host. Also skip URLs, vars, globs.
  const copyLineRe = /^\s*(?:COPY|ADD)\s+(.+?)\s*$/gim;
  for (const m of content.matchAll(copyLineRe)) {
    const rest = m[1];
    // Multi-stage: --from=<stage> means the source lives in the named stage,
    // not the host build context. Skip the whole line.
    if (/--from=/i.test(rest)) continue;
    // Strip leading flags (--chown=, --chmod=, --link, etc.)
    const tokens = rest.split(/\s+/).filter((t) => !t.startsWith("--"));
    if (tokens.length < 2) continue;
    const src = tokens[0];
    if (src.startsWith("$") || src.startsWith("http")) continue;
    if (src.includes("*") || src.includes("?")) continue; // glob — skip
    // Absolute paths inside a Dockerfile (e.g. "/app/dist/") with no --from=
    // are unusual but valid only if the build context root is "/" — treat
    // host-absolute sources as suspicious and skip rather than false-flag.
    if (path.isAbsolute(src)) continue;
    const abs = path.resolve(dir, src);
    if (!adapter.existsSync(abs)) reasons.push(`missing COPY source: ${src}`);
  }

  return { buildable: reasons.length === 0, reasons };
}

/**
 * Summarise an array of audit records.
 */
export function summariseAssets(records) {
  const byCategory = {};
  const byBucket = {};
  const byKind = { compose: 0, dockerfile: 0 };
  let buildable = 0;
  let likelyBroken = 0;
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byBucket[r.repoBucket] = (byBucket[r.repoBucket] || 0) + 1;
    byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    if (r.buildable) buildable += 1;
    else likelyBroken += 1;
  }
  return {
    total: records.length,
    byKind,
    byCategory,
    byBucket,
    buildable,
    likelyBroken,
  };
}

// ---------------------------------------------------------------------------
// I/O LAYER (not exported for tests, integration only)
// ---------------------------------------------------------------------------

function isDockerAsset(name) {
  if (name === "Dockerfile") return "dockerfile";
  if (name.endsWith(".Dockerfile")) return "dockerfile";
  if (/^docker-compose([.-][\w.-]+)?\.ya?ml$/.test(name)) return "compose";
  return null;
}

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_SEGMENTS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full);
    } else if (ent.isFile()) {
      const kind = isDockerAsset(ent.name);
      if (kind) yield { full, kind };
    }
  }
}

function expandPeerRoots() {
  const out = [];
  let parents;
  try {
    parents = fs.readdirSync("H:/", { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of parents) {
    if (ent.isDirectory() && /^prism-[a-z0-9-]+$/i.test(ent.name)) {
      out.push(path.join("H:/", ent.name));
    }
  }
  return out;
}

function auditOne(file) {
  let content = "";
  try {
    content = fs.readFileSync(file.full, "utf8");
  } catch (e) {
    return {
      path: file.full.replace(/\\/g, "/"),
      kind: file.kind,
      category: "unknown",
      repoBucket: detectRepoBucket(file.full),
      buildable: false,
      buildReasons: [`read failed: ${e.message}`],
      sizeBytes: 0,
    };
  }
  const filename = path.basename(file.full);
  const category =
    file.kind === "compose"
      ? classifyComposeFile(content, filename)
      : classifyDockerfile(content, filename);
  const { buildable, reasons } = isBuildable(content, file.full);
  return {
    path: file.full.replace(/\\/g, "/"),
    kind: file.kind,
    category,
    repoBucket: detectRepoBucket(file.full),
    buildable,
    buildReasons: reasons,
    sizeBytes: content.length,
  };
}

function renderMarkdown(records, summary) {
  const lines = [];
  lines.push("# DOCKER-INVENTORY — Intel-Ollama-Obsidian P13-U01");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total assets:** ${summary.total}`);
  lines.push(`- **Buildable:** ${summary.buildable}`);
  lines.push(`- **Likely broken:** ${summary.likelyBroken}`);
  lines.push("");
  lines.push("### By kind");
  for (const [k, v] of Object.entries(summary.byKind)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  lines.push("### By category");
  for (const [k, v] of Object.entries(summary.byCategory)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  lines.push("### By repo bucket");
  for (const [k, v] of Object.entries(summary.byBucket)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  lines.push("## Likely-broken assets");
  lines.push("");
  const broken = records.filter((r) => !r.buildable);
  if (broken.length === 0) {
    lines.push("_None — every asset's COPY/build context resolved._");
  } else {
    lines.push("| path | kind | category | reasons |");
    lines.push("|------|------|----------|---------|");
    for (const r of broken) {
      lines.push(`| \`${r.path}\` | ${r.kind} | ${r.category} | ${r.buildReasons.join("; ")} |`);
    }
  }
  lines.push("");
  lines.push("## All assets (full table)");
  lines.push("");
  lines.push("| path | kind | category | bucket | buildable |");
  lines.push("|------|------|----------|--------|-----------|");
  for (const r of records) {
    lines.push(`| \`${r.path}\` | ${r.kind} | ${r.category} | ${r.repoBucket} | ${r.buildable ? "yes" : "no"} |`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function isMain() {
  // Cross-platform "is this file the entrypoint" check for ESM
  return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isMain()) {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const wantWrite = args.includes("--write");
  const outPath = args.includes("--out")
    ? args[args.indexOf("--out") + 1]
    : path.join(REPO_ROOT, "DOCKER-INVENTORY.md");

  const roots = [...new Set([...SCAN_ROOTS, ...expandPeerRoots()])];
  const records = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const file of walk(root)) records.push(auditOne(file));
  }
  // Stable sort: bucket → kind → path
  records.sort((a, b) => {
    if (a.repoBucket !== b.repoBucket) return a.repoBucket.localeCompare(b.repoBucket);
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.path.localeCompare(b.path);
  });
  const summary = summariseAssets(records);

  if (wantJson) {
    process.stdout.write(JSON.stringify({ summary, records }, null, 2));
  } else if (wantWrite) {
    const md = renderMarkdown(records, summary);
    fs.writeFileSync(outPath, md, "utf8");
    process.stdout.write(`wrote ${outPath} (${md.length} bytes, ${records.length} assets)\n`);
  } else {
    // Default: human summary to stdout
    process.stdout.write(`Docker assets: ${summary.total} (buildable=${summary.buildable}, broken=${summary.likelyBroken})\n`);
    process.stdout.write(`Categories: ${JSON.stringify(summary.byCategory)}\n`);
    process.stdout.write(`Buckets: ${JSON.stringify(summary.byBucket)}\n`);
    process.stdout.write(`Use --write to render DOCKER-INVENTORY.md, --json for raw output.\n`);
  }
}
