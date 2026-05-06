#!/usr/bin/env node
/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P16-U02 — merge-candidate triage driver.
 *
 * Reads the per-peer signature JSONs produced by
 * peer-repo-signature-map.mjs (P16-U01), feeds them through
 * MergeCandidateScorerEngine, and emits the ranked triage report:
 *   - <out-md>     human-readable PEER-REPO-MERGE-CANDIDATES.md
 *   - <out-json>   machine-readable CandidateReport
 *
 * Lead-lane defaults to H:/prism-iooms0 (whose work merges naturally
 * via this branch's eventual squash). Any candidate also-present in
 * the lead lane gets a 0.5 score penalty so reviewers focus on
 * truly missing-from-canonical assets.
 *
 * Usage:
 *   node mcp-server/scripts/peer-repo-merge-candidates.mjs \
 *     [--in-dir "H:/prism/state/shared/peer-repo-signatures"] \
 *     [--out-md "H:/prism/state/shared/PEER-REPO-MERGE-CANDIDATES.md"] \
 *     [--out-json "H:/prism/state/shared/peer-repo-signatures/MERGE-CANDIDATES.json"] \
 *     [--lead-lane "H:/prism-iooms0"] \
 *     [--min-score 0.20] \
 *     [--top-n 100] \
 *     [--no-write]
 *
 * Output (stdout): JSON summary { ok, totalAssets, scoredAssets, top10, ... }.
 *
 * @module scripts/peer-repo-merge-candidates
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const out = {
    inDir: "H:/prism/state/shared/peer-repo-signatures",
    outMd: "H:/prism/state/shared/PEER-REPO-MERGE-CANDIDATES.md",
    outJson: "H:/prism/state/shared/peer-repo-signatures/MERGE-CANDIDATES.json",
    leadLane: "H:/prism-iooms0",
    minScore: 0.20,
    topN: 100,
    noWrite: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in-dir") out.inDir = argv[++i] ?? out.inDir;
    else if (a === "--out-md") out.outMd = argv[++i] ?? out.outMd;
    else if (a === "--out-json") out.outJson = argv[++i] ?? out.outJson;
    else if (a === "--lead-lane") out.leadLane = argv[++i] ?? out.leadLane;
    else if (a === "--min-score") out.minScore = Number(argv[++i]) || out.minScore;
    else if (a === "--top-n") out.topN = Number(argv[++i]) || out.topN;
    else if (a === "--no-write") out.noWrite = true;
  }
  return out;
}

function loadPerRepoFromDir(inDir) {
  if (!fs.existsSync(inDir)) return { records: [], errors: [{ path: inDir, error: "in-dir not found" }] };
  const records = [];
  const errors = [];
  let entries;
  try { entries = fs.readdirSync(inDir, { withFileTypes: true }); }
  catch (err) {
    return { records: [], errors: [{ path: inDir, error: `readdir: ${String(err?.message ?? err).slice(0, 200)}` }] };
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
    if (entry.name === "PEER-REPO-SUMMARY.json" || entry.name === "MERGE-CANDIDATES.json") continue;
    const full = path.join(inDir, entry.name);
    let raw;
    try { raw = fs.readFileSync(full, "utf-8"); }
    catch (err) {
      errors.push({ path: full, error: `read: ${String(err?.message ?? err).slice(0, 200)}` });
      continue;
    }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (err) {
      errors.push({ path: full, error: `json: ${String(err?.message ?? err).slice(0, 200)}` });
      continue;
    }
    // The peer-repo-signature-map output shape is { repo_root, signature, diff }
    // where diff = PerRepoUniques.
    if (parsed && parsed.diff && typeof parsed.diff === "object") {
      records.push(parsed.diff);
    } else if (parsed && parsed.unique_to_peer) {
      records.push(parsed);
    } else {
      errors.push({ path: full, error: "unexpected shape (no diff or unique_to_peer)" });
    }
  }
  return { records, errors };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "engines", "MergeCandidateScorerEngine.js");
  if (!fs.existsSync(distPath)) {
    console.log(JSON.stringify({
      ok: false,
      error: "engine-not-built",
      message: `MergeCandidateScorerEngine compiled artifact not found at ${distPath}. Run npm run build:fast or build:tsc first.`,
    }, null, 2));
    process.exit(2);
  }
  const { mergeCandidateScorerEngine } = await import(pathToFileURL(distPath).href);

  const { records, errors } = loadPerRepoFromDir(args.inDir);

  const config = {
    leadLane: args.leadLane,
    minScore: args.minScore,
    topN: args.topN,
  };

  const report = mergeCandidateScorerEngine.rankCandidates(records, config);
  const generatedAt = new Date().toISOString();
  const md = mergeCandidateScorerEngine.renderMarkdown(report, config, generatedAt);

  if (!args.noWrite) {
    try {
      fs.mkdirSync(path.dirname(args.outMd), { recursive: true });
      fs.writeFileSync(args.outMd, md);
      fs.mkdirSync(path.dirname(args.outJson), { recursive: true });
      fs.writeFileSync(args.outJson, JSON.stringify({
        generatedAt,
        config,
        report,
        errors,
      }, null, 2));
    } catch (err) {
      errors.push({ path: "(output)", error: `write: ${String(err?.message ?? err).slice(0, 200)}` });
    }
  }

  const top10 = report.candidates.slice(0, 10).map((c) => ({
    score: c.score,
    kind: c.kind,
    name: c.name,
    peer_count: c.peer_count,
    in_lead_lane: c.in_lead_lane,
  }));

  const ok = errors.length === 0 && records.length > 0;
  console.log(JSON.stringify({
    ok,
    in_dir: args.inDir,
    records_loaded: records.length,
    totalAssets: report.totalAssets,
    scoredAssets: report.scoredAssets,
    candidates_shown: report.candidates.length,
    byKind: report.byKind,
    top10,
    errors: errors.slice(0, 20),
    error_count: errors.length,
    outputs: args.noWrite ? "(--no-write set)" : { mdPath: args.outMd, jsonPath: args.outJson },
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
