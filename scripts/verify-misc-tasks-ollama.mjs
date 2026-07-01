#!/usr/bin/env node
/**
 * verify-misc-tasks-ollama.mjs -- Ollama RECALL ARM for the MISC-TASKS open-status verifier.
 *
 * The deterministic core (verify-misc-tasks-open.mjs) is high-precision but LOW-RECALL
 * (1/318 on live data -- it only catches the now-wired class). This arm boosts recall:
 * for each `needs-review` item that names a resolvable code file, it gathers the file's
 * CURRENT repo state and asks a LOCAL model (qwen2.5-coder:32b -- $0, no 429, the
 * Ollama-offload lane) whether the task is already done. It is the offloaded sibling of
 * the deterministic reconciler, NOT a replacement (the deterministic closes stay).
 *
 * NEVER-FALSE-CLOSE CHARTER (R12): only an explicit `closed` verdict -> likely-closed.
 * A garbage / ambiguous / empty / errored response -> unknown (stays open). The
 * operator reviews the likely-closed list anyway, but this arm refuses to assert closed
 * without a clear signal.
 *
 * Usage: node scripts/verify-misc-tasks-ollama.mjs [--limit N] [--json]
 * Exit:  0 ok | 1 inventory missing | 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ROOT,
  extractCodeAssets,
  verifyAll,
  buildBasenameIndex,
  readSettingsText,
} from "./verify-misc-tasks-open.mjs";

const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.PRISM_MISC_VERIFY_MODEL || "qwen2.5-coder:32b";
const CODE_DIRS = [".claude/hooks", ".claude/scripts", ".claude/helpers", "scripts", "mcp-server/src"];

/** Map basename -> first path under the bounded code dirs (fail-soft per dir). */
export function buildBasenamePathIndex(root = ROOT, io = fs) {
  const map = new Map();
  const walk = (d) => {
    let ents;
    try { ents = io.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && e.name !== ".git") walk(p);
      } else if (!map.has(e.name)) {
        map.set(e.name, p);
      }
    }
  };
  for (const d of CODE_DIRS) walk(path.join(root, d));
  return map;
}

/** Compact CURRENT-state evidence for an item's referenced assets (cap 2). io injected. */
export function gatherEvidence(item, { pathIndex = new Map(), readFileSafe = () => "" } = {}) {
  const assets = extractCodeAssets(item);
  if (!assets.length) return "";
  const parts = [];
  for (const a of assets.slice(0, 2)) {
    const p = pathIndex.get(a);
    if (!p) { parts.push(`${a}: ABSENT from repo (renamed/removed/never-created)`); continue; }
    const body = readFileSafe(p);
    const head = body ? body.split(/\r?\n/).slice(0, 30).join("\n") : "(unreadable)";
    parts.push(`${a} EXISTS, head:\n${head}`);
  }
  return parts.join("\n---\n");
}

/** The classification prompt (pure, testable). */
export function buildPrompt(item, evidence) {
  return (
    `You audit whether a software task is OPEN (still needs doing) or CLOSED (already done).\n` +
    `TASK: ${item?.title || ""}\n` +
    `ORIGINAL PROBLEM (from a 35-day-old scan, may be stale): ${(item?.evidence || "").slice(0, 400)}\n` +
    `CURRENT repo state of the referenced file(s):\n${(evidence || "(none)").slice(0, 1500)}\n\n` +
    `Decide: if the CURRENT state shows the fix/wiring/file the task asks for is ALREADY present, it is CLOSED. ` +
    `If the work still needs doing, OPEN. If you cannot tell, unknown.\n` +
    `Reply ONLY compact JSON: {"status":"open|closed|unknown","reason":"<=12 words"}`
  );
}

/** Parse an Ollama reply -> verdict. Conservative: anything not clearly `closed` never closes. */
export function parseVerdict(raw) {
  if (!raw || typeof raw !== "string") return { status: "unknown", reason: "empty" };
  const m = raw.match(/"status"\s*:\s*"(open|closed|unknown)"/i);
  if (m) {
    const status = m[1].toLowerCase();
    const r = raw.match(/"reason"\s*:\s*"([^"]{0,80})"/);
    return { status, reason: r ? r[1] : "" };
  }
  // No JSON status: only an UNAMBIGUOUS closed keyword closes; ambiguity -> unknown (never false-close).
  const hasClosed = /\bclosed\b|\balready (?:done|built|wired|fixed|present)\b/i.test(raw);
  const hasOpen = /\bopen\b|\bstill (?:needs|open|to ?do)\b|\bnot (?:done|wired|fixed|present)\b/i.test(raw);
  if (hasClosed && !hasOpen) return { status: "closed", reason: "keyword" };
  if (hasOpen && !hasClosed) return { status: "open", reason: "keyword" };
  return { status: "unknown", reason: "unparseable" };
}

/** Classify one item via an injected ask(). Never throws; never false-closes. */
export async function classifyViaOllama(item, { pathIndex = new Map(), readFileSafe = () => "", ask } = {}) {
  const evidence = gatherEvidence(item, { pathIndex, readFileSafe });
  if (!evidence) return { status: "unknown", reason: "no resolvable asset", evidence: "" };
  let raw;
  try {
    raw = await ask(buildPrompt(item, evidence));
  } catch {
    return { status: "unknown", reason: "ask-error", evidence };
  }
  return { ...parseVerdict(raw), evidence };
}

/** Production Ollama call via /api/generate (temperature 0, warm keep_alive). */
async function askOllama(prompt, { url = OLLAMA_URL, model = MODEL, timeoutMs = 40000 } = {}) {
  const res = await fetch(`${url}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0 }, keep_alive: "10m" }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const d = await res.json();
  return d?.response || "";
}

async function main() {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes("--json");
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx >= 0 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : Infinity;
  const invPath = path.join(ROOT, "state/shared/specs/MISC-TASKS-INVENTORY.json");
  let inv;
  try { inv = JSON.parse(fs.readFileSync(invPath, "utf8")); }
  catch (e) { process.stderr.write(`verify-misc-tasks-ollama: cannot read inventory: ${e.message}\n`); process.exit(1); }

  let det, pathIndex;
  try {
    det = verifyAll(inv, { settingsText: readSettingsText(), basenames: buildBasenameIndex() });
    pathIndex = buildBasenamePathIndex();
  } catch (e) { process.stderr.write(`verify-misc-tasks-ollama: setup error: ${e.message}\n`); process.exit(2); }

  const readFileSafe = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
  const byId = new Map((inv.items || []).map((it) => [it.misc_id, it]));
  // Only needs-review items that NAME a code asset are worth an Ollama call.
  const candidates = det.results
    .filter((r) => r.status === "needs-review")
    .map((r) => byId.get(r.misc_id))
    .filter((it) => it && extractCodeAssets(it).length > 0)
    .slice(0, limit);

  const results = [];
  let closed = 0, open = 0, unknown = 0;
  for (const it of candidates) {
    const v = await classifyViaOllama(it, { pathIndex, readFileSafe, ask: (p) => askOllama(p) });
    if (v.status === "closed") closed++; else if (v.status === "open") open++; else unknown++;
    results.push({ misc_id: it.misc_id, title: it.title, status: v.status, reason: v.reason });
    if (results.length % 25 === 0) process.stderr.write(`...${results.length}/${candidates.length} (closed ${closed})\n`);
  }

  const stampISO = new Date().toISOString();
  const dateTag = stampISO.slice(0, 10);
  const report = {
    generatedAt: stampISO,
    model: MODEL,
    candidates: candidates.length,
    deterministicLikelyClosed: det.counts.likelyClosed,
    ollamaClosed: closed,
    ollamaOpen: open,
    ollamaUnknown: unknown,
    results,
  };
  const outJson = path.join(ROOT, "state/shared/specs", `MISC-TASKS-OLLAMA-VERIFIED-${dateTag}.json`);
  const outMd = path.join(ROOT, "state/shared/specs", `MISC-TASKS-OLLAMA-VERIFIED-${dateTag}.md`);
  try {
    fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
    const md = [
      `# MISC-TASKS Ollama recall verification -- ${stampISO}`,
      "",
      `> Local-model (${MODEL}) classification of the ${candidates.length} deterministic-needs-review items that name a code file. Conservative: only an explicit \`closed\` verdict counts. Re-run: \`node scripts/verify-misc-tasks-ollama.mjs\`.`,
      "",
      `- candidates classified: **${candidates.length}**`,
      `- **likely-closed (ollama): ${closed}** -- re-check before picking up`,
      `- still-open (ollama): ${open}`,
      `- unknown: ${unknown}`,
      "",
      "## Ollama-flagged likely-closed",
      "| misc_id | title | reason |",
      "|---|---|---|",
      ...results.filter((r) => r.status === "closed").map((r) => `| ${r.misc_id} | ${(r.title || "").slice(0, 70)} | ${r.reason} |`),
    ].join("\n") + "\n";
    fs.writeFileSync(outMd, md);
  } catch (e) {
    process.stderr.write(`verify-misc-tasks-ollama: write failed (non-fatal): ${e.message}\n`);
  }
  const summary = `[verify-misc-tasks-ollama] ${candidates.length} classified: ${closed} likely-closed, ${open} open, ${unknown} unknown -> ${path.relative(ROOT, outMd).replace(/\\/g, "/")}`;
  if (jsonOut) process.stdout.write(JSON.stringify({ ...report, outJson, outMd }, null, 2) + "\n");
  else process.stdout.write(summary + "\n");
  process.exit(0);
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("verify-misc-tasks-ollama.mjs");
if (isDirect) main();
