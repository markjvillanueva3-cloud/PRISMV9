#!/usr/bin/env node
// ZULU-AWARENESS-MS0 — CLI orchestrator.
//
// Reads the 10 PRISM knowledge surfaces, builds per-slot fingerprints, runs
// the trainer over outcome ledgers, and emits a ranked-slot recommendation
// for a candidate task (or a per-slot capability dump).
//
// Usage:
//   node scripts/zulu-awareness-run.mjs                         # dump full per-slot index (MD)
//   node scripts/zulu-awareness-run.mjs --json                  # JSON output
//   node scripts/zulu-awareness-run.mjs --rank "wire 12 engines to dispatchers"
//   node scripts/zulu-awareness-run.mjs --rank "mill kc lookup" --domain mill
//   node scripts/zulu-awareness-run.mjs --train-only            # run trainer, emit tuned weights
//
// Safety: pure read-only. Writes only to state/shared/zulu-awareness-index.json
// and state/shared/zulu-awareness-weights.json (the tuned weights).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  DEFAULT_WEIGHTS,
  buildCapabilityFingerprint,
  trainFromOutcomes,
  rankSlotsForTask,
  summarizeRanking,
} from "./lib/zulu-awareness-pipeline.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.json");
const SOULS_DIR = path.join(PRISM_ROOT, "state/shared/slot-souls");
const QUEUE_FILE = path.join(PRISM_ROOT, "state/shared/slot-task-queues.json");
const VERDICTS_FILE = path.join(PRISM_ROOT, "state/shared/skill-loop-verdicts.jsonl");
const CLAIMS_FILE = path.join(PRISM_ROOT, "state/shared/slot-task-claims.json");
const TRIBAL_INDEX = path.join(PRISM_ROOT, "state/shared/tribal-embed-index.json");
const VIZ_GRAPH = path.join(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const INDEX_OUT = path.join(PRISM_ROOT, "state/shared/zulu-awareness-index.json");
const WEIGHTS_OUT = path.join(PRISM_ROOT, "state/shared/zulu-awareness-weights.json");
const GIT_TIMEOUT_MS = 2500;
const RECENT_COMMIT_LIMIT = 50;

const SLOT_NAMES = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike", "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu", "zulu"];  // zulu appended — Hermes orchestrator slot (not part of NATO 26 but used as the SELF_EXEMPT orchestrator slot per CLAUDE.md §ZULU-ORCHESTRATOR-MS0)

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
function readFrontmatter(p) {
  const raw = readText(p);
  if (!raw || !raw.startsWith("---\n")) return null;
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) return null;
  const fm = raw.slice(4, end);
  const out = {};
  for (const line of fm.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const k = line.slice(0, colon).trim();
    const v = line.slice(colon + 1).trim();
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

function readSoul(slot) {
  const fm = readFrontmatter(path.join(SOULS_DIR, `${slot}.md`));
  if (!fm) return null;
  // Parse refuse_list — frontmatter format is yaml-ish; capture YAML list items.
  const raw = readText(path.join(SOULS_DIR, `${slot}.md`)) || "";
  const refuseList = parseYamlList(raw, "refuse_list");
  return { ...fm, refuse_list: refuseList };
}

function parseYamlList(raw, key) {
  const re = new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, "m");
  const m = raw.match(re);
  if (!m) return [];
  return m[1].split("\n")
    .map(l => l.replace(/^\s+-\s+/, "").trim())
    .filter(Boolean);
}

function readRecentCommits(limit = RECENT_COMMIT_LIMIT) {
  try {
    const out = execFileSync("git", ["-C", PRISM_ROOT, "log", "-n", String(limit), "--format=%s"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: GIT_TIMEOUT_MS,
    });
    return out.split("\n").filter(Boolean);
  } catch { return []; }
}

function extractSlotFromSubject(subject) {
  const m = subject.match(/\(slot:(\w+)\)/);
  return m ? m[1].toLowerCase() : null;
}

function extractScopeFromSubject(subject) {
  // [MAIN] [SCOPE]/U-ID: title → SCOPE
  const m = subject.match(/\[MAIN\]\s*\[([^\]]+)\]/) || subject.match(/^\[([^\]]+)\]/);
  if (!m) return null;
  const tag = m[1].toUpperCase();
  if (tag === "MAIN") return null;
  return tag;
}

function buildCommitsBySlot(commits) {
  const bySlot = {};
  const scopesBySlot = {};
  for (const subject of commits) {
    const slot = extractSlotFromSubject(subject);
    if (!slot) continue;
    if (!bySlot[slot]) bySlot[slot] = [];
    bySlot[slot].push(subject);
    const scope = extractScopeFromSubject(subject);
    if (scope) {
      scopesBySlot[slot] = scopesBySlot[slot] || new Set();
      scopesBySlot[slot].add(scope);
    }
  }
  // Convert Sets to arrays for JSON.
  for (const slot of Object.keys(scopesBySlot)) {
    scopesBySlot[slot] = [...scopesBySlot[slot]];
  }
  return { bySlot, scopesBySlot };
}

function buildTribalDomainScores(slot, soul, tribalIndex) {
  if (!tribalIndex || !soul) return {};
  const domains = (soul.domain_filter || "").toLowerCase().split("|").map(s => s.trim()).filter(Boolean);
  const scores = {};
  const entries = Array.isArray(tribalIndex.entries) ? tribalIndex.entries : [];
  // Conservative scoring: count entries whose domain field matches one of the soul's domains.
  for (const entry of entries) {
    const d = String(entry?.domain || "").toLowerCase();
    if (!d) continue;
    for (const dom of domains) {
      if (d === dom || d.includes(dom) || dom.includes(d)) {
        scores[dom] = (scores[dom] || 0) + 1;
      }
    }
  }
  return scores;
}

function countVizNodes(vizGraph, soul) {
  if (!vizGraph || !soul) return 0;
  const domains = (soul.domain_filter || "").toLowerCase().split("|").map(s => s.trim()).filter(Boolean);
  if (domains.length === 0) return 0;
  const nodes = Array.isArray(vizGraph.nodes) ? vizGraph.nodes : [];
  let count = 0;
  for (const node of nodes) {
    const idLower = String(node?.id || "").toLowerCase();
    const label = String(node?.label || node?.name || "").toLowerCase();
    for (const dom of domains) {
      if (idLower.includes(dom) || label.includes(dom)) {
        count++;
        break;
      }
    }
  }
  return count;
}

function countVerdictsPerSlot(verdictsFile) {
  const raw = readText(verdictsFile) || "";
  const perSlot = {};
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let v; try { v = JSON.parse(line); } catch { continue; }
    const slot = v?.slot || v?.cluster?.slots ? Object.keys(v.cluster?.slots || {})[0] : null;
    const verdict = v?.verdict?.verdict || v?.verdict;
    if (!slot) continue;
    const rec = perSlot[slot] = perSlot[slot] || { pass: 0, total: 0 };
    rec.total++;
    if (verdict === "AUTO-PASS" || verdict === "PASS") rec.pass++;
  }
  return perSlot;
}

function buildAllFingerprints(opts = {}) {
  const verbose = !!opts.verbose;
  const slotsDoc = readJson(SLOTS_FILE) || { slots: {} };
  const queueDoc = readJson(QUEUE_FILE) || { queues: {} };
  const tribalIndex = readJson(TRIBAL_INDEX);
  const vizGraph = readJson(VIZ_GRAPH);
  const commits = readRecentCommits();
  const { scopesBySlot } = buildCommitsBySlot(commits);
  const verdictsPerSlot = countVerdictsPerSlot(VERDICTS_FILE);

  const fingerprints = [];
  for (const slot of SLOT_NAMES) {
    const soul = readSoul(slot);
    if (!soul) {
      if (verbose) console.error(`(no soul for ${slot}; skipping)`);
      continue;
    }
    const queueLength = (queueDoc.queues?.[slot] || []).length;
    const recentCommitScopes = scopesBySlot[slot] || [];
    const tribalDomainScores = buildTribalDomainScores(slot, soul, tribalIndex);
    const vizNodeCount = countVizNodes(vizGraph, soul);
    const verdicts = verdictsPerSlot[slot] || { pass: 0, total: 0 };
    const fp = buildCapabilityFingerprint(slot, soul, {
      queueLength,
      recentCommitScopes,
      tribalDomainScores,
      vizNodeCount,
      verdictPassCount: verdicts.pass,
      verdictTotalCount: verdicts.total,
    });
    if (fp.ok) fingerprints.push(fp);
  }
  return fingerprints;
}

function parseArgs(argv) {
  const out = { json: false, rank: null, domain: null, kind: null, trainOnly: false, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--rank" && argv[i + 1]) { out.rank = argv[++i]; }
    else if (a === "--domain" && argv[i + 1]) { out.domain = argv[++i]; }
    else if (a === "--kind" && argv[i + 1]) { out.kind = argv[++i]; }
    else if (a === "--train-only") out.trainOnly = true;
    else if (a === "--verbose") out.verbose = true;
  }
  return out;
}

function writeAtomic(p, content) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, p);
    return true;
  } catch { return false; }
}

function main() {
  const opts = parseArgs(process.argv);
  const fingerprints = buildAllFingerprints(opts);

  // Always persist the index for downstream consumers.
  const indexDoc = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    slotCount: fingerprints.length,
    fingerprints,
  };
  writeAtomic(INDEX_OUT, JSON.stringify(indexDoc, null, 2));

  // Trainer: read verdict ledger lines + slot-task-claims.
  const verdictLines = (readText(VERDICTS_FILE) || "").split("\n");
  const claims = readJson(CLAIMS_FILE) || {};
  const tuning = trainFromOutcomes(verdictLines, claims);
  writeAtomic(WEIGHTS_OUT, JSON.stringify({
    schemaVersion: "1.0.0",
    trainedAt: new Date().toISOString(),
    ...tuning,
  }, null, 2));

  if (opts.trainOnly) {
    process.stdout.write(opts.json
      ? JSON.stringify(tuning, null, 2)
      : `tuned weights:\n${JSON.stringify(tuning.weights, null, 2)}\n\nstats: ${JSON.stringify(tuning.stats)}\n`);
    return;
  }

  if (opts.rank) {
    const task = { text: opts.rank, domain: opts.domain, kind: opts.kind };
    const ranking = rankSlotsForTask(task, fingerprints, tuning.weights);
    if (opts.json) {
      process.stdout.write(JSON.stringify({ task, top: ranking.slice(0, 5) }, null, 2));
    } else {
      process.stdout.write(`# Zulu route advisory for: ${opts.rank}\n\n`);
      process.stdout.write(`summary: ${summarizeRanking(ranking)}\n\n`);
      for (const r of ranking.slice(0, 5)) {
        process.stdout.write(`- **${r.slot}** score=${r.score.toFixed(2)} :: ${r.evidence.join(", ")}\n`);
      }
    }
    return;
  }

  // Default: dump per-slot index summary.
  if (opts.json) {
    process.stdout.write(JSON.stringify(indexDoc, null, 2));
  } else {
    process.stdout.write(`# Zulu awareness index — ${fingerprints.length} slots\n\n`);
    for (const fp of fingerprints) {
      process.stdout.write(`- **${fp.slot}** ${fp.hermesRole} :: domains=[${fp.domains.join(",")}] queue=${fp.queueLength} viz=${fp.vizNodeCount} success=${(fp.successRate * 100).toFixed(0)}%/${fp.successSampleSize}\n`);
    }
  }
}

main();
