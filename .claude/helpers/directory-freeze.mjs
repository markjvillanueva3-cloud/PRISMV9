/**
 * directory-freeze.mjs — Phase 1-C: Directory freeze enforcement
 *
 * PreToolUse hook for Write/Edit/MultiEdit. Blocks writes to directories
 * listed in the freeze config file. Uses exit code 2 to block (matching
 * file-protect.sh convention).
 *
 * Freeze config: H:/prism/.claude/cache/frozen-dirs.json
 * Format: { "dirs": ["path/to/dir1", "path/to/dir2"], "reason": "release freeze", "frozen_by": "user", "frozen_at": "ISO" }
 *
 * To freeze:  echo '{"dirs":["src/engines"],"reason":"review in progress"}' > H:/prism/.claude/cache/frozen-dirs.json
 * To thaw:    rm H:/prism/.claude/cache/frozen-dirs.json
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const FREEZE_CONFIG = path.join("H:", "prism", ".claude", "cache", "frozen-dirs.json");
const filePath = process.env.TOOL_INPUT_file_path || "";

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  if (!filePath) return; // No file path — nothing to check

  // Fast path: if no freeze config exists, exit immediately
  let config;
  try {
    const raw = await fs.readFile(FREEZE_CONFIG, "utf8");
    config = JSON.parse(raw);
  } catch {
    return; // No freeze config or invalid — nothing frozen
  }

  if (!config || !Array.isArray(config.dirs) || config.dirs.length === 0) return;

  // Normalize the target file path
  const normalizedFile = filePath.replace(/\\/g, "/").toLowerCase();

  for (const frozenDir of config.dirs) {
    const normalizedDir = frozenDir.replace(/\\/g, "/").toLowerCase();

    // Check if file is inside or matches the frozen directory
    if (normalizedFile.includes(normalizedDir)) {
      const reason = config.reason || "directory is frozen";
      const frozenBy = config.frozen_by || "unknown";

      // Exit code 2 = block (matches file-protect.sh convention)
      process.stderr.write(
        `[directory-freeze] BLOCKED: ${path.basename(filePath)} is in frozen directory "${frozenDir}". Reason: ${reason} (frozen by: ${frozenBy}). Thaw with: rm ${FREEZE_CONFIG}\n`
      );
      process.exit(2);
    }
  }
}

main().catch(() => {
  // On error, don't block — fail open
});
