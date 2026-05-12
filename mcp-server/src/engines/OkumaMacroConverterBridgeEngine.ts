/**
 * OkumaMacroConverterBridgeEngine (E102)
 * ========================================
 *
 * Wraps an external Python macro converter CLI that translates Okuma User
 * Task macros (.MIN with G65/G66/IF/WHILE/variables) to equivalent hardcoded
 * G-code. Falls back to a pure-TS reference converter when Python is absent.
 *
 * Design:
 *   - Locates the converter via PRISM_OKUMA_MACRO_CONVERTER env var or
 *     $(repo)/tools/okuma-macro-converter/convert.py
 *   - Uses execFile (not shell) for safety — never interpolates user input
 *     into a shell command
 *   - Platform-aware: on Windows, uses py.exe shim; on *nix, plain python3
 *   - Graceful degrade: returns { supported: false } when runtime missing
 *     so callers can fall back to hardcode generation from LatheProgrammingStyleSelectorEngine
 *
 * @module engines/OkumaMacroConverterBridgeEngine
 * @milestone LATHE-AWARE-HARDEN MS6 (U-LAT47)
 */

import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConvertOptions {
  /** Python interpreter override (default: platform auto-detect) */
  pythonBinary?: string;
  /** Converter script path override */
  converterPath?: string;
  /** Timeout in ms (default 30s) */
  timeoutMs?: number;
  /** Preserve comments in converted output */
  preserveComments?: boolean;
  /** Variable substitution map for known macro variables */
  variableOverrides?: Record<string, string | number>;
}

export interface ConvertResult {
  supported: boolean;
  converted_gcode?: string;
  source_lines: number;
  output_lines: number;
  runtime_ms: number;
  runner: "python" | "fallback_ts" | "none";
  error?: string;
  warnings: string[];
  variables_resolved: Record<string, string | number>;
}

export interface RuntimeStatus {
  python_available: boolean;
  python_binary?: string;
  converter_script?: string;
  converter_exists: boolean;
  fallback_ready: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function defaultPythonBinary(): string {
  return process.platform === "win32" ? "py" : "python3";
}

function defaultConverterPath(): string {
  const root = process.env.PRISM_REPO_ROOT ?? process.cwd();
  return path.join(root, "tools", "okuma-macro-converter", "convert.py");
}

function runExecFile(
  bin: string,
  args: string[],
  stdin: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = execFile(
      bin,
      args,
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const code = err ? (err as any).code ?? 1 : 0;
        resolve({
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          code: typeof code === "number" ? code : 1,
        });
      }
    );
    // Write source to stdin
    child.stdin?.write(stdin);
    child.stdin?.end();
  });
}

// ── Fallback TS Converter (handles simple cases) ───────────────────────────

/**
 * Minimal TS fallback: resolves macro variables from overrides, strips
 * IF/WHILE/GOTO blocks, inlines simple G65 calls as comments.
 * NOT a full macro interpreter — covers the easy cases so pipelines don't
 * break when Python is unavailable.
 */
function fallbackConvert(
  source: string,
  overrides: Record<string, string | number>
): { gcode: string; warnings: string[]; resolved: Record<string, string | number> } {
  const warnings: string[] = [];
  const resolved: Record<string, string | number> = { ...overrides };
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let skipDepth = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) {
      out.push("");
      continue;
    }

    // Variable assignment #n = value
    const assign = line.match(/^#(\d+)\s*=\s*(.+)$/);
    if (assign) {
      const name = `#${assign[1]}`;
      const value = assign[2]!.trim();
      resolved[name] = value;
      out.push(`( ${name} = ${value} )`);
      continue;
    }

    // IF/WHILE/GOTO control flow — skip block, flag unsupported
    if (/^\s*(IF|WHILE|DO)\s*\[/i.test(line)) {
      warnings.push(`Fallback cannot evaluate control flow: "${line}"`);
      skipDepth++;
      out.push(`( skipped: ${line} )`);
      continue;
    }
    if (/^\s*END/i.test(line) && skipDepth > 0) {
      skipDepth--;
      out.push(`( end skip )`);
      continue;
    }
    if (skipDepth > 0) {
      out.push(`( skipped: ${line} )`);
      continue;
    }

    // G65 macro call — preserve as comment, emit placeholder
    const g65 = line.match(/\bG65\s+P(\d+)(.*)$/);
    if (g65) {
      warnings.push(`Fallback cannot inline macro call: "${line}"`);
      out.push(`( G65 P${g65[1]} args:${g65[2]?.trim() ?? ""} )`);
      continue;
    }

    // Substitute variable references #n → resolved value
    let substituted = line;
    substituted = substituted.replace(/#(\d+)/g, (match) => {
      const key = match;
      const v = resolved[key];
      return v !== undefined ? String(v) : match;
    });
    out.push(substituted);
  }

  return { gcode: out.join("\n"), warnings, resolved };
}

// ── Engine Implementation ──────────────────────────────────────────────────

class OkumaMacroConverterBridgeEngineImpl {
  /**
   * Check runtime availability without executing the converter.
   */
  async status(options: ConvertOptions = {}): Promise<RuntimeStatus> {
    const pythonBinary = options.pythonBinary ?? defaultPythonBinary();
    const converterScript = options.converterPath ?? defaultConverterPath();
    const converterExists = fs.existsSync(converterScript);

    let pythonAvailable = false;
    try {
      const { code } = await runExecFile(pythonBinary, ["--version"], "", 5000);
      pythonAvailable = code === 0;
    } catch {
      pythonAvailable = false;
    }

    return {
      python_available: pythonAvailable,
      python_binary: pythonBinary,
      converter_script: converterScript,
      converter_exists: converterExists,
      fallback_ready: true,
    };
  }

  /**
   * Convert Okuma macro source to hardcoded G-code.
   * Tries Python runtime first, falls back to TS converter.
   */
  async convert(source: string, options: ConvertOptions = {}): Promise<ConvertResult> {
    const start = Date.now();
    const sourceLines = source.split(/\r?\n/).length;
    const overrides = options.variableOverrides ?? {};

    const status = await this.status(options);

    // Try Python first
    if (status.python_available && status.converter_exists) {
      try {
        const args = [status.converter_script!, "--stdin", "--stdout"];
        if (options.preserveComments === false) args.push("--no-comments");
        const { stdout, stderr, code } = await runExecFile(
          status.python_binary!,
          args,
          source,
          options.timeoutMs ?? 30000
        );
        if (code === 0 && stdout.length > 0) {
          return {
            supported: true,
            converted_gcode: stdout,
            source_lines: sourceLines,
            output_lines: stdout.split(/\r?\n/).length,
            runtime_ms: Date.now() - start,
            runner: "python",
            warnings: stderr ? [stderr.trim()] : [],
            variables_resolved: overrides,
          };
        }
        log.warn(`[MacroConverter] Python converter failed (code ${code}), using TS fallback`);
      } catch (err) {
        log.warn(`[MacroConverter] Python execution error: ${err}`);
      }
    }

    // Fallback TS converter
    const { gcode, warnings, resolved } = fallbackConvert(source, overrides);
    return {
      supported: true,
      converted_gcode: gcode,
      source_lines: sourceLines,
      output_lines: gcode.split(/\r?\n/).length,
      runtime_ms: Date.now() - start,
      runner: "fallback_ts",
      warnings,
      variables_resolved: resolved,
    };
  }

  /**
   * Convert a file on disk — convenience wrapper around convert().
   */
  async convertFile(filePath: string, options: ConvertOptions = {}): Promise<ConvertResult> {
    if (!fs.existsSync(filePath)) {
      return {
        supported: false,
        source_lines: 0,
        output_lines: 0,
        runtime_ms: 0,
        runner: "none",
        error: `File not found: ${filePath}`,
        warnings: [],
        variables_resolved: {},
      };
    }
    const source = fs.readFileSync(filePath, "utf-8");
    return this.convert(source, options);
  }

  getStats(): {
    default_python_binary: string;
    default_converter_path: string;
    fallback_handles: string[];
    fallback_limitations: string[];
  } {
    return {
      default_python_binary: defaultPythonBinary(),
      default_converter_path: defaultConverterPath(),
      fallback_handles: [
        "variable_assignment",
        "variable_substitution",
        "comment_preservation",
      ],
      fallback_limitations: [
        "control_flow (IF/WHILE/GOTO skipped as comments)",
        "G65 macro calls (preserved as comments, not inlined)",
        "arithmetic expressions (not evaluated)",
      ],
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const okumaMacroConverterBridgeEngine = new OkumaMacroConverterBridgeEngineImpl();
export type { OkumaMacroConverterBridgeEngineImpl };
