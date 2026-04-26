import { inferAgentIdentity } from "./agent-identity.mjs";
import { buildSpawnedAgentAdditionalContext } from "../../scripts/agents/spawned-agent-context-lib.mjs";

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const subagentType = process.env.TOOL_INPUT_subagent_type?.trim() || "spawned";
  const identity = inferAgentIdentity();
  const additionalContext = await buildSpawnedAgentAdditionalContext({
    parentFamily: identity.family,
    parentInstance: identity.instance,
    subagentType,
  });

  process.stdout.write(
    JSON.stringify({
      additionalContext,
    }),
  );
}

main().catch(() => {
  process.stdout.write(
    JSON.stringify({
      additionalContext:
        "PRISM SPAWNED-AGENT CONTEXT unavailable. Fall back to CURRENT_POSITION, HANDOFF, SVI-compact, AGENT_WORKBOARD, AGENT_CHAT, ROADMAP_COLLABORATION_STATE, and the shared MCP/SVI/coordination/search directives.",
    }),
  );
});
