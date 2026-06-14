import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveGraphKeys, FILE_SEARCH_CMDS, DEFAULT_MAX_KEYS } from "./graph-key-derive.mjs";

// ── read/write: filename basename → stem → dash/underscore-split → tokenize ─

test("read: full Windows-style path → basename stem, dash-split, stopwords + short tokens filtered", () => {
  const ks = deriveGraphKeys({
    input: "H:/prism/scripts/system-viz-on-commit.mjs",
    tool: "read",
  });
  // "system viz on commit" → master-index STOPWORDS drops "system" (it's
  // the most-common PRISM noise word) AND "on" (generic stopword); "viz"
  // and "commit" carry the actual signal.
  assert.deepEqual(ks, ["viz", "commit"]);
});

test("write: Windows backslash path normalizes to forward slash", () => {
  const ks = deriveGraphKeys({
    input: "C:\\Users\\foo\\bar-baz.ts",
    tool: "write",
  });
  assert.deepEqual(ks, ["bar", "baz"]);
});

test("read: bare filename (no path) still derives keys from the stem", () => {
  const ks = deriveGraphKeys({
    input: "no-slashes-here.test.ts",
    tool: "read",
  });
  // stem = "no-slashes-here" (split on the FIRST dot); ".test.ts" dropped.
  // "no" is 2 chars (< MIN_TOKEN_LEN=3 in the master-index lib) → dropped.
  assert.deepEqual(ks, ["slashes", "here"]);
});

test("read: underscore-separated filename splits the same as dashes", () => {
  const ks = deriveGraphKeys({
    input: "foo_bar_baz.mjs",
    tool: "read",
  });
  assert.deepEqual(ks, ["foo", "bar", "baz"]);
});

test("read: dotfile / leading-dot name has no stem → []", () => {
  const ks = deriveGraphKeys({ input: ".hidden", tool: "read" });
  assert.deepEqual(ks, []);
});

test("read: empty input → []", () => {
  assert.deepEqual(deriveGraphKeys({ input: "", tool: "read" }), []);
});

// ── grep: tokenize the pattern; regex metachars are stripped automatically ─

test("grep: plain pattern tokenizes; the 'system' stopword is dropped", () => {
  const ks = deriveGraphKeys({
    input: "system-graph-write-lock",
    tool: "grep",
  });
  // STOPWORDS drops "system" — the remaining 3 carry the actual signal.
  assert.deepEqual(ks.sort(), ["graph", "lock", "write"]);
});

test("grep: regex metachars are stripped by tokenize (no escaping needed)", () => {
  const ks = deriveGraphKeys({
    input: "^cuttingForce.*\\.test\\.ts$",
    tool: "grep",
  });
  // tokenize lowercases + strips `[^\p{L}\p{N}_\s]` → "cuttingforce test ts".
  // "ts" is 2 chars (< MIN_TOKEN_LEN=3 in the master-index lib) → dropped.
  assert.ok(ks.includes("cuttingforce"), `expected 'cuttingforce' in ${JSON.stringify(ks)}`);
  assert.ok(ks.includes("test"));
});

test("grep: an all-metachar pattern → [] (no usable tokens)", () => {
  const ks = deriveGraphKeys({
    input: "^$.*+()[]{}|?\\",
    tool: "grep",
  });
  assert.deepEqual(ks, []);
});

test("grep: an all-stopword pattern → [] (the STOPWORDS filter)", () => {
  // STOPWORDS includes 'engine', 'system', 'the', etc.
  const ks = deriveGraphKeys({
    input: "the engine system",
    tool: "grep",
  });
  assert.deepEqual(ks, []);
});

// ── bash: ONLY file-search verbs derive keys; everything else is silent ────

test("bash: grep verb extracts the pattern args, ignores flags", () => {
  const ks = deriveGraphKeys({
    input: "grep -rn 'system-viz' src/ --include=*.ts",
    tool: "bash",
  });
  // 'system' is a STOPWORDS entry → dropped; 'viz' + 'src' carry signal.
  assert.ok(ks.includes("viz"));
  assert.ok(ks.includes("src"));
  assert.ok(!ks.includes("system"), "the STOPWORDS-filtered 'system' must not appear");
});

test("bash: rtk-wrapped grep is still recognised as a file-search verb", () => {
  const ks = deriveGraphKeys({
    input: "rtk grep -r foo-bar src/",
    tool: "bash",
  });
  assert.ok(ks.includes("foo"));
  assert.ok(ks.includes("bar"));
});

test("bash: env-prefixed file-search command resolves to the verb", () => {
  const ks = deriveGraphKeys({
    input: "FOO=bar BAZ=qux find src/ -name system-graph",
    tool: "bash",
  });
  // -name is a flag (dropped); src/ + system-graph are args.
  // 'system' is a STOPWORDS entry → dropped; 'graph' + 'src' remain.
  assert.ok(ks.includes("graph"));
  assert.ok(ks.includes("src"));
});

test("bash: git is NOT a file-search verb → [] (the entire point of the narrow filter)", () => {
  assert.deepEqual(
    deriveGraphKeys({ input: "git commit -m 'fix the bug'", tool: "bash" }),
    [],
  );
});

test("bash: npm / node / cargo all return [] (non-file-search bash)", () => {
  assert.deepEqual(deriveGraphKeys({ input: "npm run build", tool: "bash" }), []);
  assert.deepEqual(deriveGraphKeys({ input: "node scripts/foo.mjs", tool: "bash" }), []);
  assert.deepEqual(deriveGraphKeys({ input: "cargo test --release", tool: "bash" }), []);
});

test("bash: file-search verb with ONLY flags after it → []", () => {
  assert.deepEqual(
    deriveGraphKeys({ input: "ls -la --color=auto", tool: "bash" }),
    [],
  );
});

test("bash: empty input → []", () => {
  assert.deepEqual(deriveGraphKeys({ input: "", tool: "bash" }), []);
});

test("bash: rtk wrapping a non-file-search verb stays silent (rtk git status)", () => {
  assert.deepEqual(
    deriveGraphKeys({ input: "rtk git status", tool: "bash" }),
    [],
  );
});

test("bash: `find . -name '*.ts'` yields no spurious key from '.' or the glob", () => {
  // '.' is length-1 and '*.ts' → 'ts' is length-2 — both below MIN_TOKEN_LEN.
  // The relevant assertion is simply: no junk keys, no throw.
  const ks = deriveGraphKeys({ input: "find . -name '*.ts'", tool: "bash" });
  assert.ok(Array.isArray(ks));
  assert.ok(!ks.includes("."), "the bare-dot path arg must not become a key");
});

test("bash: multi-command `cat foo-graph && grep bar` derives from the FIRST verb", () => {
  // Whitespace-split parsing keys off the leading verb (`cat`). The `&&` and
  // trailing `grep` land in the arg list — `&&` is stripped by tokenize's
  // metachar filter; the result is advisory keys, never a throw.
  const ks = deriveGraphKeys({ input: "cat foo-graph && grep bar", tool: "bash" });
  assert.ok(Array.isArray(ks));
  assert.ok(ks.includes("foo"), `expected 'foo' from the cat arg; got ${JSON.stringify(ks)}`);
  assert.ok(ks.includes("graph"));
});

// ── adversarial / type-safety ──────────────────────────────────────────────

test("non-string input → []", () => {
  assert.deepEqual(deriveGraphKeys({ input: null, tool: "read" }), []);
  assert.deepEqual(deriveGraphKeys({ input: undefined, tool: "grep" }), []);
  assert.deepEqual(deriveGraphKeys({ input: 42, tool: "bash" }), []);
});

test("unknown tool → []", () => {
  assert.deepEqual(deriveGraphKeys({ input: "foo", tool: "edit" }), []);
  assert.deepEqual(deriveGraphKeys({ input: "foo", tool: "" }), []);
});

test("NaN / negative / zero maxKeys → []", () => {
  assert.deepEqual(deriveGraphKeys({ input: "foo bar", tool: "grep", maxKeys: NaN }), []);
  assert.deepEqual(deriveGraphKeys({ input: "foo bar", tool: "grep", maxKeys: 0 }), []);
  assert.deepEqual(deriveGraphKeys({ input: "foo bar", tool: "grep", maxKeys: -1 }), []);
});

test("maxKeys caps the output (no caller can flood master-index with 100 keys)", () => {
  const ks = deriveGraphKeys({
    input: "alpha beta gamma delta epsilon zeta eta theta iota kappa",
    tool: "grep",
    maxKeys: 3,
  });
  assert.ok(ks.length <= 3, `expected ≤3 keys, got ${ks.length}: ${JSON.stringify(ks)}`);
});

test("oversize input is bounded by tokenize's maxLen (no DoS on a giant pattern)", () => {
  const huge = "alpha ".repeat(2000);
  const ks = deriveGraphKeys({ input: huge, tool: "grep", maxKeys: 5 });
  // Should produce 1 unique key ("alpha", deduped), not throw, not OOM.
  assert.deepEqual(ks, ["alpha"]);
});

// ── public surface ─────────────────────────────────────────────────────────

test("FILE_SEARCH_CMDS exports the canonical verb set", () => {
  assert.ok(FILE_SEARCH_CMDS.has("grep"));
  assert.ok(FILE_SEARCH_CMDS.has("find"));
  assert.ok(FILE_SEARCH_CMDS.has("rg"));
  assert.ok(FILE_SEARCH_CMDS.has("cat"));
  assert.ok(FILE_SEARCH_CMDS.has("head"));
  assert.ok(FILE_SEARCH_CMDS.has("tail"));
  assert.ok(FILE_SEARCH_CMDS.has("ls"));
  assert.ok(!FILE_SEARCH_CMDS.has("git"));
  assert.ok(!FILE_SEARCH_CMDS.has("npm"));
});

test("DEFAULT_MAX_KEYS is exported and a positive integer", () => {
  assert.ok(Number.isInteger(DEFAULT_MAX_KEYS));
  assert.ok(DEFAULT_MAX_KEYS > 0);
});
