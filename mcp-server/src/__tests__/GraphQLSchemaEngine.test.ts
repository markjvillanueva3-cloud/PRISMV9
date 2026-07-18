/** GraphQLSchemaEngine tests — HCAP13. */
import { describe, it, expect } from "vitest";
import { GraphQLSchemaEngine, type GraphQLTypeDef } from "../engines/GraphQLSchemaEngine.js";

const types: GraphQLTypeDef[] = [
  { name: "Query", kind: "query", fields: [
    { name: "user", return_type: "User", required: true, arg_count: 1 },
    { name: "orders", return_type: "[Order]", required: false, arg_count: 0 },
  ] },
  { name: "Mutation", kind: "mutation", fields: [
    { name: "createUser", return_type: "User", required: true, arg_count: 2 },
  ] },
  { name: "User", kind: "type", fields: [
    { name: "id", return_type: "ID", required: true, arg_count: 0 },
    { name: "name", return_type: "String", required: true, arg_count: 0 },
  ] },
];

describe("GraphQLSchemaEngine.analyze", () => {
  it("counts types exactly", () => {
    expect(GraphQLSchemaEngine.analyze("s1", types).type_count).toBe(3);
  });

  it("sums field_count across all types", () => {
    expect(GraphQLSchemaEngine.analyze("s1", types).field_count).toBe(5);
  });

  it("isolates query_field_count + mutation_field_count", () => {
    const s = GraphQLSchemaEngine.analyze("s1", types);
    expect(s.query_field_count).toBe(2);
    expect(s.mutation_field_count).toBe(1);
  });

  it("by_kind counts type kinds exactly", () => {
    const s = GraphQLSchemaEngine.analyze("s1", types);
    expect(s.by_kind.query).toBe(1);
    expect(s.by_kind.mutation).toBe(1);
    expect(s.by_kind.type).toBe(1);
  });

  it("rejects empty schema_id", () => {
    expect(() => GraphQLSchemaEngine.analyze("", types)).toThrow();
  });

  it("rejects non-array types", () => {
    expect(() => GraphQLSchemaEngine.analyze("s1", null as never)).toThrow();
  });

  it("rejects unknown kind enum", () => {
    expect(() => GraphQLSchemaEngine.analyze("s1", [{ name: "X", kind: "yolo" as never, fields: [] }])).toThrow();
  });

  it("rejects empty type name", () => {
    expect(() => GraphQLSchemaEngine.analyze("s1", [{ name: "", kind: "type", fields: [] }])).toThrow();
  });

  it("handles empty types array → all zeros", () => {
    const s = GraphQLSchemaEngine.analyze("s1", []);
    expect(s.type_count).toBe(0);
    expect(s.field_count).toBe(0);
  });

  it("renderStructure includes schema id + counts", () => {
    const md = GraphQLSchemaEngine.renderStructure(GraphQLSchemaEngine.analyze("s1", types));
    expect(md.includes("[GRAPHQL s1]")).toBe(true);
    expect(md.includes("types=3")).toBe(true);
    expect(md.includes("Q=2")).toBe(true);
    expect(md.includes("M=1")).toBe(true);
  });
});
