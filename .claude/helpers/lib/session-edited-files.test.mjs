/**
 * R9 coverage for session-edited-files.mjs -- the pure session-attribution helpers behind the
 * concurrent-fleet test-gate THRASH fix (U-STOPGATE-SESSION-ATTRIBUTION, slot:papa 2026-06-24).
 *
 * Every test encodes WHY the behavior matters for the safety gate:
 *   - toRepoRel MUST normalize a transcript's absolute Windows path (main tree OR slot worktree)
 *     to the same key git-status emits, or attribution silently never matches -> thrash returns.
 *   - extractSessionEditedFiles MUST find real Edit/Write/MultiEdit/NotebookEdit blocks and MUST
 *     NOT count a non-edit tool (Bash) -- a false positive there would re-block innocent peers.
 *   - filterToSessionOwned MUST return [] for an empty session set (this session edited nothing
 *     -> nothing is its fault -> no block) and MUST drop a peer-only candidate.
 * Run: node .claude/helpers/lib/session-edited-files.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toRepoRel, extractSessionEditedFiles, filterToSessionOwned, EDIT_TOOL_NAMES } from "./session-edited-files.mjs";

// helper: build a real assistant transcript line carrying one tool_use block
const editLine = (name, p, key = "file_path") =>
  JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name, input: { [key]: p } }] } });

// ---- toRepoRel ----
test("toRepoRel: absolute main-tree Windows path -> lowercased repo-rel", () => {
  assert.equal(
    toRepoRel("H:\\prism\\mcp-server\\src\\__tests__\\Foo.test.ts"),
    "mcp-server/src/__tests__/foo.test.ts",
  );
});
test("toRepoRel: a slot WORKTREE path normalizes to the SAME repo-rel as the main tree (cross-tree match)", () => {
  // The whole fix hinges on this: a session working in H:/prism-slot-papa must match a
  // git-status rel computed against H:/prism. If these diverge, attribution never matches.
  assert.equal(
    toRepoRel("H:/prism-slot-papa/mcp-server/a/Bar.test.ts"),
    toRepoRel("mcp-server/a/Bar.test.ts"),
  );
  assert.equal(toRepoRel("H:/prism-slot-zulu/mcp-server/x/Y.spec.ts"), "mcp-server/x/y.spec.ts");
});
test("toRepoRel: already-relative path is normalized (forward-slash, lowercased) idempotently", () => {
  assert.equal(toRepoRel("mcp-server/src/X.test.ts"), "mcp-server/src/x.test.ts");
  assert.equal(toRepoRel(toRepoRel("mcp-server/src/X.test.ts")), "mcp-server/src/x.test.ts");
});
test("toRepoRel: empty / null / non-string -> empty string", () => {
  assert.equal(toRepoRel(""), "");
  assert.equal(toRepoRel(null), "");
  assert.equal(toRepoRel(undefined), "");
  assert.equal(toRepoRel(42), ""); // "42" has no root + lowercases to "42"; ensure no throw
});
test("toRepoRel: strips a file:// scheme defensively", () => {
  assert.equal(toRepoRel("file://H:/prism/mcp-server/a/Z.test.ts"), "mcp-server/a/z.test.ts");
});
test("toRepoRel: strips a trailing slash (a future dir-ish consumer must still match)", () => {
  // adversarial-review P2: leave-a-copy-behind session-scoping may pass dir-ish paths.
  assert.equal(toRepoRel("mcp-server/a/Foo.test.ts/"), "mcp-server/a/foo.test.ts");
});

// ---- extractSessionEditedFiles ----
test("extracts every edit-tool file_path across multiple lines (Edit/Write/MultiEdit)", () => {
  const txt = [
    editLine("Write", "H:\\prism\\mcp-server\\a\\New.test.ts"),
    JSON.stringify({ type: "user", message: { role: "user", content: "go" } }),
    editLine("Edit", "H:/prism/mcp-server/b/Mod.test.ts"),
    editLine("MultiEdit", "H:\\prism\\src\\engines\\Foo.ts"),
  ].join("\n");
  const set = extractSessionEditedFiles(txt);
  assert.ok(set.has("mcp-server/a/new.test.ts"));
  assert.ok(set.has("mcp-server/b/mod.test.ts"));
  assert.ok(set.has("src/engines/foo.ts"));
  assert.equal(set.size, 3);
});
test("NotebookEdit notebook_path is captured", () => {
  const set = extractSessionEditedFiles(editLine("NotebookEdit", "H:\\prism\\nb\\A.ipynb", "notebook_path"));
  assert.ok(set.has("nb/a.ipynb"));
});
test("a NON-edit tool_use (Bash/Read) is NOT counted -- would re-block innocent peers if it were", () => {
  const txt = [
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Bash", input: { command: "git status", file_path: "mcp-server/x/Trap.test.ts" } }] } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Read", input: { file_path: "mcp-server/x/AlsoTrap.test.ts" } }] } }),
  ].join("\n");
  const set = extractSessionEditedFiles(txt);
  assert.equal(set.size, 0, "Bash/Read carry file_path-like fields but do NOT edit -> excluded");
});
test("malformed / partial JSON lines are skipped, not thrown", () => {
  const txt = [
    '{"type":"assist',                                    // truncated
    editLine("Edit", "H:/prism/mcp-server/ok/Good.test.ts"),
    "not json at all",
  ].join("\n");
  const set = extractSessionEditedFiles(txt);
  assert.deepEqual([...set], ["mcp-server/ok/good.test.ts"]);
});
test("duplicate edits to the same file collapse to one entry", () => {
  const txt = [
    editLine("Edit", "H:/prism/mcp-server/a/Dup.test.ts"),
    editLine("Edit", "H:/prism/mcp-server/a/Dup.test.ts"),
    editLine("Write", "H:\\prism\\mcp-server\\a\\Dup.test.ts"),
  ].join("\n");
  assert.equal(extractSessionEditedFiles(txt).size, 1);
});
test("string-content assistant turn (no array) contributes nothing", () => {
  const txt = JSON.stringify({ type: "assistant", message: { role: "assistant", content: "just text" } });
  assert.equal(extractSessionEditedFiles(txt).size, 0);
});
test("empty / null / non-string transcript -> empty set (no throw)", () => {
  assert.equal(extractSessionEditedFiles("").size, 0);
  assert.equal(extractSessionEditedFiles(null).size, 0);
  assert.equal(extractSessionEditedFiles(undefined).size, 0);
});
test("EDIT_TOOL_NAMES is the exact mutating-tool set", () => {
  assert.deepEqual([...EDIT_TOOL_NAMES].sort(), ["Edit", "MultiEdit", "NotebookEdit", "Write"]);
});

// ---- filterToSessionOwned ----
test("returns only candidates THIS session edited (peer candidate dropped) -- THE thrash fix", () => {
  const candidates = ["mcp-server/a/Mine.test.ts", "mcp-server/b/Peer.test.ts"];
  const edited = new Set(["mcp-server/a/mine.test.ts"]); // only Mine is in my transcript
  assert.deepEqual(filterToSessionOwned(candidates, edited), ["mcp-server/a/Mine.test.ts"]);
});
test("empty session set (this session edited nothing) -> [] (nothing is attributable to me)", () => {
  assert.deepEqual(filterToSessionOwned(["mcp-server/a/Peer.test.ts"], new Set()), []);
});
test("preserves candidate order for a multi-own intersection", () => {
  const candidates = ["mcp-server/z/Z.test.ts", "mcp-server/a/A.test.ts"];
  const edited = new Set(["mcp-server/a/a.test.ts", "mcp-server/z/z.test.ts"]);
  assert.deepEqual(filterToSessionOwned(candidates, edited), ["mcp-server/z/Z.test.ts", "mcp-server/a/A.test.ts"]);
});
test("non-array candidates / non-Set edited -> [] (no throw)", () => {
  assert.deepEqual(filterToSessionOwned(null, new Set(["x"])), []);
  assert.deepEqual(filterToSessionOwned(["a"], null), []);
  assert.deepEqual(filterToSessionOwned([], new Set(["a"])), []);
});
test("worktree-path edit in transcript matches a main-tree git-status candidate", () => {
  // Session edited the file in its OWN worktree; git-status (main tree) lists the main-tree rel.
  const candidates = ["mcp-server/src/__tests__/RFQ.test.ts"];
  const edited = extractSessionEditedFiles(editLine("Edit", "H:/prism-slot-papa/mcp-server/src/__tests__/RFQ.test.ts"));
  assert.deepEqual(filterToSessionOwned(candidates, edited), ["mcp-server/src/__tests__/RFQ.test.ts"]);
});
