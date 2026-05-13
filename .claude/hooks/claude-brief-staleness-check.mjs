#!/usr/bin/env node
// tier: T2
/**
 * claude-brief-staleness-check.mjs — UserPromptSubmit hook
 *
 * Mid-session awareness-layer enforcement. The SessionStart hook injected
 * the full brief once. As the session drags on, the brief on disk may drift
 * from current PRISM state (other chats commit, drift monitor fires, etc.),
 * AND the conversation may no longer have the original brief in active
 * context (long sessions get the brief summarized away by Claude's own
 * context management even before formal compaction).
 *
 * Tiered response based on staleness:
 *   - <2h since last brief regen: silent (don't burn tokens)
 *   - 2h–6h: nudge (single line pointing at /refresh-awareness)
 *   - 6h–12h: abbreviated re-inject (~1.5KB headline section + active branch
 *             + top-5 gaps) — keeps awareness alive without paying the full
 *             ~13KB brief cost on every prompt
 *   - >12h: full re-inject (entire brief content) — high cost, but at this
 *           point the brief context has almost certainly fallen out of
 *           Claude's active window and the user is at risk of getting
 *           drift-driven decisions
 *
 * Tunables at top of file. Fail-open at every step.
 */
import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";

const BRIEF = "H:/prism/state/shared/CLAUDE-BRIEF.md";
const BUILD_CONTEXT = "H:/prism/state/shared/PRISM-BUILD-CONTEXT.md";
const GAPS = "H:/prism/state/shared/AUDIT-PRIORITIZED-GAPS.md";

const NUDGE_THRESHOLD_HOURS = 2;
const ABBREVIATED_THRESHOLD_HOURS = 6;
const FULL_REINJECT_THRESHOLD_HOURS = 12;
const MAX_FULL_INJECT_BYTES = 13000;
const MAX_ABBREVIATED_BYTES = 2000;

function emit(additionalContext) {
  if (!additionalContext) {
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  }));
}

function readSafe(p) {
  try { return existsSync(p) ? readFileSync(p, "utf8") : ""; } catch { return ""; }
}

function ageHours(p) {
  if (!existsSync(p)) return Infinity;
  return (Date.now() - statSync(p).mtimeMs) / (1000 * 60 * 60);
}

function abbreviatedBrief() {
  const brief = readSafe(BRIEF);
  if (!brief) return null;
  const sectionsToKeep = [
    "## What PRISM is",
    "## Identity & paths",
    "## System scale",
    "## Process priority",
    "## CAM integration status (tier-1)",
    "## JM machine fleet",
    "## Top 10 honest gaps",
  ];
  const lines = brief.split("\n");
  const out = [];
  let keep = false;
  let kept = 0;
  for (const line of lines) {
    const isSection = line.startsWith("## ");
    if (isSection) {
      keep = sectionsToKeep.some((s) => line.startsWith(s));
      if (keep) kept++;
    }
    if (keep) {
      out.push(line);
      if (out.join("\n").length > MAX_ABBREVIATED_BYTES) break;
    }
  }
  if (out.length === 0) return null;
  return `**Awareness mid-session re-inject — abbreviated brief (full at \`${BRIEF}\`):**\n\n${out.join("\n")}\n\n*Refresh: \`/refresh-awareness\` or \`node H:/prism/mcp-server/scripts/generate-claude-brief.mjs\`*`;
}

function fullBrief() {
  const brief = readSafe(BRIEF);
  if (!brief) return null;
  const trimmed = brief.length > MAX_FULL_INJECT_BYTES ? brief.slice(0, MAX_FULL_INJECT_BYTES) + `\n\n[truncated — full at ${BRIEF}]` : brief;
  return `**Awareness mid-session FULL re-inject — brief was ${(ageHours(BRIEF)).toFixed(1)}h old, exceeding ${FULL_REINJECT_THRESHOLD_HOURS}h re-inject threshold:**\n\n${trimmed}`;
}

(async () => {
  if (await _hp_shouldSkip("claude-brief-staleness-check")) {
    process.exit(0);
  }
  try {
    if (!existsSync(BRIEF)) {
      emit("⚠ CLAUDE-BRIEF.md missing. Run `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs` to populate awareness layer.");
      process.exit(0);
    }
    const age = ageHours(BRIEF);

    if (age < NUDGE_THRESHOLD_HOURS) {
      process.exit(0);
    }

    if (age < ABBREVIATED_THRESHOLD_HOURS) {
      emit(`Brief last refreshed ${age.toFixed(1)}h ago. Run \`/refresh-awareness\` if architecture context might have drifted.`);
      process.exit(0);
    }

    if (age < FULL_REINJECT_THRESHOLD_HOURS) {
      const abbrev = abbreviatedBrief();
      if (abbrev) {
        emit(abbrev);
      } else {
        emit(`Brief last refreshed ${age.toFixed(1)}h ago — abbreviated re-inject failed; run \`/refresh-awareness\` manually.`);
      }
      process.exit(0);
    }

    const full = fullBrief();
    if (full) {
      emit(full);
    } else {
      emit(`Brief last refreshed ${age.toFixed(1)}h ago — re-inject failed; run \`/refresh-awareness\` manually.`);
    }
    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
})();
