/**
 * ConfigEngine — companion test
 * ==============================
 * WIRE-UNWIRED-MS0/U-WIRE-CONFIG-ENGINE
 *
 * Verifies the prism_infra read-only surface (config_get / config_get_with_meta /
 * config_list / config_validate / config_export) by exercising the underlying
 * singleton's get / getWithMeta / getAll / getByPrefix / validate / exportConfig
 * methods.  Mutation surface (set / delete / import / loadDefaults / clear) is
 * NOT exposed via MCP — it is exercised here only to seed fixtures and verify
 * the priority + redaction invariants on the read surface.
 *
 * Every assertion compares against a concrete expected value (per PRISM R9).
 * No `.toBeDefined()` / `.toBeUndefined()` presence-only stubs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigEngine, configEngine, type ConfigEntry } from "../engines/ConfigEngine.js";

describe("ConfigEngine", () => {
  beforeEach(() => {
    // Reset singleton between tests so set/delete writes don't leak across
    // cases — keeps the suite vitest `--shuffle` safe.
    configEngine.clear();
  });

  describe("get / set — source priority resolution", () => {
    it("returns undefined for unset keys (read-safe default)", () => {
      const value = configEngine.get<string>("nonexistent.key");
      expect(value === undefined).toEqual(true);
      expect(configEngine.getAll().length).toEqual(0);
    });

    it("get() returns the highest-priority source value, ordered default<file<env<runtime<tenant", () => {
      // SOURCE_PRIORITY = default:0 < file:1 < env:2 < runtime:3 < tenant:4
      configEngine.set("API_KEY", "default-val", "default");
      expect(configEngine.get("API_KEY")).toEqual("default-val");
      configEngine.set("API_KEY", "file-val", "file");
      expect(configEngine.get("API_KEY")).toEqual("file-val");
      configEngine.set("API_KEY", "env-val", "env");
      expect(configEngine.get("API_KEY")).toEqual("env-val");
      configEngine.set("API_KEY", "runtime-val", "runtime");
      expect(configEngine.get("API_KEY")).toEqual("runtime-val");
      configEngine.set("API_KEY", "tenant-val", "tenant");
      expect(configEngine.get("API_KEY")).toEqual("tenant-val");
    });

    it("falls back to the next-highest source when the top one is deleted", () => {
      configEngine.set("API_KEY", "env-val", "env");
      configEngine.set("API_KEY", "runtime-val", "runtime");
      expect(configEngine.get("API_KEY")).toEqual("runtime-val");
      configEngine.delete("API_KEY", "runtime");
      expect(configEngine.get("API_KEY")).toEqual("env-val");
    });

    it("infers entry type='number' for numeric values", () => {
      configEngine.set("count", 42);
      expect(configEngine.getWithMeta("count")?.type).toEqual("number");
      expect(configEngine.get<number>("count")).toEqual(42);
    });

    it("infers entry type='boolean' for boolean values", () => {
      configEngine.set("flag", true);
      expect(configEngine.getWithMeta("flag")?.type).toEqual("boolean");
      expect(configEngine.get<boolean>("flag")).toEqual(true);
    });

    it("infers entry type='string' for string values", () => {
      configEngine.set("name", "alice");
      expect(configEngine.getWithMeta("name")?.type).toEqual("string");
      expect(configEngine.get<string>("name")).toEqual("alice");
    });

    it("infers entry type='json' for object values, preserving nested structure", () => {
      configEngine.set("blob", { a: 1, b: ["x", "y"], c: { deep: true } });
      const meta = configEngine.getWithMeta("blob");
      expect(meta?.type).toEqual("json");
      const value = configEngine.get<{ a: number; b: string[]; c: { deep: boolean } }>("blob");
      expect(value?.a).toEqual(1);
      expect(value?.b).toEqual(["x", "y"]);
      expect(value?.c.deep).toEqual(true);
    });
  });

  describe("getWithMeta — metadata exposure", () => {
    it("returns the full ConfigEntry: key, value, source, type, required, secret, description, parseable timestamp", () => {
      const before = Date.now();
      configEngine.set("DB_URL", "postgres://...", "env", {
        description: "Primary database",
        required: true,
        secret: false,
      });
      const after = Date.now();
      const meta = configEngine.getWithMeta("DB_URL");
      expect(meta?.key).toEqual("DB_URL");
      expect(meta?.value).toEqual("postgres://...");
      expect(meta?.source).toEqual("env");
      expect(meta?.type).toEqual("string");
      expect(meta?.required).toEqual(true);
      expect(meta?.secret).toEqual(false);
      expect(meta?.description).toEqual("Primary database");
      // Parseable ISO-8601 timestamp inside the .set() call window.
      const ts = Date.parse(meta?.updated_at ?? "");
      expect(Number.isFinite(ts)).toEqual(true);
      expect(ts >= before && ts <= after).toEqual(true);
    });

    it("returns undefined for unset keys (no exception)", () => {
      const meta = configEngine.getWithMeta("nope");
      expect(meta === undefined).toEqual(true);
    });

    it("defaults required=false and secret=false when meta is omitted", () => {
      configEngine.set("bare", 1);
      const meta = configEngine.getWithMeta("bare");
      expect(meta?.required).toEqual(false);
      expect(meta?.secret).toEqual(false);
    });
  });

  describe("getAll / getByPrefix — redaction + ordering invariants", () => {
    it("redacts secret values in getAll() while leaving non-secret values intact", () => {
      configEngine.set("SECRET_KEY", "p@ssw0rd", "env", { secret: true });
      configEngine.set("PUBLIC_NAME", "alice", "env", { secret: false });
      const entries = configEngine.getAll();
      const secret = entries.find((e) => e.key === "SECRET_KEY");
      const pub = entries.find((e) => e.key === "PUBLIC_NAME");
      expect(secret?.value).toEqual("***REDACTED***");
      expect(secret?.secret).toEqual(true);
      expect(pub?.value).toEqual("alice");
      expect(pub?.secret).toEqual(false);
    });

    it("returns entries sorted ascending by key", () => {
      configEngine.set("zebra", 1);
      configEngine.set("apple", 2);
      configEngine.set("mango", 3);
      const keys = configEngine.getAll().map((e) => e.key);
      expect(keys).toEqual(["apple", "mango", "zebra"]);
    });

    it("getByPrefix returns ONLY keys starting with the prefix", () => {
      configEngine.set("db.host", "h");
      configEngine.set("db.port", 5432);
      configEngine.set("cache.host", "c");
      const dbKeys = configEngine.getByPrefix("db.").map((e) => e.key).sort();
      expect(dbKeys).toEqual(["db.host", "db.port"]);
      // Non-matching prefix → empty array.
      expect(configEngine.getByPrefix("nomatch.")).toEqual([]);
    });

    it("getByPrefix with empty prefix returns every entry", () => {
      configEngine.set("a", 1);
      configEngine.set("b", 2);
      expect(configEngine.getByPrefix("").length).toEqual(2);
    });
  });

  describe("validate — required + type checks", () => {
    it("flags required keys with empty-string value as missing_required AND errors", () => {
      configEngine.set("REQUIRED_EMPTY", "", "env", { required: true });
      configEngine.set("REQUIRED_OK", "x", "env", { required: true });
      const v = configEngine.validate();
      expect(v.valid).toEqual(false);
      expect(v.missing_required).toEqual(["REQUIRED_EMPTY"]);
      expect(v.errors.length).toEqual(1);
      expect(v.errors[0].key).toEqual("REQUIRED_EMPTY");
      expect(v.errors[0].message.includes("Required config")).toEqual(true);
      expect(v.errors[0].message.includes("REQUIRED_EMPTY")).toEqual(true);
    });

    it("returns valid=true with empty arrays when no required keys are missing", () => {
      configEngine.set("ratio", 0.5, "env");
      configEngine.set("name", "x", "env");
      const v = configEngine.validate();
      expect(v.valid).toEqual(true);
      expect(v.errors).toEqual([]);
      expect(v.warnings).toEqual([]);
      expect(v.missing_required).toEqual([]);
    });

    it("returns valid=true and all-empty arrays for an empty config", () => {
      const v = configEngine.validate();
      expect(v).toEqual({ valid: true, errors: [], warnings: [], missing_required: [] });
    });
  });

  describe("exportConfig — secret-handling policy", () => {
    it("redacts secret values by default (includeSecrets=false)", () => {
      configEngine.set("DB_PASS", "hunter2", "env", { secret: true });
      configEngine.set("DB_USER", "alice", "env", { secret: false });
      const exp = configEngine.exportConfig();
      expect(exp.DB_PASS).toEqual("***REDACTED***");
      expect(exp.DB_USER).toEqual("alice");
    });

    // R12 / engine-bug-anti-regression:
    //   exportConfig(true) is INTENDED to return unredacted secret values, but
    //   the current implementation iterates through getAll() which ALWAYS
    //   redacts secret entries (engine line 114). The includeSecrets=true
    //   branch is therefore a silent no-op. See
    //   memory/reference_configengine_export_secrets_bug_2026_05_21.md.
    //   This test ENCODES the current (broken) behavior so the bug is
    //   visible in the suite. When the engine is fixed, flip the expectation
    //   to "hunter2" — that's the contract.
    it("[BUG-ANTI-REGRESSION] exportConfig(true) returns *redacted* values today (intended: unredacted)", () => {
      configEngine.set("DB_PASS", "hunter2", "env", { secret: true });
      expect(configEngine.exportConfig(true).DB_PASS).toEqual("***REDACTED***");
      // The unredacted value IS reachable via getWithMeta() — used here to
      // prove the secret was stored correctly (rules out a write-side bug).
      expect(configEngine.getWithMeta("DB_PASS")?.value).toEqual("hunter2");
    });

    it("exports the highest-priority source value, not the first-written one", () => {
      configEngine.set("X", "low-priority", "default");
      configEngine.set("X", "high-priority", "tenant");
      expect(configEngine.exportConfig().X).toEqual("high-priority");
    });

    it("preserves typed values in the export (number / boolean / json round-trip)", () => {
      configEngine.set("port", 5432);
      configEngine.set("debug", true);
      configEngine.set("blob", { k: "v" });
      const exp = configEngine.exportConfig();
      expect(exp.port).toEqual(5432);
      expect(exp.debug).toEqual(true);
      expect(exp.blob).toEqual({ k: "v" });
    });
  });

  describe("loadDefaults / importConfig — bulk seed semantics", () => {
    it("loadDefaults seeds 'default'-source entries with metadata and returns the count", () => {
      const n = configEngine.loadDefaults({
        api_url: { value: "https://api.example.com", description: "API base URL", required: true },
        timeout: { value: 30, required: false },
        secret_token: { value: "s3cr3t", secret: true },
      });
      expect(n).toEqual(3);
      const url = configEngine.getWithMeta("api_url") as ConfigEntry;
      expect(url.source).toEqual("default");
      expect(url.required).toEqual(true);
      expect(url.description).toEqual("API base URL");
      const secret = configEngine.getWithMeta("secret_token") as ConfigEntry;
      expect(secret.secret).toEqual(true);
      // getWithMeta does NOT redact — caller is responsible. Verify documented behavior.
      expect(secret.value).toEqual("s3cr3t");
    });

    it("importConfig overlays a 'file'-source over defaults; get() picks the file value", () => {
      configEngine.loadDefaults({ api_url: { value: "default" } });
      const n = configEngine.importConfig({ api_url: "from-file" }, "file");
      expect(n).toEqual(1);
      expect(configEngine.get("api_url")).toEqual("from-file");
      // getAll returns the effective (highest-priority) entry only.
      const effective = configEngine.getAll().filter((e) => e.key === "api_url");
      expect(effective.length).toEqual(1);
      expect(effective[0].source).toEqual("file");
    });
  });

  describe("delete — source-scoped vs total removal", () => {
    it("delete(key) without source drops the key from EVERY source", () => {
      configEngine.set("ephemeral", "a", "env");
      configEngine.set("ephemeral", "b", "runtime");
      expect(configEngine.delete("ephemeral")).toEqual(true);
      // After full delete, listings drop the key.
      expect(configEngine.getAll().filter((e) => e.key === "ephemeral")).toEqual([]);
      expect(configEngine.get("ephemeral") === undefined).toEqual(true);
    });

    it("delete(key, source) drops only that source; lower-priority sources remain effective", () => {
      configEngine.set("multi", "x", "env");
      configEngine.set("multi", "y", "runtime");
      configEngine.delete("multi", "runtime");
      // The remaining env-source entry becomes effective.
      expect(configEngine.get("multi")).toEqual("x");
      expect(configEngine.getWithMeta("multi")?.source).toEqual("env");
    });

    it("delete(key) returns false for never-set keys (no side effects)", () => {
      expect(configEngine.delete("never-set")).toEqual(false);
      expect(configEngine.getAll()).toEqual([]);
    });
  });

  describe("class export vs singleton — multi-tenant isolation", () => {
    it("a new ConfigEngine instance does not share state with the singleton", () => {
      const local = new ConfigEngine();
      local.set("ISOLATED", "local-only");
      expect(local.get("ISOLATED")).toEqual("local-only");
      expect(configEngine.get("ISOLATED") === undefined).toEqual(true);
      // Reverse: singleton write must not appear in local.
      configEngine.set("SHARED", "singleton-only");
      expect(local.get("SHARED") === undefined).toEqual(true);
      expect(configEngine.get("SHARED")).toEqual("singleton-only");
    });
  });
});
