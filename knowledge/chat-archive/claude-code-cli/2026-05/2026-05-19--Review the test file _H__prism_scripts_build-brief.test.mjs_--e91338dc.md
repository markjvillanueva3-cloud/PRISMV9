---
type: "chat-session"
source: "claude-code-cli"
session_id: "e91338dc-6a34-4db2-9d78-8cb86d5548d3"
title: "Review the test file `H:/prism/scripts/build-brief.test.mjs` end-to-end (read th"
date: "2026-05-19"
first_ts: "2026-05-19T03:18:27.863Z"
last_ts: "2026-05-19T03:19:31.862Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 11
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a79cce1a515984fcd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review the test file `H:/prism/scripts/build-brief.test.mjs` end-to-end (read th

> **claude-code-cli** | 2026-05-19 | 31 msgs (11 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a79cce1a515984fcd.jsonl`

## Transcript

### User | 2026-05-19T03:18:27.863Z

Review the test file `H:/prism/scripts/build-brief.test.mjs` end-to-end (read the WHOLE file, and read `H:/prism/scripts/build-brief.mjs` to judge coverage).

This is a `node:test` suite for `build-brief.mjs` — a CLI + library that composes a deep pre-build knowledge "brief" (wiki bodies + tribal tips + regressions + commits + master-index hits) for a unit-id or topic.

Judge against PRISM's test discipline (CLAUDE.md R9): "Tests verify intent, not behavior. Every test encodes WHY the behavior matters. A test that passes against a hardcoded/stubbed implementation is worthless." Specifically check:
1. Are assertions REAL-VALUE (concrete expected values, algebraic invariants) — NOT `toBeDefined()`-style stubs?
2. Coverage — are all 17 exported functions of build-brief.mjs meaningfully exercised? List any exported function with NO test or only a trivial test.
3. The `excerptBody` budget property fuzz — is it a sound invariant test? Does it actually pin the P1 budget-overflow regression (output ≤ maxChars)?
4. The two E2E tests — do they genuinely exercise production wiring (real leaf-index, real graph fallback, real subprocess), or are they shallow?
5. Edge-case coverage: empty/null inputs, malformed leaf-index lines, path-containment rejection, the explicit-vs-derived `missing` semantics, fail-soft (throwing injected deps).
6. Any test that would still pass if the function under test were replaced by a stub returning a constant — flag it.
7. Hermeticity — do the unit tests avoid depending on live filesystem state (via injected readers)? Is the module-level leaf-index cache reset between tests?

You may run `node --test scripts/build-brief.test.mjs` from `H:/prism`. Report P0/P1/P2/P3 findings and end with `VERDICT: PASS` or `VERDICT: FAIL` (FAIL if any P0/P1).

### Assistant | 2026-05-19T03:18:35.329Z

I'll analyze the test file comprehensively. Let me start by reading both the test file and the source file.

### Assistant | 2026-05-19T03:18:35.399Z

[tool_use: Read]

### User | 2026-05-19T03:18:39.799Z

[tool_result] 1	/**
2	 * build-brief.test.mjs — node:test suite for build-brief.mjs
3	 *
4	 * Run: node --test scripts/build-brief.test.mjs
5	 *
6	 * Real-value assertions only. Unit tests are hermetic (every external read
7	 * injected); two E2E tests exercise the real repo so the "pure core +
8	 * injected readers" design is proven against production wiring, not just
9	 * fakes. A property fuzz pins the excer
... [+17144 chars truncated]

### Assistant | 2026-05-19T03:18:49.334Z

Now let me read the source file to understand what's being tested.

### Assistant | 2026-05-19T03:18:49.717Z

[tool_use: Read]

### User | 2026-05-19T03:18:52.508Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-brief.mjs' was already read 10m ago in this session and is unchanged (mtime 1779160081007). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T03:18:54.202Z

Good, the file is already in my context. Let me search for the exported functions to understand the scope.

### Assistant | 2026-05-19T03:18:54.718Z

[tool_use: Grep]

### User | 2026-05-19T03:18:56.818Z

[tool_result] No matches found

### Assistant | 2026-05-19T03:18:57.986Z

Let me use a broader pattern to find exports.

### Assistant | 2026-05-19T03:18:58.253Z

[tool_use: Grep]

### User | 2026-05-19T03:19:00.007Z

[tool_result] 73:export const MEMORY_TYPES = ["feedback", "reference", "project", "user"];
115:export function parseArgs(argv) {
158:export function stripFrontmatter(body) {
169:export function tokenScore(text, queryTokens) {
197:export function excerptBody(body, queryTokens = [], maxChars = DEFAULT_MAX_EXCERPT) {
267:export function normalizeSlug(name) {
282:export function loadWikiLeafIndex(indexPath = WIKI_L
... [+738 chars truncated]

### Assistant | 2026-05-19T03:19:01.363Z

Now let me run the actual test to see what passes and fails.

### Assistant | 2026-05-19T03:19:01.817Z

[tool_use: Grep]

### User | 2026-05-19T03:19:04.983Z

[tool_result] 45:test("parseArgs — target, slot, flags, and clamps", () => {
47:  assert.equal(o.target, "U-X");
48:  assert.equal(o.slot, "juliett");
49:  assert.equal(o.json, true);
50:  assert.equal(o.topK, 40, "--k clamps to the 40 ceiling");
51:  assert.equal(o.gitN, 0, "--git-n clamps to the 0 floor");
52:  assert.equal(o.tribalK, 8);
55:test("parseArgs — --no-write and --max-excerpt floor", () => {
57:  
... [+7301 chars truncated]

### Assistant | 2026-05-19T03:19:06.771Z

Now let me examine the source to see if there are any issues. Let me look at the key functions more carefully by searching for their bodies.

### Assistant | 2026-05-19T03:19:07.471Z

[tool_use: Grep]

### User | 2026-05-19T03:19:10.867Z

[tool_result] 756-    }
757-    L.push("");
758-  }
759-
760-  L.push(`## 🧭 Master-index hits (${brief.masterHits.length})`);
761-  if (brief.masterHits.length === 0) {
762-    L.push("_(no graph hits — query tokens too sparse or graph unavailable)_");
763-  } else {
764-    for (const h of brief.masterHits) {
765-      L.push(`- [${h.layer || "?"}/${h.status || h.kind || "?"}] **${h.label || h.id}**`);
766-   
... [+2543 chars truncated]

### Assistant | 2026-05-19T03:19:12.838Z

Let me check the source more carefully to find potential issues. Let me look at composeBrief and scanRegressions.

### Assistant | 2026-05-19T03:19:13.499Z

[tool_use: Grep]

### User | 2026-05-19T03:19:14.799Z

[tool_result] 430-      const slug = normalizeSlug(m);
431-      if (!slug || seen.has(slug)) continue;
432-      seen.add(slug);
433-      out.push(slug);
434-      if (out.length >= cap) return out;
435-    }
436-  }
437-  return out;
438-}
439-
440-/**
441- * Read + excerpt the bodies of resolved entries. Stops once `limit` bodies
442- * are collected so an unresolvable early item never crowds out a resolvab
... [+6672 chars truncated]

### Assistant | 2026-05-19T03:19:16.768Z

I see syntax issues in the source. Let me check those backslash lines.

### Assistant | 2026-05-19T03:19:17.390Z

[tool_use: Grep]

### User | 2026-05-19T03:19:19.711Z

[tool_result] No matches found

### Assistant | 2026-05-19T03:19:21.373Z

Let me look at those specific lines more carefully.

### Assistant | 2026-05-19T03:19:21.773Z

[tool_use: Read]

### User | 2026-05-19T03:19:25.803Z

[tool_result] 560	    };
561	  }
562	  const cleanTarget = target.trim();
563	
564	  // Mode resolution: a target that resolves in the consolidated roadmap is a
565	  // unit; everything else is a free-text topic.
566	  const unit = lookupUnit(cleanTarget, readImpl);
567	  const mode = unit ? "unit" : "topic";
568	
569	  const query = mode === "unit"
570	    ? buildQueryTokens(cleanTarget, unit)
571	    : clean
... [+1898 chars truncated]

### Assistant | 2026-05-19T03:19:27.718Z

Good, those are regular comments (the Grep escape was confusing me). Now let me run the actual test to see if it passes.

### Assistant | 2026-05-19T03:19:28.465Z

[tool_use: Grep]

### User | 2026-05-19T03:19:31.862Z

[tool_result] No matches found
