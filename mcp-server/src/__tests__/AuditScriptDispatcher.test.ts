/**
 * AuditScriptDispatcher — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U06.
 *
 * Pure-function tests for scripts/audit.mjs (unified audit dispatcher).
 * Asserts:
 *   1. AUDIT_SCRIPT_TABLE is well-formed and covers the documented audits
 *      from this milestone (docker P13-U01, extractor P18-U01, plus the
 *      pre-existing audit scripts).
 *   2. parseSubcommand handles missing args, --help, --list, and the
 *      positional-subcommand pattern.
 *   3. selectAuditScript resolves canonical names + aliases + rejects
 *      unknowns + degrades on bad input.
 *   4. formatHelp output is readable + complete.
 *   5. listSubcommands returns alphabetically sorted names.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/audit.mjs");

let AUDIT_SCRIPT_TABLE: any, parseSubcommand: any, selectAuditScript: any, formatHelp: any, listSubcommands: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  AUDIT_SCRIPT_TABLE = mod.AUDIT_SCRIPT_TABLE;
  parseSubcommand = mod.parseSubcommand;
  selectAuditScript = mod.selectAuditScript;
  formatHelp = mod.formatHelp;
  listSubcommands = mod.listSubcommands;
});

describe("P10-U06 AUDIT_SCRIPT_TABLE", () => {
  it("includes the audits shipped this milestone (docker, extractor)", () => {
    expect(AUDIT_SCRIPT_TABLE.docker).toBeTruthy();
    expect(AUDIT_SCRIPT_TABLE.extractor).toBeTruthy();
  });

  it("each entry has script + description + extension", () => {
    for (const [name, entry] of Object.entries(AUDIT_SCRIPT_TABLE)) {
      const e = entry as any;
      expect(typeof e.script).toBe("string");
      expect(e.script.length).toBeGreaterThan(0);
      expect(typeof e.description).toBe("string");
      expect(e.description.length).toBeGreaterThan(10);
      expect(typeof e.extension).toBe("string");
      expect([".mjs", ".cjs", ".js", ".ts", ".py"]).toContain(e.extension);
    }
  });

  it("script paths are repo-relative (no leading slash, no drive letter)", () => {
    for (const entry of Object.values(AUDIT_SCRIPT_TABLE)) {
      const e = entry as any;
      expect(e.script.startsWith("/")).toBe(false);
      expect(/^[A-Za-z]:/.test(e.script)).toBe(false);
    }
  });

  it("subcommand names are kebab-case lowercase", () => {
    for (const name of Object.keys(AUDIT_SCRIPT_TABLE)) {
      expect(/^[a-z][a-z0-9-]*$/.test(name)).toBe(true);
    }
  });
});

describe("P10-U06 parseSubcommand", () => {
  it("returns helpRequested=true on empty argv", () => {
    const r = parseSubcommand([]);
    expect(r.helpRequested).toBe(true);
    expect(r.subcommand).toBeNull();
  });

  it("returns helpRequested=true when --help is present", () => {
    const r = parseSubcommand(["docker", "--help"]);
    expect(r.helpRequested).toBe(true);
    expect(r.subcommand).toBeNull();
  });

  it("returns helpRequested=true when -h is present", () => {
    const r = parseSubcommand(["-h"]);
    expect(r.helpRequested).toBe(true);
  });

  it("returns listRequested=true when --list is present", () => {
    const r = parseSubcommand(["--list"]);
    expect(r.listRequested).toBe(true);
    expect(r.helpRequested).toBe(false);
  });

  it("extracts the first positional as subcommand", () => {
    const r = parseSubcommand(["docker"]);
    expect(r.subcommand).toBe("docker");
    expect(r.helpRequested).toBe(false);
  });

  it("passes remaining args through to backend", () => {
    const r = parseSubcommand(["docker", "--write", "--json"]);
    expect(r.subcommand).toBe("docker");
    expect(r.args).toEqual(["--write", "--json"]);
  });

  it("lowercases the subcommand", () => {
    const r = parseSubcommand(["DOCKER"]);
    expect(r.subcommand).toBe("docker");
  });

  it("safe on non-array input", () => {
    const r = parseSubcommand(null as any);
    expect(r.subcommand).toBeNull();
    expect(r.helpRequested).toBe(false);
  });

  it("--help wins over --list when both present", () => {
    const r = parseSubcommand(["--help", "--list"]);
    expect(r.helpRequested).toBe(true);
    expect(r.listRequested).toBe(false);
  });
});

describe("P10-U06 selectAuditScript", () => {
  it("resolves canonical subcommand", () => {
    const e = selectAuditScript("docker");
    expect(e).not.toBeNull();
    expect(e.script).toContain("docker-audit.mjs");
    expect(e.subcommand).toBe("docker");
  });

  it("resolves the docs alias to docker", () => {
    const e = selectAuditScript("docs");
    expect(e).not.toBeNull();
    expect(e.subcommand).toBe("docker");
  });

  it("resolves the ext alias to extractor", () => {
    const e = selectAuditScript("ext");
    expect(e).not.toBeNull();
    expect(e.subcommand).toBe("extractor");
  });

  it("resolves the inv alias to inventory", () => {
    const e = selectAuditScript("inv");
    expect(e).not.toBeNull();
    expect(e.subcommand).toBe("inventory");
  });

  it("is case-insensitive", () => {
    const e = selectAuditScript("DOCKER");
    expect(e?.subcommand).toBe("docker");
  });

  it("trims whitespace before lookup", () => {
    const e = selectAuditScript("  docker  ");
    expect(e?.subcommand).toBe("docker");
  });

  it("returns null for unknown subcommand", () => {
    expect(selectAuditScript("widgets")).toBeNull();
  });

  it("returns null for non-string / empty input", () => {
    expect(selectAuditScript(null)).toBeNull();
    expect(selectAuditScript(undefined)).toBeNull();
    expect(selectAuditScript("")).toBeNull();
    expect(selectAuditScript(42)).toBeNull();
  });

  it("accepts a custom table + aliases (DI for tests)", () => {
    const customTable = { foo: { script: "x.mjs", description: "test", extension: ".mjs" } };
    const customAliases = { f: "foo" };
    const e = selectAuditScript("f", customTable, customAliases);
    expect(e?.subcommand).toBe("foo");
    expect(e?.script).toBe("x.mjs");
  });
});

describe("P10-U06 formatHelp", () => {
  it("includes the program name and usage line", () => {
    const text = formatHelp();
    expect(text).toContain("audit.mjs");
    expect(text).toContain("Usage:");
  });

  it("lists every subcommand with its description", () => {
    const text = formatHelp();
    for (const [name, entry] of Object.entries(AUDIT_SCRIPT_TABLE)) {
      const e = entry as any;
      expect(text).toContain(name);
      expect(text).toContain(e.description);
    }
  });

  it("documents the alias table", () => {
    const text = formatHelp();
    expect(text).toContain("Aliases:");
    expect(text).toContain("docs");
    expect(text).toContain("ext");
  });
});

describe("P10-U06 listSubcommands", () => {
  it("returns names alphabetically sorted", () => {
    const names = listSubcommands();
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("returns the same set as Object.keys(AUDIT_SCRIPT_TABLE)", () => {
    const names = listSubcommands();
    expect(new Set(names)).toEqual(new Set(Object.keys(AUDIT_SCRIPT_TABLE)));
  });

  it("non-empty (we ship multiple audit subcommands)", () => {
    expect(listSubcommands().length).toBeGreaterThan(3);
  });
});
