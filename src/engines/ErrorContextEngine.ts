/**
 * ErrorContextEngine — Minimal diagnostic context for errors
 *
 * When errors occur (build failures, test failures, runtime errors),
 * this engine captures just the diagnostic context needed to debug
 * without reading entire files. Extracts error location, surrounding
 * code, and recent changes to the affected file.
 *
 * Token savings: Replaces "read the whole file" debugging approach.
 *
 * @version 1.0.0
 */

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { join, basename, dirname } from "path";
import { log } from "../utils/Logger.js";

const REPO_ROOT = join(import.meta.dirname, "../..");

export interface ErrorContext {
  file: string;
  line: number | null;
  message: string;
  surroundingCode: string;
  recentChanges: string;
  suggestion: string;
}

export class ErrorContextEngine {

  /**
   * Parse a TypeScript/build error and get diagnostic context.
   */
  fromBuildError(errorText: string): ErrorContext[] {
    const contexts: ErrorContext[] = [];
    const errorRegex = /([^(\s]+\.ts)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)/g;
    let match;

    while ((match = errorRegex.exec(errorText)) !== null) {
      const [, file, lineStr, , message] = match;
      const line = parseInt(lineStr, 10);
      const fullPath = join(REPO_ROOT, file);

      contexts.push({
        file,
        line,
        message: message.trim(),
        surroundingCode: this.getSurroundingCode(fullPath, line),
        recentChanges: this.getRecentChanges(file),
        suggestion: this.suggestFix(message),
      });
    }

    return contexts;
  }

  /**
   * Parse a test failure and get diagnostic context.
   */
  fromTestError(errorText: string): ErrorContext[] {
    const contexts: ErrorContext[] = [];

    // Vitest error format: ❯ file.ts:line:col
    const testRegex = /[❯>]\s+([^\s]+\.ts):(\d+):?\d*/g;
    let match;

    while ((match = testRegex.exec(errorText)) !== null) {
      const [, file, lineStr] = match;
      const line = parseInt(lineStr, 10);
      const fullPath = file.startsWith("src/")
        ? join(REPO_ROOT, file)
        : file;

      // Extract the error message (usually on a nearby line)
      const msgMatch = errorText.match(/(?:Error|AssertionError|expect).*?:\s*(.+)/);
      const message = msgMatch ? msgMatch[1].trim() : "Test assertion failed";

      contexts.push({
        file,
        line,
        message,
        surroundingCode: this.getSurroundingCode(fullPath, line),
        recentChanges: this.getRecentChanges(file),
        suggestion: this.suggestTestFix(message),
      });
    }

    return contexts;
  }

  /**
   * Get surrounding code for a specific file and line.
   */
  getSurroundingCode(filePath: string, line: number, context = 5): string {
    if (!existsSync(filePath)) return `[File not found: ${filePath}]`;

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const start = Math.max(0, line - context - 1);
      const end = Math.min(lines.length, line + context);

      return lines.slice(start, end)
        .map((l, i) => {
          const lineNum = start + i + 1;
          const marker = lineNum === line ? ">>>" : "   ";
          return `${marker} ${lineNum}: ${l}`;
        })
        .join("\n");
    } catch {
      return `[Could not read: ${filePath}]`;
    }
  }

  /**
   * Get recent git changes to a file.
   */
  getRecentChanges(file: string, maxCommits = 3): string {
    try {
      return execSync(
        `git log --oneline -${maxCommits} -- "${file}"`,
        { cwd: REPO_ROOT, encoding: "utf-8", timeout: 5000 }
      ).trim() || "No recent changes";
    } catch {
      return "Git info unavailable";
    }
  }

  /**
   * Get a compact diagnostic for a single error.
   */
  getCompactDiagnostic(file: string, line: number, message: string): string {
    const fullPath = file.startsWith("src/")
      ? join(REPO_ROOT, file)
      : file;

    const code = this.getSurroundingCode(fullPath, line, 3);
    return `ERROR: ${basename(file)}:${line} — ${message}\n${code}`;
  }

  // ── Private ──────────────────────────────────────────────────

  private suggestFix(message: string): string {
    if (message.includes("not assignable to parameter of type")) {
      return "Type mismatch — check the argument type matches the parameter type. May need a type assertion or to update the type definition.";
    }
    if (message.includes("Cannot find name")) {
      return "Missing import or undefined variable. Check imports at the top of the file.";
    }
    if (message.includes("Property") && message.includes("does not exist")) {
      return "Property access on wrong type. Check the interface definition or add the property.";
    }
    if (message.includes("import.meta")) {
      return "Use import.meta.dirname instead of import.meta.dirname (esbuild banner provides import.meta.dirname).";
    }
    if (message.includes("Module") && message.includes("has no exported member")) {
      return "Export missing from source module. Add the export or check the import path.";
    }
    return "Review the error message and surrounding code for the fix.";
  }

  private suggestTestFix(message: string): string {
    if (message.includes("expected") && message.includes("received")) {
      return "Assertion mismatch — check expected vs actual values. May need to update test expectations.";
    }
    if (message.includes("not a function")) {
      return "Method doesn't exist on the object. Check the API/interface.";
    }
    if (message.includes("timeout")) {
      return "Test timed out — check for async issues or increase timeout.";
    }
    return "Review the test assertion and compare with actual engine behavior.";
  }
}

export const errorContextEngine = new ErrorContextEngine();
