---
title: Wiring Open Source Atlas — the keep-learning directory for dependency-injection, build-systems, and software-architecture
galaxy: wiring
owner_slot: romeo
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: every source below was opened with WebFetch on 2026-06-10 and confirmed real, free/legal, and reachable; one rate-limited candidate (GNU Make manual, HTTP 429 twice) was DROPPED rather than guessed. The per-source "feeds" mapping to this galaxy is editorial; the source existence/free-access claims are WebFetch-confirmed.
tags: [wiring, source-atlas, keep-learning, dependency-injection, build-systems, software-architecture, topological-sort, DAG, MIT-6031, MIT-OCW, bazel, dagger, fowler, build-systems-a-la-carte, aosa, swe-book, free-courses, open-source]
---

# Wiring Open Source Atlas

The **living-source curriculum** for the **wiring** galaxy (owner: romeo): a curated, kept-fresh directory of WHERE TO KEEP LEARNING this galaxy's domain from reputable FREE/LEGAL sources, so the knowledge never goes stagnant.

This is distinct from its two sibling pages — read those for the content, not here:
- [[wiring-foundations]] is the *synthesized theory* (DAGs, topological order, dependency injection, coupling/cohesion, Make, modular programming).
- [[wiring-applied-practice]] is the *practitioner gotchas* (circular-dependency init failures, orphan/partial wiring, DI over-abstraction, stale incremental builds, shared-mutable aliasing, version skew).

This page does NOT re-teach any of that. It is the **keep-learning directory**: the free college courses, free textbooks, lecture videos, official docs, standards, and the seminal paper that romeo (and any future wiring chat) should return to when the field moves or a gap appears. The galaxy's job — closing the engine -> dispatcher -> consumer dependency graph (R15), inferring missing edges, auditing for orphans and cycles — sits squarely on dependency-injection + build-systems + software-architecture literature; these are the sources that keep that knowledge current.

Every source was WebFetch-confirmed live + free on 2026-06-10. A short verified list beats a long fabricated one (R12).

## 1. Free college courses (full curricula)

- **MIT 6.031 Software Construction (Spring 2022 archive)** — https://web.mit.edu/6.031/www/sp22/
  Teaches: the canonical "safe from bugs, easy to understand, ready for change" framing, with 29 readings spanning specifications, abstract data types, mutability/immutability, interfaces/generics, and concurrency. The freshest free MIT version of the course this galaxy's theory page is built on.
  Feeds: the *designing-for-change* and *interface-vs-implementation* spine of [[wiring-foundations]] §6 — wire to the contract, not the representation. Return here when the DI/abstraction-barrier reasoning needs a primary refresh.

- **MIT OCW 6.005 Software Construction (Spring 2016)** — https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/
  Teaches: 6.031's OpenCourseWare predecessor (Miller & Goldman) — specifications, invariants, testing, ADTs, OO design patterns, concurrent + functional programming. Free under Creative Commons with downloadable materials.
  Feeds: the same designing-for-change / specification discipline as 6.031, but in a stable, citable OCW package — the better link when a wiring audit or skill needs a *permanent* course reference rather than a yearly-rotating term archive.

- **MIT OCW 6.006 Introduction to Algorithms (Spring 2020)** — https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
  Teaches: the algorithms substrate — graph representations, DFS/BFS, DAGs and topological sort — with FREE lecture videos, under Creative Commons.
  Feeds: the *DAG + topological-order* core of [[wiring-foundations]] §1-2 (the build-order and cycle-detection algorithms the wiring audit relies on). The video lectures are the keep-learning home for the graph-algorithm half of this galaxy.

## 2. Free textbooks (read online)

- **Software Engineering at Google (the SWE Book)** — https://abseil.io/resources/swe-book
  Teaches: large-scale, long-lived codebase practices (Winters, Manshreck, Wright). Provided as a free HTML digital edition by Google. Covers dependency management, build systems, and keeping a huge dependency graph sustainable at scale.
  Feeds: the "apply-to-all-galaxies / clone-don't-fork" and version-skew discipline of [[wiring-applied-practice]] §6 — this is the production-scale evidence for why a single canonical contract beats N drifting copies across a giant wiring graph.

- **The Architecture of Open Source Applications (AOSA)** — https://aosabook.org/en/index.html
  Teaches: how real systems (Git, nginx, LLVM, CMake, SQLAlchemy, ZeroMQ, and more) are actually structured — "what are each program's major components and how do they interact." Published under Creative Commons Attribution; chapters readable free online.
  Feeds: software-architecture intuition for the wiring galaxy — the CMake/LLVM/Git chapters are concrete worked examples of dependency-graph + build-orchestration design beyond the abstract DAG theory in foundations.

## 3. Seminal paper (dependency injection + build systems)

- **Inversion of Control Containers and the Dependency Injection pattern (Martin Fowler, 2004)** — https://martinfowler.com/articles/injection.html
  Teaches: the canonical naming of dependency injection vs service locator, the assembler/container role, the three injection forms, and the key conclusion that "separating service configuration from the use of services" matters more than which mechanism you pick. Freely readable.
  Feeds: the DI / inversion-of-control treatment in [[wiring-foundations]] §3 and the DI-over-abstraction gotchas in [[wiring-applied-practice]] §3 — the original source for *why* a dispatcher should receive an engine rather than construct it.

- **Build Systems a la Carte (Mokhov, Mitchell, Peyton Jones — ICFP 2018)** — https://www.microsoft.com/en-us/research/publication/build-systems-la-carte/
  Teaches: a systematic, executable framework that deconstructs build systems into shared components (rebuild strategy x scheduling), letting you compare Make, Shake, Bazel, Excel, etc. as points in one design space. Free PDF + GitHub + Hackage links on the page.
  Feeds: the build-orchestration theory of [[wiring-foundations]] §5 and the stale/out-of-order incremental-build gotchas of [[wiring-applied-practice]] §4 — the rigorous model for "rebuild only what is stale, in dependency order," which is exactly PRISM's incremental wiring/test re-run discipline.

## 4. Official docs & standards (build graphs + DI frameworks)

- **Bazel — Dependency Management (official docs)** — https://bazel.build/basics/dependencies
  Teaches: managing dependencies as "perhaps the most fundamental job of a build system" — internal vs external deps, fine-grained targets, strict transitive dependency mode, and the One-Version Rule. Free, Creative Commons Attribution 4.0.
  Feeds: a real-world build-graph contract for [[wiring-foundations]] §1/§5 — strict-deps and one-version are production analogues of PRISM's "declare the edge set completely and minimally" and "one canonical contract" rules.

- **Bazel — Build concepts (workspaces, packages, targets)** — https://bazel.build/concepts/build-ref
  Teaches: the repository / workspace / package / target / rule vocabulary — "rules specify the relationship between a set of input and a set of output files." Free, CC-BY-4.0.
  Feeds: the vocabulary for thinking about PRISM's asset graph as targets+rules; useful when reasoning about what a "wired edge" is at the build-tool level.

- **Dagger — compile-time Dependency Injection framework (official site/docs)** — https://dagger.dev/
  Teaches: a fully static, compile-time DI framework (Google/Square) that resolves the dependency graph at compile time to avoid the runtime-reflection pitfalls of older DI containers. Freely accessible docs + API + GitHub.
  Feeds: the [[wiring-applied-practice]] §3.2 lesson directly — "prefer statically traceable wiring over reflection/magic containers so the type graph still surfaces the blast radius." Dagger is the canonical free reference for compile-time, statically-discoverable DI.

## Keep-fresh cadence

- **Quarterly (or when the field moves):** re-WebFetch each URL in §Sources; if any returns a redirect/404/persistent 429, retry once then mark it DROPPED here rather than guessing a replacement (R12). The MIT 6.031 link is a *term* archive (sp22) — when MIT publishes a newer free term, add it and keep sp22 as the stable citation.
- **When a wiring gotcha or audit gap appears:** start at §1 (courses) for the theory refresh, then §3/§4 for the mechanism — do not re-derive from scratch; this directory is the entry point.
- **Owner-gate (romeo):** these are *external curriculum* sources only. None of them describe PRISM's live wiring tooling (`stop_on_unwired_assets`, `stop-auto-wire.mjs`, the NN-GRAPH tier-5 cascade, or any `prism_dev` wiring action) — read those assets directly before citing their behavior. Do not promote any external pattern into a PRISM engine/skill/audit without verifying it against the actual code first.
- **Dropped this pass:** GNU Make manual (https://www.gnu.org/software/make/manual/make.html) returned HTTP 429 twice and could not be confirmed reachable in this session — intentionally excluded. Re-try next cadence; the Make *concepts* are already covered free via the Wikipedia Make citation in the sibling pages and via Build Systems a la Carte (§3).

## Sources

Distinct free/legal sources WebFetch-confirmed live for this entry (2026-06-10):

1. MIT 6.031 Software Construction (Spring 2022 archive): https://web.mit.edu/6.031/www/sp22/
2. MIT OCW 6.005 Software Construction (Spring 2016, CC): https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/
3. MIT OCW 6.006 Introduction to Algorithms (Spring 2020, free videos, CC): https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
4. Software Engineering at Google — the SWE Book (free HTML): https://abseil.io/resources/swe-book
5. The Architecture of Open Source Applications (CC-BY): https://aosabook.org/en/index.html
6. Martin Fowler — Inversion of Control Containers and the Dependency Injection pattern: https://martinfowler.com/articles/injection.html
7. Build Systems a la Carte (ICFP 2018, free PDF): https://www.microsoft.com/en-us/research/publication/build-systems-la-carte/
8. Bazel — Dependency Management (official docs, CC-BY-4.0): https://bazel.build/basics/dependencies
9. Bazel — Build concepts: workspaces/packages/targets (official docs, CC-BY-4.0): https://bazel.build/concepts/build-ref
10. Dagger — compile-time Dependency Injection framework (official docs): https://dagger.dev/
