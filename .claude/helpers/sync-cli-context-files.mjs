#!/usr/bin/env node
/**
 * sync-cli-context-files.mjs — propagate CLAUDE.md to GEMINI.md / AGENTS.md
 *
 * Mirror set:
 *   H:/PRISM/CLAUDE.md         → H:/PRISM/GEMINI.md   (project, gemini cli)
 *   H:/PRISM/CLAUDE.md         → H:/PRISM/AGENTS.md   (project, codex cli)
 *   ~/.claude/CLAUDE.md        → ~/.gemini/GEMINI.md  (global,  gemini cli)
 *   ~/.claude/CLAUDE.md        → ~/.codex/AGENTS.md   (global,  codex cli)
 *
 * Each mirror gets a 3-line HTML-comment header pointing back at its source so
 * an editor opening the file sees it's auto-generated and edits will be lost.
 * Run manually after editing CLAUDE.md, or wire from a Stop hook.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const HOME = homedir().replace(/\\/g, "/");
const PROJECT_CLAUDE = "H:/PRISM/CLAUDE.md";
const GLOBAL_CLAUDE = `${HOME}/.claude/CLAUDE.md`;
const PROJECT_MEMORY = `${HOME}/.claude/projects/H--PRISM/memory/MEMORY.md`;

export const MIRRORS = [
  // CLAUDE.md → CLI-specific filenames (project + global scope)
  { src: PROJECT_CLAUDE, dst: "H:/PRISM/GEMINI.md", target: "Gemini CLI" },
  { src: PROJECT_CLAUDE, dst: "H:/PRISM/AGENTS.md", target: "Codex CLI", codexAddenda: true },
  { src: GLOBAL_CLAUDE,  dst: `${HOME}/.gemini/GEMINI.md`, target: "Gemini CLI (global)" },
  { src: GLOBAL_CLAUDE,  dst: `${HOME}/.codex/AGENTS.md`,  target: "Codex CLI (global)", codexAddenda: true },
  // MEMORY.md → CLI memory locations (Claude's auto-memory shared across CLIs).
  // Each CLI's tooling reads its own ~/.<cli>/MEMORY.md; mirror keeps them in step.
  { src: PROJECT_MEMORY, dst: `${HOME}/.gemini/MEMORY.md`, target: "Gemini memory" },
  { src: PROJECT_MEMORY, dst: `${HOME}/.codex/MEMORY.md`,  target: "Codex memory" },
];

function buildHeader(src, target) {
  const ts = new Date().toISOString();
  return [
    `<!-- AUTO-MIRRORED FROM ${src} by .claude/helpers/sync-cli-context-files.mjs -->`,
    `<!-- Mirror sync: ${ts} · Target: ${target} · DO NOT EDIT — edits will be lost on next sync -->`,
    `<!-- To update: edit ${src}, then run \`node H:/PRISM/.claude/helpers/sync-cli-context-files.mjs\` -->`,
    "",
    "",
  ].join("\n");
}

// Codex-only footer appended to the Codex AGENTS.md mirrors (project + global).
// codex-parity-audit's `codex_agents_uses_unified_directive` requires the
// CLAUDE-CODEX-MCP-DIRECTIVE.md token in ~/.codex/AGENTS.md, and Codex has no
// per-prompt hooks so it needs these pointers spelled out in the doctrine file.
export const CODEX_ADDENDA = [
  "",
  "---",
  "",
  "## Codex CLI — PRISM addenda (appended by sync-cli-context-files.mjs)",
  "",
  "Codex doctrine entry point: `H:/PRISM/CODEX.md` (Codex-native twin of this file).",
  "Compact spawn bundle: `H:/PRISM/.codex/AGENTS.md` (prepend when spawning Codex agents).",
  "",
  "Canonical MCP-usage doctrine: `H:/PRISM/state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md` — read it",
  "before teaching a new manual workflow. The other shared bridges: `state/shared/CLAUDE-CODEX-*.md`",
  "(coordination, 6-chat protocol, command-bridge, command-awareness, SVI, task-queue, RGS-sync,",
  "spawned-agent, search-token, roadmap-execution).",
  "",
  "Codex has NO per-prompt hooks (Claude Code injects prism-awareness / tribal-knowledge / wiki /",
  "build-state / chat-bus per prompt; Codex does not). Compensate by proactively calling the `prism`",
  "MCP server (`~/.codex/config.toml` → `[mcp_servers.prism]` stdio + `[mcp_servers.prism_safe]`),",
  "running `node H:/PRISM/.claude/helpers/codex-self-awareness.mjs` + `codex-command-awareness.mjs`,",
  "and reading BUILD_STATE.md / MILESTONE_PROGRESS.md / the wiki (`knowledge/wiki/index.md`) at start.",
  "",
  "Slash commands: PRISM skills are mirrored into `~/.codex/prompts/*.md` (thin shims pointing at",
  "`H:/PRISM/.claude/commands/<name>.md`) by `node H:/PRISM/.claude/helpers/sync-codex-prompts.mjs`;",
  "the doc-form catalog is `H:/PRISM/state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`.",
  "",
  "Parity self-check: `node H:/PRISM/.claude/helpers/codex-parity-audit.mjs`.",
  "",
].join("\n");

// Detect prior auto-mirror header so re-syncs don't accumulate stacked headers.
export function stripExistingHeader(content) {
  if (!content.startsWith("<!-- AUTO-MIRRORED ")) return content;
  // Skip exactly 3 HTML comment lines + 1 blank line + 1 separator line.
  const lines = content.split("\n");
  let cut = 0;
  for (let i = 0; i < lines.length && i < 6; i++) {
    if (lines[i].startsWith("<!-- ") && lines[i].endsWith("-->")) cut = i + 1;
    else if (lines[i].trim() === "") cut = i + 1;
    else break;
  }
  return lines.slice(cut).join("\n");
}

async function syncOne({ src, dst, target, codexAddenda }) {
  if (!existsSync(src)) {
    return { ok: false, src, dst, action: "fail", reason: "source missing" };
  }
  const sourceContent = await readFile(src, "utf-8");
  const body = sourceContent + (codexAddenda ? CODEX_ADDENDA : "");
  const header = buildHeader(src, target);
  const mirrorContent = header + body;

  if (existsSync(dst)) {
    const existing = await readFile(dst, "utf-8");
    if (stripExistingHeader(existing) === body) {
      return { ok: true, src, dst, action: "skip-unchanged" };
    }
  } else {
    await mkdir(dirname(dst), { recursive: true });
  }
  await writeFile(dst, mirrorContent, "utf-8");
  return { ok: true, src, dst, action: "wrote" };
}

// Exported so the drift detector (P0-U02) can reuse the exact sync logic; guarded
// below so `import`ing this module (for the detector / tests) does NOT run the sync.
export async function runSync() {
  const results = await Promise.all(MIRRORS.map(syncOne));
  for (const r of results) {
    const glyph = !r.ok ? "x" : r.action === "wrote" ? "+" : ".";
    const tag = r.action === "skip-unchanged" ? " (unchanged)" : r.reason ? ` (${r.reason})` : "";
    console.log(`${glyph} ${r.dst}${tag}`);
  }
  const wrote = results.filter((r) => r.action === "wrote").length;
  const skipped = results.filter((r) => r.action === "skip-unchanged").length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[sync] ${wrote} wrote, ${skipped} skipped, ${failed} failed`);
  return failed;
}

const __isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (__isMain) {
  const failed = await runSync();
  if (failed > 0) process.exit(1);
}
