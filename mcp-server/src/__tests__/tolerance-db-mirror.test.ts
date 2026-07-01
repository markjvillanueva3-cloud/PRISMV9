/**
 * ToleranceDB ISO 2768 mirror — single-source generator tests.
 * (JULIETT-DB-COVERAGE-MS0 / U-DB-MIRROR-GEN)
 *
 * Verifies the discovery mirror in ToleranceDB.json is GENERATED from — and stays
 * in sync with — the canonical ToleranceEngine ISO 2768 constants. This is the
 * fix for the orphan-shadow pattern: the file-backed DB JSON (loaded by
 * DatabaseRegistry for prism_data:database_search) must never drift from the
 * engine the live calc path uses.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  buildIso2768Section,
  generate,
  iso2768RowCount,
  TOLERANCE_DB_PATH,
} from "../../scripts/generate-tolerance-db-iso2768.js";
import { ISO2768_LINEAR, ISO2768_ANGULAR, ISO2768_CIRCULAR_RUNOUT } from "../engines/ToleranceEngine.js";

describe("ToleranceDB ISO 2768 mirror — single source of truth", () => {
  it("the section references the engine constants directly (the engine IS the source)", () => {
    const s = buildIso2768Section() as Record<string, any>;
    expect(s.linear_mm).toBe(ISO2768_LINEAR); // reference equality — not a copy
    expect(s.angular_deg).toBe(ISO2768_ANGULAR);
    expect(s.geometric.circular_runout_mm).toBe(ISO2768_CIRCULAR_RUNOUT);
    expect(s.standards).toContain("ISO 2768-1:1989");
    expect(s.standards).toContain("ISO 2768-2:1989");
  });

  it("carries the full ISO 2768 table set: 33 rows (anti-regression)", () => {
    // linear 8 + radius/chamfer 3 + angular 5 + straightness/flatness 6 +
    // perpendicularity 4 + symmetry 4 + circular run-out 3 (H/K/L) = 33
    expect(iso2768RowCount()).toBe(33);
  });

  it("DRIFT GUARD: on-disk ToleranceDB.json.iso2768 matches the engine — re-run the generator if this fails", () => {
    const db = JSON.parse(fs.readFileSync(TOLERANCE_DB_PATH, "utf-8"));
    // JSON serializes the open-ended (Infinity) bands -> null; compare JSON-to-JSON.
    const expected = JSON.parse(JSON.stringify(buildIso2768Section()));
    expect(db.iso2768).toEqual(expected);
  });

  it("is additive — preserves the existing ISO 286 content + bumps version", () => {
    const db = JSON.parse(fs.readFileSync(TOLERANCE_DB_PATH, "utf-8"));
    expect(db.it_grades).toContain("IT7"); // ISO 286 IT grades untouched
    expect(db.standard).toContain("ISO 286");
    expect(db.version).toBe("1.1.0");
  });

  it("generate() is idempotent — adds once, no spurious rewrite on re-run (temp copy)", () => {
    const tmp = `${TOLERANCE_DB_PATH}.itest-${process.pid}.json`;
    try {
      const base = JSON.parse(fs.readFileSync(TOLERANCE_DB_PATH, "utf-8"));
      delete base.iso2768;
      base.version = "1.0.0";
      fs.writeFileSync(tmp, JSON.stringify(base, null, 2));

      const first = generate(tmp); // section absent → adds it
      const second = generate(tmp); // already in sync → no change
      expect(first.changed).toBe(true);
      expect(first.rows).toBe(33);
      expect(second.changed).toBe(false);

      const written = JSON.parse(fs.readFileSync(tmp, "utf-8"));
      expect(written.version).toBe("1.1.0");
      expect(written.iso2768.linear_mm.length).toBe(8);
    } finally {
      fs.rmSync(tmp, { force: true });
      fs.rmSync(`${tmp}.${process.pid}.tmp`, { force: true });
    }
  });
});
