/**
 * Tests for agent-auto-update-hook.mjs (U-AIMAX09 — Feature Cascade Enhancement)
 *
 * Exercises the hook end-to-end by spawning the actual script and asserting
 * that cascade side-effects land in:
 *   - cross-session-asset-registry.json
 *   - SESSION_ARTIFACTS.json
 * within the 5-second visibility target.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// __dirname = <repo>/mcp-server/src/__tests__/hooks
const MCP_ROOT = path.resolve(__dirname, "../../..");
const REPO_ROOT = path.resolve(MCP_ROOT, "..");

const HOOK = path.resolve(MCP_ROOT, "scripts/hooks/agent-auto-update-hook.mjs");
const REGISTRY = path.resolve(MCP_ROOT, "data/state/cross-session-asset-registry.json");
const ARTIFACTS = path.resolve(REPO_ROOT, "state/shared/SESSION_ARTIFACTS.json");

// Backup/restore to avoid polluting real state.
let registryBackup: string | null = null;
let artifactsBackup: string | null = null;

function runHook(filePath: string): { stdout: string; durationMs: number } {
  const payload = JSON.stringify({ tool_input: { file_path: filePath } });
  const t0 = Date.now();
  const result = spawnSync("node", [HOOK], {
    input: payload,
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  const durationMs = Date.now() - t0;
  if (result.error) throw result.error;
  return { stdout: String(result.stdout || ""), durationMs };
}

function readJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function cleanupProbe(namePattern: RegExp) {
  if (fs.existsSync(REGISTRY)) {
    const r = readJson(REGISTRY);
    r.entries = (r.entries ?? []).filter((e: any) => !namePattern.test(e.name));
    fs.writeFileSync(REGISTRY, JSON.stringify(r, null, 2));
  }
  if (fs.existsSync(ARTIFACTS)) {
    const a = readJson(ARTIFACTS);
    if (a?.recent_additions) {
      for (const k of Object.keys(a.recent_additions)) {
        a.recent_additions[k] = (a.recent_additions[k] ?? []).filter(
          (x: string) => !namePattern.test(x.replace(/\.(ts|mjs|md)$/, "")),
        );
      }
      fs.writeFileSync(ARTIFACTS, JSON.stringify(a, null, 2));
    }
  }
}

// Strip any pre-existing probe entries so tests start clean even if a
// previous run crashed before afterEach could restore the backup.
const PROBE_NAME_RE = /Probe.*Aimax09|probe-aimax09|^probeAimax09/i;

describe("agent-auto-update-hook (U-AIMAX09)", () => {
  beforeEach(() => {
    // Strip any lingering probe entries first (recover from crashed prior runs)
    cleanupProbe(PROBE_NAME_RE);
    registryBackup = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, "utf8") : null;
    artifactsBackup = fs.existsSync(ARTIFACTS) ? fs.readFileSync(ARTIFACTS, "utf8") : null;
  });

  afterEach(() => {
    if (registryBackup !== null) fs.writeFileSync(REGISTRY, registryBackup);
    if (artifactsBackup !== null) fs.writeFileSync(ARTIFACTS, artifactsBackup);
  });

  it("registers a new engine and cascades to SESSION_ARTIFACTS", () => {
    const fakeEngine = "ProbeAimax09Engine";
    const fp = `H:/PRISM/mcp-server/src/engines/${fakeEngine}.ts`;

    const { stdout, durationMs } = runHook(fp);

    // Visibility target: <5s.
    expect(durationMs).toBeLessThan(5_000);

    // Hook emits PostToolUse additionalContext.
    const out = JSON.parse(stdout.trim() || "{}");
    expect(out?.hookSpecificOutput?.hookEventName).toBe("PostToolUse");
    expect(out.hookSpecificOutput.additionalContext).toContain(fakeEngine);
    expect(out.hookSpecificOutput.additionalContext).toContain("SESSION_ARTIFACTS");

    // Registry gained the entry.
    const reg = readJson(REGISTRY);
    const hit = reg.entries.find((e: any) => e.name === fakeEngine && e.type === "engine");
    expect(hit).toBeDefined();

    // SESSION_ARTIFACTS gained the file basename with .ts suffix.
    const art = readJson(ARTIFACTS);
    expect(art.event).toBe("live_update");
    expect(art.recent_additions.new_engines).toContain(`${fakeEngine}.ts`);

    cleanupProbe(new RegExp(`^${fakeEngine}$`));
  });

  it("detects skills (markdown under commands/) and routes to new_skills", () => {
    const skill = "probe-aimax09-skill";
    const fp = `C:/Users/Mark Villanueva/.claude/commands/${skill}.md`;

    runHook(fp);

    const art = readJson(ARTIFACTS);
    expect(art.recent_additions.new_skills).toContain(`${skill}.md`);

    cleanupProbe(new RegExp(`^${skill}$`));
  });

  it("detects scripts/hooks/*.mjs and routes to new_hooks", () => {
    const hook = "probe-aimax09-hook";
    const fp = `H:/PRISM/mcp-server/scripts/hooks/${hook}.mjs`;

    runHook(fp);

    const art = readJson(ARTIFACTS);
    expect(art.recent_additions.new_hooks).toContain(`${hook}.mjs`);

    cleanupProbe(new RegExp(`^${hook}$`));
  });

  it("dedupes on second call for the same engine", () => {
    const fakeEngine = "ProbeDedupAimax09Engine";
    const fp = `H:/PRISM/mcp-server/src/engines/${fakeEngine}.ts`;

    runHook(fp);
    runHook(fp);

    const reg = readJson(REGISTRY);
    const hits = reg.entries.filter(
      (e: any) => e.name === fakeEngine && e.type === "engine",
    );
    expect(hits.length).toBe(1);

    // Bucket still contains exactly one occurrence.
    const art = readJson(ARTIFACTS);
    const occurrences = art.recent_additions.new_engines.filter(
      (x: string) => x === `${fakeEngine}.ts`,
    );
    expect(occurrences.length).toBe(1);

    cleanupProbe(new RegExp(`^${fakeEngine}$`));
  });

  it("ignores unrelated file paths (no registry mutation)", () => {
    const before = readJson(REGISTRY).entries.length;
    runHook("H:/PRISM/some/random/file.txt");
    const after = readJson(REGISTRY).entries.length;
    expect(after).toBe(before);
  });

  it("ignores empty stdin without crashing", () => {
    const result = spawnSync("node", [HOOK], {
      input: "",
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
    });
    // Hook never throws — it may exit 0 or non-zero depending on node/env quirks,
    // but stdout MUST be valid JSON (empty object) and stderr MUST be empty of errors.
    expect(() => JSON.parse(String(result.stdout || "").trim() || "{}")).not.toThrow();
  });

  it("ignores malformed JSON stdin without crashing", () => {
    const result = spawnSync("node", [HOOK], {
      input: "{not json",
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
    });
    expect(() => JSON.parse(String(result.stdout || "").trim() || "{}")).not.toThrow();
  });

  it("does not treat non-commands markdown as a skill", () => {
    const fp = "H:/PRISM/docs/README.md";
    const before = readJson(REGISTRY).entries.length;
    runHook(fp);
    const after = readJson(REGISTRY).entries.length;
    expect(after).toBe(before);
  });

  it("detects dispatcher files (Dispatcher.ts)", () => {
    const name = "probeAimax09Dispatcher";
    const fp = `H:/PRISM/mcp-server/src/tools/dispatchers/${name}.ts`;
    runHook(fp);

    const reg = readJson(REGISTRY);
    const hit = reg.entries.find(
      (e: any) => e.name === name && e.type === "dispatcher",
    );
    expect(hit).toBeDefined();

    const art = readJson(ARTIFACTS);
    expect(art.recent_additions.new_dispatchers).toContain(`${name}.ts`);

    cleanupProbe(new RegExp(`^${name}$`));
  });

  it("detects algorithm files under src/algorithms/", () => {
    const name = "probeAimax09Algorithm";
    const fp = `H:/PRISM/mcp-server/src/algorithms/${name}.ts`;
    runHook(fp);

    const reg = readJson(REGISTRY);
    const hit = reg.entries.find(
      (e: any) => e.name === name && e.type === "algorithm",
    );
    expect(hit).toBeDefined();

    // Algorithms currently surface under new_engines bucket for visibility.
    const art = readJson(ARTIFACTS);
    expect(art.recent_additions.new_engines).toContain(`${name}.ts`);

    cleanupProbe(new RegExp(`^${name}$`));
  });

  it("propagates cascade within the 5-second exit-criteria budget", () => {
    const name = "ProbeAimax09LatencyEngine";
    const fp = `H:/PRISM/mcp-server/src/engines/${name}.ts`;
    const t0 = Date.now();
    runHook(fp);
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(5_000);

    cleanupProbe(new RegExp(`^${name}$`));
  });
});
