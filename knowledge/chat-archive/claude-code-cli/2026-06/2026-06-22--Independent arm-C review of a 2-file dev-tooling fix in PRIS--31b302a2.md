---
type: "chat-session"
source: "claude-code-cli"
session_id: "31b302a2-1334-4b15-87f3-6aa6d7d85dfa"
title: "Independent arm-C review of a 2-file dev-tooling fix in PRISM (branch cad-fusion"
date: "2026-06-22"
first_ts: "2026-06-22T19:58:35.768Z"
last_ts: "2026-06-22T20:02:04.397Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 20
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-ae0f73f48ac089f28.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent arm-C review of a 2-file dev-tooling fix in PRISM (branch cad-fusion

> **claude-code-cli** | 2026-06-22 | 54 msgs (20 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-ae0f73f48ac089f28.jsonl`

## Transcript

### User | 2026-06-22T19:58:35.768Z

Independent arm-C review of a 2-file dev-tooling fix in PRISM (branch cad-fusion-live-ms0). Weighted toward SILENT BREAKAGE + regression + integration coupling. Read both end to end; grade PASS/FAIL with file:line. Do NOT assume the other reviewer caught everything.

FILES (diff: `git -C H:/prism diff -- .claude/hooks/stop_on_unwired_assets.mjs`; new untracked test `.claude/hooks/__tests__/stop_on_unwired_assets.type-only.test.mjs`):
1. H:/prism/.claude/hooks/stop_on_unwired_assets.mjs
2. H:/prism/.claude/hooks/__tests__/stop_on_unwired_assets.type-only.test.mjs

CHANGE: added exported `isTypeOnlyModule(rawSrc)` + a `checkEngineTested` early-return that treats a type-only `*Engine.ts` as tested:true (no runtime to test). This is a Stop HOOK (T0) -- a bug here can either BLOCK every session (false-positive) or SILENTLY let a real untested engine through (false-negative / softened gate).

HUNT FOR:
1. SOFTENED GATE (the serious risk): does the new escape weaken the UNTESTED check for any REAL engine? An engine is "type-only" only if isTypeOnlyModule is true. Prove a normal engine (class + singleton, or class only) still returns false and still requires its test. Is this a hole a future engine could slip through (e.g. an engine that exports only types in its head but real runtime later -> confirm full-source read)?
2. Does adding `export function isTypeOnlyModule` change the hook's module side-effects or its CLI/stdin behavior at all? (The hook runs as a Stop hook reading stdin; confirm the new export is inert at load and the `main()`/invocation path is unchanged.)
3. Integration order: the newEngines loop calls checkEngineWired THEN checkEngineTested per engine. A type-only file: checkEngineWired returns wired:true ("no singleton -> data module"), checkEngineTested now returns tested:true. Confirm BOTH escapes agree (no half-state where one flags and the other doesn't) and no other check (the dispatcher/hook checks) touches a type-only engine file.
4. Regression: do t
... [+526 chars truncated]

### Assistant | 2026-06-22T19:58:40.307Z

I'll review both files end to end, then trace the integration paths and run the relevant tests.

### Assistant | 2026-06-22T19:58:41.143Z

[tool_use: Bash]

### Assistant | 2026-06-22T19:58:41.593Z

[tool_use: Read]

### User | 2026-06-22T19:58:41.850Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-22T19:58:42.418Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\__tests__\stop_on_unwired_assets.type-only.test.mjs' was already read 12s ago in this session and is unchanged (mtime 1782158243449). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disab
... [+23 chars truncated]

### Assistant | 2026-06-22T19:58:45.822Z

The cache references suggest these were already loaded. Let me read the actual files fresh since I need the content in my context.

### Assistant | 2026-06-22T19:58:46.275Z

[tool_use: Read]

### User | 2026-06-22T19:58:46.928Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stop_on_unwired_assets.mjs' was already read 9s ago in this session and is unchanged (mtime 1782158178698). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T19:58:49.959Z

The guard claims these are in my context, but I don't actually have the content yet — the session started fresh. Let me bypass the cache to get the real content.

### Assistant | 2026-06-22T19:58:50.968Z

[tool_use: Bash]

### User | 2026-06-22T19:58:55.238Z

[tool_result] #!/usr/bin/env node
// tier: T0
/**
 * stop_on_unwired_assets.mjs — Stop Hook
 * ========================================
 *
 * BLOCKS session termination when newly-built assets are not yet
 * wired to their logical endpoints. This catches the "built it but
 * never wired it" pattern that creates orphan stagnation.
 *
 * Checks performed (fast, git-diff-scoped — does not scan the full
 * codebase
... [+25999 chars truncated]

### Assistant | 2026-06-22T19:58:58.798Z

Now I have the full hook source. Let me read the new test file and the sibling audit script's `isTypeOnlyModule`, then run the three hook test files.

### Assistant | 2026-06-22T19:58:59.700Z

[tool_use: Bash]

### Assistant | 2026-06-22T19:59:00.864Z

[tool_use: Bash]

### User | 2026-06-22T19:59:03.171Z

[tool_result] // Tests for isTypeOnlyModule -- the TYPE-ONLY escape added to checkEngineTested in
// stop_on_unwired_assets.mjs (U-AUDIT-TYPE-ONLY sibling, 2026-06-22). A type-only
// `*Engine.ts` (e.g. an `IFooEngine.ts` re-export of `export type { ... }`) erases to
// zero runtime JS, so the Stop gate must NOT flag it UNTESTED (you cannot write 10 it()
// cases for a type re-export). Clone of the audit's dete
... [+4493 chars truncated]

### User | 2026-06-22T19:59:07.067Z

[tool_result] 171: * Decide whether a module is TYPE-ONLY -- it exports ONLY TypeScript types/interfaces
179: * NOT catch a type-only file that is conventionally named (`IEngine.ts`).
186: * they stay classified as before. Better to leave a type-only file in UNWIRED than to wrongly
195:export function isTypeOnlyModule(rawSrc) {
198:  // Any of these = a runtime export -> NOT type-only (enum/const-enum counted a
... [+1857 chars truncated]

### Assistant | 2026-06-22T19:59:09.752Z

Now let me compare the two `isTypeOnlyModule` implementations side by side (clone-drift check) and run the three hook test suites.

### Assistant | 2026-06-22T19:59:10.720Z

[tool_use: Read]

### Assistant | 2026-06-22T19:59:11.708Z

[tool_use: Bash]

### User | 2026-06-22T19:59:12.106Z

[tool_result] 170	/**
171	 * Decide whether a module is TYPE-ONLY -- it exports ONLY TypeScript types/interfaces
172	 * (`export type`, `export interface`, `export type { ... } from`, `export type * from`)
173	 * and therefore erases to ZERO runtime JavaScript. Such a file (e.g. `IEngine.ts`, a
174	 * convenience re-export of `EngineInfo`/`EngineCapability` type aliases) can NEVER be
175	 * "wired to a dispatch
... [+4937 chars truncated]

### User | 2026-06-22T19:59:15.659Z

[tool_result]   ...
# Subtest: isTypeOnlyModule: ADVERSARIAL commented-out runtime export does NOT rescue a real-runtime file → false
ok 9 - isTypeOnlyModule: ADVERSARIAL commented-out runtime export does NOT rescue a real-runtime file → false
  ---
  duration_ms: 0.1824
  ...
# Subtest: isTypeOnlyModule: ADVERSARIAL inline-type bare export `export { type Foo }` → false (conservative, never wrongly skips)
ok 10
... [+468 chars truncated]

### Assistant | 2026-06-22T19:59:20.352Z

New test suite passes 11/11. Now let me run the two existing hook suites (wiring + array-dispatch) for the regression check, and verify the comment-strip / clone-drift edge cases. There's a notable difference between the two `isTypeOnlyModule` implementations I want to verify: the hook strips block comments with `^\s*\/\*` (line-start anchored) while the audit uses a shared `stripCommentLines`. Let me check the audit's stripper and run the regression tests.

### Assistant | 2026-06-22T19:59:21.296Z

[tool_use: Bash]

### Assistant | 2026-06-22T19:59:22.296Z

[tool_use: Grep]

### User | 2026-06-22T19:59:23.775Z

[tool_result] 155:function stripCommentLines(content) {
156-  if (content === _lastStripContent) return _lastStripCode;
157-  const noBlock = content.replace(/^\s*\/\*[\s\S]*?\*\//gm, "");
158-  const code = noBlock
159-    .split("\n")
160-    .filter((line) => {
161-      const t = line.trim();
162-      return !(t.startsWith("//") || t.startsWith("*"));
163-    })
164-    .join("\n");
165-  _lastStripContent
... [+539 chars truncated]

### User | 2026-06-22T19:59:25.266Z

[tool_result] stop_on_unwired_assets.array-dispatch.test.mjs
stop_on_unwired_assets.type-only.test.mjs
stop_on_unwired_assets.wiring.test.mjs

### Assistant | 2026-06-22T19:59:28.517Z

The two comment-strip implementations are byte-identical in their regex/filter logic (the hook inlines exactly what `stripCommentLines` does). The detector body is identical. Now let me run the two existing regression suites.

### Assistant | 2026-06-22T19:59:29.464Z

[tool_use: Bash]

### Assistant | 2026-06-22T19:59:30.558Z

[tool_use: Bash]

### User | 2026-06-22T19:59:39.733Z

[tool_result]   ---
  duration_ms: 1538.9835
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 6224.1979

### User | 2026-06-22T19:59:43.674Z

[tool_result]   ---
  duration_ms: 0.0211
  ...
1..24
# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 65.117

### Assistant | 2026-06-22T19:59:48.341Z

All three suites green: wiring 4/4, array-dispatch 24/24, type-only 11/11. The new `export function isTypeOnlyModule` did not break `findUnhandledActions` imports. Now let me verify the critical softened-gate concern: prove a normal engine (class + singleton) still returns `false`, and check the comment-strip edge case where the hook's block-comment regex is line-start-anchored (`^\s*\/\*`).

Let me test a real-world scenario directly, plus probe the block-comment anchoring difference.

### Assistant | 2026-06-22T19:59:59.813Z

[tool_use: Bash]

### User | 2026-06-22T20:00:03.489Z

[tool_result] normal class+singleton (has export interface in head): false (must be false)
class only: false (must be false)
type head + runtime tail: false (must be false)
type-only + trailing inline block w/ commented runtime export: false (true=ok; false would be over-conservative but SAFE)
danger: code-then-blockcomment hiding stuff: false (false expected: const y= is runtime via... actually const y is not 
... [+106 chars truncated]

### Assistant | 2026-06-22T20:00:11.663Z

All the critical cases return the safe answer. Let me probe the one residual concern about the line-start-anchored block-comment strip: a multi-line block comment that *starts on a line with leading code but a real `export const` lives inside it on a later line* — and the inverse, where a genuinely type-only file has a trailing block comment that the line-anchored regex leaves intact but it contains no runtime signal.

The key adversarial question: can a block comment's content (which is NOT stripped when the `/*` isn't at line-start) ever cause a *false-positive* (a real engine wrongly classified type-only)? Since unstripped comment text can only *add* matches to the runtime-export/value-reexport regexes (which force `false`), leaving a comment unstripped is biased toward `false` — the safe direction. Let me confirm the one way it could go wrong: a real runtime export buried in an unstripped block comment would force false (safe). The only false-positive path would require a runtime export to be *stripped away* while a type export survives.

### Assistant | 2026-06-22T20:00:23.762Z

[tool_use: Bash]

### User | 2026-06-22T20:00:27.365Z

[tool_result] JSDoc-commented fake runtime + real type export: true (true=ok: the export const is genuinely inside JSDoc)
leading block comment + real runtime export: false (MUST be false)
leading multiline JSDoc + real class/singleton: false (MUST be false)
module.exports: false (MUST be false)
exports.x: false (MUST be false)
const enum: false (false = conservative)

### Assistant | 2026-06-22T20:00:32.104Z

All correct. Now let me address concern #2 (load-side inertness of the new export) and #3 (integration order — do both escapes agree). Let me verify that `isTypeOnlyModule` is a pure function with no module-load side effects and that the only module-level execution is still the `isDirectInvocation()` guard. Then confirm a type-only file passes both `checkEngineWired` AND `checkEngineTested` to the same `true` verdict (no half-state).

### Assistant | 2026-06-22T20:00:36.595Z

[tool_use: Bash]

### User | 2026-06-22T20:00:40.217Z

[tool_result] import side-effect output above this line? (should be none)
exports: findUnhandledActions, isTypeOnlyModule
isTypeOnlyModule is fn: true
findUnhandledActions is fn: true
import elapsed ms (no stdin block): 11 (should be tiny, NOT ~1500 stdin timeout)
idempotent: true

### Assistant | 2026-06-22T20:00:45.630Z

Import is fully inert (11ms, no stdin block, no output). Now the integration-order check (#3): trace a type-only `*Engine.ts` through the actual `main()` loop. It enters `newEngines` (matches `Engine.ts`, status A). Then `checkEngineWired` → `extractSingletonName` finds no `export const ...Engine =` → returns `wired:true, reason:"no singleton export (data module)"`. Then `checkEngineTested` → `isTypeOnlyModule` true → `tested:true`. Both agree. Let me confirm with a live end-to-end run feeding a synthetic transcript so I exercise the actual `main()` path, not just the pure functions.

### Assistant | 2026-06-22T20:00:53.766Z

[tool_use: Bash]

### User | 2026-06-22T20:00:58.161Z

[tool_result] NOTE: file is under temp, not REPO_ROOT, so main() will skip it (outside repo). Test the functions directly with a real repo-relative path instead.
WIRED verdict: wired:true (no singleton -> data module)
TESTED verdict: tested:true (type-only)
BOTH agree to PASS: true

### Assistant | 2026-06-22T20:01:05.253Z

Both escapes agree (no half-state). I confirmed the temp files were cleaned up (the `rm -rf` only targeted the `mktemp -d` dir, and the repo-relative file was removed in the `finally`).

Now the one remaining sharp edge worth verifying: the dispatcher/hook checks must NOT touch a type-only engine file. A type-only `*Engine.ts` only enters `newEngines` — it does not match `DISPATCHERS_DIR` (it's under `engines/`, not `tools/dispatchers/`) nor `HOOKS_DIR` (`.mjs`). So `checkDispatcherActionHandlers` and `checkNewHookRegistered` never see it. Confirmed by reading the `main()` routing predicates.

Let me do the final clone-drift verification: diff the two `isTypeOnlyModule` bodies for any *behavioral* divergence (the audit uses a memoized `stripCommentLines`; the hook inlines the same logic). I'll run both implementations over a shared adversarial battery.

### Assistant | 2026-06-22T20:01:14.226Z

[tool_use: Bash]

### User | 2026-06-22T20:01:17.496Z

[tool_result] NO CLONE DRIFT across 27 cases — hook and audit agree on every input

### Assistant | 2026-06-22T20:01:21.460Z

No clone drift across 27 inputs including whitespace/tab variants and the adversarial mixed-export cases. Both clones agree on every input.

Let me do one final regression-sanity check on the broader hook test directory to confirm nothing else imports from this module in a way the new export could perturb, and confirm `git status` shows only the two expected files.

### Assistant | 2026-06-22T20:01:23.646Z

[tool_use: Bash]

### User | 2026-06-22T20:01:28.536Z

[tool_result]  .claude/hooks/stop_on_unwired_assets.mjs | 44 ++++++++++++++++++++++++++++++++
 1 file changed, 44 insertions(+)
---untracked test---
?? .claude/hooks/__tests__/stop_on_unwired_assets.type-only.test.mjs
---other importers of this hook module---
.claude/hooks/__tests__/stop_on_unwired_assets.array-dispatch.test.mjs
.claude/hooks/__tests__/stop_on_unwired_assets.type-only.test.mjs
.claude/hooks/__t
... [+120 chars truncated]

### Assistant | 2026-06-22T20:01:33.487Z

The diff is +44 lines (pure addition: the JSDoc + `isTypeOnlyModule` function + the `checkEngineTested` early-return), no deletions. Two other scripts reference the hook filename. Let me confirm those two are not importing the new export in a way that could break (they likely just name-reference the hook, not import its functions).

### Assistant | 2026-06-22T20:01:34.450Z

[tool_use: Bash]

### User | 2026-06-22T20:01:39.792Z

[tool_result] scripts/audit-dispatcher-ghost-actions.mjs:10: * fleet-wide sweep companion to the reactive `stop_on_unwired_assets` Stop gate.
scripts/audit-dispatcher-ghost-actions.mjs:13: * `.claude/hooks/stop_on_unwired_assets.mjs` (handles switch/table/array-membership dispatch +
scripts/audit-dispatcher-ghost-actions.mjs:26:import { findUnhandledActions } from "../.claude/hooks/stop_on_unwired_assets.mjs";

... [+121 chars truncated]

### Assistant | 2026-06-22T20:02:04.397Z

`audit-dispatcher-ghost-actions.mjs` imports `findUnhandledActions` from the hook (line 26) — the new `isTypeOnlyModule` export is additive and does not touch that function, so this importer is unaffected (confirmed already: the array-dispatch suite which exercises the same import passed 24/24). `psn-incorp-automate.mjs` is just a doc-string mention. No external consumer is perturbed.

I have everything I need. Here is my verdict.

---

VERDICT: PASS

summary: The change is a purely additive +44-line escape hatch: an exported pure `isTypeOnlyModule(rawSrc)` plus an early `tested:true` return in `checkEngineTested` for files that erase to zero runtime JS. It is conservative in the safe direction (a real engine is never wrongly skipped), the new export is inert at module load, both wiring+test escapes agree to PASS with no half-state, and all three hook suites are green. No silent breakage, no softened gate for real engines, no clone drift against the sibling audit detector.

findings: none

Auditable trace (edge-paths I verified, so the PASS is not a rubber-stamp):

- Softened-gate hunt (the serious risk) — `stop_on_unwired_assets.mjs:194-209`. Proved a normal engine still requires its test: class+singleton (with `export interface` in the head) → `false`; class-only → `false`; type-head-with-runtime-tail-far-below → `false` (full-source read confirmed, no head-slice); CJS `module.exports`/`exports.x` → `false`; `export enum`/`const enum` → `false` (conservative); inline `export { type Foo }` → `false`; a real `export const` sharing a line after an inline block comment → `false`. The only path to `true` requires a positive `export type|interface` AND zero runtime/value/CJS-export signals over the comment-stripped full source. A runtime export hidden in an unstripped (non-line-start) block comment biases toward `false` (the safe direction) because unstripped comment text can only *add* runtime-export matches. No future-engine hole found.

- Load inertness (#2) — import
... [+2359 chars truncated]
