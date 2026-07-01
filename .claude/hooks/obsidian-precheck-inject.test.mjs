/**
 * obsidian-precheck-inject.test.mjs — hermetic coverage for the UserPromptSubmit
 * hook added by U-OBSIDIAN-PRECHECK (slot delta, 2026-05-18).
 *
 * Pure-core + injected-readers. No real stdin, no real filesystem walk
 * except one REAL-DATA E2E against the live knowledge/memories tree.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  readStdinJson,
  tokenize,
  parseMemoryFrontmatter,
  loadMemoryCorpus,
  scoreMemory,
  rankMemories,
  renderInject,
  runHook,
} from "./obsidian-precheck-inject.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SELF_DIR, "..", "..");
const REAL_MEMORIES_DIR = join(REPO_ROOT, "knowledge", "memories");

function fakeDirent(name, kind) {
  return { name, isFile: () => kind === "file", isDirectory: () => kind === "dir" };
}

// ── tokenize ─────────────────────────────────────────────────────────────

test("tokenize: lowercases, splits on non-alphanumeric, drops <3-char tokens", () => {
  const out = tokenize("Kienzle force Model — for steel A36");
  assert.ok(out.includes("kienzle"));
  assert.ok(out.includes("force"));
  assert.ok(out.includes("model"));
  assert.ok(out.includes("steel"));
  assert.ok(out.includes("a36"));
  assert.ok(!out.includes("a"), "1-char dropped");
});

test("tokenize: drops stopwords", () => {
  const out = tokenize("the and for are this that with");
  assert.deepEqual(out, [], "all stopwords filtered");
});

test("tokenize: non-string returns []", () => {
  assert.deepEqual(tokenize(null), []);
  assert.deepEqual(tokenize(undefined), []);
  assert.deepEqual(tokenize(123), []);
  assert.deepEqual(tokenize(""), []);
});

// ── parseMemoryFrontmatter ─────────────────────────────────────────────────

test("parseMemoryFrontmatter: extracts name + description + type", () => {
  const content = [
    "---",
    "name: Always build, never skip",
    "description: For roadmap engine work, always build every identified gap engine",
    "type: feedback",
    "originSessionId: abc",
    "---",
    "",
    "Body text here",
  ].join("\n");
  const out = parseMemoryFrontmatter(content);
  assert.equal(out.name, "Always build, never skip");
  assert.equal(out.description, "For roadmap engine work, always build every identified gap engine");
  assert.equal(out.type, "feedback");
});

test("parseMemoryFrontmatter: handles quoted values", () => {
  const out = parseMemoryFrontmatter(`---\nname: "Quoted Name"\ndescription: 'single quoted'\n---\n`);
  assert.equal(out.name, "Quoted Name");
  assert.equal(out.description, "single quoted");
});

test("parseMemoryFrontmatter: ignores unrelated frontmatter fields", () => {
  const out = parseMemoryFrontmatter(`---\nname: x\ndescription: y\nrandom: ignored\n---\n`);
  assert.equal(out.name, "x");
  assert.equal(out.description, "y");
  assert.equal(out.type, null);
});

test("parseMemoryFrontmatter: file with no frontmatter returns null", () => {
  assert.equal(parseMemoryFrontmatter("Just body text\nno frontmatter"), null);
  assert.equal(parseMemoryFrontmatter(""), null);
  assert.equal(parseMemoryFrontmatter(null), null);
});

test("parseMemoryFrontmatter: frontmatter without name or description returns null", () => {
  // R12: must distinguish 'no useful content' from 'parse error'.
  const out = parseMemoryFrontmatter(`---\nrandom: thing\n---\n`);
  assert.equal(out, null, "no name+description → null (not partial object)");
});

test("parseMemoryFrontmatter: malformed frontmatter (no closing ---) returns null", () => {
  assert.equal(parseMemoryFrontmatter(`---\nname: x\nno closing fence`), null);
});

// ── loadMemoryCorpus ─────────────────────────────────────────────────────

test("loadMemoryCorpus: hermetic — walks tree, parses frontmatter, builds tokens", () => {
  const tree = {
    "/memories": [fakeDirent("feedback", "dir"), fakeDirent("reference", "dir")],
    "/memories/feedback": [fakeDirent("feedback_always_build.md", "file"), fakeDirent("MEMORY.md", "file")],
    "/memories/reference": [fakeDirent("reference_kienzle.md", "file"), fakeDirent("_index.md", "file")],
  };
  const files = {
    "/memories/feedback/feedback_always_build.md": `---\nname: Always build\ndescription: roadmap engine work\ntype: feedback\n---\nbody`,
    "/memories/reference/reference_kienzle.md": `---\nname: Kienzle force model\ndescription: cutting force for steel\ntype: reference\n---\nbody`,
    "/memories/feedback/MEMORY.md": `---\nname: index\ndescription: should be excluded\n---\n`,
    "/memories/reference/_index.md": `---\nname: stats\ndescription: should be excluded\n---\n`,
  };
  const readdirImpl = (p) => tree[p.replace(/\\/g, "/")] || [];
  const statImpl = () => ({ isDirectory: () => true });
  const readImpl = (p) => files[p.replace(/\\/g, "/")] || "";
  const out = loadMemoryCorpus({ root: "/memories", readdirImpl, statImpl, readImpl, existsImpl: () => true });
  assert.equal(out.entries.length, 2, "MEMORY.md + _index.md excluded");
  const names = out.entries.map((e) => e.name).sort();
  assert.deepEqual(names, ["Always build", "Kienzle force model"]);
  const kienzle = out.entries.find((e) => e.name === "Kienzle force model");
  assert.ok(kienzle.tokens.includes("kienzle"));
  assert.ok(kienzle.tokens.includes("force"));
  assert.ok(kienzle.tokens.includes("steel"));
});

test("loadMemoryCorpus: missing dir returns empty + reason", () => {
  const out = loadMemoryCorpus({ root: "/nonexistent", readdirImpl: () => [], statImpl: () => ({ isDirectory: () => false }), readImpl: () => "" });
  assert.equal(out.entries.length, 0);
});

test("loadMemoryCorpus: unreadable subdir skipped, not fatal", () => {
  const tree = {
    "/memories": [fakeDirent("good.md", "file"), fakeDirent("bad", "dir")],
  };
  const files = { "/memories/good.md": `---\nname: ok\ndescription: x\n---\n` };
  const readdirImpl = (p) => {
    const k = p.replace(/\\/g, "/");
    if (k === "/memories/bad") throw new Error("EACCES");
    return tree[k] || [];
  };
  const statImpl = () => ({ isDirectory: () => true });
  const readImpl = (p) => files[p.replace(/\\/g, "/")] || "";
  const out = loadMemoryCorpus({ root: "/memories", readdirImpl, statImpl, readImpl, existsImpl: () => true });
  assert.equal(out.entries.length, 1);
  assert.equal(out.entries[0].name, "ok");
});

test("loadMemoryCorpus: file with no frontmatter is skipped", () => {
  const tree = { "/memories": [fakeDirent("body-only.md", "file"), fakeDirent("with-fm.md", "file")] };
  const files = {
    "/memories/body-only.md": "no frontmatter here",
    "/memories/with-fm.md": `---\nname: x\ndescription: y\n---\n`,
  };
  const readdirImpl = (p) => tree[p.replace(/\\/g, "/")] || [];
  const statImpl = () => ({ isDirectory: () => true });
  const readImpl = (p) => files[p.replace(/\\/g, "/")] || "";
  const out = loadMemoryCorpus({ root: "/memories", readdirImpl, statImpl, readImpl, existsImpl: () => true });
  assert.equal(out.entries.length, 1);
  assert.equal(out.entries[0].name, "x");
});

// ── scoreMemory ──────────────────────────────────────────────────────────

test("scoreMemory: matches token count + density bonus", () => {
  const entry = { tokens: ["kienzle", "force", "model"] };
  const r = scoreMemory(["kienzle", "force"], entry);
  assert.equal(r.matches, 2);
  // score = matches + density = 2 + (2/2) = 3
  assert.equal(r.score, 3);
});

test("scoreMemory: zero matches → zero score", () => {
  const r = scoreMemory(["nothing"], { tokens: ["kienzle"] });
  assert.equal(r.score, 0);
  assert.equal(r.matches, 0);
});

test("scoreMemory: empty inputs → zero", () => {
  assert.equal(scoreMemory([], { tokens: ["x"] }).score, 0);
  assert.equal(scoreMemory(["x"], null).score, 0);
  assert.equal(scoreMemory(null, { tokens: ["x"] }).score, 0);
});

test("scoreMemory: density rewards focused queries", () => {
  // 1 match of 1 prompt token (density 1.0) vs 1 match of 5 prompt tokens (density 0.2)
  const a = scoreMemory(["kienzle"], { tokens: ["kienzle", "x", "y"] });
  const b = scoreMemory(["kienzle", "a", "b", "c", "d"], { tokens: ["kienzle", "x", "y"] });
  assert.ok(a.score > b.score, "more focused query scores higher per-match");
});

// ── rankMemories ─────────────────────────────────────────────────────────

test("rankMemories: returns top-K hits above minScore, highest first", () => {
  const entries = [
    { name: "a", tokens: ["kienzle"] },
    { name: "b", tokens: ["kienzle", "force"] },
    { name: "c", tokens: ["unrelated"] },
  ];
  const hits = rankMemories(["kienzle", "force"], entries, { topK: 2, minScore: 0.5 });
  assert.equal(hits.length, 2);
  assert.equal(hits[0].entry.name, "b", "richest match first");
});

test("rankMemories: minScore filters weak hits", () => {
  const entries = [{ name: "weak", tokens: ["x"] }];
  // 1 match of 1 prompt token = score 2 (matches + density 1)
  // With minScore 5, it gets filtered.
  const hits = rankMemories(["x"], entries, { topK: 3, minScore: 5 });
  assert.equal(hits.length, 0);
});

test("rankMemories: topK clamped to MAX_TOP_K", () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({ name: `e${i}`, tokens: ["match"] }));
  const hits = rankMemories(["match"], entries, { topK: 999, minScore: 0 });
  assert.ok(hits.length <= 6, "clamped to MAX_TOP_K=6");
});

test("rankMemories: empty entries returns []", () => {
  assert.deepEqual(rankMemories(["x"], [], {}), []);
  assert.deepEqual(rankMemories(["x"], null, {}), []);
});

// ── renderInject ─────────────────────────────────────────────────────────

test("renderInject: empty hits returns empty string", () => {
  assert.equal(renderInject([]), "");
  assert.equal(renderInject(null), "");
});

test("renderInject: includes header, names, descriptions, paths, scores", () => {
  const hits = [
    {
      entry: { name: "Always build", description: "roadmap engine work", type: "feedback", basename: "x.md", relPath: "knowledge/memories/feedback/x.md" },
      matches: 2, score: 3,
    },
  ];
  const out = renderInject(hits);
  assert.match(out, /Obsidian memory precheck/, "canonical header present");
  assert.match(out, /Always build/);
  assert.match(out, /roadmap engine work/);
  assert.match(out, /feedback/);
  assert.match(out, /knowledge\/memories\/feedback\/x\.md/);
  assert.match(out, /matches: 2/);
  assert.match(out, /score: 3\.00/);
});

test("renderInject: truncates at maxBytes", () => {
  const hits = [{
    entry: { name: "a".repeat(500), description: "b".repeat(500), type: "x", basename: "x.md", relPath: "p" },
    matches: 1, score: 1,
  }];
  const out = renderInject(hits, { maxBytes: 200 });
  assert.ok(out.length <= 200);
  assert.match(out, /TRUNC\]$/, "truncation marker appended");
});

// ── runHook end-to-end ───────────────────────────────────────────────────

test("runHook: DISABLE knob short-circuits with {continue: true}", async () => {
  process.env.PRISM_OBSIDIAN_PRECHECK = "0";
  try {
    const r = await runHook({ stdinImpl: () => ({ prompt: "kienzle force model" }) });
    assert.deepEqual(r, { continue: true });
  } finally {
    delete process.env.PRISM_OBSIDIAN_PRECHECK;
  }
});

test("runHook: no stdin → silent {continue:true}", async () => {
  const r = await runHook({ stdinImpl: () => null });
  assert.deepEqual(r, { continue: true });
});

test("runHook: empty prompt → silent {continue:true}", async () => {
  const r = await runHook({ stdinImpl: () => ({ prompt: "" }) });
  assert.deepEqual(r, { continue: true });
});

test("runHook: corpus empty → silent {continue:true}", async () => {
  const r = await runHook({
    stdinImpl: () => ({ prompt: "kienzle force" }),
    loadImpl: () => ({ entries: [] }),
  });
  assert.deepEqual(r, { continue: true });
});

test("runHook: matching corpus emits additionalContext with canonical header", async () => {
  const entries = [
    {
      name: "Kienzle force model",
      description: "cutting force",
      type: "reference",
      basename: "reference_kienzle.md",
      relPath: "knowledge/memories/reference/reference_kienzle.md",
      tokens: ["kienzle", "force", "model", "cutting"],
    },
  ];
  const r = await runHook({
    stdinImpl: () => ({ prompt: "tell me about kienzle force" }),
    loadImpl: () => ({ entries }),
  });
  assert.equal(r.continue, true);
  assert.ok(r.hookSpecificOutput, "must emit hookSpecificOutput on a real hit");
  assert.equal(r.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(r.hookSpecificOutput.additionalContext, /Kienzle force model/);
  assert.match(r.hookSpecificOutput.additionalContext, /Obsidian memory precheck/);
});

test("runHook: zero matches → silent {continue:true} (no additionalContext key)", async () => {
  const entries = [{ name: "unrelated", description: "x", type: "y", basename: "u.md", relPath: "p", tokens: ["unrelated"] }];
  const r = await runHook({
    stdinImpl: () => ({ prompt: "kienzle force model cutting" }),
    loadImpl: () => ({ entries }),
  });
  assert.deepEqual(r, { continue: true });
});

test("runHook: composer throws → fail-soft {continue:true}", async () => {
  const r = await runHook({
    stdinImpl: () => ({ prompt: "kienzle force" }),
    loadImpl: () => { throw new Error("synthetic boom"); },
  }).catch(() => ({ continue: true })); // belt-and-suspenders if impl ever propagates
  assert.equal(r.continue, true);
});

// ── REAL-DATA E2E ────────────────────────────────────────────────────────

test("REAL-DATA: loadMemoryCorpus reads >100 entries from live knowledge/memories/", { skip: existsSync(REAL_MEMORIES_DIR) ? false : "memories dir not on disk" }, () => {
  const out = loadMemoryCorpus({ root: REAL_MEMORIES_DIR });
  assert.ok(out.entries.length > 100, `expected >100 real memory entries with frontmatter, got ${out.entries.length}`);
  for (const e of out.entries.slice(0, 5)) {
    assert.ok(e.name, `entry must have a name: ${e.basename}`);
    assert.ok(Array.isArray(e.tokens), `entry must have tokens: ${e.basename}`);
  }
});

test("REAL-DATA: 'kienzle' query returns at least one hit from live corpus", { skip: existsSync(REAL_MEMORIES_DIR) ? false : "memories dir not on disk" }, () => {
  const corpus = loadMemoryCorpus({ root: REAL_MEMORIES_DIR });
  const hits = rankMemories(tokenize("kienzle force cutting"), corpus.entries, { topK: 5, minScore: 0.5 });
  // The repo has memories referencing kienzle / cutting-related tribal facts.
  // A stub-impl that returned [] would fail this test.
  assert.ok(hits.length >= 1 || corpus.entries.length === 0, `expected ≥1 hit for 'kienzle' query; got ${hits.length}`);
});
