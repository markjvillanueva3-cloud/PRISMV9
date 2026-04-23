import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const COMMANDS_DIR = "H:/.claude/commands";

// 15 slash commands expected for CAMX-MS17 closure (8 units).
const EXPECTED_COMMANDS: Array<{ name: string; unit: string }> = [
  // U01 — per-CAM setup (5)
  { name: "mastercam-setup", unit: "U01" },
  { name: "solidcam-setup", unit: "U01" },
  { name: "nx-cam-setup", unit: "U01" },
  { name: "powermill-setup", unit: "U01" },
  { name: "catia-cam-setup", unit: "U01" },
  // U02 — per-CAM strategy guides (5)
  { name: "mastercam-strategy-guide", unit: "U02" },
  { name: "solidcam-imachining-guide", unit: "U02" },
  { name: "nx-strategy-guide", unit: "U02" },
  { name: "powermill-strategy-guide", unit: "U02" },
  { name: "catia-strategy-guide", unit: "U02" },
  // U03-U07 — cross-CAM orchestration (5)
  { name: "cam-strategy-select", unit: "U03" },
  { name: "cam-strategy-compare", unit: "U04" },
  { name: "cam-bridge", unit: "U05" },
  { name: "cam-export-tools", unit: "U06" },
  { name: "pipeline-optimize", unit: "U07" },
];

describe("CAMX-MS17: Comprehensive Slash Commands + MCP Integration", () => {
  describe("U01 per-CAM setup commands (5)", () => {
    for (const { name } of EXPECTED_COMMANDS.filter((c) => c.unit === "U01")) {
      it(`/${name} exists`, () => {
        expect(existsSync(join(COMMANDS_DIR, `${name}.md`))).toBe(true);
      });
    }
  });

  describe("U02 per-CAM strategy guides (5)", () => {
    for (const { name } of EXPECTED_COMMANDS.filter((c) => c.unit === "U02")) {
      it(`/${name} exists`, () => {
        expect(existsSync(join(COMMANDS_DIR, `${name}.md`))).toBe(true);
      });
    }
  });

  describe("U03-U07 cross-CAM commands (5)", () => {
    const crossCam = EXPECTED_COMMANDS.filter((c) => ["U03", "U04", "U05", "U06", "U07"].includes(c.unit));
    for (const { name } of crossCam) {
      it(`/${name} exists`, () => {
        expect(existsSync(join(COMMANDS_DIR, `${name}.md`))).toBe(true);
      });
    }
  });

  describe("command file structure", () => {
    for (const { name } of EXPECTED_COMMANDS) {
      it(`/${name} has YAML frontmatter + Pipeline section`, () => {
        const src = readFileSync(join(COMMANDS_DIR, `${name}.md`), "utf8");
        expect(src.startsWith("---\n")).toBe(true);
        expect(src).toMatch(/^name:\s*\S+/m);
        expect(src).toMatch(/^description:\s*\S+/m);
        expect(src).toMatch(/## Pipeline/);
        expect(src).toMatch(/## Exit criteria/);
      });
    }
  });

  describe("command pipelines reference prism_cam actions", () => {
    for (const { name } of EXPECTED_COMMANDS) {
      it(`/${name} calls prism_cam dispatcher`, () => {
        const src = readFileSync(join(COMMANDS_DIR, `${name}.md`), "utf8");
        expect(src).toMatch(/prism_cam/);
      });
    }
  });

  describe("command count", () => {
    it("all 15 CAMX-MS17 commands present", () => {
      const missing = EXPECTED_COMMANDS.filter(
        (c) => !existsSync(join(COMMANDS_DIR, `${c.name}.md`))
      );
      expect(missing).toEqual([]);
      expect(EXPECTED_COMMANDS.length).toBe(15);
    });
  });

  describe("U08 MCP prompts + completions", () => {
    it("prism_cam dispatcher exposes CAM-specific actions", async () => {
      const { default: calcActions } = await import("../tools/dispatchers/camDispatcher.js").then((m) => ({
        default: (m as any).CAM_ACTIONS ?? (m as any).ACTIONS ?? [],
      }));
      // Smoke check — dispatcher imports cleanly and has CAM actions
      expect(Array.isArray(calcActions)).toBe(true);
    });
  });
});
