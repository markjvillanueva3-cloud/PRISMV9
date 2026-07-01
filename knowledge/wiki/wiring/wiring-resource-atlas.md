---
title: Wiring Resource Atlas — the where-to-REACH index for canonical build-system / dependency-DAG / DI repos, papers, and standards
galaxy: wiring
owner_slot: romeo
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "LOCAL pointers are verified PRISM paths (ls-confirmed on H:/prism 2026-06-10: the wiring engine dir, scripts/audit-unwired-engines.mjs, and the mcp-server/src/tools/dispatchers/ dispatcher registry — 108 dispatchers). Every ONLINE entry was opened with WebFetch on 2026-06-10 and confirmed to be the authoritative free/legal source it claims to be; one rate-limited candidate (GNU Make manual on gnu.org, HTTP 429 across three URLs) was DROPPED rather than guessed. The per-resource 'why romeo reaches here' mapping is editorial; the existence + free-access claims are WebFetch-confirmed."
tags: [wiring, resource-atlas, where-to-reach, canonical-repo, build-systems, dependency-injection, dependency-DAG, incremental-rebuild, topological-sort, bazel, dagger, cmake, make, posix, build-systems-a-la-carte, romeo, free-resources]
---

# Wiring Resource Atlas

The **where-to-REACH index** for the **wiring** galaxy (owner: romeo — build systems / dependency DAG / incremental rebuild). One hub that jumps STRAIGHT to the authoritative source: the galaxy's own local code + stores, plus the canonical free/legal repo, seminal paper, and official standard for each external concept this galaxy depends on.

This page is DISTINCT from its siblings — do not confuse the two indexes:
- [[wiring-source-atlas]] is the where-to-**LEARN** curriculum (free college courses, textbooks, lecture videos — *where to keep studying*).
- **This page** is the where-to-**REACH** index — the canonical tool repo / seminal paper / official standard + the local PRISM code you act on. Reach here to pull the authoritative artifact, not to take a course.

A short verified list beats a long fabricated one (R12). Every online entry below was WebFetch-opened on 2026-06-10; anything that 404'd / redirected away / could not be confirmed was DROPPED (see §Keep-fresh cadence).

## 1. Local code + stores (PRISM — the galaxy's own trove)

These are verified PRISM paths on `H:/prism` — reach here FIRST; the external sources are only for refreshing the underlying concepts.

- **Wiring galaxy engine directory** — `mcp-server/src/engines/wiring/`
  The galaxy's home. Carries its own `CLAUDE.md` (galactic-center sentinel, Bibryam Context Cascade), `MEMORY.md`, `PATHS.md`, and `TOOLBELT.md`. Start every wiring task by reading these four — they are the romeo-owned source of truth for engine→dispatcher→consumer closure, orphan/cycle auditing, and edge inference.

- **Unwired-engine audit script** — `scripts/audit-unwired-engines.mjs`
  The deep scanner that classifies every canonical engine as `WIRED-DIRECT` (imported by a dispatcher), `WIRED-VIA-ROUTE` (consumed by `routes/*.ts`), `WIRED-VIA-ENGINE` (consumed only by other engines), or genuinely dormant/unwired. This is the live tool behind BUILD_STATE `NEEDS_WIRING`, the fleet "N unwired engines" count, and the /system-viz ghost-orphan roosts. Run it before claiming any engine is an orphan (the consumer-classification logic is subtle — see [[wiring-applied-practice]]).

- **Dispatcher registry (the wired-edge target set)** — `mcp-server/src/tools/dispatchers/`
  The 108-dispatcher directory the audit scans against — the set of legitimate "consumers" that satisfy the R15 WIRE step. An engine is wired only when a dispatcher (or route/registry/orchestrator/singleton) here imports it. Reach here to confirm which dispatcher should naturally consume a new engine (`prism_calc`, `prism_cam`, `prism_dev`, …) and to verify a wired edge actually exists rather than assuming it.

## 2. Canonical repos, papers & standards (verified — where-to-REACH)

Each entry is the authoritative free/legal artifact for one concept this galaxy is built on. Reach the repo/paper/standard directly; do not re-derive from memory.

### Build-system tooling (canonical repos)

- **Bazel — official repository** — https://github.com/bazelbuild/bazel
  The canonical multi-language, scalable build system ("a fast, scalable, multi-language and extensible build system"; philosophy "{Fast, Correct} — choose two"). The reference implementation of fine-grained dependency targets, strict transitive deps, and the One-Version Rule — the production analogue of PRISM's "declare the edge set completely and minimally, one canonical contract." Reach here for the actual implementation when the wiring-graph reasoning needs a real-tool anchor.

- **CMake — official repository (Kitware)** — https://github.com/Kitware/CMake
  The canonical cross-platform build-system *generator* ("CMake is a cross-platform, open-source build system generator", Kitware). The reference for how a dependency graph is described declaratively and then lowered to a concrete build order — directly relevant to PRISM's incremental-rebuild / re-run-only-the-stale discipline. (GitHub mirror of the GitLab upstream.)

### Dependency injection (canonical repo)

- **Dagger — official repository (Google)** — https://github.com/google/dagger
  The canonical compile-time / fully-static dependency injector ("A fast dependency injector for Java and Android", actively maintained by Google, building on Square's work; Apache-2.0). The reference for *statically traceable* wiring — the dependency graph is resolved at compile time, so the type graph still surfaces the blast radius (no runtime-reflection magic). This is the concrete embodiment of the [[wiring-applied-practice]] rule "prefer statically discoverable wiring over reflection containers."

### Seminal paper (build-system design space)

- **Build Systems a la Carte (Mokhov, Mitchell, Peyton Jones — ICFP 2018)** — https://www.microsoft.com/en-us/research/publication/build-systems-la-carte/
  The seminal paper that deconstructs build systems into composable components (rebuild strategy × scheduling), letting Make, Shake, Bazel, Excel, etc. be compared as points in one design space. Free PDF on the page (with GitHub + Hackage links; expanded JFP 2020 journal version exists). The rigorous model for "rebuild only what is stale, in dependency order" — PRISM's incremental wiring/test-re-run discipline. Reach here when reasoning about *why* an incremental rebuild strategy is correct, not just *that* it runs.

### Official standard (dependency-rule semantics)

- **POSIX `make` — The Open Group Base Specifications (IEEE Std 1003.1-2017)** — https://pubs.opengroup.org/onlinepubs/9699919799/utilities/make.html
  The authoritative *standard* (not a tutorial) for `make`'s dependency model: targets, prerequisites, inference vs target rules, and the time-relationship rule — "ensure that all of the prerequisites of a target are up-to-date, then check to see if the target itself is up-to-date." The canonical specification of prerequisite-driven, dependency-ordered rebuild — the formal ancestor of every modern build DAG. Reach here for the precise semantics behind "what does up-to-date mean," and as the citable standard rather than any single tool's docs.

## 3. Curated video

None added this pass. No build-system / dependency-DAG video could be WebFetch-confirmed as canonical *and* uniquely additive over the §2 repos/paper/standard for a where-to-REACH index; the lecture-video home for this galaxy's theory already lives in [[wiring-source-atlas]] §1 (MIT OCW 6.006 free graph-algorithm lectures). Add one here only when it is verified and adds something the canonical repo/paper/standard does not.

## 4. Cross-links

- [[wiring-foundations]] — synthesized theory (DAGs, topological order, dependency injection, incremental rebuild, coupling/cohesion). Read for the *concepts* the §2 artifacts implement.
- [[wiring-source-atlas]] — the where-to-LEARN curriculum (free courses/textbooks/videos). Read to *keep learning*; this page to *reach the artifact*.
- [[wiring-applied-practice]] — practitioner gotchas (circular-dependency init failures, orphan/partial wiring, DI over-abstraction, stale incremental builds, version skew). Read before trusting an audit result.
- [[wiring-advanced-techniques]] — the deeper/edge techniques layer for this galaxy.
- [[prism-methodology-foundations]] — the fleet-wide methodology spine (R12 fail-loud, R15 wire→test→validate→all-galaxies) that governs how this galaxy closes the wiring graph.

## 5. Keep-fresh cadence

- **Quarterly (or when the field/tooling moves):** re-WebFetch each URL in §Sources. If any returns a redirect / 404 / persistent 429, retry once then mark it DROPPED here rather than guessing a replacement (R12).
- **When the local trove changes:** if `audit-unwired-engines.mjs` moves, or the dispatcher directory is restructured, update §1 the same session — a stale local pointer is the most expensive kind of rot for this galaxy.
- **Adding an online entry:** WebFetch it first, confirm it is the authoritative + free/legal source, then add it with a one-line "why romeo reaches here." Never list an unverified or hallucinated URL.
- **Dropped this pass:** **GNU Make manual** (`https://www.gnu.org/software/make/manual/make.html`, `/manual/`, and `/manual/html_node/index.html`) returned HTTP 429 (Too Many Requests) on all three URLs and could not be confirmed reachable this session — intentionally excluded. Re-try next cadence; the `make` *dependency-rule semantics* are already covered authoritatively by the POSIX/Open Group standard in §2 (which is the stronger "standard" citation anyway).

## Owner-gate (NOT promoted)

No numeric thresholds, constants, or tuning values are promoted into this atlas. None of the external repos/papers/standards above describe PRISM's live wiring behavior, and none carries a number that should be copied into PRISM. Any concrete value (wiring-coverage thresholds, audit gate cutoffs, staleness windows, the unwired/dormant counts) stays owner-gated to **romeo** and to `mcp-server/src/physics/constants.ts` for physics — read the actual PRISM code (`scripts/audit-unwired-engines.mjs`, the wiring engine dir, the dispatcher registry) before citing any behavior or number. Do not promote any external build-system or DI pattern into a PRISM engine/skill/audit without verifying it against the real code first (R8).

## Sources

LOCAL (verified PRISM paths, ls-confirmed on H:/prism 2026-06-10):
1. Wiring galaxy engine directory: `mcp-server/src/engines/wiring/`
2. Unwired-engine audit script: `scripts/audit-unwired-engines.mjs`
3. Dispatcher registry directory (108 dispatchers): `mcp-server/src/tools/dispatchers/`

ONLINE (WebFetch-confirmed live + free/legal, 2026-06-10):
4. Bazel — official repository: https://github.com/bazelbuild/bazel
5. CMake — official repository (Kitware): https://github.com/Kitware/CMake
6. Dagger — official compile-time DI repository (Google): https://github.com/google/dagger
7. Build Systems a la Carte (ICFP 2018, free PDF): https://www.microsoft.com/en-us/research/publication/build-systems-la-carte/
8. POSIX `make` — The Open Group Base Specifications, IEEE Std 1003.1-2017: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/make.html

DROPPED (could not WebFetch-confirm this pass): GNU Make manual (gnu.org) — HTTP 429 on three URLs.
