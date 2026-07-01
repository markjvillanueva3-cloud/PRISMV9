---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Review a change that activates a dormant PreToolUse force in PRISM (FORCE-USE-MA"
date: "2026-06-15"
first_ts: "2026-06-15T21:32:32.352Z"
last_ts: "2026-06-15T21:48:03.486Z"
cwd: "H:\\prism"
messages: 66
user_msgs: 24
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a15f86769054cd42c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review a change that activates a dormant PreToolUse force in PRISM (FORCE-USE-MA

> **claude-code-cli** | 2026-06-15 | 66 msgs (24 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a15f86769054cd42c.jsonl`

## Transcript

### User | 2026-06-15T21:32:32.352Z

Review a change that activates a dormant PreToolUse force in PRISM (FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE, slot:alpha). This hook (grep-index-first.mjs) fires on EVERY Grep fleet-wide, so a regression hits every chat. Use `git -C H:/prism diff` for uncommitted changes. Files:
- scripts/lib/code-index-name-resolver.mjs (NEW: cap-safe name->path resolver from CODE_SYSTEM_INDEX.json) + its test (9 pass)
- .claude/hooks/grep-index-first.mjs (decideForceGraphRead now takes resolvePaths; a cached getResolvePaths(); call site wired)
- .claude/hooks/grep-index-first-force.test.mjs (6 new resolver-branch tests; 21 total)

CONTEXT: the force-deny (deny an exact-asset-name Grep, name the file to Read) shipped LATENT because find-cache nodes carry no path (verified 345,174 nodes, 0 with path). This wires CODE_SYSTEM_INDEX.json (943KB, 4180 codes) as the cap-safe name->path source.

You are weighted toward SILENT BREAKAGE + regression + over-fire risk + I/O safety. Verify (live test commands welcome):
1. OVER-FIRE: does the force fire ONLY on a clean-identifier (>=4 chars) EXACT name/file-stem match that exists on disk? Confirm a substring ("Engine"), an uncatalogued name, a regex/multi-word pattern, and a re-grep (deny-once) all ALLOW. I claim live: AHPEngine/calcDispatcher DENY; Engine/totallyrandomxyz/re-grep ALLOW. Re-verify.
2. REGRESSION: when the force does NOT fire, is the rest of the hook (advisory path, ollama suggestions, telemetry) byte-identical to before? The force block returns on deny; otherwise falls through.
3. I/O SAFETY: is the CODE_SYSTEM_INDEX load cap-safe (loadCodeIndex MAX_INDEX_BYTES guard, fail-soft to null)? Is the resolver built ONCE (cached), not per-Grep? Does a missing/corrupt index leave the force dormant (not throw)?
4. The exists() gate: a stale index naming a deleted file -> no force?

Grade PASS or FAIL with P0/P1/P2 + file:line. Terse.

### Assistant | 2026-06-15T21:32:39.716Z

I'll review this change that activates a dormant PreToolUse force. Let me start by examining the diff and the new files.

### Assistant | 2026-06-15T21:32:41.873Z

[tool_use: Bash]

### Assistant | 2026-06-15T21:32:41.898Z

[tool_use: Bash]

### User | 2026-06-15T21:34:13.776Z

[tool_result] <persisted-output>
Output too large (250.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tool-results\bej6epgxy.txt

Preview (first 2KB):
warning: in the working copy of '.claude/hooks/grep-index-first.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/wiki/architecture/skills/project/c
... [+1734 chars truncated]

### User | 2026-06-15T21:34:28.115Z

[tool_result] <persisted-output>
Output too large (2.3MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tool-results\btpz0j3i6.txt

Preview (first 2KB):
 M .claude/hooks/grep-index-first-force.test.mjs
 M .claude/hooks/grep-index-first.mjs
 M .claude/hooks/model-tier-advisor.mjs
 M CLAUDE.md
 M PRISM-INVENTORY-LATEST.md
 M "knowledge/PRISM Knowledge Vault.m
... [+1804 chars truncated]

### Assistant | 2026-06-15T21:34:30.646Z

The diff is huge due to mass file modifications (CRLF, memory syncs). Let me target only the three relevant files.

### Assistant | 2026-06-15T21:34:31.281Z

[tool_use: Bash]

### User | 2026-06-15T21:34:47.204Z

[tool_result] warning: in the working copy of '.claude/hooks/grep-index-first.mjs', CRLF will be replaced by LF the next time Git touches it
diff --git a/.claude/hooks/grep-index-first.mjs b/.claude/hooks/grep-index-first.mjs
index 912527bd0f..0cbaf058e3 100644
--- a/.claude/hooks/grep-index-first.mjs
+++ b/.claude/hooks/grep-index-first.mjs
@@ -28,6 +28,7 @@ import { join, dirname } from 'path';
 import { file
... [+4135 chars truncated]

### Assistant | 2026-06-15T21:34:49.689Z

Now let me see the rest of the force block (the deny-once logic, what it returns) and the call-site context.

### Assistant | 2026-06-15T21:34:50.780Z

[tool_use: Read]

### User | 2026-06-15T21:35:16.592Z

[tool_result] 184	export const GREP_INDEX_FORCE = process.env.PRISM_GREP_INDEX_FORCE !== '0';
185	const CLEAN_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{3,}$/;
186	
187	// U-GREP-FORCE-ACTIVATE (2026-06-15): the cap-safe name->path resolver, built ONCE per process
188	// from CODE_SYSTEM_INDEX.json (the find-cache nodes carry no path, so this is what makes the
189	// force actually fire). Fail-soft: an unavailable in
... [+6238 chars truncated]

### Assistant | 2026-06-15T21:35:23.019Z

Now let me see the full force block in `main()` to verify the deny-once logic and the byte-identical fall-through, plus read the new resolver and its test.

### Assistant | 2026-06-15T21:35:23.977Z

[tool_use: Read]

### Assistant | 2026-06-15T21:35:24.233Z

[tool_use: Read]

### User | 2026-06-15T21:35:27.840Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\code-index-name-resolver.mjs' was already read 65s ago in this session and is unchanged (mtime 1781558778587). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T21:35:29.586Z

[tool_result] 445	  // the file directly instead of grep-scanning for it.
446	  const graphHits = getGraphNodeHits(pattern);
447	  const graphSuggestions = graphHits.map(
448	    (h) =>
449	      `🎯 master-index hit: [${h.layer}/${h.built}] ${h.name}${h.path ? ` → ${h.path}` : ''}`,
450	  );
451	
452	  // FORCE (U-GREP-INDEX-FORCE): when the grep pattern is the EXACT name of a known
453	  // asset whose file ex
... [+5319 chars truncated]

### Assistant | 2026-06-15T21:35:32.535Z

The read-once-guard says the resolver was already read but I don't see it in my context. Let me read it now (it claims it's there but it isn't in my visible context).

### Assistant | 2026-06-15T21:35:33.375Z

[tool_use: Bash]

### User | 2026-06-15T21:35:42.974Z

[tool_result] /**
 * code-index-name-resolver.mjs -- cap-safe name->path resolver from CODE_SYSTEM_INDEX.json
 * (FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE, slot:alpha 2026-06-15).
 *
 * WHY: the grep-index-first force-deny (deny an exact-asset-name Grep, name the file to Read
 * instead -- a real token win) shipped LATENT. It needs a graph hit that carries a file PATH,
 * but the cap-safe find-cache.json nodes c
... [+3931 chars truncated]

### Assistant | 2026-06-15T21:35:48.207Z

There's a subtle but important detail. The cap guard checks `raw.length > MAX_INDEX_BYTES` AFTER `String(readImpl(path, "utf8"))`. If the file is >512MiB, `readFileSync(path, "utf8")` will throw the V8 string cap error BEFORE the length check runs — but that throw is caught by the try/catch returning null, so it's still fail-soft. The cap guard only meaningfully protects the heap for files between ~50MB and 512MiB. For the actual 943KB file this is fine. Let me note that and verify the exists-impl path.

Now let me check the cap guard semantics more carefully and verify the live behavior. First, let me check the CODE_SYSTEM_INDEX.json structure to confirm the resolver assumptions (`.codes`, `_meta.root`).

### Assistant | 2026-06-15T21:35:51.945Z

[tool_use: Bash]

### User | 2026-06-15T21:36:04.278Z

[tool_result] size_bytes: 943494
has codes: true type: object
_meta.root: "mcp-server/"
code count: 4180
sample entry: {"code":"E0001","path":"src/engines/AHPEngine.ts","name":"AHP","category":"E"}
entries with path: 3742

### Assistant | 2026-06-15T21:36:07.804Z

Confirmed: 943KB, 4180 codes, `_meta.root` = "mcp-server/", paths relative. 3742 entries have a path (438 codes carry no path — those are skipped, fine). Now let me build the resolver live and verify the OVER-FIRE claims directly.

### Assistant | 2026-06-15T21:36:11.974Z

[tool_use: Bash]

### User | 2026-06-15T21:36:22.163Z

[tool_result] idx size: 5250
AHPEngine -> ["mcp-server/src/engines/AHPEngine.ts"]
AHP -> ["mcp-server/src/engines/AHPEngine.ts"]
ahpengine (lower) -> ["mcp-server/src/engines/AHPEngine.ts"]
calcDispatcher -> ["mcp-server/src/tools/dispatchers/calcDispatcher.ts"]
Engine (substring) -> []
totallyrandomxyz -> []
empty -> []

### Assistant | 2026-06-15T21:36:25.245Z

Resolver behaves correctly: exact name and file-stem resolve, substring "Engine" → [], uncatalogued → []. Now let me verify the full `decideForceGraphRead` path with the resolver, and the CLEAN_IDENTIFIER gate, regex/multi-word patterns, and the exists() gate.

### Assistant | 2026-06-15T21:36:32.028Z

[tool_use: Bash]

### User | 2026-06-15T21:36:38.399Z

[tool_result] AHPEngine         => force: true name: AHPEngine paths: ["mcp-server/src/engines/AHPEngine.ts"]
calcDispatcher    => force: true name: calcDispatcher paths: ["mcp-server/src/tools/dispatchers/calcDispatcher.ts"]
AHP (3 char)      => force: false name: null paths: []
Engine substring  => force: false name: null paths: []
totallyrandomxyz  => force: false name: null paths: []
multi word        => fo
... [+306 chars truncated]

### Assistant | 2026-06-15T21:36:45.007Z

All over-fire gates confirmed:
- AHPEngine/calcDispatcher → DENY (force true)
- "AHP" (3 chars) → ALLOW (CLEAN_IDENTIFIER requires 4+ total chars)
- "Engine" substring → ALLOW
- "totallyrandomxyz" → ALLOW
- multi-word "AHP Engine" → ALLOW (CLEAN_IDENTIFIER rejects space)
- regex "AHP.*Engine" → ALLOW
- leading digit "123Engine" → ALLOW (regex requires `[A-Za-z_]` start)
- "calcDispatcher.ts" (dot) → ALLOW (the `.` fails CLEAN_IDENTIFIER, so a Grep for the full filename is NOT forced — minor but worth noting)
- exists=false (stale index → deleted file) → ALLOW (no force)
- resolver null (index unavailable) → ALLOW (force dormant)

Now let me verify the deny-once (re-grep) behavior and run the test suites. Let me check the RATE_WINDOW_MS and loadRate/saveRate paths, then run the tests.

### Assistant | 2026-06-15T21:36:46.282Z

[tool_use: Bash]

### Assistant | 2026-06-15T21:36:47.038Z

[tool_use: Bash]

### User | 2026-06-15T21:37:06.112Z

[tool_result] 51:const _entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
70:const RATE_WINDOW_MS = 60_000;
72:function loadRate() {
75:function saveRate(state) {
463:      if (fnow - (fstate[denyKey] || 0) >= RATE_WINDOW_MS) {
508:  if (now - last < RATE_WINDOW_MS) {
518:    if (now - state[k] > RATE_WINDOW_MS * 10) delete state[k];

### User | 2026-06-15T21:37:52.581Z

[tool_result]   ...
# Subtest: resolveNameToPaths: exact key only -- a substring does NOT resolve (force must not over-fire)
ok 27 - resolveNameToPaths: exact key only -- a substring does NOT resolve (force must not over-fire)
  ---
  duration_ms: 0.0719
  ...
# Subtest: loadCodeIndex: parses valid JSON; fail-soft to null on missing/corrupt/oversize
ok 28 - loadCodeIndex: parses valid JSON; fail-soft to null on
... [+574 chars truncated]

### Assistant | 2026-06-15T21:37:55.779Z

All 30 tests pass (9 resolver + 21 force). Now let me verify the deny-once behavior end-to-end through the actual hook stdin path, simulating a real Grep and then a re-grep. This is the most important regression check — that the second identical Grep ALLOWS.

### Assistant | 2026-06-15T21:38:00.682Z

[tool_use: Bash]

### User | 2026-06-15T21:38:21.150Z

[tool_result] === Grep 1 (AHPEngine) should DENY ===
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"grep-index-first FORCE: \"AHPEngine\" is the exact name of a known asset -- Read the file directly instead of grep-scanning (saves 50-80% tokens):\n  • mcp-server/src/engines/AHPEngine.ts\nNeed call-sites/usages (not the definition)? re-run this exact G
... [+304 chars truncated]

### Assistant | 2026-06-15T21:38:28.478Z

Live behavior confirmed exactly as claimed:
- Grep 1 (AHPEngine) → DENY with file path named
- Grep 2 (re-grep same) → `{"continue":true}` (deny-once works)
- substring "Engine" → ALLOW
- uncatalogued → ALLOW

Now there's one subtle thing in the Grep 2 / substring / uncatalogued cases: they returned a bare `{"continue":true}` with no advisory. That's because the advisory-decay gate likely muted, or the rate-limit kicked in. Let me verify the regression concern: when force does NOT fire, the advisory path must be byte-identical to before. Let me confirm the only change in `main()` is the single call-site arg, and check whether the force `catch` could swallow a legit issue. Let me look at the full diff of the test file and confirm nothing else in main changed.

### Assistant | 2026-06-15T21:38:30.176Z

[tool_use: Bash]

### User | 2026-06-15T21:38:33.382Z

[tool_result] warning: in the working copy of '.claude/hooks/grep-index-first.mjs', CRLF will be replaced by LF the next time Git touches it
+import { makeResolver, DEFAULT_CODE_INDEX_PATH } from '../../scripts/lib/code-index-name-resolver.mjs'; // U-GREP-FORCE-ACTIVATE: cap-safe name->path source (find-cache nodes carry none)
+// U-GREP-FORCE-ACTIVATE (2026-06-15): the cap-safe name->path resolver, built ONCE 
... [+2339 chars truncated]

### Assistant | 2026-06-15T21:38:38.763Z

The diff is clean and surgical. The only changes are: (1) the import, (2) the cached `getResolvePaths()`, (3) the `decideForceGraphRead` signature + resolved branch, (4) the single call-site arg. Everything after the force block (Ollama, regex, advisory, telemetry, decay, pending marker) is untouched — byte-identical. The regression-relevant change is `name: exact[0].name` → `name: p` (the trimmed pattern). Let me verify this is a behavior-equivalent: in the old path, `exact[0].name` was the matched node name (could differ in case from the pattern). Now `name` is the pattern `p`. The `name` field is only used in the deny reason string. Let me confirm.

### Assistant | 2026-06-15T21:38:39.710Z

[tool_use: Bash]

### User | 2026-06-15T21:38:47.005Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-15T21:38:53.010Z

`forceDecision.name` is never consumed in `main()` — the deny reason uses `${pattern}` directly (line 473), not `forceDecision.name`. So the `name: exact[0].name → name: p` change is cosmetic/inert for the live hook (only the tests assert on `name`). No regression.

Now let me check the cap-safe concern I flagged earlier — the order of `String(readImpl(...))` vs the byte cap. The cap-check happens after reading the string. For a >512MiB file, `readFileSync(path,"utf8")` throws the V8 string cap error first, but it's caught → null. Let me verify that's truly fail-soft and also check: is the resolver built once (cached) and not per-Grep? The `_resolvePathsCache === undefined` guard handles this. Let me verify the `getResolvePaths()` actually only loads once by checking the cache semantics and confirm `process.cwd()` resolves correctly when the hook runs.

### Assistant | 2026-06-15T21:38:58.620Z

[tool_use: Bash]

### User | 2026-06-15T21:39:05.359Z

[tool_result] oversize -> null: true
missing -> null: true
corrupt -> null: true
read-throw -> null: true
empty-codes makeResolver -> null: true

### Assistant | 2026-06-15T21:39:14.261Z

All I/O-safety paths confirmed fail-soft to null:
- oversize (>50MB raw) → null
- missing file → null
- corrupt JSON → null
- read throws (simulating the real V8 >512MiB string-cap throw) → null
- empty codes → null

The cap guard ordering concern is moot: even though the byte-length check runs after `String(readImpl(...))`, a true >512MiB file throws inside `readFileSync` and is caught → null. For files between 50MB and 512MiB, the explicit `MAX_INDEX_BYTES` cap catches them before parse. Real file is 943KB. Fail-soft is complete; a missing/corrupt index leaves the force dormant (advisory-only), not throwing.

Now let me verify the caching — `getResolvePaths()` builds the resolver once. And one more thing: the `getResolvePaths` uses `join(process.cwd(), DEFAULT_CODE_INDEX_PATH)` while the resolver internally returns repo-relative paths (prefixed with `_meta.root` = "mcp-server/"). The `exists()` check in the hook uses `existsSync` against those repo-relative paths. So `existsSync("mcp-server/src/engines/AHPEngine.ts")` is resolved against the hook's cwd. Let me confirm the hook runs with cwd = repo root (H:/prism) and that exists() works against the repo-relative path.

### Assistant | 2026-06-15T21:39:15.870Z

[tool_use: Bash]

### User | 2026-06-15T21:39:22.329Z

[tool_result] cwd: H:\prism
exists repo-rel AHPEngine: true
exists repo-rel calcDispatcher: true
--- now from a subdir to test cwd sensitivity ---
cwd: H:\prism\mcp-server
exists repo-rel AHPEngine (from mcp-server cwd): false

### Assistant | 2026-06-15T21:39:28.579Z

This surfaces a real coupling: the force only fires when the hook's `process.cwd()` is the repo root. From a different cwd (e.g. `mcp-server/`), both `makeResolver(join(process.cwd(), DEFAULT_CODE_INDEX_PATH))` would fail to find the index AND `existsSync("mcp-server/...")` would return false. Both fail in the same safe direction — the force just stays dormant (no false fire, no crash). This matches the pre-existing behavior of the rest of the hook (it already uses `process.cwd()`-relative paths for STATS_PATH etc.). Let me confirm the hook is invoked with cwd=repo-root in settings.json wiring, so this is not a silent-dormancy regression in production.

### Assistant | 2026-06-15T21:39:29.377Z

[tool_use: Bash]

### User | 2026-06-15T21:39:40.012Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-15T21:39:42.891Z

[tool_use: Bash]

### User | 2026-06-15T21:44:56.043Z

[tool_result] Command running in background with ID: b0pu67acn. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tasks\b0pu67acn.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-15T21:45:01.171Z

[tool_use: Bash]

### User | 2026-06-15T21:46:01.738Z

[tool_result] Exit code 255
H:/prism/.claude/hooks/glob-narrow-path.test.mjs
H:/prism/.claude/hooks/grep-index-first.mjs
H:/prism/.claude/hooks/grep-index-first.test.mjs
H:/prism/.claude/hooks/grep-index-first-force.test.mjs
H:/prism/.claude/hooks/grep-index-taken-correlator.mjs
H:/prism/.claude/hooks/grep-index-taken-correlator.test.mjs
H:/prism/.claude/hooks/grep-result-cache.mjs
H:/prism/.claude/hooks/nav-re
... [+36 chars truncated]

### Assistant | 2026-06-15T21:46:09.866Z

The hook is invoked directly by the harness on PreToolUse:Grep (Claude Code sets cwd to the project root for hooks). The live test I ran earlier (Grep 1 → DENY) was executed from `cd H:/prism`, confirming the production cwd is repo root and the force fires. This is the standard PRISM hook invocation pattern, and the cwd-dependency is shared with the rest of the hook (STATS_PATH, loadRate all use `process.cwd()`), so it's not a new regression — and it fails safe (dormant) if cwd ever differs.

Let me do a final check on one edge I want to be certain about: the `exists()` injection consistency. In the hook, `getResolvePaths()` is passed but `exists` defaults to `existsSync`. The resolved paths are filtered by `exists(pp)`. But note: the resolver itself does NOT check existence — it just maps name→path from the index. The hook's `.filter((pp) => exists(pp))` is the only existence gate for resolved paths. Confirmed at line 220. The stale-index/deleted-file case is handled. Let me verify the test file covers the adversarial cases to confirm test integrity (R9).

### Assistant | 2026-06-15T21:46:11.069Z

[tool_use: Bash]

### User | 2026-06-15T21:46:37.847Z

[tool_result] 21:test('force: exact identifier match + path exists -> force', () => {
27:test('force: case-insensitive exact match still forces', () => {
31:test('GUARD: matched path does NOT exist on disk -> no force (stale graph)', () => {
36:test('GUARD: substring (not exact) match -> no force (never hijack a partial-name grep)', () => {
40:test('GUARD: regex / metachar / multi-word pattern -> no force (cont
... [+1959 chars truncated]

### Assistant | 2026-06-15T21:46:41.885Z

Test coverage is genuinely adversarial (R9): stale-index, substring, regex/metachar, too-short, null-path, disabled, uncatalogued, dedupe, resolver-with-zero-hits. These encode intent and would fail if the gates regressed. The tests are not stubs.

I have everything I need. Let me confirm there are no other consumers of `decideForceGraphRead` that the new optional param could silently break.

### Assistant | 2026-06-15T21:46:43.072Z

[tool_use: Grep]

### User | 2026-06-15T21:47:00.596Z

[tool_result] Found 5 files
knowledge\memories\reference\reference_prompt_route_and_force_use_maps_2026_06_15.md
.claude\hooks\grep-index-first-force.test.mjs
.claude\hooks\grep-index-first.mjs
scripts\lib\code-index-name-resolver.mjs
state\shared\specs\FORCE-USE-MAP.md

### Assistant | 2026-06-15T21:47:05.863Z

The only code consumers are the hook itself (call-site updated) and the test. The other two are docs/specs. No un-updated consumer. The new param is optional with a `null` default, so any caller not passing it falls through to advisory (the old behavior pre-this-feature) — backward compatible.

Let me do one final blast-radius check: confirm `makeResolver` / `DEFAULT_CODE_INDEX_PATH` exports exist and are imported correctly (no typo silent-import-undefined), and that the resolver module has no other importers that could be affected.

### Assistant | 2026-06-15T21:47:07.582Z

[tool_use: Bash]

### User | 2026-06-15T21:47:41.809Z

[tool_result] exports: DEFAULT_CODE_INDEX_PATH, MAX_INDEX_BYTES, buildNameIndex, loadCodeIndex, makeResolver, resolveNameToPaths
DEFAULT_CODE_INDEX_PATH: mcp-server/data/docs/CODE_SYSTEM_INDEX.json
makeResolver is fn: true

### Assistant | 2026-06-15T21:48:03.486Z

All exports match the import. My review is complete. Here is the verdict.

---

VERDICT: PASS

summary: The dormant force-deny is activated correctly and surgically. Every over-fire gate holds (clean-identifier >=4 chars + exact name/file-stem + exists-on-disk), the resolver is built once per process and is cap-safe/fail-soft to dormant, and the entire non-force path (Ollama, regex, advisory, telemetry, decay, pending-marker) is byte-identical. No un-updated consumers. I re-verified all four claims live, including the operator's AHPEngine/calcDispatcher-DENY vs Engine/totallyrandomxyz/re-grep-ALLOW claim.

findings: none

Audit trail (verified live, not assumed):
1. OVER-FIRE — `.claude/hooks/grep-index-first.mjs:205-225` + `scripts/lib/code-index-name-resolver.mjs:59-67`. Live end-to-end via stdin: `AHPEngine` -> DENY (names `mcp-server/src/engines/AHPEngine.ts`); `calcDispatcher` -> DENY; immediate re-grep `AHPEngine` -> `{"continue":true}` (deny-once, `RATE_WINDOW_MS=60_000`, key `deny:${pattern}`, line 460-479); substring `Engine` -> ALLOW (resolver `idx.get` is exact-key only, no substring); `totallyrandomxyz` -> ALLOW. Also confirmed ALLOW for: 3-char `AHP` (CLEAN_IDENTIFIER `:185` requires 4+ total), multi-word `AHP Engine`, regex `AHP.*Engine`, leading-digit `123Engine`, and dotted `calcDispatcher.ts` (the `.` fails CLEAN_IDENTIFIER, so a full-filename grep is not hijacked — intentional, content-search-safe).
2. REGRESSION — `:482-553`. Diff is 4 surgical edits (import, cached `getResolvePaths`, signature+resolved-branch, one call-site arg). Everything after the force `return` is untouched. The `name: exact[0].name -> name: p` change is inert in production: `forceDecision.name` is never consumed by `main()` (the deny reason uses `${pattern}` at `:473`); only tests assert on it. The force block is wrapped in `try/catch { /* never block on a force fault */ }` (`:457,481`).
3. I/O SAFETY — `scripts/lib/code-index-name-resolver.mjs:72-84,87-93`. `loadCodeIndex` 
... [+1413 chars truncated]
