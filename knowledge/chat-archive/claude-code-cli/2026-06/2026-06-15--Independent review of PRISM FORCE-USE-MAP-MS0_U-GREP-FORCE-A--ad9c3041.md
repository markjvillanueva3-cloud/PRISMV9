---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Independent review of PRISM FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE (slot:alpha)"
date: "2026-06-15"
first_ts: "2026-06-15T21:32:32.291Z"
last_ts: "2026-06-15T21:39:18.250Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 19
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ac671d9383b423b4f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Independent review of PRISM FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE (slot:alpha)

> **claude-code-cli** | 2026-06-15 | 50 msgs (19 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ac671d9383b423b4f.jsonl`

## Transcript

### User | 2026-06-15T21:32:32.291Z

Independent review of PRISM FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE (slot:alpha). Use `git -C H:/prism diff`. Files: scripts/lib/code-index-name-resolver.mjs (+test), .claude/hooks/grep-index-first.mjs, .claude/hooks/grep-index-first-force.test.mjs.

It activates a previously-latent grep force-deny by adding a cap-safe name->path resolver sourced from CODE_SYSTEM_INDEX.json (.codes: {code,path,name,category}, paths relative to _meta.root="mcp-server/").

You are weighted toward LIB DESIGN + test integrity + convention:
- Resolver design: buildNameIndex keys by short name AND file-stem, prefixes _meta.root for repo-relative paths, exact-key-only (no substring) resolution, multi-path Sets. Is the root-prefix logic correct (no double-prefix; handles empty root)? Is resolveNameToPaths safe on null/non-Map?
- Is loadCodeIndex's MAX_INDEX_BYTES cap correct + fail-soft? Is makeResolver's null-on-empty-index right?
- Test integrity (R9): do the resolver tests + the new force-branch tests verify INTENT (exact-key, root-prefix, exists-gate, no-over-fire, dedup)? Any .skip/.only? The LIVE test (real CODE_SYSTEM_INDEX) -- does it fail-soft-skip correctly when the index is absent rather than failing the suite?
- ASCII-only (ascii-guard)? Any magic number not a named const? Does decideForceGraphRead stay backward-compatible (existing tests that pass no resolvePaths still pass)?
- R8: is this the right reuse (CODE_SYSTEM_INDEX is the canonical shortcode index) vs reinventing a name->path map?

Grade PASS or FAIL with P0/P1/P2 + file:line. Terse.

### Assistant | 2026-06-15T21:32:41.922Z

I'll review this diff. Let me start by reading the changed files end to end.

### Assistant | 2026-06-15T21:32:41.925Z

[tool_use: Bash]

### Assistant | 2026-06-15T21:32:42.560Z

[tool_use: Bash]

### User | 2026-06-15T21:33:59.136Z

[tool_result] diff --git a/.claude/hooks/grep-index-first-force.test.mjs b/.claude/hooks/grep-index-first-force.test.mjs
index 8b511f9726..769e02b4a3 100644
--- a/.claude/hooks/grep-index-first-force.test.mjs
+++ b/.claude/hooks/grep-index-first-force.test.mjs
@@ -65,6 +65,40 @@ test('dedupes multiple hits resolving to the same path', () => {
   assert.deepEqual(r.paths, ['a.ts']);
 });
 
+// -- U-GREP-FORCE-AC
... [+2584 chars truncated]

### User | 2026-06-15T21:34:13.629Z

[tool_result] <persisted-output>
Output too large (250.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tool-results\bs2xiitkj.txt

Preview (first 2KB):
warning: in the working copy of '.claude/hooks/grep-index-first.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/wiki/architecture/skills/project/c
... [+1734 chars truncated]

### Assistant | 2026-06-15T21:34:16.636Z

Let me read the full files end to end. The diff is noisy; I'll read the actual files directly.

### Assistant | 2026-06-15T21:34:17.349Z

[tool_use: Read]

### Assistant | 2026-06-15T21:34:17.593Z

[tool_use: Read]

### User | 2026-06-15T21:34:27.718Z

[tool_result] 1	/**
2	 * code-index-name-resolver.mjs -- cap-safe name->path resolver from CODE_SYSTEM_INDEX.json
3	 * (FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE, slot:alpha 2026-06-15).
4	 *
5	 * WHY: the grep-index-first force-deny (deny an exact-asset-name Grep, name the file to Read
6	 * instead -- a real token win) shipped LATENT. It needs a graph hit that carries a file PATH,
7	 * but the cap-safe find-cach
... [+4205 chars truncated]

### User | 2026-06-15T21:34:27.759Z

[tool_result] 1	// scripts/lib/code-index-name-resolver.test.mjs
2	// Tests for U-GREP-FORCE-ACTIVATE name->path resolver. Real reference-value asserts (R9).
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import {
6	  buildNameIndex, resolveNameToPaths, loadCodeIndex, makeResolver, MAX_INDEX_BYTES,
7	} from "./code-index-name-resolver.mjs";
8	
9	// A CODE_SYSTEM_INDEX.json-shap
... [+5517 chars truncated]

### Assistant | 2026-06-15T21:34:30.926Z

Now let me read the hook file end to end, plus its force test file.

### Assistant | 2026-06-15T21:34:31.916Z

[tool_use: Read]

### Assistant | 2026-06-15T21:34:32.258Z

[tool_use: Read]

### User | 2026-06-15T21:34:44.161Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * grep-index-first.mjs - PreToolUse Grep
5	 * Suggests checking MASTER_INDEX before expensive grep searches.
6	 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
7	 * Falls back to regex-based suggestions when Ollama unavailable.
8	 *
9	 * Token savings: 50-80% on known patterns.
10	 *
11	 * PSN-SYNERGIZE/U-GREP-GRAPH-WIRE (2026-
... [+27672 chars truncated]

### User | 2026-06-15T21:34:44.371Z

[tool_result] 1	// tier: T3
2	// grep-index-first-force.test.mjs
3	// Tests for FORCE-USE-MAP-MS0 / U-GREP-INDEX-FORCE: decideForceGraphRead() --
4	// the advisory-to-forced-deny promotion in grep-index-first.mjs. Real
5	// reference-value asserts (R9): each pins the exact force/no-force decision +
6	// its quality guard (exact-match, path-exists, clean-identifier, escape).
7	//
8	// Run: node --test H:/prism/.
... [+7333 chars truncated]

### Assistant | 2026-06-15T21:34:49.337Z

Now let me verify a few claims against the actual code: the real CODE_SYSTEM_INDEX shape, that `decideForceGraphRead`'s prior signature is backward-compatible, and that the tests actually run green. Let me also confirm ASCII-only on the new files.

### Assistant | 2026-06-15T21:34:53.912Z

[tool_use: Bash]

### User | 2026-06-15T21:35:25.915Z

[tool_result] bytes 943494
_meta {"version":"3.0.0","generated":"2026-04-12T04:25:35.876Z","total_codes":4180,"root":"mcp-server/","dsl_extended_at":"2026-05-15T23:59:40.763Z","dsl_extended_by":"regen-dsl-shortcodes.mjs (SYSTEM-VIZ-DSL-MS0/U-DSL-EXTEND)"}
codeCount 4180
sample {"code":"E0001","path":"src/engines/AHPEngine.ts","name":"AHP","category":"E"}
sample2 {"code":"E0002","path":"src/engines/AIMLEngine.ts
... [+92 chars truncated]

### Assistant | 2026-06-15T21:35:30.743Z

The real index matches the fixture shape exactly: `_meta.root="mcp-server/"`, `.codes` entries `{code,path,name,category}`, paths repo-relative WITHOUT the root prefix (3742 need prefixing, 0 already prefixed, 438 have no path). The resolver's `toRepoRel` logic is correct for the live data, and the `startsWith(root)` double-prefix guard is defensive (untriggered in live but tested in fixture). Now let me run the tests and verify ASCII-only + the live resolution.

### Assistant | 2026-06-15T21:35:31.692Z

[tool_use: Bash]

### Assistant | 2026-06-15T21:35:32.227Z

[tool_use: Bash]

### User | 2026-06-15T21:35:43.154Z

[tool_result]   ...
# Subtest: makeResolver: returns a working resolver fn from a loadable index, null otherwise
ok 8 - makeResolver: returns a working resolver fn from a loadable index, null otherwise
  ---
  duration_ms: 0.3035
  ...
# Subtest: LIVE: the real index resolves a known engine name to an on-disk path
ok 9 - LIVE: the real index resolves a known engine name to an on-disk path
  ---
  duration_ms: 1
... [+114 chars truncated]

### User | 2026-06-15T21:35:52.774Z

[tool_result]   ...
# Subtest: loadFindCacheNodes: corrupt find-cache -> {nodes:[]} (fail-soft)
ok 20 - loadFindCacheNodes: corrupt find-cache -> {nodes:[]} (fail-soft)
  ---
  duration_ms: 0.4701
  ...
# Subtest: getGraphNodeHits: small fixture graph (under cap) still reads directly
ok 21 - getGraphNodeHits: small fixture graph (under cap) still reads directly
  ---
  duration_ms: 0.8939
  ...
1..21
# tests 21
... [+88 chars truncated]

### Assistant | 2026-06-15T21:35:56.056Z

Both suites pass (9/9 and 21/21, 0 skipped). Now let me verify the LIVE resolution actually fires against a real on-disk engine, check ASCII-only on the new files, and confirm the resolver returns a real path for a real catalogued engine name (the actual production scenario).

### Assistant | 2026-06-15T21:35:59.623Z

[tool_use: Bash]

### Assistant | 2026-06-15T21:36:01.668Z

[tool_use: Bash]

### User | 2026-06-15T21:36:07.126Z

[tool_result] resolver null? false
AHP -> ["mcp-server/src/engines/AHPEngine.ts"]
AHPEngine -> ["mcp-server/src/engines/AHPEngine.ts"]
exists AHPEngine path? true
Engine (suffix) -> []
calc (dispatcher short) -> ["mcp-server/src/tools/dispatchers/calcDispatcher.ts"]

### User | 2026-06-15T21:36:18.960Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: scripts/lib/code-index-name-resolver.mjs
grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: scripts/lib/code-index-name-resolver.test.mjs
grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: .claude/hooks/grep-index-first-force.test.mjs

### Assistant | 2026-06-15T21:36:23.294Z

The `-P` flag failed (locale), so the ASCII check is inconclusive. Let me redo it properly and also verify backward-compat: existing force tests that pass NO `resolvePaths` still pass, and confirm the hook file (which has emoji in its message strings) isn't newly introducing non-ASCII in the changed lines only.

### Assistant | 2026-06-15T21:36:26.132Z

[tool_use: Bash]

### Assistant | 2026-06-15T21:36:27.752Z

[tool_use: Bash]

### User | 2026-06-15T21:36:35.983Z

[tool_result] scripts/lib/code-index-name-resolver.mjs: ASCII-OK
scripts/lib/code-index-name-resolver.test.mjs: ASCII-OK
.claude/hooks/grep-index-first-force.test.mjs: ASCII-OK

### User | 2026-06-15T21:36:39.160Z

[tool_result] grep-index-first.mjs non-ascii codepoints: [8212,8594,129302,127919,8226,128203]

### Assistant | 2026-06-15T21:36:46.278Z

The three NEW files (resolver, resolver test, force test) are strictly ASCII-OK. The hook file `grep-index-first.mjs` contains non-ASCII codepoints (em-dash 8212, arrow 8594, robot/target emoji, bullet 8226, clipboard emoji) — but these are all in pre-existing advisory message strings (`🤖`, `🎯`, `📋`, `→`, `•`), not in the lines this diff added. Let me confirm the diff's added lines in the hook are ASCII, and verify the new force message text uses ASCII (I saw `--` not em-dash, `•` bullet). Let me check the specific added force message line and confirm backward-compat of the signature.

### Assistant | 2026-06-15T21:36:48.223Z

[tool_use: Bash]

### User | 2026-06-15T21:37:00.902Z

[tool_result] [fork-storm-breaker] fork-storm guard: 421 live bash.exe >= ceiling 400. New Bash spawns are PAUSED to protect the MCP server (:3100) from process-storm starvation -- the "api server error" root cause. The storm drains within seconds; WAIT briefly, then retry. Do NOT fan out more agents/bash right now. Override only if you are certain: append [SCOPED] / --force-spawn, raise PRISM_FORKSTORM_CEILING
... [+39 chars truncated]

### Assistant | 2026-06-15T21:37:05.251Z

Fork-storm breaker paused new spawns. Let me wait briefly and retry as a single command.

### Assistant | 2026-06-15T21:37:08.025Z

[tool_use: Bash]

### User | 2026-06-15T21:37:51.933Z

[tool_result] Exit code 1
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'H:\tmp\gif.diff'
    at Object.readFileSync (node:fs:441:20)
    at [eval]:2:23
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:118:14
    at [eval]-wrapper:6:24
    at runScript (n
... [+251 chars truncated]

### Assistant | 2026-06-15T21:37:55.509Z

Path translation issue on Windows. Let me use a relative temp file under the repo.

### Assistant | 2026-06-15T21:37:57.295Z

[tool_use: Bash]

### User | 2026-06-15T21:38:11.317Z

[tool_result] ALL ADDED HOOK LINES ASCII-OK

### Assistant | 2026-06-15T21:38:18.575Z

All added hook lines are ASCII-OK. The pre-existing emoji/arrow/em-dash are in untouched advisory strings (the new force message at lines 473-474 uses ASCII `--` and the bullet at line 467 is `•` 8226 — let me confirm whether that bullet is on an added line).

The added-lines check came back clean, so the `• ${p}` at line 467 must be pre-existing context, not an added line. Let me verify that specific line's origin and confirm the backward-compat signature claim (existing tests with no `resolvePaths` still pass — already confirmed by the 21/21 run which includes the old tests). Let me also double-check the magic-number constants and the `getResolvePaths` process-cache memoization correctness.

### Assistant | 2026-06-15T21:38:20.378Z

[tool_use: Bash]

### User | 2026-06-15T21:38:35.146Z

[tool_result] db02ed6b11 [MAIN-FORCE] [FORCE-USE-MAP-MS0]/U-GREP-INDEX-FORCE-P2 (slot:alpha): regression-review P2 -- drop no-op suggested:true from force-deny telemetry (recordTelemetry treats offloaded as exclusive). PASS, force proven inert on live graph (path:null)
---blame line 467 (bullet)---
added lines with bullet(8226): 0
total added (non +++) lines: 30

### Assistant | 2026-06-15T21:38:42.902Z

Confirmed: zero added lines contain the bullet — the `• ${p}` at line 467 is pre-existing context from the prior U-GREP-INDEX-FORCE-P2 commit (db02ed6b11). The 30 added lines in the hook are all ASCII. The non-ASCII codepoints in the file are all in untouched code.

Let me do a final verification: confirm the `decideForceGraphRead` backward-compat (old default `resolvePaths=null` means the legacy `hitPaths`-only path is preserved), and verify the `getResolvePaths` memoization handles the `undefined`-vs-`null` sentinel correctly (so a failed load caches `null` and isn't retried as `makeResolver` every call).

I've already confirmed via reading: line 205 default `resolvePaths = null`; line 219 `(typeof resolvePaths === 'function')` so `null` -> `resolved = []` -> behaves exactly like before. Line 190 `let _resolvePathsCache;` is `undefined` initially; line 192 checks `=== undefined` (not falsy) so a cached `null` (load failure) is NOT re-attempted. Correct.

Let me run the broader resolver+hook test files together once more confirming no `.skip`/`.only` slipped in anywhere.

### Assistant | 2026-06-15T21:38:44.646Z

[tool_use: Bash]

### User | 2026-06-15T21:38:48.561Z

[tool_result] scripts/lib/code-index-name-resolver.test.mjs tests=9 skip/only/todo=[]
.claude/hooks/grep-index-first-force.test.mjs tests=21 skip/only/todo=[]

### Assistant | 2026-06-15T21:39:18.250Z

No `.skip`/`.only`/`.todo` in either file. All checks complete.

## Review Complete

VERDICT: PASS

summary: U-GREP-FORCE-ACTIVATE adds a clean, cap-safe `name->path` resolver sourced from the canonical `CODE_SYSTEM_INDEX.json` and wires it into `decideForceGraphRead` to finally activate the latent grep force-deny (find-cache nodes carry no path; the 728MB graph exceeds V8's string cap). The lib design is correct and well-guarded, the resolver matches the live index shape exactly (verified against the real 4180-entry index, `_meta.root="mcp-server/"`, 3742 paths needing the prefix), tests verify intent with real reference values, and backward-compat + ASCII discipline hold. No P0/P1 findings.

findings:
  - none (P0/P1). Two minor P2 notes below, both deferrable.

What I verified (auditable):
- **Resolver design / root-prefix** (`scripts/lib/code-index-name-resolver.mjs:37,47-49`): `toRepoRel` prefixes `_meta.root` only when the path does not already start with it (no double-prefix); empty root yields identity. Confirmed against live data: 3742 entries get prefixed, 0 double-prefixed, and `AHP -> mcp-server/src/engines/AHPEngine.ts` resolves to a file that exists on disk. File-stem AND short-name keying both work (`AHP` and `AHPEngine` both resolve; `calc` -> `calcDispatcher.ts`).
- **Exact-key-only / no over-fire** (`code-index-name-resolver.mjs:59-65`): `resolveNameToPaths` does `idx.get(k)` exact-key lookup, never substring. Live-verified `Engine` (common suffix) -> `[]`, and `resolveNameToPaths("AHP", null)` / `("AHP", {})` -> `[]` (guarded by `idx instanceof Map` at line 60; null/non-string name coerced safely at line 61).
- **Cap-safe / fail-soft load** (`code-index-name-resolver.mjs:22,72-81`): `MAX_INDEX_BYTES = 50MB` (live file is 943KB); oversize/missing/corrupt all return `null` inside a try/catch — verified by the injected-I/O tests. `makeResolver` returns `null` on empty index (line 91), so the force stays dormant rather than throwing.
- **Test integrit
... [+2818 chars truncated]
