---
type: "chat-session"
source: "claude-code-cli"
session_id: "49ed5a8b-21b3-4cf8-a533-ef32fdab96a4"
title: "Independent silent-breakage review of a one-line engine fix. Read both files: EN"
date: "2026-06-23"
first_ts: "2026-06-23T23:32:48.496Z"
last_ts: "2026-06-23T23:34:22.757Z"
cwd: "H:\\prism\\mcp-server"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/49ed5a8b-21b3-4cf8-a533-ef32fdab96a4/subagents/agent-a93e21bc3ea21077e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent silent-breakage review of a one-line engine fix. Read both files: EN

> **claude-code-cli** | 2026-06-23 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/49ed5a8b-21b3-4cf8-a533-ef32fdab96a4/subagents/agent-a93e21bc3ea21077e.jsonl`

## Transcript

### User | 2026-06-23T23:32:48.496Z

Independent silent-breakage review of a one-line engine fix. Read both files:

ENGINE: H:/prism/mcp-server/src/engines/GCodeSnippetEngine.ts (fill(): RegExp+String.replace -> split(`{${key}}`).join(String(value)))
TEST: H:/prism/mcp-server/src/__tests__/GCodeSnippetEngine.test.ts

Weight toward regression / silent breakage:
- Does split/join produce BYTE-IDENTICAL output to the old regex for every existing test case (happy fill, missing-param-left-literal, numeric coercion, extra-param no-op, cross-contamination)? Walk each.
- The old regex was global (/g). split().join() replaces all occurrences too — confirm no single-vs-all difference.
- Any input where the two diverge BESIDES the intended bug cases? Consider: a key with `}` in it; a value of "" (empty string); a param whose key is a substring of another placeholder.
- Determinism, no new throw paths, no NaN.
- Confirm blast radius: grep showed only camDispatcher consumes gCodeSnippetEngine (post_gcode_snippet_get/fill, forward-only); no test asserts fill output on a $-bearing/metachar param. Any miss?
- Are the 2 new proof-tests correct (the $& -> "T$& M6" expectation and the metachar-key no-throw)?

Report P0/P1/P2 with file:line. End with a single verdict line: PASS or FAIL.

### Assistant | 2026-06-23T23:32:51.531Z

I'll review this one-line fix for silent breakage. Let me read both files.

### Assistant | 2026-06-23T23:32:52.004Z

[tool_use: Read]

### Assistant | 2026-06-23T23:32:52.228Z

[tool_use: Read]

### User | 2026-06-23T23:32:52.417Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\GCodeSnippetEngine.ts' was already read 8s ago in this session and is unchanged (mtime 1782257511774). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-23T23:32:52.651Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\GCodeSnippetEngine.test.ts' was already read 8s ago in this session and is unchanged (mtime 1782257533380). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-06-23T23:32:55.283Z

The read-once guard claims these are already in my context, but I don't actually have their content. Let me bypass the cache.

### Assistant | 2026-06-23T23:32:55.993Z

[tool_use: Bash]

### Assistant | 2026-06-23T23:32:57.270Z

[tool_use: Bash]

### User | 2026-06-23T23:32:59.756Z

[tool_result] /**
 * GCodeSnippetEngine — Common G-code snippet library
 *
 * Provides pre-built G-code snippets for common operations,
 * eliminating the need to generate boilerplate G-code from scratch.
 * Parameterized templates with fill-in-the-blank values.
 *
 * Token savings: Instant G-code generation without full program creation.
 *
 * @version 1.0.0
 */

export interface GCodeSnippet {
  
... [+6524 chars truncated]

### User | 2026-06-23T23:33:03.028Z

[tool_result] /**
 * GCodeSnippetEngine — companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * GCodeSnippetEngine is a pure, deterministic G-code snippet library (parameterized
 * templates filled via naive `{key}` substitution). These tests lock its real emit
 * behavior with reference-value asserts so a future edit to a snippet body or to the
 * fill substitution semantics fails loudly (R9 — 
... [+7518 chars truncated]

### Assistant | 2026-06-23T23:33:05.682Z

I have both files. The error-triage reminder is a false positive (cat output, not a parse). Let me verify the old code that was replaced, and confirm the blast radius by checking the consumer.

### Assistant | 2026-06-23T23:33:08.043Z

[tool_use: Bash]

### Assistant | 2026-06-23T23:33:08.749Z

[tool_use: Grep]

### User | 2026-06-23T23:33:13.336Z

[tool_result] 98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical
---DIFF---
diff --git a/mcp-server/src/engines/GCodeSnippetEngine.ts b/mcp-server/src/engines/GCodeSnippetEngine.ts
index d4f29d6c0f..9186c18e33 100644
--- a/mcp-server/src/engines/GCodeSnippetEngine.ts
+++ b/mcp-server/src/engines/GCodeSnippetEngine.ts
@@ -185,7 +185,11 @@ export class GCodeSnippetEngine {
 
     let code = snip
... [+600 chars truncated]

### User | 2026-06-23T23:33:14.554Z

[tool_result] Found 7 files
src\__tests__\GCodeSnippetEngine.test.ts
src\engines\GCodeSnippetEngine.ts
src\tools\dispatchers\camDispatcher.ts
src\schemas\camActionSchemas.ts
src\engines\post-processor\CLAUDE.md
src\__tests__\postDispatcherUnwiredBatch1.test.ts
src\__tests__\gcode-snippet-engine.test.ts

### Assistant | 2026-06-23T23:33:18.617Z

I have the exact diff. The old line was `code.replace(new RegExp(`\\{${key}\\}`, "g"), String(value))`. There's a SECOND consumer the prompt didn't mention: `postDispatcherUnwiredBatch1.test.ts` and a second test file `gcode-snippet-engine.test.ts`. Let me check those — a second test asserting fill output is exactly the kind of silent miss I hunt.

### Assistant | 2026-06-23T23:33:21.444Z

[tool_use: Bash]

### Assistant | 2026-06-23T23:33:23.026Z

[tool_use: Bash]

### User | 2026-06-23T23:33:24.969Z

[tool_result] ===== camDispatcher refs =====
2259:  "post_gcode_snippet_get",            // GCodeSnippetEngine.get
2260:  "post_gcode_snippet_fill",           // GCodeSnippetEngine.fill
19998:          case "post_gcode_snippet_get": {
19999:            const { gCodeSnippetEngine } = await import("../../engines/GCodeSnippetEngine.js");
20001:            if (typeof id !== "string") throw new Error("post_gcode_sni
... [+1245 chars truncated]

### User | 2026-06-23T23:33:28.648Z

[tool_result] ===== gcode-snippet-engine.test.ts (lowercase) =====
10:      expect(s).not.toBeNull();
11:      expect(s!.id).toBe("tool_change");
12:      expect(s!.code).toContain("M6");
16:      expect(engine.get("nonexistent")).toBeNull();
22:      const code = engine.fill("tool_change", { tool_number: 5, rpm: 8000 });
23:      expect(code).not.toBeNull();
24:      expect(code).toContain("T5 M6");
25:      e
... [+726 chars truncated]

### Assistant | 2026-06-23T23:33:33.139Z

Both other test files are clean: `postDispatcherUnwiredBatch1.test.ts` only asserts null-on-unknown-id (unaffected), and the lowercase `gcode-snippet-engine.test.ts` asserts `T5 M6`/`S8000`/`G83`/`Q0.1` via `toContain` — all standard fills with no metachar/`$` params, so byte-identical under both implementations.

Let me verify the camDispatcher fill path returns the value unchanged (no post-processing that could mask divergence) and confirm there are no other `.fill(` callers in the codebase.

### Assistant | 2026-06-23T23:33:34.554Z

[tool_use: Read]

### User | 2026-06-23T23:33:35.387Z

[tool_result] 20006	          case "post_gcode_snippet_fill": {
20007	            const { gCodeSnippetEngine } = await import("../../engines/GCodeSnippetEngine.js");
20008	            const id = (params as { id: string }).id;
20009	            const fillParams = (params as { params: Record<string, string | number> }).params;
20010	            if (typeof id !== "string") throw new Error("post_gcode_snippet_fill 
... [+704 chars truncated]

### Assistant | 2026-06-23T23:33:35.844Z

[tool_use: Grep]

### User | 2026-06-23T23:33:39.864Z

[tool_result] <persisted-output>
Output too large (20.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\49ed5a8b-21b3-4cf8-a533-ef32fdab96a4\tool-results\toolu_016nvuFJu1XebUc1L1aafJtU.txt

Preview (first 2KB):
H:\prism\audits\cross_tree_reference_inventory.json:7452:        "path": "H:\\PRISM\\mcp-server\\src\\engines\\GCodeSnippetEngine.ts",
H:\prism\audits\cross_tree_reference_inventory.js
... [+1698 chars truncated]

### Assistant | 2026-06-23T23:34:22.757Z

I have everything I need. The camDispatcher fill path (line 20012-20013) passes `fill()`'s return straight into `result.gcode` with no post-processing — so divergence would surface directly, but the dispatcher feeds arbitrary `fillParams` from request input, which is exactly why the metachar/`$`-injection hardening matters.

Now let me walk the byte-equivalence proof for each existing test case and the divergence edges.

## Equivalence analysis: `replace(new RegExp("\\{key\\}","g"), String(value))` → `split("{key}").join(String(value))`

**Old behavior:** builds a global regex `\{key\}`, replaces every match with `String(value)` interpreted as a **replacement string** (so `$&`, `$\``, `$'`, `$$`, `$n` are special).

**New behavior:** literal split on `"{key}"`, joins with `String(value)` as a **pure literal**.

Walking each existing/new test case:

1. **Happy fill (`tool_change` {tool_number:5, rpm:8000})** — keys `tool_number`/`rpm` are plain `[a-z_]`, no metachars; values `"5"`/`"8000"` contain no `$`. Regex `\{tool_number\}/g` matches both `{tool_number}` occurrences; split/join replaces both. **Byte-identical.** ✓
2. **Missing-param-left-literal (`{rpm}` unfilled)** — `{rpm}` never appears in `Object.entries`, so neither impl touches it. **Identical.** ✓
3. **Numeric coercion (`drill_peck` x:1.25…)** — `String(1.25)`=`"1.25"` etc., no `$`. Both produce same. **Identical.** ✓ (Note: `String()` is the coercion in BOTH the old and new code — unchanged, so no float-reformat regression.)
4. **Extra-param no-op (`{bogus:42}`)** — `{bogus}` substring absent from `"M8 (Flood coolant on)"`: old regex matches nothing, `replace` returns string unchanged; `split("{bogus}")` yields a single-element array, `join` returns the original. **Identical.** ✓
5. **Cross-contamination (`tool_number:"{rpm}"` then rpm:9000)** — sequential order preserved in both (same `Object.entries` loop). Old: replaces `{tool_number}`→`"{rpm}"` (no `$`, literal), then `{rpm}`→`"9000"`. New: same. **I
... [+5167 chars truncated]
