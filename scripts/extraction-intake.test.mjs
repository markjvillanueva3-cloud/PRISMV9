// Tests for extraction-intake.mjs pure logic (EXTRACTION-INTAKE-MS0, slot:bravo 2026-06-12).
// Verifies INTENT (R9): the wiki-id must match tribal-embed-index readMdEntry's format
// EXACTLY (else dedup silently fails and every entry re-embeds); already-indexed entries
// are skipped; argv flags parse; candidate listing filters by prefix + fail-softs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { wikiIdFor, selectUnindexed, parseArgs, listCandidates } from "./extraction-intake.mjs";

const ROOT = "H:/prism";

test("wikiIdFor: matches readMdEntry's `wiki:<repo-rel>` id format exactly", () => {
  // This MUST equal what tribal-embed-index.mjs readMdEntry() produces, or dedup breaks.
  assert.equal(
    wikiIdFor("H:/prism/knowledge/wiki/code-tribal/youtube-abc.md", ROOT),
    "wiki:knowledge/wiki/code-tribal/youtube-abc.md"
  );
  // backslash path normalizes to forward slashes
  assert.equal(
    wikiIdFor("H:\\prism\\knowledge\\wiki\\code-tribal\\youtube-xyz.md", ROOT),
    "wiki:knowledge/wiki/code-tribal/youtube-xyz.md"
  );
  // trailing slash on root is tolerated
  assert.equal(
    wikiIdFor("H:/prism/knowledge/wiki/x.md", "H:/prism/"),
    "wiki:knowledge/wiki/x.md"
  );
  // a path outside root keeps its full form (readMdEntry's else-branch)
  assert.equal(wikiIdFor("D:/other/x.md", ROOT), "wiki:D:/other/x.md");
});

test("selectUnindexed: returns only candidates whose id is not already indexed", () => {
  const cands = [
    "H:/prism/knowledge/wiki/code-tribal/youtube-a.md",
    "H:/prism/knowledge/wiki/code-tribal/youtube-b.md",
    "H:/prism/knowledge/wiki/code-tribal/youtube-c.md",
  ];
  const indexed = new Set(["wiki:knowledge/wiki/code-tribal/youtube-b.md"]);
  const got = selectUnindexed(cands, indexed, ROOT).map((p) => p.split("/").pop());
  assert.deepEqual(got, ["youtube-a.md", "youtube-c.md"]);
  // empty index -> return ALL (the --add hash-skip then dedups for free)
  assert.equal(selectUnindexed(cands, new Set(), ROOT).length, 3);
  // accepts a plain array of ids, not just a Set
  assert.equal(
    selectUnindexed(cands, ["wiki:knowledge/wiki/code-tribal/youtube-a.md"], ROOT).length,
    2
  );
  // null/empty candidate list is safe
  assert.deepEqual(selectUnindexed(null, indexed, ROOT), []);
});

test("parseArgs: flags override defaults; bad values keep the default", () => {
  assert.equal(parseArgs(["--max", "100"]).max, 100);
  assert.equal(parseArgs(["--max", "notanum"]).max, 50, "non-numeric --max falls back to default 50");
  assert.equal(parseArgs(["--dry-run"]).dryRun, true);
  assert.equal(parseArgs([]).dryRun, false);
  assert.equal(parseArgs(["--all"]).prefix, "", "--all clears the prefix to scan every md");
  assert.equal(parseArgs(["--prefix", "blueprint-"]).prefix, "blueprint-");
  assert.equal(parseArgs([]).prefix, "youtube-", "default prefix targets extraction wiki entries");
});

test("listCandidates: filters by .md + prefix, sorts, and fail-softs on a missing dir", () => {
  const fakeReaddir = () => ["youtube-z.md", "youtube-a.md", "readme.txt", "other.md", "youtube-m.md"];
  const got = listCandidates("/any", "youtube-", fakeReaddir).map((p) => p.split("/").pop());
  assert.deepEqual(got, ["youtube-a.md", "youtube-m.md", "youtube-z.md"], "only youtube-*.md, sorted");
  // empty prefix -> all .md (not the .txt)
  const all = listCandidates("/any", "", fakeReaddir).map((p) => p.split("/").pop());
  assert.deepEqual(all, ["other.md", "youtube-a.md", "youtube-m.md", "youtube-z.md"]);
  // a throwing readdir (missing dir) -> [] (fail-soft, never throws)
  assert.deepEqual(listCandidates("/missing", "youtube-", () => { throw new Error("ENOENT"); }), []);
});
