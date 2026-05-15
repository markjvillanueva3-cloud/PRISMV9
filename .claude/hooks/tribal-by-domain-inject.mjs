#!/usr/bin/env node
// tier: T2
// tribal-by-domain-inject.mjs — UserPromptSubmit
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
//
// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
// already biases wiki-entry ranking toward the active chat-slot's milestone
// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
// knowledge — surfaces top-K tribal entries on every UserPromptSubmit,
// keyed on the slot's milestone domain (not just the prompt text).
//
// Reuses:
//   - getDomainTokens / chatIdFromInput from .claude/helpers/wiki-domain-bias.mjs
//   - .claude/scripts/tribal-rerank.mjs (Ollama-embed + cosine top-K, with
//     --domain doubling in-domain cosine scores)
//   - state/shared/tribal-embed-index.json (the L1 vector index)
//
// Advisory only — never blocks. Subprocess timeout caps latency. If Ollama
// is down or the index is missing, returns {continue:true} silently.
//
// Knobs:
//   PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1     no-op
//   PRISM_TRIBAL_DOMAIN_INJECT_K=N           top-K to inject (default 3)
//   PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS=N  subprocess timeout (default 4000)
//   PRISM_TRIBAL_DOMAIN_INJECT_VERBOSE=1     log skip reasons to telemetry
//   PRISM_ROOT                               repo root (default H:/prism)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { getDomainTokens, chatIdFromInput } from "../helpers/wiki-domain-bias.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DISABLE = process.env.PRISM_TRIBAL_DOMAIN_INJECT_DISABLE === "1";
const TOP_K = Math.max(1, Math.min(10, parseInt(process.env.PRISM_TRIBAL_DOMAIN_INJECT_K || "3", 10) || 3));
const TIMEOUT_MS = Math.max(500, Math.min(15000, parseInt(process.env.PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS || "2500", 10) || 2500));
const VERBOSE = process.env.PRISM_TRIBAL_DOMAIN_INJECT_VERBOSE === "1";
const TELEMETRY = path.join(PRISM_ROOT, "mcp-server", "data", "state", "hook-fire-counts.jsonl");
const RERANK_SCRIPT = path.join(PRISM_ROOT, ".claude", "scripts", "tribal-rerank.mjs");
const INDEX_PATH = path.join(PRISM_ROOT, "state", "shared", "tribal-embed-index.json");

const MIN_PROMPT_LEN = 4;
const MAX_PROMPT_LEN = 300;

// Token → tribal-rerank domain enum. **Declaration order is load-bearing.**
// First match wins, so put more-specific domains before more-general ones:
// "mill turning" → mill (mill listed first); "swiss cad" → swiss-class lathe
// machine, but `swiss` is parked under `lathe` because tribal-rerank only
// accepts {mill,lathe,wedm,cad,cam,general}. Tokens cover the real PRISM
// milestone vocabulary as seen in `state/shared/atomic-roadmap.json`
// milestone slugs (mill/turn/wedm/cad/cam/swiss/5axis/grinder/sinker/pcd/etc).
// Fallback "general" if no tokens match — still useful, rerank returns top-K
// by cosine without the 2× in-domain boost.
const DOMAIN_MAP = [
  { domain: "mill",  match: new Set(["mill", "milling", "kienzle", "endmill", "facemill", "spindle", "5axis", "fiveaxis", "grinder", "grinding", "drill", "drilling", "pocket", "chatter"]) },
  { domain: "lathe", match: new Set(["lathe", "turn", "turning", "okuma", "mazak", "groove", "thread", "swiss", "swisslike", "bar", "barfeed"]) },
  { domain: "wedm",  match: new Set(["wedm", "edm", "wire", "sodick", "mitsubishi", "agie", "charmilles", "sinker", "pcd", "ramwedm"]) },
  { domain: "cad",   match: new Set(["cad", "fusion", "inventor", "solidworks", "drawing", "blueprint", "ocr", "print", "catia", "step", "iges", "ipt", "iam"]) },
  { domain: "cam",   match: new Set(["cam", "mastercam", "hypermill", "esprit", "toolpath", "post", "solidcam", "powermill", "siemensnx", "feature"]) },
];

function tele(decision, extra) {
  if (!VERBOSE && (decision === "skip_disabled" || decision === "skip_no_prompt")) return;
  try {
    appendFileSync(
      TELEMETRY,
      JSON.stringify({ ts: new Date().toISOString(), hook: "tribal-by-domain-inject", decision, ...extra }) + "\n",
      "utf8",
    );
  } catch { /* fail-safe */ }
}

function approve(out) {
  process.stdout.write(JSON.stringify({ continue: true, ...(out || {}) }));
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Pull the user prompt text from a UserPromptSubmit input. Defensive
// against shape variants — some harness versions pass `prompt` at top
// level, others nest inside hook_input or session. Uses own-property
// checks so a polluted prototype chain (Object.create or __proto__ smuggle)
// cannot inject a fake prompt. JSON.parse output always has own props, so
// this is a tightening with zero impact on the real-world harness path.
function ownStr(obj, key) {
  if (!obj || typeof obj !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return null;
  const v = obj[key];
  return typeof v === "string" ? v : null;
}
export function extractPrompt(input) {
  if (!input || typeof input !== "object") return null;
  const p = ownStr(input, "prompt")
        || ownStr(input, "user_prompt")
        || ownStr(input.hook_input, "prompt")
        || ownStr(input.session, "prompt");
  if (typeof p !== "string") return null;
  const trimmed = p.trim().slice(0, MAX_PROMPT_LEN);
  return trimmed.length >= MIN_PROMPT_LEN ? trimmed : null;
}

// Map slot/milestone domain tokens to one of tribal-rerank's 6 domains.
// Returns the first matching domain; "general" if no tokens hit any set.
export function inferTribalDomain(domainTokens) {
  if (!Array.isArray(domainTokens) || !domainTokens.length) return "general";
  const tokenSet = new Set(domainTokens.map((t) => String(t).toLowerCase()));
  for (const { domain, match } of DOMAIN_MAP) {
    for (const t of tokenSet) {
      if (match.has(t)) return domain;
    }
  }
  return "general";
}

function runRerank(prompt, domain) {
  if (!existsSync(RERANK_SCRIPT)) return { ok: false, reason: "rerank_script_missing" };
  if (!existsSync(INDEX_PATH)) return { ok: false, reason: "index_missing" };
  try {
    const out = execFileSync(
      process.execPath,
      [RERANK_SCRIPT, "--query", prompt, "--domain", domain, "--k", String(TOP_K), "--json", "--no-cite"],
      { encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
    );
    return { ok: true, stdout: out };
  } catch (e) {
    const reason = e && e.code === "ETIMEDOUT" ? "rerank_timeout" : "rerank_failed";
    return { ok: false, reason };
  }
}

// Parse the JSON output of tribal-rerank. Shape: { ok, query, domain, k, hits:[{score,source,title,...}] }
// We tolerate the older `results` field as an alias for `hits` since tribal-rerank's
// output shape has historically drifted.
export function parseRerankOutput(stdout, topK) {
  if (!stdout || typeof stdout !== "string") return [];
  let j;
  try { j = JSON.parse(stdout); } catch { return []; }
  const arr = Array.isArray(j.hits) ? j.hits : (Array.isArray(j.results) ? j.results : []);
  return arr.slice(0, topK).map((h) => ({
    score: typeof h.score === "number" ? h.score : 0,
    source: h.source || h.path || "tribal",
    title: h.title || h.id || "(untitled)",
    snippet: typeof h.text === "string" ? h.text.slice(0, 140) : "",
  }));
}

export function formatInjection(hits, domain) {
  if (!hits.length) return null;
  const header = `## 🧠 Tribal-by-domain precontext — ${hits.length} hit(s) in \`${domain}\``;
  const body = hits.map((h, i) => {
    const s = h.score.toFixed(2);
    const snip = h.snippet ? ` — ${h.snippet}` : "";
    return `${i + 1}. [${s} · ${h.source}] **${h.title}**${snip}`;
  }).join("\n");
  const footer = "_Domain inferred from active chat-slot's milestone. Adapter: `tribal-rerank.mjs`. Disable: `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1`._";
  return `${header}\n${body}\n${footer}`;
}

function buildOutput(additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  };
}

async function main(injected) {
  if (DISABLE) { tele("skip_disabled"); approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  const prompt = extractPrompt(input);
  if (!prompt) { tele("skip_no_prompt"); approve(); return; }
  const chatId = chatIdFromInput(input);
  const tokens = getDomainTokens({ chatId });
  const domain = inferTribalDomain(tokens);
  const result = runRerank(prompt, domain);
  if (!result.ok) { tele("noop", { reason: result.reason, domain }); approve(); return; }
  const hits = parseRerankOutput(result.stdout, TOP_K);
  if (!hits.length) { tele("no_hits", { domain }); approve(); return; }
  tele("injected", { domain, hits: hits.length, chatId: chatId || "unknown" });
  approve(buildOutput(formatInjection(hits, domain)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(() => approve());
}
