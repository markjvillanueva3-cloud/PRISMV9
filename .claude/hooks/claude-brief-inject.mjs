#!/usr/bin/env node
// tier: T2
/**
 * claude-brief-inject.mjs — SessionStart hook (pointer mode by default, Wave 2).
 *
 * History: this hook used to inject up to 4000B of CLAUDE-BRIEF.md content
 * on every SessionStart. The 2026-05-11 analysis (state/shared/specs/
 * ANALYSIS-HANDOFF-SYSTEM-2026-05-11.md §3 P0) identified the file-reader
 * injectors as the root cause of "compacted session larger than pre-compact"
 * — every /compact resume re-fires SessionStart which re-floods the
 * compacted context with this 4KB inject.
 *
 * Now (2026-05-19, [GOLF]/U-WAVE2): default mode is `pointer` — emit a 1-line
 * pointer with file age. The file is still regenerated on staleness so the
 * disk content stays fresh; the inject just doesn't re-flood every /compact.
 * Agents Read CLAUDE-BRIEF.md on demand when they need the full context.
 *
 * Modes (env knob `PRISM_BRIEF_INJECT_MODE`):
 *   pointer (default)   — 1-line pointer + age + first-paragraph headline
 *   headline            — pointer + ~600B System scale + Top unwired domains
 *   full                — legacy 4000B inject (back-compat escape hatch)
 *   silent              — emit nothing (rare; for chats that already have the brief loaded)
 *
 * Regen logic preserved: if brief is missing or >24h stale, regenerate before
 * inject. Regen runs whether or not the inject body is reduced — the file
 * stays fresh so on-demand reads return current content.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

let _hp_shouldSkip = async () => false;
try {
  ({ shouldSkipHook: _hp_shouldSkip } = await import("../helpers/hook-profile.mjs"));
} catch {
  /* no-op */
}

const REPO_ROOT = "H:/prism";
const BRIEF = path.join(REPO_ROOT, "state/shared/CLAUDE-BRIEF.md");
const GEN = path.join(REPO_ROOT, "mcp-server/scripts/generate-claude-brief.mjs");
const STALENESS_HOURS = 24;

// Legacy back-compat: PRISM_CLAUDE_BRIEF_MAX_BYTES still respected when
// mode=full. Default 4000B unchanged from the pre-WAVE2 behavior.
const LEGACY_MAX_BYTES = Number(process.env.PRISM_CLAUDE_BRIEF_MAX_BYTES || 4000);
const HEADLINE_MAX_BYTES = 800;

function emit(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }),
  );
}

function ageHours(p) {
  if (!existsSync(p)) return Infinity;
  return (Date.now() - statSync(p).mtimeMs) / (1000 * 60 * 60);
}

function regenerateIfStale() {
  if (ageHours(BRIEF) <= STALENESS_HOURS) return;
  const node = process.execPath || "node";
  spawnSync(node, [GEN, "--write"], { windowsHide: true, timeout: 10_000, stdio: "ignore" });
}

function formatAge(hours) {
  if (!isFinite(hours)) return "?";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function buildPointer() {
  if (!existsSync(BRIEF)) {
    return [
      "⚠ CLAUDE-BRIEF.md missing.",
      `  Expected: ${BRIEF}`,
      "  Generate: `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs --write`",
    ].join("\n");
  }
  const age = formatAge(ageHours(BRIEF));
  return [
    "## 🧭 PRISM CLAUDE-BRIEF — auto-generated system context on disk",
    `   📍 \`state/shared/CLAUDE-BRIEF.md\` (age: ${age}, regenerates ≤24h) — what PRISM is, identity & paths, system scale, system map, wiki brain, process priority`,
    "   Read this file when you need the full system context. Live counts live here.",
    "   Inject modes: `PRISM_BRIEF_INJECT_MODE=full` (4KB legacy), `=headline` (~800B), `=silent`.",
  ].join("\n");
}

function buildHeadline() {
  if (!existsSync(BRIEF)) return buildPointer();
  const age = formatAge(ageHours(BRIEF));
  const content = readFileSync(BRIEF, "utf8");
  // Extract the first section ("## What PRISM is" or first ## block up to ~600B)
  let headline = "";
  const sections = content.split(/\n## /);
  for (const sec of sections.slice(0, 3)) {
    headline += (headline ? "\n## " : "") + sec;
    if (headline.length > HEADLINE_MAX_BYTES) break;
  }
  if (headline.length > HEADLINE_MAX_BYTES) {
    headline = headline.slice(0, HEADLINE_MAX_BYTES - 12) + "\n…(truncated)";
  }
  return [
    `## 🧭 PRISM CLAUDE-BRIEF (headline mode, age: ${age}) — full at \`state/shared/CLAUDE-BRIEF.md\``,
    "",
    headline,
  ].join("\n");
}

function buildLegacyFull() {
  if (!existsSync(BRIEF)) return buildPointer();
  let content = readFileSync(BRIEF, "utf8");
  if (content.length > LEGACY_MAX_BYTES) {
    content = content.slice(0, LEGACY_MAX_BYTES) + `\n\n[truncated — full brief at ${BRIEF}]`;
  }
  return content;
}

(async () => {
  if (await _hp_shouldSkip("claude-brief-inject")) {
    process.exit(0);
  }

  const mode = String(process.env.PRISM_BRIEF_INJECT_MODE || "pointer").toLowerCase();
  if (mode === "silent") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  try {
    regenerateIfStale();
    const body =
      mode === "full" ? buildLegacyFull() :
      mode === "headline" ? buildHeadline() :
      buildPointer();
    emit(body);
    process.exit(0);
  } catch (err) {
    emit(`⚠ claude-brief-inject failed (${err.message}). Run \`node ${GEN} --write\` manually; read \`state/shared/CLAUDE-BRIEF.md\` on demand.`);
    process.exit(0);
  }
})();
