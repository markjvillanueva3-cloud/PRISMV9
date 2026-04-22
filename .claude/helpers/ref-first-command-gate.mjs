/**
 * ref-first-command-gate.mjs — UserPromptSubmit hook
 *
 * Detects slash commands and exploration-like prompts that would benefit
 * from having PRISM digest files loaded before searching.
 * Injects a brief reference-first directive (~100 tokens).
 *
 * Works with auto-route.mjs (SMART CONFIG) — they output separate
 * additionalContext that Claude sees together.
 */
import process from "node:process";

const promptRaw = process.env.PROMPT ?? process.argv.slice(2).join(" ") ?? "";

// Guard against excessively large prompts (pasted files, etc.)
if (promptRaw.length > 10000) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const prompt = promptRaw.trim().toLowerCase();
// Truncate for regex matching — exploration patterns always appear at the start
const promptForRegex = prompt.slice(0, 500);

// ─── Commands that DON'T need ref-first ────────────────────────
// Business ops, communication, simple utilities, mode switches
const SKIP_COMMANDS = new Set([
  // Business/ops — no codebase exploration
  "approvals",
  "desk-search",
  "e2-setup",
  "erp-health",
  "job-cost",
  "my-presets",
  "order-status",
  "shop-schedule",
  "shop-setup",
  "timeline",
  "traveler",
  // Session/context management
  "auto-commit",
  "checkpoint",
  "commands",
  "defaults",
  "dispatch-format",
  "effort",
  "handoff",
  "help",
  "notify",
  "operating-system",
  "quick-ref",
  "read-plan",
  "ref-first",
  "remember",
  "rename",
  "replay",
  "scripts",
  "snapshot",
  "status",
  "stop-check",
  "sync",
  "template",
  "yolo-mode",
  // Token/budget tools
  "counts",
  "token-budget",
  "token-ledger",
  "waste-report",
  "pressure",
  "context",
  "context-audit",
  "context-map",
  "context-integrity",
  "slim",
  // Pure calculators — no search needed
  "calc",
  "drill-calc",
  "process-calc",
  "unit-convert",
  "estimate",
  // Specific domain tools that don't explore
  "boot",
  "startup",
  "gcode",
  "health",
  "test",
  "measure",
  "calibrate",
  "pdf",
  "pdf-learn",
  "video-replay",
  "youtube-transcript",
  // Hooks/monitoring — not codebase exploration
  "bash-optimize",
  "bash-shortcuts",
  "chat",
  "claude-flow-help",
  "claude-flow-memory",
  "claude-flow-swarm",
  "hook-browse",
  "hook-profile",
  "hook-stats",
  "hook-status",
]);

// ─── Detect slash command (require / prefix) ──────────────────
const slashMatch = prompt.match(/^\/([a-z][a-z0-9:\-]*)/);
const commandName = slashMatch ? slashMatch[1] : null;

// ─── Detect exploration intent in natural language ─────────────
const explorationPatterns = [
  /where\s+(is|are|can i find)/,
  /find\s+(all|every|the|which)/,
  /which\s+(engine|dispatcher|registry|file|module)/,
  /list\s+(all|every|the)\s+(engine|dispatcher)/,
  /what\s+(engine|dispatcher|file|module)\s+(handle|does|is)/,
  /how\s+many\s+(engine|dispatcher|registry)/,
  /search\s+(for|the|through)/,
  /scan\s+(the|all|for)/,
  /explore\s+(the|all|codebase)/,
  /look\s+(for|at|through|into)\s+(all|every|the)/,
];
const hasExplorationIntent = explorationPatterns.some((p) => p.test(promptForRegex));

// ─── Decision ──────────────────────────────────────────────────
let shouldInject = false;

if (commandName && !SKIP_COMMANDS.has(commandName)) {
  // It's a slash command that's NOT in the skip list → inject
  shouldInject = true;
}

if (hasExplorationIntent) {
  shouldInject = true;
}

// Don't inject for very short prompts that are clearly not exploration
if (promptRaw.length < 15 && !commandName) {
  shouldInject = false;
}

// ─── Output ────────────────────────────────────────────────────
if (shouldInject) {
  const directive = [
    "REFERENCE-FIRST: Before searching with Glob/Grep/Agent, read the digest files.",
    "ENGINE_DIGEST.md → mcp-server/data/docs/ENGINE_DIGEST.md (1,304 engines)",
    "DISPATCHER_DIGEST.md → mcp-server/data/docs/DISPATCHER_DIGEST.md (79 dispatchers)",
    "DIRECTORY_DIGEST.md → mcp-server/data/docs/DIRECTORY_DIGEST.md (domain→path routing)",
    "Paths: Engines→src/engines/ | Dispatchers→src/tools/dispatchers/ | Registries→src/registries/ | Physics→src/physics/constants.ts",
  ].join(" | ");

  process.stdout.write(JSON.stringify({ additionalContext: directive }));
} else {
  process.stdout.write(JSON.stringify({}));
}
