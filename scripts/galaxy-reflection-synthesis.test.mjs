// Tests for galaxy-reflection-synthesis.mjs (B1 — per-galaxy compounding synthesis).
// Hermetic: pure helpers + injected search/fetch/fs. No network, no real vault.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildGalaxyQuery,
  gatherGalaxyMemories,
  buildSynthesisPrompt,
  synthesizeViaOllama,
  buildSynthesisDoc,
  writeSynthesisDoc,
  listGalaxies,
  parseArgs,
  ollamaPreflight,
  explicitModelOverride,
} from "./galaxy-reflection-synthesis.mjs";

import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";

describe("buildGalaxyQuery", () => {
  it("combines slug + extracted domain text from the brain body", () => {
    const brain = "# Lathe Galaxy MEMORY.md — per-domain memory cascade index\n\n## Candidate\nFilename heuristic: lathe, turning, css, g96.";
    const q = buildGalaxyQuery("lathe", brain);
    assert.match(q, /^lathe /);
    assert.match(q, /turning|css|g96/);                 // domain text folded in
    assert.doesNotMatch(q, /per-domain memory cascade/); // boilerplate excluded by the reused extractor
  });
  it("falls back to slug-only when no brain body", () => {
    assert.equal(buildGalaxyQuery("wedm", ""), "wedm");
    assert.equal(buildGalaxyQuery("wedm", null), "wedm");
  });
});

describe("gatherGalaxyMemories", () => {
  const fakeSearch = (q, opts) => ({
    hits: [
      { name: "reference_a", namespace: "reference", description: "da", opening: "oa" },
      { name: "feedback_b", namespace: "feedback", description: "db", opening: "ob" },
      { name: "galaxy_self", namespace: "galaxies", description: "should be excluded", opening: "" },
      { name: "prior_synth", namespace: "patterns", description: "should be excluded", opening: "" },
      { name: "proj_c", namespace: "project", description: "dc", opening: "oc" },
    ],
  });
  it("keeps ALL raw namespaces (incl. mistakes) and drops galaxies+patterns — pins the rule, not the fixture", () => {
    // Fixture deliberately contains all four RAW namespaces + both forbidden, so
    // this fails if `mistakes` is dropped from RAW OR if `patterns`/`galaxies`
    // leak in (the degenerate self-reinforcement regression).
    const allNs = (q, opts) => ({
      hits: [
        { name: "r", namespace: "reference", description: "d", opening: "o" },
        { name: "f", namespace: "feedback", description: "d", opening: "o" },
        { name: "p", namespace: "project", description: "d", opening: "o" },
        { name: "m", namespace: "mistakes", description: "d", opening: "o" },
        { name: "g", namespace: "galaxies", description: "FORBIDDEN", opening: "" },
        { name: "s", namespace: "patterns", description: "FORBIDDEN", opening: "" },
        { name: "u", namespace: "user", description: "not-raw", opening: "" },
      ],
    });
    const { memories } = gatherGalaxyMemories({ galaxy: "x", brainBody: "", searchImpl: allNs });
    const ns = memories.map((m) => m.namespace).sort();
    assert.deepEqual(ns, ["feedback", "mistakes", "project", "reference"], "all 4 RAW kept incl. mistakes");
    assert.ok(!ns.includes("galaxies"), "must not fold a brain's own summary into its synthesis");
    assert.ok(!ns.includes("patterns"), "must not recursively re-synthesize prior syntheses (degenerate loop)");
    assert.ok(!ns.includes("user"), "non-raw namespaces excluded");
  });
  it("caps at topK", () => {
    const many = { hits: Array.from({ length: 50 }, (_, i) => ({ name: "r" + i, namespace: "reference", description: "d", opening: "o" })) };
    const { memories } = gatherGalaxyMemories({ galaxy: "x", brainBody: "", topK: 5, searchImpl: () => many });
    assert.equal(memories.length, 5);
  });
  it("tolerates a search impl returning nothing", () => {
    const { memories } = gatherGalaxyMemories({ galaxy: "x", brainBody: "", searchImpl: () => null });
    assert.deepEqual(memories, []);
  });
});

describe("buildSynthesisPrompt", () => {
  it("includes the galaxy name, all memories, and the required section headers", () => {
    const mems = [{ name: "m1", namespace: "reference", description: "d1", opening: "o1" }];
    const p = buildSynthesisPrompt("cad", mems);
    assert.match(p, /"cad"/);
    assert.match(p, /\[reference\/m1\]/);
    assert.match(p, /## Recurring patterns/);
    assert.match(p, /## Key decisions & rules/);
    assert.match(p, /## Open threads/);
    assert.match(p, /do NOT invent facts/);
  });
});

describe("synthesizeViaOllama", () => {
  it("returns the response text on a 200", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ response: "  ## Recurring patterns\nstuff  " }) });
    const t = await synthesizeViaOllama({ prompt: "p", fetchImpl: fakeFetch });
    assert.equal(t, "## Recurring patterns\nstuff");
  });
  it("strips <think>…</think> reasoning blocks (deepseek-r1)", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ response: "<think>let me reason</think>## Recurring patterns\nreal" }) });
    const t = await synthesizeViaOllama({ prompt: "p", fetchImpl: fakeFetch });
    assert.doesNotMatch(t, /<think>/);
    assert.match(t, /## Recurring patterns/);
  });
  it("throws on non-2xx (R12 fail-loud)", async () => {
    const fakeFetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => synthesizeViaOllama({ prompt: "p", fetchImpl: fakeFetch }), /ollama HTTP 503/);
  });
  it("sends keep_alive to pin the model resident across the batch (stability fix)", async () => {
    let sentBody = null;
    const fakeFetch = async (u, opts) => { sentBody = JSON.parse(opts.body); return { ok: true, json: async () => ({ response: "## x\nok" }) }; };
    await synthesizeViaOllama({ prompt: "p", fetchImpl: fakeFetch });
    assert.equal(sentBody.keep_alive, "30m", "default keep_alive pins the model (env default 5m would unload it mid-batch)");
    const fakeFetch2 = async (u, opts) => { sentBody = JSON.parse(opts.body); return { ok: true, json: async () => ({ response: "## x\nok" }) }; };
    await synthesizeViaOllama({ prompt: "p", keepAlive: "10m", fetchImpl: fakeFetch2 });
    assert.equal(sentBody.keep_alive, "10m", "keepAlive is overridable");
  });
});

describe("ollamaPreflight (the load-bearing fail-loud gate)", () => {
  it("returns true when generation responds with a string", async () => {
    const ok = await ollamaPreflight("http://x", "m", { fetchImpl: async () => ({ ok: true, json: async () => ({ response: "OK" }) }) });
    assert.equal(ok, true);
  });
  it("returns false on non-2xx (→ main exits 1, no silent no-op batch)", async () => {
    const ok = await ollamaPreflight("http://x", "m", { fetchImpl: async () => ({ ok: false, status: 500 }) });
    assert.equal(ok, false);
  });
  it("returns false when fetch throws (ollama down/wedged)", async () => {
    const ok = await ollamaPreflight("http://x", "m", { fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
    assert.equal(ok, false);
  });
  it("returns false when response is not a string (malformed)", async () => {
    const ok = await ollamaPreflight("http://x", "m", { fetchImpl: async () => ({ ok: true, json: async () => ({ response: null }) }) });
    assert.equal(ok, false);
  });
});

describe("buildSynthesisDoc", () => {
  it("emits patterns frontmatter (type, galaxy, counts) + body", () => {
    const doc = buildSynthesisDoc("mill", "## Recurring patterns\nx", { memCount: 12, model: "qwen2.5-coder:32b", builtAt: "2026-05-29T00:00:00Z" });
    assert.match(doc, /name: mill_synthesis/);
    assert.match(doc, /type: patterns/);
    assert.match(doc, /galaxy: mill/);
    assert.match(doc, /synthesizedFrom: 12/);
    assert.match(doc, /synthesizedAt: 2026-05-29T00:00:00Z/);
    assert.match(doc, /## Recurring patterns/);
  });
  it("carries the advisory/verify markers — reachable by the recall injector (Reviewer-B P1)", () => {
    const doc = buildSynthesisDoc("mill", "## Recurring patterns\nx", { memCount: 12 });
    assert.match(doc, /advisoryOnly: true/);
    assert.match(doc, /mustHumanVerify: true/);
    // the caveat MUST be in the description (recall renders name+description+opening, not the body)
    assert.match(doc, /description: "\[auto-synth · verify\]/);
  });
});

describe("writeSynthesisDoc", () => {
  it("writes via .tmp + rename (atomic) to patterns/<galaxy>_synthesis.md", () => {
    const writes = []; const renames = []; const dirs = [];
    const out = writeSynthesisDoc({
      galaxy: "wedm", doc: "x", outDir: "/p",
      writeImpl: (pth, d) => writes.push([pth, d]),
      renameImpl: (from, to) => renames.push([from, to]),
      mkdirImpl: (d) => dirs.push(d),
      existsImpl: () => false,
    });
    assert.match(out.replace(/\\/g, "/"), /\/p\/wedm_synthesis\.md$/);
    assert.equal(renames.length, 1);
    assert.ok(renames[0][0].includes(".tmp."));
    assert.ok(dirs.includes("/p"), "creates the patterns dir when missing");
  });
  it("refuses to write an empty doc (R12)", () => {
    assert.throws(() => writeSynthesisDoc({ galaxy: "x", doc: "" }), /refusing to write empty doc/);
  });
});

describe("listGalaxies", () => {
  it("returns only subdirs that carry a MEMORY.md", () => {
    const g = listGalaxies("/eng", {
      readdirImpl: () => ["lathe", "wedm", "no-brain"],
      existsImpl: (p) => { const k = String(p).replace(/\\/g, "/"); return k === "/eng" || k.endsWith("/lathe/MEMORY.md") || k.endsWith("/wedm/MEMORY.md"); },
    });
    assert.deepEqual(g.sort(), ["lathe", "wedm"]);
  });
  it("returns [] when the engines root is absent", () => {
    assert.deepEqual(listGalaxies("/nope", { existsImpl: () => false }), []);
  });
});

describe("parseArgs", () => {
  it("parses flags + values", () => {
    const a = parseArgs(["--all", "--dry-run", "--model", "gpt-oss:120b", "--topk", "12", "--limit", "3"]);
    assert.equal(a.all, true);
    assert.equal(a.dryRun, true);
    assert.equal(a.model, "gpt-oss:120b");
    assert.equal(a.topK, 12);
    assert.equal(a.limit, 3);
  });
  it("--galaxy sets a single target; topK floors at 4", () => {
    const a = parseArgs(["--galaxy", "cam", "--topk", "1"]);
    assert.equal(a.galaxy, "cam");
    assert.equal(a.topK, 4);
  });
});

// ── host-aware synthesis-model resolver wiring (U-BW-SYNTH-CONSUMERS) ────────
// The script hardcoded qwen2.5-coder:32b; it now routes that through
// resolveSynthesisModel so a Blackwell host synthesizes with the 32B (token-savings)
// while weaker hosts / ollama-down degrade to the same conservative fallback.

describe("explicitModelOverride (raw-argv --model detection)", () => {
  it("returns the explicit --model value from raw argv", () => {
    assert.equal(explicitModelOverride(["--all", "--model", "gpt-oss:120b"]), "gpt-oss:120b");
  });
  it("returns an explicit --model EVEN when it equals the script default — the bug the recipe names", () => {
    // parseArgs bakes DEFAULT_MODEL into args.model, so comparing args.model to the
    // default would silently miss `--model qwen2.5-coder:32b`. Reading raw argv catches it.
    assert.equal(explicitModelOverride(["--model", "qwen2.5-coder:32b"]), "qwen2.5-coder:32b");
  });
  it("returns null when no --model flag is present", () => {
    assert.equal(explicitModelOverride(["--all", "--dry-run"]), null);
    assert.equal(explicitModelOverride([]), null);
  });
  it("returns null for a dangling --model with no value", () => {
    assert.equal(explicitModelOverride(["--all", "--model"]), null);
    assert.equal(explicitModelOverride(["--model", "   "]), null); // whitespace-only is not a real value
  });
});

describe("resolveSynthesisModel wiring (host-aware default routing)", () => {
  const FALLBACK = "qwen2.5-coder:32b";

  it("(a) an explicit override always wins over host routing", async () => {
    // override short-circuits before any host detection / tags fetch (operator intent).
    const r = await resolveSynthesisModel({
      fallback: FALLBACK,
      override: "gpt-oss:120b",
      detectHostClassFn: () => "home_blackwell",
      fetchModelsFn: async () => ["qwen2.5-coder:32b", "qwen2.5-coder:32b"],
    });
    assert.equal(r.model, "gpt-oss:120b");
    assert.equal(r.source, "override");
  });

  it("(b) preserves the script's DEFAULT_MODEL fallback when the resolver yields nothing (ollama down)", async () => {
    // No installed models (ollama unreachable) → degrade to the conservative const,
    // never crash a synthesis run (R12 fail-soft).
    const r = await resolveSynthesisModel({
      fallback: FALLBACK,
      override: null,
      detectHostClassFn: () => null,
      fetchModelsFn: async () => [],
    });
    assert.equal(r.model, FALLBACK);
    assert.equal(r.source, "fallback");
  });

  it("(b') routes to the 32B on a Blackwell host when it is installed (token-savings)", async () => {
    const r = await resolveSynthesisModel({
      fallback: FALLBACK,
      override: null,
      detectHostClassFn: () => "home_blackwell",
      fetchModelsFn: async () => ["qwen2.5-coder:32b", "qwen2.5-coder:32b"],
    });
    assert.equal(r.model, "qwen2.5-coder:32b", "Blackwell synthesizes with the 32B, not the hardcoded 7B");
    assert.equal(r.source, "blackwell-best");
  });
});

describe("(c) resolved model is threaded into preflight + synth (structural wiring)", () => {
  // main() reads process.argv and talks to a live Ollama, so it is not cleanly
  // dependency-injectable. The load-bearing invariant — that the resolver's output
  // (not the parseArgs default) feeds BOTH ollamaPreflight and synthesizeViaOllama —
  // is verified structurally against the source so the wiring cannot silently rot.
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "galaxy-reflection-synthesis.mjs"),
    "utf8",
  );

  it("imports the host-aware resolver", () => {
    assert.match(src, /import\s*\{\s*resolveSynthesisModel\s*\}\s*from\s*["']\.\/lib\/host-aware-synthesis-model\.mjs["']/);
  });

  it("resolves ONCE in main, fed the explicit --model override + DEFAULT_MODEL fallback", () => {
    assert.match(src, /const\s*\{\s*model[^}]*\}\s*=\s*await\s+resolveSynthesisModel\(\{/);
    assert.match(src, /fallback:\s*DEFAULT_MODEL/);
    assert.match(src, /override:\s*explicitModelOverride\(process\.argv\)/);
  });

  it("threads the RESOLVED model (not args.model) into preflight, synth, and the doc", () => {
    assert.match(src, /ollamaPreflight\(DEFAULT_OLLAMA_URL,\s*model\)/);
    assert.match(src, /synthesizeViaOllama\(\{\s*prompt,\s*model\s*\}\)/);
    assert.match(src, /buildSynthesisDoc\(galaxy,\s*text,\s*\{\s*memCount:[^}]*\bmodel\b/);
    // anti-regression: main() must NOT reach back to the parseArgs-baked default,
    // which would desync preflight (resolved) from generation (default).
    assert.doesNotMatch(src, /model:\s*args\.model/, "main must thread the RESOLVED model, never args.model");
  });
});
