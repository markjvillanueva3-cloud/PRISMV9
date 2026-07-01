/**
 * MonolithMacroDatabaseSchemaEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MACRO-SCHEMA-LOADER.
 *
 * Pins the hyperMILL/OPEN MIND macro DB schema v13 byte-for-byte plus the
 * 4-dialect SQL emitter (sqlite/mariadb/sqlserver/msaccess).
 */

import { describe, it, expect } from "vitest";
import {
  MonolithMacroDatabaseSchemaEngine,
  monolithMacroDatabaseSchemaEngine,
} from "../engines/MonolithMacroDatabaseSchemaEngine.js";

const engine = monolithMacroDatabaseSchemaEngine;

describe("MonolithMacroDatabaseSchemaEngine — schema integrity", () => {
  it("schemaVersion is '13' per OPEN MIND v13 source", () => {
    expect(engine.schemaVersion).toBe("13");
  });

  it("schemaSource is the OPEN MIND tag", () => {
    expect(engine.schemaSource).toBe("OPEN MIND Macro Database Schema");
  });

  it("supportedDatabases lists the 4 dialects (sqlite/mariadb/sqlserver/msaccess)", () => {
    expect([...engine.supportedDatabases].sort()).toEqual(
      ["mariadb", "msaccess", "sqlite", "sqlserver"],
    );
  });

  it("ships exactly 8 tables per monolith source", () => {
    const t = engine.listTables();
    expect(t).toHaveLength(8);
    expect(t.map((x) => x.name).sort()).toEqual([
      "Job", "Job_Parameter", "Machine", "Machine_Group",
      "MacroType", "Material", "Material_Group", "Properties",
    ].sort());
  });

  it("Properties table: Name CHAR(255) PRIMARY KEY UNIQUE, Value CHAR(255) NOT NULL", () => {
    const t = engine.getTable("Properties");
    expect(t?.columns.Name).toEqual({ type: "CHAR(255)", primaryKey: true, unique: true });
    expect(t?.columns.Value).toEqual({ type: "CHAR(255)", notNull: true });
  });

  it("Job table: 26 columns (the central macro-instance table)", () => {
    const cols = engine.getColumns("Job");
    expect(cols).not.toBe(null);
    expect(Object.keys(cols ?? {})).toHaveLength(26);
  });

  it("Job table: ToolGeometry/HeadGeometry/HolderGeometry are BINARY columns", () => {
    const cols = engine.getColumns("Job");
    expect(cols?.ToolGeometry?.type).toBe("BINARY");
    expect(cols?.HeadGeometry?.type).toBe("BINARY");
    expect(cols?.HolderGeometry?.type).toBe("BINARY");
  });

  it("Job table: JobKey is INTEGER PRIMARY KEY AUTOINCREMENT", () => {
    const cols = engine.getColumns("Job");
    expect(cols?.JobKey).toEqual({
      type: "INTEGER", primaryKey: true, autoIncrement: true,
    });
  });

  it("Job table: ID/RefJobID/BaseJobID/ParentJobID are CHAR(36) (UUID-shaped)", () => {
    const cols = engine.getColumns("Job");
    expect(cols?.ID?.type).toBe("CHAR(36)");
    expect(cols?.RefJobID?.type).toBe("CHAR(36)");
    expect(cols?.BaseJobID?.type).toBe("CHAR(36)");
    expect(cols?.ParentJobID?.type).toBe("CHAR(36)");
  });

  it("Job table: declares the JobParaIDIdx index", () => {
    const t = engine.getTable("Job");
    expect(t?.indexes).toEqual(["JobParaIDIdx ON Job_Parameter (JobID)"]);
  });

  it("Job_Parameter table: 7 columns, no primary key (relational satellite)", () => {
    const cols = engine.getColumns("Job_Parameter");
    expect(cols).not.toBe(null);
    expect(Object.keys(cols ?? {})).toHaveLength(7);
    expect(cols?.JobID).toEqual({ type: "INTEGER", notNull: true });
    expect(cols?.ParaName).toEqual({ type: "VARCHAR", notNull: true });
  });

  it("Machine/Material tables carry GroupName FK (taxonomy join)", () => {
    expect(engine.getColumns("Machine")?.GroupName).toEqual({
      type: "CHAR(255)", notNull: true,
    });
    expect(engine.getColumns("Material")?.GroupName).toEqual({
      type: "CHAR(255)", notNull: true,
    });
  });

  it("MacroType: ID is INTEGER PRIMARY KEY AUTOINCREMENT (catalog of macro shapes)", () => {
    expect(engine.getColumns("MacroType")?.ID).toEqual({
      type: "INTEGER", primaryKey: true, autoIncrement: true,
    });
  });
});

describe("MonolithMacroDatabaseSchemaEngine — get* fail-soft (R12)", () => {
  it("getTable unknown name returns null", () => {
    expect(engine.getTable("UNKNOWN_TABLE")).toBe(null);
  });

  it("getTable empty/whitespace returns null", () => {
    expect(engine.getTable("")).toBe(null);
    expect(engine.getTable("   ")).toBe(null);
  });

  it("getColumns unknown table returns null", () => {
    expect(engine.getColumns("UNKNOWN")).toBe(null);
  });

  it("getColumns empty/whitespace returns null", () => {
    expect(engine.getColumns("")).toBe(null);
    expect(engine.getColumns("   ")).toBe(null);
  });
});

describe("MonolithMacroDatabaseSchemaEngine — SQL DDL emitter (4 dialects)", () => {
  it("sqlite emit: Properties → AUTOINCREMENT keyword + monolith-generic types", () => {
    // Properties has no autoIncrement, so test MacroType which does
    const sql = engine.generateCreateTableSql("MacroType", "sqlite");
    expect(sql).toContain("CREATE TABLE MacroType");
    expect(sql).toContain("ID INTEGER PRIMARY KEY AUTOINCREMENT");
    expect(sql).toContain("Name CHAR(255) NOT NULL");
  });

  it("mariadb emit: AUTO_INCREMENT keyword (snake_case-with-underscore)", () => {
    const sql = engine.generateCreateTableSql("MacroType", "mariadb");
    expect(sql).toContain("ID INTEGER PRIMARY KEY AUTO_INCREMENT");
  });

  it("sqlserver emit: VARBINARY(MAX) for BINARY, NVARCHAR(MAX) for VARCHAR, IDENTITY(1,1)", () => {
    const sql = engine.generateCreateTableSql("Job", "sqlserver");
    expect(sql).toContain("ToolGeometry VARBINARY(MAX)");
    expect(sql).toContain("FeatureRefIDs NVARCHAR(MAX) NOT NULL");
    expect(sql).toContain("JobKey INTEGER PRIMARY KEY IDENTITY(1,1)");
    // DOUBLE PRECISION maps to FLOAT
    expect(sql).toContain("StockResolution FLOAT NOT NULL");
  });

  it("msaccess emit: TEXT for VARCHAR, TEXT for CHAR(N), OLEOBJECT for BINARY, COUNTER for auto", () => {
    const sql = engine.generateCreateTableSql("Job", "msaccess");
    expect(sql).toContain("FeatureRefIDs TEXT NOT NULL");
    expect(sql).toContain("ID TEXT NOT NULL");          // CHAR(36) → TEXT
    expect(sql).toContain("ToolGeometry OLEOBJECT");
    expect(sql).toContain("JobKey INTEGER PRIMARY KEY COUNTER");
    expect(sql).toContain("StockResolution DOUBLE NOT NULL");
  });

  it("Properties emit (sqlite): PRIMARY KEY suppresses redundant UNIQUE (SQL semantics)", () => {
    const sql = engine.generateCreateTableSql("Properties", "sqlite");
    // Monolith carries `unique: true` AND `primaryKey: true` on Properties.Name.
    // PRIMARY KEY implies UNIQUE in standard SQL, so the engine emits only
    // PRIMARY KEY — the redundant UNIQUE keyword would be a portability hazard
    // (SQL Server in particular rejects UNIQUE alongside PRIMARY KEY in some forms).
    expect(sql).toContain("Name CHAR(255) PRIMARY KEY");
    expect(sql).not.toContain("Name CHAR(255) UNIQUE PRIMARY KEY");
    expect(sql).toContain("Value CHAR(255) NOT NULL");
  });

  it("unknown table returns null (no SQL emitted)", () => {
    expect(engine.generateCreateTableSql("UNKNOWN", "sqlite")).toBe(null);
  });

  it("unknown dialect returns null", () => {
    // Cast to bypass compile-time enum check — tests the runtime guard
    const result = engine.generateCreateTableSql(
      "Properties",
      "oracle" as unknown as "sqlite",
    );
    expect(result).toBe(null);
  });
});

describe("MonolithMacroDatabaseSchemaEngine — stats + immutability", () => {
  it("stats reports 8 tables + correct column count + 1 index", () => {
    const s = engine.stats();
    expect(s.tableCount).toBe(8);
    // 2 + 5 + 4 + 4 + 5 + 5 + 26 + 7 = 58 columns
    expect(s.columnCount).toBe(58);
    expect(s.indexCount).toBe(1);
    expect(s.schemaVersion).toBe("13");
  });

  it("fresh instance returns identical stats", () => {
    const fresh = new MonolithMacroDatabaseSchemaEngine();
    expect(fresh.stats()).toEqual(engine.stats());
  });

  it("listTables immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listTables();
    a.pop();
    expect(engine.listTables()).toHaveLength(8);
  });

  it("getTable immutability: mutating returned columns doesn't affect store", () => {
    const t = engine.getTable("Properties");
    if (t) delete (t.columns as Record<string, unknown>).Name;
    expect(engine.getTable("Properties")?.columns.Name).toEqual({
      type: "CHAR(255)", primaryKey: true, unique: true,
    });
  });
});
