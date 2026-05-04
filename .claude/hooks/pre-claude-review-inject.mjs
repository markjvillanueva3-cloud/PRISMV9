#!/usr/bin/env node
/**
 * pre-claude-review-inject.mjs — UserPromptSubmit hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P22-U02.
 *
 * For medium-complexity prompts (refactor, multi-file edits, debugging,
 * implement/build/add) we either:
 *   (a) suggest `/pre-review` (default — zero network), or
 *   (b) auto-invoke deepseek-r1:14b for a draft and inject it as context
 *       (when PRISM_PRE_REVIEW_AUTO=1 + Ollama is reachable).
 *
 * Skips:
 *   - simple prompts (no token waste — small refactor, question, lookup)
 *   - safety/physics/Kienzle/Taylor domains (Claude leads)
 *   - prompts containing `[no-prereview]` opt-out token
 *
 * Failure mode: any error → emit {continue: true} and exit 0. Never blocks.
 */

import { promises as fs } from "node:fs";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const REASONING_MODEL = process.env.PRISM_PRE_REVIEW_MODEL ?? "deepseek-r1:14b";
const AUTO = process.env.PRISM_PRE_REVIEW_AUTO === "1";
const TIMEOUT_MS = Number(process.env.PRISM_PRE_REVIEW_TIMEOUT_MS ?? 25000);
const TELEMETRY_DIR = "H:/prism/mcp-server/data/state";
const TELEMETRY_FILE = `${TELEMETRY_DIR}/pre-review-events.jsonl`;

const MEDIUM_PATTERNS = [
  /\brefactor\b/i,
  /\bdebug(ging)?\b/i,
  /\bimplement\b/i,
  /\bbuild\s+(?:a|an|the|new)\b/i,
  /\badd\s+(?:a|an|the|new|support|feature)\b/i,
  /\bmulti.?file\b/i,
  /\bmigrate\b/i,
  /\boptimi[sz]e\b/i,
  /\bextract\s+\w+\s+into\b/i,
  /\bsplit\s+\w+\s+into\b/i,
];

const SAFETY_PATTERNS = [
  /\bkienzle\b/i,
  /\btaylor\s+(?:tool\s+life|equation)\b/i,
  /\bcutting\s+force\b/i,
  /\bphysics\s+constant/i,
  /\bsafety\s+gate\b/i,
  /\bs\s*\(\s*x\s*\)\b/i,
  /\bdeflection\s+(?:limit|threshold)\b/i,
  /\bthermal\s+budget\b/i,
];

const SIMPLE_PATTERNS = [
  /^\s*(?:what|where|when|why|how|who|is|are|does|do|can|should|could)\b/i,
  /\bone[- ]?liner\b/i,
  /\btypo\b/i,
];

async function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return await new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (c) => { data += c; });
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    });
  } catch {
    return "";
  }
}

function classify(prompt) {
  if (!prompt || prompt.length < 12) return { tier: "simple", reason: "prompt too short" };
  if (/\[no-prereview\]/i.test(prompt)) return { tier: "skip", reason: "opt-out token" };
  for (const p of SAFETY_PATTERNS) {
    if (p.test(prompt)) return { tier: "complex", reason: `safety/physics: ${p.source}` };
  }
  for (const p of MEDIUM_PATTERNS) {
    if (p.test(prompt)) return { tier: "medium", reason: `medium-complex: ${p.source}` };
  }
  for (const p of SIMPLE_PATTERNS) {
    if (p.test(prompt)) return { tier: "simple", reason: `simple: ${p.source}` };
  }
  // Unknown shape — treat as simple to avoid false positives
  return { tier: "simple", reason: "no pattern match" };
}

function logEvent(event) {
  fs.mkdir(TELEMETRY_DIR, { recursive: true })
    .then(() => fs.appendFile(TELEMETRY_FILE, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n"))
    .catch(() => {/* swallow telemetry errors */});
}

async function callDeepseek(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: REASONING_MODEL,
        prompt,
        system: "You are a careful first-pass reviewer producing a draft for a senior engineer to refine. Wrap reasoning in <think>…</think>; put the final draft below it. Be concise; flag uncertainty.",
        stream: false,
        options: { temperature: 0.2, num_predict: 800 },
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { ok: false, error: `http ${r.status}` };
    const j = await r.json();
    const raw = String(j.response ?? "");
    if (!raw) return { ok: false, error: "empty response" };
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : (e.message ?? String(e)) };
  } finally {
    clearTimeout(timer);
  }
}

function parseDraft(raw) {
  const m = raw.match(/<think>([\s\S]*?)<\/think>/);
  const reasoning = m ? m[1].trim() : "";
  const draft = m ? raw.slice(m.index + m[0].length).trim() : raw.trim();
  return { reasoning, draft };
}

async function main() {
  let payload = "";
  try { payload = await readStdin(); } catch { /* fallthrough */ }
  let prompt = "";
  try {
    if (payload) {
      const j = JSON.parse(payload);
      prompt = String(j.prompt ?? j.user_prompt ?? j.input ?? "");
    }
  } catch { /* not JSON, treat raw */ }
  if (!prompt) prompt = process.env.USER_PROMPT ?? "";
  if (!prompt) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const { tier, reason } = classify(prompt);

  if (tier !== "medium") {
    logEvent({ event: "skip", tier, reason });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (!AUTO) {
    logEvent({ event: "suggest", tier, reason });
    process.stdout.write(JSON.stringify({
      additionalContext: `📝 Pre-review available: this prompt looks medium-complex (${reason}). For a deepseek-r1 chain-of-thought draft before Claude refines, run \`/pre-review <task>\`. Set PRISM_PRE_REVIEW_AUTO=1 to auto-inject drafts.`,
      continue: true,
    }));
    return;
  }

  const r = await callDeepseek(prompt);
  if (!r.ok) {
    logEvent({ event: "draft_fail", tier, reason, error: r.error });
    process.stdout.write(JSON.stringify({
      additionalContext: `Pre-review attempted but failed (${r.error}); proceeding without draft.`,
      continue: true,
    }));
    return;
  }

  const { reasoning, draft } = parseDraft(r.raw);
  logEvent({ event: "draft_ok", tier, reason, reasoningLen: reasoning.length, draftLen: draft.length });

  const block = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📋 DEEPSEEK-R1 PRE-REVIEW DRAFT (refine, don't replicate)",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    reasoning ? `**Reasoning:**\n${reasoning.slice(0, 1200)}\n` : "",
    `**Draft:**\n${draft.slice(0, 2400)}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `Match (${reason}). Skip with [no-prereview] in next prompt.`,
  ].filter(Boolean).join("\n");

  process.stdout.write(JSON.stringify({ additionalContext: block, continue: true }));
}

main().catch((e) => {
  try { logEvent({ event: "error", error: e.message ?? String(e) }); } catch { /* ignore */ }
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
});
