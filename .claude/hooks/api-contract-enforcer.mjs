#!/usr/bin/env node
// tier: T1
import fs from "node:fs";


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
// RE-ENABLED 2026-04-27 by user approval (RESUME_AT_WORK section 5).
/**
 * api-contract-enforcer.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Ensures API responses have consistent shapes:
 * - All responses should have success/error indicator
 * - Error responses should include code, message
 * - Pagination should be consistent
 * - Timestamps should use ISO 8601
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: never (INFO level)
 */

const API_ISSUES = [
  {
    id: 'inconsistent-response',
    pattern: /return\s*\{[^}]*(?:data|result|payload)\s*:/,
    check: (code) => {
      const hasSuccess = /\bsuccess\s*:/i.test(code);
      const hasError = /\berror\s*:/i.test(code);
      const hasData = /\bdata\s*:/i.test(code);
      if (hasData && !hasSuccess && !hasError) {
        return 'API response missing success/error indicator';
      }
      return null;
    },
    suggestion: 'Include success: true/false or error field in all responses',
    severity: 'info',
  },
  {
    id: 'error-missing-fields',
    pattern: /error\s*:\s*\{[^}]*\}/,
    check: (code) => {
      const errorMatch = code.match(/error\s*:\s*\{([^}]*)\}/);
      if (!errorMatch) return null;
      const errorBody = errorMatch[1];
      const hasCode = /code\s*:/.test(errorBody);
      const hasMessage = /message\s*:/.test(errorBody);
      if (!hasCode || !hasMessage) {
        return 'Error object missing code and/or message';
      }
      return null;
    },
    suggestion: 'Error format: { error: { code: "ERROR_CODE", message: "..." } }',
    severity: 'info',
  },
  {
    id: 'pagination-inconsistent',
    pattern: /(?:page|offset|limit|cursor|skip|take)/i,
    check: (code) => {
      const hasPage = /\bpage\b/i.test(code);
      const hasOffset = /\boffset\b/i.test(code);
      const hasCursor = /\bcursor\b/i.test(code);
      const hasLimit = /\blimit\b/i.test(code);
      const hasTotal = /\btotal\b/i.test(code);

      if ((hasPage || hasOffset || hasCursor) && !hasLimit) {
        return 'Pagination missing limit field';
      }
      if ((hasPage || hasOffset) && !hasTotal) {
        return 'Offset pagination missing total count';
      }
      return null;
    },
    suggestion: 'Include: { items, page/cursor, limit, total?, hasMore? }',
    severity: 'info',
  },
  {
    id: 'timestamp-format',
    pattern: /(?:createdAt|updatedAt|timestamp|date)\s*:\s*(?:new\s+Date\(\)|Date\.now\(\))/,
    message: 'Timestamp should be ISO 8601 string, not Date object or epoch',
    suggestion: 'Use: new Date().toISOString() for consistent format',
    severity: 'info',
  },
  {
    id: 'null-vs-undefined',
    pattern: /:\s*undefined\b/,
    message: 'API returning undefined — use null for JSON compatibility',
    suggestion: 'Replace undefined with null in API responses',
    severity: 'info',
  },
  {
    id: 'array-empty-vs-null',
    pattern: /(?:items|list|results|data)\s*:\s*null\b/,
    message: 'Empty collection as null — prefer empty array []',
    suggestion: 'Return [] for empty collections, null implies "unknown"',
    severity: 'info',
  },
  {
    id: 'status-code-magic',
    pattern: /(?:status|statusCode|code)\s*[:=]\s*\d{3}(?!\s*\/)/,
    check: (code) => {
      const match = code.match(/(?:status|statusCode)\s*[:=]\s*(\d{3})/);
      if (!match) return null;
      const status = match[1];
      const knownCodes = ['200', '201', '204', '301', '302', '304', '400', '401', '403', '404', '409', '422', '429', '500', '502', '503'];
      if (!knownCodes.includes(status)) {
        return `Unusual HTTP status ${status} — ensure it's standard`;
      }
      return null;
    },
    suggestion: 'Use standard HTTP status codes: 200, 201, 400, 401, 404, 500...',
    severity: 'info',
  },
  {
    id: 'res-send-json',
    pattern: /res\.send\s*\(\s*\{/,
    message: 'Use res.json() for object responses',
    suggestion: 'res.json({ ... }) sets correct Content-Type',
    severity: 'info',
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content) {
  const issues = [];

  for (const rule of API_ISSUES) {
    if (rule.check) {
      if (rule.pattern.test(content)) {
        const result = rule.check(content);
        if (result) {
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: result,
            suggestion: rule.suggestion,
          });
        }
      }
    } else if (rule.pattern.test(content)) {
      issues.push({
        id: rule.id,
        severity: rule.severity,
        message: rule.message,
        suggestion: rule.suggestion,
      });
    }
  }

  return issues;
}

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = payload.tool_input || payload.toolInput || {};

  if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || toolInput.filePath || '';

  if (!isCodeFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let content = '';
  if (toolName === 'Write') {
    content = toolInput.content || '';
  } else if (toolName === 'Edit') {
    content = toolInput.new_string || toolInput.newString || '';
  } else if (toolName === 'MultiEdit') {
    content = (toolInput.edits || []).map(e => e.new_string || e.newString || '').join('\n');
  }

  if (!content || content.length < 30) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const issues = checkContent(content);

  if (issues.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (issues.length >= 2) {
    const noteStr = issues.slice(0, 4).map(i => `• [${i.id}] ${i.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `API CONTRACT NOTE:\n${noteStr}\n→ ${issues[0].suggestion}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
