#!/usr/bin/env node
// scripts/read-tweet.mjs -- read a public X/Twitter post or X Article via the
// no-auth syndication endpoint (cdn.syndication.twimg.com/tweet-result).
//
// WHY: x.com hard-blocks unauthenticated programmatic fetches (HTTP 402), and
// the claude-in-chrome extension + Playwright MCP are account-paired / cold-start
// flaky. The syndication endpoint that powers embed widgets is PUBLIC + needs no
// auth, so it bypasses the 402 wall for any public account. Built 2026-06-19
// (slot:zulu) after a full session was lost to the account-gated browser tools.
// Account-independent: works regardless of which Claude account the CLI is on.
//
// LIMIT (R12): for X *Articles* (long-form), syndication exposes the title +
// opening paragraph (preview_text), NOT the full body -- the body still sits
// behind x.com/i/article/<id>. Plain tweets return their full text.
//
// Usage:
//   node scripts/read-tweet.mjs <url-or-id> [<url-or-id> ...] [--json]
//   (accepts full URLs like https://x.com/<user>/status/<id> or bare ids)
// Exit codes: 0 ok, 1 fatal, 2 usage error.

import process from "node:process";

// Extract the 15-25 digit status id from a URL or bare id.
export function extractId(s) {
  const m = String(s).match(/(\d{15,25})/);
  return m ? m[1] : null;
}

// Syndication token: the exact algorithm the official embed widget uses
// (react-tweet getToken): (id/1e15 * PI) in base36, with zeros and the dot removed.
export function synToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

export function buildUrl(id) {
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${synToken(id)}&lang=en`;
}

// Pure parse of the syndication JSON into a compact, stable shape.
export function parseResult(j) {
  if (!j || typeof j !== "object") return null;
  return {
    handle: j.user?.screen_name ?? null,
    text: j.text ?? j.full_text ?? null,
    isArticle: Boolean(j.article),
    title: j.article?.title ?? null,
    preview: j.article?.preview_text ?? null,
    urls: Array.isArray(j.entities?.urls)
      ? j.entities.urls.map((u) => u.expanded_url).filter(Boolean)
      : [],
    created: j.created_at ?? null,
  };
}

async function fetchOne(id) {
  let r;
  try {
    r = await fetch(buildUrl(id), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
    });
  } catch (e) {
    return { id, error: `network: ${e?.message ?? String(e)}` };
  }
  if (!r.ok) return { id, error: `HTTP ${r.status}` };
  let j;
  try {
    j = await r.json();
  } catch (e) {
    return { id, error: `parse: ${e?.message ?? String(e)}` };
  }
  return { id, ...parseResult(j) };
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const ids = args.filter((a) => !a.startsWith("--")).map(extractId).filter(Boolean);
  if (ids.length === 0) {
    process.stderr.write("usage: read-tweet.mjs <url-or-id> [...] [--json]\n");
    process.exit(2);
  }
  const results = [];
  for (const id of ids) {
    try {
      results.push(await fetchOne(id));
    } catch (e) {
      results.push({ id, error: e?.message ?? String(e) });
    }
  }
  if (json) {
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    return;
  }
  for (const x of results) {
    process.stdout.write(`\n=== ${x.handle ? "@" + x.handle : "?"} / ${x.id} ===\n`);
    if (x.error) {
      process.stdout.write(`ERROR: ${x.error}\n`);
      continue;
    }
    if (x.isArticle) {
      process.stdout.write(`ARTICLE: ${x.title ?? "(no title)"}\nPREVIEW: ${x.preview ?? "(no preview)"}\n`);
    } else if (x.text) {
      process.stdout.write(`${x.text}\n`);
    }
    if (x.urls && x.urls.length) process.stdout.write(`URLS: ${x.urls.join(" | ")}\n`);
  }
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("read-tweet.mjs");
if (isDirect) {
  main().catch((e) => {
    process.stderr.write("fatal: " + (e?.message ?? String(e)) + "\n");
    process.exit(1);
  });
}
