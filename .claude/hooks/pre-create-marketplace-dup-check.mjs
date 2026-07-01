#!/usr/bin/env node
// tier: T2
// U-GALAXY-MS1-A2 (2026-05-27, slot:alpha): PreToolUse:Write hook.
// When the target path is a new asset under .claude/{commands,hooks,skills,agents}/
// OR mcp-server/src/engines/<NewEngine>.ts, derive the proposed-name and check
// against installed plugin marketplaces (anthropic-claude-plugins-official +
// nyldn-plugins + any others registered). If a marketplace plugin with a similar
// name exists, emit an advisory: "marketplace plugin <X> exists — consider
// /plugin install <X> instead of building from scratch."
//
// Per SCOPE-EXPANSION §Q5 install-vs-build policy + new Fleet Pickup Pack §Recipe 1.
//
// Advisory only — never blocks. Fail-soft: any error → {continue:true}.
//
// Knobs:
//   PRISM_MARKETPLACE_DUP_CHECK_DISABLE=1 — disable entirely
//   PRISM_MARKETPLACE_DUP_CHECK_VERBOSE=1 — log near-misses too

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
// Hard-coded installed plugin list (mirrors anthropic + nyldn marketplace per
// Agent B research 2026-05-26). Update when marketplaces change. Source of
// truth would be `claude plugin list` but that's MCP-fragile so we cache.
const INSTALLED_PLUGINS = new Set([
  "superpowers", "hookify", "skill-creator", "code-review", "commit-commands",
  "pr-review-toolkit", "claude-md-management", "agent-sdk-dev", "feature-dev",
  "context7", "serena", "github", "playwright", "supabase", "linear", "figma",
  "greptile", "frontend-design", "claude-code-setup", "code-simplifier",
  "typescript-lsp", "rust-lsp", "clangd-lsp", "swift-lsp", "octo",
]);

function derivedName(filePath) {
  if (typeof filePath !== "string") return null;
  const base = path.basename(filePath).replace(/\.(mjs|ts|md|json)$/i, "");
  // Strip common engine/hook suffixes for clean comparison
  return base.replace(/Engine$|Hook$|Skill$|Agent$/i, "").toLowerCase()
    .replace(/[-_]/g, "");
}

function fuzzyMatch(proposed, installed) {
  // Substring + simple Levenshtein-ish (start-token overlap).
  const p = proposed.toLowerCase();
  for (const plug of installed) {
    const plugFlat = plug.replace(/[-_]/g, "");
    if (p === plugFlat) return { match: plug, kind: "exact" };
    if (p.includes(plugFlat) || plugFlat.includes(p)) return { match: plug, kind: "substring" };
  }
  return null;
}

async function main() {
  if (process.env.PRISM_MARKETPLACE_DUP_CHECK_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let envelope;
  try { envelope = JSON.parse(stdin); } catch { envelope = {}; }

  const fp = envelope.tool_input?.file_path || envelope.tool_input?.notebook_path;
  if (!fp || typeof fp !== "string") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  // Only fire on new-asset paths
  const isAsset =
    /[\\/]\.claude[\\/](commands|hooks|skills|agents)[\\/]/i.test(fp) ||
    /mcp-server[\\/]src[\\/]engines[\\/][^\\/]+Engine\.ts$/i.test(fp);
  if (!isAsset) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  // Skip if file already exists (we only warn on CREATION, not edits)
  if (fs.existsSync(fp)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const name = derivedName(fp);
  if (!name) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const hit = fuzzyMatch(name, INSTALLED_PLUGINS);
  if (!hit && process.env.PRISM_MARKETPLACE_DUP_CHECK_VERBOSE !== "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const lines = ["## 🛒 Marketplace plugin already installed"];
  lines.push("");
  if (hit) {
    lines.push(`Creating \`${path.basename(fp)}\` (name derived: \`${name}\`) — but the **${hit.match}** plugin is already installed (${hit.kind} match).`);
    lines.push("");
    lines.push("Per SCOPE-EXPANSION §Q5 install-vs-build policy:");
    lines.push(`- **Install** if the asset is domain-agnostic + stateless + has a 1:1 marketplace match → use the **${hit.match}** plugin.`);
    lines.push(`- **Build** only if your need touches PRISM-specific state (slot/scrutiny/milestone/physics/JM-Die/prism_* dispatcher) that the marketplace plugin can't access.`);
    lines.push(`- If unsure → run \`claude plugin show ${hit.match}\` first.`);
  } else {
    lines.push(`(verbose) no marketplace match found for \`${name}\` across the ${INSTALLED_PLUGINS.size} installed plugins.`);
  }
  lines.push("");
  lines.push("_Disable: `PRISM_MARKETPLACE_DUP_CHECK_DISABLE=1` · Verbose: `PRISM_MARKETPLACE_DUP_CHECK_VERBOSE=1`._");

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: lines.join("\n"),
    },
  }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
