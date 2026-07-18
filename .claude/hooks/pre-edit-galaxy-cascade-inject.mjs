#!/usr/bin/env node
// tier: T2
// U-GALAXY-MS1-F1 (2026-05-27, slot:alpha): PreToolUse:Edit|Write|MultiEdit hook.
// When the target file lives under a Domain-Galaxy directory (mcp-server/src/engines/<galaxy>/),
// inject the FIRST 30 lines of that galaxy's CLAUDE.md (the §1 Scope + cascade-position
// header) as additionalContext so the chat sees galaxy-local doctrine even if the
// harness's natural CLAUDE.md cascade misfires.
//
// Insurance against the cascade not firing — Bibryam's Context Cascade pattern relies
// on the harness walking parent dirs for CLAUDE.md files. If the walk misses (e.g. on
// long-running sessions where the harness pre-loaded only root, or when subagents
// dispatch with isolated context), this hook backfills the galaxy-local doctrine head.
//
// Advisory only — never blocks. Fail-soft: NEVER throws, all errors → {continue:true} exit 0.
//
// Knobs:
//   PRISM_GALAXY_CASCADE_INJECT_DISABLE=1 — disable entirely
//   PRISM_GALAXY_CASCADE_INJECT_LINES=N   — override default 30-line head (clamp 5..100)

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";

const KNOWN_GALAXIES = new Set([
  "mill", "lathe", "wedm", "quoting", "business", "academy", "post-processor",
  "cad", "cam", "shop-floor", "mit-curriculum", "pdf-corpus", "pdf-corpus-mill",
  "quality", "cad-fusion-live", "speed-feed", "knowledge-conversion",
  "compliance-safety", "corpus-aggregation", "tribal-knowledge", "agent-orchestration",
]);

function detectGalaxy(filePath) {
  if (typeof filePath !== "string") return null;
  const m = filePath.match(/mcp-server[\\/]src[\\/]engines[\\/]([^\\/]+)[\\/]/i);
  if (!m) return null;
  const candidate = m[1].toLowerCase();
  return KNOWN_GALAXIES.has(candidate) ? candidate : null;
}

function readGalaxyHead(galaxy, lineCount) {
  const claudeMd = path.join(PRISM, "mcp-server/src/engines", galaxy, "CLAUDE.md");
  try {
    const content = fs.readFileSync(claudeMd, "utf8");
    const lines = content.split("\n").slice(0, lineCount);
    return lines.join("\n");
  } catch { return null; }
}

async function main() {
  if (process.env.PRISM_GALAXY_CASCADE_INJECT_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let envelope;
  try { envelope = JSON.parse(stdin); } catch { envelope = {}; }

  const toolInput = envelope.tool_input || {};
  const filePath = toolInput.file_path || toolInput.notebook_path || null;

  const galaxy = detectGalaxy(filePath);
  if (!galaxy) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const lineCountRaw = parseInt(process.env.PRISM_GALAXY_CASCADE_INJECT_LINES || "30", 10);
  const lineCount = Number.isFinite(lineCountRaw) ? Math.max(5, Math.min(100, lineCountRaw)) : 30;
  const head = readGalaxyHead(galaxy, lineCount);
  if (!head) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const lines = [
    `## 🌌 Galaxy cascade backfill — \`${galaxy}\` doctrine head`,
    "",
    `Editing under \`mcp-server/src/engines/${galaxy}/\`. Per Bibryam Context Cascade + Domain-Galaxy Doctrine, this galaxy's CLAUDE.md applies. First ${lineCount} lines below as insurance against natural cascade misfire (subagent isolation / long session / harness pre-load gaps):`,
    "",
    "```markdown",
    head,
    "```",
    "",
    `_Full doctrine: \`mcp-server/src/engines/${galaxy}/CLAUDE.md\` · companion memory: \`./MEMORY.md\` · disable: \`PRISM_GALAXY_CASCADE_INJECT_DISABLE=1\` · lines: \`PRISM_GALAXY_CASCADE_INJECT_LINES=N\`._`,
  ];

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
