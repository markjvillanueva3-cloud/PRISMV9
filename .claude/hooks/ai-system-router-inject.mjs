#!/usr/bin/env node
// tier: T1
/**
 * AI System Router Injection Hook (PreToolUse)
 *
 * For certain tool calls (Agent spawn, Write engine files), inject AI routing guidance
 * to ensure the right system (Docker/Ollama/Claude) is used for the task.
 */

import { readFileSync } from "fs";

// PreToolUse hooks must never crash — a thrown exception before the final
// JSON emit is interpreted by the harness as a block. Guard every step.
let input = {};
try {
  if (!process.stdin.isTTY) {
    const raw = readFileSync(0, "utf8");
    if (raw && raw.trim().startsWith("{")) input = JSON.parse(raw);
  }
} catch { /* fall through with empty input */ }
const toolName = input.tool_name || "";
// Claude Code sends `tool_input`, not `tool_params` — prior code was dead.
const params = input.tool_input || input.tool_params || {};

// AI System Routing Table
const AI_ROUTING = {
  physics_validation: { system: "docker", container: "physics-agent", fallback: "haiku" },
  engine_creation: { system: "opus", fallback: "sonnet" },
  code_review: { system: "haiku", fallback: "sonnet" },
  ml_inference: { system: "ollama", model: "codellama", fallback: "claude" },
  batch_processing: { system: "docker", container: "batch-processor", fallback: "local" },
  document_processing: { system: "docker", container: "doc-processor", fallback: "chunked" }
};

// Detect task type from tool params
function detectTaskType(toolName, params) {
  const content = JSON.stringify(params).toLowerCase();

  if (content.includes("physics") || content.includes("formula") || content.includes("kienzle")) {
    return "physics_validation";
  }
  if (toolName === "Agent" && params.subagent_type?.includes("physics")) {
    return "physics_validation";
  }
  if (toolName === "Write" && params.file_path?.includes("Engine.ts")) {
    return "engine_creation";
  }
  if (toolName === "Agent" && (params.subagent_type?.includes("review") || params.description?.includes("review"))) {
    return "code_review";
  }
  if (content.includes("ml") || content.includes("model") || content.includes("inference")) {
    return "ml_inference";
  }
  if (params.file_path && content.includes("batch")) {
    return "batch_processing";
  }
  return null;
}

const taskType = detectTaskType(toolName, params);

if (taskType && AI_ROUTING[taskType]) {
  const route = AI_ROUTING[taskType];
  const guidance = `[AI-ROUTE: ${route.system}${route.container ? `:${route.container}` : ""}${route.model ? `:${route.model}` : ""} | fallback: ${route.fallback}]`;

  // Inject as message but don't block
  console.log(JSON.stringify({
    decision: "approve",
    reason: guidance
  }));
} else {
  console.log(JSON.stringify({ decision: "approve" }));
}
