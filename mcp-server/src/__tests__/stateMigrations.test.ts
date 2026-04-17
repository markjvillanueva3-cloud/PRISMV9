/**
 * stateMigrations — migration scaffold tests (CPP-MS4-U-CPP31)
 *
 * Verifies the scaffold's core contract: files without schemaVersion are
 * treated as v1, files at latest are no-ops, and files above latest are
 * forward-tolerated. Tests are deliberately simple — real assertions will
 * grow when v2 migrations land.
 *
 * @milestone CPP-MS4-U-CPP31
 */

import { describe, it, expect } from "vitest";
import {
  migrateToLatest,
  wasMissingSchemaVersion,
  LATEST_VERSION,
  type StateFileName,
} from "../migrations/stateMigrations.js";

describe("migrateToLatest() (CPP-MS4-U-CPP31)", () => {
  it("preserves existing fields when schemaVersion matches latest", () => {
    const input = { schemaVersion: 1, captured_at: "2026-04-17", call_number: 1 };
    const out = migrateToLatest(input, "COMPACTION_SURVIVAL");
    expect(out.schemaVersion).toBe(1);
    expect(out.captured_at).toBe("2026-04-17");
    expect(out.call_number).toBe(1);
  });

  it("stamps schemaVersion=1 on a file missing the field (legacy)", () => {
    const input = { captured_at: "2026-04-10", call_number: 1 };
    const out = migrateToLatest(input, "COMPACTION_SURVIVAL");
    expect(out.schemaVersion).toBe(1);
  });

  it("returns same shape for all 5 registered filenames", () => {
    const filenames: StateFileName[] = [
      "COMPACTION_SURVIVAL",
      "HANDOFF_PACKAGE",
      "RECOVERY_MANIFEST",
      "CURRENT_STATE",
      "next_session_prep",
    ];
    for (const fn of filenames) {
      const out = migrateToLatest({ foo: "bar" }, fn);
      expect(out.schemaVersion).toBe(LATEST_VERSION[fn]);
      expect(out.foo).toBe("bar");
    }
  });

  it("tolerates a forward-version file without throwing", () => {
    const input = { schemaVersion: 99, data: "future" };
    const out = migrateToLatest(input, "HANDOFF_PACKAGE");
    expect(out.schemaVersion).toBe(99);
    expect(out.data).toBe("future");
  });
});

describe("wasMissingSchemaVersion() (CPP-MS4-U-CPP31)", () => {
  it("returns true when schemaVersion absent", () => {
    expect(wasMissingSchemaVersion({ foo: "bar" })).toBe(true);
  });

  it("returns false when schemaVersion present as number", () => {
    expect(wasMissingSchemaVersion({ schemaVersion: 1 })).toBe(false);
  });

  it("returns true when schemaVersion present but not a number", () => {
    expect(wasMissingSchemaVersion({ schemaVersion: "1" })).toBe(true);
  });
});

describe("LATEST_VERSION (CPP-MS4-U-CPP31)", () => {
  it("defines latest for all 5 backfilled files", () => {
    expect(LATEST_VERSION.COMPACTION_SURVIVAL).toBe(1);
    expect(LATEST_VERSION.HANDOFF_PACKAGE).toBe(1);
    expect(LATEST_VERSION.RECOVERY_MANIFEST).toBe(1);
    expect(LATEST_VERSION.CURRENT_STATE).toBe(1);
    expect(LATEST_VERSION.next_session_prep).toBe(1);
  });
});
