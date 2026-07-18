// tier: T4
// pretool-bundle.mjs -- Consolidated PreToolUse hooks using hook-runner library

import { runBundle, runHook, readStdin, emit } from "./lib/hook-runner.mjs";
import { fileURLToPath } from "node:url";

const HOOK_BASE = "H:/prism/.claude/hooks";

const SUB_HOOKS = {
  // Write-only
  writeOnly: [
    { path: `${HOOK_BASE}/hook-creation-gate.mjs`, timeout: 3000 },
  ],
  // Edit|Write|MultiEdit|NotebookEdit
  editWrite: [
    { path: `${HOOK_BASE}/hook-cross-worktree-block.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/file-claim-guard.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/critical-file-guard.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/h-drive-enforcement.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/sx-gate.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/pre-rename-guard.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/edit-bundle.mjs`, timeout: 12000 },
    { path: `${HOOK_BASE}/hook-tier-validator.mjs`, timeout: 3000 },
  ],
  // MCP prism tools
  mcpRouting: [
    { path: `${HOOK_BASE}/helpers/mcp-action-router.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/helpers/mcp-pretool-injector.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/hooks/mcp-connection-coordinator.mjs`, timeout: 5000 },
  ],
  // Skill
  skill: [
    { path: `${HOOK_BASE}/skill-3q-gate.mjs`, timeout: 8000 },
  ],
  // Task
  task: [
    { path: `${HOOK_BASE}/agent-rules-inject.mjs`, timeout: 3000 },
  ],
  // TaskCreate
  taskCreate: [
    { path: `${HOOK_BASE}/task-created-claim-guard.mjs`, timeout: 3000 },
  ],
  // Bash
  bash: [
    { path: `${HOOK_BASE}/bundles/bash-bundle.mjs`, timeout: 8000 },
    { path: `${HOOK_BASE}/tsc-baseline-regression-gate.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/asset-deletion-block.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/auto-fork-executor.mjs`, timeout: 5000 },
    { path: `${HOOK_BASE}/bash-result-cache.mjs`, timeout: 3000 },
  ],
  // Read
  read: [
    { path: `${HOOK_BASE}/bundles/read-bundle.mjs`, timeout: 5000 },
  ],
  // Agent
  agent: [
    { path: `${HOOK_BASE}/ai-system-router-inject.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/agent-vs-direct.mjs`, timeout: 3000 },
  ],
  // Global (tribal-spike + autonomous-loop-defer)
  global: [
    { path: `${HOOK_BASE}/tribal-spike.mjs`, timeout: 3000 },
    { path: `${HOOK_BASE}/autonomous-loop-defer.mjs`, timeout: 3000 },
  ],
  // Precompact auto-trigger (always runs)
  precompact: [
    { path: `${HOOK_BASE}/precompact-auto-trigger.mjs`, timeout: 3000, args: ["--pre"] },
  ],
  // Hermes-prism-inject for agent/task/taskcreate/skill
  hermesInject: [
    { path: `${HOOK_BASE}/hermes-prism-inject.mjs`, timeout: 3000 },
  ],
};

async function main() {
  const payload = await readStdin();
  if (!payload) { emit({ continue: true }); return; }
  
  const input = JSON.parse(payload);
  const toolName = input.tool_name || "";
  let allContext = "";
  let blocked = false, blockReason = null;
  
  // Precompact auto-trigger always runs
  const precompactResult = await runHook(`${HOOK_BASE}/precompact-auto-trigger.mjs`, payload, 3000);
  if (precompactResult.parsed?.additionalContext) allContext += precompactResult.parsed.additionalContext + "\n";
  
  // Tool-specific bundles
  if (toolName === "Write") {
    const r = await runBundle(SUB_HOOKS.writeOnly, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(toolName)) {
    const r = await runBundle(SUB_HOOKS.editWrite, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName.startsWith("mcp__prism")) {
    const r = await runBundle(SUB_HOOKS.mcpRouting, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName === "Skill") {
    const r = await runBundle(SUB_HOOKS.skill, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName === "Task") {
    const r = await runBundle(SUB_HOOKS.task, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName === "TaskCreate") {
    const r = await runBundle(SUB_HOOKS.taskCreate, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName === "Bash") {
    const r = await runBundle(SUB_HOOKS.bash, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName === "Read") {
    const r = await runBundle(SUB_HOOKS.read, payload);
    if (!r.continue) { blocked = true; blockReason = r.stopReason; }
    if (r.hookSpecificOutput?.additionalContext) allContext += r.hookSpecificOutput.additionalContext + "\n";
  }
  
  if (toolName === "Agent") {
    const r1 = await runBundle(SUB_HOOKS.agent, payload);
    if (!r1.continue) { blocked = true; blockReason = r1.stopReason; }
    if (r1.hookSpecificOutput?.additionalContext) allContext += r1.hookSpecificOutput.additionalContext + "\n";
    
    const r2 = await runHook(`${HOOK_BASE}/hermes-prism-inject.mjs`, payload, 3000);
    // hermes-prism-inject is an ADVISORY routing injector, not a gate. Only an EXPLICIT
    // continue:false / decision:"deny" blocks -- a crash or a normal inject (which emits no
    // `continue` field) must FAIL OPEN, else a mangled injector hard-blocks every agent spawn
    // fleet-wide (2026-07-04 KIENZLE-ALGO/U-HERMES-INJECT-GATE-FIX).
    if (r2.parsed?.continue === false || r2.parsed?.decision === "deny") { blocked = true; blockReason = r2.parsed?.stopReason || "hermes-inject"; }
    const r2ctx = r2.parsed?.hookSpecificOutput?.additionalContext || r2.parsed?.additionalContext;
    if (r2ctx) allContext += r2ctx + "\n";
  }
  
  // Global always runs
  const rGlobal = await runBundle(SUB_HOOKS.global, payload);
  if (!rGlobal.continue) { blocked = true; blockReason = rGlobal.stopReason; }
  if (rGlobal.hookSpecificOutput?.additionalContext) allContext += rGlobal.hookSpecificOutput.additionalContext + "\n";
  
  // Hermes inject for Task/TaskCreate/Skill
  if (["Task", "TaskCreate", "Skill"].includes(toolName)) {
    const r = await runHook(`${HOOK_BASE}/hermes-prism-inject.mjs`, payload, 3000);
    // Fail OPEN on a crashed/normal inject (see Agent branch note) -- only explicit deny blocks.
    if (r.parsed?.continue === false || r.parsed?.decision === "deny") { blocked = true; blockReason = r.parsed?.stopReason || "hermes-inject"; }
    const rctx = r.parsed?.hookSpecificOutput?.additionalContext || r.parsed?.additionalContext;
    if (rctx) allContext += rctx + "\n";
  }
  
  if (blocked) {
    emit({ continue: false, stopReason: blockReason, systemMessage: blockReason });
    return;
  }
  
  const resp = { continue: true };
  if (allContext.trim()) {
    resp.hookSpecificOutput = { hookEventName: "PreToolUse", additionalContext: allContext.trim() };
  }
  emit(resp);
}

const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
})();
if (__isCLI) {
  main().catch(err => {
    try { process.stderr.write(`pretool-bundle error: ${err}\n`); } catch {}
    emit({ continue: true });
  });
}