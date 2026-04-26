/**
 * auto-resume-injector.mjs — PostCompact hook for full automated resumption
 *
 * After compaction, this hook:
 * 1. Reads HANDOFF.md RESUME section
 * 2. Reads compaction survival state
 * 3. Reads autopilot flag (if active)
 * 4. Injects a MANDATORY auto-resume directive as additionalContext
 *
 * The injected context tells Claude to:
 * - NOT ask the user what to do
 * - NOT summarize what happened
 * - Read HANDOFF.md and execute the RESUME instruction immediately
 * - Continue roadmap execution autonomously
 *
 * This replaces the simpler post-compact-enhanced.mjs message with a
 * full startup-equivalent injection.
 */
import { promises as fs } from "node:fs";
import process from "node:process";
import { cachePath } from "./hook-cache.mjs";

const PATHS = {
  handoff: "H:\\prism\\state\\HANDOFF.md",
  handoffLatest: "H:\\prism\\state\\shared\\handoffs\\HANDOFF-latest.md",
  survival: "H:\\prism\\.claude\\helpers\\.compaction-survival.md",
  autopilotFlag: cachePath("autopilot-active"),
  editCounter: "H:\\prism\\state\\session-edit-counter.json",
  autoCompactTracker: "H:\\prism\\state\\auto-compact-tracker.json",
};

async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function extractResume(handoff) {
  if (!handoff) return null;
  const resumeMatch = handoff.match(/## RESUME\s*\n([\s\S]*?)(?=\n##|\n---|\Z|$)/i);
  if (resumeMatch) {
    return resumeMatch[1].trim().split("\n").filter(Boolean).slice(0, 5).join(" ");
  }
  return null;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const timestamp = new Date().toISOString();

  // 1. Reset session trackers (same as post-compact-enhanced.mjs)
  await writeJson(PATHS.editCounter, { engine_edits_since_review: 0, total_edits: 0, last_reset: timestamp });
  await writeJson(PATHS.autoCompactTracker, { edits: 0, engines_written: 0, last_reset: timestamp });

  // 2. Copy HANDOFF to shared
  const handoff = await readFile(PATHS.handoff);
  if (handoff) {
    try {
      await fs.writeFile(PATHS.handoffLatest, handoff, "utf8");
    } catch { /* ok */ }
  }

  // 3. Extract RESUME directive
  const resumeDirective = extractResume(handoff);

  // 4. Check autopilot flag
  const autopilot = await readJson(PATHS.autopilotFlag);
  const isAutopilot = autopilot?.active === true;

  // 5. Read survival state for context
  const survival = await readFile(PATHS.survival);
  const survivalSummary = survival
    ? survival.split("\n").filter(l => l.startsWith("- ") || l.startsWith("## ")).slice(0, 8).join(" | ")
    : "No survival data";

  // 6. Build the auto-resume injection
  const parts = [];

  parts.push("=== POST-COMPACTION AUTO-RESUME ===");
  parts.push(`Compaction completed at ${timestamp}. Session trackers reset.`);

  if (resumeDirective) {
    parts.push(`RESUME DIRECTIVE: ${resumeDirective}`);
  }

  if (isAutopilot) {
    parts.push("AUTOPILOT MODE ACTIVE. You MUST:");
    parts.push("1. Read H:/prism/state/HANDOFF.md for the full RESUME section");
    parts.push("2. Execute the RESUME instruction IMMEDIATELY without asking the user");
    parts.push("3. Do NOT summarize, do NOT ask what to do, do NOT run /startup — just continue working");
    parts.push("4. When context pressure rises again, write HANDOFF.md and /compact again");
    parts.push("5. This loop continues until the roadmap track is complete");
    if (autopilot.track) {
      parts.push(`Active track: ${autopilot.track}`);
    }
    if (autopilot.milestone) {
      parts.push(`Active milestone: ${autopilot.milestone}`);
    }
  } else {
    parts.push("Read H:/prism/state/HANDOFF.md RESUME section and continue working without summarizing.");
  }

  parts.push(`Context: ${survivalSummary}`);

  const additionalContext = parts.join(" ");

  process.stdout.write(JSON.stringify({ additionalContext }));
}

main().catch((err) => {
  process.stderr.write(`AUTO-RESUME ERROR: ${err?.message || err}\n`);
  process.stdout.write(JSON.stringify({
    additionalContext: "POST-COMPACT: Auto-resume handler error. Read H:/prism/state/HANDOFF.md to resume.",
  }));
});
