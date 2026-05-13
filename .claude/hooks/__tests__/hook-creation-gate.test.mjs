// tier: T0
/**
 * hook-creation-gate.test.mjs — tests for the .claude/hooks/ creation guard
 * HOOK-SYNERGY-MS0 / U-HOOK-CREATION-GATE  (H5)
 *
 * The hook exposes `evaluate({stdin, registryPath, fsImpl, env})` as a pure
 * function so tests can drive it against in-memory fixtures without an on-disk registry.
 *
 * Coverage:
 *   - tool gate (Write only; Edit/Bash/etc pass through)
 *   - target-path gate (.claude/hooks/*.mjs only)
 *   - update-vs-create distinction (target exists → allow)
 *   - empty/missing registry → allow
 *   - exact-name collision → skip
 *   - fuzzy-name match → extend (high-conf) or rename (mid-conf)
 *   - description-overlap dimension
 *   - block-mode env override (PRISM_HOOK_CREATION_GATE_BLOCK=1)
 *   - adversarial: missing stdin, non-string file_path, non-existent registry
 */

import { describe, it, expect } from "vitest";
import { evaluate } from "../hook-creation-gate.mjs";

const REGISTRY = "/repo/state/shared/HOOK_REGISTRY.json";

function makeFs({ files = {}, exists = new Set() }) {
  return {
    existsSync: (p) => p in files || exists.has(String(p).replace(/\\/g, "/")),
    readFileSync: (p) => {
      const key = String(p).replace(/\\/g, "/");
      if (key in files) return files[key];
      throw new Error(`ENOENT: ${key}`);
    },
  };
}

const FIXTURE_REGISTRY = JSON.stringify({
  hooks: [
    {
      id: "file-claim-guard",
      file: ".claude/hooks/file-claim-guard.mjs",
      description: "Prevents two concurrent Claude chats from silently editing the same file.",
      events: ["PreToolUse"],
      wirings: [{ event: "PreToolUse", matcher: "^(Edit|Write|MultiEdit)$" }],
    },
    {
      id: "stale-claim-sweeper",
      file: ".claude/hooks/stale-claim-sweeper.mjs",
      description: "Reaps stale claims and locks from coordination state on SessionStart.",
      events: ["SessionStart", "Stop"],
      wirings: [{ event: "SessionStart", matcher: "" }, { event: "Stop", matcher: "" }],
    },
  ],
});

// ── tool / target gating ────────────────────────────────────────────────────

describe("hook-creation-gate: tool gating", () => {
  it("non-Write tools pass through (Edit/Bash/Read)", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    for (const tool of ["Edit", "Bash", "Read", "MultiEdit"]) {
      const r = evaluate({
        stdin: { tool_name: tool, tool_input: { file_path: ".claude/hooks/new.mjs", content: "" } },
        registryPath: REGISTRY, fsImpl, env: {},
      });
      expect(r.action).toBe("allow");
      expect(r.reason).toMatch(/tool is not Write/);
    }
  });

  it("Write outside .claude/hooks/ passes through", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: "mcp-server/src/engines/Foo.ts", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
    expect(r.reason).toMatch(/not a .claude\/hooks/);
  });

  it("Write to a non-.mjs file inside .claude/hooks/ passes through (e.g., .md docs)", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/README.md", content: "# Hooks" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
    expect(r.reason).toMatch(/not a .claude\/hooks/);
  });

  it("Write to an existing .claude/hooks/*.mjs is treated as update (allow)", () => {
    const fsImpl = makeFs({
      files: { [REGISTRY]: FIXTURE_REGISTRY },
      exists: new Set([".claude/hooks/file-claim-guard.mjs"]),
    });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claim-guard.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
    expect(r.reason).toMatch(/already exists/);
  });
});

// ── registry edge cases ─────────────────────────────────────────────────────

describe("hook-creation-gate: registry edge cases", () => {
  it("missing registry → allow (no false positives without a catalog)", () => {
    const fsImpl = makeFs({});
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/new.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
    expect(r.reason).toMatch(/registry empty or unavailable/);
  });

  it("malformed registry JSON → allow (no crash)", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: "not-json" } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/new.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
  });

  it("registry without `hooks` array → allow", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: JSON.stringify({ generatedAt: "now" }) } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/new.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
  });
});

// ── advisory paths ──────────────────────────────────────────────────────────

describe("hook-creation-gate: advisory paths (default)", () => {
  it("exact-name collision → advise(skip)", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claim-guard.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("advise");
    expect(r.recommendation).toBe("skip");
    expect(r.topMatch?.id).toBe("file-claim-guard");
    expect(r.topMatch?.reasons.includes("exact-name")).toBe(true);
    expect(r.reason).toMatch(/Exact name collision/);
  });

  it("close-name match → advise(extend) when score ≥0.85", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claim-guardx.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("advise");
    expect(r.recommendation).toBe("extend");
    expect(r.topMatch?.score).toBeGreaterThanOrEqual(0.85);
  });

  it("mid-similarity match → advise(rename) when score in [0.7, 0.85)", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claaim-gardd.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("advise");
    expect(r.recommendation).toBe("rename");
    expect(r.topMatch?.score).toBeGreaterThanOrEqual(0.7);
    expect(r.topMatch?.score).toBeLessThan(0.85);
  });

  it("unique name with no overlap → allow", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/zzz-totally-unique-xyz.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("allow");
    expect(r.matches).toEqual([]);
  });

  it("description-overlap from JSDoc boosts the score and flags a different-named entry", () => {
    const content =
      "/**\n * Reaps stale claims from coordination tables every SessionStart.\n */\n" +
      "export function evaluate() {}";
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/claim-reaper.mjs", content } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    // name 'claim-reaper' vs 'stale-claim-sweeper' is moderately similar; with the
    // description-overlap boost (claims, coordination, sessionstart all 4+ chars), the
    // top match must be stale-claim-sweeper and the reasons must include description-overlap.
    expect(r.topMatch?.id).toBe("stale-claim-sweeper");
    expect(r.topMatch?.reasons.includes("description-overlap")).toBe(true);
    expect(r.action).toBe("advise");
  });
});

// ── block-mode env override ─────────────────────────────────────────────────

describe("hook-creation-gate: block-mode override", () => {
  it("PRISM_HOOK_CREATION_GATE_BLOCK=1 promotes exact match to hard block", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claim-guard.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: { PRISM_HOOK_CREATION_GATE_BLOCK: "1" },
    });
    expect(r.action).toBe("block");
    expect(r.recommendation).toBe("skip");
  });

  it("PRISM_HOOK_CREATION_GATE_BLOCK=1 promotes high-conf overlap to hard block", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claim-guardx.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: { PRISM_HOOK_CREATION_GATE_BLOCK: "1" },
    });
    expect(r.action).toBe("block");
    expect(r.recommendation).toBe("extend");
  });

  it("PRISM_HOOK_CREATION_GATE_BLOCK=1 leaves mid-confidence (rename) as advisory", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claaim-gardd.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: { PRISM_HOOK_CREATION_GATE_BLOCK: "1" },
    });
    expect(r.action).toBe("advise");
    expect(r.recommendation).toBe("rename");
  });

  it("PRISM_HOOK_CREATION_GATE_BLOCK=other value does NOT promote (only '1')", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude/hooks/file-claim-guard.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: { PRISM_HOOK_CREATION_GATE_BLOCK: "true" },
    });
    expect(r.action).toBe("advise");
  });
});

// ── adversarial inputs ──────────────────────────────────────────────────────

describe("hook-creation-gate: adversarial inputs", () => {
  it("null stdin → allow (no crash)", () => {
    const r = evaluate({ stdin: null, registryPath: REGISTRY, fsImpl: makeFs({}), env: {} });
    expect(r.action).toBe("allow");
  });

  it("missing tool_input → allow", () => {
    const r = evaluate({ stdin: { tool_name: "Write" }, registryPath: REGISTRY, fsImpl: makeFs({}), env: {} });
    expect(r.action).toBe("allow");
  });

  it("non-string file_path → allow", () => {
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: 12345 } },
      registryPath: REGISTRY, fsImpl: makeFs({}), env: {},
    });
    expect(r.action).toBe("allow");
  });

  it("Windows backslash path is normalized to forward-slash for gating", () => {
    const fsImpl = makeFs({ files: { [REGISTRY]: FIXTURE_REGISTRY } });
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: ".claude\\hooks\\file-claim-guard.mjs", content: "" } },
      registryPath: REGISTRY, fsImpl, env: {},
    });
    expect(r.action).toBe("advise");
    expect(r.recommendation).toBe("skip");
  });
});
