#!/usr/bin/env node
/**
 * retag-tribal-backend-dev.mjs
 *
 * One-shot, idempotent retagger for `state/shared/tribal-embed-index.json`.
 * Promotes high-ROI backend-dev tribal entries from `domain:general` (or a
 * mistagged manufacturing domain) → `domain:"backend-dev"`. Pairs with the
 * 2026-05-18 `backend-dev` addition to `tribal-by-domain-inject.mjs` so
 * `tribal-rerank` applies the 2× in-domain cosine boost on those entries
 * when a backend-dev slot queries.
 *
 * Selection criteria (matches `inferTribalDomain`'s backend-dev token set):
 *   - source IS "memory" AND backend-dev-keyword density ≥ 2
 *   - source IS "external" AND backend-dev-keyword density ≥ 4
 * Wiki entries are NOT retagged here — their `domain` reflects the wiki
 * tree they came from (cam/cad/wedm/mill/lathe) and the small handful of
 * dev-flavored wiki paths (code-tribal/, software-engineering/) were already
 * mostly tagged `general` by the bootstrap, which keeps them retrievable
 * without a misleading manufacturing label.
 *
 * Run:
 *   node H:/prism/scripts/retag-tribal-backend-dev.mjs           # dry-run report
 *   node H:/prism/scripts/retag-tribal-backend-dev.mjs --apply   # write changes
 *   node H:/prism/scripts/retag-tribal-backend-dev.mjs --json    # JSON output
 *
 * Atomic write via temp + rename. Embedding vectors / hash / text / title /
 * id / path / source untouched — only `domain` flipped.
 *
 * Pure: BD_KEYWORD_RE + scoreEntry + classify are exported for the hermetic
 * test suite at `retag-tribal-backend-dev.test.mjs`.
 */

import fs from "node:fs";
import path from "node:path";
// Shard-safe, clobber-guarded index IO (was monolith-only JSON.parse(readFileSync)
// + atomicWriteJSON -- a clobber vector once the index shards). retag is in-place
// (count unchanged), so no allowShrink needed.
// U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10. [[reference_tribal_shard_read_clobber_2026_06_10]]
import { loadTribalIndex } from "./lib/load-tribal-index.mjs";
import { writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";

export const INDEX_PATH = process.env.PRISM_TRIBAL_INDEX_PATH ||
  "H:/prism/state/shared/tribal-embed-index.json";

/**
 * High-signal backend-dev keyword regex. Tokens chosen for specificity —
 * generic terms like "engine"/"data"/"node"/"test" are deliberately
 * excluded because they appear in CAM/CAD wiki entries too. Word-boundary
 * anchored to prevent substring matches (e.g. `rag` should not match `program`).
 */
export const BD_KEYWORD_RE = /\b(typescript|esbuild|tsc|hook script|hook chain|dispatcher action|engine wiring|prism_dev|prism_ai|prism_memory|prism_session|prism_context|R5\b|R8\b|R10\b|R12\b|R1\b|R2\b|R3\b|R4\b|R6\b|R7\b|R9\b|R11\b|Karpathy|Sonnet|Opus|Haiku|claude code|llm|gnn|graphsage|lora|fine[- ]tun|attention head|transformer|backprop|gradient descent|Adam optimizer|sgd|cross[- ]entropy|softmax|bayes|markov decision|q[- ]learn|conformal|episodic|EWC|replay buffer|tokeniz|prompt cach|rag\b|vector index|cosine sim|embedding|nomic[- ]embed|qdrant|ollama|stratified|negative sampl|heterophily|node:test|vitest|fail[- ]loud|fail[- ]safe|fail[- ]soft|idempot|atomic write|race condition|deadlock|lock file|sqlite|prepared statement|esmodule|cron job|spawn|backpressure|debounce|throttle|memoiz|cache invalid|crdt|gossip|raft consensus|paxos|byzantine|exponential backoff|circuit breaker|saga|outbox|cqrs|event sourcing|subagent|agent loop|tool[- ]use|scrutiny|scrutinize|regression|refactor|build sequence|integration test|hermetic|wiring-review|peer review|silent corruption|silent[- ]degrade|drift detect|knowledge graph|semantic search|cosine similarity|context window|prompt[- ]engin|chain[- ]of[- ]thought|deep reasoning|inference cost|token cost|model rout|MCP\b|dispatcher|inject hook|UserPromptSubmit|PreToolUse|PostToolUse|Stop hook|SessionStart)\b/i;

export const TARGET_DOMAIN = "backend-dev";

/**
 * Score one index entry's backend-dev keyword density on (text + title).
 * Returns a non-negative integer.
 */
export function scoreEntry(entry) {
  if (!entry || typeof entry !== "object") return 0;
  const text = String(entry.text || "") + " " + String(entry.title || "");
  const re = new RegExp(BD_KEYWORD_RE.source, "gi");
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * Classify whether an entry should be retagged to backend-dev. Returns
 * { retag: bool, reason: string, score: number }. Idempotent — entries
 * already at backend-dev return { retag:false, reason:"already" }.
 */
export function classify(entry) {
  if (!entry || typeof entry !== "object") return { retag: false, reason: "invalid-entry", score: 0 };
  if (entry.domain === TARGET_DOMAIN) return { retag: false, reason: "already", score: 0 };
  const score = scoreEntry(entry);
  if (entry.source === "memory" && score >= 2) {
    return { retag: true, reason: `memory+kw${score}`, score };
  }
  if (entry.source === "external" && score >= 4) {
    return { retag: true, reason: `external+kw${score}`, score };
  }
  return { retag: false, reason: "below-threshold", score };
}

/**
 * Pure planner: returns { plan:[{idx,id,from,score,reason}], stats }.
 * No I/O. Index argument is a parsed index object with `.entries[]`.
 */
export function planRetag(indexObj) {
  const plan = [];
  let already = 0;
  let belowThreshold = 0;
  if (!indexObj || !Array.isArray(indexObj.entries)) {
    return { plan, stats: { total: 0, retagged: 0, already, belowThreshold } };
  }
  for (let i = 0; i < indexObj.entries.length; i++) {
    const e = indexObj.entries[i];
    const c = classify(e);
    if (c.retag) {
      plan.push({ idx: i, id: e.id, from: e.domain, score: c.score, reason: c.reason });
    } else if (c.reason === "already") {
      already++;
    } else {
      belowThreshold++;
    }
  }
  return {
    plan,
    stats: { total: indexObj.entries.length, retagged: plan.length, already, belowThreshold },
  };
}

/**
 * Apply the plan to a deep-cloned-shallow index. Only mutates the
 * `domain` field of targeted entries. Returns the mutated index.
 */
export function applyPlan(indexObj, plan) {
  // Shallow-clone entries array; deep-clone only the entries we mutate.
  const next = { ...indexObj, entries: indexObj.entries.slice() };
  for (const step of plan) {
    const original = next.entries[step.idx];
    next.entries[step.idx] = { ...original, domain: TARGET_DOMAIN };
  }
  return next;
}

// Index writes go through writeTribalIndexGuarded (shard-safe + clobber-guarded);
// the old monolith-only atomicWriteJSON was removed (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE
// 2026-06-10) -- it left stale shards shadowing the write once the index sharded.

function main() {
  const apply = process.argv.includes("--apply");
  const asJson = process.argv.includes("--json");
  const indexPath = INDEX_PATH;

  if (!fs.existsSync(indexPath) && !fs.existsSync(indexPath.replace(/\.json$/i, "") + ".manifest.json")) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ ok: false, error: `index not found at ${indexPath}` }));
    } else {
      process.stderr.write(`error: index not found at ${indexPath}\n`);
    }
    process.exit(2);
  }

  const idx = loadTribalIndex(indexPath, fs); // manifest-aware + V8-cap-safe
  const { plan, stats } = planRetag(idx);

  if (apply && plan.length > 0) {
    try {
      const next = applyPlan(idx, plan);
      next.generatedAt = new Date().toISOString();
      next.retaggedAt = next.generatedAt;
      next.retaggedCount = (idx.retaggedCount || 0) + plan.length;
      writeTribalIndexGuarded(next, indexPath);
    } catch (e) {
      // R12 fail-loud: surface write failures honestly to both CLI + --json
      // callers. Without this, a crashed atomicWriteJSON (EACCES / ENOSPC /
      // cross-volume rename / disk-full) would leave the orphaned `.tmp.*`
      // file in the dir and the operator with no signal.
      if (asJson) {
        process.stdout.write(JSON.stringify({
          ok: false,
          phase: "write",
          error: String(e && e.message || e),
          indexPath,
          planned: plan.length,
        }));
      } else {
        process.stderr.write(`error during atomic write: ${e && e.message || e}\n`);
        process.stderr.write(`  indexPath: ${indexPath}\n`);
        process.stderr.write(`  planned retags: ${plan.length} (NOT applied)\n`);
      }
      process.exit(3);
    }
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true,
      indexPath,
      applied: apply,
      stats,
      plan: plan.map((p) => ({ idx: p.idx, id: p.id, from: p.from, score: p.score, reason: p.reason })),
    }));
  } else {
    const verb = apply ? "RETAGGED" : "DRY-RUN (would retag)";
    process.stdout.write(`tribal-embed-index retag → ${TARGET_DOMAIN}\n`);
    process.stdout.write(`  index:    ${indexPath}\n`);
    process.stdout.write(`  ${verb}:  ${plan.length}\n`);
    process.stdout.write(`  already:  ${stats.already}\n`);
    process.stdout.write(`  skipped:  ${stats.belowThreshold}\n`);
    process.stdout.write(`  total:    ${stats.total}\n`);
    if (plan.length && plan.length <= 50) {
      process.stdout.write(`\nplan:\n`);
      for (const p of plan) {
        process.stdout.write(`  [${p.from} → ${TARGET_DOMAIN}] kw=${p.score} ${p.id}\n`);
      }
    }
    if (!apply && plan.length > 0) {
      process.stdout.write(`\nrerun with --apply to write changes.\n`);
    }
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
