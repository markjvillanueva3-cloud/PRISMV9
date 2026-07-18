---
name: hermetic-test-patterns
category: code-tribal
domain: backend-dev
tags: [testing, hermetic, injected-deps, fixture-isolation, real-data-e2e, regression-oracle, test-design, node-test, vitest]
last_updated: 2026-05-18
---

# Hermetic Test Patterns in PRISM

The bug class that hermetic tests fail to catch is the costliest in PRISM: **"hermetic fakes don't prove production wiring."** Five separate post-ship audits over six months (RGS-TOOL-AUTOINVOKE-MS1, fleet-reaper Tier-2 schema-blindness, U-CK06 dispatcher z.enum bypass, NN-GRAPH-MS0 false-pass, U-HRSR schema-read-blindness) shipped milestones that 100% of hermetic tests passed and 0% of production wiring worked.

This wiki captures the patterns that catch what hermetic fakes miss, without giving up the speed + determinism that make hermetic tests worth running in the first place.

## The cost of false-green tests

A hermetic test that injects a fake reader can pass with 100% green while the real reader is shipping wrong data. Five real PRISM examples:

| Milestone | Hermetic tests | Real bugs missed | Fix |
|-----------|----------------|------------------|-----|
| RGS-TOOL-AUTOINVOKE-MS0 | 97 unit tests pass | 10 P0 bugs in 4 real reader factories | MS1 + `rgs-tool-planner.e2e.test.mjs` |
| fleet-reaper Tier-2 | 19 tests pass with fabricated `services.docker` | Real probe emits `docker` top-level → safety guard dead in production | 3 real-producer-shape E2E tests |
| U-CK06 dispatcher | 9/9 tests pass via MockMCPServer | MockMCPServer bypasses `z.enum(ACTIONS)` → missing-from-enum action 100% broken in prod | E2E through `app.run` (no mock layer) |
| NN-GRAPH-MS0 | All training tests pass | poolSize=0 in live graph → tier dormant-by-data | Real-graph regression oracle |
| U-HRSR-SCHEMA | 8 tests pass with v2 schema fixture | Real v1 schema → reported ratio=n/a on working route | Schema-probe before read |

The pattern is identical every time: **the test fabricated a shape the producer never emits**.

## The minimum-viable real-data test

**Rule**: a pure-core + injected-readers design MUST ship ≥1 real-data E2E test as a fail-on-revert regression oracle.

The minimum-viable real-data test:

```js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { runRealReaders } from '../runMyEngine.mjs';

test('E2E: real readers produce non-zero output against live state', async () => {
  const result = await runRealReaders({
    statePath: 'state/shared/MILESTONE_PROGRESS.json', // REAL file
  });
  assert.ok(result.shippedCount > 0, 'real state should have ≥1 shipped unit');
  assert.ok(result.totalMilestones > 100, 'real state should have ≥100 milestones');
});
```

Three properties that make this a regression oracle:
1. **It reads the real file** — if a producer changes shape, the test fails immediately.
2. **It asserts non-trivial scale** — `result.shippedCount > 0` would pass on an empty fake; `> 100` won't.
3. **It calls THE production path** — `runRealReaders` is the same function shipped to production, not a test-only wrapper.

Total cost: ~10 lines. Catches 90% of "hermetic fakes don't prove production wiring" bugs.

## Pattern 1 — Pure core + injected readers (the right way)

This is the pattern PRISM converges on for everything testable:

```js
// myEngine.mjs (pure core)
export function decide({ openUnits, capabilities, tribalTips, now }) {
  // 100% pure logic over the inputs — easy to test hermetically
}

// myEngineMain.mjs (real production caller)
export async function runRealReaders(opts = {}) {
  const openUnits = await readOpenUnits(opts.statePath);
  const capabilities = await readCapabilities();
  const tribalTips = await readTribalTips();
  const now = Date.now();
  return decide({ openUnits, capabilities, tribalTips, now });
}
```

Two tests:
- **N hermetic tests** of `decide()` with injected synthetic inputs (fast, deterministic, ALL edge cases).
- **1 real-data E2E test** of `runRealReaders()` against live state files (slow, end-to-end, catches reader factory bugs).

The hermetic tests are NOT optional and the E2E is NOT optional. Either alone is insufficient.

## Pattern 2 — Schema-probe before reading

The 2026-05-17 `U-HRSR-SCHEMA-V2` bug: a reader assumed `j.totals.{offloaded,keptOnClaude}` against a schema v2.0.0 that emits those fields at top-level. Hermetic test fabricated the v2 shape and passed; real v1 schema returned `0,0` silently.

**Fix pattern — schema-probe:**

```js
function readStats(j) {
  const schemaV = j.schemaVersion ?? 'v1-implicit';
  if (schemaV === 'v1-implicit' || 'totals' in j) {
    return { schemaV, offloaded: j.totals?.offloaded ?? 0, ... };
  }
  // v2: fields at top-level
  return { schemaV, offloaded: j.offloaded ?? 0, ... };
}
```

The reader REPORTS the detected `schemaV` in its output. Downstream callers can see "I got schemaV: v1-implicit when I expected v2" and fail loud instead of silently degrading. **The schema version is part of the output contract, not a debug detail.** See [[schema-migration-patterns]].

## Pattern 3 — Test the dispatcher path, not the mock path

The 2026-05-16 `U-CK06` dispatcher z.enum bypass: tests used `MockMCPServer` which dispatches actions by direct lookup, bypassing the real `z.enum(ACTIONS)` validation gate. The result: an action not in the enum 9/9-passed in tests and 100%-failed in production.

**Anti-pattern**:
```js
const result = await mockMCP.invoke('prism_dev', 'my_action', params);  // bypasses z.enum
```

**Right pattern** — test through the real dispatcher app:
```js
import { app } from '../app.mjs';
const result = await app.run({ tool: 'prism_dev', action: 'my_action', params });
```

The real `app.run` walks the same code path as the production MCP server: action enum validation, dispatcher routing, response shaping. If the action is missing from the enum, the test fails — which is what you want.

## Pattern 4 — Subprocess oracle for `main()` code

CLI entry points (the `main()` block at the bottom of a script) are often the LAST place hermetic tests reach — pure-function tests cover the lib, but the CLI argv parsing, env-var reading, error-handling-and-exit-code logic lives in `main()` and goes untested.

The 2026-05-18 `U-SLOT-BIND-ENFORCE` lesson: 33 hermetic tests passed against the pure core; 4 P0+P1 bugs lived in `main()`. The fix was an 8-case **subprocess oracle**:

```js
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('main: emits bind directive for /checkin-hotel with valid sid', () => {
  const r = spawnSync(process.execPath, [
    'H:/prism/.claude/hooks/slot-bind-enforce.mjs',
  ], {
    input: JSON.stringify({ prompt: '/checkin-hotel', session_id: 'DEADBEEF-x' }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /slot.bind/i);
});
```

The subprocess oracle catches:
- argv parsing bugs
- env-var-not-being-read bugs
- stdin handling bugs
- exit code bugs
- output-shape bugs

Cost: ~5 lines per case. Worth it for any code that has a `main()` block.

## Pattern 5 — Hostile-payload tests (Reviewer B's specialty)

The 2026-05-15 `E1 IdeaBlockExtractor` scrutiny: Reviewer A passed on a greedy `slice(firstBrace, lastBrace + 1)` JSON extraction. Reviewer B caught it as a hostile-payload class — a model output containing `{...} ... {...}` would return the WRONG block.

**Pattern**: for any code that parses model output, scrutinize like an adversary:

```js
test('extractor handles model output with multiple JSON blocks', () => {
  const input = `{"first": 1} junk text {"second": 2}`;
  const result = extractIdeaBlock(input);
  assert.equal(result.second, 2, 'should return last block, not greedy slice');
});

test('extractor handles model output with brace inside string', () => {
  const input = `{"text": "value with } brace"}`;
  const result = extractIdeaBlock(input);
  assert.equal(result.text, 'value with } brace');
});
```

The hermetic test catches what the model **CAN** output, not just what it **DID** output. Build the hostile-payload list from:
- Embedded JSON blocks in prose
- Quoted braces in string literals
- Unicode control characters (the 2026-05-16 `enumeration-blinding` bug)
- Empty / null / undefined where a non-empty was expected
- Mixed line-endings (\r\n vs \n)

## Pattern 6 — Fail-on-revert regression tests

When a bug is fixed, the next test ADDED should be the one that fails on revert. Three properties:

1. **Specific** — asserts the exact thing that was broken, not a generic invariant.
2. **Lives in the test file closest to the bug** — not in a `regressions/` bucket.
3. **Names the bug class in the test name** — `test('R12: schema-blindness false-fixed by U-HRSR-SCHEMA-V2', ...)`.

Example from CLAUDE.md `## Recent regressions`:
- The 2026-05-17 `U-FR-TIER1-AGGRESSIVE-THRESHOLDS` ship added a "legacy parity proof" test — when `criticalPct === warnPct`, the new tier logic must be byte-identical to the pre-tier-gate binary logic. If a future refactor breaks legacy parity, this test trips first.

## Pattern 7 — Real-fs tmpdir oracles

For tests of file-system code (lockfile, atomic-write, JSONL append), inject `os.tmpdir()` and clean up in `after()`:

```js
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';

const dir = mkdtempSync(path.join(os.tmpdir(), 'prism-test-'));
after(() => rmSync(dir, { recursive: true, force: true }));

test('atomic-write produces inode-atomic file', () => {
  const target = path.join(dir, 'test.json');
  atomicWriteJson(target, { ok: true });
  assert.deepEqual(JSON.parse(readFileSync(target, 'utf8')), { ok: true });
});
```

This is hermetic in the right way: real filesystem, real I/O, isolated directory.

## Pattern 8 — Test-side test discipline

Some tests are themselves buggy. Common patterns:

- **Per-test setup/teardown that share state**: the 2026-05-18 `U-VIZ-FIND-CACHE` regression — teardown deleted the live graph because setup never backed it up that call. **Fix**: SUITE-lifetime backup/restore, not per-test.
- **Hard-coded constants that drift**: the 2026-05-17 `fleet-reaper-tier.test.mjs` hard-coded `DEFAULT_MEM_CRITICAL_PCT=95`; the production constant lowered to 88 in OPT-2; 7 assertions failed at HEAD. **Fix**: import the real constant; assert on derived behavior; don't duplicate magic numbers.
- **Mocks that drift from real shape**: see Pattern 2 + Pattern 3.

## Test-budget discipline

Not every assertion deserves a test. A useful heuristic:

- **MUST have a test**: any function that's called from production with user input, any branch with a non-trivial truth table, any state-machine transition.
- **SHOULD have a test**: pure transforms, formatters, parsers.
- **PROBABLY skip**: trivial getters, one-line wrappers, type-only re-exports.

The R10 (test-design) lever: ask "what business invariant does this test prove?" If the answer is "the function returns what it returns," it's worthless. If the answer is "a customer can't lose money because rounding goes the right way," it earns its keep.

## Anti-patterns observed in PRISM

- **`toBeDefined()` stubs** — hook-rejected by `comprehensive-build-enforce`. Real value or it's worthless.
- **Tests of test infrastructure** — `assert.ok(mockFn.called)` proves the mock works, not your code.
- **Test order dependence** — if `test('B')` only passes when `test('A')` ran first, you have a state leak.
- **Tests that re-run production-side regressions for their assertion** — `assert.equal(myFn(x), production.myFn(x))` is a tautology if production.myFn IS myFn.
- **`it.skip` / `xfail` without an expiration date** — `## Recent regressions` should have any skip with a "remove after X" condition.

## When to break the rules

For deeply integration-bound code (an Ollama agent calling 3 read-only tools across the network), pure hermetic tests can't reach the behavior at all. The right move is a **gated-real-network** test:

```js
const SKIP_REAL = process.env.OLLAMA_E2E !== '1';
test('real-network: agent answers viz_search query', { skip: SKIP_REAL }, async () => {
  // exercise the real path against a real Ollama
});
```

Gated by env var so CI can opt-in but the default test run isn't network-dependent.

## See also

- [[test-design-real-values]] — what to assert (the WHY of testing)
- [[per-file-scrutiny-gate]] — the 2-reviewer protocol that catches what tests miss
- [[fail-loud-r12-patterns]] — failing-loud as the test the user runs in production
- [[concurrency-and-locking-patterns]] — testing concurrency without flake
- [[schema-migration-patterns]] — schema-probe pattern at the reader boundary
