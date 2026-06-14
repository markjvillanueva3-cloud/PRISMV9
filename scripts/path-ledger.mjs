#!/usr/bin/env node
// scripts/path-ledger.mjs — CLI for WORKING-PATH-CAPTURE-MS0 (alpha, 2026-05-31).
// Thin wrapper over scripts/lib/path-ledger.mjs. Fail-soft; exit 0 ok / 2 bad-args / 3 io.
//
//   node scripts/path-ledger.mjs record  <pathId> <action> [argsDigest]
//   node scripts/path-ledger.mjs capture <pathId> <domain> <goalType> [--success] [--score N] [--goal "..."] [--session ID]
//   node scripts/path-ledger.mjs find    <domain> <goalType> [--topK N] [--include-negative] [--json]
//   node scripts/path-ledger.mjs replay  <workingPathId> [--json]      # → ExecutionPlan
//   node scripts/path-ledger.mjs emit    <workingPathId> [--slot S] [--session ID]
//   node scripts/path-ledger.mjs list    [--json]
import {
  recordStep, captureWorkingPath, findWorkingPaths, readWorkingPaths,
  toExecutionPlan, emitLearningRow,
} from "./lib/path-ledger.mjs";
import { pickBestPath } from "./lib/path-embed.mjs"; // U-WPC-ACCEL-KNN: kNN path-memoization

const argv = process.argv.slice(2);
const cmd = argv[0];
const pos = argv.slice(1).filter((a) => !a.startsWith("--"));
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const JSONOUT = flag("json");
function out(obj) { process.stdout.write((JSONOUT ? JSON.stringify(obj) : JSON.stringify(obj, null, 2)) + "\n"); }
function die(code, msg) { process.stderr.write(`path-ledger: ${msg}\n`); process.exit(code); }
function findById(id) { return readWorkingPaths().find((w) => w && w.workingPathId === id) || null; }

try {
  switch (cmd) {
    case "record": {
      if (pos.length < 2) die(2, "record <pathId> <action> [argsDigest]");
      const r = recordStep(pos[0], { action: pos[1], argsDigest: pos[2] });
      out(r); process.exit(r.ok ? 0 : 3); break;
    }
    case "capture": {
      if (pos.length < 3) die(2, "capture <pathId> <domain> <goalType> [--success] [--score N] [--goal ...]");
      const r = captureWorkingPath(pos[0], {
        domain: pos[1], goalType: pos[2], goal: opt("goal", ""),
        outcome: { success: flag("success") }, score: opt("score") ? Number(opt("score")) : undefined,
        sessionId: opt("session", ""),
      });
      out(r); process.exit(r.captured ? 0 : 3); break;
    }
    case "find": {
      if (pos.length < 1) die(2, "find <domain> [goalType] [--query \"...\"] [--topK N] [--include-negative]");
      const topK = opt("topK") ? Number(opt("topK")) : 5;
      // pull a wide candidate set first (exact filter), then kNN-rank if a --query is given (acceleration Lever 1)
      const cands = findWorkingPaths(pos[0], pos[1] || "", { topK: 50, includeNegative: flag("include-negative") });
      const query = opt("query");
      if (query) {
        const r = pickBestPath(query, cands, { topK }); // embeds via Ollama nomic-embed (fail-soft)
        out({ query, replay: r.replay, topSimilarity: r.topSimilarity, reason: r.reason, count: r.ranked.length, paths: r.ranked });
      } else {
        out({ count: Math.min(cands.length, topK), paths: cands.slice(0, topK) });
      }
      break;
    }
    case "replay": {
      if (pos.length < 1) die(2, "replay <workingPathId>");
      const wp = findById(pos[0]); if (!wp) die(3, `no working path: ${pos[0]}`);
      out(toExecutionPlan(wp)); break;
    }
    case "emit": {
      if (pos.length < 1) die(2, "emit <workingPathId> [--slot S]");
      const wp = findById(pos[0]); if (!wp) die(3, `no working path: ${pos[0]}`);
      const r = emitLearningRow(wp, { slot: opt("slot", ""), sessionId: opt("session", "") });
      out(r); process.exit(r.emitted ? 0 : 3); break;
    }
    case "list": {
      const all = readWorkingPaths();
      out({ count: all.length, paths: all.map((w) => ({ workingPathId: w.workingPathId, domain: w.domain, goalType: w.goalType, working: w.working, score: w.score, stepsCount: w.stepsCount, captureCount: w.captureCount })) });
      break;
    }
    default:
      die(2, "usage: record|capture|find|replay|emit|list  (see header)");
  }
} catch (e) {
  die(3, e && e.message ? e.message : "error");
}
