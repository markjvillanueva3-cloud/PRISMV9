/**
 * Tests for Database Connection & Schema — DQ-MS0
 */
import { describe, it, expect } from "vitest";
import { DatabaseConnection } from "../db/connection.js";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("DatabaseConnection", () => {
  it("creates instance without error", () => {
    const db = new DatabaseConnection();
    expect(db).toBeDefined();
    expect(db.isConnected()).toBe(false);
  });

  it("connect returns false when no DATABASE_URL set", async () => {
    const db = new DatabaseConnection({ connectionString: undefined });
    const result = await db.connect();
    expect(result).toBe(false);
    expect(db.isConnected()).toBe(false);
  });

  it("query returns empty result when not connected", async () => {
    const db = new DatabaseConnection();
    const result = await db.query("SELECT 1");
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it("transaction throws when not connected", async () => {
    const db = new DatabaseConnection();
    await expect(db.transaction(async () => {})).rejects.toThrow("Database not connected");
  });

  it("close is safe when not connected", async () => {
    const db = new DatabaseConnection();
    await expect(db.close()).resolves.not.toThrow();
  });
});

describe("Database Schema", () => {
  it("schema.sql file exists and contains expected tables", () => {
    const schemaPath = resolve(__dirname, "../db/schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    // Core tables
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS api_keys");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS materials");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS machines");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS customers");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS quotes");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS quote_line_items");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS jobs");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS tools");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS audit_log");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS safety_scores");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS schema_migrations");
  });

  it("schema has proper indexes", () => {
    const schemaPath = resolve(__dirname, "../db/schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    expect(schema).toContain("idx_materials_iso");
    expect(schema).toContain("idx_jobs_status");
    expect(schema).toContain("idx_tools_manufacturer");
    expect(schema).toContain("idx_audit_timestamp");
    expect(schema).toContain("idx_safety_job");
  });

  it("schema has role constraints", () => {
    const schemaPath = resolve(__dirname, "../db/schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    expect(schema).toContain("'admin'");
    expect(schema).toContain("'engineer'");
    expect(schema).toContain("'operator'");
    expect(schema).toContain("'viewer'");
  });
});
