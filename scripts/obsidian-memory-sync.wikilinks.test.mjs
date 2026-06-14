// scripts/obsidian-memory-sync.wikilinks.test.mjs
//
// OBSIDIAN-VAULT-SYNERGY/U-OBS-WIKILINK-DANGLING-FIX — hermetic tests for
// extractWikilinks(). The bug this guards: the function emitted
// [[engines/X]]/[[dispatchers/prism_X]]/[[skills/X]] UNCONDITIONALLY into
// non-existent vault namespaces (~15,819 dangling links, re-written every sync),
// with a greedy /([a-z-]+)/g skill regex that matched every slash-word in paths,
// code, and slash-commands. Now existence-gated + skill regex dropped. Tests
// inject noteExists so no live vault is touched (R9 — real behavior, not stubs).
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { extractWikilinks } from "./obsidian-memory-sync.mjs";

const allReal = () => true;
const noneReal = () => false;

test("emits engine/dispatcher links ONLY when the target note exists", () => {
  const body = "FooEngine calls prism_calc then BarEngine.";
  const links = extractWikilinks(body, "/vault", allReal);
  assert.ok(links.includes("[[engines/FooEngine|FooEngine]]"));
  assert.ok(links.includes("[[engines/BarEngine|BarEngine]]"));
  assert.ok(links.includes("[[dispatchers/prism_calc|prism_calc]]"));
});

test("drops engine/dispatcher links whose target note is MISSING (the dangling-link fix)", () => {
  const body = "FooEngine calls prism_calc.";
  const links = extractWikilinks(body, "/vault", noneReal);
  assert.deepEqual(links, [], "no link emitted when the target does not exist");
});

test("the greedy skill regex is GONE — slash-words in paths/code/commands emit ZERO skills links", () => {
  // Every one of these used to become a dangling [[skills/X]] under /([a-z-]+)/g.
  const body = "see state/shared and /goal and data/null and the /loop command; path a/b-c.";
  const links = extractWikilinks(body, "/vault", allReal); // even with allReal, no skills/ links exist
  assert.equal(links.filter((l) => l.startsWith("[[skills/")).length, 0, "no skills/* links at all");
});

test("existence-gate selectively keeps real, drops dangling (mixed)", () => {
  const body = "RealEngine and FakeEngine and prism_real and prism_fake.";
  const exists = new Set(["engines/RealEngine", "dispatchers/prism_real"]);
  const links = extractWikilinks(body, "/vault", (rel) => exists.has(rel));
  assert.deepEqual(links.sort(), [
    "[[dispatchers/prism_real|prism_real]]",
    "[[engines/RealEngine|RealEngine]]",
  ]);
});

test("dedupes repeated mentions", () => {
  const body = "FooEngine FooEngine FooEngine prism_x prism_x.";
  const links = extractWikilinks(body, "/vault", allReal);
  assert.equal(links.filter((l) => l === "[[engines/FooEngine|FooEngine]]").length, 1);
  assert.equal(links.filter((l) => l === "[[dispatchers/prism_x|prism_x]]").length, 1);
});

test("empty / link-less body → empty array (no crash)", () => {
  assert.deepEqual(extractWikilinks("just plain prose with no targets", "/vault", allReal), []);
  assert.deepEqual(extractWikilinks("", "/vault", noneReal), []);
});

test("DEFAULT noteExists closure resolves real notes via fs.existsSync+path.join (production path)", () => {
  // The other tests inject noteExists; this one exercises the real default closure
  // against a tmp vault so a fat-fingered .md suffix / path.join can't ship green.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wikilink-"));
  try {
    fs.mkdirSync(path.join(tmp, "engines"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "engines", "RealEngine.md"), "x");
    // Only vaultRoot overridden — the default fs-backed noteExists runs.
    const links = extractWikilinks("RealEngine and FakeEngine here", tmp);
    assert.ok(links.includes("[[engines/RealEngine|RealEngine]]"), "real note resolves via default fs closure");
    assert.ok(!links.some((l) => l.includes("FakeEngine")), "absent note dropped by default fs closure");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
