#!/usr/bin/env node
// tribal-by-domain-inject.test.mjs — hermetic node:test suite
//
// Pure-function tests for extractPrompt / inferTribalDomain /
// parseRerankOutput / formatInjection. No Ollama / no subprocess.
//
// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  extractPrompt,
  inferTribalDomain,
  parseRerankOutput,
  applyLexicalRerank,
  formatInjection,
  SLOT_TRIBAL_DOMAIN,
} from "./tribal-by-domain-inject.mjs";
import { DEFAULT_STATE_DIR, safeSessionId, promptHash } from "../../scripts/lib/inject-throttle.mjs";

// --- U-TRIBAL-DOMAIN-THROTTLE (2026-06-10 slot:bravo) ---
// Subprocess integration: a /loop re-submits the IDENTICAL prompt every tick;
// this hook's rerank spawns a subprocess + Ollama embed each time. The throttle
// stamps state BEFORE the rerank, and a suppressed tick does NOT re-stamp
// (shouldThrottleInject saves only on the inject path) -- so an unchanged ts
// after a 2nd identical tick proves suppression, independent of Ollama/approve().
describe("U-TRIBAL-DOMAIN-THROTTLE -- same-prompt /loop suppression (subprocess)", () => {
  const HOOK = "H:/prism/.claude/hooks/tribal-by-domain-inject.mjs";
  const NODE = process.execPath;
  const runHook = ({ prompt, sessionId, env = {}, timeoutMs = 30000 }) => {
    const r = spawnSync(NODE, [HOOK], {
      input: JSON.stringify({ prompt, session_id: sessionId }),
      encoding: "utf8", env: { ...process.env, ...env }, timeout: timeoutMs,
    });
    return { status: r.status, stdout: r.stdout || "" };
  };
  const statePathFor = (sid) => join(DEFAULT_STATE_DIR, `${safeSessionId(sid)}.json`);

  it("1st inject stamps state; an identical 2nd within TTL is throttled (no re-stamp)", () => {
    const S = "test-tribal-throttle-suppress";
    const P = "throttle wiring probe for tribal by domain inject loop tick";
    const sp = statePathFor(S);
    try { if (existsSync(sp)) unlinkSync(sp); } catch { /* clean slate */ }
    try {
      // Big TTL so a slow spawn can't widen past the window; tiny rerank timeout
      // so tick-1 returns fast (the throttle stamps BEFORE the rerank subprocess,
      // so the assertion holds even if Ollama is slow/down).
      const env = { PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS: "600000", PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS: "600" };
      const r1 = runHook({ prompt: P, sessionId: S, env });
      assert.equal(r1.status, 0);
      assert.ok(existsSync(sp), "throttle state stamped on 1st inject (wiring live)");
      const st1 = JSON.parse(readFileSync(sp, "utf8"));
      assert.equal(st1.hash, promptHash(P), "stamped hash matches the prompt");
      const r2 = runHook({ prompt: P, sessionId: S, env });
      assert.equal(r2.status, 0);
      const st2 = JSON.parse(readFileSync(sp, "utf8"));
      assert.equal(st2.ts, st1.ts, "2nd identical tick is throttled -> ts unchanged (not re-injected)");
    } finally {
      try { if (existsSync(sp)) unlinkSync(sp); } catch { /* swallow */ }
    }
  });

  it("PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS=0 disables the throttle (writes no state)", () => {
    const S = "test-tribal-throttle-disabled";
    const P = "throttle knob-off probe for tribal by domain inject";
    const sp = statePathFor(S);
    try { if (existsSync(sp)) unlinkSync(sp); } catch { /* clean slate */ }
    try {
      const env = { PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS: "0", PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS: "600" };
      const r1 = runHook({ prompt: P, sessionId: S, env });
      assert.equal(r1.status, 0);
      assert.ok(!existsSync(sp), "ttl=0 writes NO throttle state");
    } finally {
      try { if (existsSync(sp)) unlinkSync(sp); } catch { /* swallow */ }
    }
  });
});

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
    assert.equal(typeof mod.applyLexicalRerank, "function");
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

  it("returns general for unrelated tokens (no backend-dev signal either)", () => {
    // `system`, `viz`, `brain` are not in ANY of the 6 domain sets (mill/lathe/
    // wedm/cad/cam/backend-dev). With the 2026-05-18 backend-dev wiring, tokens
    // like `hook`/`synergy`/`fleet` now route to backend-dev (see test below);
    // this case keeps the "no domain at all → general" fallback path covered.
    assert.equal(inferTribalDomain(["system", "viz", "brain"]), "general");
    assert.equal(inferTribalDomain(["random", "unrelated", "tokens"]), "general");
  });

  it("matches backend-dev from canonical milestone tokens (2026-05-18)", () => {
    // BACKEND-DEV-LOOP / HOOK-SYNERGY-MS0 / OLLAMA-PIPELINE-MS0 /
    // NN-GRAPH-MS0 / COMMAND-KERNEL-MS0 / SLOT-WORKTREE-MS0 all signal
    // pure dev work (no physical-manufacturing axis). The hook routes
    // them to `backend-dev` so the index's backend-dev-tagged tribal
    // entries get the 2× in-domain cosine boost.
    assert.equal(inferTribalDomain(["backend"]), "backend-dev");
    assert.equal(inferTribalDomain(["hook", "synergy"]), "backend-dev");
    assert.equal(inferTribalDomain(["ollama"]), "backend-dev");
    assert.equal(inferTribalDomain(["lora"]), "backend-dev");
    assert.equal(inferTribalDomain(["gnn"]), "backend-dev");
    assert.equal(inferTribalDomain(["neural"]), "backend-dev");
    assert.equal(inferTribalDomain(["llm"]), "backend-dev");
    assert.equal(inferTribalDomain(["embedding"]), "backend-dev");
    assert.equal(inferTribalDomain(["kernel", "command"]), "backend-dev");
    assert.equal(inferTribalDomain(["slot", "worktree"]), "backend-dev");
  });

  it("manufacturing tokens still win over backend-dev (first-match-wins precedence)", () => {
    // Critical safety invariant: a mill/lathe/wedm/cad/cam slot whose topic
    // happens to also contain a backend-dev token MUST still route to the
    // manufacturing domain. Backend-dev is declared LAST in DOMAIN_MAP.
    assert.equal(inferTribalDomain(["mill", "hook"]), "mill");
    assert.equal(inferTribalDomain(["lathe", "ollama"]), "lathe");
    assert.equal(inferTribalDomain(["wedm", "neural"]), "wedm");
    assert.equal(inferTribalDomain(["cad", "embedding"]), "cad");
    assert.equal(inferTribalDomain(["cam", "lora"]), "cam");
  });

  it("is case-insensitive (incl. backend-dev tokens)", () => {
    assert.equal(inferTribalDomain(["MILL"]), "mill");
    assert.equal(inferTribalDomain(["Lathe"]), "lathe");
    assert.equal(inferTribalDomain(["OLLAMA"]), "backend-dev");
    assert.equal(inferTribalDomain(["Hook"]), "backend-dev");
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

describe("applyLexicalRerank (U-RAG-2 stage-2)", () => {
  it("returns [] for non-array input", () => {
    assert.deepEqual(applyLexicalRerank("cutting force", null, 3), []);
    assert.deepEqual(applyLexicalRerank("cutting force", undefined, 3), []);
    assert.deepEqual(applyLexicalRerank("cutting force", "nope", 3), []);
  });

  it("returns [] for empty hits", () => {
    assert.deepEqual(applyLexicalRerank("cutting force", [], 3), []);
  });

  it("passes a single hit through (sliced to topK)", () => {
    const one = [{ score: 0.5, source: "a", title: "t", snippet: "x" }];
    assert.deepEqual(applyLexicalRerank("cutting force", one, 3), one);
  });

  it("re-ranks: a strong lexical match beats a higher-cosine non-match", () => {
    // Stage-1 (cosine) order keeps A first (0.9 > 0.5). Stage-2 lexical MUST
    // promote B — full query-term coverage, the verbatim phrase, a title hit,
    // high density — none of which A has. This test fails if applyLexicalRerank
    // ever degrades to a pass-through (R9 — verifies intent, not behavior).
    const hits = [
      { score: 0.9, source: "a", title: "Finish", snippet: "surface finish roughness" },
      { score: 0.5, source: "b", title: "Force",  snippet: "cutting force model kienzle" },
    ];
    const out = applyLexicalRerank("cutting force", hits, 2);
    assert.equal(out[0].source, "b", "lexical winner must lead");
    assert.equal(out[1].source, "a");
  });

  it("narrows the candidate set to topK", () => {
    const hits = Array(8).fill(0).map((_, i) => ({
      score: 1 - i * 0.1, source: `s${i}`, title: `t${i}`, snippet: `cutting force ${i}`,
    }));
    assert.equal(applyLexicalRerank("cutting force", hits, 3).length, 3);
  });

  it("stays within topK on an all-stopword query (rerank degrades to a copy)", () => {
    // `rerank` returns an unsliced copy when the query tokenizes to nothing;
    // the defensive .slice(0, topK) must still bound the injected output.
    const hits = Array(6).fill(0).map((_, i) => ({
      score: 0.5, source: `s${i}`, title: `t${i}`, snippet: `body ${i}`,
    }));
    assert.equal(applyLexicalRerank("the and of", hits, 3).length, 3);
  });

  it("preserves the cosine hit shape consumed by formatInjection", () => {
    const hits = [
      { score: 0.7, source: "a", title: "Force model", snippet: "cutting force" },
      { score: 0.6, source: "b", title: "Other",       snippet: "unrelated" },
    ];
    const out = applyLexicalRerank("cutting force", hits, 2);
    for (const h of out) {
      assert.equal(typeof h.score, "number");
      assert.equal(typeof h.source, "string");
      assert.equal(typeof h.title, "string");
      assert.equal(typeof h.snippet, "string");
      // the reranker-scoring inputs (text/label) must NOT leak into the hit
      assert.equal(h.text, undefined);
      assert.equal(h.label, undefined);
    }
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

describe("SLOT_TRIBAL_DOMAIN", () => {
  // Mirrors tribal-rerank.mjs VALID_DOMAINS. A value outside this set makes the
  // rerank exit non-zero -> hook injects nothing (the regression this map fixes).
  const VALID = new Set(["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]);

  it("every mapped domain is a VALID tribal-rerank domain (no fail-loud regression)", () => {
    for (const [slot, dom] of Object.entries(SLOT_TRIBAL_DOMAIN)) {
      assert.ok(VALID.has(dom), `slot ${slot} -> ${dom} is NOT a valid rerank domain`);
    }
  });

  it("maps the 11 operator-named priority slots to their canonical domains", () => {
    assert.equal(SLOT_TRIBAL_DOMAIN.oscar, "mill");
    assert.equal(SLOT_TRIBAL_DOMAIN.foxtrot, "mill");
    assert.equal(SLOT_TRIBAL_DOMAIN.mike, "wedm");
    assert.equal(SLOT_TRIBAL_DOMAIN.whiskey, "lathe");
    assert.equal(SLOT_TRIBAL_DOMAIN.delta, "cad");
    assert.equal(SLOT_TRIBAL_DOMAIN.xray, "cad");
    assert.equal(SLOT_TRIBAL_DOMAIN.kilo, "cam");
    assert.equal(SLOT_TRIBAL_DOMAIN.echo, "cam");
    assert.equal(SLOT_TRIBAL_DOMAIN.juliett, "backend-dev");
    assert.equal(SLOT_TRIBAL_DOMAIN.india, "backend-dev");
    assert.equal(SLOT_TRIBAL_DOMAIN.hotel, "general");
  });
});
