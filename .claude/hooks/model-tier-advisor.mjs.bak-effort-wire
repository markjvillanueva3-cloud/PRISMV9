// tier: T2
/**
 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
 *
 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
 * sonnet/haiku for capable tasks. The main-loop model CANNOT be hook-forced (no harness API), so the
 * realistic enforcement is a per-prompt, impossible-to-miss DIRECTIVE (same mechanism as the SKILL
 * AUTO-INVOKE block) + the existing Ollama autoexec for the offloadable lane. This hook injects that
 * directive on every prompt, sourced from the SINGLE policy brain (model-routing-policy.routePrompt)
 * which fuses the Claude-tier decision with the MEASURED Ollama capability matrix.
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never -- advisory only (fail-soft: any error -> silent exit 0, never breaks a prompt).
 * KNOBS: PRISM_MODEL_TIER_ADVISOR_DISABLE=1 (off) · PRISM_MODEL_TIER_ADVISOR_VERBOSE=1 (always show,
 *        even when the route matches the session default).
 *
 * HONESTY (R12): this RECOMMENDS the main-loop tier (the operator acts via /model, or the next
 * session default applies); it AUTO-ROUTES nothing on the main loop. The ollama lane IS auto-executed
 * downstream by ollama-task-offloader / the AUTOEXEC pipeline -- this hook surfaces WHICH model.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const MATRIX_PATH = path.join(ROOT, "state", "shared", "ollama-capability-matrix.json");

let currentSessionId = "";
function emit(additionalContext) {
  // U-INJECT-DRIFT-FIX (india 2026-06-12): route through the canonical injection-dedup chokepoint so a
  // repeated identical tier recommendation (consecutive same-class prompts) emits a 1-line marker.
  // Fail-soft: dedupeOrMarker returns the block unchanged on any error / missing session id.
  const out = dedupeOrMarker(additionalContext, { sessionId: currentSessionId, hookName: "model-tier-advisor", root: ROOT });
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: out },
  }));
}

async function main() {
  if (process.env.PRISM_MODEL_TIER_ADVISOR_DISABLE === "1") process.exit(0);

  let payload;
  try { payload = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
  const prompt = String(payload?.prompt ?? payload?.user_prompt ?? "");
  currentSessionId = String(payload?.session_id ?? "");
  if (!prompt.trim() || prompt.length < 12) process.exit(0); // skip trivial / empty

  // Load the policy brain + the measured matrix (both fail-soft).
  let routePrompt;
  try { ({ routePrompt } = await import("../../scripts/lib/model-routing-policy.mjs")); }
  catch { process.exit(0); }
  let matrix = null;
  try { matrix = JSON.parse(readFileSync(MATRIX_PATH, "utf8")); } catch { /* no matrix -> claude-only routing */ }

  let v;
  try { v = routePrompt({ prompt, matrix }); } catch { process.exit(0); }
  if (!v || !v.engine) process.exit(0);

  const verbose = process.env.PRISM_MODEL_TIER_ADVISOR_VERBOSE === "1";
  const sessionModel = String(process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || "").toLowerCase();

  if (v.engine === "ollama") {
    emit([
      "## 🎚️ MODEL-ROUTING -- OFFLOAD to Ollama ($0)",
      `This is a **${v.taskClass}** task the capability matrix proves **100%** on \`${v.model}\`.`,
      `Route it local: \`node H:/prism/scripts/ask-ollama.mjs <mode> "<task>"\` (or let the ollama-offloader auto-exec).`,
      `Reserve Claude tokens for judgment/safety. (${v.reason})`,
    ].join("\n"));
    process.exit(0);
  }

  // Cloud long-context tier (CLOUD-OVERFLOW-MS0): OpenRouter Nemotron-3, 1M ctx, $0 free tier.
  if (v.engine === "openrouter") {
    emit([
      "## 🎚️ MODEL-ROUTING -- CLOUD long-context ($0 free tier)",
      `This is a **deep-research / long-context** task -> route to OpenRouter Nemotron (1M ctx).`,
      "Run it via Bash (0 tokens enter THIS context; the heavy input is processed in the subprocess):",
      "  `node H:/prism/scripts/ask-openrouter.mjs research \"<question>\"`  (or `longread <file>` for a huge doc)",
      `Needs OPENROUTER_API_KEY in env; it fails loud -> Claude fallback if unset. (${v.reason})`,
    ].join("\n"));
    process.exit(0);
  }

  // Claude lane: recommend the tier.
  const matchesSession = sessionModel && sessionModel.includes(v.tier);
  if (matchesSession && !verbose) process.exit(0); // already on the right tier -> stay quiet
  const tierBlurb = {
    fable: "deep planning / brainstorming / gap-filling / deep reasoning (THINK)",
    opus: "lighter reasoning + heavy building / coding (BUILD)",
    sonnet: "a capable mid-tier task",
    haiku: "a trivial mechanical task",
  }[v.tier] || v.tier;
  emit([
    "## 🎚️ MODEL-ROUTING",
    `This looks like **${tierBlurb}** -> recommended tier: **${v.tier}**.`,
    sessionModel ? `Session model: \`${sessionModel}\`. If different, switch: \`/model ${v.tier}\`.` : `Switch if needed: \`/model ${v.tier}\`.`,
    `(${v.reason})`,
  ].join("\n"));
  process.exit(0);
}

main().catch(() => process.exit(0));
