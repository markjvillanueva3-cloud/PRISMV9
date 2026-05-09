#!/usr/bin/env node
/**
 * roadmap-pass-record.mjs — Track C: closed-loop pass telemetry
 *
 * Two operations:
 *  1) --backfill          Walk roadmap-pass-history.jsonl. For each record older than
 *                         WINDOW_DAYS (default 30), look up each unit in MILESTONE_PROGRESS.json
 *                         and count how many shipped since the pass timestamp. Write back
 *                         to that record's units_shipped_30d_later field. Idempotent.
 *  2) --embed             Walk records lacking embed_fingerprint, compute Ollama
 *                         nomic-embed-text embedding of {top_domains, weights_used,
 *                         drift_count, mean_aiPriorityScore, mean_evidenceScore}, store as
 *                         embed_fingerprint (768-dim float array, base64-packed).
 *
 * Default (no flag): runs both in sequence — backfill first, then embed.
 *
 * Atomic write via tmp + rename. Never re-orders existing records (line index is
 * the implicit primary key).
 *
 * Usage:
 *   node roadmap-pass-record.mjs                    # backfill + embed
 *   node roadmap-pass-record.mjs --backfill         # only backfill
 *   node roadmap-pass-record.mjs --embed            # only embed
 *   node roadmap-pass-record.mjs --window-days 14   # custom backfill window
 *   node roadmap-pass-record.mjs --json             # machine-readable summary
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const PRISM = "H:/prism";
const HISTORY_LOG = `${PRISM}/state/shared/roadmap-pass-history.jsonl`;
const MILESTONE_PROGRESS = `${PRISM}/state/shared/MILESTONE_PROGRESS.json`;
const ATOMIC_ROADMAP = `${PRISM}/state/shared/atomic-roadmap.json`;
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
    try { out.push(JSON.parse(line)); }
    catch { out.push({ _malformed: true, _raw: line }); }
  }
  return out;
}

function writeJSONLAtomic(p, records) {
  const tmp = `${p}.tmp`;
  const body = records.map(r => {
    if (r._malformed) return r._raw;
    return JSON.stringify(r);
  }).join("\n") + "\n";
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, p);
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

function packEmbedding(vec) {
  // Pack 768 float32s as base64 for compact storage in jsonl.
  const buf = Buffer.alloc(vec.length * 4);
  for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i], i * 4);
  return buf.toString("base64");
}

function recordToEmbedText(rec) {
  const top = (rec.top_domains || []).map(d => `${d.domain}:${d.count}`).join(",");
  const w = rec.weights_used || {};
  return [
    `pass=${rec.passId}`,
    `units=${rec.units_emitted}`,
    `drift=${rec.drift_count}`,
    `aiMean=${rec.mean_aiPriorityScore}`,
    `evMean=${rec.mean_evidenceScore}`,
    `domains=${top}`,
    `weights=shipBoost${w.shipped_boost}/triCheap${w.tribal_cheap_boost}/triEsc${w.tribal_escalate_penalty}/blastMax${w.blast_radius_max_boost}`,
  ].join(" ");
}

function backfillRecords(records, windowDays) {
  // Build a unit→shippedDate index from MILESTONE_PROGRESS
  const mp = readJSON(MILESTONE_PROGRESS, null);
  if (!mp) return { updated: 0, skipped: records.length, reason: "MILESTONE_PROGRESS.json missing" };

  // Index every shipped unit by `${milestone}::${unit_id}` → ISO date string
  const shippedAt = new Map();
  for (const m of (mp.milestones || [])) {
    for (const u of (m.units || [])) {
      if (u.shipped && u.date) shippedAt.set(`${m.id}::${u.id}`, u.date);
    }
  }

  const now = Date.now();
  const windowMs = windowDays * 86_400_000;

  let updated = 0;
  for (const rec of records) {
    if (rec._malformed) continue;
    if (!rec.passId || !rec.ts) continue;
    if (rec.units_shipped_30d_later !== null && rec.units_shipped_30d_later !== undefined) continue;

    const passTime = new Date(rec.ts).getTime();
    if (Number.isNaN(passTime)) continue;
    if (now - passTime < windowMs) continue;  // too fresh

    // Need the pass's unit list. Fall back to atomic-roadmap.json if it's the most recent.
    // For older passes we can't easily recover the unit list — skip with note.
    let units = rec.units;
    if (!units && rec.passId) {
      const ar = readJSON(ATOMIC_ROADMAP, null);
      if (ar?.passId === rec.passId && Array.isArray(ar.laneAssignments)) {
        units = ar.laneAssignments.flatMap(l => l.units || []);
      }
    }
    if (!units) {
      rec.units_shipped_30d_later = -1; // sentinel: history lost
      rec.backfill_note = "unit list unavailable (atomic-roadmap.json moved on)";
      updated++;
      continue;
    }

    let shippedSince = 0;
    for (const key of units) {
      const sd = shippedAt.get(key);
      if (!sd) continue;
      const t = new Date(sd).getTime();
      if (Number.isFinite(t) && t > passTime) shippedSince++;
    }

    rec.units_shipped_30d_later = shippedSince;
    rec.hit_rate = units.length ? Number((shippedSince / units.length).toFixed(4)) : 0;
    rec.backfilled_at = new Date().toISOString();
    updated++;
  }

  return { updated, skipped: records.length - updated };
}

async function embedRecords(records) {
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const rec of records) {
    if (rec._malformed) continue;
    if (rec.embed_fingerprint) { skipped++; continue; }
    if (!rec.passId) continue;

    const text = recordToEmbedText(rec);
    const vec = await embedViaOllama(text);
    if (!vec) { failed++; continue; }

    rec.embed_fingerprint = packEmbedding(vec);
    rec.embed_dim = vec.length;
    rec.embed_model = OLLAMA_MODEL;
    rec.embedded_at = new Date().toISOString();
    updated++;
  }
  return { updated, skipped, failed };
}

async function main() {
  const opts = args();
  const windowDays = Number(opts["window-days"]) || 30;
  const doBackfill = opts.backfill || (!opts.backfill && !opts.embed);
  const doEmbed = opts.embed || (!opts.backfill && !opts.embed);

  if (!fs.existsSync(HISTORY_LOG)) {
    const out = { ok: false, error: "history log not found", path: HISTORY_LOG };
    if (opts.json) console.log(JSON.stringify(out));
    else console.log(`No history log at ${HISTORY_LOG}. Run atomic-roadmap-emit.mjs first.`);
    process.exit(0);
  }

  const records = readJSONL(HISTORY_LOG);
  const summary = { ok: true, total: records.length };

  if (doBackfill) {
    summary.backfill = backfillRecords(records, windowDays);
  }
  if (doEmbed) {
    summary.embed = await embedRecords(records);
  }

  writeJSONLAtomic(HISTORY_LOG, records);

  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`roadmap-pass-record — ${records.length} records`);
    if (summary.backfill) console.log(`  backfill: updated=${summary.backfill.updated} skipped=${summary.backfill.skipped}${summary.backfill.reason ? ` (${summary.backfill.reason})` : ""}`);
    if (summary.embed) console.log(`  embed:    updated=${summary.embed.updated} skipped=${summary.embed.skipped} failed=${summary.embed.failed}`);
  }
}

main().catch((e) => {
  console.error(`roadmap-pass-record error: ${e.message}`);
  process.exit(1);
});
