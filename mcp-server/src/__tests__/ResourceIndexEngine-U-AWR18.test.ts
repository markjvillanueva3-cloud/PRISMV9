/**
 * AI-AWARE-HARDEN/U-AWR18 — JM_DIE_FOLDERS Expansion Validation
 *
 * Validates expanded JM_DIE_FOLDERS (8 → 16+) and program extension support
 * (.nc/.NC/.MIN/.min + .mcx/.mcx-8/.MCX/.mcam) per U-AWR18 exit gate.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Re-read the source to extract JM_DIE_FOLDERS array and PROGRAM_EXTENSIONS.
 * This avoids needing to export private constants.
 */
function readSource(): string {
  const engPath = path.resolve("src/engines/ResourceIndexEngine.ts");
  return fs.readFileSync(engPath, "utf-8");
}

describe("AI-AWARE-HARDEN/U-AWR18: JM_DIE_FOLDERS expansion", () => {
  describe("Folder list expansion", () => {
    it("JM_DIE_FOLDERS has >= 16 entries", () => {
      const src = readSource();
      const match = src.match(/const JM_DIE_FOLDERS = \[([\s\S]*?)\];/);
      expect(match).not.toBeNull();
      const entries = (match![1].match(/"[^"]+"/g) ?? []);
      expect(entries.length).toBeGreaterThanOrEqual(16);
    });

    it("JM_DIE_FOLDERS contains MATTHEW (was orphaned)", () => {
      expect(readSource()).toContain('"MATTHEW"');
    });

    it("JM_DIE_FOLDERS contains QUEUE", () => {
      expect(readSource()).toContain('"QUEUE"');
    });

    it("JM_DIE_FOLDERS contains JM DIE COMPANY", () => {
      expect(readSource()).toContain('"JM DIE COMPANY"');
    });

    it("JM_DIE_FOLDERS contains SETUPS", () => {
      expect(readSource()).toContain('"SETUPS"');
    });

    it("JM_DIE_FOLDERS preserves original 8 entries", () => {
      const src = readSource();
      expect(src).toContain('"CNC LATHE"');
      expect(src).toContain('"CNC MILL HAAS"');
      expect(src).toContain('"CNC OKUMA MULTUS"');
      expect(src).toContain('"WIRE EDM"');
      expect(src).toContain('"OKUMA"');
      expect(src).toContain('"LATHE"');
      expect(src).toContain('"HAAS-HURCO"');
      expect(src).toContain('"ROKU-ROKU"');
    });
  });

  describe("PROGRAM_EXTENSIONS expansion", () => {
    it("extension filter includes .mcx", () => {
      expect(readSource()).toContain('".mcx"');
    });

    it("extension filter includes .mcx-8", () => {
      expect(readSource()).toContain('".mcx-8"');
    });

    it("extension filter includes .MCX", () => {
      expect(readSource()).toContain('".MCX"');
    });

    it("extension filter includes .mcam", () => {
      expect(readSource()).toContain('".mcam"');
    });

    it("extension filter still includes original .nc/.NC/.MIN/.min", () => {
      const src = readSource();
      expect(src).toContain('".nc"');
      expect(src).toContain('".NC"');
      expect(src).toContain('".MIN"');
      expect(src).toContain('".min"');
    });

    it("isProgramFile helper function exists", () => {
      expect(readSource()).toContain("function isProgramFile");
    });
  });

  describe("Runtime behavior — isProgramFile", () => {
    // We can't call the private function directly, but we can verify
    // behavior via the engine's getJMDieProgramSample (which uses it).
    it("engine still instantiates after changes", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      expect(resourceIndexEngine).toBeDefined();
    });

    it("getJMDieProgramSample does not throw for known folder", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      const result = await resourceIndexEngine.getJMDieProgramSample("CNC LATHE", 1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("getJMDieProgramSample rejects unknown folder (path traversal guard)", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      await expect(
        resourceIndexEngine.getJMDieProgramSample("__not_in_whitelist__", 1)
      ).rejects.toThrow(/Invalid machineType/);
    });

    it("getJMDieProgramSample accepts new folder (MATTHEW)", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      const result = await resourceIndexEngine.getJMDieProgramSample("MATTHEW", 1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("U-AWR18 exit gate", () => {
    it("≥16 JM_DIE_FOLDERS entries satisfies criterion", () => {
      const src = readSource();
      const match = src.match(/const JM_DIE_FOLDERS = \[([\s\S]*?)\];/);
      const entries = (match![1].match(/"[^"]+"/g) ?? []);
      expect(entries.length).toBeGreaterThanOrEqual(16);
    });

    it("Mastercam extensions recognized", () => {
      const src = readSource();
      const mastercamExts = [".mcx", ".mcx-8", ".MCX", ".mcam"];
      for (const ext of mastercamExts) {
        expect(src).toContain(`"${ext}"`);
      }
    });

    it("path traversal protection maintained (whitelist enforced)", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      await expect(
        resourceIndexEngine.getJMDieProgramSample("../../../etc/passwd", 1)
      ).rejects.toThrow(/Invalid machineType/);
    });
  });
});
