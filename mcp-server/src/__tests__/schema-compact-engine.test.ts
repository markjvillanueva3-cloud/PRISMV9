import { describe, it, expect } from "vitest";
import { SchemaCompactEngine } from "../engines/SchemaCompactEngine.js";

describe("SchemaCompactEngine", () => {
  const engine = new SchemaCompactEngine();

  describe("compact", () => {
    it("removes descriptions", () => {
      const schema = {
        type: "object",
        description: "A user object",
        properties: {
          name: { type: "string", description: "User's name" },
          age: { type: "number", description: "User's age" },
        },
      };
      const result = engine.compact(schema);
      expect(JSON.stringify(result)).not.toContain("description");
    });

    it("removes $schema and $id", () => {
      const schema = { $schema: "http://json-schema.org/draft-07/schema#", $id: "user", type: "object" };
      const result = engine.compact(schema);
      expect(result).not.toHaveProperty("$schema");
      expect(result).not.toHaveProperty("$id");
    });

    it("removes examples and defaults", () => {
      const schema = { type: "string", examples: ["foo", "bar"], default: "foo" };
      const result = engine.compact(schema);
      expect(result).not.toHaveProperty("examples");
      expect(result).not.toHaveProperty("default");
    });

    it("preserves required fields", () => {
      const schema = { type: "object", required: ["name"], properties: { name: { type: "string" } } };
      const result = engine.compact(schema);
      expect(result).toHaveProperty("required");
    });
  });

  describe("compactWithStats", () => {
    it("calculates savings", () => {
      const schema = {
        type: "object",
        description: "A very long description that wastes many tokens in the context window",
        title: "UserSchema",
        properties: {
          name: { type: "string", description: "The user name field", examples: ["Alice"] },
          email: { type: "string", description: "The email address", default: "a@b.com" },
        },
      };
      const r = engine.compactWithStats(schema);
      expect(r.savings).toBeGreaterThan(0);
      expect(r.savingsPercent).toBeGreaterThan(20);
    });
  });

  describe("toTypeSignature", () => {
    it("converts simple types", () => {
      expect(engine.toTypeSignature({ type: "string" })).toBe("string");
      expect(engine.toTypeSignature({ type: "number" })).toBe("number");
      expect(engine.toTypeSignature({ type: "boolean" })).toBe("boolean");
    });

    it("converts enums", () => {
      const sig = engine.toTypeSignature({ type: "string", enum: ["a", "b", "c"] });
      expect(sig).toBe('"a"|"b"|"c"');
    });

    it("converts arrays", () => {
      const sig = engine.toTypeSignature({ type: "array", items: { type: "string" } });
      expect(sig).toBe("string[]");
    });

    it("converts objects", () => {
      const sig = engine.toTypeSignature({
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      });
      expect(sig).toContain("name: string");
      expect(sig).toContain("age?: number");
    });

    it("converts union types", () => {
      const sig = engine.toTypeSignature({ oneOf: [{ type: "string" }, { type: "number" }] });
      expect(sig).toBe("string | number");
    });
  });

  describe("compactAll", () => {
    it("compacts multiple schemas", () => {
      const schemas = [
        { name: "user", schema: { type: "object", description: "user" } },
        { name: "post", schema: { type: "object", description: "post" } },
      ];
      const result = engine.compactAll(schemas);
      expect(result.length).toBe(2);
      expect(result[0].compact).not.toContain("description");
    });
  });

  describe("oneLiner", () => {
    it("reports savings", () => {
      const schema = { type: "object", description: "long desc here", title: "T" };
      const line = engine.oneLiner(schema);
      expect(line).toContain("→");
      expect(line).toContain("saved");
    });
  });
});
