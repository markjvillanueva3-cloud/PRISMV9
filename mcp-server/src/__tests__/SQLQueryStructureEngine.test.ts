/** SQLQueryStructureEngine tests — HCAP12. */
import { describe, it, expect } from "vitest";
import { SQLQueryStructureEngine } from "../engines/SQLQueryStructureEngine.js";

describe("SQLQueryStructureEngine.analyze — operation classification", () => {
  it("classifies SELECT as 'select'", () => {
    expect(SQLQueryStructureEngine.analyze("q", "SELECT * FROM users").operation).toBe("select");
  });

  it("classifies INSERT INTO as 'insert'", () => {
    expect(SQLQueryStructureEngine.analyze("q", "INSERT INTO users (id) VALUES (1)").operation).toBe("insert");
  });

  it("classifies UPDATE as 'update'", () => {
    expect(SQLQueryStructureEngine.analyze("q", "UPDATE users SET x=1 WHERE id=2").operation).toBe("update");
  });

  it("classifies DELETE FROM as 'delete'", () => {
    expect(SQLQueryStructureEngine.analyze("q", "DELETE FROM users WHERE id=1").operation).toBe("delete");
  });

  it("classifies CREATE/DROP/ALTER as 'ddl'", () => {
    expect(SQLQueryStructureEngine.analyze("q", "DROP TABLE users").operation).toBe("ddl");
    expect(SQLQueryStructureEngine.analyze("q", "CREATE TABLE x (id INT)").operation).toBe("ddl");
  });

  it("classifies BEGIN/COMMIT as 'tx-control'", () => {
    expect(SQLQueryStructureEngine.analyze("q", "BEGIN").operation).toBe("tx-control");
    expect(SQLQueryStructureEngine.analyze("q", "COMMIT").operation).toBe("tx-control");
  });
});

describe("SQLQueryStructureEngine.analyze — risk classification", () => {
  it("DELETE without WHERE → risk=danger", () => {
    const s = SQLQueryStructureEngine.analyze("q", "DELETE FROM users");
    expect(s.risk_level).toBe("danger");
    expect(s.risk_reasons[0]).toContain("WHERE");
  });

  it("UPDATE without WHERE → risk=danger", () => {
    const s = SQLQueryStructureEngine.analyze("q", "UPDATE users SET x=1");
    expect(s.risk_level).toBe("danger");
  });

  it("DROP TABLE → risk=danger", () => {
    expect(SQLQueryStructureEngine.analyze("q", "DROP TABLE users").risk_level).toBe("danger");
  });

  it("SELECT * FROM users → risk=safe", () => {
    expect(SQLQueryStructureEngine.analyze("q", "SELECT * FROM users").risk_level).toBe("safe");
  });
});

describe("SQLQueryStructureEngine.analyze — table extraction + adversarial", () => {
  it("extracts table from FROM clause", () => {
    expect(SQLQueryStructureEngine.analyze("q", "SELECT id FROM orders").tables).toEqual(["orders"]);
  });

  it("extracts table from INSERT INTO", () => {
    expect(SQLQueryStructureEngine.analyze("q", "INSERT INTO orders VALUES(1)").tables).toEqual(["orders"]);
  });

  it("throws on empty query_id", () => {
    expect(() => SQLQueryStructureEngine.analyze("", "SELECT 1")).toThrow();
  });

  it("throws on non-string sql", () => {
    expect(() => SQLQueryStructureEngine.analyze("q", 42 as never)).toThrow();
  });

  it("rejects oversized sql (>1MB)", () => {
    const huge = "SELECT 1 ".repeat(200_000);
    expect(() => SQLQueryStructureEngine.analyze("q", huge)).toThrow();
  });

  it("renderStructure includes risk + operation + tables", () => {
    const md = SQLQueryStructureEngine.renderStructure(
      SQLQueryStructureEngine.analyze("q1", "DELETE FROM users"),
    );
    expect(md.includes("[SQL DANGER]")).toBe(true);
    expect(md.includes("delete")).toBe(true);
    expect(md.includes("users")).toBe(true);
  });
});
