/**
 * SQLQueryStructureEngine — HCAP12 SQL query structural classifier.
 *
 * Pure-core: lexical/structural classifier over raw SQL — does NOT run the
 * query, does NOT parse to a full AST.  Detects operation kind (SELECT/
 * INSERT/UPDATE/DELETE/DDL/TX-CONTROL) + table references + risk flags
 * (DROP/TRUNCATE/unfiltered DELETE/UPDATE).
 *
 * @module engines/SQLQueryStructureEngine
 */

import { z } from "zod";

export const SQLOperationSchema = z.enum([
  "select", "insert", "update", "delete", "ddl", "tx-control", "other",
]);
export type SQLOperation = z.infer<typeof SQLOperationSchema>;

export const SQLRiskLevelSchema = z.enum(["safe", "caution", "danger"]);
export type SQLRiskLevel = z.infer<typeof SQLRiskLevelSchema>;

export interface SQLQueryStructure {
  query_id: string;
  operation: SQLOperation;
  tables: string[];
  risk_level: SQLRiskLevel;
  risk_reasons: string[];
  has_where: boolean;
  has_limit: boolean;
  byte_length: number;
}

const KW_RE = /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE|DROP|ALTER|TRUNCATE|BEGIN|COMMIT|ROLLBACK)\b/i;
const FROM_RE = /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi;
const INTO_RE = /\bINTO\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi;
const UPDATE_RE = /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi;
const WHERE_RE = /\bWHERE\b/i;
const LIMIT_RE = /\bLIMIT\b/i;
const DROP_RE = /\b(DROP|TRUNCATE)\b/i;

function classify(sql: string): SQLOperation {
  const m = sql.match(KW_RE);
  if (!m) return "other";
  const kw = m[1].toUpperCase().replace(/\s+/g, " ");
  if (kw.startsWith("SELECT")) return "select";
  if (kw.startsWith("INSERT")) return "insert";
  if (kw === "UPDATE") return "update";
  if (kw.startsWith("DELETE")) return "delete";
  if (["CREATE", "DROP", "ALTER", "TRUNCATE"].includes(kw)) return "ddl";
  if (["BEGIN", "COMMIT", "ROLLBACK"].includes(kw)) return "tx-control";
  return "other";
}

function extractTables(sql: string): string[] {
  const out = new Set<string>();
  for (const re of [FROM_RE, INTO_RE, UPDATE_RE]) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(sql)) !== null) out.add(m[1]);
  }
  return [...out].sort();
}

export class SQLQueryStructureEngine {
  static analyze(query_id: string, sql: string): SQLQueryStructure {
    if (!query_id) throw new Error("SQLQueryStructure.analyze: query_id required");
    if (typeof sql !== "string") throw new Error("SQLQueryStructure.analyze: sql must be a string");
    if (sql.length > 1_000_000) throw new Error("SQLQueryStructure.analyze: sql exceeds 1MB ceiling");
    const operation = classify(sql);
    const tables = extractTables(sql);
    const has_where = WHERE_RE.test(sql);
    const has_limit = LIMIT_RE.test(sql);
    const risk_reasons: string[] = [];
    if (DROP_RE.test(sql)) risk_reasons.push("contains DROP/TRUNCATE");
    if ((operation === "delete" || operation === "update") && !has_where) {
      risk_reasons.push(`${operation.toUpperCase()} without WHERE clause`);
    }
    let risk_level: SQLRiskLevel;
    if (risk_reasons.length === 0) risk_level = "safe";
    else if (risk_reasons.some((r) => r.includes("DROP") || r.includes("without WHERE"))) risk_level = "danger";
    else risk_level = "caution";
    return {
      query_id, operation, tables, risk_level, risk_reasons,
      has_where, has_limit, byte_length: sql.length,
    };
  }

  static renderStructure(s: SQLQueryStructure): string {
    return `[SQL ${s.risk_level.toUpperCase()}] ${s.query_id} ${s.operation} tables=[${s.tables.join(",")}] where=${s.has_where} limit=${s.has_limit}${s.risk_reasons.length ? ` | risks: ${s.risk_reasons.join("; ")}` : ""}`;
  }
}

export const sqlQueryStructureEngine = SQLQueryStructureEngine;
