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

describe("formatInjection -- synergy-ask tool-side reflex (gated >=3 hits)", () => {
  it("appends the synergy-ask pointer for a >=3-hit concept grep, threading the probe", async () => {
    const { formatInjection } = await reload();
    const hits = [
      { kind: "L7/engine", id: "engines.A", name: "AEngine" },
      { kind: "L7/engine", id: "engines.B", name: "BEngine" },
      { kind: "L8/wiki", id: "wiki.C", name: "CWiki" },
    ];
    const out = formatInjection(hits, "kienzle");
    assert.ok(out.includes("synergy-ask.mjs"), ">=3 hits -> synergy-ask pointer present");
    assert.ok(out.includes('synergy-ask.mjs "kienzle"'), "probe threaded into the suggested command");
    assert.ok(out.includes("graph nodes with Obsidian-vault content"), "names the graph+vault join");
  });

  it("does NOT append the synergy-ask pointer for a 2-hit result (gate: needs >=3)", async () => {
    const { formatInjection } = await reload();
    const hits = [
      { kind: "L7/engine", id: "engines.A", name: "AEngine" },
      { kind: "L8/wiki", id: "wiki.B", name: "BWiki" },
    ];
    const out = formatInjection(hits, "foo");
    assert.ok(!out.includes("synergy-ask"), "2 hits is a small disambiguation, not a concept grep");
  });

  it("does NOT append the synergy-ask pointer on the single exact-match path", async () => {
    const { formatInjection } = await reload();
    const hits = [{ kind: "L7/engine", id: "engines.Foo", name: "Foo" }];
    const out = formatInjection(hits, "Foo"); // exact name match -> exact-match banner, no synergy
    assert.ok(!out.includes("synergy-ask"), "a single known node does not need the combiner");
  });
});

// ============================================================================
// [docs:N] brain-coverage marker (U-SV-NOTECOUNT-BRIDGE, sierra) — parseFindOutput
// strips a trailing ` [docs:N]` marker emitted by `system-viz-query find` and
// captures it into hit.noteCount, so the model routes to DOCUMENTED nodes first
// (memory/wiki × context-retention bridge). The marker is the structural
// brain-coverage count from the find-cache projection — NOT wiki content.
// ============================================================================
describe("parseFindOutput — [docs:N] brain-coverage marker", () => {
  it("captures + strips a trailing [docs:N] marker into noteCount, name stays clean", async () => {
    const { parseFindOutput } = await reload();
    const sample = `Found 2 node(s) matching "kienzle":
  L7/engine  engines.MillKienzleEngine    MillKienzleEngine [docs:3]
  L8/wiki  wiki.MillKienzle              wiki — MillKienzle [docs:1]`;
    const hits = parseFindOutput(sample, 5);
    assert.equal(hits.length, 2);
    assert.equal(hits[0].name, "MillKienzleEngine", "marker stripped from name");
    assert.equal(hits[0].noteCount, 3);
    assert.equal(hits[1].name, "wiki — MillKienzle", "label with spaces + em-dash preserved");
    assert.equal(hits[1].noteCount, 1);
  });

  it("lines WITHOUT the marker parse unchanged with noteCount 0 (backward compat)", async () => {
    const { parseFindOutput } = await reload();
    const sample = `Found 1 node(s) matching "foo":
  L6/built  core.hooks.foo                foo-hook`;
    const hits = parseFindOutput(sample, 5);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].name, "foo-hook");
    assert.equal(hits[0].noteCount, 0, "no marker → noteCount 0");
  });

  it("does NOT false-match digits or brackets that are not the [docs:N] marker", async () => {
    const { parseFindOutput } = await reload();
    const sample = `Found 3 node(s) matching "x":
  L1/a  id.a  Engine2
  L1/b  id.b  arr[5]
  L1/c  id.c  thing [docs:notanumber]`;
    const hits = parseFindOutput(sample, 5);
    assert.equal(hits[0].name, "Engine2");
    assert.equal(hits[0].noteCount, 0, "trailing digit is not a marker");
    assert.equal(hits[1].name, "arr[5]");
    assert.equal(hits[1].noteCount, 0, "[5] is not [docs:N]");
    assert.equal(hits[2].name, "thing [docs:notanumber]");
    assert.equal(hits[2].noteCount, 0, "[docs:non-digit] is not a marker");
  });
});

describe("formatInjection — brain-coverage surfacing", () => {
  it("appends (N docs) to brain-backed hits + a legend in the footer", async () => {
    const { formatInjection } = await reload();
    const hits = [
      { kind: "L7/engine", id: "engines.Foo", name: "FooEngine", noteCount: 3 },
      { kind: "L8/wiki", id: "wiki.Bar", name: "BarWiki", noteCount: 0 },
    ];
    const out = formatInjection(hits, "Foo");
    assert.ok(out.includes("(3 docs)"), "brain-backed hit shows doc count");
    assert.ok(!out.includes("(0 docs)"), "undocumented hit shows NO marker");
    assert.ok(out.includes("wiki/memory entries"), "footer legend present when any brain-backed");
  });

  it("omits the legend when no hit is brain-backed", async () => {
    const { formatInjection } = await reload();
    const hits = [
      { kind: "L7/engine", id: "engines.Foo", name: "FooEngine", noteCount: 0 },
      { kind: "L8/wiki", id: "wiki.Bar", name: "BarWiki" },
    ];
    const out = formatInjection(hits, "Foo");
    assert.ok(!out.includes("docs)"), "no doc markers when nothing brain-backed");
    assert.ok(!out.includes("wiki/memory entries"), "no legend when nothing brain-backed");
  });

  it("exact-match banner surfaces (N docs) when the single hit is brain-backed", async () => {
    const { formatInjection } = await reload();
    const hits = [{ kind: "L7/engine", id: "engines.Foo", name: "Foo", noteCount: 5 }];
    const out = formatInjection(hits, "Foo");
    assert.ok(out.includes("EXACT MATCH"), "single exact hit → exact-match banner");
    assert.ok(out.includes("(5 docs)"), "exact-match banner surfaces brain coverage");
  });
});

// ============================================================================
// emit ↔ parse FORMAT CONTRACT — the line `system-viz-query find` emits must
// round-trip through parseFindOutput to the right {name, noteCount}. Mirrors the
// EXACT emit template (no graph load) so a future drift on either side fails here
// instead of silently zeroing noteCount fleet-wide (1060 find calls/day).
// ============================================================================
describe("emit↔parse format contract", () => {
  // Mirror of the per-hit line in scripts/system-viz-query.mjs `find` HUMAN branch:
  //   `  ${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${label}${ noteCount>0 ? ' [docs:'+n+']' : '' }`
  function emitLine(h) {
    const note = (h.noteCount || 0) > 0 ? ` [docs:${h.noteCount}]` : "";
    return `  ${h.layer}/${h.subgroup ?? "_"}  ${String(h.id).padEnd(28)} ${String(h.label).split("\n")[0]}${note}`;
  }

  it("round-trips a brain-backed emit line to {name, noteCount}", async () => {
    const { parseFindOutput } = await reload();
    const node = { layer: "L7", subgroup: "engine", id: "engines.MillKienzleEngine", label: "MillKienzleEngine", noteCount: 4 };
    const stdout = `Found 1 node(s) matching "kienzle":\n${emitLine(node)}`;
    const hits = parseFindOutput(stdout, 5);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "L7/engine");
    assert.equal(hits[0].id, "engines.MillKienzleEngine");
    assert.equal(hits[0].name, "MillKienzleEngine", "emit→parse name is clean");
    assert.equal(hits[0].noteCount, 4, "emit→parse noteCount preserved");
  });

  it("round-trips an undocumented emit line to noteCount 0", async () => {
    const { parseFindOutput } = await reload();
    const node = { layer: "L6", subgroup: "built", id: "core.hooks.foo", label: "foo-hook", noteCount: 0 };
    const stdout = `Found 1 node(s) matching "foo":\n${emitLine(node)}`;
    const hits = parseFindOutput(stdout, 5);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].name, "foo-hook");
    assert.equal(hits[0].noteCount, 0);
  });
});
