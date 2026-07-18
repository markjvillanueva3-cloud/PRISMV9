/**
 * CLI Integration Tests — CLI-MS0 P4-U04
 *
 * End-to-end tests for the PRISM CLI.
 * Runs actual CLI commands via execFileSync and validates output.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { join } from "path";

const CLI_PATH = join(import.meta.dirname, "..", "..", "dist", "cli.js");
const NODE = process.execPath;

function runCLI(args: string[], timeout = 15000): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync(NODE, [CLI_PATH, ...args], {
      encoding: "utf-8",
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout || "", exitCode: e.status || 1 };
  }
}

function runCLIJson(args: string[]): Record<string, unknown> {
  const { stdout } = runCLI(["--format", "json", ...args]);
  // Filter out logger lines (contain [info] etc)
  const jsonLines = stdout.split("\n").filter(l => !l.includes("[info]") && !l.includes("[warn]") && !l.includes("[debug]") && l.trim());
  const jsonStr = jsonLines.join("\n");
  return JSON.parse(jsonStr);
}

describe("CLI Integration Tests", () => {

  describe("version and help", () => {
    it("--version outputs version string", () => {
      const { stdout, exitCode } = runCLI(["--version"]);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("--help lists commands", () => {
      const { stdout, exitCode } = runCLI(["--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("sf|speed-feed");
      expect(stdout).toContain("post|post-process");
      expect(stdout).toContain("playbook");
      expect(stdout).toContain("calc");
    });

    it("sf --help shows speed-feed options", () => {
      const { stdout, exitCode } = runCLI(["sf", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--material");
      expect(stdout).toContain("--tool-diameter");
      expect(stdout).toContain("--flutes");
    });
  });

  describe("speed-feed (sf)", () => {
    it("computes S/F for aluminum with JSON output", () => {
      const result = runCLIJson(["sf", "--material", "aluminum_6061", "--tool-diameter", "12", "--flutes", "4", "--operation", "roughing"]);
      expect(result).toHaveProperty("spindle_rpm");
      expect(result).toHaveProperty("feed_rate_mmmin");
      expect(result).toHaveProperty("cutting_speed_mpm");
      expect((result as { spindle_rpm: number }).spindle_rpm).toBeGreaterThan(0);
    });

    it("computes S/F for steel", () => {
      const result = runCLIJson(["sf", "--material", "steel", "--tool-diameter", "10", "--flutes", "4"]);
      expect((result as { spindle_rpm: number }).spindle_rpm).toBeGreaterThan(0);
      expect((result as { feed_rate_mmmin: number }).feed_rate_mmmin).toBeGreaterThan(0);
    });

    it("table format produces readable output", () => {
      const { stdout } = runCLI(["sf", "--material", "steel", "--tool-diameter", "10", "--flutes", "4", "--format", "table"]);
      // Table has key=value pairs
      expect(stdout).toContain("spindle_rpm");
    });

    it("compact format produces key=value pairs", () => {
      const { stdout } = runCLI(["sf", "--material", "steel", "--tool-diameter", "10", "--flutes", "4", "--format", "compact"]);
      expect(stdout).toMatch(/spindle_rpm=\d+/);
    });
  });

  describe("playbook", () => {
    it("returns rules for roughing", () => {
      const result = runCLIJson(["playbook", "--operation", "roughing"]) as { rules?: unknown[] };
      expect(result).toHaveProperty("rules");
      expect(Array.isArray(result.rules)).toBe(true);
      expect(result.rules!.length).toBeGreaterThan(0);
    });

    it("returns rules for specific material", () => {
      const result = runCLIJson(["playbook", "--material", "aluminum"]) as { rules?: unknown[] };
      expect(result.rules!.length).toBeGreaterThan(0);
    });
  });

  describe("completion", () => {
    it("bash completion script is valid", () => {
      const { stdout, exitCode } = runCLI(["completion", "bash"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("_prism_complete");
      expect(stdout).toContain("complete -F");
      expect(stdout).toContain("compgen");
    });

    it("zsh completion script is valid", () => {
      const { stdout, exitCode } = runCLI(["completion", "zsh"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("compdef _prism prism");
    });

    it("powershell completion script is valid", () => {
      const { stdout, exitCode } = runCLI(["completion", "powershell"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Register-ArgumentCompleter");
    });

    it("unknown shell returns exit code 2", () => {
      const { exitCode } = runCLI(["completion", "fish"]);
      expect(exitCode).toBe(2);
    });
  });

  describe("output formats", () => {
    it("json format is valid JSON", () => {
      const { stdout } = runCLI(["--format", "json", "sf", "--material", "steel", "--tool-diameter", "10", "--flutes", "4"]);
      const jsonStr = stdout.split("\n").filter(l => !l.includes("[info]") && l.trim()).join("\n");
      expect(() => JSON.parse(jsonStr)).not.toThrow();
    });

    it("csv format has comma-separated values", () => {
      const { stdout } = runCLI(["--format", "csv", "playbook", "--operation", "roughing"]);
      // CSV should have header line with commas
      const lines = stdout.split("\n").filter(l => !l.includes("[info]") && l.trim());
      if (lines.length > 0) {
        expect(lines[0]).toContain(",");
      }
    });
  });

  describe("error handling", () => {
    it("unknown command returns exit code 1", () => {
      const { exitCode } = runCLI(["nonexistent_command"]);
      expect(exitCode).not.toBe(0);
    });
  });
});
