#!/usr/bin/env node
/**
 * populate-tribal-vault.mjs — write per-tip markdown into knowledge/tribal/
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U03.
 *
 * Walks every *-tips*.ts and tribal-* tip catalog under
 * `mcp-server/src/data/`, dumps the combined tip ledger via
 * `scripts/dump-all-tips.ts --out`, and writes one markdown file per tip
 * to `H:/prism/knowledge/tribal/{slug}.md` with frontmatter + Obsidian
 * backlinks based on shared tags. Each tip is then embedded into Qdrant
 * via `prism_memory:remember` (kind="tip"). Embedding failures are
 * logged in stats but never abort the run — the on-disk file is the
 * durability win.
 *
 * Filename: `{source-stem}-{id-or-slug}.md` — collisions broken with a
 * numeric suffix.
 *
 * Frontmatter fields:
 *   id, source (string in tip), confidence (0-100), category, tags[],
 *   _source (file basename), indexed_at (ISO).
 *
 * Backlinks: a "## Related" section listing up to 5 sibling tips with
 * the strongest tag overlap (and a non-overlap fallback when a tip has
 * no shared tags with anyone — never leave a related section empty for
 * "lonely" tips so the vault graph stays connected).
 *
 * Usage:
 *   node scripts/populate-tribal-vault.mjs
 *   node scripts/populate-tribal-vault.mjs --no-embed   # skip Qdrant
 *   node scripts/populate-tribal-vault.mjs --dry-run    # report only
 *   node scripts/populate-tribal-vault.mjs --limit=N    # cap tips for tests
 *
 * Exit:
 *   0 — JSON summary on stdout
 *   1 — fatal (cannot run dump or zero tips found)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U03
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const TRIBAL_VAULT = "H:/prism/knowledge/tribal";
const DUMP_OUT = "H:/prism/data/cache/tribal-tips-dump.json";
const DUMP_SCRIPT = "H:/prism/mcp-server/scripts/dump-all-tips.ts";
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;
const MAX_RELATED = 5;
const MAX_BODY_EMBED = 8_192;

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false, limit: 0 };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 0) {
        process.stderr.write(`Invalid --limit: ${a}\n`);
        process.exit(2);
      }
      out.limit = Math.floor(n);
    } else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/populate-tribal-vault.mjs [--dry-run] [--no-embed] [--limit=N]\n");
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tip";
}

function sourceStem(file) {
  return String(file ?? "")
    .replace(/\.ts$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "src";
}

function escapeYaml(v) {
  if (v == null) return '""';
  const s = String(v).replace(/\r?\n/g, " ").replace(/"/g, '\\"');
  return `"${s}"`;
}

function tagsToYaml(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "[]";
  const cleaned = tags.map((t) => String(t).replace(/[\r\n]/g, " ").trim()).filter(Boolean);
  if (cleaned.length === 0) return "[]";
  return `[${cleaned.map((t) => escapeYaml(t)).join(", ")}]`;
}

function dumpTips() {
  if (!fs.existsSync(DUMP_SCRIPT)) {
    process.stderr.write(`dump script missing: ${DUMP_SCRIPT}\n`);
    process.exit(1);
  }
  ensureDir(path.dirname(DUMP_OUT));
  const require_ = createRequire(import.meta.url);
  let tsxLoader;
  try {
    tsxLoader = require_.resolve("tsx/cli");
  } catch {
    process.stderr.write("tsx loader not found — install tsx in mcp-server\n");
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [tsxLoader, DUMP_SCRIPT, "--out", DUMP_OUT], {
    encoding: "utf8",
    timeout: 90_000,
    cwd: "H:/prism",
  });
  if (r.status !== 0) {
    process.stderr.write(`dump failed (status=${r.status}): ${r.stderr ?? ""}\n`);
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DUMP_OUT, "utf8"));
  } catch (e) {
    process.stderr.write(`cannot parse dump: ${e?.message ?? e}\n`);
    process.exit(1);
  }
  if (!Array.isArray(data.tips) || data.tips.length === 0) {
    process.stderr.write("dump produced 0 tips\n");
    process.exit(1);
  }
  return data;
}

/**
 * For each tip, pick up to MAX_RELATED siblings: highest tag overlap first,
 * then differing _source so cross-vendor wisdom links. Tips with zero
 * shared tags fall back to "same category, different source".
 */
function buildRelated(tips, indexById) {
  const tagIndex = new Map();
  for (const t of tips) {
    if (!Array.isArray(t.tags)) continue;
    for (const tag of t.tags) {
      const key = String(tag).trim().toLowerCase();
      if (!key) continue;
      if (!tagIndex.has(key)) tagIndex.set(key, []);
      tagIndex.get(key).push(t.__key);
    }
  }
  const categoryIndex = new Map();
  for (const t of tips) {
    const c = String(t.category ?? "").trim().toLowerCase();
    if (!c) continue;
    if (!categoryIndex.has(c)) categoryIndex.set(c, []);
    categoryIndex.get(c).push(t.__key);
  }

  const related = new Map();
  for (const t of tips) {
    const counts = new Map();
    if (Array.isArray(t.tags)) {
      for (const tag of t.tags) {
        const key = String(tag).trim().toLowerCase();
        if (!key) continue;
        const peers = tagIndex.get(key) ?? [];
        for (const k of peers) {
          if (k === t.__key) continue;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
    }
    let picks = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_RELATED)
      .map(([k]) => k);

    if (picks.length === 0) {
      const c = String(t.category ?? "").trim().toLowerCase();
      const peers = (categoryIndex.get(c) ?? []).filter((k) => k !== t.__key).slice(0, MAX_RELATED);
      picks = peers;
    }
    related.set(t.__key, picks);
  }
  return related;
}

function tipFilename(tip, usedNames) {
  const stem = sourceStem(tip._source);
  const idPart = slugify(tip.id ?? tip.title ?? "tip");
  let base = `${stem}-${idPart}`;
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  let i = 2;
  while (usedNames.has(`${base}-${i}`)) i++;
  const final = `${base}-${i}`;
  usedNames.add(final);
  return final;
}

function renderTipMarkdown(tip, relatedKeys, indexByKey) {
  const indexedAt = new Date().toISOString();
  const fmLines = [
    "---",
    `id: ${escapeYaml(tip.id ?? "")}`,
    `title: ${escapeYaml(tip.title ?? "")}`,
    `source: ${escapeYaml(tip.source ?? "")}`,
    `confidence: ${Number.isFinite(Number(tip.confidence)) ? Number(tip.confidence) : 0}`,
    `category: ${escapeYaml(tip.category ?? "")}`,
    `tags: ${tagsToYaml(tip.tags)}`,
    `_source: ${escapeYaml(tip._source ?? "")}`,
    `indexed_at: ${indexedAt}`,
    "---",
    "",
  ];
  const titleLine = String(tip.title ?? tip.id ?? "Untitled tip").trim();
  const body = String(tip.body ?? tip.text ?? "").trim();
  const meta = [];
  if (tip.category) meta.push(`**Category:** ${tip.category}`);
  if (tip.confidence != null) meta.push(`**Confidence:** ${tip.confidence}`);
  if (tip.source) meta.push(`**Source:** ${tip.source}`);
  if (Array.isArray(tip.operation_types) && tip.operation_types.length > 0) {
    meta.push(`**Operations:** ${tip.operation_types.join(", ")}`);
  }
  const relatedList = relatedKeys
    .map((k) => indexByKey.get(k))
    .filter(Boolean)
    .map((rt) => `- [[${rt.__filename}|${(rt.title ?? rt.id ?? rt.__filename).toString().trim()}]]`);
  const sections = [
    fmLines.join("\n"),
    `# ${titleLine}`,
    "",
    body || "_(empty body)_",
    "",
    meta.length > 0 ? meta.join("\n") + "\n" : "",
    "## Related",
    relatedList.length > 0 ? relatedList.join("\n") : "_(no related tips)_",
    "",
  ];
  return sections.join("\n");
}

async function tryEmbed(id, text, metadata) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "prism_memory",
          arguments: { action: "remember", params: { kind: "tip", id, text, metadata } },
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
    } catch {
      return { ok: false, reason: "bad-inner-json" };
    }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

function bodyHash(filenameContent) {
  // strip frontmatter so indexed_at jitter doesn't trigger rewrites
  return filenameContent.replace(/^---[\s\S]*?---\n+/, "");
}

async function main() {
  const args = parseArgs(process.argv);
  const data = dumpTips();
  let tips = data.tips;
  if (args.limit > 0) tips = tips.slice(0, args.limit);

  const usedNames = new Set();
  const indexByKey = new Map();
  for (const t of tips) {
    t.__key = `${t._source}::${t.id ?? slugify(t.title ?? "tip")}`;
    t.__filename = tipFilename(t, usedNames);
    indexByKey.set(t.__key, t);
  }

  const related = buildRelated(tips, indexByKey);

  ensureDir(TRIBAL_VAULT);
  const stats = {
    target: TRIBAL_VAULT,
    sources: data.sources.length,
    tipsTotal: tips.length,
    written: 0,
    skipped: 0,
    embedAttempted: !args.noEmbed && !args.dryRun,
    embedded: 0,
    embedFailed: 0,
    dryRun: args.dryRun,
  };

  for (const tip of tips) {
    const md = renderTipMarkdown(tip, related.get(tip.__key) ?? [], indexByKey);
    const target = path.join(TRIBAL_VAULT, `${tip.__filename}.md`);
    if (args.dryRun) {
      stats.written++;
      continue;
    }
    let mustWrite = true;
    if (fs.existsSync(target)) {
      try {
        const existing = fs.readFileSync(target, "utf8");
        if (bodyHash(existing) === bodyHash(md)) {
          stats.skipped++;
          mustWrite = false;
        }
      } catch {
        // fall through to overwrite
      }
    }
    if (mustWrite) {
      fs.writeFileSync(target, md);
      stats.written++;
    }

    if (!args.noEmbed) {
      const embedText = `${tip.title ?? tip.id ?? ""}\n\n${tip.body ?? tip.text ?? ""}`.slice(0, MAX_BODY_EMBED);
      const r = await tryEmbed(tip.__key, embedText, {
        source: tip.source ?? "",
        _source: tip._source ?? "",
        category: tip.category ?? "",
        confidence: Number(tip.confidence ?? 0),
        tags: Array.isArray(tip.tags) ? tip.tags : [],
        filename: `${tip.__filename}.md`,
      });
      if (r.ok) stats.embedded++;
      else stats.embedFailed++;
    }
  }

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
