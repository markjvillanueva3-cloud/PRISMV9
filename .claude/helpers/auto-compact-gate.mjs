/**
 * auto-compact-gate.mjs — Token-aware Stop hook
 *
 * Reads the active session transcript to measure real token usage,
 * then gates the Stop event:
 *
 *   soft trigger  >=  300_000 tokens  → inject "/compact now" directive
 *   hard block    >=  450_000 tokens  → block Stop until user compacts
 *
 * Token source: last assistant message's usage block in the transcript JSONL
 *   totalTokens = input_tokens + cache_read_input_tokens + cache_creation_input_tokens
 *
 * Fallback: if transcript unreadable, falls back to the byte-based
 * context-pressure tracker with equivalent thresholds.
 */
import { promises as fs } from "node:fs";
import process from "node:process";
import { cachePath } from "./hook-cache.mjs";

const PATHS = {
  handoff: "H:\\prism\\state\\HANDOFF.md",
  roadmapIndex: "H:\\prism\\mcp-server\\data\\roadmap-index.json",
  contextPressure: cachePath("context-pressure"),
  autopilotFlag: cachePath("autopilot-active"),
};

// Token thresholds for Opus 4.7 1M context.
//
// Prior values (300K/450K) were tuned for 200K-context Sonnet and forced
// compaction at ~45% of the usable window — compressing and discarding
// state the 1M window would have kept. That's a regression, not a safety.
//
// New values target the real danger zone: ~90% of window. Below that,
// Opus 4.7 operates fine across the full 1M. Override via env if needed:
//   PRISM_COMPACT_SOFT_TOKENS, PRISM_COMPACT_HARD_TOKENS
const SOFT_TOKENS = Number(process.env.PRISM_COMPACT_SOFT_TOKENS || 800_000);
const HARD_TOKENS = Number(process.env.PRISM_COMPACT_HARD_TOKENS || 950_000);

// Byte fallbacks (~3.5 chars/token for mixed code/prose)
const SOFT_BYTES = SOFT_TOKENS * 3.5;
const HARD_BYTES = HARD_TOKENS * 3.5;

async function readJson(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")); } catch { return null; }
}

async function fileExists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    const to = setTimeout(() => resolve(buf), 500);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => { buf += d; });
    process.stdin.on("end", () => { clearTimeout(to); resolve(buf); });
    process.stdin.on("error", () => { clearTimeout(to); resolve(buf); });
  });
}

async function parseHookInput() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function lastAssistantUsage(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const raw = await fs.readFile(transcriptPath, "utf8");
    const lines = raw.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      const usage = entry?.message?.usage ?? entry?.usage;
      if (entry?.type === "assistant" && usage && typeof usage === "object") {
        const input = Number(usage.input_tokens ?? 0);
        const cacheR = Number(usage.cache_read_input_tokens ?? 0);
        const cacheC = Number(usage.cache_creation_input_tokens ?? 0);
        return input + cacheR + cacheC;
      }
    }
  } catch { /* transcript unreadable */ }
  return null;
}

async function isAutopilotActive() {
  if (await fileExists(PATHS.autopilotFlag)) {
    const data = await readJson(PATHS.autopilotFlag);
    if (data?.active) return true;
  }
  return false;
}

async function hasActiveRoadmapWork() {
  try {
    const handoff = await fs.readFile(PATHS.handoff, "utf8");
    if (handoff.includes("## RESUME") && !handoff.includes("no active work")) return true;
  } catch { /* no handoff */ }
  const index = await readJson(PATHS.roadmapIndex);
  if (index?.milestones) {
    if (index.milestones.some((m) => m.status === "in_progress")) return true;
  }
  return false;
}

async function getPressureBytes() {
  const tracker = await readJson(PATHS.contextPressure);
  return tracker?.totalBytes ?? 0;
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

async function main() {
  const input = await parseHookInput();
  const transcriptPath = input?.transcript_path ?? null;

  const [tokens, autopilot, activeWork, pressureBytes] = await Promise.all([
    lastAssistantUsage(transcriptPath),
    isAutopilotActive(),
    hasActiveRoadmapWork(),
    getPressureBytes(),
  ]);

  // Normalise to tokens — use transcript if present, else byte approximation
  const tokenCount = tokens ?? Math.round(pressureBytes / 3.5);
  const source = tokens != null ? "transcript" : "byte-fallback";
  const totalK = Math.round(tokenCount / 1000);

  const isSoft = tokenCount >= SOFT_TOKENS;
  const isHard = tokenCount >= HARD_TOKENS;

  // Hard block: context drift zone — force compact regardless of work state
  if (isHard) {
    emit({
      decision: "block",
      reason: [
        `CONTEXT HARD CAP: ~${totalK}k tokens (source: ${source}, limit: ${HARD_TOKENS / 1000}k).`,
        "Approaching Opus 4.7 1M context ceiling. DO NOT STOP.",
        "1. Write HANDOFF.md with ## RESUME describing next concrete step.",
        "2. Run /compact immediately.",
        "3. PostCompact restores via compaction-survival.mjs.",
        "4. Continue from RESUME without asking.",
      ].join(" "),
    });
    return;
  }

  // Soft trigger: inject compact directive while still allowing stop
  if (isSoft) {
    const verb = autopilot ? "BLOCK" : "allow";
    const reason = [
      `CONTEXT SOFT TRIGGER: ~${totalK}k tokens (source: ${source}, soft: ${SOFT_TOKENS / 1000}k, hard: ${HARD_TOKENS / 1000}k).`,
      `${verb === "BLOCK" ? "Autopilot active — refreshing now." : "Approaching 1M ceiling."}`,
      "Write HANDOFF.md ## RESUME, then /compact before continuing heavy work.",
    ].join(" ");
    if (autopilot) {
      // Hard gate only when user has opted into autopilot
      emit({ decision: "block", reason });
    } else {
      // Stop contract has no "allow" — advise via Stop's additionalContext and continue
      emit({
        continue: true,
        hookSpecificOutput: { hookEventName: "Stop", additionalContext: reason },
      });
    }
    return;
  }

  // Below soft: allow silently unless active work
  if (activeWork) {
    emit({
      decision: "approve",
      reason: `Active work detected (~${totalK}k tokens, source: ${source}). HANDOFF ## RESUME present — compact on next idle to preserve continuity.`,
    });
    return;
  }

  emit({});
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
