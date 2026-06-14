// localhost-ollama-hardcode-guard.test.mjs
// R9 tests. The load-bearing guarantees: (1) it DETECTS a re-introduced quoted
// `http://localhost:11434` URL value (the regression vector), and (2) it does NOT false-positive
// on the fix-comments that explain the bug ("127.0.0.1 NOT localhost"), the already-fixed 127 form,
// or the legit Qdrant :6333 port -- a noisy guard gets disabled, defeating the purpose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractContent, decideWarn } from "./localhost-ollama-hardcode-guard.mjs";

test("decideWarn: a NEW quoted localhost:11434 URL value -> warn (the regression vector)", () => {
  const d = decideWarn({ toolName: "Write", filePath: "x.mjs", content: "const OLLAMA_URL = 'http://localhost:11434';" });
  assert.equal(d.warn, true);
  assert.match(d.reason, /127\.0\.0\.1/);
});

test("decideWarn: the `process.env.OLLAMA_URL || 'http://localhost:11434'` fallback form also warns", () => {
  const d = decideWarn({ toolName: "Edit", filePath: "x.ts", content: "const U = process.env.OLLAMA_URL || \"http://localhost:11434\";" });
  assert.equal(d.warn, true);
});

test("decideWarn: the FIXED 127.0.0.1 form -> no warn", () => {
  const d = decideWarn({ toolName: "Write", filePath: "x.mjs", content: "const OLLAMA_URL = 'http://127.0.0.1:11434';" });
  assert.equal(d.warn, false);
});

test("decideWarn: a fix-COMMENT mentioning localhost in prose -> no warn (no leading quote on the URL)", () => {
  // This is exactly the comment style the fixes use; it must NOT trip the guard.
  const d = decideWarn({ toolName: "Write", filePath: "x.mjs", content: "// 127.0.0.1 NOT localhost: localhost:11434 is unreachable on Windows (IPv6)." });
  assert.equal(d.warn, false);
});

test("decideWarn: the legit Qdrant localhost:6333 (different port) -> no warn", () => {
  const d = decideWarn({ toolName: "Write", filePath: "x.mjs", content: "const QDRANT_URL = 'http://localhost:6333';" });
  assert.equal(d.warn, false);
});

test("decideWarn: doc/test/memory files are EXEMPT (they discuss the bug legitimately)", () => {
  const broken = "const U = 'http://localhost:11434';";
  assert.equal(decideWarn({ toolName: "Write", filePath: "notes.md", content: broken }).warn, false);
  assert.equal(decideWarn({ toolName: "Write", filePath: "foo.test.mjs", content: broken }).warn, false);
  assert.equal(decideWarn({ toolName: "Write", filePath: "C:/x/memory/bug.md", content: broken }).warn, false);
});

test("decideWarn: PRISM_LOCALHOST_GUARD_DISABLE=1 -> never warns", () => {
  const prev = process.env.PRISM_LOCALHOST_GUARD_DISABLE;
  process.env.PRISM_LOCALHOST_GUARD_DISABLE = "1";
  try {
    const d = decideWarn({ toolName: "Write", filePath: "x.mjs", content: "const U = 'http://localhost:11434';" });
    assert.equal(d.warn, false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_LOCALHOST_GUARD_DISABLE;
    else process.env.PRISM_LOCALHOST_GUARD_DISABLE = prev;
  }
});

test("decideWarn: empty / non-string content -> no warn (fail-soft)", () => {
  assert.equal(decideWarn({ toolName: "Write", filePath: "x.mjs", content: "" }).warn, false);
  assert.equal(decideWarn({ toolName: "Write", filePath: "x.mjs", content: null }).warn, false);
  assert.equal(decideWarn({ toolName: "Write", filePath: "x.mjs", content: undefined }).warn, false);
});

test("extractContent: Write -> content; Edit -> new_string; MultiEdit -> joined edits", () => {
  assert.equal(extractContent("Write", { content: "abc" }), "abc");
  assert.equal(extractContent("Edit", { new_string: "def" }), "def");
  assert.equal(extractContent("MultiEdit", { edits: [{ new_string: "a" }, { new_string: "b" }] }), "a\nb");
  assert.equal(extractContent("Write", null), "");
  assert.equal(extractContent("Write", {}), "");
});

test("extractContent feeds decideWarn end-to-end: an Edit re-introducing the hardcode warns", () => {
  const content = extractContent("Edit", { new_string: "fetch('http://localhost:11434/api/tags')" });
  const d = decideWarn({ toolName: "Edit", filePath: "router.mjs", content });
  assert.equal(d.warn, true);
});

// CRITICAL precision (verified 2026-06-09): the localhost->IPv6 bug is NODE-FETCH-ONLY. Shell `curl`
// does IPv4 fallback so `curl http://localhost:11434` WORKS -- a curl-command string must NOT be
// flagged (else the guard false-positives on ~11 working curl hooks like ollama-auto-router /
// ollama-terminal-watcher). The anchored regex needs a quote IMMEDIATELY before the URL, so a curl
// command (space before http://) does not match. These lock that distinction.
test("decideWarn: a curl COMMAND string with localhost (works, not the bug) -> NO warn", () => {
  const curlTags = "const cmd = 'curl -s --max-time 1 http://localhost:11434/api/tags';";
  assert.equal(decideWarn({ toolName: "Write", filePath: "router.mjs", content: curlTags }).warn, false);
  const curlGen = "const cmd = `curl -X POST http://localhost:11434/api/generate -d data`;";
  assert.equal(decideWarn({ toolName: "Write", filePath: "watcher.mjs", content: curlGen }).warn, false);
});

test("decideWarn: a node fetch/request with quoted localhost URL value (the bug) -> warn", () => {
  assert.equal(decideWarn({ toolName: "Write", filePath: "a.mjs", content: "fetch(\"http://localhost:11434/api/chat\")" }).warn, true);
  assert.equal(decideWarn({ toolName: "Write", filePath: "b.mjs", content: "request(`http://localhost:11434/api/embeddings`)" }).warn, true);
});
