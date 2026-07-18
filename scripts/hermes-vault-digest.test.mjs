// Tests for hermes-vault-digest.mjs -- the Hermes+Obsidian vault-digest combo. Pure helpers only
// (the gather->hermes->write integration is live-smoke validated, not mocked here).
import test from "node:test";
import assert from "node:assert/strict";
import {
  slugify, filterByQuery, selectNotes, buildDigestInput, digestOutputPath, digestFrontmatter, stripFooter,
} from "./hermes-vault-digest.mjs";

test("slugify: kebab, lowercase, bounded; empty -> 'recent'", () => {
  assert.equal(slugify("Hermes Obsidian Combo!"), "hermes-obsidian-combo");
  assert.equal(slugify(""), "recent");
  assert.equal(slugify(null), "recent");
  assert.equal(slugify("a".repeat(80)).length, 48, "slug is capped at 48 chars");
  assert.equal(slugify("--weird__chars--"), "weird-chars");
});

test("filterByQuery: filename substring match (case-insensitive); empty query -> all", () => {
  const notes = [
    { path: "knowledge/memories/reference/reference_hermes_x.md", mtimeMs: 1 },
    { path: "knowledge/memories/reference/reference_ollama_y.md", mtimeMs: 2 },
  ];
  assert.equal(filterByQuery(notes, "hermes").length, 1);
  assert.equal(filterByQuery(notes, "HERMES")[0].path.includes("hermes"), true, "case-insensitive");
  assert.equal(filterByQuery(notes, "").length, 2, "empty query keeps all");
  assert.equal(filterByQuery(notes, "nomatch").length, 0);
});

test("selectNotes: newest-first by mtimeMs, capped at N, min 1", () => {
  const notes = [{ path: "a", mtimeMs: 100 }, { path: "b", mtimeMs: 300 }, { path: "c", mtimeMs: 200 }];
  const top2 = selectNotes(notes, 2);
  assert.deepEqual(top2.map((n) => n.path), ["b", "c"], "sorted newest-first, top 2");
  assert.equal(selectNotes(notes, 0).length, 1, "N<1 floors to 1");
  assert.equal(selectNotes(notes, 99).length, 3, "N>len returns all");
  // does NOT mutate the input order
  assert.equal(notes[0].path, "a", "input array is not reordered in place");
});

test("buildDigestInput: focus line reflects query presence; caps each note body", () => {
  const notes = [{ path: "n1", body: "x".repeat(5000) }, { path: "n2", body: "short" }];
  const withQ = buildDigestInput(notes, "ollama offload");
  assert.match(withQ, /focused, de-duplicated digest about: ollama offload/);
  assert.match(withQ, /NOTE 1: n1/);
  assert.match(withQ, /NOTE 2: n2/);
  // perNoteCap default 1200 -> the 5000-char note body is truncated
  const noteBlock = withQ.split("--- NOTE 1: n1 ---\n")[1].split("\n\n")[0];
  assert.equal(noteBlock.length, 1200, "note body is capped at perNoteCap");
  const noQ = buildDigestInput(notes, "");
  assert.match(noQ, /recent PRISM knowledge-vault notes into a concise digest/);
  assert.doesNotMatch(noQ, /about:/, "no-query path uses the generic focus line");
});

test("digestOutputPath: vault-digest-<slug>-<ts>.md under the outputs lane", () => {
  const p = digestOutputPath("hermes", "2026-06-23T18-00-00-000Z", "OUT");
  assert.match(p.replace(/\\/g, "/"), /OUT\/vault-digest-hermes-2026-06-23T18-00-00-000Z\.md$/);
});

test("digestFrontmatter: source:hermes (NOT prism-memory -- sync-reserved), real fields", () => {
  const fm = digestFrontmatter({ query: "ollama", count: 8, ts: "2026-06-23T18:00:00Z" });
  assert.match(fm, /source: hermes/);
  assert.doesNotMatch(fm, /source: prism-memory/, "must NOT use the sync-reserved source (would be clobbered)");
  assert.match(fm, /type: hermes-output/);
  assert.match(fm, /notes: 8/);
  assert.match(fm, /query: ollama/);
  // empty query -> "(recent)"
  assert.match(digestFrontmatter({ query: "", count: 3, ts: "t" }), /query: \(recent\)/);
});

test("stripFooter: drops ask-hermes/ollama-offload telemetry footer lines, keeps body", () => {
  const raw = "Real digest line 1.\nReal digest line 2.\n↓ ollama-offload: ~900 tok processed -> ~80 saved";
  const out = stripFooter(raw);
  assert.match(out, /Real digest line 1/);
  assert.match(out, /Real digest line 2/);
  assert.doesNotMatch(out, /ollama-offload/, "telemetry footer is stripped from the saved digest");
});
