/**
 * Integration tests for the 5 portability guards + mirror hook.
 *
 * Guards live at H:/PRISM/.claude/hooks/ and helpers at H:/PRISM/.claude/helpers/.
 * They use hardcoded H: paths for production safety — testing failure modes
 * beyond env-validation requires refactoring each to accept overrides.
 * This first test-pass covers:
 *   - Smoke test per guard (exits sanely on this PC)
 *   - Env-validation failure paths (USERPROFILE, APPDATA override)
 *   - File integrity (scripts parse as valid JS)
 *
 * Deeper failure-mode coverage (junction-drift simulation via fs mocks)
 * is deferred — see SYS-OPT-MS0 envelope follow-up notes.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const HOOKS = "H:/PRISM/.claude/hooks";
const HELPERS = "H:/PRISM/.claude/helpers";

function runGuard(path: string, envOverride: Record<string, string | undefined> = {}) {
  const env = { ...process.env, ...envOverride };
  // Clean out overrides set to undefined
  for (const [k, v] of Object.entries(envOverride)) if (v === undefined) delete (env as any)[k];
  return spawnSync("node", [path], { encoding: "utf8", env, timeout: 10000 });
}

describe("portable-python-guard", () => {
  const path = `${HOOKS}/portable-python-guard.mjs`;

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("exits 0 with expected stdout when Python is installed", () => {
    const r = runGuard(path);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Portable Python/);
    expect(r.stdout).toMatch(/Python 3\.\d+\.\d+/);
  });
});

describe("dotclaude-junctions-guard", () => {
  const path = `${HOOKS}/dotclaude-junctions-guard.mjs`;

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("exits 0 when junctions are correctly set up", () => {
    const r = runGuard(path);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/junctions → H:\\\.claude/);
  });
});

describe("appdata-junction-guard", () => {
  const path = `${HOOKS}/appdata-junction-guard.mjs`;

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("exits 0 when junction is correctly set up (current state)", () => {
    // AppData\Roaming\Claude is now a junction → H:\Claude (cusersmarkvillanueva)
    const r = runGuard(path);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/AppData junction → H:/);
  });

  it("exits 1 with user_unknown on unknown USERPROFILE basename", () => {
    const r = runGuard(path, { USERPROFILE: "C:\\Users\\NoSuchUser_2026_04_21" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/user_unknown|not mapped/);
  });
});

describe("mcp-config-resolve", () => {
  const path = `${HOOKS}/mcp-config-resolve.mjs`;

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("exits 0 and writes resolved .mcp.json (or skips if template missing)", () => {
    const r = runGuard(path);
    expect(r.status).toBe(0);
    // Either "already resolved" or "resolved (node → ...)" or "template not found"
    expect(r.stdout).toMatch(/MCP config|template not found/);
  });
});

describe("claude-md-mirror", () => {
  const path = `${HOOKS}/claude-md-mirror.mjs`;

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("exits 0 — non-blocking by design", () => {
    const r = runGuard(path);
    expect(r.status).toBe(0);
  });
});

describe("setup scripts exist", () => {
  it("portability-setup.mjs exists (one-shot installer)", () => {
    expect(existsSync(`${HELPERS}/portability-setup.mjs`)).toBe(true);
  });

  it("dotclaude-junctions-setup.mjs exists", () => {
    expect(existsSync(`${HELPERS}/dotclaude-junctions-setup.mjs`)).toBe(true);
  });

  it("appdata-junction-setup.mjs exists", () => {
    expect(existsSync(`${HELPERS}/appdata-junction-setup.mjs`)).toBe(true);
  });
});

describe("syntax integrity — all guards parse as valid ESM", () => {
  const files = [
    `${HOOKS}/portable-python-guard.mjs`,
    `${HOOKS}/dotclaude-junctions-guard.mjs`,
    `${HOOKS}/appdata-junction-guard.mjs`,
    `${HOOKS}/mcp-config-resolve.mjs`,
    `${HOOKS}/claude-md-mirror.mjs`,
    `${HELPERS}/portability-setup.mjs`,
    `${HELPERS}/dotclaude-junctions-setup.mjs`,
    `${HELPERS}/appdata-junction-setup.mjs`,
  ];

  for (const f of files) {
    it(`${f.split("/").pop()} — node --check passes`, () => {
      const r = spawnSync("node", ["--check", f], { encoding: "utf8", timeout: 5000 });
      if (r.status !== 0) {
        throw new Error(`${f}\nstderr:\n${r.stderr}`);
      }
      expect(r.status).toBe(0);
    });
  }
});

describe("structural sanity", () => {
  it("appdata-junction-guard maps both known users", () => {
    const src = readFileSync(`${HOOKS}/appdata-junction-guard.mjs`, "utf8");
    expect(src).toMatch(/"Mark Villanueva":\s*"H:\\\\Claude \(cusersmarkvillanueva\)"/);
    expect(src).toMatch(/"wompus":\s*"H:\\\\Claude \(CUserswompuAppData\)"/);
  });

  it("dotclaude-junctions-guard covers all 9 expected subdirs", () => {
    const src = readFileSync(`${HOOKS}/dotclaude-junctions-guard.mjs`, "utf8");
    const expected = ["commands", "agents", "hooks", "skills", "rules", "plans", "plugins", "helpers", "bin"];
    for (const dir of expected) expect(src).toMatch(new RegExp(`"${dir}"`));
  });

  it("portable-python-guard points at H:/Tools/python/python.exe", () => {
    const src = readFileSync(`${HOOKS}/portable-python-guard.mjs`, "utf8");
    expect(src).toMatch(/H:\\\\Tools\\\\python\\\\python\.exe/);
  });
});
