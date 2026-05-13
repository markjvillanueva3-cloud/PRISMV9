#!/usr/bin/env node
/**
 * audit-close-out-candidates.mjs
 *
 * Cross-envelope close-out auditor. Detects units whose status is still
 * "pending" in `mcp-server/data/milestones/*.json` BUT whose declared
 * deliverable artifacts already exist on disk — i.e. silent close-out
 * debt.
 *
 * Output:
 *   - state/shared/CLOSE-OUT-CANDIDATES.json (machine)
 *   - state/shared/CLOSE-OUT-CANDIDATES.md   (human)
 *
 * Confidence scoring (per unit):
 *   - 1.0  = every deliverable string maps to a real file/path we found
 *   - 0.5+ = at least one deliverable found, others ambiguous
 *   - 0.0  = no deliverable found (don't surface — not a candidate)
 *
 * Surfaced units are CANDIDATES only — never auto-flipped. A human (or
 * another chat) reviews each, verifies the artifact really satisfies the
 * spec, and runs the close-out flow manually (envelope edit + regen +
 * commit + 3-of-3 scrutiny).
 *
 * Why not auto-flip? False close-outs are worse than missed ones — they
 * mark dead work as alive and pollute MILESTONE_PROGRESS / BUILD_STATE.
 *
 * Usage:
 *   node scripts/audit-close-out-candidates.mjs             # write reports
 *   node scripts/audit-close-out-candidates.mjs --json      # stdout JSON only
 *   node scripts/audit-close-out-candidates.mjs --milestone COORD-MS0
 *   node scripts/audit-close-out-candidates.mjs --min-confidence 0.75
 *
 * Exit code: 0 always (advisory, never gate).
 */

import * as fs from "fs";
import * as path from "path";

const REPO = "H:/prism";
const MILESTONES_DIR = path.join(REPO, "mcp-server/data/milestones");
const OUT_JSON = path.join(REPO, "state/shared/CLOSE-OUT-CANDIDATES.json");
const OUT_MD = path.join(REPO, "state/shared/CLOSE-OUT-CANDIDATES.md");

const PENDING_STATUSES = new Set([
  "pending", "in_progress", "in-progress", "deferred", "blocked", "planned",
  "wip", "active",
]);
const COMPLETE_STATUSES = new Set([
  "complete", "completed", "shipped", "done", "merged", "landed", "closed",
]);

// Extra roots to search for deliverable artifacts. Bare filenames are scanned
// against each root with a bounded recursive walk (depth 2) so engines under
// `src/engines/<subdir>/Foo.ts` are still resolvable.
const SEARCH_ROOTS = [
  REPO,
  path.join(REPO, "mcp-server/src"),
  path.join(REPO, "mcp-server/src/engines"),
  path.join(REPO, "mcp-server/src/tools"),
  path.join(REPO, "mcp-server/src/tools/dispatchers"),
  path.join(REPO, "mcp-server/src/algorithms"),
  path.join(REPO, "mcp-server/src/schemas"),
  path.join(REPO, "mcp-server/src/registries"),
  path.join(REPO, "mcp-server/src/routes"),
  path.join(REPO, "mcp-server/src/hooks"),
  path.join(REPO, "mcp-server/src/migrations"),
  path.join(REPO, "mcp-server/src/__tests__"),
  path.join(REPO, "mcp-server/data"),
  path.join(REPO, "mcp-server/data/state"),
  path.join(REPO, "mcp-server/data/docs"),
  path.join(REPO, "scripts"),
  path.join(REPO, ".claude/hooks"),
  path.join(REPO, ".claude/commands"),
  path.join(REPO, ".claude/helpers"),
  path.join(REPO, "state/shared"),
  path.join(REPO, "knowledge"),
  path.join(REPO, "knowledge/wiki"),
  path.join(REPO, "knowledge/wiki/architecture"),
  "H:/.claude/commands",
  "H:/.claude/hooks",
  "H:/.claude/helpers",
];

const MAX_SEARCH_DEPTH = 2;

// Phrases that suggest a deliverable is conceptual/code-shaped rather than a
// literal filename. We still try to find file tokens too; the hybrid case
// (file + abstract intent in same string) is downgraded to 0.5 credit.
const ABSTRACT_DELIVERABLE_PATTERNS = [
  /\bschema\b/i,
  /\bfunction\b/i,
  /\bintegration\b/i,
  /\bvalidation\b/i,
  /\btests?\b/i,
  /\bAPI\b/,
  /\bcompatibility\b/i,
  /\bdetection\b/i,
  /\bcleanup\b/i,
  /\blogging\b/i,
  /^Update\b/i,
  /\bfallback\b/i,
  /\bhint\b/i,
  /\badd tests\b/i,
  /\bunit tests\b/i,
];

function parseArgs(argv) {
  const args = { milestone: null, minConfidence: 0.75, json: false, frozenTime: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--milestone") args.milestone = argv[++i];
    else if (a === "--min-confidence") {
      const raw = parseFloat(argv[++i]);
      if (Number.isFinite(raw) && raw >= 0 && raw <= 1) args.minConfidence = raw;
    } else if (a === "--frozen-time") args.frozenTime = argv[++i];
  }
  // Env-var override for diff-friendly automation runs.
  if (!args.frozenTime && process.env.PRISM_AUDIT_FROZEN_TIME) {
    args.frozenTime = process.env.PRISM_AUDIT_FROZEN_TIME;
  }
  return args;
}

function listMilestoneFiles() {
  if (!fs.existsSync(MILESTONES_DIR)) return [];
  return fs
    .readdirSync(MILESTONES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort() // deterministic order — readdirSync is filesystem-dependent on NTFS
    .map((f) => path.join(MILESTONES_DIR, f));
}

// Bounded recursive directory walk for bare-filename resolution. Returns a
// Map<basename, absolutePath> of every file under root within MAX_SEARCH_DEPTH.
// Cached per-root so the scan happens once per audit run.
const _walkCache = new Map();
function walkRootIndex(root) {
  if (_walkCache.has(root)) return _walkCache.get(root);
  const idx = new Map();
  function recurse(dir, depth) {
    if (depth > MAX_SEARCH_DEPTH) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isFile()) {
        // First-write wins (preserves SEARCH_ROOTS priority via outer caller)
        if (!idx.has(ent.name)) idx.set(ent.name, full.replace(/\\/g, "/"));
      } else if (ent.isDirectory()) {
        // Skip noise dirs
        if (ent.name === "node_modules" || ent.name === ".git" || ent.name.startsWith(".cache")) continue;
        recurse(full, depth + 1);
      }
    }
  }
  if (fs.existsSync(root)) recurse(root, 0);
  _walkCache.set(root, idx);
  return idx;
}

function loadEnvelope(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const j = JSON.parse(raw);
    return { ok: true, envelope: j, file: filePath };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), file: filePath };
  }
}

// Extract candidate file/path tokens from a deliverable string. Heuristics:
//   "H:/.claude/commands/sessions.md"   → exact absolute path
//   "src/engines/Foo.ts"                → relative path
//   "FooEngine.ts" / "foo.mjs"          → bare filename (scanned across roots)
//   "verifyChecksum() function"         → abstract (no token)
// Tokens are deduped by lowercase value so the same path matched by two
// regexes doesn't double-count.
function extractPathTokens(deliverable) {
  const tokens = [];
  const seen = new Set();
  function push(kind, token) {
    const k = token.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    tokens.push({ kind, token });
  }
  let m;
  // 1) absolute or repo-rooted path: H:/... or /...
  const absRe = /(?:^|\s|`)((?:[A-Za-z]:)?[/\\][\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|md|json|jsonl|yaml|yml|sh|ps1|py))/g;
  while ((m = absRe.exec(deliverable))) push("path", m[1]);
  // 2) relative path under common PRISM roots
  const relRe = /(?:^|\s|`)((?:src|scripts|data|state|knowledge|JM ?DIE|mcp-server|web|tests|docs|migrations|infra|ops|\.claude|\.github)[/\\][\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|md|json|jsonl|yaml|yml|sh|ps1|py))/gi;
  while ((m = relRe.exec(deliverable))) push("path", m[1]);
  // 3) PascalCase bare filename (engines, dispatchers, schemas)
  const bareRe = /\b([A-Z][A-Za-z0-9_]+\.(?:ts|tsx|js|mjs))\b/g;
  while ((m = bareRe.exec(deliverable))) push("filename", m[1]);
  // 4) lowercase hook/script bare filename
  const hookRe = /\b([a-z][a-z0-9-]+\.(?:mjs|js|cjs|ts))\b/g;
  while ((m = hookRe.exec(deliverable))) push("filename", m[1]);
  return tokens;
}

// Resolve a token to a real file. Returns first match or null.
function resolveToken(token, kind) {
  // Absolute path
  if (/^([A-Za-z]:)?[/\\]/.test(token)) {
    const norm = token.replace(/\\/g, "/");
    if (fs.existsSync(norm)) return norm;
    return null;
  }
  // Repo-relative
  const repoRel = path.join(REPO, token);
  if (fs.existsSync(repoRel)) return repoRel.replace(/\\/g, "/");
  if (kind !== "filename") return null;
  // Bare filename — scan SEARCH_ROOTS with bounded recursion
  for (const root of SEARCH_ROOTS) {
    // Fast path: direct child
    const direct = path.join(root, token);
    if (fs.existsSync(direct)) return direct.replace(/\\/g, "/");
    // Slow path: recursive index (cached per root)
    const idx = walkRootIndex(root);
    const hit = idx.get(token);
    if (hit) return hit;
  }
  return null;
}

// Strip resolved file substrings from the deliverable string and check the
// residual for abstract patterns. Returns true if the residual carries
// independent abstract intent (e.g. "Update foo.ts AND add tests").
function hasResidualAbstract(deliverable, resolvedTokens) {
  let residual = String(deliverable);
  for (const r of resolvedTokens) residual = residual.split(r.token).join(" ");
  // Also strip the bare filename if a path-shape was given
  return ABSTRACT_DELIVERABLE_PATTERNS.some((re) => re.test(residual));
}

function classifyDeliverable(d) {
  const tokens = extractPathTokens(d);
  if (tokens.length === 0) {
    const isAbstract = ABSTRACT_DELIVERABLE_PATTERNS.some((re) => re.test(d));
    return { kind: isAbstract ? "abstract" : "unparsed", tokens: [] };
  }
  const resolved = [];
  for (const t of tokens) {
    const p = resolveToken(t.token, t.kind);
    if (p) resolved.push({ token: t.token, path: p, kind: t.kind });
  }
  if (resolved.length === 0) return { kind: "unresolved", tokens };
  // Hybrid: file resolved but residual carries abstract intent → half-credit
  if (hasResidualAbstract(d, resolved)) {
    return { kind: "hybrid", tokens, resolved };
  }
  return { kind: "resolved", tokens, resolved };
}

function scoreUnit(unit) {
  const deliverables = Array.isArray(unit.deliverables) ? unit.deliverables : [];
  if (deliverables.length === 0) {
    return { confidence: 0, evidence: [], abstractOnly: false, total: 0, verifiable: 0, resolvedCount: 0, abstractCount: 0, hybridCount: 0 };
  }
  const evidence = [];
  let resolvedCredit = 0; // 1.0 for resolved, 0.5 for hybrid
  let resolvedCount = 0;
  let hybridCount = 0;
  let abstractCount = 0;
  for (const d of deliverables) {
    const c = classifyDeliverable(String(d));
    if (c.kind === "resolved") {
      resolvedCount++;
      resolvedCredit += 1;
      evidence.push({ deliverable: d, kind: "resolved", resolved: c.resolved.map((r) => r.path) });
    } else if (c.kind === "hybrid") {
      hybridCount++;
      resolvedCredit += 0.5;
      evidence.push({
        deliverable: d,
        kind: "hybrid",
        resolved: c.resolved.map((r) => r.path),
        note: "file resolves but residual implies additional abstract work",
      });
    } else if (c.kind === "abstract") {
      abstractCount++;
      evidence.push({ deliverable: d, kind: "abstract" });
    } else {
      evidence.push({ deliverable: d, kind: "missing" });
    }
  }
  const total = deliverables.length;
  // Abstract deliverables are excluded from confidence denominator (not
  // auto-verifiable). Hybrid contributes half-credit.
  const verifiable = total - abstractCount;
  const confidence = verifiable === 0 ? 0 : resolvedCredit / verifiable;
  return {
    confidence,
    evidence,
    abstractOnly: abstractCount === total,
    resolvedCount,
    hybridCount,
    abstractCount,
    verifiable,
    total,
  };
}

function toRepoRelative(p) {
  const norm = String(p).replace(/\\/g, "/");
  const root = REPO.replace(/\\/g, "/");
  if (norm.toLowerCase().startsWith(root.toLowerCase() + "/")) {
    return norm.slice(root.length + 1);
  }
  return norm;
}

function auditMilestone(filePath, opts) {
  const loaded = loadEnvelope(filePath);
  if (!loaded.ok) return { file: toRepoRelative(filePath), error: loaded.error, candidates: [], parseError: true };
  const env = loaded.envelope;
  const msId = env.id || path.basename(filePath, ".json");
  if (opts.milestone && msId !== opts.milestone) return null;
  const units = Array.isArray(env.units) ? env.units : [];
  const candidates = [];
  for (const unit of units) {
    const status = String(unit.status || "pending").toLowerCase();
    if (COMPLETE_STATUSES.has(status)) continue;
    // Only surface units in an explicit pending state (avoid surfacing units
    // with unknown/typo'd statuses we shouldn't second-guess).
    if (!PENDING_STATUSES.has(status)) continue;
    const score = scoreUnit(unit);
    if (score.confidence >= opts.minConfidence) {
      candidates.push({
        unit_id: unit.id || unit.unit_id || "?",
        title: unit.title || "",
        status,
        confidence: Number(score.confidence.toFixed(3)),
        resolvedCount: score.resolvedCount,
        hybridCount: score.hybridCount,
        verifiable: score.verifiable,
        abstractCount: score.abstractCount,
        total: score.total,
        evidence: score.evidence,
      });
    }
  }
  return {
    milestone: msId,
    title: env.title || "",
    file: toRepoRelative(filePath),
    candidates,
  };
}

const ADVISORY_CAVEAT = "Advisory only — file presence ≠ spec correctness. Every candidate MUST be human-verified before flipping the envelope. False close-outs corrupt MILESTONE_PROGRESS and BUILD_STATE.";

function renderMd(results, opts, generatedAt) {
  const lines = [];
  lines.push("# CLOSE-OUT-CANDIDATES — units that look shipped but envelope says pending");
  lines.push("");
  lines.push(`> Generated: ${generatedAt}`);
  lines.push(`> Source: \`scripts/audit-close-out-candidates.mjs\``);
  lines.push(`> Filter: min-confidence ≥ ${opts.minConfidence}${opts.milestone ? `, milestone=${opts.milestone}` : ""}`);
  lines.push("");
  lines.push(`**Rule:** ${ADVISORY_CAVEAT}`);
  lines.push("");
  const scannedOk = results.filter((r) => r && !r.parseError);
  const withCandidates = results.filter((r) => r && r.candidates && r.candidates.length > 0);
  const totalCands = withCandidates.reduce((s, r) => s + r.candidates.length, 0);
  const parseErrors = results.filter((r) => r && r.parseError);
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Milestones scanned: ${scannedOk.length}`);
  lines.push(`- Parse errors (skipped): ${parseErrors.length}`);
  lines.push(`- Milestones with candidates: ${withCandidates.length}`);
  lines.push(`- Total candidate units: ${totalCands}`);
  lines.push("");
  if (withCandidates.length === 0) {
    lines.push("_No close-out candidates above the confidence floor._");
    return lines.join("\n");
  }
  lines.push("## Candidates");
  lines.push("");
  for (const r of withCandidates) {
    lines.push(`### ${r.milestone} — ${r.title}`);
    lines.push("");
    lines.push("| Unit | Title | Confidence | Resolved / Hybrid / Verifiable / Total |");
    lines.push("|------|-------|------------|----------------------------------------|");
    for (const c of r.candidates) {
      const title = (c.title || "").replace(/\|/g, "\\|").slice(0, 60);
      lines.push(`| ${c.unit_id} | ${title} | ${c.confidence.toFixed(2)} | ${c.resolvedCount} / ${c.hybridCount} / ${c.verifiable} / ${c.total} |`);
    }
    lines.push("");
    for (const c of r.candidates) {
      lines.push(`<details><summary>${c.unit_id} evidence</summary>`);
      lines.push("");
      for (const e of c.evidence) {
        if (e.kind === "resolved") {
          lines.push(`- ✅ \`${e.deliverable}\` → ${e.resolved.map((p) => "`" + p + "`").join(", ")}`);
        } else if (e.kind === "hybrid") {
          lines.push(`- ⚠ \`${e.deliverable}\` → ${e.resolved.map((p) => "`" + p + "`").join(", ")} _(hybrid — residual abstract intent: ${e.note})_`);
        } else if (e.kind === "abstract") {
          lines.push(`- ◌ \`${e.deliverable}\` _(abstract — not auto-verifiable)_`);
        } else {
          lines.push(`- ❌ \`${e.deliverable}\` _(missing)_`);
        }
      }
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
  }
  lines.push("## Close-out recipe (per unit)");
  lines.push("");
  lines.push("1. Manually verify each ✅ resolved path actually satisfies the spec intent");
  lines.push("   (file existence ≠ correctness — read the file)");
  lines.push("2. Edit `mcp-server/data/milestones/<MS>.json` — set unit `status: \"complete\"`");
  lines.push("   with `completed_at`, `completed_by`, and `ship_notes` listing verifications");
  lines.push("3. Regen surfaces: `node scripts/build-milestone-progress.mjs && node scripts/build-state-snapshot.mjs`");
  lines.push("4. Post chat-bus + commit with `[MS]/U-XXXn: close out ...` message");
  lines.push("5. Run 3-of-3 scrutiny via `.claude/scripts/scrutiny-3way.mjs`");
  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv);
  const generatedAt = opts.frozenTime || new Date().toISOString();
  const files = listMilestoneFiles();
  const results = files.map((f) => auditMilestone(f, opts)).filter(Boolean);
  const baseOutput = {
    schemaVersion: "1.0.0",
    generatedAt,
    advisoryOnly: true,
    mustHumanVerify: true,
    caveat: ADVISORY_CAVEAT,
    opts,
    results,
  };
  if (opts.json) {
    process.stdout.write(JSON.stringify(baseOutput, null, 2));
    return;
  }
  const md = renderMd(results, opts, generatedAt);
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(baseOutput, null, 2));
  fs.writeFileSync(OUT_MD, md);
  const withCandidates = results.filter((r) => r.candidates && r.candidates.length > 0);
  const total = withCandidates.reduce((s, r) => s + r.candidates.length, 0);
  process.stdout.write(`[close-out-audit] scanned ${results.length} milestones · ${withCandidates.length} have candidates · ${total} total candidate units\n`);
  process.stdout.write(`[close-out-audit] wrote ${OUT_JSON}\n`);
  process.stdout.write(`[close-out-audit] wrote ${OUT_MD}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`[close-out-audit] FATAL: ${err && err.stack ? err.stack : String(err)}\n`);
  // Advisory tool — never block; exit 0.
  process.exit(0);
}
