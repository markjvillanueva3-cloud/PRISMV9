---
title: Bug-Hunting Open Source Atlas — the keep-learning directory for software-testing + static-analysis + automated bug-finding
galaxy: bug-hunting
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: Every URL below was WebFetch-fetched live on 2026-06-10 and confirmed real, free/legal, and reachable; each carries a one-line quote or fact pulled from the fetched page. Two discovery probes that returned 404/403 were dropped, not guessed (listed at the bottom). This is a LIVING-SOURCE directory (where to keep learning), distinct from the theory in [[bug-hunting-foundations]] and the gotchas in [[bug-hunting-applied-practice]] — it does not re-derive their content.
tags: [bug-hunting, source-atlas, keep-learning, software-testing, static-analysis, mutation-testing, property-based-testing, fuzzing, automated-debugging, free-courses, free-textbooks, official-docs, standards, gov-data, MIT-OCW, NIST-SARD, MITRE-CWE, PIT, Stryker, Hypothesis, QuickCheck]
---

# Bug-Hunting Open Source Atlas

The **keep-learning directory** for the bug-hunting galaxy: a curated, kept-fresh list of WHERE to keep learning software-testing, static-analysis, and automated bug-finding from reputable FREE/LEGAL sources, so this galaxy's doctrine never goes stagnant. This is the third leg of the galaxy's knowledge spine and is deliberately ORTHOGONAL to its siblings:

- [[bug-hunting-foundations]] = the synthesized THEORY (oracle problem, coverage criteria, fail-fast ordering, rep invariants, static-analysis undecidability, NIST SAMATE/SPC).
- [[bug-hunting-applied-practice]] = the practitioner GOTCHAS (green-no-oracle, flaky-test root causes, mock drift, error hiding, off-by-one).
- **This atlas** = the DIRECTORY of living sources to keep working through. It lists *where* to learn, not *what* the theory says.

Read the two siblings first. Below, every source names the exact part of THIS galaxy it feeds (silent-no-op detection, route-verify, fail-loud enforcement, R12 fabrication catches, regression-replay corpora).

> R12 honesty note: every link was fetched live 2026-06-10 and confirmed reachable + free. A short verified list beats a long fabricated one. Nothing here is a guessed URL.

---

## 1. Free college courses (full curricula to work through)

- **MIT 6.005 Software Construction (Spring 2016) — MIT OpenCourseWare** — https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/
  - Teaches building code that is "safe from bugs, easy to understand, and ready for change" — full archive of readings, problem sets, exams + solutions, under Creative Commons BY-NC-SA. The OCW archive is the durable, link-stable home (the live `web.mit.edu/6.005` and `6.031` term pages rotate per semester and 404 over time).
  - **Feeds:** the galaxy's whole test-design + specification + ADT spine — the curriculum behind "tests verify intent" (R9) and the specified-oracle requirement. Work the testing + abstract-data-type units end to end, not just the one reading the sibling files quote.

- **MIT 6.031 Software Construction (current term) — make-it-fail testing + fail-fast code review** — https://web.mit.edu/6.031/www/sp22/classes/03-testing/
  - The successor to 6.005, kept current each term. The sp22 Testing reading states the tester's job is "you want to make it fail," and partitions the input space with boundary cases. Use as the *current* curriculum; if the term slug 404s, fall back to the OCW 6.005 archive above.
  - **Feeds:** partition/boundary test design behind the galaxy's "happy + >=3 failure + >=2 adversarial" contract; the make-it-fail mindset that exposes green-no-oracle stubs.

## 2. Free textbooks (read-in-browser, open licence)

- **The Fuzzing Book (Zeller, Gopinath, Bohme, Fraser, Holler)** — https://www.fuzzingbook.org/
  - "Software has bugs, and catching bugs can involve lots of effort. This book addresses this problem by automating software testing, specifically by generating tests automatically." Read chapters in-browser or as Jupyter notebooks; CC BY-NC-SA 4.0 text + MIT-licensed code. Covers random/mutation/grammar-based fuzzing, symbolic testing.
  - **Feeds:** automated test generation for the galaxy's adversarial-input work — generating inputs that make an implementation fail without hand-writing each boundary case; the principled version of "poke every vulnerable place."

- **The Debugging Book (Zeller et al.)** — https://www.debuggingbook.org/
  - "This book addresses this problem by automating software debugging, specifically by locating errors and their causes automatically." Free in-browser; covers fault localization, program slicing, delta/statistical debugging, input reduction, automated repair.
  - **Feeds:** the galaxy's reproduce -> simplify -> root-cause discipline — delta-debugging is the formal name for the "minimal reproduction that pins the cause" every regression entry performs.

- **Software Foundations (Pierce et al., UPenn) — verified functional programming + formal verification** — https://softwarefoundations.cis.upenn.edu/
  - "The Software Foundations series is a broad introduction to the mathematical underpinnings of reliable software." Seven free online volumes (logic, separation logic, security verification) built on a proof assistant.
  - **Feeds:** the formal-methods end of static analysis — when a grep/AST heuristic is not enough and a property must be *proven*, this is the curriculum for Hoare-logic / mechanized-proof reasoning the foundations entry only names.

## 3. Official tool docs (the four detectors this galaxy mirrors by hand)

- **PIT (PITest) — mutation testing for the JVM** — https://pitest.org/
  - "PIT runs your unit tests against automatically modified versions of your application code." A "mutant" survives when no test fails on the modified code — proof the assertions, not coverage, are weak. Content under Creative Commons.
  - **Feeds:** the galaxy's "silent-no-op = a surviving mutant" framing. PIT's mutation operators are the reference catalog of what a route-verify pass must kill; the galaxy's hand-rolled grep-for-stub scans are a lightweight static approximation of mutation analysis.

- **Stryker Mutator — mutation testing for JS/TS, C#, Scala** — https://stryker-mutator.io/docs/
  - "Mutation testing introduces changes to your code, then runs your unit tests against the changed code." Apache-2.0, docs open on GitHub. Directly relevant to PRISM's TypeScript/JS engines and `.mjs` hooks.
  - **Feeds:** a runnable mutation-score check for the galaxy's own JS/TS test suites — the empirical answer to "did these tests actually verify the engine, or just execute it?" (R9 in tooling form).

- **Hypothesis — property-based testing for Python** — https://hypothesis.readthedocs.io/en/latest/
  - "With Hypothesis, you write tests which should pass for all inputs in whatever range you describe, and let Hypothesis randomly choose which of those inputs to check." Free open docs on ReadTheDocs.
  - **Feeds:** the metamorphic/algebraic-invariant oracle the galaxy favors (e.g. "ratio must cancel co-varying derates") — property-based testing is exactly "assert a property over a generated range" instead of one hand-picked expected value; shrinking finds the minimal failing case for you.

- **QuickCheck — property-based testing for Haskell (the original)** — https://hackage.haskell.org/package/QuickCheck
  - "QuickCheck is a library for random testing of program properties." BSD-3-Clause. The progenitor of every property-based framework (including Hypothesis).
  - **Feeds:** the conceptual root of invariant-over-generated-inputs testing; read it for the canonical model of generators + properties + shrinking that the galaxy's adversarial-test contract approximates.

## 4. Official standards, data & archives (labeled-bug corpora + weakness taxonomies)

- **NIST SARD — Software Assurance Reference Dataset** — https://samate.nist.gov/SARD/
  - "A growing collection of test programs with documented weaknesses," >150 CWE classes across C/C++/Java/PHP/C#. Free US-government dataset operated by NIST SAMATE.
  - **Feeds:** the single highest-value asset for a regression-REPLAY harness — a ready-made labeled corpus of known-buggy programs to measure whether the galaxy's static scans / fail-loud guards actually catch a planted defect (the measured-effectiveness loop the foundations entry attributes to SAMATE).

- **MITRE CWE — Common Weakness Enumeration** — https://cwe.mitre.org/
  - "A community-developed list of SW & HW weaknesses that can become vulnerabilities," public under MITRE Terms of Use (sponsored by CISA). A stable taxonomy + IDs for weakness classes.
  - **Feeds:** a shared vocabulary for the galaxy's bug-class catalog — tag a found regression with its CWE id (e.g. error-hiding -> CWE-390/391 "detect error condition without action") so the fleet's findings are classifiable, not ad-hoc.

- **Google "Introduction to fuzzing" (google/fuzzing repo)** — https://github.com/google/fuzzing/blob/master/docs/intro-to-fuzzing.md
  - "The end goal of fuzzing is to find bugs." Public Google repo; covers sanitizers, choosing fuzz targets, libFuzzer/Honggfuzz/AFL.
  - **Feeds:** the practical "stand up a fuzzer" companion to The Fuzzing Book — sanitizers are the implicit-oracle layer (crash/UB detection) the galaxy's silent-failure work is the manual equivalent of.

## 5. Lecture-blog channels (kept-current practitioner sources)

- **Google Testing Blog** — https://testing.googleblog.com/
  - Google's official testing blog, public + free, archives back to 2007, still actively posting (e.g. "Choosing Values for Robust Tests," 2026). Topics: test design, TDD, test robustness, flaky-test management.
  - **Feeds:** the galaxy's flaky-test + test-robustness practice — a reputable, continuously-updated feed to skim on the keep-fresh cadence below; pair its claims with primary sources before promoting any to doctrine (its older flaky-test post was DROPPED from the applied-practice entry for imprecise quoting — read critically).

- **Hillel Wayne — contracts + property-based testing essays** — https://www.hillelwayne.com/post/contract-examples/
  - "By generating a random set of inputs, we cover more of the state space than we'd do manually." Free public blog; rigorous, example-driven essays on contracts, formal-ish testing, and property-based testing.
  - **Feeds:** worked examples bridging design-by-contract (foundations sec. 4) and property-based testing (sec. 3 above) — concrete patterns for turning a contract into a runnable property the galaxy can assert.

---

## Owner-gate (NOT promoted)

papa assembled this atlas from WebFetch-confirmed free/legal sources on 2026-06-10. The following are deliberately NOT asserted and require golf's domain review before any bug-hunting engine/hook depends on them:

- **No tool is endorsed as "the one to adopt."** PIT/Stryker/Hypothesis/QuickCheck are listed as living-learning sources; whether PRISM wires a mutation-testing or property-based gate into its TS/JS suite is an owner build decision, not implied here.
- **No numeric gate** (mutation score floor, coverage %, fuzz-time budget) is taken from these sources — the sibling entries already owner-gate those. This atlas points at the curriculum, not a threshold.
- **Blog posts are read-critically, not citable as doctrine.** Google Testing Blog + Hillel Wayne are kept-fresh practitioner feeds; promote a claim only after confirming it against a primary source (the applied-practice entry already dropped one Google post for imprecision).
- **SAFETY_THRESHOLDS:** n/a — bug-hunting is a meta/quality galaxy with no physics safety thresholds (feed/speed/voltage). Nothing here introduces one.

## Keep-fresh cadence

This directory rots if left alone. Suggested golf maintenance loop (advisory, not a wired cron):

- **Quarterly link-check:** WebFetch each URL in `## Sources`; if one 404s, retry once then either find the moved canonical (MIT term-slug pages rotate — fall back to the OCW 6.005 archive) or strike it with a dated note. Never silently leave a dead link.
- **Per-term:** refresh the MIT 6.031 term slug (sp22 -> current) when MIT publishes a new term; the OCW 6.005 archive is the stable fallback.
- **Monthly skim (cheap, Ollama-offloadable):** scan Google Testing Blog + Hillel Wayne for a post worth promoting; a promotion goes through a primary-source confirmation before it earns a line in [[bug-hunting-foundations]] or [[bug-hunting-applied-practice]] — this atlas only points at the feed.
- **On any new bug-class found in the fleet:** tag it with a MITRE CWE id and, if a clean reproducer exists, consider contributing/recording it against the SARD corpus shape for the galaxy's own regression-replay set.
- **Add-only discipline:** new sources are appended after a live WebFetch confirmation; a source that goes paywalled or dead is struck with a date, never deleted-and-forgotten (so the rot is visible).

## Sources

> Distinct URLs, each WebFetch-confirmed live + free on 2026-06-10.

- MIT 6.005 Software Construction Spring 2016 (MIT OpenCourseWare, CC BY-NC-SA) — https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/
- MIT 6.031 Software Construction sp22 "Testing" (free MIT course, current-term) — https://web.mit.edu/6.031/www/sp22/classes/03-testing/
- The Fuzzing Book (free online textbook, CC BY-NC-SA 4.0) — https://www.fuzzingbook.org/
- The Debugging Book (free online textbook) — https://www.debuggingbook.org/
- Software Foundations (Pierce et al., UPenn; free online volumes) — https://softwarefoundations.cis.upenn.edu/
- PIT / PITest mutation testing (official docs, Creative Commons) — https://pitest.org/
- Stryker Mutator mutation testing (official docs, Apache-2.0) — https://stryker-mutator.io/docs/
- Hypothesis property-based testing for Python (official docs) — https://hypothesis.readthedocs.io/en/latest/
- QuickCheck property-based testing for Haskell (official Hackage page, BSD-3) — https://hackage.haskell.org/package/QuickCheck
- NIST SARD Software Assurance Reference Dataset (free US-gov dataset) — https://samate.nist.gov/SARD/
- MITRE CWE Common Weakness Enumeration (free, MITRE/CISA) — https://cwe.mitre.org/
- Google "Introduction to fuzzing" (public google/fuzzing repo) — https://github.com/google/fuzzing/blob/master/docs/intro-to-fuzzing.md
- Google Testing Blog (free, official, actively updated) — https://testing.googleblog.com/
- Hillel Wayne contracts + property-based testing essay (free public blog) — https://www.hillelwayne.com/post/contract-examples/

> Dropped per R12 (fetched, not reachable/usable — NOT guessed, NOT listed above): increment.com property-based-testing article (HTTP 403 x1); a github.io Software-Foundations discovery probe (HTTP 404 — superseded by the confirmed official UPenn URL above).

## Cross-refs
- Theory half: [[bug-hunting-foundations]]
- Practice half: [[bug-hunting-applied-practice]]
- Galaxy brain: `mcp-server/src/engines/bug-hunting/MEMORY.md`
- Doctrine: [[feedback_r5_thru_r12_doctrine]] (R9 tests-verify-intent, R12 fail-loud) · [[feedback_always_capture_lessons]]
