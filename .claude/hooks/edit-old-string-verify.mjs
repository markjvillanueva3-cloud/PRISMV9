#!/usr/bin/env node
// tier: T1
/**
 * edit-old-string-verify.mjs - PreToolUse Edit
 * Verifies old_string exists in file before attempting edit.
 * Prevents wasted round-trips on failed edits.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Normalize CRLF to LF for cross-platform line-ending tolerance.
 * Files on disk may be CRLF (Windows) while old_string is LF (Claude harness),
 * causing byte-exact comparison to false-negative even when content matches.
 * INTEL-OLLAMA-OBSIDIAN-MS0/HOOK-FIX-CRLF.
 */
function normalizeEOL(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\r\n/g, '\n');
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Edit') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = tool_input?.file_path;
const oldString = tool_input?.old_string;

if (!filePath || !oldString) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

try {
  const resolved = resolve(filePath);

  if (!existsSync(resolved)) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `⚠️ File does not exist: ${filePath}\n  Edit will fail. Use Write to create new files.`,
      },
    }));
    process.exit(0);
  }

  const content = readFileSync(resolved, 'utf8');
  const normalizedContent = normalizeEOL(content);
  const normalizedOld = normalizeEOL(oldString);

  if (!normalizedContent.includes(normalizedOld)) {
    // Try to find similar strings
    const oldLines = oldString.split('\n');
    const firstLine = oldLines[0].trim();
    const suggestions = [];

    if (firstLine.length > 10) {
      // Check if first line exists but with different whitespace
      const contentLines = content.split('\n');
      for (let i = 0; i < contentLines.length; i++) {
        if (contentLines[i].includes(firstLine.trim())) {
          suggestions.push(`Line ${i + 1} contains similar text but may have different indentation`);
          break;
        }
      }
    }

    // Check for common issues
    if (oldString.includes('\t') && !content.includes('\t')) {
      suggestions.push('old_string uses tabs but file uses spaces');
    }
    if (oldString.includes('  ') && content.includes('\t')) {
      suggestions.push('old_string uses spaces but file uses tabs');
    }
    if (oldString.endsWith('\n') && !content.includes(oldString)) {
      suggestions.push('Trailing newline mismatch - try without trailing \\n');
    }

    const message = [
      `❌ old_string NOT FOUND in file:`,
      `  File: ${filePath}`,
      `  old_string (first 100 chars): "${oldString.substring(0, 100)}${oldString.length > 100 ? '...' : ''}"`,
      suggestions.length > 0 ? `  Possible issues: ${suggestions.join('; ')}` : null,
      `  Action: Read the file first to get exact content, including whitespace.`,
    ].filter(Boolean).join('\n');

    console.log(JSON.stringify({
      decision: 'block',
      reason: message
    }));
    process.exit(0);
  }

  // Check for multiple matches (could cause unexpected behavior)
  const matches = normalizedContent.split(normalizedOld).length - 1;
  if (matches > 1 && !tool_input?.replace_all) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `⚠️ old_string appears ${matches} times in file. Edit will only change the first occurrence. Use replace_all: true to change all.`,
      },
    }));
    process.exit(0);
  }

} catch (err) {
  // Let Edit handle the error
  console.log(JSON.stringify({ continue: true }));
}

console.log(JSON.stringify({ continue: true }));
