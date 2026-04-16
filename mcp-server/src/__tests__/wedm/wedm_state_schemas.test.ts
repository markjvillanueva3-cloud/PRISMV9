/**
 * WEDM State Schema Tests - Phase 0.17
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = path.resolve(process.cwd(), "data/state");

describe("WEDM State File Schemas", () => {
  const files = fs.existsSync(STATE_DIR)
    ? fs.readdirSync(STATE_DIR).filter((f) => f.startsWith("WEDM_") && f.endsWith(".json"))
    : [];

  it("has at least 15 WEDM state files", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  for (const file of files) {
    describe(file, () => {
      const filePath = path.join(STATE_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      it("has schemaVersion defined", () => {
        expect(data.schemaVersion).toBeDefined();
      });

      it("is valid JSON object", () => {
        expect(typeof data).toBe("object");
      });
    });
  }
});
