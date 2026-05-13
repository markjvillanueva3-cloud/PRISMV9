#!/usr/bin/env node
// tier: T4
/**
 * subagent-start-context.mjs — SubagentStart hook
 *
 * Injects the PRISM spawned-agent context bundle into every spawned
 * subagent's first turn so it operates with the same awareness as
 * the primary Claude session.
 *
 * Reads stdin JSON: { subagent_type, prompt?, session_id?, ... }
 * Emits stdout JSON: { continue: true, additionalContext: <bundle> }
 *
 * Fail-safe: any error → emit a minimal fallback context, never block.
 * Hard timeout via the hook framework (3s). Do not embed Ollama or
 * any network call.
 */

import { buildSpawnedAgentAdditionalContext } from "../../scripts/agents/spawned-agent-context-lib.mjs";

let payload = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => { payload += c; });
process.stdin.on("end", async () => {
  let parsed = {};
  try { parsed = JSON.parse(payload); } catch { /* ignore */ }

  const subagentType = parsed.subagent_type || parsed.subagentType || "spawned";
  const sessionId = parsed.session_id || parsed.sessionId || process.env.PRISM_AGENT_INSTANCE || "";
  const parentFamily = parsed.parent_family || process.env.PRISM_AGENT_FAMILY || "Claude";
  const parentInstance = sessionId.startsWith("claude-") ? sessionId : (sessionId ? `claude-${sessionId}` : "");

  // Surface the description / first 200 chars of the agent prompt so the
  // context bundle can include a tasknote for the per-subagent rules.
  const taskNote = (parsed.description || (parsed.prompt || "").slice(0, 240) || "").trim();

  try {
    const bundle = await buildSpawnedAgentAdditionalContext({
      parentFamily, parentInstance, subagentType, taskNote,
    });
    process.stdout.write(JSON.stringify({ continue: true, additionalContext: bundle }));
  } catch (e) {
    process.stdout.write(JSON.stringify({
      continue: true,
      additionalContext:
        `# PRISM SPAWNED-AGENT CONTEXT (fallback)\n` +
        `Subagent: ${subagentType} · Parent: ${parentFamily}/${parentInstance}\n` +
        `Bundle build failed: ${e.message}.\n` +
        `Read these directly:\n` +
        `- H:/prism/state/shared/CLAUDE-BRIEF.md (identity)\n` +
        `- H:/prism/state/shared/BUILD_STATE.md (built / wiring / pending / FE)\n` +
        `- H:/prism/state/shared/MILESTONE_PROGRESS.md (shipped vs claimed)\n` +
        `- H:/prism/state/shared/SVI-compact.md (SVI / Psi / alerts)\n` +
        `- H:/prism/state/CURRENT_POSITION.md\n` +
        `- H:/prism/state/shared/handoffs/HANDOFF-${parentInstance}-*.md (this chat's RESUME)\n` +
        `- H:/prism/PRISM-INVENTORY-LATEST.md (live counts)\n` +
        `Query helpers:\n` +
        `- node H:/prism/scripts/system-viz-query.mjs headline\n` +
        `- node H:/prism/.claude/scripts/tribal-rerank.mjs --query "<text>" --json\n`,
    }));
  }
});
