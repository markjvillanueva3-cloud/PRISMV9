---
name: reference-skill-tier-wire-pattern
description: SkillTierRegistryEngine wire as canonical pattern for wiring orphaned engines into existing dispatchers — 5 actions + schema + dispatcher + engine test + wire test with in-process round-trip
aliases: reference_skill_tier_wire_pattern
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.948Z
---


# SkillTierRegistryEngine wire — canonical orphan-rescue pattern

**Shipped 2026-05-13 (claude-671682f9, slot bravo, cad-fusion-live-ms0)**
2 commits: `4765820a1` (engine wire + 2 tests) + `d1e6af9fd` (round-trip
addendum after codex blocker on first scrutiny). 3-of-3 scrutiny PASS.

## Why this matters

`SkillTierRegistryEngine` was built by an earlier milestone (`PP-0.25.6-U-UX1`
from the universal-skills-scripts-hooks plan) but never wired to any dispatcher.
It surfaced on `state/shared/ORPHAN-INVENTORY.md` as a built+documented+
unwired node. The wire is the **template** to follow when picking up future
orphans from that punch list — uses no special infrastructure, fits any pure
engine, doesn't touch shared-state files that other chats may own.

## The 5-file recipe

For an orphan engine `FooEngine` that naturally belongs on `prism_X`:

1. **Add Zod schemas** to `src/schemas/XActionSchemas.ts` (snake_case action
   names, `.passthrough()` tail, .describe() per field). Register each in
   the `ACTION_X_SCHEMAS` export map.
2. **Add action enum entries + switch cases** in
   `src/tools/dispatchers/XDispatcher.ts`. **Lazy-import** the engine inside
   the case body (`const { fooEngine } = await import("../../engines/FooEngine.js")`)
   — never top-level import. Use the singleton; never `new FooEngine()`.
   Remap snake_case → camelCase at this boundary if the engine uses camel
   (e.g. `explicitTier: params.explicit_tier`).
3. **Write `FooEngine.test.ts`** in `src/__tests__/` — engine-direct tests,
   pure construction, ≥30 it() cases. Cover validation, edge cases, lifecycle,
   the documented-singleton path.
4. **Write `XDispatcher.foo-wire.test.ts`** — source-grep enum+case
   presence, schema-map registration, Zod boundary (required-field rejection,
   enum rejection, snake_case acceptance), **in-process round-trip** that
   captures the live `tool()` handler closure via a fake MCP server and
   drives every action through real switch+Zod+singleton.
5. **Verify**: `npx vitest run <both files>` → 100% pass. `npx tsc --noEmit`
   → zero NEW errors in the changed files.

## Critical gotchas (caught during this build)

- **`.toBe(undefined)` is acceptable; `.toBeUndefined()` is the idiomatic
  form**. Both pass PRISM's test-legitimacy gate. `.toBeDefined()`/
  `.toBeTruthy()`/`.toBeFalsy()` are REJECTED.
- **The dispatcher's error path returns RAW `{success:false,error,...}`**
  (from `dispatcherError()`), NOT wrapped in MCP `{content:[{type,text}]}`.
  The round-trip helper must handle BOTH shapes — wrap a `parseResponse(out)`
  function that checks `Array.isArray(o.content)` first, falls back to `o`
  as-is.
- **Substring-keyword matching is a footgun**. `command.toLowerCase().includes(kw)`
  matches `"lathe"` inside `"/sublathe-mode"` (offset 3). Pin this behavior
  in a test so a future word-boundary refactor surfaces as a failure.
  Make sure your test string ACTUALLY contains the substring — `/relathing`
  does NOT contain `"lathe"` because `i` is at offset 7 not `e`.
- **Codex blocker rule**: source-grep + schema-validation alone is NOT
  enough wire coverage. Codex will FAIL if the test doesn't actually call
  the dispatcher handler and verify the engine method ran. The
  `buildHandler()` pattern (mock-server-captures-tool-closure) is the
  smallest possible in-process round-trip and adds ~80 LOC.

## Commit doctrine for this kind of work

- Branch in main tree (`H:/prism`), use `[MAIN]` prefix in commit subject.
- Scope as `[CAD-FUSION-LIVE-MS0]/U-WIRE-<NAME>` — matches the existing
  wiring-batch convention used by `U-WIRE-LATHE-BATCH2` and
  `U-WIRE-CALC-SCE` peers.
- Stage files individually (`git add <path>` per file). NEVER `git add -A`
  in shared multi-chat tree — peer-staged files will land in your commit.
- Run scrutiny `--target <SHA>` against the specific commit SHA. HEAD~N
  drifts when peers commit concurrently — saw `8915bdda6` → `28fccde44`
  mid-scrutiny last session.

## Where the orphan punch list lives

- Snapshot: `state/shared/ORPHAN-INVENTORY.md` (regen via
  `node scripts/orphan-inventory.mjs`)
- Live source: `state/shared/BUILD_STATE.json` → `NEEDS_WIRING.sample_engines[]`
  (879 candidates as of 2026-05-13)
- Master index: `prism_session:master_index_query` with
  `min_utilization=0, buildClass="unwired"` filter

## Successful rescues so far (running tally)

- **2026-05-13** `SkillTierRegistryEngine` → `prism_skill_script` (5 actions) ·
  commits `4765820a1` + `d1e6af9fd` · 67 tests · 3-of-3 PASS
- **2026-05-13** `LoRADriftCoordinatorEngine` → `prism_ai` (8 actions) ·
  commits `f208b644e` + `e900781e8` + `0cd915ceb` · 55 tests · 3-of-3 PASS

## Lessons from each rescue iteration

- **SKILL-TIER (iter 1)**: Codex demanded actual handler-call round-trip
  (source-grep alone FAILED). The `buildHandler()` fake-MCP-server pattern
  emerged as the minimum-viable in-process round-trip (~80 LOC).
- **SCRIPT_INVENTORY (iter 2, not an engine wire but adjacent)**:
  Reviewer P1 — heuristic classifiers self-classify when their docstring
  lists class names as examples. Add `SELF_BASENAME` skip to prevent.
  Tighten contentRe to require ENFORCEMENT verbs not just class names.
- **LORA-DRIFT (iter 3)**: Codex demanded **exact** assertions for
  case-count checks — `>=1` is too weak even when the dispatcher's
  symbol-import structure makes 1 the actual correct value. Use `.toBe(1)`
  AND add a literal `case "<action>":` substring check. The shell-quoting
  failure mode also surfaced: `[[reference_...]]` in `-m "..."` is parsed
  as bash conditional. Use `git commit -F <file>` for messages with
  brackets/wiki-links/backticks.

## Avoiding pitfalls in the shared multi-chat tree

- Stage files INDIVIDUALLY (`git add <path>` per file). Auto-stage hooks
  sweep untracked peer files into your commit (saw this in c91a88bc0).
- If `index.lock` keeps reappearing: `rm -f .git/index.lock && sleep 2`
  before the next git command. Don't `git commit` in a long `&&` chain
  with multiple `git add` — peers race the lock.
- Commit messages with `[[...]]` markdown wiki-link syntax get eaten by
  bash. Write to `H:/prism/.cache/commit-msg-<unit>.txt` then `git commit -F`.

Related: [[reference_awareness_stack]] · [[reference_master_index_surface]]
· [[reference_build_state_surface]] · [[feedback_always_close_out]]
· [[feedback_roadmap_close_out]] · [[feedback_conflict_fork_rule]]
