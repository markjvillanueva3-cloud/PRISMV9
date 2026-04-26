#!/usr/bin/env node
/**
 * npm-output-condenser.mjs — PostToolUse hook for Bash
 *
 * Condenses verbose npm/pnpm/yarn output:
 *   - Strips progress bars and spinners
 *   - Shows only package counts and timing
 *   - Preserves warnings and errors
 *
 * Reduces package manager output by 70-90%.
 */

import { readFileSync } from "node:fs";
import process from "node:process";

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

function collectOutputText() {
  const parts = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0 && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

function isPackageManagerCommand(command) {
  return /\b(npm|pnpm|yarn)\s+(install|add|remove|update|ci|i)\b/.test(command) ||
         /\b(npm|pnpm|yarn)\s+run\s+\w+/.test(command);
}

function extractSummary(output) {
  const lines = output.split(/\r?\n/);
  const summary = {
    packages: null,
    added: null,
    removed: null,
    changed: null,
    duration: null,
    warnings: [],
    errors: [],
  };

  for (const line of lines) {
    // npm summary patterns
    const addedMatch = line.match(/added\s+(\d+)\s+packages?/i);
    if (addedMatch) summary.added = parseInt(addedMatch[1]);

    const removedMatch = line.match(/removed\s+(\d+)\s+packages?/i);
    if (removedMatch) summary.removed = parseInt(removedMatch[1]);

    const changedMatch = line.match(/changed\s+(\d+)\s+packages?/i);
    if (changedMatch) summary.changed = parseInt(changedMatch[1]);

    const packagesMatch = line.match(/(\d+)\s+packages?/i);
    if (packagesMatch && !summary.packages) summary.packages = parseInt(packagesMatch[1]);

    // pnpm patterns
    const pnpmMatch = line.match(/Packages:\s*\+(\d+)/i);
    if (pnpmMatch) summary.added = parseInt(pnpmMatch[1]);

    // Duration patterns
    const durationMatch = line.match(/(?:in|Done in)\s+([\d.]+\s*(?:s|ms|m|min))/i);
    if (durationMatch) summary.duration = durationMatch[1];

    // Warnings
    if (line.includes("WARN") || line.includes("warn ") || line.includes("warning")) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        summary.warnings.push(trimmed.substring(0, 100));
      }
    }

    // Errors
    if (line.includes("ERR!") || line.includes("error ") || line.match(/^Error:/i)) {
      const trimmed = line.trim();
      if (trimmed.length > 5) {
        summary.errors.push(trimmed.substring(0, 150));
      }
    }
  }

  return summary;
}

function main() {
  const toolInput = stdinInput.tool_input || {};
  const command = toolInput.command || process.env.TOOL_INPUT_command || "";
  const output = collectOutputText();

  // Only process package manager commands with significant output
  if (!isPackageManagerCommand(command) || output.length < 500) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const summary = extractSummary(output);

  // Build condensed output
  let condensed = "PKG INSTALL: ";
  const parts = [];

  if (summary.added) parts.push(`+${summary.added}`);
  if (summary.removed) parts.push(`-${summary.removed}`);
  if (summary.changed) parts.push(`~${summary.changed}`);
  if (summary.packages && !summary.added) parts.push(`${summary.packages} packages`);

  condensed += parts.length > 0 ? parts.join(", ") : "done";
  if (summary.duration) condensed += ` in ${summary.duration}`;

  // Add warnings (max 3)
  if (summary.warnings.length > 0) {
    condensed += `\nWARNINGS (${summary.warnings.length}):`;
    summary.warnings.slice(0, 3).forEach(w => {
      condensed += `\n  • ${w}`;
    });
    if (summary.warnings.length > 3) {
      condensed += `\n  ... and ${summary.warnings.length - 3} more`;
    }
  }

  // Add errors (all)
  if (summary.errors.length > 0) {
    condensed += `\nERRORS (${summary.errors.length}):`;
    summary.errors.forEach(e => {
      condensed += `\n  ✗ ${e}`;
    });
  }

  const savedChars = output.length - condensed.length;
  const savedPct = Math.round((savedChars / output.length) * 100);

  if (savedPct > 30) {
    process.stdout.write(JSON.stringify({
      additionalContext: `${condensed}\n\n[${savedPct}% condensed — ~${Math.round(savedChars / 4)} tokens saved]`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
