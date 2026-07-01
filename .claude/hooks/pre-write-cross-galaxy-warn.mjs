#!/usr/bin/env node
// tier: T2
// U-GALAXY-MS1-F2 (2026-05-27, slot:alpha): PreToolUse:Write|Edit|MultiEdit hook
// that warns when a SINGLE edit touches a file inside one Domain-Galaxy directory
// while the recent edit history shows another galaxy was touched in the same chat.
// Per R7 surface-don't-average: cross-galaxy edits in a single chat session are a
// smell — they imply either (a) the chat is doing cross-cutting infra (legit, ack),
// (b) the chat is drifting outside its slot's galaxy affinity (red flag),
// or (c) a cross-galaxy bridge engine is being written and should be flagged as
// such (so cross-galaxy/ memory namespace gets used per U-GALAXY-MS1-C1).
//
// ADVISORY ONLY — never blocks. Returns {continue:true} + additionalContext only
// when 2+ distinct galaxies appear in recent edit history within this chat. Uses
// a per-session in-memory cache (no persistent state — resets on /compact, which
// is the right behavior since post-/compact a chat may legitimately pivot galaxies).
//
// Knobs:
//   PRISM_CROSS_GALAXY_WARN_DISABLE=1 — disable entirely
//   PRISM_CROSS_GALAXY_WARN_VERBOSE=1 — emit even on first cross-galaxy detection
//   PRISM_CROSS_GALAXY_WARN_PATH — override cache path (default $PRISM/state/shared/cross-galaxy-cache/)
//
// Fail-soft contract: NEVER throws (every error → {continue:true}, exit 0).

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const CACHE_DIR = process.env.PRISM_CROSS_GALAXY_WARN_PATH ||
  `${PRISM}/state/shared/cross-galaxy-cache`;

// Galaxies with shipped CLAUDE.md sentinels at mcp-server/src/engines/<galaxy>/.
// Mirrors SLOT_GALAXY_MAP in slot-context-bundle-inject.mjs U-GALAXY-MS1-F3.
const KNOWN_GALAXIES = new Set([
  "mill", "lathe", "wedm", "quoting", "business", "academy", "post-processor",
]);

function detectGalaxy(filePath) {
  if (typeof filePath !== "string") return null;
  // Match mcp-server/src/engines/<galaxy>/ at any path prefix; case-insensitive
  // to tolerate Windows path-case drift.
  const m = filePath.match(/mcp-server[\\/]src[\\/]engines[\\/]([^\\/]+)[\\/]/i);
  if (!m) return null;
  const candidate = m[1].toLowerCase();
  return KNOWN_GALAXIES.has(candidate) ? candidate : null;
}

function readCache(sessionId) {
  if (!sessionId) return new Set();
  const file = path.join(CACHE_DIR, `${sessionId}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return new Set(Array.isArray(data.galaxies) ? data.galaxies : []);
  } catch { return new Set(); }
}

function writeCache(sessionId, galaxies) {
  if (!sessionId) return;
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `${sessionId}.json`);
    fs.writeFileSync(file, JSON.stringify({ galaxies: [...galaxies], updatedAt: new Date().toISOString() }, null, 2));
  } catch { /* fail-soft */ }
}

async function main() {
  if (process.env.PRISM_CROSS_GALAXY_WARN_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let envelope;
  try { envelope = JSON.parse(stdin); } catch { envelope = {}; }

  const sessionId = envelope.session_id || envelope.sessionId || null;
  // Tool inputs vary per tool: Write has file_path, Edit has file_path, MultiEdit
  // has file_path. NotebookEdit has notebook_path. Read uses file_path too but is
  // not in our matcher (we only fire on Write/Edit/MultiEdit per the hook config).
  const toolInput = envelope.tool_input || {};
  const filePath = toolInput.file_path || toolInput.notebook_path || null;

  const currentGalaxy = detectGalaxy(filePath);
  if (!currentGalaxy) {
    // Edit is outside any known galaxy subdir — no cross-galaxy concern.
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const seen = readCache(sessionId);
  const verbose = process.env.PRISM_CROSS_GALAXY_WARN_VERBOSE === "1";
  const otherGalaxies = [...seen].filter(g => g !== currentGalaxy);

  // Always update the cache with the current galaxy (cumulative session-level set).
  seen.add(currentGalaxy);
  writeCache(sessionId, seen);

  // Only emit the warning when there's a cross-galaxy boundary detected (or verbose).
  if (otherGalaxies.length === 0 && !verbose) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const lines = ["## ⚠ Cross-galaxy edit detected"];
  lines.push("");
  lines.push(`This edit touches \`${currentGalaxy}\` galaxy (\`${filePath}\`); chat has already touched: ${otherGalaxies.map(g => `\`${g}\``).join(", ") || "(none yet — verbose mode)"}.`);
  lines.push("");
  lines.push("**Per R7 surface-don't-average:** cross-galaxy edits in a single chat session usually mean one of:");
  lines.push("1. **Cross-cutting infrastructure** — legit, but the asset belongs in `engines/CLAUDE.md` baseline OR a shared lib, not deep in a single galaxy's directory.");
  lines.push("2. **Cross-galaxy bridge engine** — flag it as such; the relevant memory goes in `knowledge/memories/cross-galaxy/<bridge>/` (per U-GALAXY-MS1-C1 migration design).");
  lines.push("3. **Chat-soul drift** — chat bound to one slot is editing outside its galaxy affinity; consider whether the work should be handed off to the right specialist slot.");
  lines.push("");
  lines.push("_Advisory only. Disable: `PRISM_CROSS_GALAXY_WARN_DISABLE=1` · Verbose (warn on first galaxy touch too): `PRISM_CROSS_GALAXY_WARN_VERBOSE=1`._");

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
