// WIRE-EXEMPT: tests for abstract base class used by all engines
/**
 * BaseEngine tests — abstract class contract verification
 */
import { describe, it, expect } from "vitest";
import { BaseEngine, type EngineInfo, type EngineCapability } from "../engines/BaseEngine.js";

class TestEngine extends BaseEngine {
  constructor() {
    super({ name: "TestEngine", version: "1.0.0", domain: "test", description: "Test" });
  }
  getCapabilities(): EngineCapability[] {
    return [{ name: "test", description: "Test capability" }];
  }
  validate(input: unknown): string | null {
    if (typeof input !== "object" || input === null) return "must be object";
    return null;
  }
  protected async executeImpl(input: unknown): Promise<unknown> {
    return { processed: true, input };
  }
}

describe("BaseEngine", () => {
  const engine = new TestEngine();

  it("getInfo returns engine metadata", () => {
    const info = engine.getInfo();
    expect(info.name).toBe("TestEngine");
    expect(info.version).toBe("1.0.0");
    expect(info.domain).toBe("test");
  });

  it("getCapabilities returns array", () => {
    const caps = engine.getCapabilities();
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it("validate returns null for valid input", () => {
    expect(engine.validate({})).toBeNull();
  });

  it("validate returns error for invalid input", () => {
    expect(engine.validate(null)).not.toBeNull();
    expect(engine.validate("string")).not.toBeNull();
  });

  it("execute calls executeImpl for valid input", async () => {
    const result = await engine.execute({ data: 1 });
    expect(result).toEqual({ processed: true, input: { data: 1 } });
  });

  it("execute throws for invalid input", async () => {
    await expect(engine.execute(null)).rejects.toThrow("Validation failed");
  });

  it("healthCheck returns healthy by default", async () => {
    const health = await engine.healthCheck();
    expect(health.healthy).toBe(true);
  });

  it("capability has name and description", () => {
    const caps = engine.getCapabilities();
    expect(caps[0].name).toBe("test");
    expect(caps[0].description).toBeDefined();
  });

  it("info has all required fields", () => {
    const info = engine.getInfo();
    expect(info).toHaveProperty("name");
    expect(info).toHaveProperty("version");
    expect(info).toHaveProperty("domain");
    expect(info).toHaveProperty("description");
  });

  it("version follows semver format", () => {
    const info = engine.getInfo();
    expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
