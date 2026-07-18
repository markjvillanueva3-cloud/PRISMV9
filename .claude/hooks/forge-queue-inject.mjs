#!/usr/bin/env node
// tier: T2
// forge-queue-inject.mjs -- EXTRACTION-FORGE-MS0 (slot:bravo 2026-06-12)
//
// UserPromptSubmit injector: during active /loop / build work, surface the top pending
// FORGE-WORTHY candidates that extraction-forge-detect queued, and instruct the loop to
// drain a BOUNDED few by running /forge-triple on each (DuplicationGuard is the real gate;
// blocked => mark done + move on). This is the consumer half of the operator's
// "auto-apply forge-triple when we run extractions" -- a hook cannot run the 30-turn
// Claude /forge-triple skill, so it surfaces the queue for the autonomous loop to drain.
//
// Bounded (top-K) + debounced so it never nags every prompt or floods the loop. Silent
// when the queue is empty. Reads state/shared/forge-queue.jsonl (candidates) minus
// forge-queue-done.txt (drained source paths). Fail-soft: any error -> no injection.
//
// Knobs: PRISM_FORGE_QUEUE_INJECT_DISABLE=1 | PRISM_FORGE_QUEUE_INJECT_K=N
//        | PRISM_FORGE_QUEUE_INJECT_DEBOUNCE_MS=N | PRISM_EXTRACTION_INTAKE_ROOT=<repo>

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_K = 3;
const DEFAULT_DEBOUNCE_MS = 300000; // 5 min -- surface periodically during active work, no spam
// Only surface in an active build/loop context (the operator chose "autonomous /loop drains it").
const LOOP_CTX_RE = /\/loop|\/goal|\/checkin|push through|continue|\bbuild\b|iter \d+\/\d+/i;

/** Pure: pending = queued candidates whose sourcePath is NOT in the done set. Top-K. */
export function pendingCandidates(queueRecs, doneSet, k = DEFAULT_K) {
  const done = doneSet instanceof Set ? doneSet : new Set(doneSet || []);
  const seen = new Set();
  const out = [];
  for (const r of queueRecs || []) {
    if (!r || !r.sourcePath || done.has(r.sourcePath) || seen.has(r.sourcePath)) continue;
    seen.add(r.sourcePath);
    out.push(r);
    if (out.length >= k) break;
  }
  return out;
}

/** Debounce: true if last surfaced within the window. */
export function isDebounced(stampMs, nowMs, windowMs) {
  if (typeof stampMs !== "number" || !Number.isFinite(stampMs)) return false;
  return nowMs - stampMs < windowMs;
}

function resolveRoot(env = process.env) {
  return (env.PRISM_EXTRACTION_INTAKE_ROOT || env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
}
function readLines(p) { try { return fs.readFileSync(p, "utf8").split("\n").filter(Boolean); } catch { return []; } }
function readStamp(p) { try { return Number(JSON.parse(fs.readFileSync(p, "utf8")).at) || 0; } catch { return 0; } }

function emit(text) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: text } }));
}
function silent() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  try {
    if (process.env.PRISM_FORGE_QUEUE_INJECT_DISABLE === "1") return silent();
    const k = Number(process.env.PRISM_FORGE_QUEUE_INJECT_K) || DEFAULT_K;
    const windowMs = Number(process.env.PRISM_FORGE_QUEUE_INJECT_DEBOUNCE_MS) || DEFAULT_DEBOUNCE_MS;

    let stdin = "";
    for await (const c of process.stdin) stdin += c;
    let prompt = "";
    try { prompt = JSON.parse(stdin).prompt || ""; } catch { /* no prompt */ }
    if (!LOOP_CTX_RE.test(prompt)) return silent(); // only during active loop/build work

    const root = resolveRoot();
    const queue = readLines(path.join(root, "state/shared/forge-queue.jsonl"))
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    if (queue.length === 0) return silent();
    const done = new Set(readLines(path.join(root, "state/shared/forge-queue-done.txt")).map((s) => s.trim()));
    const pending = pendingCandidates(queue, done, k);
    if (pending.length === 0) return silent();

    const stampPath = path.join(root, "state/shared/.forge-queue-inject-stamp");
    const now = Date.now();
    if (isDebounced(readStamp(stampPath), now, windowMs)) return silent();
    try { fs.mkdirSync(path.dirname(stampPath), { recursive: true }); fs.writeFileSync(stampPath, JSON.stringify({ at: now }), "utf8"); } catch { /* fail-soft */ }

    const remaining = queue.length - done.size;
    const lines = pending.map((c) => `- \`${c.forgeAction}\`  (${c.kind} @${c.score}, from ${path.basename(c.sourcePath)})`);
    const text = [
      `## 🔨 Forge queue -- ${remaining} extraction-derived capability candidate(s) pending`,
      `These were auto-detected from extractions as forge-worthy (a coarse pre-filter -- /forge-triple + DuplicationGuard is the real gate). During this loop, DRAIN up to ${k}:`,
      ...lines,
      `For each: run the \`/forge-triple\` command. If DuplicationGuard blocks it (concept already built), that's expected -- skip it. After handling each, mark it done:`,
      "```",
      ...pending.map((c) => `echo "${c.sourcePath}" >> state/shared/forge-queue-done.txt`),
      "```",
      `_Bounded ${k}/loop, debounced. Source: state/shared/forge-queue.jsonl. Disable: PRISM_FORGE_QUEUE_INJECT_DISABLE=1._`,
    ].join("\n");
    return emit(text);
  } catch {
    return silent();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
