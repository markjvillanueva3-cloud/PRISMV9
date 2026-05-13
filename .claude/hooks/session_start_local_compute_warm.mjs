#!/usr/bin/env node
// tier: T4
/**
 * session_start_local_compute_warm.mjs — SessionStart hook
 *
 * Non-destructive local compute surfacer. At session start:
 *   1. Read cached intent signal from local-compute-intent.mjs (.claude/cache/local-compute-intent-last.json)
 *   2. If the last N prompts (within 24h) showed local-compute bias AND stack is down,
 *      surface a one-line suggestion so the user can choose to activate.
 *
 * Does NOT auto-start Docker/Ollama (destructive side effects, requires user approval).
 * Paired with:
 *   - local-compute-intent.mjs (UserPromptSubmit — writes cache)
 *   - ollama-docker-launcher.mjs (the actual launcher, invoked via /activate-local)
 *
 * USSH-OPUS47-BOLSTER — 4.7 re-raise 2026-04-19.
 */
import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";

const INTENT_CACHE = "H:/prism/.claude/cache/local-compute-intent-last.json";
const STALE_MS = 24 * 60 * 60 * 1000;

function dockerReady() {
  try {
    execFileSync("docker", ["version", "--format", "{{.Server.Version}}"],
      { encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch { return false; }
}

function ollamaReady() {
  try {
    execFileSync("docker", ["exec", "prism-ollama", "ollama", "--version"],
      { encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch { return false; }
}

async function readJson(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function main() {
  const cache = await readJson(INTENT_CACHE);
  if (!cache || !cache.timestamp) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const age = Date.now() - new Date(cache.timestamp).getTime();
  if (age > STALE_MS) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const categories = cache.categories || [];
  if (categories.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const dock = dockerReady();
  const needsOllama = categories.some((c) =>
    ["embeddings", "local_inference", "batch_jobs", "lora"].includes(c));
  const oll = dock && needsOllama ? ollamaReady() : !needsOllama;

  if (dock && oll) {
    // Stack is already up — silent
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const missing = [];
  if (!dock) missing.push("docker");
  if (needsOllama && !oll) missing.push("ollama");

  const hoursAgo = Math.round(age / (60 * 60 * 1000));
  const ctx = [
    `### Local Compute Stack Status`,
    ``,
    `Recent session activity (~${hoursAgo}h ago) used local compute: \`${categories.join(", ")}\`.`,
    `Stack is DOWN (missing: ${missing.join(", ")}).`,
    ``,
    `Run \`/activate-local\` to bring it up, or ignore if not needed this session.`,
  ].join("\n");

  process.stdout.write(JSON.stringify({ continue: true, systemMessage: ctx }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
