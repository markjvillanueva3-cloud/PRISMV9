/**
 * psn-synergy-collect.test.mjs — PSN-SYNERGY-COLLECT-MS2 regression tests
 *
 * Locks in the two MS2 fixes' load-bearing helpers (R9 — tests verify intent):
 *   - countNeedleStreaming: chunked entry-count over a large JSON index without
 *     parsing it; correctness across forced chunk-boundary splits + adjacency.
 *   - scanObsidianOutEdges: honest subsystem-mention tally over memory heads — a
 *     leg that is never referenced MUST stay 0 (no vanity inflation, per the
 *     formulas-pattern lesson).
 *
 * Run: node --test scripts/psn-synergy-collect.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { countNeedleStreaming, streamSourceHistogram, scanObsidianOutEdges, scanWikiOutEdges, countPatternsInFiles, scanLegOutEdges, scanDispatcherOutEdges, stripFrontmatter, PSN_OUT_PATTERNS, PSN_LEG_OWNER } from "./psn-synergy-collect.mjs";

const NEEDLE = '"embedding":[';

function withTmp(fn) {
  const dir = mkdtempSync(join(tmpdir(), "psn-synergy-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("countNeedleStreaming counts every delimiter at the default chunk size", () => {
  withTmp((dir) => {
    const p = join(dir, "x.json");
    writeFileSync(p, `a${NEEDLE}1]b${NEEDLE}2]c${NEEDLE}3]d`);
    assert.equal(countNeedleStreaming(p, NEEDLE), 3);
  });
});

test("countNeedleStreaming: a needle split across a chunk boundary is neither lost nor double-counted", () => {
  withTmp((dir) => {
    const p = join(dir, "y.json");
    // 5 delimiters at varying offsets; chunk sizes >= needle.length (13) but small
    // enough that needles straddle read boundaries at different alignments.
    writeFileSync(p, `XX${NEEDLE}a]${NEEDLE}b]${NEEDLE}c]${NEEDLE}d]${NEEDLE}e]ZZ`);
    for (const cs of [13, 14, 16, 17, 23, 31, 64]) {
      assert.equal(countNeedleStreaming(p, NEEDLE, cs), 5, `chunkSize=${cs}`);
    }
  });
});

test("countNeedleStreaming: adjacent needles count separately; zero matches returns 0", () => {
  withTmp((dir) => {
    const adj = join(dir, "adj.txt");
    writeFileSync(adj, `${NEEDLE}${NEEDLE}`);
    // chunk 16 splits the second (13-char) needle across a boundary.
    assert.equal(countNeedleStreaming(adj, NEEDLE, 16), 2);
    const none = join(dir, "none.txt");
    writeFileSync(none, "no delimiters here at all");
    assert.equal(countNeedleStreaming(none, NEEDLE, 16), 0);
  });
});

test("countNeedleStreaming: missing file returns 0 (fail-soft, no throw)", () => {
  assert.equal(countNeedleStreaming(join(tmpdir(), "definitely-not-here-psn.json"), NEEDLE), 0);
});

test("scanObsidianOutEdges tallies real subsystem references from memory heads", () => {
  withTmp((dir) => {
    const a = join(dir, "a.md");
    writeFileSync(a, "uses TribalKnowledgeEngine + system-viz ghost-roost + octopus consensus-ledger");
    const b = join(dir, "b.md");
    writeFileSync(b, "GraphSAGE GNN node-embedding via prism_operating_system and import from algorithms/foo");
    const c = scanObsidianOutEdges([a, b]);
    assert.ok(c.tribal >= 1, "tribal referenced");
    assert.ok(c.system_viz >= 1, "system_viz referenced");
    assert.ok(c.prism_ai >= 1, "prism_ai referenced (octopus/consensus)");
    assert.ok(c.nn_gnn >= 1, "nn_gnn referenced (GraphSAGE/GNN)");
    assert.ok(c.prism_os >= 1, "prism_os referenced");
    assert.ok(c.algorithms >= 1, "algorithms referenced");
  });
});

test("scanObsidianOutEdges: an unreferenced leg stays 0 — no vanity inflation (R12)", () => {
  withTmp((dir) => {
    const f = join(dir, "c.md");
    // Mentions the english word "formula" but NO /formulas/ path or [[formula- wikilink.
    writeFileSync(f, "this note discusses a cutting formula and another formula entirely");
    const c = scanObsidianOutEdges([f]);
    assert.equal(c.formulas, 0, "bare word 'formula' must NOT count as a formulas-leg edge");
  });
});

test("scanObsidianOutEdges: empty input yields all-zero counts", () => {
  const c = scanObsidianOutEdges([]);
  for (const k of Object.keys(c)) assert.equal(c[k], 0, `${k} starts at 0`);
});

test("scanWikiOutEdges counts [[wikilinks]] + memory backlinks + subsystem refs", () => {
  withTmp((dir) => {
    const a = join(dir, "entry.md");
    writeFileSync(a, "See [[gnn-node-embedding-bridge]] and [[psn-definition]]; per reference_foo_bar and feedback_baz. Uses system-viz + GraphSAGE + tribal tips + algorithms/lib.");
    const c = scanWikiOutEdges([a]);
    assert.ok(c.obsidian_brain >= 3, "wikilinks + reference_/feedback_ count toward the memory/obsidian leg");
    assert.ok(c.system_viz >= 1, "system_viz");
    assert.ok(c.nn_gnn >= 1, "nn_gnn (GraphSAGE)");
    assert.ok(c.tribal >= 1, "tribal");
    assert.ok(c.algorithms >= 1, "algorithms");
  });
});

test("countPatternsInFiles: generic tally is bounded and zero-safe", () => {
  withTmp((dir) => {
    const f = join(dir, "g.md");
    writeFileSync(f, "alpha alpha beta");
    const c = countPatternsInFiles([f], { a: /alpha/g, b: /beta/g, z: /gamma/g });
    assert.equal(c.a, 2);
    assert.equal(c.b, 1);
    assert.equal(c.z, 0, "unmatched pattern stays 0");
    // empty input → all zero
    const e = countPatternsInFiles([], { a: /alpha/g });
    assert.equal(e.a, 0);
  });
});

test("streamSourceHistogram tallies entry provenance; boundary-safe + no double-count", () => {
  withTmp((dir) => {
    const p = join(dir, "idx.json");
    // 10 wiki + 5 memory + 3 external, padded so the JSON is well over the chunk floor (65)
    // and source tokens straddle read boundaries at the small chunk sizes.
    const e = [];
    for (let i = 0; i < 10; i++) e.push('{"source":"wiki","t":"padpadpadpad"}');
    for (let i = 0; i < 5; i++) e.push('{"source":"memory","t":"padpadpadpad"}');
    for (let i = 0; i < 3; i++) e.push('{"source":"external","t":"padpadpadpad"}');
    writeFileSync(p, "[" + e.join(",") + "]");
    for (const cs of [65, 100, 257, 1 << 20]) {
      const h = streamSourceHistogram(p, cs);
      assert.equal(h.wiki, 10, `wiki @cs=${cs}`);
      assert.equal(h.memory, 5, `memory @cs=${cs}`);
      assert.equal(h.external, 3, `external @cs=${cs}`);
    }
  });
});

test("streamSourceHistogram: missing file → empty object (fail-soft)", () => {
  const h = streamSourceHistogram(join(tmpdir(), "nope-psn-idx.json"));
  assert.equal(Object.keys(h).length, 0);
});

// ── PSN-SYNERGY-COLLECT-MS3 — five-leg out-edge recovery ──────────────────────

test("PSN_OUT_PATTERNS: code-aware detectors match real refs, not bare english words (R12)", () => {
  withTmp((dir) => {
    const f = join(dir, "alg.ts");
    writeFileSync(
      f,
      [
        'import { KIENZLE_KC11 } from "../physics/constants";',   // → formulas
        'import { GraphSAGEEngine } from "../engines/GraphSAGEEngine";', // → engines (+nn_gnn)
        "// per [[reference_psn_synergy_collect_ms0]] and knowledge/memories/feedback_psn.md", // → memories (wikilink + path)
        "// see knowledge/wiki/architecture/foo for the derivation",  // → wiki
      ].join("\n"),
    );
    const c = countPatternsInFiles([f], PSN_OUT_PATTERNS);
    assert.ok(c.formulas >= 1, "physics/constants import → formulas edge");
    assert.ok(c.engines >= 1, "FooEngine / /engines/ → engines edge");
    assert.ok(c.memories >= 2, "[[reference_…]] wikilink + knowledge/memories path → memories edge");
    assert.ok(c.wiki >= 1, "knowledge/wiki path → wiki edge");

    const bare = join(dir, "bare.ts");
    // lowercase 'engine', the word 'formula', the word 'wiki' — none are real refs.
    writeFileSync(bare, "// this engine computes a formula; check the wiki sometime");
    const b = countPatternsInFiles([bare], PSN_OUT_PATTERNS);
    assert.equal(b.engines, 0, "lowercase 'engine' is not an engine ref");
    assert.equal(b.formulas, 0, "bare 'formula' is not a formulas-leg ref");
    assert.equal(b.wiki, 0, "bare 'wiki' (no path) is not a wiki ref");
  });
});

test("memories detector does NOT match control-theory identifiers (3-of-3 arm-A P0-2 fix)", () => {
  withTmp((dir) => {
    // mcp-server/src/algorithms is PID/LQR/Kalman code: reference_signal / feedback_gain are
    // standard variable names, NOT references to the obsidian/memories leg. They must score 0.
    const f = join(dir, "pid.ts");
    writeFileSync(
      f,
      [
        "export function pidController(reference_signal: number, feedback_gain: number) {",
        "  const reference_trajectory = reference_signal * 2;",
        "  const feedback_term = feedback_gain * 0.5;",
        "  return reference_trajectory - feedback_term;",
        "}",
      ].join("\n"),
    );
    const c = countPatternsInFiles([f], PSN_OUT_PATTERNS);
    assert.equal(c.memories, 0, "bare reference_/feedback_ identifiers are NOT memory edges (no path/.md/wikilink)");
    // but a genuine memory reference WITH context still counts
    const g = join(dir, "real.ts");
    writeFileSync(g, "// grounded in [[feedback_psn_definition]] and reference_foo.md");
    assert.ok(countPatternsInFiles([g], PSN_OUT_PATTERNS).memories >= 2, "real memory refs still count");
  });
});

test("scanLegOutEdges: drops the self key and counts real cross-leg edges", () => {
  withTmp((dir) => {
    const f = join(dir, "alg.ts");
    writeFileSync(
      f,
      'import { X } from "../physics/constants";\nimport { FooEngine } from "../engines/FooEngine";\n// import from algorithms/local',
    );
    const c = scanLegOutEdges([f], "algorithms");
    assert.equal(c.algorithms, undefined, "self key 'algorithms' is deleted (no self-loop)");
    assert.ok(c.engines >= 1, "algorithms → engines counted");
    assert.ok(c.formulas >= 1, "algorithms → formulas counted (physics/constants)");
  });
});

test("scanLegOutEdges: per-file BINARY presence — repeated refs in one file count once (3-of-3 P0-1/P1)", () => {
  withTmp((dir) => {
    // A file that references engines 5× and the graph-path line (which raw-counts system_viz 2×)
    // must contribute exactly 1 to each peer — the fix for the 2×/3×/template-multiplier inflation.
    const f = join(dir, "many.ts");
    writeFileSync(
      f,
      [
        "import { AEngine } from '../engines/AEngine';",
        "import { BEngine } from '../engines/BEngine';",
        "import { CEngine } from '../engines/CEngine';",
        "// graph node: state/shared/system-viz/system-graph.json",
      ].join("\n"),
    );
    const c = scanLegOutEdges([f], "algorithms");
    assert.equal(c.engines, 1, "5+ engine mentions in ONE file → binary 1, not raw ~9");
    assert.equal(c.system_viz, 1, "graph-path line matched twice by raw regex → binary 1");
    // contrast: raw mode (default) DOES sum — proves perFile is what collapses it
    const raw = countPatternsInFiles([f], PSN_OUT_PATTERNS);
    assert.ok(raw.engines > 1, "raw mode still sums (perFile is the collapsing knob)");
  });
});

test("scanLegOutEdges: generator `Live graph:` membership footer is NOT an outbound system_viz edge (3-of-3 re-review P1)", () => {
  withTmp((dir) => {
    // Every auto-gen formula stub carries this identical footer declaring its OWN graph node —
    // inbound membership, not an outbound reference. It must score 0 via scanLegOutEdges.
    const stub = join(dir, "formula.md");
    writeFileSync(stub, "# Formula — Foo\nBody.\n- Live graph: `state/shared/system-viz/system-graph.json`\n");
    assert.equal(scanLegOutEdges([stub], "formulas").system_viz, 0, "membership footer is not an out-edge");
    // a GENUINE conceptual system-viz reference still counts
    const real = join(dir, "real.md");
    writeFileSync(real, "This engine renders a ghost-roost into the /system-viz/ overlay.");
    assert.ok(scanLegOutEdges([real], "formulas").system_viz >= 1, "real system-viz ref still counts");
  });
});

test("scanLegOutEdges: a leg of *Engine files does NOT self-count its own class as an engines edge (3-of-3 re-review P2)", () => {
  withTmp((dir) => {
    // nn_gnn leg files ARE *Engine.ts; the file's own class name must not become an engines edge.
    const selfOnly = join(dir, "GraphSAGEEngine.ts");
    writeFileSync(selfOnly, "export class GraphSAGEEngine {\n  run() { return new GraphSAGEEngine(); }\n}");
    assert.equal(scanLegOutEdges([selfOnly], "nn_gnn").engines, 0, "own class name is not a cross-leg engines edge");
    // referencing a DIFFERENT engine still counts
    const refOther = join(dir, "FooEngine.ts");
    writeFileSync(refOther, "import { BarEngine } from '../engines/BarEngine';\nexport class FooEngine { d = new BarEngine(); }");
    assert.ok(scanLegOutEdges([refOther], "nn_gnn").engines >= 1, "reference to a distinct engine still counts");
  });
});

test("scanLegOutEdges: a leg referencing nothing else stays all-zero (honest isolation)", () => {
  withTmp((dir) => {
    const f = join(dir, "lonely.ts");
    writeFileSync(f, "export const x = 1; // pure local constant, no subsystem refs");
    const c = scanLegOutEdges([f], "formulas");
    for (const k of Object.keys(c)) assert.equal(c[k], 0, `${k} stays 0 — no fabricated edges`);
  });
});

test("scanDispatcherOutEdges: real-data E2E against the live AI dispatcher (3-of-3 arm-B P1-4 — strong floor)", () => {
  // Real-data E2E (injected-reader lesson). A `>= 1` floor would pass even on a near-broken
  // scan; assert a structural lower bound a degenerate scan would miss: many engine refs AND
  // at least one genuine non-engines peer (the AI dispatcher routes to nn_gnn/memories/etc.).
  const c = scanDispatcherOutEdges("aiReasoningDispatcher.ts", "prism_ai");
  assert.equal(c.prism_ai, undefined, "self key 'prism_ai' deleted");
  assert.ok(c.engines >= 50, `aiReasoningDispatcher references many engines (got ${c.engines})`);
  const nonEnginePeers = Object.entries(c).filter(([k, v]) => k !== "engines" && v > 0);
  assert.ok(nonEnginePeers.length >= 1, `dispatcher routes to ≥1 non-engine PSN leg (got ${JSON.stringify(c)})`);
});

test("scanDispatcherOutEdges: missing dispatcher → all-zero, fail-soft, self key still dropped", () => {
  const c = scanDispatcherOutEdges("no_such_dispatcher_psn.ts", "prism_os");
  assert.equal(c.prism_os, undefined, "self key dropped even on the fail-soft path");
  for (const k of Object.keys(c)) assert.equal(c[k], 0, `${k} is 0 when the file is unreadable`);
});

test("PSN_LEG_OWNER (Bridge#7): every PSN leg maps to a valid NATO slot — no unassigned legs", () => {
  // The 11 canonical PSN legs (feedback_psn_definition). A leg-health regression must auto-route,
  // so every leg needs an owner; a missing one would route to "unassigned" (a real gap).
  const LEGS = ["obsidian_brain", "memories", "wiki", "tribal", "system_viz", "engines", "algorithms", "formulas", "nn_gnn", "prism_os", "prism_ai"];
  const NATO = new Set(["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett","kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango","uniform","victor","whiskey","xray","yankee","zulu"]);
  for (const leg of LEGS) {
    assert.ok(PSN_LEG_OWNER[leg], `leg ${leg} has an owner slot`);
    assert.ok(NATO.has(PSN_LEG_OWNER[leg]), `leg ${leg} owner ${PSN_LEG_OWNER[leg]} is a valid NATO slot`);
  }
  // no stray keys that aren't real legs
  for (const k of Object.keys(PSN_LEG_OWNER)) assert.ok(LEGS.includes(k), `${k} is a real PSN leg`);
});

test("stripFrontmatter: auto-gen frontmatter tags do NOT inflate out-edges (R12 anti-vanity)", () => {
  withTmp((dir) => {
    const f = join(dir, "formula.md");
    // Mirrors a real generate-formula-algo-wiki.mjs stub: system-viz appears ONLY in the
    // frontmatter tags/related boilerplate, never in the body. It must NOT count.
    writeFileSync(
      f,
      [
        "---",
        "title: Formula — Foo",
        "tags: [architecture, system-viz, formula]",
        "related:",
        "  - knowledge/wiki/architecture/layer-l5.md",
        "---",
        "",
        "# Formula — Foo",
        "Body references only the KienzleEngine.",
      ].join("\n"),
    );
    const c = countPatternsInFiles([f], PSN_OUT_PATTERNS);
    assert.equal(c.system_viz, 0, "frontmatter `tags:[system-viz]` is metadata, not a synergy edge");
    assert.equal(c.wiki, 0, "frontmatter `related:` wiki path is metadata, not a body reference");
    assert.ok(c.engines >= 1, "a genuine body engine reference still counts");
    // direct helper behavior — frontmatter block removed, body retained (a harmless leading
    // newline is fine; the tally regexes are whitespace-insensitive).
    const stripped = stripFrontmatter("---\na: 1\n---\nbody");
    assert.equal(stripped.trim(), "body", "frontmatter removed, body kept");
    assert.ok(!stripped.includes("a: 1"), "frontmatter key gone");
    assert.equal(stripFrontmatter("no frontmatter here"), "no frontmatter here", "no-op when absent");
  });
});
