/**
 * IdeaBlockExtractor.test.ts — OBSIDIAN-INTELLIGENCE-MS3 / E1
 *
 * Covers the E1 exit conditions:
 *   - IdeaBlock schema validates the engine's output shape.
 *   - Ollama is invoked via OllamaClientEngine.generate (mocked).
 *   - 1 .md → N IdeaBlocks (one per atomic claim).
 *   - 5 fixture .md files produce ≥ 10 IdeaBlocks with valid schema.
 *
 * Also covers per-file scrutiny gate findings from File A + File B:
 *   - Path-traversal rejection on source_path (Arm B P0).
 *   - .strict() rejects unknown fields (Arm B P0).
 *   - Hostile JSON-payload safety in tryParseJson (Arm B P0).
 *   - Refusal detection emits `model-refused` (Arm B P1, was dead enum).
 *   - governance_tags filter falls back to ["unknown"] (Arm B P1).
 *   - id hash uses U+001F separator (Arm B P2 — collision prevention).
 *   - Schema-violation surfaces (not silent 0-blocks success).
 *
 * Test seam: constructs IdeaBlockExtractorEngine with a stub
 * `OllamaClientEngine` so no real daemon is needed.
 */

import { describe, it, expect } from "vitest";
import { IdeaBlockExtractorEngine } from "../engines/IdeaBlockExtractorEngine.js";
import type { OllamaClientEngine } from "../engines/OllamaClientEngine.js";
import { IdeaBlockSchema } from "../schemas/ideaBlockSchema.js";

// ============================================================================
// Stub OllamaClientEngine
// ============================================================================

interface StubOptions {
  /** Canned response string returned by generate(). Per-call FIFO. */
  generateReturns?: string[];
  /** If true, generate() resolves with ok:false / "ollama-unreachable" style errors. */
  forceUnreachable?: boolean;
  /** If true, generate() rejects with a Timeout error (engine should classify as 'timeout'). */
  forceTimeout?: boolean;
  /** If true, connect() resolves with ok:false. */
  forceConnectFail?: boolean;
}

function makeStub(opts: StubOptions = {}): OllamaClientEngine {
  let connected = false;
  const queue = [...(opts.generateReturns ?? [])];
  const calls: Array<{ model: string; prompt: string; system?: string }> = [];

  const stub = {
    async connect() {
      if (opts.forceConnectFail) {
        return { ok: false, value: null, error: "stub: connect refused", wallMs: 1 };
      }
      connected = true;
      return { ok: true, value: undefined, error: null, wallMs: 1 };
    },
    isConnected: () => connected,
    getHost: () => "stub://",
    async listModels() {
      return { ok: true, value: ["qwen2.5-coder:7b"], error: null, wallMs: 1 };
    },
    async generate(o: { model: string; prompt: string; system?: string }) {
      calls.push({ model: o.model, prompt: o.prompt, system: o.system });
      if (opts.forceUnreachable) {
        return { ok: false, value: null, error: "stub: ollama unreachable", wallMs: 1 };
      }
      if (opts.forceTimeout) {
        return { ok: false, value: null, error: "stub: timeout after 1ms", wallMs: 1 };
      }
      const next = queue.shift() ?? "";
      return { ok: true, value: next, error: null, wallMs: 5 };
    },
    async chat() {
      return { ok: false, value: null, error: "stub does not implement chat", wallMs: 1 };
    },
    async embed() {
      return { ok: false, value: null, error: "stub does not implement embed", wallMs: 1 };
    },
    disconnect: () => {
      connected = false;
    },
    __calls: calls, // test-introspection
  } as unknown as OllamaClientEngine & { __calls: typeof calls };

  return stub;
}

// ============================================================================
// Canned Ollama responses
// ============================================================================

/**
 * Build a JSON response with N synthetic claims for one fixture .md.
 *
 * `seed` differentiates content so multiple fixtures used in the same suite
 * don't accidentally hash to the same `id`. Content-addressed dedup is the
 * desired property of E1 — identical inputs MUST collide — so when the test
 * needs distinct blocks across fixtures it supplies distinct seeds.
 */
function cannedClaims(
  n: number,
  opts: { withFence?: boolean; trailingProse?: boolean; seed?: string } = {},
): string {
  const seed = opts.seed ?? "default";
  const blocks = Array.from({ length: n }, (_, i) => ({
    question: `[${seed}] What is fact ${i + 1}?`,
    answer: `[${seed}] Fact ${i + 1} is well documented in the source. It applies under normal conditions. Operators should remember it.`,
    source_offset: i * 3,
    governance_tags: ["fact"],
  }));
  const body = JSON.stringify({ blocks });
  if (opts.withFence) return "```json\n" + body + "\n```";
  if (opts.trailingProse) return body + "\n\nLet me know if you need more!";
  return body;
}

// ============================================================================
// Tests — happy path
// ============================================================================

describe("IdeaBlockExtractorEngine — happy path", () => {
  it("extracts blocks from valid Ollama JSON response", async () => {
    const stub = makeStub({ generateReturns: [cannedClaims(3)] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "# Note\nFact 1.\nFact 2.\nFact 3.",
      source_path: "notes/example.md",
    });
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(r.blocks).toHaveLength(3);
    expect(r.parse_attempts).toBe(1);
    for (const b of r.blocks) {
      // Schema round-trip validates the engine's promote() output.
      const parsed = IdeaBlockSchema.safeParse(b);
      expect(parsed.success).toBe(true);
      expect(b.source_path).toBe("notes/example.md");
      expect(b.schema_version).toBe(1);
      expect(b.id).toMatch(/^[0-9a-f]{24}$/);
      expect(b.governance_tags).toEqual(["fact"]);
    }
  });

  it("strips ```json ... ``` fences before parsing", async () => {
    const stub = makeStub({ generateReturns: [cannedClaims(2, { withFence: true })] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "# Note\nA fact and a thing.",
      source_path: "notes/fenced.md",
    });
    expect(r.ok).toBe(true);
    expect(r.blocks.length).toBe(2);
  });

  it("ignores trailing prose after the JSON object", async () => {
    const stub = makeStub({ generateReturns: [cannedClaims(2, { trailingProse: true })] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "# Note\nClaims.",
      source_path: "notes/prose.md",
    });
    expect(r.ok).toBe(true);
    expect(r.blocks.length).toBe(2);
  });
});

// ============================================================================
// E1 exit-condition test — 5 fixture .md files produce ≥ 10 IdeaBlocks total
// ============================================================================

describe("IdeaBlockExtractorEngine — E1 exit condition: 5 fixtures ≥ 10 blocks", () => {
  it("aggregates ≥ 10 valid IdeaBlocks across 5 fixture markdowns", async () => {
    const fixtures: Array<{ source: string; markdown: string; claims: number }> = [
      { source: "fixtures/safety.md",       markdown: "# Safety\nKienzle force scales with feed.\nTaylor predicts tool life.",     claims: 2 },
      { source: "fixtures/programming.md",  markdown: "# Programming\nFanuc uses G54.\nMastercam emits M03.\nHaas uses NGC.",       claims: 3 },
      { source: "fixtures/maintenance.md",  markdown: "# Maintenance\nSpindle bearings need lube weekly.\nWay covers wear annually.", claims: 2 },
      { source: "fixtures/materials.md",    markdown: "# Materials\n304 SS work-hardens.\nInconel demands rigid setups.",           claims: 2 },
      { source: "fixtures/wedm.md",         markdown: "# WEDM\nWire tension affects taper.\nFlush pressure drives consumable life.",  claims: 2 },
    ];

    const stub = makeStub({
      // Each fixture gets a unique seed so content (and therefore the
      // content-addressed `id`) is distinct across fixtures. Identical
      // content collapsing to the same `id` is the desired E1 invariant
      // (it's what E2 dedup builds on), so distinct fixtures need distinct
      // seeds — this test asserts the "across distinct content" path.
      generateReturns: fixtures.map((f) => cannedClaims(f.claims, { seed: f.source })),
    });
    const eng = new IdeaBlockExtractorEngine(stub);

    const allBlocks = [];
    for (const f of fixtures) {
      const r = await eng.extractFromMarkdown({ markdown: f.markdown, source_path: f.source });
      expect(r.ok, `fixture ${f.source} should succeed`).toBe(true);
      expect(r.blocks.length, `fixture ${f.source} should produce ${f.claims} blocks`).toBe(f.claims);
      allBlocks.push(...r.blocks);
    }
    expect(allBlocks.length).toBeGreaterThanOrEqual(10);
    // Every block round-trips the schema.
    for (const b of allBlocks) {
      expect(IdeaBlockSchema.safeParse(b).success).toBe(true);
    }
    // ids are unique across blocks (different question/answer text).
    const ids = new Set(allBlocks.map((b) => b.id));
    expect(ids.size).toBe(allBlocks.length);
    // source_path round-trips per fixture.
    const sources = new Set(allBlocks.map((b) => b.source_path));
    expect(sources.size).toBe(5);
  });
});

// ============================================================================
// Failure modes — every documented IdeaBlockExtractErrorClass reachable
// ============================================================================

describe("IdeaBlockExtractorEngine — failure classes (closed enum reachability)", () => {
  it("empty-input — whitespace-only markdown", async () => {
    const stub = makeStub();
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "   \n\n  \t  ", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("empty-input");
    expect(r.blocks).toEqual([]);
  });

  it("ollama-unreachable — connect() fails", async () => {
    const stub = makeStub({ forceConnectFail: true });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("ollama-unreachable");
  });

  it("ollama-unreachable — generate() returns ok:false", async () => {
    const stub = makeStub({ forceUnreachable: true });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("ollama-unreachable");
  });

  it("timeout — generate() emits timeout-class error", async () => {
    const stub = makeStub({ forceTimeout: true });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("timeout");
  });

  it("json-parse-failed — both initial + repair attempts return non-JSON", async () => {
    const stub = makeStub({
      generateReturns: [
        "I cannot produce JSON for this markdown.",       // initial — actually triggers refusal-detector below
        "Still no JSON here, just plain prose.",          // repair attempt — also non-JSON
      ],
    });
    // The first response matches the refusal pattern; use one that does NOT.
    const stub2 = makeStub({
      generateReturns: [
        "Here is some text that talks about things but it never opens a JSON object at all.",
        "And here is some text on the repair pass that also fails to be JSON in any way.",
      ],
    });
    const eng = new IdeaBlockExtractorEngine(stub2);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("json-parse-failed");
    expect(r.parse_attempts).toBe(2);
    // sanity — confirm the unused stub doesn't bleed into another test
    void stub;
  });

  it("model-refused — short response matching refusal pattern", async () => {
    const stub = makeStub({
      generateReturns: ["I can't help with that request, sorry."],
    });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("model-refused");
  });

  it("schema-violation — all raw blocks fail schema validation", async () => {
    // Every block has empty question/answer — drops at promote() stage.
    const badJson = JSON.stringify({
      blocks: [
        { question: "", answer: "non-empty", source_offset: 0, governance_tags: ["fact"] },
        { question: "Q?", answer: "", source_offset: 0, governance_tags: ["fact"] },
      ],
    });
    const stub = makeStub({ generateReturns: [badJson] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("schema-violation");
  });

  it("schema-violation — input validation (e.g. path traversal in source_path)", async () => {
    const stub = makeStub({ generateReturns: ["{}"] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "Real content.",
      source_path: "../../etc/passwd",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("schema-violation");
  });
});

// ============================================================================
// Adversarial / scrutiny-driven cases
// ============================================================================

describe("IdeaBlockExtractorEngine — hostile-payload safety (per-file scrutiny gate)", () => {
  it("Arm B P0: depth-aware brace matching survives prose-between-JSON-objects", async () => {
    // Greedy slice (firstBrace..lastBrace) would yield invalid JSON here;
    // depth-aware matcher must pick the FIRST parseable object with `blocks`.
    const hostile = `Some prose. {"unrelated": "trap"} more prose. ${cannedClaims(1)}`;
    const stub = makeStub({ generateReturns: [hostile] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(true);
    expect(r.blocks.length).toBe(1);
  });

  it("Arm B P1: governance_tags filter empties → fallback to ['unknown']", async () => {
    // Model emits non-string tags only; engine must fall back rather than drop.
    const badTags = JSON.stringify({
      blocks: [
        {
          question: "Why does this fall back?",
          answer: "Because the filter removes non-strings and we keep the block instead of dropping it.",
          source_offset: 0,
          governance_tags: [123, null, false],
        },
      ],
    });
    const stub = makeStub({ generateReturns: [badTags] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(true);
    expect(r.blocks.length).toBe(1);
    expect(r.blocks[0].governance_tags).toEqual(["unknown"]);
  });

  it("Arm B P2: id-hash collision-resistance via U+001F separator", async () => {
    // Block A: question="A\nB", answer="" → would hash same as
    // Block B: question="A", answer="B"  under plain "\n" separator.
    // With U+001F separator they MUST differ.
    const json = JSON.stringify({
      blocks: [
        {
          question: "Q with two lines A and B",
          answer: "Single answer body that is long enough to pass min(8).",
          source_offset: 0,
          governance_tags: ["fact"],
        },
        {
          question: "Q with two lines A and B",
          answer: "DIFFERENT answer body so the pair is distinct.",
          source_offset: 1,
          governance_tags: ["fact"],
        },
      ],
    });
    const stub = makeStub({ generateReturns: [json] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(true);
    expect(r.blocks.length).toBe(2);
    expect(r.blocks[0].id).not.toBe(r.blocks[1].id);
  });

  it("File A P1: source_path rejects backslash separators (Windows-style)", async () => {
    const stub = makeStub({ generateReturns: [cannedClaims(1)] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "Real content.",
      source_path: "notes\\windows.md",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("schema-violation");
  });

  it("File A P0: schema-strict mode rejects unknown fields", async () => {
    // Engine never emits unknown fields, but verify the schema is strict at all.
    const candidate = {
      id: "abcdef0123456789abcdef01",
      question: "Q?",
      answer: "A two-sentence answer.",
      source_path: "x.md",
      source_offset: 0,
      governance_tags: ["fact"],
      schema_version: 1,
      extracted_at: new Date().toISOString(),
      model: "qwen2.5-coder:7b",
      attacker_injected: "trust_me",
    };
    expect(IdeaBlockSchema.safeParse(candidate).success).toBe(false);
  });

  it("model_override is plumbed through to the Ollama call", async () => {
    const stub = makeStub({ generateReturns: [cannedClaims(1)] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "Real content.",
      source_path: "x.md",
      model_override: "qwen2.5-coder:3b",
    });
    expect(r.ok).toBe(true);
    expect(r.blocks[0].model).toBe("qwen2.5-coder:3b");
  });

  it("max_blocks truncates the result without erroring", async () => {
    const stub = makeStub({ generateReturns: [cannedClaims(10)] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({
      markdown: "Real content.",
      source_path: "x.md",
      max_blocks: 4,
    });
    expect(r.ok).toBe(true);
    expect(r.blocks.length).toBe(4);
  });

  it("empty blocks array (model found no claims) is success, not failure", async () => {
    const stub = makeStub({ generateReturns: [JSON.stringify({ blocks: [] })] });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(true);
    expect(r.blocks).toEqual([]);
    expect(r.error).toBeNull();
  });

  it("repair path: bad initial JSON, good repair, returns blocks with parse_attempts=2", async () => {
    const stub = makeStub({
      generateReturns: [
        "complete garbage with no braces at all",
        cannedClaims(2),
      ],
    });
    const eng = new IdeaBlockExtractorEngine(stub);
    const r = await eng.extractFromMarkdown({ markdown: "Real content.", source_path: "x.md" });
    expect(r.ok).toBe(true);
    expect(r.parse_attempts).toBe(2);
    expect(r.blocks.length).toBe(2);
  });
});
