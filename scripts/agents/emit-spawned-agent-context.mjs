import process from "node:process";
import { buildSpawnedAgentAdditionalContext } from "./spawned-agent-context-lib.mjs";

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
        continue;
      }
      parsed[key] = next;
      index += 1;
      continue;
    }
    parsed._.push(token);
  }
  return parsed;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const additionalContext = await buildSpawnedAgentAdditionalContext({
    parentFamily:
      typeof parsed["parent-family"] === "string" ? parsed["parent-family"] : process.env.PRISM_AGENT_FAMILY,
    parentInstance:
      typeof parsed["parent-instance"] === "string" ? parsed["parent-instance"] : process.env.PRISM_AGENT_INSTANCE,
    subagentType:
      typeof parsed.type === "string"
        ? parsed.type
        : typeof parsed["subagent-type"] === "string"
          ? parsed["subagent-type"]
          : "spawned",
  });

  if (parsed.plain) {
    process.stdout.write(`${additionalContext}\n`);
    return;
  }

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
