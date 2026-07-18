---
title: Bug-Hunting Foundations — test oracles, coverage criteria, fault localization, static analysis, assertion design
galaxy: bug-hunting
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/software-engineering foundations WebFetch-confirmed against primary free sources (MIT 6.031 Software Construction sp22 Testing + Code Review readings, MIT 6.005 sp/fa15 Abstraction Functions & Rep Invariants reading, NIST/SEMATECH e-Handbook of Statistical Methods, NIST SAMATE software-assurance program page) and established CS reference articles (static program analysis, code coverage, test oracle, debugging, design by contract, assertions). Course/textbook/gov facts are CONFIRMED; established-literature definitions are asserted with citation.
tags: [bug-hunting, software-testing, test-oracle, coverage-criteria, fault-localization, static-analysis, formal-methods, assertions, design-by-contract, fail-fast, rep-invariant, silent-failure, SPC, gov-data, MIT-6031, NIST]
---

# Bug-Hunting Foundations

The domain-knowledge spine for the **bug-hunting** galaxy: how PRISM should detect silent failures, design tests that actually fail when intent is violated, localize a fault to its cause, and reason about coverage vs confidence. This galaxy's recurring work (silent-no-op detection, route-verify, fail-loud enforcement, R12 fabrication catches) is grounded below in free CS/software-engineering theory. **Course/gov/textbook facts are WebFetch-CONFIRMED**; established peer-reviewed/standard definitions are asserted with citation. Each section names the engineering relevance to THIS galaxy.

## 1. Test oracles — the heart of "did it actually work?"

The bug-hunting galaxy's deepest doctrine (R9 "tests verify intent, not behavior"; R12 "fail loud") is the **test-oracle problem** in disguise.

- **CONFIRMED** ([Test oracle, Wikipedia](https://en.wikipedia.org/wiki/Test_oracle)): a test oracle is **"a provider of information that describes correct output based on the input of a test case."** Testing compares actual results against the oracle's expected results.
- The **oracle problem** — determining correct output for given inputs — is **"a relatively hard problem"** and is the reason a test can run green while proving nothing.
- Four oracle categories: **specified** (formal spec / design-by-contract), **derived** (regression suites, "information derived from artifacts of the system"), **implicit** (crash/exception detection — "susceptible to false positives due to environment dependencies"), and **human**.
- **Metamorphic testing** exploits **"metamorphic relations"** across multiple executions — a partial oracle that checks a *property* (e.g. `f(2x) == 2*f(x)`) instead of an explicit expected value, addressing the oracle problem where no exact expected output exists.

**Relevance to bug-hunting:** a `toBeDefined()` stub or an assertion that re-derives the value it checks is a *missing* oracle — it accepts every implementation. The galaxy's "real reference-value / algebraic-invariant" requirement is exactly the specified+metamorphic oracle pair; the "silent no-op" class is an implicit-oracle gap (nothing crashes, nothing checks).

## 2. Coverage criteria — necessary, never sufficient

- **CONFIRMED** ([Code coverage, Wikipedia](https://en.wikipedia.org/wiki/Code_coverage)): code coverage is **"a percentage measure of the degree to which the source code of a program is executed when a particular test suite is run."**
- The criteria, weakest to strongest: **function coverage** ("has each function...been called?"), **statement coverage** ("has each statement...been executed?"), **branch/decision coverage** ("has each branch of each control structure been executed?"), **condition coverage** ("has each Boolean sub-expression evaluated both to true and false?"), and **path coverage** ("every possible route through a given part of the code").
- **CONFIRMED** ([MIT 6.031 sp22 Testing](https://web.mit.edu/6.031/www/sp22/classes/03-testing/)): the same three-level hierarchy — statement -> branch ("both the true and the false direction taken by some test case") -> path ("every possible combination of branches").
- **The load-bearing caveat:** high coverage only **"suggests it has a lower chance of containing undetected software bugs"** — it never guarantees their absence. Martin Fowler (quoted): *"I would be suspicious of anything like 100% - it would smell of someone writing tests to make the coverage numbers happy, but not thinking about what they are doing."*

**Relevance to bug-hunting:** coverage tells the galaxy which lines *ran*, not which lines were *checked*. A route-verify pass must confirm the line executed AND an oracle inspected its effect — branch coverage with no oracle is the canonical false-confidence trap.

## 3. Partition testing, boundaries, and choosing inputs that fail

- **CONFIRMED** ([MIT 6.031 sp22 Testing](https://web.mit.edu/6.031/www/sp22/classes/03-testing/)): **partition the input space** into disjoint subdomains covering all inputs, then **"choose one test case from each subdomain."**
- **"Bugs often occur at boundaries between subdomains"** — so include zero, numeric max/min, empty collections, and sequence endpoints (this is **boundary value analysis**, and the source of off-by-one and discontinuity bugs).
- **Black-box** testing chooses cases **"only from the specification, not the implementation"**; **glass-box** testing chooses them **"with knowledge of how the function is actually implemented."**
- A good test suite is **correct** (accepts all legal implementations), **thorough** (finds actual bugs), and **small** (fast). The required attitude: **"you want to make it fail," not merely verify success.**

**Relevance to bug-hunting:** the galaxy's "happy + >=3 failure modes + >=2 adversarial" test contract is partition testing made concrete — the failure/adversarial cases ARE the boundary subdomains, chosen with the explicit goal of making the implementation fail.

## 4. Fail-fast + assertion design — catch the bug near its cause

- **CONFIRMED** ([MIT 6.031 sp21 Code Review](https://web.mit.edu/6.031/www/sp21/classes/04-code-review/)): **"Failing fast means that code should reveal its bugs as early as possible. The earlier a problem is observed (the closer to its cause), the easier it is to find and fix."** Ordering of strength: static checking **"fails faster than dynamic checking, and dynamic checking fails faster than producing a wrong answer."**
- **CONFIRMED** ([Assertion (software development), Wikipedia](https://en.wikipedia.org/wiki/Assertion_(software_development))): an assertion is a predicate **"that always should evaluate to true at that point in code execution."** Crucially: assertions **"document logically impossible situations and discover programming errors"** — this is **"distinct from error handling: most error conditions are possible."** A failed assertion is a *bug*, not a user/runtime error.
- Guidance: assertions **"may cause side effects"** and so must avoid them; in production they are **"typically turned off to avoid any overhead"** — which is why an assertion must never guard a condition the program's correctness depends on at runtime.
- **CONFIRMED** ([Design by Contract, Wikipedia](https://en.wikipedia.org/wiki/Design_by_contract)): contracts split into **precondition** (an obligation for the client, a benefit for the supplier), **postcondition** (an obligation for the supplier), and **class invariant**. Contracts make the responsibility for a failure explicit — they "simplify the debugging of contract behavior" by stating which party violated expectations.

**Relevance to bug-hunting:** "fail loud" (R12) IS fail-fast. The static < dynamic < wrong-answer ordering is the galaxy's preference order for where a guard should live. A `catch -> return empty` on an existing corpus (the 2026-06-08 tribal-index clobber) is the exact anti-pattern — it converts a logically-impossible state into a silent wrong answer instead of a loud precondition failure.

## 5. Rep invariants + checkRep — detecting silent state corruption

- **CONFIRMED** ([MIT 6.005 Abstraction Functions & Rep Invariants](https://web.mit.edu/6.005/www/fa15/classes/13-abstraction-functions-rep-invariants/)): a **rep invariant** maps representation values to booleans — **"RI tells us whether a given rep value is well-formed."** The **abstraction function** maps the concrete rep to the abstract value it represents.
- **checkRep()** asserts the rep invariant at run time: **"If your implementation asserts the rep invariant at run time, then you can catch bugs early."** Call it in creators, producers, and mutators — and, defensively, observers, because doing so means **"you'll be more likely to catch rep invariant violations caused by rep exposure."**
- This is the direct defense against **silent corruption**: checking invariants at runtime prevents a bug **"from silently propagating through a corrupt data structure."**

**Relevance to bug-hunting:** the galaxy's state stores (chat-slots.json, slot-task-claims, the system graph, the tribal index) each carry an implicit rep invariant. A `writeIndex` clobber-guard that refuses a >50% shrink over a populated corpus (2026-06-08 fix) is a hand-written checkRep — exactly the "catch the violation before it propagates" pattern this theory prescribes.

## 6. Static analysis + formal methods — finding bugs without running

- **CONFIRMED** ([Static program analysis, Wikipedia](https://en.wikipedia.org/wiki/Static_program_analysis)): static analysis is **"the analysis of computer programs performed without executing them, in contrast with dynamic program analysis, which is performed on programs during their execution."**
- It spans from **"highlighting possible coding errors"** to **"formal methods that mathematically prove properties about a given program"** (named techniques: abstract interpretation, data-flow analysis, Hoare logic, model checking, symbolic execution).
- **Hard limit:** finding all possible run-time errors in an arbitrary program **"is undecidable: there is no mechanical method that can always answer truthfully whether an arbitrary program may or may not exhibit runtime errors."** Abstract interpretation trades completeness for soundness — **"every property true of the abstract system can be mapped to a true property of the original system"** — which is why sound static tools emit false positives, never false negatives, for the property they check.

**Relevance to bug-hunting:** the galaxy's grep/AST scans for stub returns, silent `catch` blocks, and unwired routes ARE lightweight static analysis. The undecidability result is why these are heuristic (high-recall, lossy), and why a static catch must hand off to a dynamic oracle (sections 1-3) for confirmation — neither alone is complete.

## 7. Fault localization + debugging discipline — from symptom to cause

- **CONFIRMED** ([Debugging, Wikipedia](https://en.wikipedia.org/wiki/Debugging)): debugging is **"the process of finding the root cause, workarounds, and possible fixes for bugs."** The systematic sequence: **reproduction** ("identifying the steps to reproduce the problem"), **simplification** (reduce the input "to make it easier to debug"), then **root-cause analysis** ("track down the origin of the problem").
- Reproduction itself **"can be a non-trivial task, particularly with parallel processes"** — the dominant difficulty is often *finding* the cause, not writing the fix.

**Relevance to bug-hunting:** every galaxy regression entry follows reproduce -> simplify -> root-cause (e.g. the runout double-count was proven by an algebraic ratio `0.884 single vs 0.795 ~ 0.884^2`, a simplified reproduction that isolated the co-varying-derate cause). The discipline maps 1:1: a regression is not "found" until a minimal reproduction pins the cause, not just the symptom.

## 8. Government software-assurance + measurement spine

- **CONFIRMED** ([NIST SAMATE](https://www.nist.gov/itl/ssd/software-quality-group/samate)): NIST's Software Assurance Metrics And Tool Evaluation program works by **"defining bug classes, collecting a corpus of programs with known bugs, and enabling better understanding of tool effectiveness."** Software assurance is **"a set of methods and processes to prevent, mitigate or remove weaknesses and vulnerabilities and ensure that software functions as intended."** Its SATE (Static Analysis Tool Exposition) is **"a recurring study designed to advance research in static analysis tools that find security-relevant weaknesses in source code."**
- **CONFIRMED** ([NIST/SEMATECH e-Handbook — control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)): a control chart distinguishes chance-cause from **assignable-cause** variation — **"If a point falls outside these limits, the variation was caused be an assignable cause."** US practice bases control limits on **a multiple of the standard deviation, "Usually this multiple is 3"** (+/- 3 sigma). A point outside the limits means **"the process is probably out of control and that an investigation is warranted."**

**Relevance to bug-hunting:** SAMATE's "corpus of programs with known bugs + tool-effectiveness measurement" is the exact shape of a bug-hunter regression-replay harness (a labeled bug corpus to measure whether a guard catches it). The SPC common-vs-assignable-cause frame applies to fleet metrics: a single out-of-3-sigma spike in a health signal (e.g. a regen-viz size jump) is an assignable cause warranting investigation — the statistical basis for "cry-wolf vs real" alarm gating the galaxy already wrestles with.

## Owner-gate (NOT promoted)

papa created this foundations entry from WebFetch-confirmed free CS/gov sources. The following were deliberately LEFT OUT or NOT hardened and require golf's domain review before any bug-hunting engine/hook hardcodes them:

- **Specific suspiciousness-formula thresholds** (Tarantula / Ochiai / DStar spectrum-based-fault-localization coefficients): the dedicated SBFL Wikipedia URLs 404'd on two attempts, so NO numeric SBFL formula or ranking constant is asserted here. If a future fault-localization scorer is built, golf must confirm the formula against a primary SBFL paper first.
- **NIST SP-800 / glossary exact definition text** for "static analysis": the `csrc.nist.gov/glossary` term slugs 404'd twice; only the SAMATE program-page prose is confirmed, not a citable SP-number glossary definition. Do not cite an SP-800 number for static analysis from this entry.
- **Coverage-percentage gates** (e.g. "require >=80% branch coverage"): section 2 confirms coverage is necessary-not-sufficient and explicitly warns against a 100% target — so NO numeric coverage gate is promoted as doctrine. Any such threshold is an owner decision, not a sourced fact.
- **SAFETY_THRESHOLDS:** n/a — bug-hunting is a meta/quality galaxy; it carries no physics safety thresholds (feed/speed/voltage). The only "thresholds" touched are the +/-3-sigma SPC convention (confirmed, generic) and the >50%-shrink clobber-guard (an existing PRISM engineering choice, cited as an example, not introduced here).

## Sources

> Each URL below was WebFetched + confirmed during creation (2026-06-10). Distinct URLs only.

- **MIT 6.031 Software Construction sp22 — "Testing"** (free college course) — https://web.mit.edu/6.031/www/sp22/classes/03-testing/
- **MIT 6.031 Software Construction sp21 — "Code Review" (fail-fast, DRY, magic numbers)** (free college course) — https://web.mit.edu/6.031/www/sp21/classes/04-code-review/
- **MIT 6.005 Software Construction fa15 — "Abstraction Functions & Rep Invariants" (checkRep)** (free college course) — https://web.mit.edu/6.005/www/fa15/classes/13-abstraction-functions-rep-invariants/
- **NIST/SEMATECH e-Handbook of Statistical Methods — control charts** (gov data report) — https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm
- **NIST SAMATE — Software Assurance Metrics And Tool Evaluation (SATE)** (gov software-assurance program) — https://www.nist.gov/itl/ssd/software-quality-group/samate
- **Test oracle** (CS reference; oracle problem, oracle types, metamorphic testing) — https://en.wikipedia.org/wiki/Test_oracle
- **Code coverage** (CS reference; coverage criteria + necessary-not-sufficient caveat) — https://en.wikipedia.org/wiki/Code_coverage
- **Static program analysis** (CS reference; static vs dynamic, soundness, undecidability) — https://en.wikipedia.org/wiki/Static_program_analysis
- **Debugging** (CS reference; reproduce -> simplify -> root-cause) — https://en.wikipedia.org/wiki/Debugging
- **Design by contract** (CS reference; pre/post/invariant, explicit responsibility) — https://en.wikipedia.org/wiki/Design_by_contract
- **Assertion (software development)** (CS reference; assertion = bug-not-error, side-effect-free, prod-disabled) — https://en.wikipedia.org/wiki/Assertion_(software_development)

> Not promoted (fetch failed twice — left out per R12): MIT 6.031 sp22 "Avoiding Debugging" reading (404), MIT 6.005 sp16 "Equality" page (redirect loop), Spectrum-based fault localization Wikipedia (404), NIST CSRC glossary `static_analysis` + `static_source_code_analysis` term slugs (404 x2).

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/bug-hunting/MEMORY.md`
- Doctrine: [[feedback_r5_thru_r12_doctrine]] (R9 tests-verify-intent, R12 fail-loud) · [[feedback_always_capture_lessons]]
