#!/usr/bin/env node
/**
 * scrutiny-hermes-souls.mjs -- the Hermes-soul ADVISORY arm of the 3-of-3 scrutiny gate
 * (OCTOPUS-SCRUTINY-SOULS Part B). Runs the 5 distinct scrutiny souls (scripts/lib/scrutiny-souls.mjs)
 * over the session diff IN PARALLEL via the Hermes lane (now NVIDIA cloud -- the working
 * stronger-than-Ollama managed lane). $0/off-Claude: the souls vote WITHOUT spending Claude tokens,
 * giving the gate review DIVERSITY the 3 Claude arms might miss.
 *
 * ADVISORY ONLY: prints a merged verdict + per-soul findings; it NEVER marks the scrutiny ledger and
 * NEVER blocks the strict 3-of-3 (R7 -- the 3 Claude arms stay canonical). scrutiny-3way.mjs surfaces
 * the `hermesSoulReviewCommand` that runs this in parallel with the 3 Claude agents.
 *
 * Lane (shared with ask-hermes / hermes-mcp-server, all repointed 2026-06-30):
 *   PRISM_HERMES_PROXY_URL (default :8645/v1) · PRISM_HERMES_MODEL (default meta/llama-3.3-70b-instruct)
 *   bearer = PRISM_HERMES_TOKEN || NVIDIA_API_KEY (the :8645 proxy ignores it; NVIDIA requires it).
 *
 * Usage:
 *   git diff HEAD | node scripts/scrutiny-hermes-souls.mjs [--json]
 *   node scripts/scrutiny-hermes-souls.mjs --target HEAD [--json]
 *
 * Exit: ALWAYS 0 (advisory -- a Hermes-down run degrades to a 'degraded' grade, never a gate failure).
 */
import { SCRUTINY_SOULS, parseSoulVerdict, mergeSoulReviews, renderSoulBanner } from "./lib/scrutiny-souls.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

const MAX_DIFF_BYTES = Number(process.env.PRISM_SCRUTINY_SOULS_MAX_DIFF || 40000); // cap cost on a huge diff
const PER_SOUL_TIMEOUT_MS = Number(process.env.PRISM_SCRUTINY_SOULS_TIMEOUT_MS || 60000);

/** Pure: resolve the Hermes lane (base/token/model) from env -- mirrors ask-hermes's resolution so the
 *  soul arm rides the SAME repointed lane (NVIDIA) with no separate config. */
export function resolveLane(env = process.env) {
  const base = (env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1").replace(/\/+$/, "");
  const token = env.PRISM_HERMES_TOKEN || env.NVIDIA_API_KEY || "prism";
  const model = env.PRISM_HERMES_MODEL || "meta/llama-3.3-70b-instruct";
  return { base, token, model };
}

/** Pure: the OpenAI /v1/chat/completions body for one soul reviewing the diff. */
export function buildSoulBody(soul, diff, model) {
  return {
    model,
    messages: [
      { role: "system", content: soul.system },
      { role: "user", content: `Review this unified diff (PRISM session changes). ${diff}` },
    ],
    max_tokens: 600,
    temperature: 0.2,
    stream: false,
  };
}

/** Impure, fail-soft: run ONE soul against the lane. Returns the merge-ready result; a lane failure
 *  becomes {ok:false} (never throws) so mergeSoulReviews can grade the arm 'degraded' rather than crash. */
async function runSoul(soul, diff, lane) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_SOUL_TIMEOUT_MS);
  try {
    const r = await fetch(`${lane.base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(lane.token ? { authorization: `Bearer ${lane.token}` } : {}) },
      body: JSON.stringify(buildSoulBody(soul, diff, lane.model)),
      signal: ctrl.signal,
    });
    if (!r.ok) return { soul: soul.id, name: soul.name, ok: false, verdict: "unknown", findings: `HTTP ${r.status}` };
    const j = await r.json().catch(() => ({}));
    const text = j?.choices?.[0]?.message?.content ?? "";
    const { verdict } = parseSoulVerdict(text);
    return { soul: soul.id, name: soul.name, ok: true, verdict, findings: text };
  } catch (e) {
    return { soul: soul.id, name: soul.name, ok: false, verdict: "unknown", findings: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/** Impure: read the diff from stdin (if piped) else `git diff <target>`. Capped. */
async function getDiff(target) {
  // stdin first (scrutiny-3way pipes the captured diff)
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const s = Buffer.concat(chunks).toString("utf8");
    if (s.trim()) return s.slice(0, MAX_DIFF_BYTES);
  }
  try {
    const { stdout } = await execFileAsync("git", ["--no-pager", "diff", target || "HEAD"], { maxBuffer: 64 * 1024 * 1024 });
    return stdout.slice(0, MAX_DIFF_BYTES);
  } catch {
    return "";
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const tIdx = argv.indexOf("--target");
  const target = tIdx >= 0 ? argv[tIdx + 1] : "HEAD";
  const diff = await getDiff(target);
  if (!diff.trim()) {
    const empty = { grade: "degraded", answered: 0, total: SCRUTINY_SOULS.length, advisory: true, note: "no diff to review" };
    process.stdout.write(json ? JSON.stringify(empty) + "\n" : "[hermes-souls] no diff to review (advisory)\n");
    process.exit(0);
  }
  const lane = resolveLane();
  // 5 souls fan out in PARALLEL -> wall-clock ~= 1 review.
  const results = await Promise.all(SCRUTINY_SOULS.map((s) => runSoul(s, diff, lane)));
  const merged = mergeSoulReviews(results);
  if (json) {
    process.stdout.write(JSON.stringify({ ...merged, lane: lane.base, model: lane.model, results }) + "\n");
  } else {
    process.stdout.write(renderSoulBanner(merged) + "\n");
    for (const f of merged.failSouls) process.stdout.write(`\n-- ${f.name} (FAIL) --\n${f.findings}\n`);
  }
  process.exit(0); // ADVISORY: always 0
}

const _direct = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/scrutiny-hermes-souls.mjs");
if (_direct) main().catch((e) => { process.stderr.write(`[hermes-souls] ${e?.message || e}\n`); process.exit(0); });
