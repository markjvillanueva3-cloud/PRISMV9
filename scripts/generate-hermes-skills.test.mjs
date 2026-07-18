#!/usr/bin/env node
// Tests for generate-hermes-skills.mjs -- the /hermes-* task-skill family generator
// (HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L2). Pure render fns; no files are written.
// Run: node --test scripts/generate-hermes-skills.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SPEC, descriptionFor, frontmatter, renderSkill, renderAll } from "./generate-hermes-skills.mjs";

// --- SPEC shape ---
test("SPEC: one entry per /ollama-* task skill (12), unique names", () => {
  assert.equal(SPEC.length, 12);
  const names = SPEC.map((s) => s.name);
  assert.equal(new Set(names).size, 12, "skill names must be unique");
  // every /ollama-* sibling is covered
  const siblings = new Set(SPEC.map((s) => s.sibling));
  for (const t of ["explain", "summarize", "classify", "error-triage", "diff-summary",
    "docstring", "extract", "boilerplate", "test-stub", "architecture-plan", "route-check", "bridge"]) {
    assert.ok(siblings.has(t), `missing parity for /ollama-${t}`);
  }
});

// --- renderAll: structural invariants across the whole family ---
test("renderAll: emits 12 hermes-*.md files, each a non-empty markdown skill", () => {
  const all = renderAll("/fake/commands");
  assert.equal(all.length, 12);
  for (const r of all) {
    assert.match(r.name, /^hermes-[a-z-]+$/);
    assert.match(r.path, /[\\/]hermes-[a-z-]+\.md$/);
    assert.ok(r.content.length > 200, `${r.name} body too short`);
    assert.match(r.content, /^---\nname: hermes-/, "must start with frontmatter");
  }
});

test("renderAll: EVERY skill is pure ASCII (no em-dash / arrows that break PS5.1/grep)", () => {
  for (const r of renderAll()) {
    const bad = r.content.match(/[^\x00-\x7F]/);
    assert.equal(bad, null, `${r.name} contains a non-ASCII char: ${bad}`);
  }
});

test("renderAll: NO skill replicates the retired legacy curl/:11434/:7b pattern", () => {
  for (const r of renderAll()) {
    assert.doesNotMatch(r.content, /11434/, `${r.name} must not hit the raw Ollama port`);
    assert.doesNotMatch(r.content, /qwen2\.5-coder:7b/, `${r.name} must not use the retired :7b tag`);
    assert.doesNotMatch(r.content, /api\/generate/, `${r.name} must not use raw curl /api/generate`);
  }
});

// --- the cost-honesty rule (R12): Hermes is PAID, NEVER a $0 default ---
test("renderAll: every text/ask skill is HONEST that Hermes is PAID + points at the free ollama sibling", () => {
  for (const r of renderAll()) {
    if (r.name === "hermes-bridge" || r.name === "hermes-route-check") continue; // pointer/health, not a paid call
    assert.match(r.content, /PAID/, `${r.name} must declare it is PAID`);
    assert.match(r.content, /\$0/, `${r.name} must contrast with the free ($0) local lane`);
    const sib = r.name.replace(/^hermes-/, "ollama-");
    assert.ok(r.content.includes(`/${sib}`), `${r.name} must reference its free sibling /${sib}`);
  }
});

test("renderAll: every ask-hermes-backed skill calls the CANONICAL scripts/ask-hermes.mjs (not raw curl)", () => {
  for (const r of renderAll()) {
    if (r.name === "hermes-route-check" || r.name === "hermes-bridge") continue; // these point elsewhere by design
    assert.match(r.content, /scripts\/ask-hermes\.mjs/, `${r.name} must call ask-hermes.mjs`);
  }
});

// --- frontmatter ---
test("frontmatter: carries name + milestone/unit + autosuggest keywords", () => {
  const fm = frontmatter(SPEC.find((s) => s.name === "explain"));
  assert.match(fm, /name: hermes-explain/);
  assert.match(fm, /milestone: HERMES-PARITY/);
  assert.match(fm, /unit: U-HERMES-OLLAMA-PARITY-L2/);
  assert.match(fm, /keywords:/);
  assert.match(fm, /- hermes-explain/);
});

test("frontmatter: fails LOUD on a SPEC entry missing the required keywords array (contract)", () => {
  // documents the required-field contract: a future SPEC entry that drops `keywords` must
  // throw at generate time, never silently emit a keyword-less (un-triggerable) skill.
  assert.throws(() => frontmatter({ name: "x", title: "X", sibling: "x" }), /keywords|map|undefined/i);
});

// --- descriptionFor: distinct framing for the two custom skills ---
test("descriptionFor: route-check + bridge get their own (non-PAID-call) framing", () => {
  const rc = SPEC.find((s) => s.name === "route-check");
  const br = SPEC.find((s) => s.name === "bridge");
  assert.match(descriptionFor(rc), /health-check/i);
  assert.match(descriptionFor(br), /pointer/i);
  // a normal text skill names its ollama sibling + the escalation framing
  assert.match(descriptionFor(SPEC.find((s) => s.name === "summarize")), /[Ee]scalation tier above the free \/ollama-summarize/);
});

// --- mode-mapped skill: explain uses ask-hermes explain mode ---
test("renderSkill: a mode-mapped skill (explain) shows the right ask-hermes mode + the decision table", () => {
  const md = renderSkill(SPEC.find((s) => s.name === "explain"));
  assert.match(md, /ask-hermes\.mjs explain/);
  assert.match(md, /When to use this vs \/ollama-explain/);
  assert.match(md, /Claude deep reasoning \+ safety/); // the 3-row escalation table
});

// --- wrap skill: docstring wraps the literal args into an `ask` prompt ---
test("renderSkill: a wrap skill (docstring) uses ask mode with the task prompt", () => {
  const md = renderSkill(SPEC.find((s) => s.name === "docstring"));
  assert.match(md, /ask-hermes\.mjs ask "Write a concise JSDoc/);
});

// --- diff-summary: pipes a git diff into summarize ---
test("renderSkill: diff-summary pipes git diff into ask-hermes summarize", () => {
  const md = renderSkill(SPEC.find((s) => s.name === "diff-summary"));
  assert.match(md, /git diff \| node scripts\/ask-hermes\.mjs summarize -/);
});

// --- route-check: probes the proxy + reads the byHook ledger ---
test("renderSkill: route-check probes :8645 and reports the ask-hermes byHook ledger", () => {
  const md = renderSkill(SPEC.find((s) => s.name === "route-check"));
  assert.match(md, /8645\/v1\/models/);
  assert.match(md, /byHook\['ask-hermes'\]/);
  assert.match(md, /bySource\.hermes/); // explains the real-vs-fallback split
});

// --- bridge: a pointer to hermes-workflow, NOT a forked harness ---
test("renderSkill: bridge points at /hermes-workflow + /ask-hermes and does NOT fork the local harness", () => {
  const md = renderSkill(SPEC.find((s) => s.name === "bridge"));
  assert.match(md, /\/hermes-workflow/);
  assert.match(md, /\/ask-hermes/);
  // intent: it explicitly disclaims forking the local harness (mentioning the sibling's
  // implementation file descriptively is fine; claiming to BE it is not).
  assert.match(md, /does not fork|no duplicate/i);
});
