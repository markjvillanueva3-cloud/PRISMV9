#!/usr/bin/env node
/**
 * retag-tribal-backend-dev.test.mjs — hermetic node:test suite
 *
 * Pure-function coverage for scoreEntry / classify / planRetag / applyPlan.
 * No filesystem reads or writes. Run:
 *   node --test H:/prism/scripts/retag-tribal-backend-dev.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BD_KEYWORD_RE,
  TARGET_DOMAIN,
  scoreEntry,
  classify,
  planRetag,
  applyPlan,
} from "./retag-tribal-backend-dev.mjs";

describe("BD_KEYWORD_RE", () => {
  it("matches high-signal backend-dev tokens", () => {
    assert.ok(BD_KEYWORD_RE.test("we wired the lora adapter"));
    assert.ok(BD_KEYWORD_RE.test("ollama integration"));
    assert.ok(BD_KEYWORD_RE.test("gnn link-prediction"));
    assert.ok(BD_KEYWORD_RE.test("Karpathy R12 rule"));
    assert.ok(BD_KEYWORD_RE.test("nomic-embed-text"));
  });

  it("does NOT match generic manufacturing text", () => {
    assert.equal(BD_KEYWORD_RE.test("spindle rpm and chip load"), false);
    assert.equal(BD_KEYWORD_RE.test("kienzle force on aluminum"), false);
    assert.equal(BD_KEYWORD_RE.test("the database appears as an entry"), false);
  });

  it("word-boundary anchored — rag does not match program/dragnet", () => {
    assert.equal(BD_KEYWORD_RE.test("program flow"), false);
    assert.equal(BD_KEYWORD_RE.test("dragnet capture"), false);
    assert.ok(BD_KEYWORD_RE.test("the rag pipeline"));
  });
});

describe("scoreEntry", () => {
  it("returns 0 for null/undefined/non-object", () => {
    assert.equal(scoreEntry(null), 0);
    assert.equal(scoreEntry(undefined), 0);
    assert.equal(scoreEntry("string"), 0);
    assert.equal(scoreEntry(42), 0);
  });

  it("returns 0 for entry with no backend-dev tokens", () => {
    assert.equal(scoreEntry({ text: "the spindle and the chuck", title: "lathe setup" }), 0);
  });

  it("counts multiple keyword occurrences", () => {
    const entry = { text: "ollama and lora and gnn and llm", title: "" };
    assert.equal(scoreEntry(entry), 4);
  });

  it("merges text + title", () => {
    const entry = { text: "ollama", title: "lora" };
    assert.equal(scoreEntry(entry), 2);
  });

  it("handles missing text/title fields", () => {
    assert.equal(scoreEntry({}), 0);
    assert.equal(scoreEntry({ text: null, title: null }), 0);
  });

  it("is case-insensitive", () => {
    assert.equal(scoreEntry({ text: "OLLAMA and Lora", title: "" }), 2);
  });
});

describe("classify", () => {
  it("returns invalid-entry for null/undefined/non-object", () => {
    assert.deepEqual(classify(null), { retag: false, reason: "invalid-entry", score: 0 });
    assert.deepEqual(classify(undefined), { retag: false, reason: "invalid-entry", score: 0 });
    assert.deepEqual(classify("string"), { retag: false, reason: "invalid-entry", score: 0 });
  });

  it("returns already for entries already at backend-dev", () => {
    const e = { domain: TARGET_DOMAIN, source: "memory", text: "ollama and lora and llm" };
    const c = classify(e);
    assert.equal(c.retag, false);
    assert.equal(c.reason, "already");
  });

  it("retags memory entries with kw >= 2", () => {
    const c = classify({ source: "memory", domain: "general", text: "ollama integration with lora" });
    assert.equal(c.retag, true);
    assert.match(c.reason, /^memory\+kw\d/);
    assert.ok(c.score >= 2);
  });

  it("does NOT retag memory entries with kw < 2", () => {
    const c = classify({ source: "memory", domain: "general", text: "only ollama here" });
    assert.equal(c.retag, false);
    assert.equal(c.reason, "below-threshold");
  });

  it("retags external entries with kw >= 4 (stricter than memory)", () => {
    const c = classify({ source: "external", domain: "general", text: "ollama lora gnn llm embedding" });
    assert.equal(c.retag, true);
    assert.match(c.reason, /^external\+kw\d/);
  });

  it("does NOT retag external entries with kw 2 or 3 (below external threshold)", () => {
    const c = classify({ source: "external", domain: "general", text: "ollama and lora" });
    assert.equal(c.retag, false);
    assert.equal(c.reason, "below-threshold");
  });

  it("does NOT retag wiki entries regardless of kw count", () => {
    const c = classify({ source: "wiki", domain: "cam", text: "ollama lora gnn llm embedding qdrant" });
    assert.equal(c.retag, false);
    assert.equal(c.reason, "below-threshold");
  });
});

describe("planRetag", () => {
  it("returns empty plan for empty/invalid index", () => {
    const r1 = planRetag(null);
    assert.deepEqual(r1.plan, []);
    assert.equal(r1.stats.total, 0);

    const r2 = planRetag({ entries: [] });
    assert.deepEqual(r2.plan, []);
    assert.equal(r2.stats.total, 0);

    const r3 = planRetag({ entries: null });
    assert.deepEqual(r3.plan, []);
  });

  it("plans every retag-eligible entry", () => {
    const idx = {
      entries: [
        { id: "a", source: "memory", domain: "general", text: "ollama and lora" }, // retag (mem+kw2)
        { id: "b", source: "memory", domain: "general", text: "only ollama" },     // skip (kw1)
        { id: "c", source: "external", domain: "general", text: "ollama lora gnn llm" }, // retag (ext+kw4)
        { id: "d", source: "wiki", domain: "cam", text: "ollama lora gnn llm" },   // skip (wiki)
        { id: "e", source: "memory", domain: "backend-dev", text: "ollama lora" }, // already
      ],
    };
    const { plan, stats } = planRetag(idx);
    assert.equal(plan.length, 2);
    assert.deepEqual(plan.map((p) => p.id), ["a", "c"]);
    assert.equal(stats.total, 5);
    assert.equal(stats.retagged, 2);
    assert.equal(stats.already, 1);
    assert.equal(stats.belowThreshold, 2);
  });

  it("records source domain in plan for audit trail", () => {
    const idx = {
      entries: [
        { id: "x", source: "memory", domain: "lathe", text: "ollama and lora" },
      ],
    };
    const { plan } = planRetag(idx);
    assert.equal(plan[0].from, "lathe");
    assert.equal(plan[0].id, "x");
  });
});

describe("applyPlan", () => {
  it("does not mutate the input index in place (immutability invariant)", () => {
    const idx = {
      entries: [
        { id: "a", source: "memory", domain: "general", text: "ollama and lora", embedding: [0.1, 0.2] },
      ],
    };
    const { plan } = planRetag(idx);
    const next = applyPlan(idx, plan);
    assert.equal(idx.entries[0].domain, "general", "original entry must be untouched");
    assert.equal(next.entries[0].domain, TARGET_DOMAIN, "new index has backend-dev tag");
  });

  it("preserves all other entry fields (embedding/text/id/source/hash)", () => {
    const original = {
      id: "x",
      source: "memory",
      domain: "general",
      title: "Ollama routing",
      text: "ollama and lora",
      path: "knowledge/x.md",
      hash: "abc123",
      embedding: [0.1, 0.2, 0.3],
    };
    const idx = { entries: [original] };
    const { plan } = planRetag(idx);
    const next = applyPlan(idx, plan);
    const m = next.entries[0];
    assert.equal(m.id, original.id);
    assert.equal(m.source, original.source);
    assert.equal(m.title, original.title);
    assert.equal(m.text, original.text);
    assert.equal(m.path, original.path);
    assert.equal(m.hash, original.hash);
    assert.deepEqual(m.embedding, original.embedding);
    assert.equal(m.domain, TARGET_DOMAIN);
  });

  it("touches only entries in the plan", () => {
    const idx = {
      entries: [
        { id: "a", source: "memory", domain: "general", text: "ollama and lora" },         // retag
        { id: "b", source: "wiki",   domain: "cam",     text: "the database" },            // untouched
        { id: "c", source: "memory", domain: "lathe",   text: "ollama lora gnn" },         // retag
      ],
    };
    const { plan } = planRetag(idx);
    const next = applyPlan(idx, plan);
    assert.equal(next.entries[0].domain, TARGET_DOMAIN);
    assert.equal(next.entries[1].domain, "cam"); // unchanged
    assert.equal(next.entries[2].domain, TARGET_DOMAIN);
  });

  it("is idempotent — applying an empty plan returns shallow-clone with same data", () => {
    const idx = { entries: [{ id: "a", source: "memory", domain: TARGET_DOMAIN, text: "x" }] };
    const next = applyPlan(idx, []);
    assert.equal(next.entries[0].domain, TARGET_DOMAIN);
    assert.notEqual(next, idx, "applyPlan must return a new object (shallow clone)");
  });
});

describe("integration — full plan→apply round-trip on a synthetic index", () => {
  it("retags exactly the eligible entries, leaves the rest alone, produces a valid index shape", () => {
    const idx = {
      schemaVersion: "1.0",
      model: "nomic-embed-text:latest",
      dim: 768,
      generatedAt: "2026-05-17T00:00:00Z",
      entries: [
        { id: "wiki-cam-1", source: "wiki",   domain: "cam",     text: "the database appears", embedding: [0, 0, 0] },
        { id: "mem-dev-1",  source: "memory", domain: "general", text: "ollama integration with lora and gnn", embedding: [1, 1, 1] },
        { id: "mem-mill-1", source: "memory", domain: "mill",    text: "kienzle force on aluminum", embedding: [2, 2, 2] },
        { id: "ext-dev-1",  source: "external", domain: "general", text: "ollama lora gnn llm embedding qdrant", embedding: [3, 3, 3] },
        { id: "ext-low",    source: "external", domain: "general", text: "ollama only here", embedding: [4, 4, 4] },
      ],
    };
    const { plan, stats } = planRetag(idx);
    assert.equal(stats.retagged, 2, "exactly 2 entries should plan to retag (mem-dev-1, ext-dev-1)");
    assert.deepEqual(plan.map((p) => p.id).sort(), ["ext-dev-1", "mem-dev-1"]);
    const next = applyPlan(idx, plan);
    assert.equal(next.entries[0].domain, "cam");        // wiki untouched
    assert.equal(next.entries[1].domain, TARGET_DOMAIN); // mem-dev-1 retagged
    assert.equal(next.entries[2].domain, "mill");        // mfg mill memory untouched (no kw match)
    assert.equal(next.entries[3].domain, TARGET_DOMAIN); // ext-dev-1 retagged
    assert.equal(next.entries[4].domain, "general");     // ext-low below threshold
    // Schema preservation
    assert.equal(next.schemaVersion, idx.schemaVersion);
    assert.equal(next.dim, idx.dim);
    assert.equal(next.entries.length, idx.entries.length);
  });
});
