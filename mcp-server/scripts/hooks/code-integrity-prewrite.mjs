#!/usr/bin/env node
/**
 * Code Integrity Pre-Write Hook
 * ==============================
 * Fires on PreToolUse for Write/Edit to validate code before writing.
 * Prevents corrupted code from being written to disk.
 *
 * Detection:
 * - Binary data contamination
 * - Source map leakage
 * - Mixed file content
 * - Truncated files
 * - Invalid TypeScript patterns
 */

import * as fs from 'fs';
import * as path from 'path';

// Read stdin for tool input
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    validateCode(data);
  } catch {
    // No valid input, allow through
    outputResult(null);
  }
});

function validateCode(data) {
  const toolInput = data.tool_input || {};
  const filePath = toolInput.file_path || '';
  const content = toolInput.content || toolInput.new_string || '';

  // Only validate TypeScript files
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    outputResult(null);
    return;
  }

  // Skip if no content to validate
  if (!content || content.length < 10) {
    outputResult(null);
    return;
  }

  const errors = [];

  // ── Binary data check ──
  const binaryPatterns = [
    /^\x00/,                   // Null byte start
    /\x78\x9c/,                // zlib header
    /\x1f\x8b/,                // gzip header
  ];
  for (const pat of binaryPatterns) {
    if (pat.test(content.slice(0, 100))) {
      errors.push('Binary data detected in TypeScript file');
      break;
    }
  }

  // Check for high non-printable character ratio
  const sample = content.slice(0, 500);
  let nonPrintable = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintable++;
    }
  }
  if (nonPrintable / sample.length > 0.1) {
    errors.push(`High non-printable character ratio: ${(nonPrintable / sample.length * 100).toFixed(1)}%`);
  }

  // ── Source map contamination ──
  if (/\/\/# sourceMappingURL=/.test(content)) {
    errors.push('Source map directive found in TypeScript source');
  }

  // ── Declaration file leakage ──
  if (/^export declare /m.test(content)) {
    errors.push('Declaration (.d.ts) content found in source file');
  }

  // ── Valid TypeScript start check ──
  const firstLine = content.split('\n')[0].trim();
  const validStarts = [
    /^\/\*\*/,         // JSDoc
    /^\/\//,           // Comment
    /^import\s/,       // Import
    /^export\s/,       // Export
    /^declare\s/,      // Declare
    /^const\s/,        // Const
    /^let\s/,          // Let
    /^class\s/,        // Class
    /^interface\s/,    // Interface
    /^type\s/,         // Type
    /^function\s/,     // Function
    /^enum\s/,         // Enum
    /^async\s/,        // Async
  ];
  if (firstLine && !validStarts.some(p => p.test(firstLine))) {
    errors.push(`Invalid TypeScript file start: "${firstLine.slice(0, 40)}..."`);
  }

  // ── Mixed content detection (multiple engine classes) ──
  if (filePath.includes('/engines/')) {
    const engineClasses = content.match(/class\s+(\w+Engine)/g);
    if (engineClasses && engineClasses.length > 1) {
      const names = [...new Set(engineClasses.map(m => m.replace(/class\s+/, '')))];
      if (names.length > 1) {
        errors.push(`Multiple engine classes in one file: ${names.join(', ')}`);
      }
    }
  }

  // ── Brace balance check ──
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces > closeBraces + 10) {
    errors.push(`File appears truncated: ${openBraces - closeBraces} unclosed braces`);
  }

  if (errors.length > 0) {
    outputResult({
      blocked: true,
      reason: errors.join('; '),
      errors,
    });
  } else {
    outputResult(null);
  }
}

function outputResult(result) {
  if (result && result.blocked) {
    // Block the write
    console.log(JSON.stringify({
      decision: 'block',
      reason: `CODE INTEGRITY VIOLATION: ${result.reason}. Fix the generated code before writing.`,
    }));
    process.exit(2); // Block
  } else {
    // Allow through
    console.log(JSON.stringify({}));
    process.exit(0);
  }
}
