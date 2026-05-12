// Tests for scripts/verify-hookify.mjs (U-HKA06).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/verify-hookify.test.mjs

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  isHookifyEnabled,
  classifyRuleFile,
  countLocalRules,
  findHookifyPluginDir,
  verify,
} from "../../../scripts/verify-hookify.mjs";

const KEY = "hookify@claude-plugins-official";
let TMP;
beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "vhf-test-")); });
afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });

describe("isHookifyEnabled", () => {
  it("true only when enabledPlugins[key] === true", () => {
    expect(isHookifyEnabled({ enabledPlugins: { [KEY]: true } })).toBe(true);
    expect(isHookifyEnabled({ enabledPlugins: { [KEY]: false } })).toBe(false);
    expect(isHookifyEnabled({ enabledPlugins: { [KEY]: "true" } })).toBe(false); // must be the boolean
    expect(isHookifyEnabled({ enabledPlugins: {} })).toBe(false);
    expect(isHookifyEnabled({})).toBe(false);
    expect(isHookifyEnabled(null)).toBe(false);
  });
});

describe("classifyRuleFile — naming convention", () => {
  it("dotted form: hookify.<type>-<name>.local.md", () => {
    expect(classifyRuleFile("hookify.block-dangerous-rm.local.md")).toEqual({ type: "block", name: "dangerous-rm" });
    expect(classifyRuleFile("hookify.warn-todo-fixme.local.md")).toEqual({ type: "warn", name: "todo-fixme" });
    expect(classifyRuleFile("hookify.suggest-lsp-over-grep.local.md")).toEqual({ type: "suggest", name: "lsp-over-grep" });
    expect(classifyRuleFile("hookify.autofire-status.local.md")).toEqual({ type: "autofire", name: "status" });
  });
  it("dashed form: hookify-<type>-<name>.local.md", () => {
    expect(classifyRuleFile("hookify-block-bash-cat-file.local.md")).toEqual({ type: "block", name: "bash-cat-file" });
    expect(classifyRuleFile("hookify-warn-edit-without-context.local.md")).toEqual({ type: "warn", name: "edit-without-context" });
  });
  it("path is allowed (basename is used)", () => {
    expect(classifyRuleFile("/h/prism/.claude/hookify.block-x.local.md")).toEqual({ type: "block", name: "x" });
  });
  it("an unrecognised type → type 'unknown' (still a hookify file)", () => {
    expect(classifyRuleFile("hookify.frobnicate-x.local.md")).toEqual({ type: "unknown", name: "x" });
  });
  it("non-hookify / malformed names → null", () => {
    expect(classifyRuleFile("README.md")).toBeNull();
    expect(classifyRuleFile("hookify.md")).toBeNull();
    expect(classifyRuleFile("hookify.block-x.md")).toBeNull();          // missing .local
    expect(classifyRuleFile("not-hookify.block-x.local.md")).toBeNull();
    expect(classifyRuleFile("")).toBeNull();
    expect(classifyRuleFile(undefined)).toBeNull();
  });
});

describe("countLocalRules", () => {
  it("counts and groups by type, samples up to 5", () => {
    for (const f of [
      "hookify.block-a.local.md", "hookify.block-b.local.md",
      "hookify.warn-c.local.md", "hookify-warn-d.local.md",
      "hookify.suggest-e.local.md", "hookify.autofire-f.local.md",
      "hookify.weirdtype-g.local.md", "README.md", "settings.json",
    ]) fs.writeFileSync(path.join(TMP, f), "x");
    const r = countLocalRules(TMP);
    expect(r.total).toBe(7);
    expect(r.byType).toMatchObject({ block: 2, warn: 2, suggest: 1, autofire: 1, unknown: 1 });
    expect(r.sample.length).toBe(5);
  });
  it("a missing / empty dir → zero, no throw", () => {
    expect(countLocalRules(path.join(TMP, "nope"))).toMatchObject({ total: 0 });
    expect(countLocalRules(TMP)).toMatchObject({ total: 0 });
  });
});

describe("findHookifyPluginDir", () => {
  it("finds the marketplace-cache layout", () => {
    const home = path.join(TMP, "home");
    const dir = path.join(home, "plugins", "marketplaces", "claude-plugins-official", "plugins", "hookify");
    fs.mkdirSync(dir, { recursive: true });
    expect(path.resolve(findHookifyPluginDir(home))).toBe(path.resolve(dir));
  });
  it("finds the top-level layout", () => {
    const home = path.join(TMP, "home2");
    const dir = path.join(home, "plugins", "hookify");
    fs.mkdirSync(dir, { recursive: true });
    expect(path.resolve(findHookifyPluginDir(home))).toBe(path.resolve(dir));
  });
  it("absent → null; bad input → null", () => {
    fs.mkdirSync(path.join(TMP, "home3", "plugins"), { recursive: true });
    expect(findHookifyPluginDir(path.join(TMP, "home3"))).toBeNull();
    expect(findHookifyPluginDir(null)).toBeNull();
    expect(findHookifyPluginDir(path.join(TMP, "does-not-exist"))).toBeNull();
  });
});

describe("verify — overall health", () => {
  function scaffold({ enabled = true, plugin = true, rules = ["hookify.block-a.local.md", "hookify.warn-b.local.md"] } = {}) {
    const home = path.join(TMP, "home");
    const repo = path.join(TMP, "repo");
    fs.mkdirSync(path.join(home), { recursive: true });
    fs.mkdirSync(path.join(repo, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(home, "settings.json"), JSON.stringify(enabled ? { enabledPlugins: { [KEY]: true } } : { enabledPlugins: {} }));
    if (plugin) fs.mkdirSync(path.join(home, "plugins", "marketplaces", "claude-plugins-official", "plugins", "hookify"), { recursive: true });
    else fs.mkdirSync(path.join(home, "plugins"), { recursive: true });
    for (const f of rules) fs.writeFileSync(path.join(repo, ".claude", f), "x");
    return { claudeHome: home, repoRoot: repo, settingsPaths: [path.join(home, "settings.json")] };
  }
  it("enabled + plugin present + rules → ok, no problems", () => {
    const r = verify(scaffold());
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.settings.enabled).toBe(true);
    expect(r.plugin.found).toBe(true);
    expect(r.rules.total).toBe(2);
    expect(r.rules.byType.block).toBe(1);
  });
  it("not enabled → ok:false, problem mentions enabling it", () => {
    const r = verify(scaffold({ enabled: false }));
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/not enabled/i);
  });
  it("enabled but plugin dir missing → ok:false, problem mentions the missing directory", () => {
    const r = verify(scaffold({ plugin: false }));
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/plugin directory was not found|run \/plugin install/i);
  });
  it("zero rule files is informational, not a failure", () => {
    const r = verify(scaffold({ rules: [] }));
    expect(r.ok).toBe(true);
    expect(r.rules.total).toBe(0);
  });
  it("no settings.json at all → ok:false", () => {
    const r = verify({ claudeHome: path.join(TMP, "ghost-home"), repoRoot: path.join(TMP, "ghost-repo"), settingsPaths: [path.join(TMP, "nowhere.json")] });
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/could not read/i);
  });
});

describe("the real PRISM environment (smoke — informational)", () => {
  it("the live config has hookify enabled and rules on disk", () => {
    // This documents reality at U-HKA06 time. If it ever fails, hookify was disabled or
    // the plugin uninstalled — investigate, don't just delete the test.
    const r = verify({}); // real defaults: os.homedir()/.claude + cwd-derived repo root
    expect(r.settings.enabled).toBe(true);
    expect(r.rules.total).toBeGreaterThan(20); // ~200+ rules ship; >20 is a generous floor
  });
});
