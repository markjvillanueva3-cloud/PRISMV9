/**
 * material-r3-parity.test.ts — DB-COVERAGE-GAPFILL-MS0 / U-MAT01
 *
 * Verifies the persisted material data files in data/materials/ are:
 *   1. COMPLETE across all six ISO groups (P/M/K/N/S/H) — the gap U-MAT01 closes.
 *   2. SINGLE-SOURCE-CONSISTENT — every cutting constant (kc1_1/mc/taylor_C/taylor_n)
 *      in a record that DECLARES a `source` equals that exact origin in
 *      src/physics/constants.ts (AISI_CUTTING_COEFFICIENTS[grade] or
 *      CANONICAL_KIENZLE/CANONICAL_TAYLOR[iso]) — asserted by exact value, so a
 *      fabricated kc1_1 that diverges from its claimed source FAILS the test.
 *   3. PHYSICALLY SANE — finite, positive, within bounds; no NaN; hardness present.
 *
 * R9: the test fails if material physics drifts from canonical constants, if a
 * new record omits provenance, or if any ISO group loses coverage. It compares
 * concrete numeric values against the imported constants — not satisfiable by a stub.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AISI_CUTTING_COEFFICIENTS,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
} from "../physics/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATERIALS_DIR = join(__dirname, "..", "..", "data", "materials");
const ISO_GROUPS = ["H", "K", "M", "N", "P", "S"]; // sorted for equality assertions
const NEW_FILES = ["P_STEEL_R3.json", "N_NONFERROUS_R3.json", "H_HARDENED_R3.json"];

interface MatRecord {
  material_id: string;
  name: string;
  iso_group: string;
  kienzle?: { kc1_1: number; mc: number; source?: string };
  taylor?: { C: number; n: number; source?: string };
  physical?: Record<string, number>;
  mechanical?: { hardness?: Record<string, number | null> };
}

function loadAll(): { file: string; records: MatRecord[] }[] {
  return readdirSync(MATERIALS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const parsed = JSON.parse(readFileSync(join(MATERIALS_DIR, file), "utf8"));
      return { file, records: Array.isArray(parsed?.materials) ? parsed.materials : [] };
    })
    .filter((l) => l.records.length > 0);
}

/** Parse "constants.ts:AISI_CUTTING_COEFFICIENTS['4140']" / "...CANONICAL_KIENZLE['P'] ..." */
function parseSource(src: string): { table: "AISI" | "KIENZLE" | "TAYLOR"; key: string } | null {
  let m = src.match(/AISI_CUTTING_COEFFICIENTS\['([^']+)'\]/);
  if (m) return { table: "AISI", key: m[1] };
  m = src.match(/CANONICAL_KIENZLE\['([^']+)'\]/);
  if (m) return { table: "KIENZLE", key: m[1] };
  m = src.match(/CANONICAL_TAYLOR\['([^']+)'\]/);
  if (m) return { table: "TAYLOR", key: m[1] };
  return null;
}

const loaded = loadAll();
const loadedFiles = loaded.map((l) => l.file);
const allRecords = loaded.flatMap((l) => l.records);
// Every NEW-file record MUST carry kienzle.source + taylor.source; derive the
// expected sourced-record count from the data so dropping a source fails loudly
// (not silently degrading the single-source check to vacuous).
const NEW_RECORD_COUNT = loaded
  .filter((l) => NEW_FILES.includes(l.file))
  .flatMap((l) => l.records).length;

describe("material R3 data files — coverage + single-source parity", () => {
  it("loads >=6 material data files and >=16 records", () => {
    expect(loaded.length).toBeGreaterThanOrEqual(6);
    expect(allRecords.length).toBeGreaterThanOrEqual(16);
  });

  it("covers exactly the six ISO groups P/M/K/N/S/H (U-MAT01 completeness goal)", () => {
    const present = [...new Set(allRecords.map((r) => r.iso_group))].sort();
    expect(present).toEqual(ISO_GROUPS);
    const countByGroup: Record<string, number> = {};
    for (const r of allRecords) countByGroup[r.iso_group] = (countByGroup[r.iso_group] ?? 0) + 1;
    for (const g of ISO_GROUPS) expect(countByGroup[g]).toBeGreaterThanOrEqual(1);
  });

  it("each NEW R3 file (P/N/H) carries >=5 grades of its declared ISO group", () => {
    const expectIso: Record<string, string> = {
      "P_STEEL_R3.json": "P",
      "N_NONFERROUS_R3.json": "N",
      "H_HARDENED_R3.json": "H",
    };
    for (const file of NEW_FILES) {
      expect(loadedFiles).toContain(file);
      const recs = loaded.find((l) => l.file === file)!.records.filter((r) => r.iso_group === expectIso[file]);
      expect(recs.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("material_ids are unique and every iso_group is one of the six", () => {
    const seen = new Map<string, number>();
    for (const r of allRecords) seen.set(r.material_id, (seen.get(r.material_id) ?? 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
    expect(allRecords.filter((r) => !ISO_GROUPS.includes(r.iso_group)).map((r) => r.material_id)).toEqual([]);
  });

  it("kc1_1/mc/density are finite & in-bounds, and every record has a positive hardness (no NaN)", () => {
    const violations: string[] = [];
    for (const r of allRecords) {
      const kc = r.kienzle?.kc1_1 ?? NaN;
      if (!(Number.isFinite(kc) && kc >= 200 && kc <= 5000)) violations.push(`${r.material_id}:kc1_1=${kc}`);
      const mc = r.kienzle?.mc ?? NaN;
      if (!(Number.isFinite(mc) && mc > 0.05 && mc < 0.45)) violations.push(`${r.material_id}:mc=${mc}`);
      const d = r.physical?.density ?? NaN;
      if (!(Number.isFinite(d) && d > 1000 && d < 20000)) violations.push(`${r.material_id}:density=${d}`);
      const h = r.mechanical?.hardness ?? {};
      const maxH = Math.max(0, ...["brinell", "vickers", "rockwell_c", "rockwell_b"]
        .map((k) => (typeof h[k] === "number" && Number.isFinite(h[k] as number) ? (h[k] as number) : 0)));
      if (!(maxH > 0)) violations.push(`${r.material_id}:no-hardness`);
    }
    expect(violations).toEqual([]);
  });

  it("SINGLE-SOURCE kienzle: every sourced record's kc1_1/mc EQUALS its cited canonical origin", () => {
    let checked = 0;
    for (const r of allRecords) {
      const src = r.kienzle?.source;
      if (!src) continue;
      const p = parseSource(src);
      expect(p === null, `${r.material_id}: unparseable kienzle.source "${src}"`).toBe(false);
      if (!p) continue;
      if (p.table === "AISI") {
        expect(Object.keys(AISI_CUTTING_COEFFICIENTS)).toContain(p.key);
        const c = AISI_CUTTING_COEFFICIENTS[p.key];
        expect(r.kienzle!.kc1_1).toBe(c.kc1_1);
        expect(r.kienzle!.mc).toBe(c.mc);
        expect(c.iso_group).toBe(r.iso_group);
      } else if (p.table === "KIENZLE") {
        expect(p.key).toBe(r.iso_group); // a record may only fall back to ITS OWN group default
        expect(Object.keys(CANONICAL_KIENZLE)).toContain(p.key);
        const c = CANONICAL_KIENZLE[p.key as keyof typeof CANONICAL_KIENZLE];
        expect(r.kienzle!.kc1_1).toBe(c.kc1_1);
        expect(r.kienzle!.mc).toBe(c.mc);
      } else {
        throw new Error(`${r.material_id}: kienzle.source points at a Taylor table`);
      }
      checked++;
    }
    expect(checked).toBe(NEW_RECORD_COUNT);
  });

  it("SINGLE-SOURCE taylor: every sourced record's C/n EQUALS its cited canonical origin", () => {
    let checked = 0;
    for (const r of allRecords) {
      const src = r.taylor?.source;
      if (!src) continue;
      const p = parseSource(src);
      expect(p === null, `${r.material_id}: unparseable taylor.source "${src}"`).toBe(false);
      if (!p) continue;
      if (p.table === "AISI") {
        expect(Object.keys(AISI_CUTTING_COEFFICIENTS)).toContain(p.key);
        const c = AISI_CUTTING_COEFFICIENTS[p.key];
        expect(r.taylor!.C).toBe(c.taylor_C);
        expect(r.taylor!.n).toBe(c.taylor_n);
        expect(c.iso_group).toBe(r.iso_group); // cited grade must be in the record's ISO group
      } else if (p.table === "TAYLOR") {
        expect(p.key).toBe(r.iso_group);
        expect(Object.keys(CANONICAL_TAYLOR)).toContain(p.key);
        const c = CANONICAL_TAYLOR[p.key as keyof typeof CANONICAL_TAYLOR];
        expect(r.taylor!.C).toBe(c.C);
        expect(r.taylor!.n).toBe(c.n);
      } else {
        throw new Error(`${r.material_id}: taylor.source points at a Kienzle table`);
      }
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(16);
  });

  it("NEW R3 records (P/N/H) all declare kienzle.source AND taylor.source citing constants.ts", () => {
    const missing: string[] = [];
    for (const { file, records } of loaded) {
      if (!NEW_FILES.includes(file)) continue;
      for (const r of records) {
        if (!/constants\.ts:(AISI_CUTTING_COEFFICIENTS|CANONICAL_KIENZLE)/.test(r.kienzle?.source ?? ""))
          missing.push(`${file}:${r.material_id}:kienzle`);
        if (!/constants\.ts:(AISI_CUTTING_COEFFICIENTS|CANONICAL_TAYLOR)/.test(r.taylor?.source ?? ""))
          missing.push(`${file}:${r.material_id}:taylor`);
      }
    }
    expect(missing).toEqual([]);
  });
});
