/**
 * JSONSchemaValidatorEngine tests — HCAP05.
 */
import { describe, it, expect } from "vitest";
import { JSONSchemaValidatorEngine, type SchemaSpec } from "../engines/JSONSchemaValidatorEngine.js";

describe("JSONSchemaValidatorEngine.validate — primitives", () => {
  it("string payload against type:string → valid", () => {
    expect(JSONSchemaValidatorEngine.validate({ type: "string" }, "hi").valid).toBe(true);
  });

  it("number payload against type:string → invalid with type error", () => {
    const r = JSONSchemaValidatorEngine.validate({ type: "string" }, 42);
    expect(r.valid).toBe(false);
    expect(r.errors[0].reason).toContain("expected type string");
  });

  it("null payload against type:null → valid (null distinguished from object)", () => {
    expect(JSONSchemaValidatorEngine.validate({ type: "null" }, null).valid).toBe(true);
  });

  it("array payload against type:array → valid (Array distinguished from object)", () => {
    expect(JSONSchemaValidatorEngine.validate({ type: "array" }, [1, 2, 3]).valid).toBe(true);
  });
});

describe("JSONSchemaValidatorEngine.validate — constraints", () => {
  it("string shorter than minLength → invalid", () => {
    const r = JSONSchemaValidatorEngine.validate({ type: "string", minLength: 5 }, "hi");
    expect(r.valid).toBe(false);
    expect(r.errors[0].reason).toContain("minLength");
  });

  it("string longer than maxLength → invalid", () => {
    const r = JSONSchemaValidatorEngine.validate({ type: "string", maxLength: 2 }, "hello");
    expect(r.valid).toBe(false);
  });

  it("number below minimum → invalid", () => {
    const r = JSONSchemaValidatorEngine.validate({ type: "number", minimum: 10 }, 5);
    expect(r.valid).toBe(false);
    expect(r.errors[0].reason).toContain("minimum 10");
  });

  it("number above maximum → invalid", () => {
    const r = JSONSchemaValidatorEngine.validate({ type: "number", maximum: 100 }, 200);
    expect(r.valid).toBe(false);
  });

  it("value not in enum → invalid", () => {
    const r = JSONSchemaValidatorEngine.validate({ enum: ["a", "b"] }, "c");
    expect(r.valid).toBe(false);
    expect(r.errors[0].reason).toContain("enum");
  });

  it("string matching pattern → valid", () => {
    expect(JSONSchemaValidatorEngine.validate({ type: "string", pattern: "^abc" }, "abcdef").valid).toBe(true);
  });
});

describe("JSONSchemaValidatorEngine.validate — nested object", () => {
  const spec: SchemaSpec = {
    type: "object",
    required: ["name", "qty"],
    properties: {
      name: { type: "string", minLength: 1 },
      qty: { type: "number", minimum: 0 },
    },
  };

  it("valid object with all required props passes", () => {
    expect(JSONSchemaValidatorEngine.validate(spec, { name: "widget", qty: 5 }).valid).toBe(true);
  });

  it("missing required prop produces path-qualified error", () => {
    const r = JSONSchemaValidatorEngine.validate(spec, { name: "widget" });
    expect(r.valid).toBe(false);
    expect(r.errors[0].path).toBe("$.qty");
  });

  it("nested validation fires when prop type is wrong", () => {
    const r = JSONSchemaValidatorEngine.validate(spec, { name: "widget", qty: -1 });
    expect(r.valid).toBe(false);
    expect(r.errors[0].path).toBe("$.qty");
    expect(r.errors[0].reason).toContain("minimum");
  });
});

describe("JSONSchemaValidatorEngine.validate — adversarial", () => {
  it("invalid pattern regex produces error (does not throw)", () => {
    const r = JSONSchemaValidatorEngine.validate({ type: "string", pattern: "[invalid" }, "abc");
    expect(r.valid).toBe(false);
    expect(r.errors[0].reason).toContain("invalid pattern");
  });

  it("renderResult [SCHEMA OK] on valid, [SCHEMA INVALID] on invalid", () => {
    const okMd = JSONSchemaValidatorEngine.renderResult(JSONSchemaValidatorEngine.validate({}, 1));
    expect(okMd).toBe("[SCHEMA OK] no errors");
    const errMd = JSONSchemaValidatorEngine.renderResult(JSONSchemaValidatorEngine.validate({ type: "string" }, 1));
    expect(errMd.includes("[SCHEMA INVALID]")).toBe(true);
  });
});
