// viz-first-redirect.test.mjs
// SYSTEM-VIZ-BRAIN-MS0/U-P3-VIZ-FIRST-REDIRECT-GLOB
//
// Tests the pure functions exported by viz-first-redirect.mjs:
//   - extractPattern: pulls tool+pattern from the PreToolUse input shape
//   - shouldQueryViz: gating predicate (regex/extension-wildcard skip rules)
//   - parseFindOutput: parses system-viz-query.mjs find stdout into hits[]
//   - formatInjection: renders hits into the additionalContext markdown block

import { describe, it } from "node:test";
import assert from "node:assert/strict";

async function reload() {
  const url = new URL("./viz-first-redirect.mjs", import.meta.url);
  return await import(url.href + "?t=" + Date.now());
}

describe("extractPattern", () => {
  it("pulls tool_name + pattern from PreToolUse input", async () => {
    const { extractPattern } = await reload();
    const res = extractPattern({ tool_name: "Grep", tool_input: { pattern: "MillKienzle" } });
    assert.deepEqual(res, { tool: "Grep", pattern: "MillKienzle" });
  });

  it("accepts camelCase toolName + toolInput aliases", async () => {
    const { extractPattern } = await reload();
    const res = extractPattern({ toolName: "Glob", toolInput: { pattern: "**/*.ts" } });
    assert.deepEqual(res, { tool: "Glob", pattern: "**/*.ts" });
  });

  it("returns null when input missing", async () => {
    const { extractPattern } = await reload();
    assert.equal(extractPattern(null), null);
    assert.equal(extractPattern(undefined), null);
    assert.equal(extractPattern("not-an-object"), null);
  });

  it("returns null when tool_input.pattern is not a string", async () => {
    const { extractPattern } = await reload();
    assert.equal(extractPattern({ tool_name: "Grep", tool_input: { pattern: 42 } }), null);
    assert.equal(extractPattern({ tool_name: "Grep", tool_input: {} }), null);
    assert.equal(extractPattern({ tool_name: "Grep" }), null);
  });
});

describe("shouldQueryViz", () => {
  it("approves a plain identifier", async () => {
    const { shouldQueryViz } = await reload();
    const r = shouldQueryViz("Grep", "MillKienzleEngine");
    assert.equal(r.ok, true);
    assert.equal(r.probe, "MillKienzleEngine");
  });

  it("strips path prefix to leaf identifier", async () => {
    const { shouldQueryViz } = await reload();
    const r = shouldQueryViz("Glob", "src/engines/MillKienzle.ts");
    assert.equal(r.ok, true);
    assert.equal(r.probe, "MillKienzle");
  });

  it("strips file extension", async () => {
    const { shouldQueryViz } = await reload();
    const r = shouldQueryViz("Grep", "MillKienzle.ts");
    assert.equal(r.ok, true);
    assert.equal(r.probe, "MillKienzle");
  });

  it("rejects Grep regex patterns (any metachar)", async () => {
    const { shouldQueryViz } = await reload();
    assert.equal(shouldQueryViz("Grep", "import.*Foo").ok, false);
    assert.equal(shouldQueryViz("Grep", "^export").ok, false);
    assert.equal(shouldQueryViz("Grep", "Foo|Bar").ok, false);
    assert.equal(shouldQueryViz("Grep", "[a-z]+").ok, false);
  });

  it("rejects pure-extension Globs", async () => {
    const { shouldQueryViz } = await reload();
    assert.equal(shouldQueryViz("Glob", "**/*.ts").ok, false);
    assert.equal(shouldQueryViz("Glob", "*.mjs").ok, false);
    assert.equal(shouldQueryViz("Glob", "**/*").ok, false);
  });

  it("ACCEPTS identifier-shaped Glob even with directory prefix", async () => {
    const { shouldQueryViz } = await reload();
    const r = shouldQueryViz("Glob", "engines/MillKienzle*.ts");
    // contains "*" so it's a glob — but for Glob tool that's fine; only Grep blocks metachars.
    assert.equal(r.ok, true);
    assert.equal(r.probe, "MillKienzle*");
  });

  it("rejects too-short pattern", async () => {
    const { shouldQueryViz } = await reload();
    assert.equal(shouldQueryViz("Grep", "ab").ok, false);
  });

  it("rejects too-long pattern", async () => {
    const { shouldQueryViz } = await reload();
    const longPat = "x".repeat(200);
    assert.equal(shouldQueryViz("Grep", longPat).ok, false);
  });

  it("rejects non-string pattern (defensive)", async () => {
    const { shouldQueryViz } = await reload();
    assert.equal(shouldQueryViz("Grep", null).ok, false);
    assert.equal(shouldQueryViz("Grep", 42).ok, false);
  });
});

describe("parseFindOutput", () => {
  it("parses real system-viz-query.mjs find output", async () => {
    const { parseFindOutput } = await reload();
    const sample = `Found 3 node(s) matching "wiki-precheck-inject":
  L10/architecture  vault.wiki.architecture.hooks.runtime.wiki-precheck-inject wiki-precheck-inject
  L8/wiki_entry  wiki.architecture.hooks_runtime_wiki-precheck-inject Hook — \`wiki-precheck-inject\`
  L6/hook_userpromptsubmit  core.hooks_cl.wiki-precheck-inject wiki-precheck-inject`;
    const hits = parseFindOutput(sample, 5);
    assert.equal(hits.length, 3);
    assert.equal(hits[0].kind, "L10/architecture");
    assert.equal(hits[0].id, "vault.wiki.architecture.hooks.runtime.wiki-precheck-inject");
    assert.equal(hits[0].name, "wiki-precheck-inject");
    assert.equal(hits[2].kind, "L6/hook_userpromptsubmit");
  });

  it("respects topK cap", async () => {
    const { parseFindOutput } = await reload();
    const sample = `Found 5 node(s) matching "foo":
  L1/a  id.a  name-a
  L2/b  id.b  name-b
  L3/c  id.c  name-c
  L4/d  id.d  name-d
  L5/e  id.e  name-e`;
    assert.equal(parseFindOutput(sample, 2).length, 2);
    assert.equal(parseFindOutput(sample, 100).length, 5);
  });

  it("returns [] for empty/no-match output", async () => {
    const { parseFindOutput } = await reload();
    assert.deepEqual(parseFindOutput("", 5), []);
    assert.deepEqual(parseFindOutput("Found 0 node(s) matching \"foo\":", 5), []);
    assert.deepEqual(parseFindOutput(null, 5), []);
    assert.deepEqual(parseFindOutput(undefined, 5), []);
  });

  it("skips malformed lines without throwing", async () => {
    const { parseFindOutput } = await reload();
    const sample = `Found 2 node(s) matching "foo":
GARBAGE LINE WITH NO LEADING SPACE
  L1/a  id.a  name-a
  not enough columns
  L2/b  id.b  name with spaces and special chars *!@#`;
    const hits = parseFindOutput(sample, 5);
    assert.equal(hits.length, 2);
    assert.equal(hits[0].name, "name-a");
    assert.equal(hits[1].name, "name with spaces and special chars *!@#");
  });
});

describe("formatInjection", () => {
  it("renders the markdown advisory block", async () => {
    const { formatInjection } = await reload();
    const hits = [
      { kind: "L7/engine", id: "engines.MillKienzleEngine", name: "MillKienzleEngine" },
      { kind: "L8/wiki", id: "wiki.MillKienzle", name: "wiki — MillKienzle" },
    ];
    const out = formatInjection(hits, "MillKienzle");
    assert.ok(out.includes("## 🔭 system-viz first"));
    assert.ok(out.includes("2 graph node(s) match"));
    assert.ok(out.includes("MillKienzle"));
    assert.ok(out.includes("L7/engine"));
    assert.ok(out.includes("engines.MillKienzleEngine"));
    assert.ok(out.includes("PRISM_VIZ_FIRST_REDIRECT_DISABLE"));
  });

  it("returns null for empty hits (caller should skip injection)", async () => {
    const { formatInjection } = await reload();
    assert.equal(formatInjection([], "anything"), null);
  });
});
