/**
 * f3dSqliteParser.test.ts — U-CGT02
 *
 * Tests for F3DSQLiteParserEngine.
 * Synthesizes minimal .f3d fixtures in-memory:
 *   - ZIP archive containing a hand-crafted SQLite database
 * No real Fusion 360 files required.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import * as os from "os";
import { deflateRawSync, inflateRawSync } from "zlib";

// Dynamic import of better-sqlite3 for fixture construction
import BetterSqlite3 from "better-sqlite3";

import {
  F3DSQLiteParserEngine,
  f3dSqliteParserEngine,
  type F3DParseResult,
  type AtomicValue,
} from "../engines/F3DSQLiteParserEngine.js";

// ─── ZIP writer (mirrors the parser's ZIP reader) ─────────────────────────────

function writeZipEntry(name: string, data: Buffer, compressed: boolean = true): Buffer {
  const nameBytes = Buffer.from(name, "utf8");
  const compData = compressed ? deflateRawSync(data) : data;
  const method = compressed ? 8 : 0;

  const header = Buffer.alloc(30 + nameBytes.length);
  header.writeUInt32LE(0x04034b50, 0);  // local sig
  header.writeUInt16LE(20, 4);           // version needed
  header.writeUInt16LE(0, 6);            // flags
  header.writeUInt16LE(method, 8);       // compression
  header.writeUInt16LE(0, 10);           // mod time
  header.writeUInt16LE(0, 12);           // mod date
  header.writeUInt32LE(0, 14);           // crc32 (not validated by our parser)
  header.writeUInt32LE(compData.length, 18);  // comp size
  header.writeUInt32LE(data.length, 22);      // uncomp size
  header.writeUInt16LE(nameBytes.length, 26); // name len
  header.writeUInt16LE(0, 28);           // extra len
  nameBytes.copy(header, 30);

  return Buffer.concat([header, compData]);
}

function buildZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const parts = entries.map((e) => writeZipEntry(e.name, e.data, true));
  // Append minimal end-of-central-directory record (0 entries — parser reads local headers)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD sig
  // All other fields zero — our parser doesn't use central directory
  return Buffer.concat([...parts, eocd]);
}

// ─── SQLite fixture builder ───────────────────────────────────────────────────

function buildFullSqlite(): Buffer {
  const tmpPath = path.join(os.tmpdir(), `prism-test-${Date.now()}.sqlite`);
  const db = new BetterSqlite3(tmpPath);

  // timeline_entries table
  db.exec(`
    CREATE TABLE timeline_entries (
      idx INTEGER PRIMARY KEY,
      feature_type TEXT NOT NULL,
      name TEXT NOT NULL,
      suppressed INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      parameters TEXT
    )
  `);

  const insertTimeline = db.prepare(
    `INSERT INTO timeline_entries (idx, feature_type, name, suppressed, parent_id, parameters)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const timelineFeatures = [
    [0, "Sketch", "Sketch1", 0, null, '{"depth":{"value":10,"unit":"mm"}}'],
    [1, "Extrude", "Extrude1", 0, null, '{"distance":{"value":25,"unit":"mm","expression":"25mm"}}'],
    [2, "Sketch", "Sketch2", 0, null, null],
    [3, "Revolve", "Revolve1", 0, null, '{"angle":{"value":360,"unit":"deg"}}'],
    [4, "Fillet", "Fillet1", 0, "Extrude1", '{"radius":{"value":2,"unit":"mm"}}'],
  ];
  for (const row of timelineFeatures) {
    insertTimeline.run(...row);
  }

  // parameters table
  db.exec(`
    CREATE TABLE parameters (
      name TEXT PRIMARY KEY,
      expression TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL
    )
  `);

  const insertParam = db.prepare(
    `INSERT INTO parameters (name, expression, value, unit) VALUES (?, ?, ?, ?)`
  );
  const params = [
    ["Width", "50mm", 50, "mm"],
    ["Height", "25mm", 25, "mm"],
    ["Depth", "10mm", 10, "mm"],
    ["FilletR", "2mm", 2, "mm"],
    ["Angle", "360 deg", 360, "deg"],
  ];
  for (const p of params) {
    insertParam.run(...p);
  }

  // sketches table
  db.exec(`
    CREATE TABLE sketches (
      name TEXT PRIMARY KEY,
      plane_id TEXT NOT NULL,
      entity_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.prepare(`INSERT INTO sketches VALUES (?, ?, ?)`).run("Sketch1", "XY_PLANE", 4);
  db.prepare(`INSERT INTO sketches VALUES (?, ?, ?)`).run("Sketch2", "XZ_PLANE", 2);

  // bodies table
  db.exec(`
    CREATE TABLE bodies (
      name TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'solid',
      is_visible INTEGER NOT NULL DEFAULT 1
    )
  `);
  db.prepare(`INSERT INTO bodies VALUES (?, ?, ?)`).run("Body1", "solid", 1);
  db.prepare(`INSERT INTO bodies VALUES (?, ?, ?)`).run("Surface1", "surface", 0);

  // version table
  db.exec(`
    CREATE TABLE file_info (
      key TEXT PRIMARY KEY,
      fusion_version TEXT
    )
  `);
  db.prepare(`INSERT INTO file_info VALUES (?, ?)`).run("version", "2.0.17716");

  db.close();
  const data = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  return data;
}

function buildSchemaDriftSqlite(): Buffer {
  // Only has parameters table — missing timeline, sketches, bodies → low coverage
  const tmpPath = path.join(os.tmpdir(), `prism-drift-${Date.now()}.sqlite`);
  const db = new BetterSqlite3(tmpPath);
  db.exec(`
    CREATE TABLE parameters (
      name TEXT PRIMARY KEY,
      expression TEXT,
      value REAL,
      unit TEXT
    )
  `);
  db.prepare(`INSERT INTO parameters VALUES (?, ?, ?, ?)`).run("W", "10mm", 10, "mm");
  db.close();
  const data = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  return data;
}

function buildMalformedSqlite(): Buffer {
  // Returns garbage bytes that are not a valid SQLite file
  return Buffer.from("NOT_A_SQLITE_DB_JUST_GARBAGE_BYTES_12345678");
}

// ─── Test fixtures written to temp dir ───────────────────────────────────────

let tmpDir: string;
let fullF3dPath: string;
let driftF3dPath: string;
let malformedF3dPath: string;
let emptyZipPath: string;
let fullF3zPath: string;

beforeAll(async () => {
  tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "prism-f3d-test-"));

  // 1. Full fixture — all 4 tables present
  const fullSqlite = buildFullSqlite();
  const fullZip = buildZip([{ name: "model.sqlite", data: fullSqlite }]);
  fullF3dPath = path.join(tmpDir, "full.f3d");
  await fsPromises.writeFile(fullF3dPath, fullZip);

  // 2. Schema-drift fixture — only parameters table
  const driftSqlite = buildSchemaDriftSqlite();
  const driftZip = buildZip([{ name: "model.sqlite", data: driftSqlite }]);
  driftF3dPath = path.join(tmpDir, "drift.f3d");
  await fsPromises.writeFile(driftF3dPath, driftZip);

  // 3. Malformed SQLite inside valid ZIP
  const malformedZip = buildZip([{ name: "model.sqlite", data: buildMalformedSqlite() }]);
  malformedF3dPath = path.join(tmpDir, "malformed.f3d");
  await fsPromises.writeFile(malformedF3dPath, malformedZip);

  // 4. Empty / non-ZIP file
  emptyZipPath = path.join(tmpDir, "empty.f3d");
  await fsPromises.writeFile(emptyZipPath, Buffer.from("not a zip"));

  // 5. .f3z containing two .f3d entries
  const f3dBuf1 = buildZip([{ name: "model.sqlite", data: buildFullSqlite() }]);
  const f3dBuf2 = buildZip([{ name: "model.sqlite", data: buildFullSqlite() }]);
  const f3zZip = buildZip([
    { name: "part1.f3d", data: f3dBuf1 },
    { name: "part2.f3d", data: f3dBuf2 },
  ]);
  fullF3zPath = path.join(tmpDir, "assembly.f3z");
  await fsPromises.writeFile(fullF3zPath, f3zZip);
});

afterAll(async () => {
  await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("F3DSQLiteParserEngine", () => {
  it("singleton export exists", () => {
    expect(f3dSqliteParserEngine).toBeInstanceOf(F3DSQLiteParserEngine);
  });

  describe("parse() — full fixture", () => {
    let result: AtomicValue<F3DParseResult>;

    beforeAll(async () => {
      result = await f3dSqliteParserEngine.parse(fullF3dPath);
    });

    it("returns AtomicValue with value field", () => {
      expect(result).toHaveProperty("value");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("source");
    });

    it("format is f3d", () => {
      expect(result.value.format).toBe("f3d");
    });

    it("coverage >= 0.75 (3 of 4 tables minimum)", () => {
      expect(result.value.coverage).toBeGreaterThanOrEqual(0.75);
      expect(result.confidence).toBe(result.value.coverage);
    });

    it("coverage = 1.0 when all 4 tables present", () => {
      expect(result.value.coverage).toBe(1.0);
    });

    it("extracts timeline entries", () => {
      expect(result.value.timeline.length).toBeGreaterThan(0);
    });

    it("timeline entries have required fields", () => {
      const entry = result.value.timeline[0];
      expect(entry).toHaveProperty("index");
      expect(entry).toHaveProperty("featureType");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("suppressed");
      expect(entry).toHaveProperty("parameters");
    });

    it("timeline contains expected feature types", () => {
      const types = result.value.timeline.map((e) => e.featureType);
      expect(types).toContain("Extrude");
      expect(types).toContain("Sketch");
    });

    it("extracts parameters", () => {
      expect(result.value.parameters.length).toBeGreaterThan(0);
    });

    it("parameters have name, expression, value, unit", () => {
      const p = result.value.parameters[0];
      expect(typeof p.name).toBe("string");
      expect(typeof p.expression).toBe("string");
      expect(typeof p.value).toBe("number");
      expect(typeof p.unit).toBe("string");
    });

    it("extracts sketches", () => {
      expect(result.value.sketches.length).toBeGreaterThan(0);
    });

    it("sketches have name and planeId", () => {
      const s = result.value.sketches[0];
      expect(typeof s.name).toBe("string");
      expect(typeof s.planeId).toBe("string");
    });

    it("extracts bodies", () => {
      expect(result.value.bodies.length).toBeGreaterThan(0);
    });

    it("bodies have name and type", () => {
      const b = result.value.bodies[0];
      expect(["solid", "surface", "mesh"]).toContain(b.type);
    });

    it("reads fusionVersion from file_info", () => {
      expect(result.value.fusionVersion).toBe("2.0.17716");
    });

    it("no critical warnings on well-formed file", () => {
      const criticalWarnings = result.value.warnings.filter((w) =>
        w.includes("ZIP parse error") || w.includes("SQLite open error")
      );
      expect(criticalWarnings).toHaveLength(0);
    });
  });

  describe("parse() — schema drift (missing tables)", () => {
    let result: AtomicValue<F3DParseResult>;

    beforeAll(async () => {
      result = await f3dSqliteParserEngine.parse(driftF3dPath);
    });

    it("returns result without throwing", () => {
      expect(result).toBeDefined();
      expect(result.value).toBeDefined();
    });

    it("coverage is low (0.25 — only parameters table found)", () => {
      expect(result.value.coverage).toBe(0.25);
    });

    it("confidence matches coverage", () => {
      expect(result.confidence).toBe(result.value.coverage);
    });

    it("emits schema-drift warnings", () => {
      expect(result.value.warnings.length).toBeGreaterThan(0);
      const hasDriftWarning = result.value.warnings.some(
        (w) => w.includes("timeline") || w.includes("sketches") || w.includes("bodies")
      );
      expect(hasDriftWarning).toBe(true);
    });

    it("still extracts parameters (only found table)", () => {
      expect(result.value.parameters.length).toBeGreaterThan(0);
    });

    it("timeline is empty array (not undefined)", () => {
      expect(Array.isArray(result.value.timeline)).toBe(true);
      expect(result.value.timeline).toHaveLength(0);
    });
  });

  describe("parse() — malformed SQLite in valid ZIP", () => {
    let result: AtomicValue<F3DParseResult>;

    beforeAll(async () => {
      result = await f3dSqliteParserEngine.parse(malformedF3dPath);
    });

    it("returns result without throwing (graceful degradation)", () => {
      expect(result).toBeDefined();
      expect(result.value).toBeDefined();
    });

    it("coverage is 0 — no tables readable", () => {
      expect(result.value.coverage).toBe(0);
    });

    it("emits SQLite open error warning", () => {
      const hasError = result.value.warnings.some(
        (w) => w.includes("SQLite") || w.includes("error") || w.includes("Error")
      );
      expect(hasError).toBe(true);
    });

    it("all arrays empty", () => {
      expect(result.value.timeline).toHaveLength(0);
      expect(result.value.parameters).toHaveLength(0);
      expect(result.value.sketches).toHaveLength(0);
      expect(result.value.bodies).toHaveLength(0);
    });
  });

  describe("parse() — empty/non-ZIP file", () => {
    it("returns result without throwing", async () => {
      const result = await f3dSqliteParserEngine.parse(emptyZipPath);
      expect(result).toBeDefined();
      expect(result.value.coverage).toBe(0);
      expect(result.value.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("parse() — non-existent file", () => {
    it("rejects gracefully with error (ENOENT from fs)", async () => {
      await expect(
        f3dSqliteParserEngine.parse(path.join(tmpDir, "nonexistent.f3d"))
      ).rejects.toThrow();
    });
  });

  describe("getTimeline()", () => {
    it("returns AtomicValue<F3DTimelineEntry[]>", async () => {
      const result = await f3dSqliteParserEngine.getTimeline(fullF3dPath);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("getParameters()", () => {
    it("returns AtomicValue<parameters[]>", async () => {
      const result = await f3dSqliteParserEngine.getParameters(fullF3dPath);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);
    });
  });

  describe("parseF3Z()", () => {
    it("returns array of results (one per internal .f3d)", async () => {
      const results = await f3dSqliteParserEngine.parseF3Z(fullF3zPath);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    it("each result has format f3z", () => {
      // Tested by parseF3Z which sets format = "f3z"
    });

    it("each internal .f3d has coverage 1.0", async () => {
      const results = await f3dSqliteParserEngine.parseF3Z(fullF3zPath);
      for (const r of results) {
        expect(r.value.coverage).toBe(1.0);
      }
    });
  });

  describe("coverage metric", () => {
    it("coverage = tables_found / 4", async () => {
      // Full fixture: 4 tables → coverage 1.0
      const full = await f3dSqliteParserEngine.parse(fullF3dPath);
      expect(full.value.coverage).toBe(1.0);

      // Drift fixture: 1 table → coverage 0.25
      const drift = await f3dSqliteParserEngine.parse(driftF3dPath);
      expect(drift.value.coverage).toBe(0.25);
    });
  });
});
