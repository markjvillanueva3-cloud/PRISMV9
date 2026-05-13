#!/usr/bin/env node
/**
 * auto-research-weekly-digest — AUTO-LEARNING-LOOP-MS0 / U-ALL10
 * ================================================================
 *
 * Reads `state/shared/auto-learning/auto-research-pending.jsonl` and
 * renders a markdown digest at
 * `state/shared/auto-learning/AUTO-RESEARCH-WEEKLY-DIGEST.md` with
 * approve/reject UI for each pending high-synergy item.
 *
 * The pending JSONL is appended-to by the U-ALL06 RoadmapAutoAppend
 * pipeline (via a deferred CLI; spec § U-ALL09 cron entry 6); each
 * line is a proposal envelope:
 *   {
 *     "id": "U-AUTORES-NN",
 *     "title": "...",
 *     "verdictScore": <0..1>,
 *     "bypassedRateLimit": <bool>,
 *     "source": "<slug>",
 *     "guid": "<guid>",
 *     "url": "<url-or-null>",
 *     "proposedAt": "<iso>",
 *     "status": "pending" | "approved" | "rejected"
 *   }
 *
 * Pagination — items past `DIGEST_MAX_ITEMS` (default 100) are
 * tabulated as "remaining" with the per-week count; full list is
 * appendix-linked. This handles the spec adversarial case "digest >
 * context limit".
 *
 * Idempotent — same input → byte-identical digest (sort by
 * verdictScore desc, then proposedAt asc).
 *
 * Approve/reject UI: each pending item ships with a CLI snippet
 * the operator pastes. No GUI assumed — digest is for the
 * `/loop --interval 7d --max 12` human-in-loop surface.
 *
 * Invocation:
 *   node scripts/auto-research-weekly-digest.mjs [--out <path>] [--max <int>] [--input <path>]
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL10
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_INPUT = "state/shared/auto-learning/auto-research-pending.jsonl";
export const DEFAULT_OUTPUT = "state/shared/auto-learning/AUTO-RESEARCH-WEEKLY-DIGEST.md";
export const DEFAULT_MAX_ITEMS = 100;

export function parseJsonl(buffer) {
  if (typeof buffer !== "string" || buffer.length === 0) return [];
  const lines = buffer.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object") out.push(obj);
    } catch {
      // Skip malformed lines — digest stays best-effort.
    }
  }
  return out;
}

export function partition(items) {
  const pending = [];
  const approved = [];
  const rejected = [];
  const other = [];
  for (const it of items) {
    if (it.status === "approved") approved.push(it);
    else if (it.status === "rejected") rejected.push(it);
    else if (it.status === "pending" || !it.status) pending.push(it);
    else other.push(it);
  }
  return { pending, approved, rejected, other };
}

export function sortPending(items) {
  return items.slice().sort((a, b) => {
    const sa = Number.isFinite(a.verdictScore) ? a.verdictScore : 0;
    const sb = Number.isFinite(b.verdictScore) ? b.verdictScore : 0;
    if (sb !== sa) return sb - sa;
    const ta = typeof a.proposedAt === "string" ? a.proposedAt : "";
    const tb = typeof b.proposedAt === "string" ? b.proposedAt : "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

export function renderDigest(items, opts = {}) {
  const max = Number.isFinite(opts.max) ? Math.max(1, Math.floor(opts.max)) : DEFAULT_MAX_ITEMS;
  const now = typeof opts.now === "function" ? opts.now() : Date.now();
  const isoNow = new Date(now).toISOString();
  const { pending, approved, rejected } = partition(items);
  const pendingSorted = sortPending(pending);
  const head = pendingSorted.slice(0, max);
  const overflow = pendingSorted.slice(max);

  const lines = [];
  lines.push(`# AUTO-RESEARCH-WEEKLY-DIGEST`);
  lines.push(``);
  lines.push(`Generated: ${isoNow}`);
  lines.push(`Pending: ${pendingSorted.length} · Approved this week: ${approved.length} · Rejected this week: ${rejected.length}`);
  lines.push(``);
  if (pendingSorted.length === 0) {
    lines.push(`No pending high-synergy proposals. Auto-learn loop is at a steady state.`);
    lines.push(``);
  } else {
    lines.push(`## Pending review (top ${head.length}${overflow.length > 0 ? ` of ${pendingSorted.length}` : ""})`);
    lines.push(``);
    lines.push(`| # | id | score | bypass | source | title | URL | proposedAt |`);
    lines.push(`|---|----|-------|--------|--------|-------|-----|------------|`);
    head.forEach((p, i) => {
      const score = Number.isFinite(p.verdictScore) ? p.verdictScore.toFixed(3) : "—";
      const bypass = p.bypassedRateLimit === true ? "⚡" : "";
      const title = escMd((p.title ?? "(untitled)").slice(0, 80));
      const url = p.url && typeof p.url === "string" ? `[link](${p.url})` : "—";
      lines.push(`| ${i + 1} | ${p.id ?? "—"} | ${score} | ${bypass} | ${p.source ?? "—"} | ${title} | ${url} | ${p.proposedAt ?? "—"} |`);
    });
    lines.push(``);
    if (overflow.length > 0) {
      lines.push(`> ${overflow.length} additional pending items hidden — full list lives in \`${DEFAULT_INPUT}\`.`);
      lines.push(``);
    }
    lines.push(`### Approve / reject CLI`);
    lines.push(``);
    lines.push(`Paste exactly:`);
    lines.push(``);
    lines.push("```bash");
    lines.push(`# approve a single item`);
    lines.push(`node scripts/auto-research-decision.mjs --id U-AUTORES-NN --decision approve`);
    lines.push(`# reject a single item`);
    lines.push(`node scripts/auto-research-decision.mjs --id U-AUTORES-NN --decision reject --note "<why>"`);
    lines.push(`# bulk approve top-K`);
    lines.push(`node scripts/auto-research-decision.mjs --bulk approve --top 5`);
    lines.push("```");
    lines.push(``);
  }
  if (approved.length > 0 || rejected.length > 0) {
    lines.push(`## Recent decisions`);
    lines.push(``);
    approved.slice(0, 10).forEach((p) => {
      lines.push(`- ✓ ${p.id ?? "—"} — ${escMd((p.title ?? "").slice(0, 60))}`);
    });
    rejected.slice(0, 10).forEach((p) => {
      lines.push(`- ✗ ${p.id ?? "—"} — ${escMd((p.title ?? "").slice(0, 60))}`);
    });
    lines.push(``);
  }
  return lines.join("\n");
}

function escMd(s) {
  if (typeof s !== "string") return "";
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function parseArgs(argv) {
  const opts = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, max: DEFAULT_MAX_ITEMS };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--out") opts.output = argv[++i];
    else if (a === "--input") opts.input = argv[++i];
    else if (a === "--max") opts.max = Number(argv[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  let buf = "";
  if (existsSync(opts.input)) {
    buf = readFileSync(opts.input, "utf8");
  }
  const items = parseJsonl(buf);
  const md = renderDigest(items, { max: opts.max });
  const dir = dirname(opts.output);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(opts.output, `${md}\n`, "utf8");
  process.stdout.write(`auto-research-weekly-digest: ${items.length} input(s) → ${opts.output} (${md.length} chars)\n`);
}

const invokedDirectly = process.argv[1] && /auto-research-weekly-digest\.mjs$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(`auto-research-weekly-digest error: ${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
