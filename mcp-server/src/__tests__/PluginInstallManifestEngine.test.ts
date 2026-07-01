/** PluginInstallManifestEngine tests — HMPI09. */
import { describe, it, expect } from "vitest";
import {
  PluginInstallManifestEngine,
  type PluginInstallManifest,
} from "../engines/PluginInstallManifestEngine.js";

const mk = (over: Partial<PluginInstallManifest> = {}): PluginInstallManifest => ({
  plugin_id: "xlsx-reader",
  version: "1.0.0",
  entry: "./index.js",
  declared_capabilities: ["excel-read"],
  declared_mcp_servers: [],
  peer_deps: [],
  ...over,
});

describe("PluginInstallManifestEngine.check — happy", () => {
  it("valid manifest → valid=true, zero errors", () => {
    const v = PluginInstallManifestEngine.check(mk());
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it("renderValidation [MANIFEST OK] on valid", () => {
    const md = PluginInstallManifestEngine.renderValidation(PluginInstallManifestEngine.check(mk()));
    expect(md.includes("[MANIFEST OK]")).toBe(true);
  });
});

describe("PluginInstallManifestEngine.check — error cases", () => {
  it("duplicate declared_capabilities → error", () => {
    const v = PluginInstallManifestEngine.check(mk({ declared_capabilities: ["a", "a", "b"] }));
    expect(v.valid).toBe(false);
    expect(v.errors[0]).toContain("capabilities");
  });

  it("duplicate declared_mcp_servers → error", () => {
    const v = PluginInstallManifestEngine.check(mk({ declared_mcp_servers: ["s", "s"] }));
    expect(v.valid).toBe(false);
  });

  it("duplicate peer_deps → error", () => {
    const v = PluginInstallManifestEngine.check(mk({ peer_deps: ["x", "x"] }));
    expect(v.valid).toBe(false);
  });

  it("self-circular peer_dep → error", () => {
    const v = PluginInstallManifestEngine.check(mk({ peer_deps: ["xlsx-reader"] }));
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("self-circular"))).toBe(true);
  });

  it("empty declared_capabilities → warning (not error)", () => {
    const v = PluginInstallManifestEngine.check(mk({ declared_capabilities: [] }));
    expect(v.valid).toBe(true);
    expect(v.warnings.some((w) => w.includes("no declared"))).toBe(true);
  });

  it("pre-release version → warning", () => {
    const v = PluginInstallManifestEngine.check(mk({ version: "1.0.0-beta.1" }));
    expect(v.valid).toBe(true);
    expect(v.warnings.some((w) => w.includes("pre-release"))).toBe(true);
  });
});

describe("PluginInstallManifestEngine — schema rejection", () => {
  it("rejects non-semver version (zod regex)", () => {
    expect(() => PluginInstallManifestEngine.check(mk({ version: "not-a-version" }))).toThrow();
  });

  it("rejects empty plugin_id", () => {
    expect(() => PluginInstallManifestEngine.check(mk({ plugin_id: "" }))).toThrow();
  });

  it("isPrerelease returns true for x-y-z-tag versions", () => {
    expect(PluginInstallManifestEngine.isPrerelease("1.0.0-rc.1")).toBe(true);
    expect(PluginInstallManifestEngine.isPrerelease("1.0.0")).toBe(false);
  });

  it("renderValidation shows errors when invalid", () => {
    const md = PluginInstallManifestEngine.renderValidation(
      PluginInstallManifestEngine.check(mk({ declared_capabilities: ["x", "x"] })),
    );
    expect(md.includes("[MANIFEST INVALID]")).toBe(true);
    expect(md.includes("errors")).toBe(true);
  });
});
