/**
 * HookRegistryBuild.test.ts
 *
 * Covers HOOK-SYNERGY-MS0 / U-H1:
 *   - scripts/build-hook-registry.mjs : --self-test → exit 0; a real regen produces a valid
 *     state/shared/HOOK_REGISTRY.json (schemaVersion, counts, settingsLayers) and the bundle-tracing
 *     fix makes a bash-bundle-wrapped hook (html-companion-guard) report wired:true viaBundle:"bash-bundle";
 *     --check round-trips to exit 0 right after a regen and is read-only.
 *   - .claude/hooks/hook-registry-regen.mjs : a .claude/hooks/*.mjs (or settings.json) edit → {continue:true}
 *     + advisory; an unrelated edit / non-Edit tool / PRISM_HOOK_REGISTRY_REGEN=0 / empty / malformed stdin
 *     → {continue:true} no-op; + the exported relevantPaths() helper across the Edit/Write/MultiEdit shapes.
 *
 * The build-hook-registry regen mutates state/shared/HOOK_REGISTRY.json (it's a generated artifact that the
 * verify cron regenerates anyway — same precedent as CommitDraftSuggestHook.test.ts writing its jsonl).
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain ESM hook module, no type declarations
import { relevantPaths } from "../../../.claude/hooks/hook-registry-regen.mjs";

const REPO = "H:/prism";
const BUILDER = `${REPO}/scripts/build-hook-registry.mjs`;
const REGEN_HOOK = `${REPO}/.claude/hooks/hook-registry-regen.mjs`;
const REGISTRY = `${REPO}/state/shared/HOOK_REGISTRY.json`;

function runNode(script: string, args: string[] = [], opts: { input?: string; env?: Record<string, string> } = {}) {
  const r = spawnSync(process.execPath, [script, ...args], {
    input: opts.input,
    encoding: "utf8",
    timeout: 30_000,
    cwd: REPO,
    env: { ...process.env, ...(opts.env || {}) },
  });
  let parsed: any = null;
  try { parsed = JSON.parse((r.stdout || "").trim()); } catch { /* not JSON (e.g. build-hook-registry's summary line) */ }
  return { ...r, parsed, advisory: parsed?.hookSpecificOutput?.additionalContext ?? "" };
}

describe("build-hook-registry.mjs — HOOK-SYNERGY-MS0 U-H1", () => {
  it("--self-test passes (the script's own assertion suite)", () => {
    const r = runNode(BUILDER, ["--self-test"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("self-test passed");
  });

  it("a real regen writes a valid HOOK_REGISTRY.json with the expected shape", () => {
    const r = runNode(BUILDER, ["--json"]);
    expect(r.status).toBe(0);
    expect(existsSync(REGISTRY)).toBe(true);
    const reg = JSON.parse(readFileSync(REGISTRY, "utf8"));
    expect(reg.schemaVersion).toBe("1.0.0");
    expect(reg.generatedBy).toBe("scripts/build-hook-registry.mjs");
    expect(Array.isArray(reg.hooks)).toBe(true);
    expect(reg.counts.hookFiles).toBeGreaterThanOrEqual(100);
    expect(reg.counts.hookFiles).toBe(reg.hooks.length);
    expect(reg.counts.wired + reg.counts.orphaned).toBe(reg.counts.hookFiles);
    // all three settings layers accounted for (present/absent), none invalid-JSON
    expect(reg.settingsLayers.length).toBe(3);
    for (const l of reg.settingsLayers) expect(l.error).toBe(undefined);
    // every hook record carries the required fields
    for (const h of reg.hooks.slice(0, 5)) {
      expect(typeof h.id).toBe("string");
      expect(h.file.startsWith(".claude/hooks/")).toBe(true);
      expect(typeof h.wired).toBe("boolean");
      expect(Array.isArray(h.events)).toBe(true);
      expect(typeof h.lines).toBe("number");
    }
  });

  it("bundle-tracing: a bash-bundle-wrapped hook reports wired:true viaBundle:bash-bundle (not orphaned)", () => {
    runNode(BUILDER); // ensure fresh
    const reg = JSON.parse(readFileSync(REGISTRY, "utf8"));
    const hcg = reg.hooks.find((h: any) => h.id === "html-companion-guard");
    expect(hcg?.id).toBe("html-companion-guard");
    expect(hcg.wired).toBe(true);
    expect(hcg.events.some((e: any) => e.viaBundle === "bash-bundle" && e.event === "PreToolUse")).toBe(true);
    // the bundle file itself is in the registry too
    const bb = reg.hooks.find((h: any) => h.id === "bash-bundle");
    expect(bb?.id).toBe("bash-bundle");
    expect(bb.file).toBe(".claude/hooks/bundles/bash-bundle.mjs");
    expect(bb.wired).toBe(true);
  });

  it("--check exits 0 immediately after a regen, and is read-only (no rewrite)", () => {
    runNode(BUILDER);
    const before = readFileSync(REGISTRY, "utf8");
    const r = runNode(BUILDER, ["--check"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("up to date");
    expect(readFileSync(REGISTRY, "utf8")).toBe(before); // --check must not write
  });
});

describe("hook-registry-regen.mjs — PostToolUse:Edit|Write|MultiEdit", () => {
  function runHook(payload: object | string, env: Record<string, string> = {}) {
    return runNode(REGEN_HOOK, [], { input: typeof payload === "string" ? payload : JSON.stringify(payload), env });
  }

  it("Edit of a .claude/hooks/*.mjs → {continue:true} + regen advisory", () => {
    const r = runHook({ tool_name: "Edit", tool_input: { file_path: "H:/prism/.claude/hooks/some-hook.mjs" } });
    expect(r.status).toBe(0);
    expect(r.parsed.continue).toBe(true);
    expect(r.parsed.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(r.advisory).toContain("HOOK_REGISTRY.json regen queued");
  });

  it("Write of .claude/settings.json → regen advisory (settings layers feed the registry)", () => {
    const r = runHook({ tool_name: "Write", tool_input: { file_path: "H:/prism/.claude/settings.json" } });
    expect(r.status).toBe(0);
    expect(r.advisory).toContain("regen queued");
  });

  it("MultiEdit whose edits include a hooks/*.mjs → regen advisory", () => {
    const r = runHook({ tool_name: "MultiEdit", tool_input: { file_path: "H:/prism/README.md", edits: [{ file_path: "H:/prism/.claude/hooks/x.mjs" }] } });
    expect(r.status).toBe(0);
    expect(r.advisory).toContain("regen queued");
  });

  it("Edit of an unrelated file → {continue:true}, no advisory", () => {
    const r = runHook({ tool_name: "Edit", tool_input: { file_path: "H:/prism/mcp-server/src/engines/Foo.ts" } });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("non-Edit tool (Bash) → {continue:true} no-op", () => {
    const r = runHook({ tool_name: "Bash", tool_input: { command: "node .claude/hooks/x.mjs" } });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_HOOK_REGISTRY_REGEN=0 → {continue:true} no-op even on a hook-file edit", () => {
    const r = runHook({ tool_name: "Edit", tool_input: { file_path: "H:/prism/.claude/hooks/x.mjs" } }, { PRISM_HOOK_REGISTRY_REGEN: "0" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("empty stdin → {continue:true}", () => {
    const r = runHook("");
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("malformed JSON stdin → {continue:true}", () => {
    const r = runHook("not json {{");
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("relevantPaths(): pulls file paths from every Edit/Write/MultiEdit input shape", () => {
    expect(relevantPaths({ file_path: "a.ts" })).toEqual(["a.ts"]);
    expect(relevantPaths({ filePath: "b.ts" })).toEqual(["b.ts"]);
    expect(relevantPaths({ file_paths: ["p.ts", "q.ts"] })).toEqual(["p.ts", "q.ts"]);
    expect(relevantPaths({ edits: [{ file_path: "x.ts" }, { file_path: "y.ts" }] })).toEqual(["x.ts", "y.ts"]);
    expect(relevantPaths(null)).toEqual([]);
    expect(relevantPaths("not an object")).toEqual([]);
    expect(relevantPaths({})).toEqual([]);
  });
});
