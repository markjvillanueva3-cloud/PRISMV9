/**
 * HookManifestEngine.test.ts — HOOK-MANIFEST-DAG-MS26 / P0-U01
 *
 * Behaviour tests for the static hook manifest generator. Uses an in-memory
 * fake filesystem (injectable via `fsImpl`) for deterministic unit coverage,
 * plus one smoke test against the real repo to validate the live scan path and
 * the self-consistency invariants.
 */

import { describe, it, expect } from "vitest";
import {
  HookManifestEngine,
  hookManifestEngine,
  type ManifestFS,
} from "../engines/HookManifestEngine.js";
import { HookManifestSchema, HOOK_MANIFEST_SCHEMA_VERSION } from "../schemas/hookManifestSchema.js";

// ── In-memory fake FS ────────────────────────────────────────────────────────

interface FakeNode {
  type: "file" | "dir";
  size?: number;
  content?: string;
}

function makeFakeFS(tree: Record<string, FakeNode>): ManifestFS {
  // Normalise keys to forward slashes; auto-create ancestor dirs.
  const nodes = new Map<string, FakeNode>();
  for (const [k, v] of Object.entries(tree)) {
    const key = k.replace(/\\/g, "/").replace(/\/+$/, "");
    nodes.set(key, v);
    // ancestors
    let p = key;
    while (p.includes("/")) {
      p = p.slice(0, p.lastIndexOf("/"));
      if (p && !nodes.has(p)) nodes.set(p, { type: "dir" });
    }
  }
  const norm = (p: nodeFsPathLike): string => String(p).replace(/\\/g, "/").replace(/\/+$/, "");
  return {
    existsSync(p) {
      return nodes.has(norm(p));
    },
    statSync(p) {
      const n = nodes.get(norm(p));
      if (!n) throw new Error(`ENOENT: ${String(p)}`);
      const isDir = n.type === "dir";
      return {
        isDirectory: () => isDir,
        isFile: () => !isDir,
        size: n.size ?? (n.content ? Buffer.byteLength(n.content, "utf-8") : 0),
      } as ReturnType<ManifestFS["statSync"]>;
    },
    readdirSync(p) {
      const dir = norm(p);
      if (nodes.get(dir)?.type !== "dir") throw new Error(`ENOTDIR: ${String(p)}`);
      const out: string[] = [];
      for (const key of nodes.keys()) {
        if (key === dir) continue;
        if (key.startsWith(dir + "/")) {
          const rest = key.slice(dir.length + 1);
          if (!rest.includes("/")) out.push(rest);
        }
      }
      return out.sort();
    },
    readFileSync(p, _enc) {
      const n = nodes.get(norm(p));
      if (!n || n.type !== "file") throw new Error(`ENOENT: ${String(p)}`);
      return n.content ?? "";
    },
  };
}
type nodeFsPathLike = Parameters<ManifestFS["existsSync"]>[0];

// ── Fixture ──────────────────────────────────────────────────────────────────

const REPO = "/repo";

function fixtureFS(): ManifestFS {
  const settings = {
    hooks: {
      SessionStart: [
        {
          matcher: "",
          hooks: [
            { type: "command", command: `"node" ${REPO}/.claude/hooks/alpha.mjs`, timeout: 1500, continueOnError: false },
          ],
        },
      ],
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: `node ${REPO}/.claude/hooks/beta.mjs --b`, timeout: 2000 }] },
        { matcher: "Edit|Write", hooks: [{ type: "command", command: `node ${REPO}/.claude/hooks/beta.mjs --e` }] },
      ],
      Stop: [
        {
          matcher: "",
          hooks: [
            { type: "command", command: `node ${REPO}/.claude/hooks/ghost.mjs` }, // dangling: not on disk
            { type: "command", command: `echo no-script-here` }, // not a script command → ignored
          ],
        },
      ],
    },
  };
  return makeFakeFS({
    [`${REPO}/.claude`]: { type: "dir" },
    [`${REPO}/.claude/hooks`]: { type: "dir" },
    [`${REPO}/.claude/hooks/alpha.mjs`]: { type: "file", content: "/** Alpha hook — does the thing. */\nexport default function alpha(){}\n", size: 64 },
    [`${REPO}/.claude/hooks/beta.mjs`]: { type: "file", content: "// beta hook\nexport function beta(){}\nexport const BETA_VERSION = 2;\n" },
    [`${REPO}/.claude/hooks/gamma.mjs`]: { type: "file", content: "export function gamma(){}\n" }, // orphan (no wiring)
    [`${REPO}/.claude/hooks/README.md`]: { type: "file", content: "# not a hook" }, // wrong ext → skipped
    [`${REPO}/.claude/hooks/helper.test.mjs`]: { type: "file", content: "// test file" }, // SKIP_FILE → skipped
    [`${REPO}/mcp-server`]: { type: "dir" },
    [`${REPO}/mcp-server/src`]: { type: "dir" },
    [`${REPO}/mcp-server/src/hooks`]: { type: "dir" },
    [`${REPO}/mcp-server/src/hooks/SafetyHooks.ts`]: {
      type: "file",
      content: "/**\n * @module hooks/SafetyHooks\n * Safety hooks for the MCP server.\n */\nexport function checkSafety(){ return true; }\nexport const SAFETY_FLOOR = 0.7;\n",
    },
    [`${REPO}/mcp-server/src/hooks/index.ts`]: { type: "file", content: "export { checkSafety } from './SafetyHooks.js';\n" },
    [`${REPO}/.claude/settings.json`]: { type: "file", content: JSON.stringify(settings) },
  });
}

const FIXTURE_OPTS = (fs: ManifestFS) => ({
  repoRoot: REPO,
  fsImpl: fs,
  hookDirs: [
    { dir: ".claude/hooks", kind: "claude-mjs" as const },
    { dir: "mcp-server/src/hooks", kind: "mcp-ts" as const },
  ],
  settingsFiles: [`${REPO}/.claude/settings.json`],
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("HookManifestEngine", () => {
  it("getCapabilities/getInfo expose the API surface", () => {
    const caps = hookManifestEngine.getCapabilities();
    expect(caps.map((c) => c.name)).toEqual(expect.arrayContaining(["generate", "generateAndWrite", "loadManifest"]));
    expect(hookManifestEngine.getInfo().name).toBe("HookManifestEngine");
    expect(hookManifestEngine.getInfo().domain).toContain("hooks");
  });

  it("validate() accepts undefined/{} and rejects malformed options", () => {
    const e = new HookManifestEngine();
    expect(e.validate(undefined)).toBeNull();
    expect(e.validate({})).toBeNull();
    expect(e.validate("nope")).toMatch(/options object/);
    expect(e.validate({ repoRoot: 123 })).toMatch(/repoRoot/);
    expect(e.validate({ hookDirs: "x" })).toMatch(/hookDirs/);
  });

  it("generate() produces a schema-valid manifest", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    expect(() => HookManifestSchema.parse(m)).not.toThrow();
    expect(m.schemaVersion).toBe(HOOK_MANIFEST_SCHEMA_VERSION);
    expect(m.repoRoot).toBe(REPO);
    expect(typeof m.generatedAt).toBe("string");
  });

  it("scans both hook dirs, skips non-scripts and test files", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    const files = m.hooks.map((h) => h.file).sort();
    expect(files).toEqual([
      ".claude/hooks/alpha.mjs",
      ".claude/hooks/beta.mjs",
      ".claude/hooks/gamma.mjs",
      "mcp-server/src/hooks/SafetyHooks.ts",
      "mcp-server/src/hooks/index.ts",
    ]);
    expect(m.stats.totalHooks).toBe(5);
    expect(m.stats.byKind).toEqual({ "claude-mjs": 3, "mcp-ts": 2 });
  });

  it("extracts the first doc/comment line and exported symbols", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    const alpha = m.hooks.find((h) => h.id === "alpha")!;
    expect(alpha.description).toBe("Alpha hook — does the thing.");
    expect(alpha.exports).toContain("default");
    const beta = m.hooks.find((h) => h.id === "beta")!;
    expect(beta.description).toBe("beta hook");
    expect(beta.exports).toEqual(expect.arrayContaining(["beta", "BETA_VERSION"]));
    const safety = m.hooks.find((h) => h.id === "SafetyHooks")!;
    expect(safety.description).toBe("Safety hooks for the MCP server."); // first non-@ JSDoc line
    expect(safety.exports).toEqual(expect.arrayContaining(["checkSafety", "SAFETY_FLOOR"]));
    expect(beta.lineCount).toBeGreaterThan(0);
    expect(alpha.sizeBytes).toBe(64); // honours st.size
  });

  it("joins wirings: hard-block, multi-matcher, and orphan detection", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    const alpha = m.hooks.find((h) => h.id === "alpha")!;
    expect(alpha.wired).toBe(true);
    expect(alpha.hardBlock).toBe(true); // continueOnError: false
    expect(alpha.events).toEqual(["SessionStart"]);
    expect(alpha.wirings).toHaveLength(1);
    expect(alpha.wirings[0].timeoutMs).toBe(1500);
    expect(alpha.wirings[0].continueOnError).toBe(false);

    const beta = m.hooks.find((h) => h.id === "beta")!;
    expect(beta.wired).toBe(true);
    expect(beta.hardBlock).toBe(false);
    expect(beta.events).toEqual(["PreToolUse"]);
    expect(beta.wirings).toHaveLength(2);
    expect(beta.wirings.map((w) => w.matcher).sort()).toEqual(["Bash", "Edit|Write"]);
    expect(beta.wirings.map((w) => w.args).sort()).toEqual(["--b", "--e"]);

    const gamma = m.hooks.find((h) => h.id === "gamma")!;
    expect(gamma.wired).toBe(false);
    expect(gamma.events).toEqual([]);
    expect(gamma.wirings).toEqual([]);

    expect(m.stats.wired).toBe(2);
    expect(m.stats.orphaned).toBe(3); // gamma + SafetyHooks + index.ts (the .ts files aren't .mjs harness hooks)
    expect(m.stats.hardBlock).toBe(1);
  });

  it("records dangling refs (wired path with no file on disk)", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    expect(m.stats.danglingRefs).toBe(1);
    expect(m.danglingRefs).toHaveLength(1);
    expect(m.danglingRefs[0].ref).toBe(".claude/hooks/ghost.mjs");
    expect(m.danglingRefs[0].event).toBe("Stop");
  });

  it("builds an event→files map in canonical event order", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    expect(Object.keys(m.events)).toEqual(["SessionStart", "PreToolUse"]); // Stop had only a dangling ref → not present
    expect(m.events.SessionStart).toEqual([".claude/hooks/alpha.mjs"]);
    expect(m.events.PreToolUse).toEqual([".claude/hooks/beta.mjs"]); // listed once even with 2 matchers
    expect(m.stats.eventTypes).toEqual(["PreToolUse", "SessionStart", "Stop"].sort()); // Stop observed in settings even if only dangling
  });

  it("is self-consistent (counts add up, every event ref resolves to a hook, sorted)", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    expect(m.stats.wired + m.stats.orphaned).toBe(m.stats.totalHooks);
    expect(m.hooks.length).toBe(m.stats.totalHooks);
    const fileSet = new Set(m.hooks.map((h) => h.file));
    for (const refs of Object.values(m.events)) for (const f of refs) expect(fileSet.has(f)).toBe(true);
    const sorted = [...m.hooks].sort((a, b) => a.file.localeCompare(b.file));
    expect(m.hooks).toEqual(sorted);
  });

  it("loadManifest() round-trips a generated manifest", () => {
    const m = hookManifestEngine.generate(FIXTURE_OPTS(fixtureFS()));
    const json = JSON.stringify(m, null, 2) + "\n";
    const loaded = hookManifestEngine.loadManifest("/anywhere/hook-manifest.json", {
      existsSync: () => true,
      statSync: () => ({ isDirectory: () => false, isFile: () => true, size: json.length }) as ReturnType<ManifestFS["statSync"]>,
      readdirSync: () => [],
      readFileSync: () => json,
    });
    expect(loaded).toEqual(m);
  });

  it("loadManifest() rejects a malformed manifest", () => {
    expect(() =>
      hookManifestEngine.loadManifest("/x.json", {
        existsSync: () => true,
        statSync: () => ({ isDirectory: () => false, isFile: () => true, size: 2 }) as ReturnType<ManifestFS["statSync"]>,
        readdirSync: () => [],
        readFileSync: () => `{"schemaVersion":999}`,
      }),
    ).toThrow();
  });

  it("missing hook dirs and unparseable settings are tolerated", () => {
    const m = hookManifestEngine.generate({
      repoRoot: REPO,
      fsImpl: makeFakeFS({
        [`${REPO}/.claude`]: { type: "dir" },
        // no hooks dir, no mcp-server/src/hooks
        [`${REPO}/.claude/settings.json`]: { type: "file", content: "{ not json" },
      }),
      hookDirs: [
        { dir: ".claude/hooks", kind: "claude-mjs" as const },
        { dir: "mcp-server/src/hooks", kind: "mcp-ts" as const },
      ],
      settingsFiles: [`${REPO}/.claude/settings.json`, `${REPO}/.claude/settings.local.json` /* missing */],
    });
    expect(m.stats.totalHooks).toBe(0);
    expect(m.hooks).toEqual([]);
    expect(m.settingsFiles).toEqual([]); // unparseable one not recorded
    expect(m.hookDirs).toEqual([]);
  });

  it("resolveRepoRoot walks up to a dir containing .claude/hooks + mcp-server", () => {
    const fs = makeFakeFS({
      "/a/b/c/d/e": { type: "dir" },
      "/a/b/.claude/hooks": { type: "dir" },
      "/a/b/mcp-server": { type: "dir" },
      // a NESTED mcp-server (no .claude/hooks beside it) must NOT pass as a root
      "/a/b/mcp-server/mcp-server": { type: "dir" },
      "/a/b/mcp-server/.claude": { type: "dir" }, // mcp-server-scoped .claude, but no hooks/ → not a root
    });
    expect(new HookManifestEngine().resolveRepoRoot("/a/b/c/d/e", fs)).toBe("/a/b");
    expect(new HookManifestEngine().resolveRepoRoot("/a/b/mcp-server", fs)).toBe("/a/b"); // walks past the false marker
    // no marker dir → returns the start dir
    const bare = makeFakeFS({ "/x/y": { type: "dir" } });
    expect(new HookManifestEngine().resolveRepoRoot("/x/y", bare)).toBe("/x/y");
  });

  it("execute() runs validate→executeImpl and returns the manifest", async () => {
    const m = (await new HookManifestEngine().execute(FIXTURE_OPTS(fixtureFS()))) as ReturnType<HookManifestEngine["generate"]>;
    expect(m.stats.totalHooks).toBe(5);
  });

  // ── Real-repo smoke (live scan path + invariants) ──────────────────────────
  it("smoke: scans the real PRISM repo and is self-consistent", () => {
    const m = hookManifestEngine.generate(); // default opts → resolveRepoRoot from cwd
    expect(() => HookManifestSchema.parse(m)).not.toThrow();
    // there are hundreds of .claude/hooks/*.mjs + dozens of mcp-server/src/hooks/*.ts
    expect(m.stats.totalHooks).toBeGreaterThan(100);
    expect(m.stats.byKind["claude-mjs"]).toBeGreaterThan(50);
    expect(m.stats.byKind["mcp-ts"]).toBeGreaterThan(10);
    expect(m.stats.wired + m.stats.orphaned).toBe(m.stats.totalHooks);
    expect(m.hooks.length).toBe(m.stats.totalHooks);
    // every file referenced by an event must be a real scanned hook
    const fileSet = new Set(m.hooks.map((h) => h.file));
    for (const refs of Object.values(m.events)) for (const f of refs) expect(fileSet.has(f)).toBe(true);
    // every hook has the basic shape
    for (const h of m.hooks) {
      expect(h.file).toBeTruthy();
      expect(["claude-mjs", "mcp-ts", "other"]).toContain(h.kind);
      expect(typeof h.lineCount).toBe("number");
      expect(Array.isArray(h.events)).toBe(true);
    }
  });
});
