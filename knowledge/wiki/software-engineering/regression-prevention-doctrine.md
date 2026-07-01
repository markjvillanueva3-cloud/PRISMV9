---
name: regression-prevention-doctrine
category: software-engineering
domain: backend-dev
tags: [regression, silent-corruption, postmortem, root-cause, ai-development]
last_updated: 2026-05-18
---

# Regression Prevention Doctrine — the CLAUDE.md `## Recent regressions` pattern

PRISM treats every regression as a permanent doctrine entry, not a fixed-and-forgotten ticket. The `CLAUDE.md` `## Recent regressions` section is **append-only** — every entry survives indefinitely so future builds inherit the lesson.

## Entry format (canonical structure)

```
- YYYY-MM-DD | **<one-line headline>** observed-in: <commit-sha-or-context> | fix: <commit-sha or 'see commit'> | verify: <one-line repro/probe command>
```

Optional extended block for high-leverage classes:

```
- YYYY-MM-DD | **<headline>** — <2-3 sentence narrative of WHY it shipped (the wrong assumption, the missed read, the schema drift)>. | fix: <U-XXX commit-sha, 1-2 sentence what changed>. | observed-by: <chat-slot or audit> | verify: <command>.
```

## What makes a regression worth logging

Three criteria. If ANY two fire, it's a regression-doctrine entry:

1. **Silent corruption class** — the bug produced no error, just bad data / wrong answer / missing record. Operators wouldn't have noticed without the eval-harness or a careful read.
2. **Recurring root cause** — the same failure mode hit twice in different code paths (e.g. "META-tool schema-read-blindness" in 2026-05-16 juliett AND 2026-05-17 lima). Recurrence proves the lesson hasn't propagated.
3. **Hard-to-test premise** — the code passed all unit tests because the tests assumed the same wrong premise as the code (hermetic-mock blindspot, RGS-TOOL-AUTOINVOKE-MS0).

Trivial bugs (typos, off-by-one in test data) DON'T qualify. The bar is: would this lesson save a future chat 30+ minutes?

## The discipline — read the regressions before designing

Before designing a new feature in the same area:

```bash
grep -B1 -A3 "<area-keyword>" H:/prism/CLAUDE.md | grep -A3 "## Recent regressions"
```

PRISM's longest-running classes:

- **Schema-read blindness** — code reads `j.X.Y` against producer emitting `j.Y`. 3 cases in 2026-05-16/17.
- **Hermetic-mock blindspot** — pure-core + injected-reader tests green; production reader factory broken. RGS-TOOL-AUTOINVOKE-MS0 P0 class.
- **JSON.stringify(g, null, 2) at scale** — V8 max-string-length crash. seed-ghost (2026-05-18), merge-augmentations (prior).
- **Last-writer-wins on shared state** — system-graph.json (3 writers), roadmap-index.json (5 writers, 3 non-atomic).
- **PS5.1 raw control bytes in ConvertTo-Json** — process enumeration blinded. Fleet reaper 2026-05-16b.
- **Stale tool/script + recent constant change** — fleet-reaper-tier.test hardcoded 95 after constant lowered to 88.

## The fix discipline — fix root cause, not symptom

**Anti-pattern:** "test fails because X = 95 not 88; update test to 95" — locks in the wrong assumption.

**Correct:** read why the constant changed; if intentional, update the test to import the constant from source (`import { DEFAULT_MEM_CRITICAL_PCT } from "./fleet-reaper-sweep.mjs"`) and assert relative invariants instead of hardcoded values.

## The fail-on-revert test

For every regression doctrine entry, ship at least one test that **fails if someone re-introduces the bug** in a future refactor. This is the load-bearing rail.

Example from the 2026-05-18 lima backend-dev tribal wiring:

```js
it("manufacturing tokens still win over backend-dev (first-match-wins precedence)", () => {
  // Critical safety invariant: a mill/lathe/wedm/cad/cam slot whose topic
  // happens to also contain a backend-dev token MUST still route to the
  // manufacturing domain. Backend-dev is declared LAST in DOMAIN_MAP.
  assert.equal(inferTribalDomain(["mill", "hook"]), "mill");
  // …
});
```

A future dev who casually reorders `DOMAIN_MAP` (putting backend-dev first because alphabetical) gets a red test, not a silent regression.

## R12 + regression doctrine

R12 (fail-loud) is the rail against new regressions; the doctrine is the rail against the SAME regression re-appearing. They're sister rails — neither alone catches everything.

## When the regression IS a missing test (the post-ship 10-agent class)

RGS-TOOL-AUTOINVOKE-MS0's lesson — "97 hermetic tests, all green, 10 P0 production bugs" — added a new doctrine line: **a pure-core + injected-reader design MUST ship at least one real-data E2E test**. The MS1 fix added `rgs-tool-planner.e2e.test.mjs` exactly because of this. Every milestone since has inherited the rail.

## The doctrine flow

```
regression observed → root-cause analysis → CLAUDE.md "Recent regressions" entry
                  → fail-on-revert test added
                  → wiki page if the lesson is broad (this page is an example)
                  → memory file if it's chat-portable (`feedback_*.md`)
```

## Related

- [[karpathy-12-rule-discipline]] — R10 (checkpoint) + R12 (fail loud)
- [[per-file-scrutiny-gate]] — the per-file gate that catches regressions pre-commit
- [[fail-loud-r12-patterns]] — write-side regression prevention
- CLAUDE.md §"## Recent regressions" — the canonical ledger
