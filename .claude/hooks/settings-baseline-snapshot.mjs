#!/usr/bin/env node
/**
 * settings-baseline-snapshot.mjs — SessionStart hook
 *
 * Creates a baseline snapshot of settings.json at session start.
 * The stop_on_hook_unregistration.mjs hook compares against this
 * to detect if any hooks were removed during the session.
 *
 * Output: H:/prism/mcp-server/data/state/settings-baseline-{timestamp}.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { exit } from "node:process";

const SETTINGS_PATH = "H:/.claude/settings.json";
const BASELINE_DIR = "H:/prism/mcp-server/data/state";

function main() {
  try {
    // Read current settings
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));

    // Create baseline filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baselinePath = `${BASELINE_DIR}/settings-baseline-${timestamp}.json`;

    // Ensure directory exists
    mkdirSync(BASELINE_DIR, { recursive: true });

    // Write baseline
    writeFileSync(baselinePath, JSON.stringify(settings, null, 2));

    // Output success for hook system
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `Settings baseline saved: ${baselinePath`,
      }
    }));
  } catch (err) {
    // Don't block session start on errors
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `Settings baseline skipped: ${err.message`,
      }
    }));
  }

  exit(0);
}

main();
