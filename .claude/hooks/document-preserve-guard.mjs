// tier: T0
/**
 * Document Preservation Guard — Stop Hook
 * ========================================
 * Prevents document updates from REMOVING content.
 * If something needs to be disabled, it must be hardcoded disabled (e.g., `enabled: false`,
 * `status: "disabled"`, or commented out) — NOT deleted.
 *
 * @hook Stop (fires when Claude proposes file writes)
 * @policy Content removal is BLOCKED; disabling via flag is ALLOWED
 */

import { readFileSync, existsSync } from "fs";
import { basename } from "path";

// File patterns that this guard protects
const PROTECTED_PATTERNS = [
  /\.json$/,      // JSON state/config files
  /\.md$/,        // Markdown documentation
  /roadmap.*\.json$/i,
  /milestone.*\.json$/i,
  /CLAUDE\.md$/,
  /MEMORY\.md$/,
  /INDEX\.md$/,
  /INVENTORY\.json$/,
  /registry.*\.json$/i,
];

// Content markers that indicate intentional disabling (allowed)
const DISABLE_MARKERS = [
  '"enabled": false',
  '"status": "disabled"',
  '"active": false',
  '"deprecated": true',
  '"archived": true',
  '// DISABLED:',
  '<!-- DISABLED:',
  '/* DISABLED:',
  '"__disabled__":',
];

// Minimum allowed content ratio (new/old) — below this triggers block
const MIN_CONTENT_RATIO = 0.85;

export default async function documentPreserveGuard(event) {
  // Only check Edit and Write tool calls
  const toolName = event?.tool?.name;
  if (toolName !== "Edit" && toolName !== "Write") {
    return { decision: "approve" };
  }

  const filePath = event?.tool?.input?.file_path;
  if (!filePath) {
    return { decision: "approve" };
  }

  // Check if file matches protected patterns
  const fileName = basename(filePath);
  const isProtected = PROTECTED_PATTERNS.some(pattern => pattern.test(filePath) || pattern.test(fileName));

  if (!isProtected) {
    return { decision: "approve" };
  }

  // For Write tool, check if file exists and compare sizes
  if (toolName === "Write") {
    if (!existsSync(filePath)) {
      // New file creation is allowed
      return { decision: "approve" };
    }

    try {
      const oldContent = readFileSync(filePath, "utf-8");
      const newContent = event?.tool?.input?.content || "";

      // Check content ratio
      const ratio = newContent.length / oldContent.length;

      if (ratio < MIN_CONTENT_RATIO) {
        // Check if this is intentional disabling
        const hasDisableMarker = DISABLE_MARKERS.some(marker =>
          newContent.includes(marker) && !oldContent.includes(marker)
        );

        if (hasDisableMarker) {
          // Intentional disable via flag — allowed
          return { decision: "approve" };
        }

        // Content significantly reduced without disable markers — BLOCK
        const removedBytes = oldContent.length - newContent.length;
        const removedPct = ((1 - ratio) * 100).toFixed(1);

        return {
          decision: "block",
          reason: `Document preservation guard: Write would REMOVE ${removedBytes} bytes (${removedPct}% reduction) from protected file "${fileName}". ` +
            `If content needs to be disabled, add a disable marker (e.g., "enabled": false, "status": "disabled", "// DISABLED:") ` +
            `instead of deleting. Hardcode disabled state, don't delete.`,
        };
      }
    } catch (err) {
      // Can't read file — allow the write
      return { decision: "approve" };
    }
  }

  // For Edit tool, check old_string vs new_string
  if (toolName === "Edit") {
    const oldStr = event?.tool?.input?.old_string || "";
    const newStr = event?.tool?.input?.new_string || "";

    // If new_string is empty or significantly shorter, it's removal
    if (newStr.length === 0 && oldStr.length > 0) {
      return {
        decision: "block",
        reason: `Document preservation guard: Edit would DELETE content from protected file "${fileName}". ` +
          `To disable content, comment it out or add "// DISABLED:" prefix — don't delete.`,
      };
    }

    // Check for significant content reduction in edit
    if (oldStr.length > 100 && newStr.length < oldStr.length * 0.5) {
      // Check for disable markers in new content
      const hasDisableMarker = DISABLE_MARKERS.some(marker =>
        newStr.includes(marker) && !oldStr.includes(marker)
      );

      if (!hasDisableMarker) {
        const removedPct = (((oldStr.length - newStr.length) / oldStr.length) * 100).toFixed(1);
        return {
          decision: "block",
          reason: `Document preservation guard: Edit reduces content by ${removedPct}% in "${fileName}". ` +
            `Use disable markers instead of removal. Add "// DISABLED:" or set "enabled": false.`,
        };
      }
    }
  }

  return { decision: "approve" };
}
