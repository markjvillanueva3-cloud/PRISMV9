#!/usr/bin/env node
// tribal-by-domain-inject.test.mjs — hermetic node:test suite
//
// Pure-function tests for extractPrompt / inferTribalDomain /
// parseRerankOutput / formatInjection. No Ollama / no subprocess.
//
// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractPrompt,
  inferTribalDomain,
  parseRerankOutput,
  formatInjection,
} from "./tribal-by-domain-inject.mjs";

describe("extractPrompt", () => {
  it("returns trimmed prompt for valid top-level input", () => {
    assert.equal(extractPrompt({ prompt: "  hello world  " }), "hello world");
  });

  it("supports user_prompt alias", () => {
    assert.equal(extractPrompt({ user_prompt: "alt key" }), "alt key");
  });

  it("supports nested hook_input.prompt", () => {
    assert.equal(extractPrompt({ hook_input: { prompt: "nested" } }), "nested");
  });

  it("returns null for null/undefined/non-object input", () => {
    assert.equal(extractPrompt(null), null);
    assert.equal(extractPrompt(undefined), null);
    assert.equal(extractPrompt("string-input"), null);
    assert.equal(extractPrompt(42), null);
  });

  it("returns null when prompt field missing", () => {
    assert.equal(extractPrompt({}), null);
    assert.equal(extractPrompt({ session_id: "abc" }), null);
  });

  it("returns null for non-string prompt", () => {
    assert.equal(extractPrompt({ prompt: 123 }), null);
    assert.equal(extractPrompt({ prompt: { nested: "x" } }), null);
  });

  it("returns null for prompt shorter than MIN_PROMPT_LEN (4)", () => {
    assert.equal(extractPrompt({ prompt: "hi" }), null);
    assert.equal(extractPrompt({ prompt: "  " }), null);
    assert.equal(extractPrompt({ prompt: "" }), null);
  });

  it("truncates to MAX_PROMPT_LEN (300)", () => {
    const long = "a".repeat(500);
    const result = extractPrompt({ prompt: long });
    assert.equal(result.length, 300);
  });

  it("trims before length check (whitespace-only prompts rejected)", () => {
    assert.equal(extractPrompt({ prompt: "    " }), null);
  });

  it("ignores prototype-pollution-style prompt injection", () => {
    // P1-A from reviewer-B: hostile callers may set __proto__.prompt expecting
    // the chain to fall through. Our `typeof p !== "string"` guard filters the
    // result of the truthy chain — but in JSON.parse'd objects, __proto__ is
    // ignored by spec so the own-property check is moot. This regression-asserts
    // both: (a) JSON.parse'd __proto__ key is inert, (b) hand-built __proto__
    // pollution still returns null because no own `prompt`/`user_prompt` exists.
    const polluted = JSON.parse('{"__proto__":{"prompt":"evil"}}');
    assert.equal(extractPrompt(polluted), null);
    const handPolluted = Object.create({ prompt: "evil" });
    assert.equal(extractPrompt(handPolluted), null);
  });
});

describe("module-load smoke test (regression for P2-A: module-load failure bypasses main().catch)", () => {
  it("imports cleanly — wiki-domain-bias.mjs export contract intact", async () => {
    const mod = await import("./tribal-by-domain-inject.mjs");
    assert.equal(typeof mod.extractPrompt, "function");
    assert.equal(typeof mod.inferTribalDomain, "function");
    assert.equal(typeof mod.parseRerankOutput, "function");
    assert.equal(typeof mod.formatInjection, "function");
    assert.equal(typeof mod.main, "function");
  });
});

describe("inferTribalDomain", () => {
  it("returns general for empty/missing tokens", () => {
    assert.equal(inferTribalDomain([]), "general");
    assert.equal(inferTribalDomain(null), "general");
    assert.equal(inferTribalDomain(undefined), "general");
  });

  it("returns general for non-array input", () => {
    assert.equal(inferTribalDomain("mill"), "general");
    assert.equal(inferTribalDomain({}), "general");
  });

  it("matches mill from canonical tokens", () => {
    assert.equal(inferTribalDomain(["mill"]), "mill");
    assert.equal(inferTribalDomain(["milling", "thinwall"]), "mill");
    assert.equal(inferTribalDomain(["kienzle"]), "mill");
  });

  it("matches lathe from canonical tokens", () => {
    assert.equal(inferTribalDomain(["lathe"]), "lathe");
    assert.equal(inferTribalDomain(["turning"]), "lathe");
    assert.equal(inferTribalDomain(["okuma"]), "lathe");
  });

  it("matches wedm from canonical tokens", () => {
    assert.equal(inferTribalDomain(["wedm"]), "wedm");
    assert.equal(inferTribalDomain(["edm"]), "wedm");
    assert.equal(inferTribalDomain(["sodick"]), "wedm");
  });

  it("matches cad from canonical tokens", () => {
    assert.equal(inferTribalDomain(["cad"]), "cad");
    assert.equal(inferTribalDomain(["fusion"]), "cad");
    assert.equal(inferTribalDomain(["solidworks"]), "cad");
  });

  it("matches cam from canonical tokens", () => {
    assert.equal(inferTribalDomain(["cam"]), "cam");
    assert.equal(inferTribalDomain(["mastercam"]), "cam");
    assert.equal(inferTribalDomain(["toolpath"]), "cam");
  });

  it("returns general for unrelated tokens (e.g. system-viz)", () => {
    assert.equal(inferTribalDomain(["system", "viz", "brain"]), "general");
    assert.equal(inferTribalDomain(["hook", "synergy"]), "general");
  });

  it("is case-insensitive", () => {
    assert.equal(inferTribalDomain(["MILL"]), "mill");
    assert.equal(inferTribalDomain(["Lathe"]), "lathe");
  });

  it("mill wins over lathe when both present (declaration order)", () => {
    assert.equal(inferTribalDomain(["mill", "turning"]), "mill");
  });
});

describe("parseRerankOutput", () => {
  it("parses hits[] array", () => {
    const stdout = JSON.stringify({
      ok: true,
      hits: [
        { score: 0.85, source: "tip-1", title: "Chatter on thin wall", text: "Use lower stepover..." },
        { score: 0.72, source: "tip-2", title: "Tool deflection", text: "Reduce DOC..." },
      ],
    });
    const result = parseRerankOutput(stdout, 5);
    assert.equal(result.length, 2);
    assert.equal(result[0].score, 0.85);
    assert.equal(result[0].title, "Chatter on thin wall");
    assert.equal(result[0].source, "tip-1");
    assert.equal(result[0].snippet, "Use lower stepover...");
  });

  it("falls back to results[] alias", () => {
    const stdout = JSON.stringify({
      ok: true,
      results: [{ score: 0.5, source: "x", title: "T", text: "S" }],
    });
    const result = parseRerankOutput(stdout, 5);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, "T");
  });

  it("returns empty array for invalid JSON", () => {
    assert.deepEqual(parseRerankOutput("not json", 5), []);
    assert.deepEqual(parseRerankOutput("", 5), []);
    assert.deepEqual(parseRerankOutput(null, 5), []);
  });

  it("returns empty array when neither hits nor results present", () => {
    assert.deepEqual(parseRerankOutput(JSON.stringify({ ok: false }), 5), []);
  });

  it("caps to topK", () => {
    const stdout = JSON.stringify({
      hits: Array(10).fill(0).map((_, i) => ({ score: 1 - i * 0.1, source: `s${i}`, title: `t${i}`, text: `text${i}` })),
    });
    assert.equal(parseRerankOutput(stdout, 3).length, 3);
  });

  it("truncates snippet to 140 chars", () => {
    const stdout = JSON.stringify({
      hits: [{ score: 0.9, source: "s", title: "t", text: "x".repeat(500) }],
    });
    assert.equal(parseRerankOutput(stdout, 1)[0].snippet.length, 140);
  });

  it("handles missing/non-numeric score", () => {
    const stdout = JSON.stringify({
      hits: [{ source: "s", title: "t" }],
    });
    const result = parseRerankOutput(stdout, 1);
    assert.equal(result[0].score, 0);
  });

  it("falls back source to path field if source missing", () => {
    const stdout = JSON.stringify({
      hits: [{ score: 0.5, path: "knowledge/tips/x.md", title: "t" }],
    });
    assert.equal(parseRerankOutput(stdout, 1)[0].source, "knowledge/tips/x.md");
  });

  it("falls back title to id field", () => {
    const stdout = JSON.stringify({
      hits: [{ score: 0.5, source: "s", id: "tip-42" }],
    });
    assert.equal(parseRerankOutput(stdout, 1)[0].title, "tip-42");
  });
});

describe("formatInjection", () => {
  it("returns null for empty hits", () => {
    assert.equal(formatInjection([], "mill"), null);
  });

  it("includes domain in header", () => {
    const out = formatInjection([{ score: 0.5, source: "s", title: "t", snippet: "" }], "wedm");
    assert.match(out, /`wedm`/);
  });

  it("includes hit count in header", () => {
    const hits = [
      { score: 0.8, source: "s1", title: "t1", snippet: "" },
      { score: 0.6, source: "s2", title: "t2", snippet: "" },
    ];
    assert.match(formatInjection(hits, "mill"), /2 hit\(s\)/);
  });

  it("includes score formatted to 2 decimals", () => {
    const out = formatInjection(
      [{ score: 0.8523, source: "s", title: "t", snippet: "" }],
      "cad",
    );
    assert.match(out, /\[0\.85 ·/);
  });

  it("omits snippet section on body line when snippet empty", () => {
    const out = formatInjection(
      [{ score: 0.5, source: "s", title: "t", snippet: "" }],
      "general",
    );
    const bodyLine = out.split("\n").find((l) => l.startsWith("1. "));
    assert.ok(bodyLine, "expected a numbered body line");
    assert.equal(bodyLine.includes(" — "), false);
  });

  it("includes snippet section on body line when present", () => {
    const out = formatInjection(
      [{ score: 0.5, source: "s", title: "t", snippet: "reduce stepover" }],
      "general",
    );
    const bodyLine = out.split("\n").find((l) => l.startsWith("1. "));
    assert.ok(bodyLine, "expected a numbered body line");
    assert.match(bodyLine, /— reduce stepover/);
  });

  it("includes the disable knob in footer", () => {
    const out = formatInjection(
      [{ score: 0.5, source: "s", title: "t", snippet: "" }],
      "mill",
    );
    assert.match(out, /PRISM_TRIBAL_DOMAIN_INJECT_DISABLE/);
  });

  it("numbers items sequentially", () => {
    const hits = Array(3).fill(0).map((_, i) => ({ score: 0.5, source: `s${i}`, title: `t${i}`, snippet: "" }));
    const out = formatInjection(hits, "lathe");
    assert.match(out, /^1\. /m);
    assert.match(out, /^2\. /m);
    assert.match(out, /^3\. /m);
  });
});
