// tier: T4
/**
 * schema-version-read.mjs — Phase 1 Tier 5D
 *
 * PostTool hook that warns when reading JSON with outdated schemaVersion.
 * Helps catch stale data before it causes problems.
 */

import * as fs from "fs";
import * as path from "path";

const SCHEMA_VERSIONS_PATH = "mcp-server/data/state/schema-versions.json";

// Known latest schema versions (fallback if registry not found)
const KNOWN_LATEST = {
  "roadmap-index": 3,
  "milestone": 2,
  "agent-memory": 2,
  "extraction-log": 2,
  "tribal-tips": 2,
  "machine-profile": 2,
  "tool-catalog": 3
};

function getSchemaType(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();

  if (normalized.includes("roadmap-index")) return "roadmap-index";
  if (normalized.includes("milestones/")) return "milestone";
  if (normalized.includes("agent-memory")) return "agent-memory";
  if (normalized.includes("extraction-log")) return "extraction-log";
  if (normalized.includes("tribal-tips")) return "tribal-tips";
  if (normalized.includes("machine-profile")) return "machine-profile";
  if (normalized.includes("tool-catalog")) return "tool-catalog";

  return null;
}

export default async function schemaVersionRead({ tool, input, output }) {
  // Only check Read tool for JSON files
  if (tool !== "Read") return undefined;

  const filePath = input?.file_path || "";
  if (!filePath.endsWith(".json")) return undefined;

  const schemaType = getSchemaType(filePath);
  if (!schemaType) return undefined;

  // Try to parse output to get schemaVersion
  try {
    // Output is the file content
    const content = typeof output === "string" ? output : JSON.stringify(output);

    // Extract schemaVersion from content
    const versionMatch = content.match(/"schemaVersion"\s*:\s*(\d+)/);
    if (!versionMatch) return undefined;

    const fileVersion = parseInt(versionMatch[1], 10);

    // Get latest version
    let latestVersion = KNOWN_LATEST[schemaType];

    const versionsPath = path.join(process.cwd(), SCHEMA_VERSIONS_PATH);
    if (fs.existsSync(versionsPath)) {
      try {
        const versions = JSON.parse(fs.readFileSync(versionsPath, "utf-8"));
        if (versions[schemaType]) {
          latestVersion = versions[schemaType].latest;
        }
      } catch {}
    }

    if (fileVersion < latestVersion) {
      // Don't block, just warn via message
      return {
        message: `⚠️ SCHEMA WARNING: ${path.basename(filePath)} has schemaVersion ${fileVersion}, latest is ${latestVersion}. Consider running migration.`
      };
    }
  } catch {
    // Parse error, skip check
  }

  return undefined;
}

export const metadata = {
  id: "schema-version-read",
  phase: "1.5D",
  priority: 80,
  event: "PostTool"
};
