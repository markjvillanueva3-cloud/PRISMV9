/**
 * mcp-health-recovery.mjs — Phase 1-D: MCP server failure detection + recovery
 *
 * PostToolUseFailure hook. Detects MCP connection failures and suggests
 * recovery steps. Tracks consecutive failures to avoid spam.
 *
 * Depends on: tool-counter.mjs (Phase 0-A)
 */

import { getCount, increment, reset } from "./tool-counter.mjs";

const TOOL_RESULT = process.env.TOOL_RESULT || "";
const TOOL_NAME = process.env.TOOL_NAME || "";

// MCP failure patterns
const MCP_FAILURE_PATTERNS = [
  /\bMCP\b.*\b(error|fail|timeout|disconnect|unavailable)\b/i,
  /\bconnection\s+(refused|reset|closed|timeout)\b/i,
  /\bECONNREFUSED\b/,
  /\bECONNRESET\b/,
  /\bETIMEDOUT\b/,
  /\bserver\s+(not\s+)?respond/i,
  /\bspawn\b.*\b(UNKNOWN|ENOENT)\b/i,
  /\btool\s+not\s+found\b/i
];

const COUNTER_NAME = "mcp_consecutive_failures";

async function main() {
  const resultText = typeof TOOL_RESULT === "string" ? TOOL_RESULT : "";

  // Check if this looks like an MCP failure
  const isMcpFailure = MCP_FAILURE_PATTERNS.some(p => p.test(resultText));

  if (!isMcpFailure) {
    // Success or non-MCP failure — reset consecutive counter
    const prev = await getCount(COUNTER_NAME);
    if (prev > 0) await reset(COUNTER_NAME);
    return;
  }

  const consecutiveFailures = await increment(COUNTER_NAME);

  // Don't spam — only suggest recovery at specific counts
  if (consecutiveFailures === 1) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[mcp-health] MCP tool failure detected (${TOOL_NAME}). This may be transient — retry once before escalating.`
    }));
  } else if (consecutiveFailures === 3) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[mcp-health] 3 consecutive MCP failures. Possible server issue. Try: (1) Check if MCP server is running, (2) Restart with \`npx @anthropic-ai/claude-code mcp restart\`, (3) Use alternative tools (Bash, direct file ops) as fallback.`
    }));
  } else if (consecutiveFailures >= 5) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[mcp-health] ${consecutiveFailures} consecutive MCP failures — server likely down. Switch to direct tools (Bash, Read, Write) for remaining work. Notify user about MCP health issue.`
    }));
    await reset(COUNTER_NAME); // Reset to avoid infinite escalation
  }
}

main().catch(() => {
  // Silent failure — never block on health check errors
});
