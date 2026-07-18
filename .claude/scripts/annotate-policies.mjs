#!/usr/bin/env node
/**
 * annotate-policies — SKILL-ORCH-MS0 / U-SPA09
 *
 * Batch-adds a policy: block to an asset's YAML frontmatter. Idempotent —
 * skips files that already have a policy key. Writes backups to
 * mcp-server/data/state/annotate-backups/ before mutating each file.
 *
 * Inputs: annotation specs in ANNOTATIONS below. Each spec provides:
 *   - path        repo-relative file path
 *   - name        unique asset name (kebab/snake/slash)
 *   - description short one-liner if file lacks frontmatter
 *   - policy      the policy block to emit
 *
 * Usage:
 *   node mcp-server/scripts/annotate-policies.mjs          # dry run
 *   node mcp-server/scripts/annotate-policies.mjs --apply  # write
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const BACKUP_DIR = path.join(
  REPO_ROOT,
  "mcp-server",
  "data",
  "state",
  "annotate-backups",
);
const APPLY = process.argv.includes("--apply");

// ── Policy templates (reused across multiple assets) ────────────────────────

/**
 * Tier 0 = block / inject; Tier 1 = fast sync warn/suggest;
 * Tier 2 = async fire-forget; Tier 3 = on-demand only.
 */
const T0_BLOCK_HARD = (triggers) => ({
  tier: 0,
  triggers,
  mode: "block",
  priority: 95,
  timeout_ms: 5000,
  token_budget: 300,
});

const T0_INJECT = (triggers, priority = 90) => ({
  tier: 0,
  triggers,
  mode: "inject",
  priority,
  timeout_ms: 3000,
  token_budget: 500,
});

const T1_SUGGEST = (triggers, priority = 50) => ({
  tier: 1,
  triggers,
  mode: "suggest",
  priority,
  timeout_ms: 2000,
  token_budget: 400,
});

const T1_WARN = (triggers, priority = 65) => ({
  tier: 1,
  triggers,
  mode: "warn",
  priority,
  timeout_ms: 2000,
  token_budget: 300,
});

const T2_FIRE_FORGET = (triggers, priority = 20) => ({
  tier: 2,
  triggers,
  mode: "fire-forget",
  priority,
  timeout_ms: 8000,
  token_budget: 200,
});

// ── Annotation specs ────────────────────────────────────────────────────────

const ANNOTATIONS = [
  // ═══════════ HIGH-PRIORITY COMMANDS (HARD enforcement + core dev) ═══════════
  {
    path: ".claude/commands/dedup.md",
    name: "dedup",
    description: "Check for duplicates before creating engines/algorithms/formulas/actions",
    policy: T0_BLOCK_HARD([
      {
        events: ["UserPromptSubmit"],
        keywords: ["create engine", "new engine", "build engine", "add algorithm", "new formula", "new hook"],
      },
    ]),
  },
  {
    path: ".claude/commands/scrutinize.md",
    name: "scrutinize",
    description: "Deep code quality audit over recent changes",
    policy: T1_SUGGEST([
      {
        events: ["UserPromptSubmit"],
        keywords: ["scrutinize", "review", "audit", "quality check"],
      },
      { events: ["PostToolUse"], tools: ["Edit", "Write"] },
    ], 60),
  },
  {
    path: ".claude/commands/formula-check.md",
    name: "formula-check",
    description: "Formula accuracy check across engines",
    policy: T0_INJECT([
      {
        events: ["UserPromptSubmit"],
        keywords: ["kienzle", "taylor", "cutting force", "tool life", "physics", "formula check"],
      },
      {
        events: ["PreToolUse"],
        tools: ["Edit", "Write"],
        paths: ["mcp-server/src/physics/**", "mcp-server/src/engines/*Force*", "mcp-server/src/engines/*Wear*"],
      },
    ], 90),
  },
  {
    path: ".claude/commands/program-audit.md",
    name: "program-audit",
    descri