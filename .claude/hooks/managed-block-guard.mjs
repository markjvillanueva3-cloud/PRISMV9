// tier: T4
/**
 * managed-block-guard.mjs — Phase 0.15 Managed Block Guard
 *
 * PreToolEdit hook that blocks hand-edits to AUTO-REFRESHED sections.
 * These sections are automatically maintained by doc-sync.
 */

import * as fs from "fs";
import * as path from "path";

const MANAGED_MARKER_START = "<!-- AUTO-REFRESHED: managed-section-start -->";
const MANAGED_MARKER_END = "<!-- AUTO-REFRESHED: managed-section-end -->";

const DOCS_WITH_MANAGED_BLOCKS = [
  "CLAUDE.md",
  "mcp-server/CLAUDE.md",
  "state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md",
  "state/shared/PRISM-COMMANDS-MANIFEST.md",
];

function hasManagedBlock(filePath) {
  for (const doc of DOCS_WITH_MANAGED_BLOCKS) {
    if (filePath.endsWith(doc)) {
      return true;
    }
  }
  return false;
}

function findManagedRanges(content) {
  const lines = content.split("\n");
  const ranges = [];
  let startLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(MANAGED_MARKER_START)) {
      startLine = i;
    } else if (lines[i].includes(MANAGED_MARKER_END) && startLine >= 0) {
      ranges.push({ start: startLine, end: i });
      startLine = -1;
    }
  }

  return ranges;
}

function isEditInManagedRange(oldString, content, ranges) {
  // Find where old_string appears in content
  const editStart = content.indexOf(oldString);
  if (editStart === -1) return false;

  // Convert to line number
  const linesBeforeEdit = content.slice(0, editStart).split("\n").length - 1;

  // Check if this line falls in any managed range
  for (const range of ranges) {
    if (linesBeforeEdit >= range.start && linesBeforeEdit <= range.end) {
      return true;
    }
  }

  return false;
}

export default async function managedBlockGuard({ tool, input }) {
  // Only check Edit tool
  if (tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) {
    return { allow: true };
  }

  // Normalize and check if this file has managed blocks
  const normalizedPath = filePath.replace(/\\/g, "/");
  if (!hasManagedBlock(normalizedPath)) {
    return { allow: true };
  }

  // Read current file content
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return { allow: true };
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const ranges = findManagedRanges(content);

  if (ranges.length === 0) {
    return { allow: true };
  }

  // Check if the edit touches a managed range
  const oldString = input.old_string;
  if (!oldString) {
    return { allow: true };
  }

  if (isEditInManagedRange(oldString, content, ranges)) {
    return {
      allow: false,
      message: `
╔══════════════════════════════════════════════════════════════╗
║            MANAGED BLOCK GUARD — Phase 0.15                   ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Edit to AUTO-REFRESHED managed section              ║
║                                                              ║
║ File: ${path.basename(filePath).padEnd(50)}║
║                                                              ║
║ This section is automatically maintained by /doc-sync.       ║
║ Hand-edits will be overwritten on next refresh.              ║
║                                                              ║
║ To update this content:                                      ║
║ 1. Edit the source of truth (registry, engine, etc.)         ║
║ 2. Run /doc-sync to propagate changes                        ║
║                                                              ║
║ Or use --bypass flag if this edit is intentional.            ║
╚══════════════════════════════════════════════════════════════╝
`,
    };
  }

  return { allow: true };
}

// Hook metadata
export const metadata = {
  id: "managed-block-guard",
  phase: "0.15",
  priority: 4,
  dependsOn: [],
  event: "PreToolEdit",
};
