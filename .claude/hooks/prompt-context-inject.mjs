#!/usr/bin/env node
// tier: T4
/**
 * prompt-context-inject.mjs — UserPromptSubmit hook (PRISM-STAB-MS0/U-C2).
 *
 * Reads the pre-aggregated bundle written by the context-bundle daemon
 * (prism-awareness-bundle.mjs --daemon) and emits ONE compact injection
 * block per prompt. Replaces the per-prompt fork storm of 24 individual
 * injectors that each computed the same context independently.
 *
 * The daemon ticks every 30s and writes state/shared/context-bundle.json.
 * This hook is read-only: one fs read, one regex filter, emit. No fork,
 * no compute, no I/O outside that single read.
 *
 * Roll-out plan (per spec):
 *   - Phase 1 (THIS commit): hook is ADDED alongside the 24 existing
 *     injectors. Both run. Compare quality.
 *   - Phase 2 (U-C4 in a future session): retire the 24 individuals after
 *     confirming this hook covers their output. Settings.json registration
 *     of the legacy 24 moves to disabled-hooks/.
 *
 * Rollback: PRISM_PROMPT_CONTEXT_INJECT_OFF=1 disables this hook entirely.
 *
 * Failure mode: if context-bundle.json is missing, stale (>5min), or
 * unreadable, the hook emits {continue:true} silently and lets the
 * legacy 24 injectors do their job. Fail-open.
 */

import { readFileSync, statSync, existsSync } from "node:fs";

const BUNDLE_PATH = "H:/prism/state/shared/context-bundle.json";
const STALE_MS = 5 * 60 * 1000;       // 5 min — daemon ticks every 30s
const MAX_INJECT_BYTES = 2000;         // cap injection size (per spec)

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch { return ""; }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function exitContinue() {
  emit({ continue: true });
  process.exit(0);
}

function readBundle() {
  if (!existsSync(BUNDLE_PATH)) return null;
  try {
    const stat = statSync(BUNDLE_PATH);
    if (Date.now() - stat.mtimeMs > STALE_MS) {
      return { stale: true, mtime: stat.mtimeMs };
    }
    return JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));
  } catch { return null; }
}

/**
 * Extract the most-relevant slice from the bundle body for THIS prompt.
 * Heuristic: find the first section heading whose text matches a keyword
 * in the prompt. Fall back to the inventory headline (always relevant).
 */
function relevantSlice(body, promptText) {
  if (!body) return "";
  const sections = body.split(/\n---\n/);
  if (sections.length === 0) return "";

  // Always include the very first section (header + brief metadata)
  const head = sections[0].slice(0, 600);

  // Keyword-match the rest
  const promptLower = String(promptText || "").toLowerCase();
  const keywords = [
    ["chat", "claim", "peer", "lock"],
    ["build", "engine", "dispatcher", "wired"],
    ["memory", "feedback", "tribal"],
    ["compact", "handoff", "session"],
    ["roadmap", "milestone", "phase"],
  ].flat();
  const hits = keywords.filter((k) => promptLower.includes(k));

  let matched = "";
  if (hits.length > 0) {
    for (const sec of sections.slice(1)) {
      const secLower = sec.slice(0, 100).toLowerCase();
      if (hits.some((k) => secLower.includes(k))) {
        matched = "\n---\n" + sec.slice(0, 800);
        break;
      }
    }
  }

  return (head + matched).slice(0, MAX_INJECT_BYTES);
}

function main() {
  if (process.env.PRISM_PROMPT_CONTEXT_INJECT_OFF === "1") return exitContinue();

  const raw = readStdinSafe();
  let payload = {};
  try { if (raw) payload = JSON.parse(raw); } catch { /* ignore */ }
  const promptText = payload.prompt || payload.user_message || payload.message || "";

  const bundle = readBundle();

  if (!bundle) {
    return exitContinue();
  }
  if (bundle.stale) {
    const ageMin = Math.round((Date.now() - bundle.mtime) / 60000);
    emit({
      continue: true,
      additionalContext: `## PRISM context-bundle is stale (${ageMin}m old; daemon may be down)\nFull context still available via legacy injectors. To restart daemon:\n  node H:/prism/scripts/daemon-supervisor.mjs restart context-bundle`,
    });
    return;
  }

  const slice = relevantSlice(bundle.body, promptText);
  if (!slice) return exitContinue();

  const ageS = Math.max(0, Math.round((Date.now() - Date.parse(bundle.generatedAt)) / 1000));
  const header = `## PRISM CONTEXT (bundle, ${ageS}s old, ${bundle.bytes ?? "?"}B body)`;
  const footer = `\n_Full bundle: \`state/shared/context-bundle.{json,html,md}\` · refresh: \`daemon-supervisor restart context-bundle\`_`;
  const block = `${header}\n\n${slice}${footer}`;

  emit({ continue: true, additionalContext: block.slice(0, MAX_INJECT_BYTES + 200) });
}

try { main(); }
catch { exitContinue(); }
