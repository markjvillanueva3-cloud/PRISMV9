---
title: Bug-Hunting Applied Practice — green-test-no-oracle, flaky-test root causes, coverage-not-correctness, mock drift, silent catch-and-continue, boundary off-by-one
galaxy: bug-hunting
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: Practitioner CS-engineering claims WebFetch-confirmed against primary free/legal sources (MIT 6.031 Software Construction sp22 Testing + Code Review readings; Martin Fowler's "Eradicating Non-Determinism in Tests", "Mocks Aren't Stubs", "ContractTest"; established CS reference articles on Error hiding and Mutation testing). Each gotcha carries an inline verbatim quote from a fetched source. NO benchmark/percentage gate is asserted as doctrine — those are owner-gated.
tags: [bug-hunting, applied-practice, tribal-knowledge, flaky-tests, test-isolation, test-oracle, coverage, mutation-testing, mock-drift, contract-test, error-hiding, silent-failure, off-by-one, boundary, fail-fast, R9, R12, MIT-6031]
---

# Bug-Hunting Applied Practice

The **practitioner-knowledge layer** for the bug-hunting galaxy: the hard-won testing / static-analysis gotchas that pure theory does not teach. Read [[bug-hunting-foundations]] FIRST — it owns the theory (oracle problem, coverage criteria, partition/boundary theory, fail-fast ordering, rep invariants, static-analysis undecidability, fault-localization discipline, NIST SAMATE/SPC). This entry is the orthogonal half: *what actually goes wrong when you write the test or run the scan, and how an expert sidesteps it.* Every claim below is a WebFetch-confirmed verbatim quote from a free/legal source; the **galaxy hit** line maps each to a real PRISM bug-hunting surface.

---

## 1. The green test that asserts nothing (the R9 failure in practice)

The foundations entry frames this as the *oracle problem*. In practice it shows up as a test that runs, goes green, and proves nothing — and the only reliable detector is to deliberately break the code and watch the test stay green.

- **Make-it-fail is the test author's actual job.** The mindset flip is the gotcha: green-by-default is the wrong instinct. **CONFIRMED** ([MIT 6.031 sp22 Testing](https://web.mit.edu/6.031/www/sp22/classes/03-testing/)): *"Normally when you're coding, your goal is to make the program work. But as a test suite designer, you want to make it fail."* A good tester *"intentionally pokes at all the places the program might be vulnerable."* A test written to confirm success rather than provoke failure is the green-no-oracle smell by construction.
  - **Galaxy hit:** the R9 directive ("`toBeDefined()` stubs are hook-rejected") is this rule mechanized — a stub assertion accepts every implementation, so it can never make a correct program fail, which means it can never catch a broken one.

- **Coverage CANNOT tell you the test verified anything — mutation testing can.** This is the single most under-appreciated practitioner fact: a suite can execute every line and still detect zero injected faults. **CONFIRMED** ([Mutation testing, Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)): a mutant is killed *"upon test failure — failure indicating that the test successfully discerned that the behaviour of the mutant differs from the behaviour of the original code,"* and *"the value of a test suite is measured by the percentage of mutants that it kills"* (mutation score = killed / total). A test that runs the mutated line but does not assert on its effect leaves the mutant alive — high coverage, zero fault-detection.
  - **Galaxy hit:** a route-verify pass must confirm BOTH "line executed" AND "an oracle inspected the effect." The bug-hunting galaxy's "silent-no-op" class is exactly a surviving mutant — the code ran, nothing checked the output, so a no-op return passes the suite.

---

## 2. Flaky tests — the root causes are not random, they are five named bugs

A flaky test is not "bad luck"; it is a test that depends on something it does not control. The expert response is to find which of a small set of causes applies, not to re-run until green.

- **Lack of isolation / shared state between tests.** **CONFIRMED** ([Martin Fowler, *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html)): *"Keep your tests isolated from each other, so that execution of one test will not affect any others."* When tests share a fixture or global, test B's outcome silently depends on whether test A ran first — so the suite passes in one order and fails in another.
  - **Galaxy hit:** PRISM's own 2026-06-09 `FIRE2-RACE-FIX` (shared-file race in test #4...) and the precompact-auto-trigger stamp-leak flake are exactly this — a test touching a shared on-disk file that a sibling test also mutates. The avoidance is per-test temp dirs / fresh state, never a shared module-level singleton.

- **Bare `sleep()` for async is a latent flake.** **CONFIRMED** (same source): *"Never use bare sleeps to wait for asynchronous responses: use a callback or polling."* A fixed sleep is a bet on machine speed; under fleet load it loses.
  - **Galaxy hit:** any galaxy test that spawns a child process / hits the MCP bridge and `sleep`s before asserting will flake under the 26-slot fleet's CPU contention — poll for the condition, do not time-guess it.

- **Unwrapped wall-clock and leaked resources.** **CONFIRMED** (same source): *"Always wrap the system clock, so it can be easily substituted for testing,"* and *"If your application has some kind of resource leak, this will lead to random tests failing."* Real-time `Date.now()` and an un-closed handle are both order-and-timing-dependent.
  - **Galaxy hit:** the galaxy's heartbeat/staleness logic (`chat-slots.json lastHeartbeat`, claim sweep age windows) reads the real clock — a test that asserts on staleness without injecting time is inherently flaky. (Pairs with R14: a leaked `run_in_background` task is the resource leak Fowler names.)

- **The cost is non-linear: one ignored flake rots the whole suite.** This is WHY flakes must be fixed immediately, not deferred. **CONFIRMED** (same source): *"If you have a suite of 100 tests with 10 non-deterministic tests in them, ... once that discipline is lost, then a failure in the healthy deterministic tests will get ignored too. At that point you've lost the whole game."* And: *"Once you start ignoring a regression test failure, then that test is useless and you might as well throw it away."*
  - **Galaxy hit:** this is the engineering justification for `stop_on_failing_tests` being a HARD block — a tolerated flake trains the fleet to ignore red, which destroys the value of every real-bug catch the suite ever makes.

---

## 3. Coverage != correctness — the false-confidence trap

Foundations proves coverage is *necessary-not-sufficient* in theory. The practitioner gotcha is that a coverage number actively *manufactures false confidence* when assertions are weak — the number goes up while bug-detection stays flat.

- **Exhaustive testing is impossible, so coverage is always a proxy — never read it as proof.** **CONFIRMED** ([MIT 6.031 sp22 Testing](https://web.mit.edu/6.031/www/sp22/classes/03-testing/)): *"The space of possible test cases is generally too big to cover exhaustively. Imagine exhaustively testing a 32-bit floating-point multiply operation, a*b. There are 2^64 test cases!"* Coverage measures which of the tiny tested subset *ran*, not whether the untested 2^64 - N behave.
  - **Galaxy hit:** a galaxy audit that reports "branch coverage X%" has measured execution, not verification. Pair every coverage figure with a mutation-score or real-reference-value check (section 1) before calling a surface "tested."

- **A surviving mutant under high coverage is the proof the assertions are the problem, not the inputs.** **CONFIRMED** ([Mutation testing, Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)): mutation testing exists precisely because *"a mutant is not detected by the test suite"* can occur even when the mutated code is executed — the gap is weak assertions, not unexecuted lines.
  - **Galaxy hit:** when a bug ships from a "covered" file (e.g. the runout double-count that had passing tests), the lesson is not "add coverage" — it is "the existing assertions did not encode the intent." The algebraic-invariant test the galaxy now favors (ratio must cancel co-varying derates) is a mutation-killing oracle, not a coverage bump.

---

## 4. Mock drift — the unit test passes while the real integration is broken

The most dangerous green test is the one mocking the exact collaborator that changed. The mock encodes a *belief* about the dependency; when reality diverges, the test defends the belief, not the truth.

- **Mocked expectations can be wrong, yielding green tests that mask real errors.** **CONFIRMED** ([Martin Fowler, *Mocks Aren't Stubs*](https://martinfowler.com/articles/mocksArentStubs.html)): *"you also run the risk that expectations on mockist tests can be incorrect, resulting in unit tests that run green but mask inherent errors."* And mockist tests are *"more coupled to the implementation"* — *"changing the nature of calls to collaborators usually cause a mockist test to break,"* meaning a refactor of the real collaborator can leave the mock stale without any test going red.
  - **Galaxy hit:** PRISM's "round-trip THROUGH the dispatcher, not just the singleton" rule (R15 step 2) is the direct countermeasure — a test that mocks the dispatcher proves the singleton works against a *belief* about the dispatcher; only the real round-trip proves the wire.

- **The mitigation is a contract test that checks the double against the real service.** **CONFIRMED** ([Martin Fowler, *ContractTest*](https://martinfowler.com/bliki/ContractTest.html)): contract tests *"check that all the calls against your test doubles return the same results as a call to the external service would,"* answering *"whether the double is indeed an accurate representation of the external service, and what happens if the external service changes its contract."* A failing contract test *"implies you need to update your test doubles, and probably your code."*
  - **Galaxy hit:** the galaxy's recurring "schema-read blindness" regressions (NN-EVAL read from `checkpointMeta.auroc` while a consumer read top-level `auroc`; the GRADED-shape blindness; PSN-leg fabricated diagnoses) are mock-drift's cousin — two consumers held *divergent beliefs* about one producer's shape. The fix pattern (route every consumer through one canonical reader, e.g. `classifyGnn`) is a hand-built contract test: one source of truth the doubles cannot drift from.

---

## 5. Silent catch-and-continue + boundary off-by-one — the two bugs that hide best

These two recur because both *succeed loudly and fail silently*: an empty `catch` returns "fine," and an off-by-one returns a plausible-looking wrong number. Neither trips an implicit oracle.

- **Catch-and-continue destroys the diagnostic trail.** **CONFIRMED** ([Error hiding, Wikipedia](https://en.wikipedia.org/wiki/Error_hiding)): error hiding is *"the practice of catching an error or exception, and then continuing without logging, processing, or reporting the error to other parts of the software"* — *"Information about the error is lost, which makes it very hard to track down problems,"* and it *"can cause unintended side effects that cascade into other errors, destabilizing the system."* The canonical anti-pattern is the empty `catch { /* do nothing */ }`.
  - **Galaxy hit:** the 2026-06-08 tribal-index clobber is the textbook case — a fail-OPEN `catch -> return {entries:[]}` ("starting fresh") swallowed the V8 string-cap read error and let a 1-entry stub overwrite a 33,639-entry corpus. The fix doctrine: a `catch` on an EXISTING file must FAIL LOUD (R12), never substitute an empty default.

- **Returning a wrong answer silently is worse than failing — fail fast at the boundary.** **CONFIRMED** ([MIT 6.031 sp22 Code Review](https://web.mit.edu/6.031/www/sp22/classes/04-code-review/)): *"Failing fast means that code should reveal its bugs as early as possible,"* and the strength ordering is *"static checking fails faster than dynamic checking, and dynamic checking fails faster than producing a wrong answer that may corrupt subsequent computation."* The reading's own example: a function that, if you *"pass it the arguments in the wrong order, ... will quietly return the wrong answer"* — the cure is an explicit bounds throw, not a silent clamp.
  - **Galaxy hit:** this is the galaxy's "fail loud" preference order — push the guard as early (static) as possible. A silent clamp/fallback that hides a malformed input is the same class as the catch-swallow above.

- **Off-by-one lives at the subdomain boundary — test the endpoints on purpose.** **CONFIRMED** ([MIT 6.031 sp22 Testing](https://web.mit.edu/6.031/www/sp22/classes/03-testing/)): *"Bugs often occur at boundaries between subdomains"* — boundaries to include: *"0 ... the maximum and minimum values of numeric types; emptiness for collection types; the first and last element of a sequence."* The named mechanism: *"programmers often make off-by-one mistakes, like writing `<=` instead of `<`, or initializing a counter to 0 instead of 1,"* and a value past `Number.MAX_SAFE_INTEGER` *"suddenly starts to lose precision."*
  - **Galaxy hit:** the galaxy's "happy + >=3 failure + >=2 adversarial" contract is satisfied by these exact boundaries — empty corpus, single-element, max-int counter, first/last record. The V8 512-MiB string-cap regression was a boundary bug: the index crossed `0x1fffffe8` by 117 KB and every `JSON.parse(readFileSync(...,"utf8"))` threw — a max-value boundary nobody tested until it shipped.

---

## Owner-gate (NOT promoted)

papa created this applied-practice entry from WebFetch-confirmed free CS/software-engineering sources. The following are deliberately NOT asserted as doctrine and require golf's domain review before any bug-hunting engine/hook hardcodes them:

- **No numeric coverage gate** (e.g. "require >=80% branch coverage" or any mutation-score floor). Sections 1 and 3 confirm coverage and mutation score are *quality signals*, not pass/fail thresholds; the foundations entry already warns against a 100% target. Any percentage gate is an owner decision, not a sourced fact.
- **No re-run / quarantine count** for flaky-test detection (e.g. "re-run N times to confirm flakiness"). The Google flaky-tests blog post material was too imprecise (mostly comment-sourced) to cite at R12 standard and was DROPPED; only Martin Fowler's named root causes are asserted. Any "re-run K times" knob is owner-gated.
- **No benchmark numbers** for PRISM's own bug-catch rate, false-positive rate of the grep/AST static scans, or flake frequency across the fleet. These are measured-locally facts owned by golf, not establishable from external sources.
- **SAFETY_THRESHOLDS:** n/a — bug-hunting is a meta/quality galaxy; it carries no physics safety thresholds (feed/speed/voltage). The PRISM regression examples cited (tribal-index clobber, V8 string cap, runout double-count, schema-read blindness) are real shipped fixes referenced as illustrations, not new claims introduced here — verify each against its commit before relying on the detail.

## Sources

> Each URL below was WebFetched + confirmed during creation (2026-06-10). Distinct URLs only. URLs already cited in [[bug-hunting-foundations]] are NOT re-listed unless a fresh page (the sp22 04-code-review page is distinct from foundations' sp21 page).

- **MIT 6.031 Software Construction sp22 — "Testing"** (free college course; make-it-fail, exhaustive-infeasible, boundary/off-by-one) — https://web.mit.edu/6.031/www/sp22/classes/03-testing/
- **MIT 6.031 Software Construction sp22 — "Code Review"** (free college course; fail-fast ordering, quietly-wrong-answer, DRY) — https://web.mit.edu/6.031/www/sp22/classes/04-code-review/
- **Martin Fowler — "Eradicating Non-Determinism in Tests"** (reputable engineering reference; flaky-test root causes, suite-rot) — https://martinfowler.com/articles/nonDeterminism.html
- **Martin Fowler — "Mocks Aren't Stubs"** (reputable engineering reference; "run green but mask inherent errors", impl-coupling) — https://martinfowler.com/articles/mocksArentStubs.html
- **Martin Fowler — "ContractTest"** (reputable engineering reference; double-vs-real-service drift) — https://martinfowler.com/bliki/ContractTest.html
- **Error hiding** (CS reference; catch-and-continue definition + cascade consequence) — https://en.wikipedia.org/wiki/Error_hiding
- **Mutation testing** (CS reference; coverage-not-correctness, mutation score, surviving-mutant = weak assertion) — https://en.wikipedia.org/wiki/Mutation_testing

> Not promoted (dropped per R12): Google Testing Blog flaky-tests post (quotes too imprecise / comment-sourced); Google Testing Blog coverage post (HTTP 404); xunitpatterns.com "Erratic Test" (ECONNREFUSED x2). The flaky-test root-cause material is fully covered by Fowler's nonDeterminism.html instead.

## Cross-refs
- Theory half: [[bug-hunting-foundations]]
- Galaxy brain: `mcp-server/src/engines/bug-hunting/MEMORY.md`
- Doctrine: [[feedback_r5_thru_r12_doctrine]] (R9 tests-verify-intent, R12 fail-loud) · [[feedback_always_capture_lessons]]
