#!/usr/bin/env node
/**
 * tribal-tier2-precontext.mjs
 *
 * Middleware shim for the Tier-2 FullSystemAICoordinator dispatch
 * layer. Given a domain + task description, returns the top-3 tribal
 * entries formatted as a compact precontext block ready to prepend
 * to a coordinator prompt.
 *
 * This is the bridge between the static tribal index (L1) and the
 * dynamic AI orchestration tier — every cross-process AI dispatch
 * can warm-start with the most-relevant tribal entries without
 * re-querying Ollama from inside the coordinator.
 *
 * Output format (default):
 *   ## Tribal precontext (domain=<d>, k=3)
 *   1. [<score> · <source>] <title>
 *      <snippet>
 *   2. ...
 *
 * Usage:
 *   node tribal-tier2-precontext.mjs --domain mill --task "thin wall chatter"
 *   node tribal-tier2-precontext.mjs --domain wedm --task "..." --json
 *   node tribal-tier2-precontext.mjs --domain mill --task "..." --k 5
 */

import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const L2 = `${PRISM}/.claude/scripts/tribal-rerank.mjs`;
const DEFAULT_K = 3;
const TIMEOUT_MS = 5000;
const SNIPPET_CHARS = 180;

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function format(hits, domain, k) {
  if (!hits || hits.length === 0) {
    return `## Tribal precontext (domain=${domain}, k=${k})\n_No relevant entries — escalate to deep reasoning._`;
  }
  const lines = [`## Tribal precontext (domain=${domain}, k=${k})`];
  hits.forEach((h, i) => {
    const title = (h.title || h.id).slice(0, 100);
    const snippet = (h.snippet || "").replace(/\s+/g, " ").slice(0, SNIPPET_CHARS);
    lines.push(`${i + 1}. [${h.score.toFixed(3)} · ${h.source}] ${title}`);
    if (snippet) lines.push(`   ${snippet}`);
  });
  return lines.join("\n");
}

const opts = parseArgs();
const domain = typeof opts.domain === "string" ? opts.domain.toLowerCase() : null;
const task = typeof opts.task === "string" ? opts.task : null;
const k = Number(opts.k) || DEFAULT_K;
const asJson = !!opts.json;

if (!domain || !task) {
  console.error("usage: tribal-tier2-precontext.mjs --domain <name> --task \"<text>\" [--k 3] [--json]");
  process.exit(1);
}

const args = [L2, "--query", task, "--domain", domain, "--k", String(k), "--json", "--caller", "tier2-precontext"];
const r = spawnSync(process.execPath, args, { encoding: "utf8", timeout: TIMEOUT_MS });

if (r.status !== 0) {
  if (asJson) {
    process.stdout.write(JSON.stringify({ ok: false, error: (r.stderr || "rerank failed").slice(0, 200) }));
    process.exit(2);
  }
  console.error(`rerank failed: ${(r.stderr || "").slice(0, 200)}`);
  process.exit(2);
}

let result;
try { result = JSON.parse(r.stdout); }
catch (e) {
  if (asJson) { process.stdout.write(JSON.stringify({ ok: false, error: "rerank stdout unparseable" })); process.exit(2); }
  console.error("rerank stdout unparseable"); process.exit(2);
}

if (!result.ok) {
  if (asJson) { process.stdout.write(r.stdout); process.exit(2); }
  console.error(`rerank error: ${result.error}`); process.exit(2);
}

if (asJson) {
  process.stdout.write(JSON.stringify({
    ok: true,
    domain, task, k,
    hits: result.hits,
    precontext: format(result.hits, domain, k),
  }));
} else {
  console.log(format(result.hits, domain, k));
}
