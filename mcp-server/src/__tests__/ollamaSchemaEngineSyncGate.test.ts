// Origin: prism-intel-p8 :: de60c11be · Merged via INTEL-OLLAMA-OBSIDIAN-MS0/P16-U03-TESTS · U-AF07 schema sync gate (P16-U03-1)
/**
 * ollama-schema-engine-sync-gate — synthetic-input tests for U-AF07.
 *
 * Tests the 4 pure functions exposed for the schema-sync gate hook:
 *   - isSchemaSourceFile(path) — schema-file detection
 *   - extractZodEnumsFromSchema(src) — regex-based Zod enum extractor
 *   - diffSchemaVsEngineEnums(schemaEnums, engineEnums) — drift comparison
 *   - decideSchemaSyncGate(input) — 8-branch decision
 *
 * The U-WIRE13 killer (part 2 of 2). U-AF06 caches engine contracts;
 * this gate compares proposed Zod schemas against those cached enums
 * and BLOCKS the schema edit on enum drift.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF07
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure logic from .mjs lib (no shebang, vitest-safe)
import {
  isSchemaSourceFile,
  extractZodEnumsFromSchema,
  diffSchemaVsEngineEnums,
  decideSchemaSyncGate,
} from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

describe("U-AF07 isSchemaSourceFile", () => {
  it("matches conventional schema paths", () => {
    expect(isSchemaSourceFile("H:/prism/mcp-server/src/schemas/aiReasoningActionSchemas.ts")).toBe(true);
    expect(isSchemaSourceFile("src/schemas/camDispatcherSchemas.ts")).toBe(true);
    expect(isSchemaSourceFile("/abs/src/schemas/Foo.ts")).toBe(true);
  });

  it("matches Windows backslash paths", () => {
    expect(isSchemaSourceFile("H:\\prism\\src\\schemas\\foo.ts")).toBe(true);
  });

  it("rejects non-schema source files", () => {
    expect(isSchemaSourceFile("src/engines/Foo.ts")).toBe(false);
    expect(isSchemaSourceFile("src/dispatchers/foo.ts")).toBe(false);
    // Regex anchors on `schemas/<name>.ts` directly — subdirs and dotted suffixes don't match.
    expect(isSchemaSourceFile("src/schemas/sub/foo.ts")).toBe(false);
    expect(isSchemaSourceFile("src/schemas/foo.test.ts")).toBe(false);
    expect(isSchemaSourceFile("Foo.ts")).toBe(false);
  });

  it("rejects non-string / empty input", () => {
    expect(isSchemaSourceFile("")).toBe(false);
    expect(isSchemaSourceFile(null)).toBe(false);
    expect(isSchemaSourceFile(undefined)).toBe(false);
    expect(isSchemaSourceFile(42)).toBe(false);
  });
});

describe("U-AF07 extractZodEnumsFromSchema", () => {
  it("extracts a simple anonymous z.enum", () => {
    const src = `const action = z.enum(["a", "b", "c"]);`;
    const r = extractZodEnumsFromSchema(src);
    expect(r).toHaveLength(1);
    expect(r[0].values).toEqual(["a", "b", "c"]);
  });

  it("captures the field name when used as object property", () => {
    const src = `
      const Schema = z.object({
        material: z.enum(["steel", "aluminum"]),
        tool: z.enum(["endmill", "drill", "facemill"]),
      });
    `;
    const r = extractZodEnumsFromSchema(src);
    expect(r).toHaveLength(2);
    const fields = r.map((e: { field: string }) => e.field);
    expect(fields).toContain("material");
    expect(fields).toContain("tool");
    const material = r.find((e: { field: string }) => e.field === "material")!;
    expect(material.values).toEqual(["steel", "aluminum"]);
  });

  it("supports single quotes and backticks", () => {
    const src = `z.enum(['a', 'b']) z.enum([\`x\`, \`y\`])`;
    const r = extractZodEnumsFromSchema(src);
    expect(r).toHaveLength(2);
    expect(r[0].values).toEqual(["a", "b"]);
    expect(r[1].values).toEqual(["x", "y"]);
  });

  it("includes a lineHint number", () => {
    const src = "line1\nline2\nfoo: z.enum([\"x\"])\nline4";
    const r = extractZodEnumsFromSchema(src);
    expect(r[0].lineHint).toBe(3);
  });

  it("ignores empty z.enum (no literals)", () => {
    const src = `const a = z.enum([]);`;
    const r = extractZodEnumsFromSchema(src);
    expect(r).toHaveLength(0);
  });

  it("returns empty array for non-string / empty input", () => {
    expect(extractZodEnumsFromSchema("")).toEqual([]);
    expect(extractZodEnumsFromSchema(null)).toEqual([]);
    expect(extractZodEnumsFromSchema(undefined)).toEqual([]);
    expect(extractZodEnumsFromSchema(42)).toEqual([]);
  });

  it("handles multiple z.enums in one file", () => {
    const src = `
      const a = z.enum(["one"]);
      const b = z.enum(["two", "three"]);
      const c = z.enum(["four", "five", "six"]);
    `;
    const r = extractZodEnumsFromSchema(src);
    expect(r).toHaveLength(3);
    expect(r.map((e: { values: string[] }) => e.values.length)).toEqual([1, 2, 3]);
  });
});

describe("U-AF07 diffSchemaVsEngineEnums", () => {
  it("returns empty drift when sets match exactly", () => {
    const schema = [{ field: "material", values: ["a", "b"] }];
    const engine = { material: ["a", "b"] };
    expect(diffSchemaVsEngineEnums(schema, engine)).toEqual([]);
  });

  it("treats set order as irrelevant", () => {
    const schema = [{ field: "material", values: ["b", "a"] }];
    const engine = { material: ["a", "b"] };
    expect(diffSchemaVsEngineEnums(schema, engine)).toEqual([]);
  });

  it("flags value present in schema but not engine (only_in_schema)", () => {
    const schema = [{ field: "material", values: ["a", "b", "ZZ"] }];
    const engine = { material: ["a", "b"] };
    const drifts = diffSchemaVsEngineEnums(schema, engine);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].only_in_schema).toEqual(["ZZ"]);
    expect(drifts[0].only_in_engine).toEqual([]);
  });

  it("flags value present in engine but not schema (only_in_engine)", () => {
    const schema = [{ field: "material", values: ["a"] }];
    const engine = { material: ["a", "b"] };
    const drifts = diffSchemaVsEngineEnums(schema, engine);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].only_in_engine).toEqual(["b"]);
  });

  it("flags drift in both directions on the same field", () => {
    const schema = [{ field: "material", values: ["a", "x"] }];
    const engine = { material: ["a", "b"] };
    const drifts = diffSchemaVsEngineEnums(schema, engine);
    expect(drifts[0].only_in_schema).toEqual(["x"]);
    expect(drifts[0].only_in_engine).toEqual(["b"]);
  });

  it("ignores schema enums whose field is not in engine cache (new field)", () => {
    const schema = [
      { field: "material", values: ["a"] },
      { field: "newField", values: ["xxx"] },
    ];
    const engine = { material: ["a"] };
    expect(diffSchemaVsEngineEnums(schema, engine)).toEqual([]);
  });

  it("ignores schema enums with null field (anonymous)", () => {
    const schema = [{ field: null, values: ["a", "b"] }];
    const engine = { material: ["a", "b"] };
    expect(diffSchemaVsEngineEnums(schema, engine)).toEqual([]);
  });

  it("preserves line_hint in drift output", () => {
    const schema = [{ field: "material", values: ["a", "x"], lineHint: 42 }];
    const engine = { material: ["a"] };
    const drifts = diffSchemaVsEngineEnums(schema, engine);
    expect(drifts[0].line_hint).toBe(42);
  });

  it("handles multi-field drift correctly", () => {
    const schema = [
      { field: "material", values: ["a"] },
      { field: "tool", values: ["x", "y"] },
    ];
    const engine = { material: ["a", "b"], tool: ["x", "z"] };
    const drifts = diffSchemaVsEngineEnums(schema, engine);
    expect(drifts).toHaveLength(2);
  });

  it("treats null/undefined inputs as empty", () => {
    expect(diffSchemaVsEngineEnums(null, null)).toEqual([]);
    expect(diffSchemaVsEngineEnums(undefined, undefined)).toEqual([]);
    expect(diffSchemaVsEngineEnums([], {})).toEqual([]);
  });
});

describe("U-AF07 decideSchemaSyncGate", () => {
  const validCache = {
    entries: {
      "src/engines/AwarenessEngine.ts": {
        extracted_at: "2026-04-29T09:00:00.000Z",
        contract: { enums: { material: ["steel", "aluminum"] } },
      },
    },
  };

  describe("non-schema files", () => {
    it("does NOT block on engine source file", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/engines/Foo.ts",
        proposedSrc: 'z.enum(["a"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("not-a-schema-file");
    });

    it("does NOT block on README", () => {
      const r = decideSchemaSyncGate({
        filePath: "README.md",
        proposedSrc: "anything",
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("not-a-schema-file");
    });
  });

  describe("autonomy gate", () => {
    it("does NOT block in non-autonomous mode (manual review owns it)", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["totally", "wrong"])',
        isAutonomous: false,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("override switch", () => {
    it("does NOT block when override flag is on", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["totally", "wrong"])',
        isAutonomous: true,
        overrideEnabled: true,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("override-active");
    });
  });

  describe("missing inputs (fail-OPEN)", () => {
    it("does NOT block on empty proposedSrc", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: "",
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-content");
    });

    it("does NOT block on missing cache (Ollama hasn't run yet)", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'z.enum(["a"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: null,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-cache");
    });

    it("does NOT block on cache with no entries field", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'z.enum(["a"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: { schemaVersion: "1.0.0" },
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-cache");
    });

    it("does NOT block when proposedSrc has no Zod enums (TS types only)", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: "export type Foo = string;\nexport const Bar = 1;",
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-schema-enums");
    });

    it("does NOT block when no engine in cache has any enums", () => {
      const cacheNoEnums = {
        entries: {
          "src/engines/X.ts": {
            extracted_at: "2026-04-29T09:00:00.000Z",
            contract: { enums: {} },
          },
        },
      };
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["a"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: cacheNoEnums,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-engine-enums-cached");
    });
  });

  describe("happy path (no drift)", () => {
    it("does NOT block when schema enums match engine cache exactly", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["steel", "aluminum"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-drift");
      expect(r.schema_enum_count).toBe(1);
      expect(r.compared_engine_enum_count).toBe(1);
    });

    it("does NOT block when schema field is not in any engine enum", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'newField: z.enum(["x", "y"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-drift");
    });
  });

  describe("drift detection (BLOCK paths)", () => {
    it("BLOCKS when schema adds a value not in engine", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["steel", "aluminum", "INVENTED"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.reason).toBe("enum-drift");
      expect(r.drift_count).toBe(1);
      expect(r.drifts[0].field).toBe("material");
      expect(r.drifts[0].only_in_schema).toEqual(["INVENTED"]);
    });

    it("BLOCKS when schema drops a value the engine still emits", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["steel"])', // missing aluminum
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(false);
      expect(r.drifts[0].only_in_engine).toEqual(["aluminum"]);
    });

    it("BLOCKS with multi-field drift report", () => {
      const cache2 = {
        entries: {
          "src/engines/X.ts": {
            extracted_at: "2026-04-29T09:00:00.000Z",
            contract: {
              enums: { material: ["a", "b"], tool: ["x", "y"] },
            },
          },
        },
      };
      const src =
        'material: z.enum(["a", "WRONG"]),\n' +
        'tool: z.enum(["x", "z"])';
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: src,
        isAutonomous: true,
        overrideEnabled: false,
        cache: cache2,
      });
      expect(r.continue).toBe(false);
      expect(r.drift_count).toBe(2);
    });

    it("aggregates enums across multiple engines in cache", () => {
      const cache3 = {
        entries: {
          "src/engines/A.ts": {
            extracted_at: "2026-04-29T09:00:00.000Z",
            contract: { enums: { material: ["steel"] } },
          },
          "src/engines/B.ts": {
            extracted_at: "2026-04-29T09:00:00.000Z",
            contract: { enums: { tool: ["drill"] } },
          },
        },
      };
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'tool: z.enum(["drill", "EXTRA"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: cache3,
      });
      expect(r.continue).toBe(false);
      expect(r.drifts[0].field).toBe("tool");
      expect(r.drifts[0].only_in_schema).toEqual(["EXTRA"]);
    });

    it("respects relatedEngines filter", () => {
      const cache4 = {
        entries: {
          "src/engines/A.ts": {
            extracted_at: "2026-04-29T09:00:00.000Z",
            contract: { enums: { material: ["steel"] } },
          },
          "src/engines/B.ts": {
            extracted_at: "2026-04-29T09:00:00.000Z",
            contract: { enums: { material: ["aluminum"] } },
          },
        },
      };
      // relatedEngines points only to A.ts → "aluminum" is unknown to A
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["steel", "aluminum"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: cache4,
        relatedEngines: ["src/engines/A.ts"],
      });
      expect(r.continue).toBe(false);
      expect(r.drifts[0].only_in_schema).toEqual(["aluminum"]);
    });
  });

  describe("contract guarantees", () => {
    it("never blocks when isAutonomous=false (off-switch)", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["totally", "wrong"])',
        isAutonomous: false,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
    });

    it("never blocks when overrideEnabled=true (escape hatch)", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["totally", "wrong"])',
        isAutonomous: true,
        overrideEnabled: true,
        cache: validCache,
      });
      expect(r.continue).toBe(true);
    });

    it("BLOCK output always includes drifts array and drift_count", () => {
      const r = decideSchemaSyncGate({
        filePath: "src/schemas/foo.ts",
        proposedSrc: 'material: z.enum(["WRONG"])',
        isAutonomous: true,
        overrideEnabled: false,
        cache: validCache,
      });
      expect(r.continue).toBe(false);
      expect(Array.isArray(r.drifts)).toBe(true);
      expect(typeof r.drift_count).toBe("number");
    });
  });
});
