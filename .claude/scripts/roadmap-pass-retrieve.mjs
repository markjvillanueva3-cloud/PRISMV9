#!/usr/bin/env node
/**
 * roadmap-pass-retrieve.mjs — Track C: Reflexion-style retrieval over prior passes
 *
 * Given a query (free text describing the upcoming pass — e.g. "tier-0 mill-domain
 * heavy AI-priority full-rebuild"), embed it via Ollama and return the top-k most
 * similar prior passes from roadmap-pass-history.jsonl, with their hit-rate and
 * weights. The next pass uses this to inform its own weight choices.
 *
 * Usage:
 *   node roadmap-pass-retrieve.mjs --query "tier-0 mill domain"
 *   node roadmap-pass-retrieve.mjs --query "..." --k 5
 *   node roadmap-pass-retrieve.mjs --query "..." --json     # machine-readable
 *   node roadmap-pass-retrieve.mjs --hint                   # emit weight-suggestion block
 *
 * --hint mode: prints a short markdown block summarizing prior-pass hit-rate and
 *              recommending weight tweaks (±5% per axis if hit-rate <60%).
 *              This is the surface atomic-roadmap-emit.mjs reads on next pass.
 */

import fs from "node:fs";
import http from "node:http";

const PRISM = "H:/prism";
const HISTORY_LOG = `${PRISM}/state/shared/roadmap-pass-history.jsonl`;
const WEIGHT_OVERRIDES = `${PRISM}/state/shared/roadmap-weight-overrides.json`;
const OLLAMA_URL = "http://127.0.0.1:11434/api/embeddings";
const OLLAMA_MODEL = "nomic-embed-text:latest";

function args() {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      o[k] = v;
    }
  }
  return o;
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function readJSONL(p) {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of raw) {
    try { out.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return out;
}

function unpackEmbedding(b64) {
  const buf = Buffer.from(b64, "base64");
  const n = buf.length / 4;
  const v = new Array(n);
  for (let i = 0; i < n; i++) v[i] = buf.readFloatLE(i * 4);
  return v;
}

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function embedViaOllama(text, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ model: OLLAMA_MODEL, prompt: text });
    const req = http.request(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: timeoutMs,
    }, (res) => {
      let buf = "";
      res.on("data", (c) => { buf += c; });
      res.on("end", () => {
        try {
          const j = JSON.parse(buf);
          if (Array.isArray(j.embedding)) resolve(j.embedding);
          else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.write(payload);
    req.end();
  });
}

function recordSummary(rec, score) {
  return {
    passId: rec.passId,
    ts: rec.ts,
    similarity: Number(score.toFixed(4)),
    units_emitted: rec.units_emitted,
    units_shipped_30d_later: rec.units_shipped_30d_later ?? null,
    hit_rate: rec.hit_rate ?? null,
    drift_count: rec.drift_count,
    mean_aiPriorityScore: rec.mean_aiPriorityScore,
    mean_evidenceScore: rec.mean_evidenceScore,
    weights_used: rec.weights_used,
    top_domains: rec.top_domains,
  };
}

function suggestWeights(topMatches, baseWeights) {
  // If any of the top-3 has hit_rate < 0.6 AND we have shipped data, recommend tweaks.
  // ±5% adjustments clamped to [0.5x, 1.5x] of base — per plan §Locked Decisions #3.
  const usable = topMatches.filter(m => typeof m.hit_rate === "number");
  if (usable.length === 0) return { reason: "no shipped data yet — use base weights", suggestions: null };

  const meanHit = usable.reduce((a, m) => a + m.hit_rate, 0) / usable.length;
  if (meanHit >= 0.6) return { reason: `mean hit-rate ${(meanHit * 100).toFixed(1)}% ≥ 60% — keep base weights`, suggestions: null };

  const adj = (v, mult) => {
    const target = v * mult;
    const lo = Math.abs(v) * 0.5;
    const hi = Math.abs(v) * 1.5;
    if (v >= 0) return Math.max(lo, Math.min(hi, target));
    return Math.min(-lo, Math.max(-hi, target));
  };
  const factor = meanHit < 0.4 ? 1.05 : 1.05; // 5% step, direction determined per axis
  const suggestions = {
    shipped_boost: adj(baseWeights.shipped_boost ?? 5, factor),
    tribal_cheap_boost: adj(baseWeights.tribal_cheap_boost ?? 3, factor),
    tribal_escalate_penalty: adj(baseWeights.tribal_escalate_penalty ?? -3, factor),
    blast_radius_max_boost: adj(baseWeights.blast_radius_max_boost ?? 20, factor),
  };
  return {
    reason: `mean hit-rate ${(meanHit * 100).toFixed(1)}% < 60% — bumping weights by 5%`,
    meanHitRate: Number(meanHit.toFixed(4)),
    suggestions,
  };
}

async function main() {
  const opts = args();
  const k = Number(opts.k) || 3;

  if (!fs.existsSync(HISTORY_LOG)) {
    const out = { ok: false, error: "history log not found" };
    if (opts.json || opts.hint) console.log(JSON.stringify(out));
    else console.log(`No history log at ${HISTORY_LOG}. Run atomic-roadmap-emit.mjs first.`);
    process.exit(0);
  }

  const records = readJSONL(HISTORY_LOG);
  const embedded = records.filter(r => r.embed_fingerprint);

  if (embedded.length === 0) {
    const out = { ok: true, total: records.length, embedded: 0, note: "no embedded passes — run roadmap-pass-record.mjs --embed" };
    if (opts.json) console.log(JSON.stringify(out, null, 2));
    else if (opts.hint) console.log(`<!-- prior-pass hint: no embedded history yet -->`);
    else console.log(`Found ${records.length} passes, none embedded yet. Run: node H:/prism/.claude/scripts/roadmap-pass-record.mjs --embed`);
    process.exit(0);
  }

  // Build query — explicit --query, else summary of latest pass
  let queryText = opts.query;
  if (!queryText) {
    const latest = records[records.length - 1];
    if (!latest) { console.error("no latest pass"); process.exit(1); }
    queryText = `pass=latest units=${latest.units_emitted} drift=${latest.drift_count} domains=${(latest.top_domains||[]).map(d=>d.domain).join(",")}`;
  }

  const queryVec = await embedViaOllama(queryText);
  if (!queryVec) {
    const out = { ok: false, error: "Ollama embed failed (is server up?)" };
    if (opts.json || opts.hint) console.log(JSON.stringify(out));
    else console.log(`Ollama embed failed. Check http://127.0.0.1:11434/api/tags`);
    process.exit(2);
  }

  // Score every embedded record
  const scored = embedded.map(r => ({
    rec: r,
    score: cosineSim(queryVec, unpackEmbedding(r.embed_fingerprint)),
  })).sort((a, b) => b.score - a.score);

  const top = scored.slice(0, k).map(s => recordSummary(s.rec, s.score));

  // Determine base weights for suggestion
  const overrides = readJSON(WEIGHT_OVERRIDES, {});
  const latestRec = records[records.length - 1];
  const baseWeights = overrides.weights || latestRec?.weights_used || {
    shipped_boost: 5, tribal_cheap_boost: 3, tribal_escalate_penalty: -3, blast_radius_max_boost: 20,
  };

  const advice = suggestWeights(top, baseWeights);

  const result = {
    ok: true,
    query: queryText,
    total_passes: records.length,
    embedded_passes: embedded.length,
    k,
    top_matches: top,
    weight_advice: advice,
    base_weights: baseWeights,
    overrides_active: !!overrides.weights,
  };

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (opts.hint) {
    const lines = [];
    lines.push(`<!-- roadmap-pass hint: query=${queryText.slice(0, 60)}... -->`);
    lines.push(`# Prior-pass hint`);
    lines.push(`Query: ${queryText}`);
    lines.push(`Embedded passes: ${embedded.length}/${records.length}`);
    if (top.length) {
      lines.push(``);
      lines.push(`## Top ${top.length} similar passes`);
      lines.push(`| sim | passId | units | shipped30d | hit-rate | drift |`);
      lines.push(`|----:|--------|------:|----------:|--------:|------:|`);
      for (const m of top) {
        lines.push(`| ${m.similarity} | ${m.passId} | ${m.units_emitted} | ${m.units_shipped_30d_later ?? "—"} | ${m.hit_rate ?? "—"} | ${m.drift_count} |`);
      }
    }
    lines.push(``);
    lines.push(`## Weight advice`);
    lines.push(`${advice.reason}`);
    if (advice.suggestions) {
      lines.push(``);
      for (const [k, v] of Object.entries(advice.suggestions)) {
        lines.push(`- ${k}: ${baseWeights[k]} → ${v.toFixed(3)}`);
      }
    }
    console.log(lines.join("\n"));
  } else {
    console.log(`roadmap-pass-retrieve — query: ${queryText.slice(0, 80)}`);
    console.log(`  ${embedded.length}/${records.length} passes embedded`);
    console.log(`  top ${top.length}:`);
    for (const m of top) {
      console.log(`    sim=${m.similarity} ${m.passId} units=${m.units_emitted} hit=${m.hit_rate ?? "—"} drift=${m.drift_count}`);
    }
    console.log(`  advice: ${advice.reason}`);
    if (advice.suggestions) {
      for (const [k, v] of Object.entries(advice.suggestions)) {
        console.log(`    ${k}: ${baseWeights[k]} → ${v.toFixed(3)}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(`roadmap-pass-retrieve error: ${e.message}`);
  process.exit(1);
});
