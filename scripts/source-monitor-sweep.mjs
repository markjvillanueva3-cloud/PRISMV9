#!/usr/bin/env node
/**
 * source-monitor-sweep.mjs — AUTO-LEARNING-LOOP-MS0 / U-ALL01 step-3
 * ===================================================================
 *
 * CLI that polls the 10 reputable AI/ML feeds and writes the results to
 * `state/shared/source-monitor-log.jsonl`. Intended to be invoked by the
 * 4-hour cron registered in step-4 (every 4h at minute 7 — see step-4 cron
 * spec for the exact 5-field expression; can't inline here without breaking
 * this JSDoc block comment).
 *
 * Self-contained — does NOT import the TypeScript engine (avoids tsx /
 * dist-bundle dependency in cron). The polling primitives (fetch, RSS
 * regex extraction, MITM hostname check, conditional GET headers) are
 * kept in sync with `mcp-server/src/engines/ReputableSourceMonitorEngine.ts`
 * by convention — if you change the engine's source list or parser, mirror
 * the change here. The dispatcher action `prism_dev:source_sweep` (step-5)
 * routes through the engine for MCP callers and is the preferred entry
 * point when running inside the long-lived MCP server (state survives).
 *
 * Usage:
 *   node scripts/source-monitor-sweep.mjs           # full sweep, write JSONL
 *   node scripts/source-monitor-sweep.mjs --once    # same — alias for cron
 *   node scripts/source-monitor-sweep.mjs --dry-run # poll but don't write log
 *   node scripts/source-monitor-sweep.mjs --json    # emit aggregated JSON to stdout
 *
 * Exit codes:
 *   0 — sweep completed (at least one source returned items)
 *   1 — sweep failed (every source errored)
 *   2 — IO / argument error
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL01
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const OUT_PATH = resolve(REPO_ROOT, "state/shared/source-monitor-log.jsonl");

// ─── Configuration (mirror of engine's DEFAULT_SOURCES) ──────────────

const SOURCES = [
  { slug: "arxiv-cs-ai", type: "rss", url: "https://export.arxiv.org/rss/cs.AI", description: "arXiv cs.AI new submissions" },
  { slug: "anthropic-blog", type: "rss", url: "https://www.anthropic.com/news/rss.xml", description: "Anthropic news / blog" },
  { slug: "hf-papers", type: "rss", url: "https://huggingface.co/papers/rss", description: "HuggingFace daily papers" },
  { slug: "github-anthropics-releases", type: "atom", url: "https://github.com/anthropics.atom", description: "GitHub anthropics org activity" },
  { slug: "hn-frontpage", type: "rss", url: "https://news.ycombinator.com/rss", description: "Hacker News front page" },
  { slug: "rsshub-x-ai", type: "rss", url: "https://rsshub.app/x/topic/9000000000000", description: "X AI topic via RSSHub" },
  { slug: "cloudflare-changelog", type: "rss", url: "https://developers.cloudflare.com/changelog/rss.xml", description: "Cloudflare developer changelog" },
  { slug: "langchain-blog", type: "rss", url: "https://blog.langchain.dev/rss/", description: "LangChain blog" },
  { slug: "moonshot-blog", type: "rss", url: "https://moonshot.cn/blog/rss", description: "Moonshot AI blog" },
  { slug: "arxiv-cs-ma", type: "rss", url: "https://export.arxiv.org/rss/cs.MA", description: "arXiv cs.MA (multi-agent systems)" },
];

const FETCH_TIMEOUT_MS = 30_000;
const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;
const SUMMARY_MAX_LENGTH = 2048;
const USER_AGENT = "PRISM-SourceMonitor/1.0 (+https://github.com/markjvillanueva3-cloud/prism)";

// ─── CLI args ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const opts = {
  once: args.includes("--once"),
  dryRun: args.includes("--dry-run"),
  json: args.includes("--json"),
  help: args.includes("--help") || args.includes("-h"),
};

if (opts.help) {
  process.stdout.write(`source-monitor-sweep — poll 10 reputable AI/ML feeds, append to source-monitor-log.jsonl

  --once       single sweep (default)
  --dry-run    poll but don't write the JSONL log
  --json       emit aggregated JSON summary to stdout
  --help, -h   this help
`);
  process.exit(0);
}

// ─── Parsers (mirror of engine's parseRSS / parseAtom / firstTagText) ─

function firstTagText(block, tag) {
  const sanitized = block.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_m, inner) => inner.replace(/[<>&]/g, " "));
  const re = new RegExp(`<${tag}\\b[^>]*?(?:/>|>([\\s\\S]*?)<\\/${tag}>)`, "i");
  const m = re.exec(sanitized);
  if (!m) return "";
  return (m[1] ?? "").trim();
}

function truncate(s, max) {
  return s.length <= max ? s : s.slice(0, max);
}

function parseRSS(xml, slug) {
  if (!/<rss\b/i.test(xml)) {
    if (/<feed\b[^>]*xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/i.test(xml)) {
      throw new Error("not_rss_got_atom");
    }
    throw new Error("not_rss");
  }
  const items = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = firstTagText(block, "title");
    const link = firstTagText(block, "link");
    const guid = firstTagText(block, "guid") || link || `${slug}:${title}:${firstTagText(block, "pubDate") || ""}`;
    const published = firstTagText(block, "pubDate") || firstTagText(block, "date");
    const summary = firstTagText(block, "description") || firstTagText(block, "summary");
    items.push({
      source: slug,
      guid,
      title,
      link: link || undefined,
      published: published || undefined,
      summary: summary ? truncate(summary, SUMMARY_MAX_LENGTH) : undefined,
    });
  }
  return items;
}

function parseAtom(xml, slug) {
  if (!/<feed\b/i.test(xml)) {
    throw new Error("not_atom");
  }
  const items = [];
  const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = firstTagText(block, "title");
    const id = firstTagText(block, "id");
    const published = firstTagText(block, "published") || firstTagText(block, "updated");
    const summary = firstTagText(block, "summary") || firstTagText(block, "content");
    let link;
    const linkMatch = block.match(/<link\b[^>]*\bhref="([^"]+)"/i);
    if (linkMatch) link = linkMatch[1];
    const guid = id || link || `${slug}:${title}:${published || ""}`;
    items.push({
      source: slug,
      guid,
      title,
      link,
      published: published || undefined,
      summary: summary ? truncate(summary, SUMMARY_MAX_LENGTH) : undefined,
    });
  }
  return items;
}

// ─── Poller ──────────────────────────────────────────────────────────

async function pollOne(cfg) {
  const start = Date.now();
  const acceptHeader =
    cfg.type === "atom" ? "application/atom+xml, application/xml; q=0.9, */*; q=0.1"
    : cfg.type === "rss" ? "application/rss+xml, application/xml; q=0.9, */*; q=0.1"
    : "*/*";
  const headers = { "User-Agent": USER_AGENT, Accept: acceptHeader };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(cfg.url, { headers, signal: ctrl.signal, redirect: "follow" });
  } catch (err) {
    clearTimeout(timer);
    return {
      source: cfg.slug,
      status: "error",
      items: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
  clearTimeout(timer);

  if (response.status === 304) {
    return { source: cfg.slug, status: "not_modified", items: [], httpStatus: 304, durationMs: Date.now() - start };
  }
  if (response.status === 429) {
    return { source: cfg.slug, status: "rate_limited", items: [], httpStatus: 429, error: "rate_limited", durationMs: Date.now() - start };
  }
  if (!response.ok) {
    return { source: cfg.slug, status: "error", items: [], httpStatus: response.status, error: `http_${response.status}`, durationMs: Date.now() - start };
  }

  // MITM defense.
  try {
    if (response.url && new URL(response.url).hostname !== new URL(cfg.url).hostname) {
      return {
        source: cfg.slug,
        status: "error",
        items: [],
        httpStatus: response.status,
        error: `redirect_host_mismatch: expected=${new URL(cfg.url).hostname} got=${new URL(response.url).hostname}`,
        durationMs: Date.now() - start,
      };
    }
  } catch {
    return { source: cfg.slug, status: "error", items: [], error: "malformed_response_url", durationMs: Date.now() - start };
  }

  // Body read with hard cap. bytes is captured in outer scope so the post-
  // parse return path can include it without a TDZ ReferenceError.
  let text;
  let bytes = 0;
  try {
    const buf = await response.arrayBuffer();
    bytes = buf.byteLength;
    if (bytes > MAX_PAYLOAD_BYTES) {
      return {
        source: cfg.slug,
        status: "error",
        items: [],
        error: `payload_exceeded_${MAX_PAYLOAD_BYTES}_bytes`,
        durationMs: Date.now() - start,
      };
    }
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch (err) {
    return {
      source: cfg.slug,
      status: "error",
      items: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }

  try {
    const items = cfg.type === "rss" ? parseRSS(text, cfg.slug)
      : cfg.type === "atom" ? parseAtom(text, cfg.slug)
      : (() => { throw new Error(`unsupported_type: ${cfg.type}`); })();
    return {
      source: cfg.slug,
      status: "ok",
      items,
      httpStatus: response.status,
      bytes,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      source: cfg.slug,
      status: "error",
      items: [],
      httpStatus: response.status,
      error: `malformed_${cfg.type}: ${err instanceof Error ? err.message : String(err)}`,
      bytes,
      durationMs: Date.now() - start,
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];
  let totalItems = 0;
  let ok = 0;
  let rateLimited = 0;
  let errors = 0;
  let notModified = 0;
  // Sequential — don't slam one network with 10 concurrent requests.
  for (const cfg of SOURCES) {
    const r = await pollOne(cfg);
    results.push(r);
    totalItems += r.items.length;
    if (r.status === "ok") ok++;
    else if (r.status === "rate_limited") rateLimited++;
    else if (r.status === "not_modified") notModified++;
    else errors++;
  }
  const finishedAt = new Date().toISOString();
  const aggregate = { startedAt, finishedAt, results, totalItems, ok, notModified, rateLimited, errors };

  if (opts.json) {
    process.stdout.write(JSON.stringify(aggregate, null, 2) + "\n");
  } else {
    process.stdout.write(`source-monitor-sweep: ${totalItems} items across ${results.length} sources\n`);
    process.stdout.write(`  ok=${ok}  not_modified=${notModified}  rate_limited=${rateLimited}  errors=${errors}\n`);
    process.stdout.write(`  duration=${Date.now() - new Date(startedAt).getTime()}ms\n`);
  }

  if (!opts.dryRun) {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    for (const r of results) {
      appendFileSync(
        OUT_PATH,
        JSON.stringify({ sweep_at: finishedAt, ...r }) + "\n",
      );
    }
    if (!opts.json) {
      process.stdout.write(`  log: ${OUT_PATH}\n`);
    }
  }

  // Exit 0 if at least one source returned items; 1 if every source errored.
  process.exit(totalItems === 0 && ok === 0 ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(2);
});
