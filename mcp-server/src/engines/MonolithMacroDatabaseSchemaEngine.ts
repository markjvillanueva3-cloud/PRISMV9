/**
 * MonolithMacroDatabaseSchemaEngine — U-DB-MONOLITH-MACRO-SCHEMA-LOADER
 *
 * TS-typed port of `PRISM_MACRO_DATABASE_SCHEMA.js` from the v8.89 monolith
 * extraction (`extracted_modules/databases/`). OPEN MIND / hyperMILL macro
 * database schema v13 — 8 tables that define how macros + jobs + parameters
 * + machine/material groups are stored in a relational backend.
 *
 * Supported backends (per monolith source): SQLite, MariaDB, SQL Server,
 * MS Access. Each column type is given as a generic SQL type (CHAR(N),
 * VARCHAR, INTEGER, DOUBLE PRECISION, SMALLINT, BINARY) that all four
 * dialects accept.
 *
 * Tables shipped:
 *   - Properties (key/value)
 *   - MacroType (catalog of macro shapes)
 *   - Machine_Group / Material_Group (taxonomy)
 *   - Machine / Material (records, FK to group)
 *   - Job (the central macro-instance table; 25 columns including
 *     ToolGeometry/HeadGeometry/HolderGeometry BLOBs)
 *   - Job_Parameter (key/value rows per Job)
 *
 * Data-only engine. Surface: listTables, getTable, getColumns,
 * generateCreateTableSql (per-dialect emitter), stats. Useful for anyone
 * importing/exporting macro databases or building a hyperMILL bridge.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MACRO-SCHEMA-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted_modules/databases/PRISM_MACRO_DATABASE_SCHEMA.js v13
 */

export type SqlDialect = "sqlite" | "mariadb" | "sqlserver" | "msaccess";

export interface ColumnSpec {
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  notNull?: boolean;
  autoIncrement?: boolean;
}

export interface TableSpec {
  name: string;
  columns: Record<string, ColumnSpec>;
  indexes?: string[];
}

const SCHEMA_VERSION = "13";
const SCHEMA_SOURCE = "OPEN MIND Macro Database Schema";
const SUPPORTED_DATABASES: readonly SqlDialect[] = ["sqlite", "mariadb", "sqlserver", "msaccess"] as const;

const TABLES: Record<string, Omit<TableSpec, "name">> = {
  Properties: {
    columns: {
      Name:  { type: "CHAR(255)", primaryKey: true, unique: true },
      Value: { type: "CHAR(255)", notNull: true },
    },
  },
  MacroType: {
    columns: {
      ID:              { type: "INTEGER", primaryKey: true, autoIncrement: true },
      Name:            { type: "CHAR(255)", notNull: true },
      FreeParameter_1: { type: "VARCHAR" },
      FreeParameter_2: { type: "VARCHAR" },
      FreeParameter_3: { type: "VARCHAR" },
    },
  },
  Machine_Group: {
    columns: {
      Name:            { type: "CHAR(255)", notNull: true },
      FreeParameter_1: { type: "VARCHAR" },
      FreeParameter_2: { type: "VARCHAR" },
      FreeParameter_3: { type: "VARCHAR" },
    },
  },
  Material_Group: {
    columns: {
      Name:            { type: "CHAR(255)", notNull: true },
      FreeParameter_1: { type: "VARCHAR" },
      FreeParameter_2: { type: "VARCHAR" },
      FreeParameter_3: { type: "VARCHAR" },
    },
  },
  Machine: {
    columns: {
      Name:            { type: "CHAR(255)", notNull: true },
      GroupName:       { type: "CHAR(255)", notNull: true },
      FreeParameter_1: { type: "VARCHAR" },
      FreeParameter_2: { type: "VARCHAR" },
      FreeParameter_3: { type: "VARCHAR" },
    },
  },
  Material: {
    columns: {
      Name:            { type: "CHAR(255)", notNull: true },
      GroupName:       { type: "CHAR(255)", notNull: true },
      FreeParameter_1: { type: "VARCHAR" },
      FreeParameter_2: { type: "VARCHAR" },
      FreeParameter_3: { type: "VARCHAR" },
    },
  },
  Job: {
    columns: {
      JobKey:           { type: "INTEGER", primaryKey: true, autoIncrement: true },
      ID:               { type: "CHAR(36)", notNull: true },
      RefJobID:         { type: "CHAR(36)", notNull: true },
      BaseJobID:        { type: "CHAR(36)", notNull: true },
      ParentJobID:      { type: "CHAR(36)", notNull: true },
      StockRefJobID:    { type: "CHAR(36)", notNull: true },
      FeatureRefIDs:    { type: "VARCHAR", notNull: true },
      MacroID:          { type: "CHAR(36)", notNull: true },
      MacroSequence:    { type: "INTEGER", notNull: true },
      UseNameAutoText:  { type: "SMALLINT", notNull: true },
      JobName:          { type: "CHAR(255)", notNull: true },
      SystemJobType:    { type: "CHAR(50)", notNull: true },
      JobType:          { type: "CHAR(50)", notNull: true },
      GenerateStock:    { type: "SMALLINT", notNull: true },
      StockResolution:  { type: "DOUBLE PRECISION", notNull: true },
      ToolDataType:     { type: "CHAR(50)", notNull: true },
      ToolType:         { type: "INTEGER", notNull: true },
      ToolName:         { type: "CHAR(255)", notNull: true },
      ToolNumber:       { type: "CHAR(50)", notNull: true },
      ToolDiameter:     { type: "DOUBLE PRECISION", notNull: true },
      ToolTolerance:    { type: "DOUBLE PRECISION", notNull: true },
      ToolMinLength:    { type: "DOUBLE PRECISION", notNull: true },
      JobParaCRC32:     { type: "INTEGER", notNull: true },
      ToolGeometry:     { type: "BINARY" },
      HeadGeometry:     { type: "BINARY" },
      HolderGeometry:   { type: "BINARY" },
    },
    indexes: ["JobParaIDIdx ON Job_Parameter (JobID)"],
  },
  Job_Parameter: {
    columns: {
      JobID:           { type: "INTEGER", notNull: true },
      Usage:           { type: "VARCHAR", notNull: true },
      ParaName:        { type: "VARCHAR", notNull: true },
      ParaValue:       { type: "VARCHAR", notNull: true },
      FreeParameter_1: { type: "VARCHAR" },
      FreeParameter_2: { type: "VARCHAR" },
      FreeParameter_3: { type: "VARCHAR" },
    },
  },
};

export class MonolithMacroDatabaseSchemaEngine {
  get schemaVersion(): string { return SCHEMA_VERSION; }
  get schemaSource(): string { return SCHEMA_SOURCE; }
  get supportedDatabases(): readonly SqlDialect[] { return SUPPORTED_DATABASES; }

  listTables(): TableSpec[] {
    return Object.entries(TABLES).map(([name, spec]) => ({
      name,
      columns: { ...spec.columns },
      ...(spec.indexes ? { indexes: [...spec.indexes] } : {}),
    }));
  }

  getTable(name: string): TableSpec | null {
    if (typeof name !== "string" || name.trim() === "") return null;
    const spec = TABLES[name];
    if (!spec) return null;
    return {
      name,
      columns: { ...spec.columns },
      ...(spec.indexes ? { indexes: [...spec.indexes] } : {}),
    };
  }

  getColumns(tableName: string): Record<string, ColumnSpec> | null {
    if (typeof tableName !== "string" || tableName.trim() === "") return null;
    const spec = TABLES[tableName];
    return spec ? { ...spec.columns } : null;
  }

  /**
   * Generate a CREATE TABLE SQL statement for the named table in the given
   * dialect. Returns null on unknown table OR unknown dialect. Never throws.
   *
   * Dialect-specific notes:
   *   - sqlserver: NVARCHAR(MAX) replaces VARCHAR, BINARY → VARBINARY(MAX),
   *     AUTOINCREMENT → IDENTITY(1,1)
   *   - msaccess: VARCHAR has no length; BINARY → OLEOBJECT;
   *     AUTOINCREMENT → COUNTER
   *   - sqlite + mariadb: monolith-faithful generic types
   */
  generateCreateTableSql(tableName: string, dialect: SqlDialect): string | null {
    if (!SUPPORTED_DATABASES.includes(dialect)) return null;
    const table = this.getTable(tableName);
    if (!table) return null;

    const colLines: string[] = [];
    for (const [colName, col] of Object.entries(table.columns)) {
      const sqlType = this.mapType(col.type, dialect);
      const parts: string[] = [colName, sqlType];
      if (col.notNull) parts.push("NOT NULL");
      if (col.unique && !col.primaryKey) parts.push("UNIQUE");
      if (col.primaryKey) parts.push("PRIMARY KEY");
      if (col.autoIncrement) parts.push(this.autoIncrementKeyword(dialect));
      colLines.push("  " + parts.join(" "));
    }

    return `CREATE TABLE ${tableName} (\n${colLines.join(",\n")}\n);`;
  }

  stats(): {
    schemaVersion: string;
    schemaSource: string;
    supportedDatabases: string[];
    tableCount: number;
    columnCount: number;
    indexCount: number;
  } {
    let cols = 0, idx = 0;
    for (const spec of Object.values(TABLES)) {
      cols += Object.keys(spec.columns).length;
      idx += spec.indexes?.length ?? 0;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      schemaSource: SCHEMA_SOURCE,
      supportedDatabases: [...SUPPORTED_DATABASES],
      tableCount: Object.keys(TABLES).length,
      columnCount: cols,
      indexCount: idx,
    };
  }

  // --- internals ---

  private mapType(type: string, dialect: SqlDialect): string {
    if (dialect === "sqlserver") {
      if (type === "VARCHAR")          return "NVARCHAR(MAX)";
      if (type === "BINARY")           return "VARBINARY(MAX)";
      if (type === "DOUBLE PRECISION") return "FLOAT";
      return type;
    }
    if (dialect === "msaccess") {
      if (type === "VARCHAR")          return "TEXT";
      if (type === "BINARY")           return "OLEOBJECT";
      if (type.startsWith("CHAR("))    return "TEXT";
      if (type === "DOUBLE PRECISION") return "DOUBLE";
      if (type === "SMALLINT")         return "INTEGER";
      return type;
    }
    // sqlite + mariadb: monolith-faithful types pass through
    return type;
  }

  private autoIncrementKeyword(dialect: SqlDialect): string {
    if (dialect === "sqlite")    return "AUTOINCREMENT";
    if (dialect === "mariadb")   return "AUTO_INCREMENT";
    if (dialect === "sqlserver") return "IDENTITY(1,1)";
    if (dialect === "msaccess")  return "COUNTER";
    return "AUTOINCREMENT";
  }
}

export const monolithMacroDatabaseSchemaEngine = new MonolithMacroDatabaseSchemaEngine();
