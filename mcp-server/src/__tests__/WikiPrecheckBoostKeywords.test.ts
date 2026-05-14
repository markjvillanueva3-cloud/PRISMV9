/**
 * WikiPrecheckBoostKeywords.test.ts — U-CLEANUP-D5.
 *
 * Covers the two D5 deliverables:
 *   1. scripts/build-wiki-leaf-index.mjs — producer: extracts `boost_keywords`
 *      frontmatter into _leaf-index.jsonl (array-aware parseFrontmatter +
 *      normalizeBoostKeywords).
 *   2. .claude/hooks/wiki-precheck-inject.mjs — consumer: honors boost_keywords,
 *      caps injection at 8 KB, logs salted-hashed misses.
 *
 * Isolation: both .mjs are pure ESM (node builtins only) and carry an
 * `isDirectRun` guard, so importing them does not run main(). Path constants in
 * the hook (and the producer's input dirs) are read at module-load from env, so
 * `main()` / `loadLeafCorpus` tests use a cache-busting dynamic import (`?t=`)
 * after setting env — each gets a fresh module that reads the per-test tmpdir.
 * The producer→consumer integration test runs the REAL producer as a subprocess
 * against a tmp wiki tree (PRISM_WIKI_ARCH_DIR override).
 *
 * Real-value tests only — every assertion checks concrete behavior / exact values.
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-D5
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import cp from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname_test = path.dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = path.resolve(__dirname_test, "../../../.claude/hooks/wiki-precheck-inject.mjs");
const PRODUCER_PATH = path.resolve(__dirname_test, "../../../scripts/build-wiki-leaf-index.mjs");
const REAL_LEAF_INDEX = path.resolve(__dirname_test, "../../../knowledge/wiki/architecture/_leaf-index.jsonl");
const HOOK_URL = pathToFileURL(HOOK_PATH).href;
const PRODUCER_URL = pathToFileURL(PRODUCER_PATH).href;

// Producer pure fns don't read env — one import is enough.
const producer = await import(PRODUCER_URL);
const { parseFrontmatter, normalizeBoostKeywords } = producer;

// Hook pure fns (matchBoostKeywords/hashKeyword/capInjection) don't read the
// env path constants either — one import covers them.
const hook = await import(HOOK_URL);
const { matchBoostKeywords, hashKeyword, capInjection } = hook;

// ─── env-isolated fresh-hook helper for main()/loadLeafCorpus ────────────────
let TMP: string;
const ORIG_ENV: Record<string, string | undefined> = {};
const ENV_KEYS = [
  "PRISM_WIKI_LEAF_INDEX", "PRISM_WIKI_MISSES_LOG", "PRISM_WIKI_CACHE_DIR",
  "PRISM_WIKI_INDEX", "PRISM_WIKI_EMB_INDEX", "PRISM_WIKI_TELEMETRY",
  "OLLAMA_HOST", "PRISM_WIKI_PRECHECK",
];

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "d5-test-"));
  for (const k of ENV_KEYS) ORIG_ENV[k] = process.env[k];
  process.env.PRISM_WIKI_LEAF_INDEX = path.join(TMP, "_leaf-index.jsonl");
  process.env.PRISM_WIKI_MISSES_LOG = path.join(TMP, "wiki-inject-misses.jsonl");
  process.env.PRISM_WIKI_CACHE_DIR = path.join(TMP, "cache");
  process.env.PRISM_WIKI_INDEX = path.join(TMP, "no-index.md"); // absent → BM25-over-index disabled
  process.env.PRISM_WIKI_EMB_INDEX = path.join(TMP, "no-emb.jsonl"); // absent → no semantic corpus
  process.env.PRISM_WIKI_TELEMETRY = path.join(TMP, "tele.jsonl");
  process.env.OLLAMA_HOST = "127.0.0.1:1"; // unreachable → semantic fallback fails fast
  delete process.env.PRISM_WIKI_PRECHECK;
  // The hook's out() writes JSON to stdout; suppress it so it doesn't pollute
  // the vitest reporter stream. Restored by vi.restoreAllMocks() in afterEach.
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV_KEYS) {
    if (ORIG_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIG_ENV[k];
  }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
});

function writeLeafIndex(entries: Record<string, unknown>[]) {
  fs.writeFileSync(process.env.PRISM_WIKI_LEAF_INDEX!, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}
// Fresh hook module that re-reads the per-test env path constants.
async function freshHook() {
  return import(HOOK_URL + "?t=" + Math.random());
}
const fm = (body: string) => parseFrontmatter("---\n" + body + "\n---");

// ════════════════════════════════════════════════════════════════════════════
// A. Producer — parseFrontmatter (array-aware)
// ════════════════════════════════════════════════════════════════════════════
describe("build-wiki-leaf-index.parseFrontmatter", () => {
  it("parses an inline boost_keywords array", () => {
    expect(fm('boost_keywords: [hook, settings.json, "*.mjs"]').boost_keywords)
      .toEqual(["hook", "settings.json", "*.mjs"]);
  });

  it("parses a block-sequence boost_keywords array", () => {
    expect(fm("boost_keywords:\n  - hook\n  - settings.json").boost_keywords)
      .toEqual(["hook", "settings.json"]);
  });

  it("keeps block-array items when a comment or blank line sits between key and items", () => {
    expect(fm("boost_keywords:\n  # a clarifying comment\n\n  - hook").boost_keywords)
      .toEqual(["hook"]);
  });

  it("does NOT coerce a bracket-wrapped SCALAR value to an array (regression guard)", () => {
    // `title` is not in ARRAY_KEYS — must stay the literal string, not ["DRAFT"].
    expect(fm("title: [DRAFT]").title).toBe("[DRAFT]");
    expect(fm("type: [x]").type).toBe("[x]");
  });

  it("leaves an empty scalar key as \"\" and does not let it absorb a following - line", () => {
    const f = fm("verified_by:\ntitle: Real Title");
    expect(f.verified_by).toBe("");
    expect(f.title).toBe("Real Title");
  });

  it("non-array key followed by - lines stays a scalar (block items ignored)", () => {
    // `tags` is NOT in ARRAY_KEYS for this index builder — must not become an array.
    expect(fm("tags:\n  - a\n  - b").tags).toBe("");
  });

  it("a literal __proto__ frontmatter key cannot corrupt other property reads", () => {
    const f = fm("__proto__: [evil]\ntitle: Safe");
    expect(f.title).toBe("Safe");
    expect(Array.isArray([].constructor)).toBe(false); // Object.prototype intact
  });

  it("returns an empty object for content with no frontmatter (adversarial)", () => {
    expect(parseFrontmatter("# just a heading\nbody text")).toEqual({});
    expect(parseFrontmatter("---\nunterminated frontmatter")).toEqual({});
  });

  it("strips surrounding quotes from inline array items and scalars", () => {
    expect(fm("boost_keywords: ['quoted', \"double\"]").boost_keywords).toEqual(["quoted", "double"]);
    expect(fm('title: "Quoted Title"').title).toBe("Quoted Title");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// B. Producer — normalizeBoostKeywords
// ════════════════════════════════════════════════════════════════════════════
describe("build-wiki-leaf-index.normalizeBoostKeywords", () => {
  it("lowercases, trims, and drops empties from an array", () => {
    expect(normalizeBoostKeywords(["Hook", "  Settings.JSON  ", ""])).toEqual(["hook", "settings.json"]);
  });

  it("wraps a bare string into a single-element array", () => {
    expect(normalizeBoostKeywords("SoloKeyword")).toEqual(["solokeyword"]);
  });

  it("returns exactly null for null / undefined / empty string / empty array", () => {
    expect(normalizeBoostKeywords(null)).toBe(null);
    expect(normalizeBoostKeywords(undefined)).toBe(null);
    expect(normalizeBoostKeywords("")).toBe(null);
    expect(normalizeBoostKeywords("   ")).toBe(null);
    expect(normalizeBoostKeywords([])).toBe(null);
  });

  it("drops non-string array elements rather than stringifying them (adversarial)", () => {
    expect(normalizeBoostKeywords(["ok", null, 42, undefined, "two", { a: 1 }])).toEqual(["ok", "two"]);
  });

  it("caps a long keyword array at exactly 24 entries", () => {
    const big = Array.from({ length: 100 }, (_, i) => "kw" + i);
    const out = normalizeBoostKeywords(big);
    expect(out!.length).toBe(24);
    expect(out![0]).toBe("kw0");
    expect(out![23]).toBe("kw23");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// C. Consumer — matchBoostKeywords
// ════════════════════════════════════════════════════════════════════════════
describe("wiki-precheck-inject.matchBoostKeywords", () => {
  it("matches a multi-word phrase as a substring (BM25 would miss it)", () => {
    expect(matchBoostKeywords("explain the async hook dispatcher please", ["async hook dispatcher"]))
      .toEqual(["async hook dispatcher"]);
  });

  it("matches a filename keyword with a dot", () => {
    expect(matchBoostKeywords("edit the settings.json file", ["settings.json", "unrelated"]))
      .toEqual(["settings.json"]);
  });

  it("matches a leading-* glob anywhere in the prompt", () => {
    expect(matchBoostKeywords("look at precheck-inject.mjs now", ["*.mjs"])).toEqual(["*.mjs"]);
  });

  it("matches a multi-* glob only when segments appear in order", () => {
    expect(matchBoostKeywords("path is src/engines/Foo.mjs here", ["**/*.mjs"])).toEqual(["**/*.mjs"]);
    expect(matchBoostKeywords("just the word mjs alone", ["**/*.mjs"])).toEqual([]); // needs / then .mjs
  });

  it("ADVERSARIAL: a pathological glob does not ReDoS — returns in well under 100ms", () => {
    const evil = ["**/*.mjs", "src/**", "**a", "*/*/*/*"];
    const longPrompt = ("x".repeat(8000) + " noslash text ".repeat(400)).toLowerCase();
    const t0 = performance.now();
    matchBoostKeywords(longPrompt, evil);
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it("FAILURE MODE: skips a bare single-stopword keyword (would match nearly every prompt)", () => {
    expect(matchBoostKeywords("a prompt that mentions hook here", ["hook"])).toEqual([]);
    // but a multi-word phrase containing a stopword is specific enough to keep
    expect(matchBoostKeywords("the hook chain order", ["hook chain"])).toEqual(["hook chain"]);
  });

  it("FAILURE MODE: skips empty / all-glob / all-whitespace keywords", () => {
    expect(matchBoostKeywords("anything at all here", ["", "*", "**", "  ", "* *"])).toEqual([]);
  });

  it("FAILURE MODE: non-array / empty boostKw input returns []", () => {
    expect(matchBoostKeywords("prompt", null as unknown as string[])).toEqual([]);
    expect(matchBoostKeywords("prompt", [])).toEqual([]);
    expect(matchBoostKeywords("prompt", undefined as unknown as string[])).toEqual([]);
  });

  it("does not match when a glob's literal segment is absent", () => {
    expect(matchBoostKeywords("no extension here", ["*.mjs"])).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// D. Consumer — hashKeyword
// ════════════════════════════════════════════════════════════════════════════
describe("wiki-precheck-inject.hashKeyword", () => {
  it("produces a 12-hex hash that is not the input", () => {
    const h = hashKeyword("kienzle");
    expect(h).toMatch(/^[0-9a-f]{12}$/);
    expect(h).not.toBe("kienzle");
  });

  it("is deterministic for a given (token, salt) pair", () => {
    expect(hashKeyword("taylor", "saltA")).toBe(hashKeyword("taylor", "saltA"));
  });

  it("a different salt produces a different hash (rainbow-table defense)", () => {
    expect(hashKeyword("taylor", "saltA")).not.toBe(hashKeyword("taylor", "saltB"));
    expect(hashKeyword("taylor", "saltA")).not.toBe(hashKeyword("taylor")); // default "" salt
  });

  it("ADVERSARIAL: null / undefined / number input still yields a 12-hex hash, no throw", () => {
    expect(() => hashKeyword(null as unknown as string)).not.toThrow();
    expect(hashKeyword(null as unknown as string)).toMatch(/^[0-9a-f]{12}$/);
    expect(hashKeyword(undefined as unknown as string)).toMatch(/^[0-9a-f]{12}$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// E. Consumer — capInjection (8 KB cap)
// ════════════════════════════════════════════════════════════════════════════
describe("wiki-precheck-inject.capInjection", () => {
  it("returns the full assembled text verbatim when under the cap", () => {
    expect(capInjection("HEADER", ["- a", "- b"], "FOOTER", 8192)).toBe("HEADER\n- a\n- b\nFOOTER");
  });

  it("trims entry lines from the end and stays under the cap when over", () => {
    const entries = Array.from({ length: 500 }, (_, i) => "- entry line " + i + " with padding to bloat bytes");
    const out = capInjection("HEADER", entries, "FOOTER", 8192);
    expect(Buffer.byteLength(out, "utf8")).toBeLessThanOrEqual(8192);
    expect(out.startsWith("HEADER")).toBe(true);
    expect(out.endsWith("FOOTER")).toBe(true);
    expect(out).toContain("trimmed"); // the cap is never silent
    // it kept at least one entry and dropped at least one
    expect(out).toContain("- entry line 0 ");
    expect(out).not.toContain("- entry line 499 ");
  });

  it("counts multibyte (emoji) bytes correctly", () => {
    const header = "## 📚 Wiki precheck"; // 📚 is 4 UTF-8 bytes
    const out = capInjection(header, ["- x"], "FOOTER", 8192);
    expect(out).toBe(header + "\n- x\nFOOTER");
    expect(Buffer.byteLength(out, "utf8")).toBe(Buffer.byteLength(header, "utf8") + "\n- x\nFOOTER".length);
  });

  it("ADVERSARIAL: header+footer alone exceeding the cap returns the header (defensive, no crash)", () => {
    const huge = "H".repeat(20000);
    expect(capInjection(huge, ["- a"], "F".repeat(20000), 8192)).toBe(huge);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// F. Consumer — loadLeafCorpus + main() integration (env-isolated)
// ════════════════════════════════════════════════════════════════════════════
describe("wiki-precheck-inject.loadLeafCorpus", () => {
  it("carries boost_keywords from the JSONL onto each entry, exactly null when absent", async () => {
    writeLeafIndex([
      { name: "boosted-entry", title: "Boosted", type: "architecture", desc: "x", boost_keywords: ["alpha", "beta"] },
      { name: "plain-entry", title: "Plain", type: "engine", desc: "y" },
    ]);
    const m = await freshHook();
    const corpus = m.loadLeafCorpus();
    const boosted = corpus.entries.find((e: { name: string }) => e.name === "boosted-entry");
    const plain = corpus.entries.find((e: { name: string }) => e.name === "plain-entry");
    expect(boosted.boost).toEqual(["alpha", "beta"]);
    expect(plain.boost).toBe(null);
  });

  it("re-validates malformed boost_keywords down to null / clean array (adversarial JSONL)", async () => {
    writeLeafIndex([
      { name: "bad-boost", title: "Bad", type: "architecture", desc: "x", boost_keywords: "not-an-array" },
      { name: "mixed-boost", title: "Mixed", type: "architecture", desc: "x", boost_keywords: ["GOOD", 99, null, " keep "] },
    ]);
    const m = await freshHook();
    const corpus = m.loadLeafCorpus();
    expect(corpus.entries.find((e: { name: string }) => e.name === "bad-boost").boost).toBe(null);
    expect(corpus.entries.find((e: { name: string }) => e.name === "mixed-boost").boost).toEqual(["good", "keep"]);
  });
});

describe("wiki-precheck-inject.main — boost_keywords integration", () => {
  it("HAPPY PATH: a boost keyword surfaces its entry with a boost tag", async () => {
    writeLeafIndex([
      { name: "hook-synergy-ms0", title: "HOOK-SYNERGY-MS0", type: "architecture", desc: "hook + coordination infra", boost_keywords: ["settings.json", "*.mjs"] },
    ]);
    const m = await freshHook();
    const res = await m.main({ prompt: "how do I wire a new hook into settings.json safely" });
    expect(res.continue).toBe(true);
    const ctx = res.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("[[hook-synergy-ms0]]");
    expect(ctx).toContain("boost:");
  });

  it("FAILURE MODE: no match returns exactly {continue:true} (no injection) and logs a salted miss", async () => {
    writeLeafIndex([
      { name: "hook-synergy-ms0", title: "X", type: "architecture", desc: "x", boost_keywords: ["settings.json"] },
    ]);
    const m = await freshHook();
    const res = await m.main({ prompt: "zxqwv totally unrelated topic vbnmplk nothing here" });
    expect(res).toEqual({ continue: true }); // no hookSpecificOutput key at all
    const missLog = process.env.PRISM_WIKI_MISSES_LOG!;
    expect(fs.existsSync(missLog)).toBe(true);
    const rec = JSON.parse(fs.readFileSync(missLog, "utf8").trim().split("\n").pop()!);
    expect(rec.hashedKeywords.length).toBeGreaterThan(0);
    expect(rec.hashedKeywords.every((h: string) => /^[0-9a-f]{12}$/.test(h))).toBe(true);
    expect(rec.hook).toBe("wiki-precheck-inject");
    // raw prompt tokens must NOT appear anywhere in the record
    expect(JSON.stringify(rec)).not.toContain("zxqwv");
    expect(JSON.stringify(rec)).not.toContain("vbnmplk");
    // the salt file is created next to the misses log, and is 32 hex chars (16 random bytes)
    const saltPath = path.join(path.dirname(missLog), ".wiki-miss-salt");
    expect(fs.existsSync(saltPath)).toBe(true);
    expect(fs.readFileSync(saltPath, "utf8").trim()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("FAILURE MODE: logMiss self-rotates the ledger past MAX_MISSES_BYTES (1 MB)", async () => {
    writeLeafIndex([{ name: "x", title: "X", type: "architecture", desc: "x" }]);
    const missLog = process.env.PRISM_WIKI_MISSES_LOG!;
    fs.mkdirSync(path.dirname(missLog), { recursive: true });
    fs.writeFileSync(missLog, "x".repeat(1048577)); // 1 MB + 1 byte → next miss must rotate
    const m = await freshHook();
    await m.main({ prompt: "zxqwv another unrelated miss to trigger the rotation path" });
    expect(fs.existsSync(missLog + ".1")).toBe(true);                 // old ledger rotated aside
    expect(fs.statSync(missLog + ".1").size).toBe(1048577);           // .1 holds the old content
    expect(fs.statSync(missLog).size).toBeLessThan(1048576);          // fresh ledger started small
    expect(fs.readFileSync(missLog, "utf8")).toContain('"wiki-precheck-inject"'); // new record landed
  });

  it("FAILURE MODE: PRISM_WIKI_PRECHECK=0 disables the hook (no-op pass-through)", async () => {
    writeLeafIndex([{ name: "x", title: "X", type: "architecture", desc: "x", boost_keywords: ["settings.json"] }]);
    const m = await freshHook();
    process.env.PRISM_WIKI_PRECHECK = "0";
    const res = await m.main({ prompt: "how do I edit settings.json in the hook" });
    expect(res).toEqual({ continue: true });
  });

  it("FAILURE MODE: a too-short prompt is skipped (returns exactly {continue:true})", async () => {
    writeLeafIndex([{ name: "x", title: "X", type: "architecture", desc: "x", boost_keywords: ["hi"] }]);
    const m = await freshHook();
    expect(await m.main({ prompt: "hi" })).toEqual({ continue: true });
  });

  it("ADVERSARIAL: a missing leaf-index does not throw — returns a safe pass-through", async () => {
    // no writeLeafIndex() call → PRISM_WIKI_LEAF_INDEX points at a non-existent file
    const m = await freshHook();
    expect(await m.main({ prompt: "a perfectly normal prompt that just has no corpus to match" }))
      .toEqual({ continue: true });
  });

  it("main() injection respects the MAX_INJECT_BYTES bound (the cap's trim branch is unit-tested in section E)", async () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({
      name: "boosted-" + i,
      title: "T" + i,
      type: "architecture",
      desc: "very long description ".repeat(20) + i,
      boost_keywords: ["commontoken"],
    }));
    writeLeafIndex(entries);
    const m = await freshHook();
    const res = await m.main({ prompt: "please tell me about the commontoken subject in detail" });
    const ctx = res.hookSpecificOutput?.additionalContext || "";
    expect(ctx.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(ctx, "utf8")).toBeLessThanOrEqual(8192);
  });

  it("VARIABILITY: boost matching spans 3 keyword shapes — phrase, dotted filename, glob", async () => {
    writeLeafIndex([
      { name: "phrase-entry", title: "P", type: "architecture", desc: "p", boost_keywords: ["close out audit"] },
      { name: "file-entry", title: "F", type: "architecture", desc: "f", boost_keywords: ["package.json"] },
      { name: "glob-entry", title: "G", type: "architecture", desc: "g", boost_keywords: ["*.test.ts"] },
    ]);
    let m = await freshHook();
    expect((await m.main({ prompt: "run the close out audit before shipping" }))
      .hookSpecificOutput?.additionalContext || "").toContain("[[phrase-entry]]");
    m = await freshHook();
    expect((await m.main({ prompt: "what goes in the package.json scripts block" }))
      .hookSpecificOutput?.additionalContext || "").toContain("[[file-entry]]");
    m = await freshHook();
    expect((await m.main({ prompt: "where does Foo.test.ts live in the tree" }))
      .hookSpecificOutput?.additionalContext || "").toContain("[[glob-entry]]");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G. End-to-end — real producer subprocess → real consumer hook
// ════════════════════════════════════════════════════════════════════════════
describe("D5 producer → consumer integration", () => {
  it("isDirectRun guard: importing the producer module does NOT regenerate the real _leaf-index.jsonl", async () => {
    // The whole suite's safety depends on this — a regressed guard would have
    // the producer's main() overwrite the real repo file on every import.
    const before = fs.statSync(REAL_LEAF_INDEX).mtimeMs;
    await import(PRODUCER_URL + "?t=" + Math.random());
    expect(fs.statSync(REAL_LEAF_INDEX).mtimeMs).toBe(before);
  });

  it("a boost_keywords frontmatter survives the real producer → real hook round-trip", () => {
    // 1. tmp wiki tree with one architecture entry carrying boost_keywords
    const archDir = path.join(TMP, "arch");
    fs.mkdirSync(archDir, { recursive: true });
    fs.writeFileSync(
      path.join(archDir, "round-trip-entry.md"),
      "---\ntitle: Round Trip Entry\ntype: architecture\nboost_keywords: [settings.json, \"*.mjs\"]\n---\n\n# Round Trip Entry\n\n> verifies the producer↔consumer boost_keywords contract\n",
    );
    // 2. run the REAL producer as a subprocess (the actual CLI invocation path)
    const r = cp.spawnSync(process.execPath, [PRODUCER_PATH], {
      env: {
        ...process.env,
        PRISM_WIKI_ARCH_DIR: archDir,
        PRISM_WIKI_TRIBAL_DIR: path.join(TMP, "no-tribal"),
        PRISM_WIKI_CODE_TRIBAL_DIR: path.join(TMP, "no-code-tribal"),
      },
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    // 3. producer wrote _leaf-index.jsonl into the tmp arch dir
    const producedIndex = path.join(archDir, "_leaf-index.jsonl");
    expect(fs.existsSync(producedIndex)).toBe(true);
    const producedRec = JSON.parse(fs.readFileSync(producedIndex, "utf8").trim().split("\n")[0]);
    expect(producedRec.name).toBe("round-trip-entry");
    // contract: producer emits the field as `boost_keywords` (snake_case), lowercased
    expect(producedRec.boost_keywords).toEqual(["settings.json", "*.mjs"]);
  });

  it("the hook reads the producer's real output and surfaces the boosted entry", async () => {
    const archDir = path.join(TMP, "arch2");
    fs.mkdirSync(archDir, { recursive: true });
    fs.writeFileSync(
      path.join(archDir, "consumed-entry.md"),
      "---\ntitle: Consumed Entry\ntype: architecture\nboost_keywords:\n  - taper compensation\n---\n\n# Consumed Entry\n\n> block-form boost_keywords, consumed end-to-end\n",
    );
    const r = cp.spawnSync(process.execPath, [PRODUCER_PATH], {
      env: {
        ...process.env,
        PRISM_WIKI_ARCH_DIR: archDir,
        PRISM_WIKI_TRIBAL_DIR: path.join(TMP, "no-tribal2"),
        PRISM_WIKI_CODE_TRIBAL_DIR: path.join(TMP, "no-code-tribal2"),
      },
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    // point the hook at the producer's actual output and run main()
    process.env.PRISM_WIKI_LEAF_INDEX = path.join(archDir, "_leaf-index.jsonl");
    const m = await freshHook();
    const res = await m.main({ prompt: "explain taper compensation for wire EDM cuts" });
    expect(res.hookSpecificOutput?.additionalContext || "").toContain("[[consumed-entry]]");
  });
});
