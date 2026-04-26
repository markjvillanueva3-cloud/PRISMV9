import process from "node:process";

const AGENT_THRESHOLD = 3000;
const MCP_THRESHOLD = 2000;

function collectOutputLength() {
  let total = 0;
  for (const [key, value] of Object.entries(process.env)) {
    if (
      typeof value === "string" &&
      value.length > 0 &&
      (key === "TOOL_RESULT" ||
        key === "TOOL_OUTPUT" ||
        key.startsWith("TOOL_RESULT_") ||
        key.startsWith("TOOL_OUTPUT_"))
    ) {
      total += value.length;
    }
  }
  return total;
}

function main() {
  const toolName = process.env.TOOL_NAME ?? "";
  const outputLen = collectOutputLength();

  if (toolName === "Agent" && outputLen > AGENT_THRESHOLD) {
    process.stdout.write(JSON.stringify({
      additionalContext: `TOKEN-OPT: Agent returned ${Math.round(outputLen / 1000)}K chars. Summarize the key finding in 1-3 sentences — do not echo the full result.`,
    }));
    return;
  }

  if (toolName.startsWith("mcp__prism") && outputLen > MCP_THRESHOLD) {
    process.stdout.write(JSON.stringify({
      additionalContext: `TOKEN-OPT: MCP tool returned ${Math.round(outputLen / 1000)}K chars. Extract only the result values you need — ignore metadata and debug fields.`,
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
