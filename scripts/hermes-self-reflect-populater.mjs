#!/usr/bin/env node
// scripts/hermes-self-reflect-populater.mjs
// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B3-HMEMV06 (2026-05-27, slot:alpha):
// Weekly Hermes-reflects-on-own-memories populater. Reads past 7 days of
// memories from knowledge/memories/{feedback,reference,project}/*.md, groups
// by type, computes top-recurring keywords, writes a markdown digest at
// knowledge/memories/weekly-hermes-reflection-<anchor>.md (root, NOT inside
// generated/ — keeps it out of the sister B4 engine's namespace).
//
// IMPORTANT (R12 fail-loud): prism_memory:weekly_synthesis_get is owned by
// WeeklySynthesisEngine.runWeekly() and reads ONLY <vaultRoot>/generated/
// WEEKLY-<ISO-year>-W<NN>.md. This populater's output is NOT served by that
// action today — discoverable only via filesystem read or memory_search MCP.
// Wiring the dispatcher to also surface this file is a follow-up unit
// (U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE).
//
// Distinct from WeeklySynthesisEngine: that engine reads DAILY-CONTEXT briefs
// and synthesizes via Ollama. This populater reads Hermes's OWN memory
// namespace (auto-feed Stop-hook output) and produces a purely-mechanical
// aggregation (no LLM dependency, deterministic, fast). Paired weekly with
// the LLM-based sister, both anchored on the same Sunday.
//
// Pure exports: listRecentMemos, groupByType, topKeywords, synthesizeMarkdown.
// CLI: node hermes-self-reflect-populater.mjs [--root <path>] [--days N] [--out <path>] [--anchor YYYY-MM-DD]
//
// Anchor date: defaults to today-UTC snapped back to most-recent Sunday (same
// rule WeeklySynthesisEngine uses, so paired weeklies share an ISO week key).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..", "knowledge", "memories");
const DEFAULT_DAYS = 7;

const MEMO_TYPES = ["feedback", "reference", "project"];

/** Pure: snap a Date back to the most-recent Sunday (UTC). dow 0 = Sunday. */
export function snapToSunday(d) {
  const dow = d.getUTCDay();
  if (dow === 0) return d;
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - dow);
  return out;
}

/** Pure: format Date → YYYY-MM-DD (UTC). */
export function isoDateUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Pure: read recent memos from {root}/{type}/*.md within last {days}. */
export function listRecentMemos({ root, days = DEFAULT_DAYS, now = Date.now(), fsImpl = fs } = {}) {
  const sinceMs = now - days * 24 * 60 * 60 * 1000;
  const out = [];
  for (const type of MEMO_TYPES) {
    const dir = path.join(root, type);
    let entries;
    try {
      entries = fsImpl.readdirSync(dir);
    } catch {
      continue; // missing dir = empty contribution, not a failure
    }
    for (const name of entries) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(dir, name);
      let stat;
      try {
        stat = fsImpl.statSync(file);
      } catch {
        continue;
      }
      if (stat.mtimeMs < sinceMs) continue;
      let content = "";
      try {
        content = fsImpl.readFileSync(file, "utf8");
      } catch {
        content = "";
      }
      out.push({ path: file, name, type, mtimeMs: stat.mtimeMs, content });
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

/** Pure: group memos by type, preserving recency-sort within each group. */
export function groupByType(memos) {
  const groups = { feedback: [], reference: [], project: [] };
  for (const m of memos) {
    if (groups[m.type]) groups[m.type].push(m);
  }
  return groups;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "to", "of", "in", "on", "at",
  "for", "with", "from", "by", "as", "if", "then", "than", "this", "that",
  "these", "those", "it", "its", "not", "no", "yes", "so", "what", "when",
  "where", "who", "why", "how", "all", "any", "some", "each", "every", "new",
  "use", "used", "uses", "via", "per", "see", "also", "one", "two", "three",
  "you", "your", "yours", "we", "our", "ours", "us", "they", "them", "their",
]);

/** Pure: top-K recurring multi-character lowercase words across all memo content. */
export function topKeywords(memos, k = 12) {
  const counts = new Map();
  for (const m of memos) {
    const words = m.content.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
    for (const w of words) {
      if (STOP_WORDS.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);
}

/** Pure: render markdown digest from grouped memos + keywords + anchor date. */
export function synthesizeMarkdown({ grouped, keywords, anchor, days = DEFAULT_DAYS, total }) {
  const lines = [];
  lines.push(`---`);
  lines.push(`title: "Hermes weekly self-reflection (anchor ${anchor})"`);
  lines.push(`anchor: ${anchor}`);
  lines.push(`window_days: ${days}`);
  lines.push(`memo_count: ${total}`);
  lines.push(`source: hermes-self-reflect-populater.mjs`);
  lines.push(`unit: U-GALAXY-MS1-B3-HMEMV06`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`# Hermes weekly self-reflection — anchor ${anchor}`);
  lines.push(``);
  lines.push(`Window: last ${days} days · total memos: ${total} · by type — ` +
    MEMO_TYPES.map(t => `${t}=${grouped[t].length}`).join(" / "));
  lines.push(``);
  lines.push(`## Top recurring keywords`);
  lines.push(``);
  if (keywords.length === 0) {
    lines.push(`_(no keywords — no memos in window)_`);
  } else {
    for (const [w, c] of keywords) lines.push(`- \`${w}\` × ${c}`);
  }
  lines.push(``);

  for (const type of MEMO_TYPES) {
    const list = grouped[type];
    lines.push(`## ${type[0].toUpperCase() + type.slice(1)} (${list.length})`);
    lines.push(``);
    if (list.length === 0) {
      lines.push(`_(none in window)_`);
    } else {
      for (const m of list) {
        const firstHeading = (m.content.match(/^#\s+(.+)$/m) || [, m.name])[1].trim().slice(0, 120);
        const mtimeIso = new Date(m.mtimeMs).toISOString().slice(0, 10);
        lines.push(`- **${mtimeIso}** [\`${m.name}\`](${path.relative(path.dirname(path.dirname(m.path)), m.path).replace(/\\/g, "/")}) — ${firstHeading}`);
      }
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`_Auto-generated by \`scripts/hermes-self-reflect-populater.mjs\` — mechanical aggregation (no LLM). Re-run weekly to refresh. Paired with B4 \`WeeklySynthesisEngine\` (DAILY-CONTEXT synthesis via Ollama)._`);
  return lines.join("\n") + "\n";
}

export function run({ root = DEFAULT_ROOT, days = DEFAULT_DAYS, out, anchor, now = Date.now(), fsImpl = fs } = {}) {
  const anchorDate = anchor || isoDateUTC(snapToSunday(new Date(now)));
  const memos = listRecentMemos({ root, days, now, fsImpl });
  const grouped = groupByType(memos);
  const keywords = topKeywords(memos);
  const md = synthesizeMarkdown({ grouped, keywords, anchor: anchorDate, days, total: memos.length });
  const outPath = out || path.join(root, `weekly-hermes-reflection-${anchorDate}.md`);
  try {
    fsImpl.mkdirSync(path.dirname(outPath), { recursive: true });
    fsImpl.writeFileSync(outPath, md, "utf8");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return {
    ok: true,
    path: outPath,
    anchor: anchorDate,
    memo_count: memos.length,
    by_type: {
      feedback: grouped.feedback.length,
      reference: grouped.reference.length,
      project: grouped.project.length,
    },
    keywords_top: keywords, // [word, count][] — arm-B P1: was previously a misnamed scalar count
    keywords_count: keywords.length,
  };
}

// CLI guard. `argv1 &&` guards the empty-argv1 case (node -e / programmatic import): without it,
// thisUrl.endsWith("") is ALWAYS true, so importing this module would run the full self-reflect synth.
const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
const thisUrl = import.meta.url.replace(/\\/g, "/");
if (argv1 && (thisUrl === `file:///${argv1}` || thisUrl.endsWith(argv1))) {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--root") opts.root = args[++i];
    else if (a === "--days") opts.days = Number(args[++i]);
    else if (a === "--out") opts.out = args[++i];
    else if (a === "--anchor") opts.anchor = args[++i];
  }
  const r = run(opts);
  if (r.ok) {
    process.stdout.write(JSON.stringify(r) + "\n");
    process.exit(0);
  } else {
    process.stderr.write(JSON.stringify(r) + "\n");
    process.exit(2);
  }
}
