#!/usr/bin/env node
/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P16-U01 — peer-repo signature map driver.
 *
 * Walks every sibling H:/prism-* worktree, classifies its assets via
 * PeerRepoSignatureEngine, diffs each peer against the canonical PRISM
 * repo, and writes:
 *   - <out-dir>/<peer-name>.json           per-repo signature + diff
 *   - <out-dir>/PEER-REPO-SUMMARY.json     ranked audit summary
 *   - <summary-md>                          human-readable report
 *
 * Filters out machining-domain assets (mill/lathe/wedm/etc.) — feeds
 * P16-U02 (merge-candidate review) and P16-U03 (top-N merges).
 *
 * Usage:
 *   node mcp-server/scripts/peer-repo-signature-map.mjs \
 *     [--root "H:/"] \
 *     [--canonical "H:/PRISM"] \
 *     [--out-dir "H:/prism/state/shared/peer-repo-signatures"] \
 *     [--summary-md "H:/prism/state/shared/PEER-REPO-SIGNATURE-AUDIT.md"] \
 *     [--max-files 50000] \
 *     [--no-write]
 *
 * Output (stdout): JSON summary { ok, totalPeers, peerRanking, ... }.
 *
 * @module scripts/peer-repo-signature-map
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".cache", ".vscode",
  ".idea", "coverage", ".turbo", ".vitest", "logs", ".claude/cache",
]);
const ENGINE_DIR_RE = /(?:^|\/)mcp-server\/src\/engines$/i;
const DISPATCHER_DIR_RE = /(?:^|\/)mcp-server\/src\/tools\/dispatchers$/i;
const HOOK_DIR_RE = /(?:^|\/)\.claude\/hooks$/i;
const COMMAND_DIR_RE = /(?:^|\/)\.claude\/commands$/i;
const SCRIPT_DIR_RE = /(?:^|\/)(?:mcp-server\/)?scripts$/i;

function parseArgs(argv) {
  const out = {
    root: "H:/",
    canonical: "H:/PRISM",
    outDir: "H:/prism/state/shared/peer-repo-signatures",
    summaryMd: "H:/prism/state/shared/PEER-REPO-SIGNATURE-AUDIT.md",
    maxFiles: 50000,
    noWrite: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = argv[++i] ?? out.root;
    else if (a === "--canonical") out.canonical = argv[++i] ?? out.canonical;
    else if (a === "--out-dir") out.outDir = argv[++i] ?? out.outDir;
    else if (a === "--summary-md") out.summaryMd = argv[++i] ?? out.summaryMd;
    else if (a === "--max-files") out.maxFiles = Number(argv[++i]) || out.maxFiles;
    else if (a === "--no-write") out.noWrite = true;
  }
  return out;
}

function listPeerRepos(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  let entries;
  try { entries = fs.readdirSync(rootDir, { withFileTypes: true }); }
  catch { return []; }
  return entries
    .filter((e) => e.isDirectory() && /^prism-[a-z0-9_-]+$/i.test(e.name))
    .map((e) => path.join(rootDir, e.name))
    .sort();
}

/**
 * Cheap directory walk that only descends into directories likely to contain
 * the 5 asset families. Returns repo-relative forward-slash paths up to
 * maxFiles. Breaks early on quota — saves having to walk JM Die etc.
 */
function listAssetPaths(repoRoot, maxFiles) {
  const results = [];
  if (!fs.existsSync(repoRoot)) return results;

  const stack = [repoRoot];
  while (stack.length > 0 && results.length < maxFiles) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const full = path.join(dir, entry.name);
      const rel = path.relative(repoRoot, full).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        // Hard depth gate — too deep means we wandered into a data tree
        if (rel.split("/").length > 8) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        const parent = path.dirname(rel);
        const lower = entry.name.toLowerCase();
        if (
          (ENGINE_DIR_RE.test(parent) && lower.endsWith(".ts")) ||
          (DISPATCHER_DIR_RE.test(parent) && lower.endsWith(".ts")) ||
          (HOOK_DIR_RE.test(parent) && /\.(?:mjs|js|ts)$/.test(lower)) ||
          (COMMAND_DIR_RE.test(parent) && lower.endsWith(".md")) ||
          (SCRIPT_DIR_RE.test(parent) && /\.(?:mjs|js|ts|sh|ps1|py)$/.test(lower))
        ) {
          results.push(rel);
        }
      }
    }
  }
  return results;
}

function renderSummaryMarkdown(summary, perRepoCount, errorsCount, args) {
  const lines = [
    "# Peer Repo Signature Audit",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Canonical:** \`${args.canonical}\``,
    `**Root searched:** \`${args.root}\``,
    `**Peers audited:** ${summary.totalPeers}`,
    `**Per-repo files emitted:** ${perRepoCount}`,
    `**Errors:** ${errorsCount}`,
    "",
    "## Cross-peer unique asset count",
    "",
    `- Engines: ${summary.totalUniqueEnginesAcrossPeers}`,
    `- Hooks: ${summary.totalUniqueHooksAcrossPeers}`,
    `- Skills: ${summary.totalUniqueSkillsAcrossPeers}`,
    "",
    "## Peer ranking (by peer-only asset count desc)",
    "",
    "| Rank | Repo | Peer-only assets |",
    "|------|------|------------------|",
  ];
  for (let i = 0; i < summary.peerRanking.length; i++) {
    const p = summary.peerRanking[i];
    lines.push(`| ${i + 1} | \`${p.repo_root}\` | ${p.peer_only_count} |`);
  }
  lines.push("");
  lines.push("## Next steps");
  lines.push("");
  lines.push("- P16-U02: review top-ranked peers' unique engines/hooks/skills");
  lines.push("- P16-U03: merge top 5 peer-only assets back to canonical");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "engines", "PeerRepoSignatureEngine.js");
  if (!fs.existsSync(distPath)) {
    console.log(JSON.stringify({
      ok: false,
      error: "engine-not-built",
      message: `PeerRepoSignatureEngine compiled artifact not found at ${distPath}. Run npm run build:fast first.`,
    }, null, 2));
    process.exit(2);
  }
  const { peerRepoSignatureEngine } = await import(pathToFileURL(distPath).href);

  const errors = [];
  // Build canonical signature
  let canonicalSig;
  try {
    const canonicalPaths = listAssetPaths(args.canonical, args.maxFiles);
    canonicalSig = peerRepoSignatureEngine.buildSignature(args.canonical, canonicalPaths);
  } catch (err) {
    errors.push({ path: args.canonical, error: `canonical: ${String(err?.message ?? err).slice(0, 200)}` });
    canonicalSig = peerRepoSignatureEngine.emptySignature(args.canonical);
  }

  // Walk each peer
  const peers = listPeerRepos(args.root);
  const perRepoUniques = [];
  const perRepoSignatures = []; // for individual JSON dump

  for (const peerRoot of peers) {
    // Skip canonical-equivalents — H:/PRISM is canonical, so any repo whose
    // realpath resolves to canonical is excluded.
    if (path.resolve(peerRoot).toLowerCase() === path.resolve(args.canonical).toLowerCase()) continue;

    let peerSig;
    try {
      const peerPaths = listAssetPaths(peerRoot, args.maxFiles);
      peerSig = peerRepoSignatureEngine.buildSignature(peerRoot, peerPaths);
    } catch (err) {
      errors.push({ path: peerRoot, error: `walk: ${String(err?.message ?? err).slice(0, 200)}` });
      continue;
    }

    let diff;
    try { diff = peerRepoSignatureEngine.diffSignatures(canonicalSig, peerSig); }
    catch (err) {
      errors.push({ path: peerRoot, error: `diff: ${String(err?.message ?? err).slice(0, 200)}` });
      continue;
    }

    const peerOnlyCount = peerRepoSignatureEngine.countUniqueAssets(diff.unique_to_peer);
    const record = {
      repo_root: peerSig.repo_root,
      unique_to_peer: diff.unique_to_peer,
      unique_to_canonical: diff.unique_to_canonical,
      peer_only_count: peerOnlyCount,
    };
    perRepoUniques.push(record);
    perRepoSignatures.push({ peerSig, record });
  }

  const summary = peerRepoSignatureEngine.summarize(perRepoUniques);

  let perRepoFilesEmitted = 0;
  if (!args.noWrite && perRepoSignatures.length > 0) {
    try {
      fs.mkdirSync(args.outDir, { recursive: true });
      for (const { peerSig, record } of perRepoSignatures) {
        const baseName = path.basename(peerSig.repo_root.replace(/\/+$/, ""));
        const outPath = path.join(args.outDir, `${baseName}.json`);
        fs.writeFileSync(outPath, JSON.stringify({
          repo_root: peerSig.repo_root,
          signature: peerSig,
          diff: record,
        }, null, 2));
        perRepoFilesEmitted++;
      }
      fs.writeFileSync(
        path.join(args.outDir, "PEER-REPO-SUMMARY.json"),
        JSON.stringify({ summary, canonical: canonicalSig, errors }, null, 2),
      );
      fs.mkdirSync(path.dirname(args.summaryMd), { recursive: true });
      fs.writeFileSync(args.summaryMd, renderSummaryMarkdown(summary, perRepoFilesEmitted, errors.length, args));
    } catch (err) {
      errors.push({ path: "(output)", error: `write: ${String(err?.message ?? err).slice(0, 200)}` });
    }
  }

  const ok = errors.length === 0;
  console.log(JSON.stringify({
    ok,
    canonical: args.canonical,
    peers_found: peers.length,
    peers_audited: perRepoUniques.length,
    summary,
    errors: errors.slice(0, 20),
    error_count: errors.length,
    outputs: args.noWrite ? "(--no-write set)" : {
      perRepoDir: args.outDir,
      summaryJson: path.join(args.outDir, "PEER-REPO-SUMMARY.json"),
      summaryMd: args.summaryMd,
    },
  }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: "unhandled",
    message: String(err?.message ?? err),
    stack: String(err?.stack ?? "").slice(0, 2000),
  }, null, 2));
  process.exit(1);
});
