/**
 * ref-first-agent-gate.mjs — PreToolUse hook for Agent tool
 *
 * Intercepts Agent spawns that look like exploration/search tasks
 * and reminds Claude to check digest files first.
 * Prevents burning tokens on Explore agents when the answer is
 * already in ENGINE_DIGEST, DISPATCHER_DIGEST, or DIRECTORY_DIGEST.
 */
import process from "node:process";

function main() {
  const prompt = (process.env.TOOL_INPUT_prompt ?? "").toLowerCase();
  const subagentType = (
    process.env.TOOL_INPUT_subagent_type ?? ""
  ).toLowerCase();

  // Detect exploration-like agent spawns
  // Only gate explicitly exploration-typed agents; untyped agents rely on keyword detection
  const explorationTypes = new Set([
    "explore",
    "general-purpose",
    "code-archaeologist",
  ]);
  const isExplorationAgent = explorationTypes.has(subagentType);

  const explorationKeywords = [
    "search",
    "find",
    "locate",
    "where is",
    "grep",
    "glob",
    "look for",
    "explore",
    "investigate",
    "which file",
    "which engine",
    "which dispatcher",
    "what engine",
    "list all",
    "find all",
    "scan for",
    "discover",
  ];
  const hasExplorationIntent = explorationKeywords.some((kw) =>
    prompt.includes(kw),
  );

  if (isExplorationAgent || hasExplorationIntent) {
    process.stdout.write(
      JSON.stringify({
        additionalContext: [
          "REFERENCE-FIRST GATE: Before spawning this exploration agent, check if digest files already have the answer.",
          "",
          "READ THESE FIRST (zero search needed):",
          "  ENGINE_DIGEST.md → mcp-server/data/docs/ENGINE_DIGEST.md — 1,304 engines, 1-line each",
          "  DISPATCHER_DIGEST.md → mcp-server/data/docs/DISPATCHER_DIGEST.md — 79 dispatchers + action counts",
          "  DIRECTORY_DIGEST.md → mcp-server/data/docs/DIRECTORY_DIGEST.md — domain→path routing table",
          "  MASTER_INDEX_COMPACT → mcp-server/src/data/docs/MASTER_INDEX_COMPACT.md — system overview",
          "",
          "For future similar queries, prefer reading the digest file directly instead of spawning an agent.",
          "Include these digest paths in the agent's prompt so it reads them before searching.",
        ].join("\n"),
      }),
    );
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main();
