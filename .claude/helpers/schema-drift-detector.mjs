#!/usr/bin/env node
/**
 * schema-drift-detector.mjs — PostToolUse hook for Edit/Write to schema files
 *
 * Responsibilities:
 * 1. Detects potential breaking changes in schema files
 * 2. Suggests version bumps when breaking changes detected
 * 3. Tracks schema evolution history
 *
 * Breaking change patterns:
 * - Removed fields from interfaces/types
 * - Changed field types (narrowing or incompatible)
 * - Renamed required fields
 * - Changed enum values
 * - Modified Zod schema in breaking ways
 *
 * Usage:
 *   node schema-drift-detector.mjs          # standalone, no-op
 *   echo '{"file_path":"..."}' | node schema-drift-detector.mjs  # hook mode
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, ensureCacheDir } from "./hook-cache.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SCHEMA_HISTORY_FILE = path.join(CACHE_DIR, "schema-drift-history.json");

// Schema file patterns
const SCHEMA_PATTERNS = [
  /\/schemas?\//i,
  /Schema\.ts$/,
  /Types\.ts$/,
  /\.schema\.ts$/,
  /interfaces?\//i,
  /types\//i,
];

// Breaking change patterns in diff
const BREAKING_PATTERNS = [
  // Removed properties
  { pattern: /^-\s+(?:readonly\s+)?(\w+)\s*[?:]/, name: "removed_field", severity: "breaking" },
  // Changed types (rough detection)
  { pattern: /^-\s+(\w+)\s*:\s*(\w+)[\s;,].*\n\+\s+\1\s*:\s*(?!\2)(\w+)/, name: "changed_type", severity: "breaking" },
  // Removed enum values
  { pattern: /^-\s+["']?\w+["']?\s*[,=]/, name: "removed_enum", severity: "breaking" },
  // Made optional required
  { pattern: /^-\s+(\w+)\?\s*:.*\n\+\s+\1\s*:/, name: "optional_to_required", severity: "breaking" },
  // Removed from union
  { pattern: /^-.*\|.*["']\w+["']/, name: "union_narrowed", severity: "breaking" },
  // Zod breaking: removed field, changed type
  { pattern: /^-\s+(\w+)\s*:\s*z\./, name: "zod_field_removed", severity: "breaking" },
  // Interface/type removal
  { pattern: /^-\s*(?:export\s+)?(?:interface|type)\s+(\w+)/, name: "type_removed", severity: "breaking" },
];

// Non-breaking change patterns
const SAFE_PATTERNS = [
  { pattern: /^\+\s+(?:readonly\s+)?(\w+)\?\s*:/, name: "added_optional_field", severity: "safe" },
  { pattern: /^\+\s+["']?\w+["']?\s*[,|]/, name: "added_enum_value", severity: "safe" },
  { pattern: /^\+\s+\/\//, name: "added_comment", severity: "safe" },
  { pattern: /^-\s+(\w+)\s*:.*\n\+\s+\1\?\s*:/, name: "required_to_optional", severity: "safe" },
];

/**
 * Check if file is a schema file.
 */
function isSchemaFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return SCHEMA_PATTERNS.some((p) => p.test(normalizedPath));
}

/**
 * Get file content before and after edit from git.
 */
async function getFileDiff(filePath) {
  try {
    // Try to get diff from git
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    const { stdout: diff } = await execFileAsync(
      "git",
      ["diff", "--no-color", "--", filePath],
      { cwd: ROOT, maxBuffer: 1024 * 1024 }
    );

    return diff;
  } catch {
    return "";
  }
}

/**
 * Analyze diff for breaking changes.
 */
function analyzeDiff(diff) {
  if (!diff) {
    return { breaking: [], safe: [], unknown: [] };
  }

  const lines = diff.split("\n");
  const changes = { breaking: [], safe: [], unknown: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";
    const context = line + "\n" + nextLine;

    // Check breaking patterns
    for (const { pattern, name, severity } of BREAKING_PATTERNS) {
      const match = pattern.test(context) || pattern.test(line);
      if (match) {
        changes.breaking.push({
          type: name,
          line: i + 1,
          content: line.slice(0, 100),
        });
        break;
      }
    }

    // Check safe patterns
    for (const { pattern, name } of SAFE_PATTERNS) {
      if (pattern.test(line)) {
        changes.safe.push({
          type: name,
          line: i + 1,
          content: line.slice(0, 100),
        });
        break;
      }
    }
  }

  return changes;
}

/**
 * Load schema history.
 */
async function loadHistory() {
  try {
    const raw = await fs.readFile(SCHEMA_HISTORY_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { edits: [], breakingChanges: [] };
  }
}

/**
 * Save schema history.
 */
async function saveHistory(history) {
  await ensureCacheDir();

  // Keep last 100 edits
  if (history.edits.length > 100) {
    history.edits = history.edits.slice(-100);
  }
  if (history.breakingChanges.length > 50) {
    history.breakingChanges = history.breakingChanges.slice(-50);
  }

  await fs.writeFile(SCHEMA_HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
}

/**
 * Record schema edit.
 */
async function recordEdit(filePath, changes) {
  const history = await loadHistory();

  const record = {
    file: path.basename(filePath),
    path: filePath,
    timestamp: Date.now(),
    breakingCount: changes.breaking.length,
    safeCount: changes.safe.length,
  };

  history.edits.push(record);

  if (changes.breaking.length > 0) {
    history.breakingChanges.push({
      ...record,
      changes: changes.breaking,
    });
  }

  await saveHistory(history);

  return history;
}

/**
 * Suggest version bump based on changes.
 */
function suggestVersionBump(changes) {
  if (changes.breaking.length > 0) {
    return {
      bump: "major",
      reason: `${changes.breaking.length} breaking change(s) detected`,
      details: changes.breaking.map((c) => c.type),
    };
  }

  if (changes.safe.length > 0) {
    return {
      bump: "minor",
      reason: `${changes.safe.length} additive change(s) detected`,
      details: changes.safe.map((c) => c.type),
    };
  }

  return {
    bump: "patch",
    reason: "No schema structure changes detected",
    details: [],
  };
}

/**
 * Read stdin for hook mode.
 */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

/**
 * Main entry point.
 */
async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const args = process.argv.slice(2);

  // CLI: history report
  if (args.includes("--history")) {
    const history = await loadHistory();
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  // CLI: analyze specific file
  if (args.includes("--analyze")) {
    const filePath = args[args.indexOf("--analyze") + 1];
    if (!filePath) {
      console.error("Usage: --analyze <file_path>");
      process.exit(1);
    }

    const diff = await getFileDiff(filePath);
    const changes = analyzeDiff(diff);
    const suggestion = suggestVersionBump(changes);
    console.log(JSON.stringify({ changes, suggestion }, null, 2));
    return;
  }

  // Hook mode: get file path from stdin
  const raw = await readStdin();
  let filePath = "";

  try {
    const parsed = typeof raw === "string" && raw.trim() ? JSON.parse(raw) : {};
    filePath = (parsed.tool_input?.file_path || parsed.file_path || "").replace(/\\/g, "/");
  } catch {
    // Non-JSON input
  }

  // Also check env var (set by harness)
  if (!filePath) {
    filePath = process.env.TOOL_INPUT_file_path || "";
  }

  // Skip if not a schema file
  if (!filePath || !isSchemaFile(filePath)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Analyze the diff
  const diff = await getFileDiff(filePath);
  const changes = analyzeDiff(diff);
  const suggestion = suggestVersionBump(changes);

  // Record the edit
  await recordEdit(filePath, changes);

  // Build response
  if (changes.breaking.length > 0) {
    const filename = path.basename(filePath);
    const types = [...new Set(changes.breaking.map((c) => c.type))].join(", ");

    process.stdout.write(JSON.stringify({
      additionalContext: `SCHEMA DRIFT WARNING: ${filename} has ${changes.breaking.length} potential breaking change(s) (${types}). Consider ${suggestion.bump.toUpperCase()} version bump. Run \`npm run test\` to verify compatibility.`,
    }));
  } else if (changes.safe.length > 0 && changes.safe.length >= 3) {
    const filename = path.basename(filePath);
    process.stdout.write(JSON.stringify({
      additionalContext: `SCHEMA UPDATE: ${filename} has ${changes.safe.length} additive change(s). Consider minor version bump.`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch((err) => {
  // Silent failure — never block edits on schema detection errors
  process.stderr.write(`[schema-drift-detector] Error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }));
});
