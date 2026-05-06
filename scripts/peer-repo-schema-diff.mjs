/**
 * peer-repo-schema-diff.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U04
 *
 * Walks every H:/prism-* sibling repo, extracts each dispatcher's
 * z.enum() ACTIONS list, and reports drift versus the canonical
 * H:/prism dispatcher set. Output goes to PEER-REPO-DRIFT.md at this
 * worktree's repo root.
 *
 * Pure-function exports for tests:
 *   - extractActionsFromDispatcher(content) → string[]
 *   - listDispatchers(repoRoot, fsAdapter)  → { name, path }[]
 *   - diffActionSets(canonical, peer)       → { onlyInCanonical, onlyInPeer, common }
 *   - summarizeDrift(report)                → { reposScanned, totalDispatchers, totalDrift, byRepo }
 *   - renderMarkdown(report, summary)       → string (PEER-REPO-DRIFT.md content)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P13-U04
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_DEFAULT = path.resolve(HERE, "..");
const CANONICAL_ROOT_DEFAULT = "H:/prism";
const DISPATCHER_DIR_REL = "mcp-server/src/tools/dispatchers";

// ---------------------------------------------------------------------------
// PURE LOGIC
// ---------------------------------------------------------------------------

/**
 * Pull all action names from a dispatcher source string. Looks for both:
 *   - `const ACTIONS = ["a", "b"] as const;` (devDispatcher pattern)
 *   - `z.enum(["a", "b"])` (other dispatchers)
 * Returns deduplicated array.
 */
export function extractActionsFromDispatcher(content) {
  if (typeof content !== "string" || content.length === 0) return [];
  const actions = new Set();
  // Pattern 1: ACTIONS constant
  const actionsConstRe = /const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/;
  const m1 = content.match(actionsConstRe);
  if (m1) {
    const inner = m1[1];
    const stringRe = /["']([a-z][a-z0-9_]*)["']/gi;
    let m;
    while ((m = stringRe.exec(inner)) !== null) actions.add(m[1]);
  }
  // Pattern 2: z.enum(["...","..."]) — may span lines
  const zEnumRe = /z\.enum\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
  let zm;
  while ((zm = zEnumRe.exec(content)) !== null) {
    const inner = zm[1];
    const stringRe = /["']([a-z][a-z0-9_]*)["']/gi;
    let m;
    while ((m = stringRe.exec(inner)) !== null) actions.add(m[1]);
  }
  return [...actions].sort();
}

/**
 * Find every dispatcher .ts file under a repo root.
 */
export function listDispatchers(repoRoot, fsAdapter) {
  const adapter = fsAdapter || fs;
  const dir = path.join(repoRoot, DISPATCHER_DIR_REL);
  if (!adapter.existsSync(dir)) return [];
  const entries = adapter.readdirSync(dir);
  return entries
    .filter((n) => n.endsWith("Dispatcher.ts") || n === "calcDispatcher.ts")
    .map((n) => ({ name: n.replace(/\.ts$/, ""), path: path.join(dir, n) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Diff two action sets. Each input is a dispatcher's action list; the
 * output highlights what only canonical has, what only peer has, and
 * what's shared.
 */
export function diffActionSets(canonical, peer) {
  const cSet = new Set(canonical || []);
  const pSet = new Set(peer || []);
  const onlyInCanonical = [...cSet].filter((a) => !pSet.has(a)).sort();
  const onlyInPeer = [...pSet].filter((a) => !cSet.has(a)).sort();
  const common = [...cSet].filter((a) => pSet.has(a)).sort();
  return { onlyInCanonical, onlyInPeer, common };
}

/**
 * Aggregate a per-repo report into top-level summary numbers.
 */
export function summarizeDrift(report) {
  const byRepo = {};
  let totalDrift = 0;
  let totalDispatchers = 0;
  for (const r of report.repos) {
    const driftCount = r.dispatchers.reduce(
      (sum, d) => sum + d.diff.onlyInCanonical.length + d.diff.onlyInPeer.length,
      0,
    );
    byRepo[r.repo] = {
      dispatchers: r.dispatchers.length,
      drift: driftCount,
      missingFromPeer: r.dispatchers.reduce((s, d) => s + d.diff.onlyInCanonical.length, 0),
      extraInPeer: r.dispatchers.reduce((s, d) => s + d.diff.onlyInPeer.length, 0),
    };
    totalDrift += driftCount;
    totalDispatchers += r.dispatchers.length;
  }
  return {
    reposScanned: report.repos.length,
    totalDispatchers,
    totalDrift,
    byRepo,
  };
}

/**
 * Render the per-repo drift map as Markdown.
 */
export function renderMarkdown(report, summary) {
  const lines = [];
  lines.push("# PEER-REPO-DRIFT — Intel-Ollama-Obsidian P13-U04");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Repos scanned:** ${summary.reposScanned}`);
  lines.push(`- **Total dispatchers:** ${summary.totalDispatchers}`);
  lines.push(`- **Total drifted actions:** ${summary.totalDrift}`);
  lines.push("");
  lines.push(`Canonical: \`${report.canonicalRoot}\``);
  lines.push("");
  lines.push("## By repo");
  lines.push("");
  lines.push("| repo | dispatchers | missing-from-peer | extra-in-peer | drift total |");
  lines.push("|------|-------------|--------------------|---------------|-------------|");
  const sortedRepos = Object.keys(summary.byRepo).sort();
  for (const repo of sortedRepos) {
    const s = summary.byRepo[repo];
    lines.push(`| \`${repo}\` | ${s.dispatchers} | ${s.missingFromPeer} | ${s.extraInPeer} | ${s.drift} |`);
  }
  lines.push("");
  lines.push("## Per-dispatcher drift");
  lines.push("");
  for (const r of report.repos) {
    if (r.dispatchers.every((d) => d.diff.onlyInCanonical.length === 0 && d.diff.onlyInPeer.length === 0)) {
      continue;
    }
    lines.push(`### \`${r.repo}\``);
    lines.push("");
    for (const d of r.dispatchers) {
      const cMissing = d.diff.onlyInCanonical;
      const pExtra = d.diff.onlyInPeer;
      if (cMissing.length === 0 && pExtra.length === 0) continue;
      lines.push(`- **${d.dispatcher}**`);
      if (cMissing.length > 0) {
        lines.push(`  - missing from peer (${cMissing.length}): \`${cMissing.slice(0, 6).join("`, `")}\`${cMissing.length > 6 ? `, +${cMissing.length - 6} more` : ""}`);
      }
      if (pExtra.length > 0) {
        lines.push(`  - extra in peer (${pExtra.length}): \`${pExtra.slice(0, 6).join("`, `")}\`${pExtra.length > 6 ? `, +${pExtra.length - 6} more` : ""}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// I/O LAYER
// ---------------------------------------------------------------------------

function listPeerRepos() {
  const out = [];
  let parents;
  try {
    parents = fs.readdirSync("H:/", { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of parents) {
    if (ent.isDirectory() && /^prism-[a-z0-9-]+$/i.test(ent.name)) {
      out.push({ name: ent.name, path: path.join("H:/", ent.name) });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function buildCanonicalActionMap(canonicalRoot) {
  const dispatchers = listDispatchers(canonicalRoot);
  const map = {};
  for (const d of dispatchers) {
    try {
      const content = fs.readFileSync(d.path, "utf8");
      map[d.name] = extractActionsFromDispatcher(content);
    } catch {
      map[d.name] = [];
    }
  }
  return map;
}

function buildReport(canonicalRoot, peers) {
  const canonicalMap = buildCanonicalActionMap(canonicalRoot);
  const repos = [];
  for (const peer of peers) {
    const peerDispatchers = listDispatchers(peer.path);
    const dispatcherReports = [];
    for (const d of peerDispatchers) {
      let peerActions = [];
      try {
        peerActions = extractActionsFromDispatcher(fs.readFileSync(d.path, "utf8"));
      } catch {
        peerActions = [];
      }
      const canonicalActions = canonicalMap[d.name] ?? [];
      dispatcherReports.push({
        dispatcher: d.name,
        peerActionsCount: peerActions.length,
        canonicalActionsCount: canonicalActions.length,
        diff: diffActionSets(canonicalActions, peerActions),
      });
    }
    repos.push({ repo: peer.name, dispatchers: dispatcherReports });
  }
  return { canonicalRoot, repos };
}

async function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const wantWrite = args.includes("--write");
  const canonicalArg = args.find((a) => a.startsWith("--canonical="));
  const canonicalRoot = canonicalArg ? canonicalArg.slice("--canonical=".length) : CANONICAL_ROOT_DEFAULT;
  const outArg = args.find((a) => a.startsWith("--out="));
  const outPath = outArg ? outArg.slice("--out=".length) : path.join(REPO_ROOT_DEFAULT, "PEER-REPO-DRIFT.md");

  if (!fs.existsSync(canonicalRoot)) {
    process.stderr.write(`peer-repo-schema-diff: canonical root not found: ${canonicalRoot}\n`);
    process.exit(2);
  }

  const peers = listPeerRepos();
  const report = buildReport(canonicalRoot, peers);
  const summary = summarizeDrift(report);

  if (wantJson) {
    process.stdout.write(JSON.stringify({ summary, report }, null, 2));
  } else if (wantWrite) {
    const md = renderMarkdown(report, summary);
    fs.writeFileSync(outPath, md, "utf8");
    process.stdout.write(`wrote ${outPath} (${md.length} bytes, ${summary.reposScanned} repos, ${summary.totalDrift} drifted actions)\n`);
  } else {
    process.stdout.write(`Peer-repo schema diff: ${summary.reposScanned} repos, ${summary.totalDispatchers} dispatchers, ${summary.totalDrift} drifted actions\n`);
    process.stdout.write(`Use --write to render PEER-REPO-DRIFT.md, --json for raw output.\n`);
  }
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
