#!/usr/bin/env node
/**
 * dream-session-walk.mjs — nightly walker that turns observed corrections +
 * error patterns into per-slot DreamProposalBatch (HSE06 surface).
 *
 * Reads:
 *   - state/shared/AGENT_CHAT.jsonl    (recent fleet-wide chat events)
 *   - state/shared/error-pattern-ledger.jsonl  (capture errors keyed by slot)
 *   - state/shared/slot-souls/<slot>.md  (for current_refuse_list)
 *
 * Writes:
 *   - state/shared/dream-queue/dream-<slot>-<YYYY-MM-DD>.json
 *
 * Operator promotes manually from the queue file into the soul's refuse_list.
 *
 * Usage:
 *   node H:/prism/scripts/dream-session-walk.mjs [--slot <name>] [--horizon 24h]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SOULS_DIR = join(REPO_ROOT, "state/shared/slot-souls");
const CHAT_PATH = join(REPO_ROOT, "state/shared/AGENT_CHAT.jsonl");
const ERROR_LEDGER = join(REPO_ROOT, "state/shared/error-pattern-ledger.jsonl");
const OUT_DIR = join(REPO_ROOT, "state/shared/dream-queue");

const args = process.argv.slice(2);
const argSlot = args.includes("--slot") ? args[args.indexOf("--slot") + 1] : null;
const argHorizonRaw = args.includes("--horizon") ? args[args.indexOf("--horizon") + 1] : "24h";

function horizonMs(s) {
  const m = String(s).match(/^(\d+)(h|d)$/);
  if (!m) return 24 * 3600 * 1000;
  return parseInt(m[1], 10) * (m[2] === "d" ? 86_400_000 : 3_600_000);
}

const STOPWORD = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "for", "and", "or", "in", "on", "at"]);
function corrToken(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORD.has(w))
    .slice(0, 6)
    .join("-")
    .slice(0, 96);
}

function parseFm(source, slot) {
  const re = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const m = source.match(re);
  if (!m) return null;
  const fields = { slot, refuse_list: [] };
  let curList = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.length) continue;
    if (curList && /^\s{2,}-\s+/.test(line)) {
      const item = line.replace(/^\s*-\s+/, "").trim();
      if (item) curList.push(item);
      continue;
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v === "") { curList = []; fields[kv[1]] = curList; } else { fields[kv[1]] = v; curList = null; }
  }
  return fields;
}

function readJsonl(path, sinceMs) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const ln of lines) {
    try {
      const ev = JSON.parse(ln);
      const t = ev.at ? Date.parse(ev.at) : ev.ts ? Number(ev.ts) : NaN;
      if (Number.isFinite(t) && t >= sinceMs) out.push(ev);
    } catch {}
  }
  return out;
}

function bucketCorrectionsBySlot(chatEvents) {
  const m = new Map();
  for (const ev of chatEvents) {
    if (!ev.slot) continue;
    if (!ev.kind || (ev.kind !== "correction" && ev.kind !== "operator-correction")) continue;
    const text = ev.text || ev.message || "";
    if (!text) continue;
    const list = m.get(ev.slot) || [];
    list.push({ text: String(text).slice(0, 500), source: String(ev.source || "chat-bus"), at: ev.at });
    m.set(ev.slot, list);
  }
  return m;
}

function bucketErrorPatternsBySlot(errorEvents) {
  const m = new Map();
  for (const ev of errorEvents) {
    if (!ev.slot || !ev.pattern) continue;
    const inner = m.get(ev.slot) || new Map();
    inner.set(ev.pattern, (inner.get(ev.pattern) || 0) + (Number(ev.count) || 1));
    m.set(ev.slot, inner);
  }
  // Convert inner Map → [{pattern,count}] arrays.
  const out = new Map();
  for (const [slot, inner] of m.entries()) {
    out.set(slot, Array.from(inner.entries()).map(([pattern, count]) => ({ pattern, count })));
  }
  return out;
}

function propose({ slot, current_refuse_list, corrections, error_patterns, min_repetitions = 2 }) {
  const buckets = new Map();
  for (const c of corrections) {
    const t = corrToken(c.text);
    if (!t) continue;
    const list = buckets.get(t) || [];
    list.push(c);
    buckets.set(t, list);
  }
  const existing = new Set((current_refuse_list || []).map((r) => r.toLowerCase()));
  const refuse_rules = [];
  let filtered = 0;
  for (const [token, corrs] of buckets.entries()) {
    if (corrs.length < min_repetitions || existing.has(token)) { filtered += corrs.length; continue; }
    refuse_rules.push({ rule: token, source_correction: corrs[0].text.slice(0, 200), observed_count: corrs.length });
  }
  refuse_rules.sort((a, b) => b.observed_count - a.observed_count);

  const skills = [];
  const skillThresh = min_repetitions * 2;
  for (const ep of error_patterns) {
    if (ep.count < skillThresh) continue;
    const tok = corrToken(ep.pattern);
    if (!tok || existing.has(tok)) continue;
    skills.push({ name: `skill-${tok.slice(0, 40)}`, reason: `recurring error ${ep.count}x`, triggering_pattern: ep.pattern.slice(0, 200), observed_count: ep.count });
  }
  skills.sort((a, b) => b.observed_count - a.observed_count);

  return { slot, refuse_rules, skills, filtered_correction_count: filtered };
}

function main() {
  if (!existsSync(SOULS_DIR)) { console.error("souls dir missing:", SOULS_DIR); process.exit(1); }
  const sinceMs = Date.now() - horizonMs(argHorizonRaw);
  const chatEvents = readJsonl(CHAT_PATH, sinceMs);
  const errEvents = readJsonl(ERROR_LEDGER, sinceMs);
  const corrBySlot = bucketCorrectionsBySlot(chatEvents);
  const errBySlot = bucketErrorPatternsBySlot(errEvents);

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  const allSlotFiles = readdirSync(SOULS_DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
  const targetSlots = argSlot ? [argSlot] : allSlotFiles.map((f) => f.replace(/\.md$/, ""));
  let emitted = 0;
  for (const slot of targetSlots) {
    const path = join(SOULS_DIR, `${slot}.md`);
    if (!existsSync(path)) continue;
    const soul = parseFm(readFileSync(path, "utf8"), slot);
    if (!soul) continue;
    const batch = propose({
      slot,
      current_refuse_list: soul.refuse_list || [],
      corrections: corrBySlot.get(slot) || [],
      error_patterns: errBySlot.get(slot) || [],
    });
    if (batch.refuse_rules.length === 0 && batch.skills.length === 0) continue;
    const outPath = join(OUT_DIR, `dream-${slot}-${today}.json`);
    writeFileSync(outPath, JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), horizon: argHorizonRaw, batch }, null, 2));
    emitted += 1;
    console.log(`✓ ${slot}: refuses=${batch.refuse_rules.length} skills=${batch.skills.length} → ${outPath}`);
  }
  if (emitted === 0) console.log("(no proposals emitted — no recurring corrections/errors in horizon)");
}

if (process.argv[1] && process.argv[1].endsWith("dream-session-walk.mjs")) main();
