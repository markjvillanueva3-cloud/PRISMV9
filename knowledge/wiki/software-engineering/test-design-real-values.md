---
name: test-design-real-values
category: software-engineering
domain: backend-dev
tags: [test-design, real-value-assertions, hermetic-vs-e2e, regression-guard, r9, ai-development]
last_updated: 2026-05-18
---

# Test Design — Real Values, Hermetic Boundaries, Regression Guards

R9: tests verify intent. A test that doesn't fail when the production logic regresses is worthless. Three discipline layers compose into useful test suites.

## Layer 1 — Real-value assertions

**Anti-pattern (caught + rejected by PRISM hooks):**

```js
assert.ok(result);                          // passes for any truthy value
assert.toBeDefined();                       // passes for non-undefined
expect(result.length).toBeGreaterThan(0);   // passes for any non-empty
```

**Correct:**

```js
assert.equal(result.score, 0.847);                       // exact expected value
assert.deepEqual(result.hits, [{id:"a",score:0.5}, …]);  // structural match
assert.match(result.title, /^Kienzle force on aluminum/); // semantic invariant
```

The rule: **a test should fail when the business logic changes.** If your assertion would still pass when the production fn returns `'wrong-but-truthy'`, it's a stub assertion.

## Layer 2 — Hermetic vs E2E — both required

| Test type | Speed | Coverage | When |
|-----------|-------|----------|------|
| **Pure-function** | ~ms | Algebraic core | Every exported fn; cover edge cases |
| **Hermetic with injected deps** | ~10 ms | Logic + boundaries | Engine with fake reader/writer |
| **Real-data E2E** | ~100 ms+ | Production reader factories | At least 1 per pure-core + injected-readers engine |
| **Subprocess oracle** | ~500 ms | `main()` CLI path | Whenever `main()` carries logic the unit tests miss |

The RGS-TOOL-AUTOINVOKE-MS0 lesson (2026-05-16): **97 hermetic tests, all green, 10 P0 production bugs in the reader factories.** The hermetic fakes injected didn't match the real reader factory shape. Fix landed in MS1's `rgs-tool-planner.e2e.test.mjs` — the missing real-data E2E.

**The standing rule:** every pure-core + injected-readers design MUST ship at least one real-data E2E test.

## Layer 3 — Regression-guard tests

A regression-guard test asserts the load-bearing invariant of a prior bug fix. The 2026-05-18 lima backend-dev tribal wiring shipped:

```js
it("manufacturing tokens still win over backend-dev (first-match-wins precedence)", () => {
  // Future dev reordering DOMAIN_MAP would silently route mill chats to
  // backend-dev. This test fails loud on that reorder.
  assert.equal(inferTribalDomain(["mill", "hook"]), "mill");
  assert.equal(inferTribalDomain(["lathe", "ollama"]), "lathe");
});
```

Every entry in CLAUDE.md `## Recent regressions` SHOULD be paired with a regression-guard test. The lesson from 2026-05-17 `realign tier test to OPT-2 crit=88`: the fleet-reaper test hardcoded `crit=95` and silently asserted the old constant. A regression-guard test would have caught it; the fix added one.

## Anti-pattern: chasing 100% line coverage

A 100%-line-coverage suite full of `toBeDefined()` calls is worse than a 60%-coverage suite that asserts real values on the critical paths. **Coverage measures lines executed; tests measure intent verified.** Don't conflate them.

## The "ship the test that would have caught this bug" rule

Every bug fix MUST include a test that would have caught the original bug. If you can't write that test, you don't understand the bug. The discipline forces you to articulate the failure mode in code.

This is the rail behind PRISM's `## Recent regressions` ledger — every entry implicitly asks "is there a regression-guard test?"

## Hermetic test patterns (injected dependencies)

```js
import { runMyEngine } from "./MyEngine.js";

// Inject fake reader so test doesn't touch real filesystem
const fakeReader = (path) => path === "/expected" ? "fake-data" : null;
const result = runMyEngine({ readFileImpl: fakeReader, ...args });
assert.equal(result.processed, "fake-data-processed");
```

**Caution:** if the production code calls `readFileImpl` differently than the test injects (e.g. wrong shape), the test passes against the fake but production fails. This is the hermetic-mock blindspot — the layer-3 E2E is the only rail against it.

## Subprocess oracles for `main()` logic

If your CLI script has logic in `main()` that's not exposed as an exported fn, write a subprocess oracle:

```js
import { spawnSync } from "node:child_process";

it("--apply flag writes to disk and exits 0", () => {
  const result = spawnSync(process.execPath, [
    "scripts/my-script.mjs", "--apply", "--target", testFile
  ], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /retagged: 34/);
  const written = JSON.parse(readFileSync(testFile, "utf8"));
  assert.equal(written.retaggedCount, 34);
});
```

The 2026-05-18 hotel `U-SLOT-BIND-ENFORCE` lesson: P1 fixes lived in `main()`, hermetic suite passed, subprocess oracle caught it. Pure-core + injected-deps MUST ship a subprocess integration oracle when `main()` carries logic.

## Test naming — describe the invariant, not the implementation

**Bad:** `it("returns correct value")`. **Good:** `it("returns the cosine-2× boosted score for in-domain entries")`.

A failing test should communicate the broken invariant in the name alone.

## Related

- [[karpathy-12-rule-discipline]] — R9 (tests verify intent)
- [[per-file-scrutiny-gate]] — what reviewers look for
- [[regression-prevention-doctrine]] — fail-on-revert tests
- [[fail-loud-r12-patterns]] — assertions are fail-loud applied to code
- CLAUDE.md §"## Recent regressions" — every entry should pair with a test
