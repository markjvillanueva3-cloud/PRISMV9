---
title: Wiring Applied Practice — dependency-wiring gotchas, failure modes, and the technique decisions theory does not teach
galaxy: wiring
owner_slot: romeo
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: practitioner CS-engineering claims WebFetch-confirmed against free/legal reference sources (MIT 6.031 Software Construction courseware on immutability/aliasing, Semantic Versioning spec semver.org, and the established CS reference literature on circular dependency, dependency injection disadvantages, Make dependency-spec pitfalls, and leaky abstractions); the per-gotcha mapping to how the wiring galaxy hits it is editorial
tags: [wiring, applied-practice, tribal-knowledge, circular-dependency, orphan-wiring, R15, dependency-injection-over-abstraction, topological-build-break, shared-mutable-state, version-skew, leaky-abstraction, gotchas, failure-modes]
---

# Wiring Applied Practice

The **practitioner-knowledge** layer for the **wiring** galaxy (owner: romeo). Read [[wiring-foundations]] first — that page is the *theory* (DAGs, topological order, dependency injection, coupling/cohesion, build orchestration, modular programming). This page is the orthogonal half: **what actually goes wrong when you wire dependencies, why it goes wrong, and how an expert avoids it.** Theory teaches that the asset graph must be an acyclic DAG with low coupling; practice is the set of hard-won gotchas about *the ways that invariant breaks in the field* — the cycle that only shows up at init time, the engine wired to one consumer instead of all, the DI layer that buried the call graph, the stale incremental build, the shared mutable object two consumers fight over, the producer/consumer version skew.

Each note below states the gotcha, **WHY** it bites, and **the expert's avoidance**, with the CS source cited inline. Reference CS-engineering facts are marked **CONFIRMED**; the wiring-galaxy mapping (the "PRISM hit" line) is editorial.

## 1. Circular dependency — the cycle that breaks build and init

### Gotcha 1.1 — a circular dependency is a domino-effect anti-pattern, not a stylistic preference
**CONFIRMED** ([Circular dependency, Wikipedia](https://en.wikipedia.org/wiki/Circular_dependency)): circular dependencies cause **"the tight coupling of the mutually dependent modules which reduces or makes impossible the separate re-use of a single module"**; they **"can cause a domino effect when a small local change in one module spreads into other modules and has unwanted global effects (program errors, compile errors)"**; and **"circular dependencies between larger software modules are considered an anti-pattern."**
- **WHY it bites:** the theory page proves a cycle has no valid topological order (so it is unschedulable); the *practitioner* pain is that the cycle is often invisible until a "small local change" in one node ripples back through the loop and breaks compile/build globally — the blast radius is the whole cycle, not one edge.
- **Expert avoidance:** keep the asset graph a strict DAG by construction; when two engines genuinely need each other, the modular-programming rule (foundations 6) says they should be **one** module — merge them rather than wiring a back-edge.
- **PRISM hit:** an engine A wired into a dispatcher that wires back into A creates exactly this cycle; the wiring audit must reject it (fail loud) rather than silently emit an order that can't build.

### Gotcha 1.2 — circular dependency causes infinite recursion / init-order failures AND reference-counting memory leaks
**CONFIRMED** (same source): circular dependencies **"can also result in infinite recursions or other unexpected failures,"** and **"may also cause memory leaks by preventing certain automatic garbage collectors (those that use reference counting) from deallocating unused objects."**
- **WHY it bites:** at *initialization* time a cycle means "A needs B fully constructed, B needs A fully constructed" — neither can finish, so you get a stack overflow or a half-constructed `undefined` dependency that explodes later, far from the real cause. The GC leak is the quieter cousin: two objects holding each other alive forever.
- **Expert avoidance:** break the cycle with an interface/abstraction seam (depend on a contract, not the concrete peer) or lazy/deferred resolution so neither side needs the other fully built at load time.
- **PRISM hit:** module-load cycles in the engine/dispatcher graph surface as "X is not a function" / `undefined` engine at boot — trace it to the back-edge, don't patch the symptom downstream.

## 2. Orphan / partial wiring — the R15 failure mode

### Gotcha 2.1 — wiring an engine to ONE consumer when several need it leaves silent orphans (the R15 failure)
**CONFIRMED** ([Coupling, Wikipedia](https://en.wikipedia.org/wiki/Coupling_(computer_programming))): a benefit of low coupling is that modules become easier to **reuse and test**; the cost of leaving consumers un-wired is the inverse of reuse — the capability exists but is unreachable from the places that should use it. Tight coupling conversely makes modules **"harder to reuse."**
- **WHY it bites:** an engine wired into only one dispatcher *looks* done (its one test passes, its one consumer works) but every *other* natural consumer silently re-derives or hard-codes the logic — duplication, drift, and a capability that the rest of the system can't see. This is invisible to a single-path test.
- **Expert avoidance:** treat "done" as "wired to **every** natural consumer in the same change," and verify by round-trip test **through each** consumer, not just the singleton.
- **PRISM hit:** this is precisely R15 ("WIRE -> TEST -> VALIDATE -> APPLY-TO-ALL-GALAXIES" / no orphans) and PRISM's §ENGINE WIRING rule "do NOT stop at one dispatcher." The wiring galaxy's orphan audit (`stop_on_unwired_assets` / `stop-auto-wire`) exists to catch exactly this — see Owner-gate for their actual live status.

### Gotcha 2.2 — a leaky abstraction means "wired to the interface" is not the same as "decoupled from the internals"
**CONFIRMED** ([Leaky abstraction, Wikipedia](https://en.wikipedia.org/wiki/Leaky_abstraction)) — Spolsky's Law: **"All non-trivial abstractions, to some degree, are leaky."** Developers **must understand both the abstraction and its internals** to use and troubleshoot systems, which **reduces the labor savings that well-designed abstractions promise to deliver.**
- **WHY it bites:** wiring a consumer to an engine's *action contract* (foundations 3/6) is the right design, but the practitioner reality is the abstraction still leaks — performance characteristics, error shapes, and ordering assumptions of the implementation surface through. A consumer that ignores the leak breaks when the engine's internals change even though the "interface" held.
- **Expert avoidance:** wire to the contract, but write the consumer's tests to assert the *observable* contract (errors, ordering, latency budget) so a leak that matters is caught, and document any internal coupling that the contract can't hide.
- **PRISM hit:** the `// WIRE-EXEMPT: <wrapper>` convention assumes the wrapper fully hides the engine — verify that assumption against the leak, especially for performance-sensitive or error-path-sensitive consumers.

## 3. Dependency-injection over-abstraction — when the wiring mechanism becomes the problem

### Gotcha 3.1 — DI separates behavior from construction, which makes the call graph hard to trace
**CONFIRMED** ([Dependency injection, Wikipedia](https://en.wikipedia.org/wiki/Dependency_injection)) — criticisms of DI: it **"makes code difficult to trace (read) because it separates behavior from construction,"** **"creates clients that demand configuration details, which can be onerous when obvious defaults are available,"** and **"typically requires more upfront development effort."**
- **WHY it bites:** the same inversion-of-control that makes a dependency swappable (foundations 3) means the concrete thing actually wired in is no longer visible at the call site — you can't "follow the code" to find out which engine a dispatcher really runs; you have to know the container/config. Over-applied, every trivial dependency needs a config entry.
- **Expert avoidance:** inject what genuinely varies or needs swapping/testing; for dependencies with **"obvious defaults,"** keep the default in place rather than forcing every caller to configure it. Don't abstract a dependency that has exactly one implementation and no test need.
- **PRISM hit:** wiring a consumer to a singleton/engine API is DI at architecture scale — good when the engine could vary, over-abstraction when a one-implementation engine gets an injection seam nobody uses. Prefer the direct singleton import over a config indirection that only obscures the wiring.

### Gotcha 3.2 — DI encourages framework dependence; over-reliance on the framework is its own coupling
**CONFIRMED** (same source): DI **"encourages dependence on a framework"** and is **"typically implemented with reflection or dynamic programming, hindering IDE automation."**
- **WHY it bites:** a heavy DI/container framework becomes a dependency that every wired module now requires; reflection-based wiring also defeats static "find references" so the static-checking blast-radius advantage from foundations 6 ("static checking shows what else must change in tandem") is lost — the wiring graph becomes opaque to tooling.
- **Expert avoidance:** prefer plain constructor/parameter injection (statically traceable) over reflection/magic containers, so the type graph still surfaces the blast radius of a change.
- **PRISM hit:** keep wiring explicit and statically discoverable (a real import + an action contract) so `/impact` and the wiring audits can compute the dependency edges — a reflection-resolved dependency is an invisible edge.

## 4. Topological / build-order breaks — stale and out-of-order incremental builds

### Gotcha 4.1 — a forgotten or extra prerequisite produces subtle, hard-to-catch stale-build bugs
**CONFIRMED** ([Make (software), Wikipedia](https://en.wikipedia.org/wiki/Make_(software))): **"Makefile consist of dependencies and a forgotten or an extra one may not be immediately obvious to the user and may result in subtle bugs in the generated software that are hard to catch."**
- **WHY it bites:** the build is only as correct as its declared dependency edges. A **missing** edge means a stale artifact is used (the consumer wasn't rebuilt when its upstream changed); an **extra** edge means needless rebuilds and possibly wrong order. Both are silent — the build "succeeds," but the output is wrong.
- **Expert avoidance:** declare the dependency graph completely and minimally (foundations' transitive-reduction idea: minimum edges preserving reachability); when in doubt, force a clean rebuild to confirm the incremental graph matches reality.
- **PRISM hit:** the same risk in incremental wiring/test re-runs — if the wiring audit re-tests only "the assets whose upstream changed," a missing upstream edge means a real regression ships green. Verify the edge set, not just that the incremental run passed.

### Gotcha 4.2 — timestamp-based rebuild decisions skip updates erroneously
**CONFIRMED** (same source): Make **"updates target files from source files if any source file has a newer timestamp than the target file,"** but **"sometimes updates are skipped erroneously due to file timestamp issues."**
- **WHY it bites:** "rebuild only what is stale" (foundations 5) is correct *only if* the freshness signal is trustworthy. Clock skew, restored-from-backup files, or out-of-band edits give a target a misleadingly-recent timestamp, so a genuinely-stale artifact is treated as up-to-date and never rebuilt.
- **Expert avoidance:** use a content hash (or an explicit "force" path) rather than mtime alone for the rebuild decision when correctness matters more than speed; keep a `clean` escape hatch.
- **PRISM hit:** any wiring/index freshness check keyed on file mtime (vs content) inherits this gotcha — a stale index that *looks* fresh silently serves old wiring. Prefer a content/SHA check for load-bearing freshness gates.

## 5. Tight coupling via shared mutable state — the aliasing bug between wired modules

### Gotcha 5.1 — passing a mutable object between wired modules is a latent aliasing bug
**CONFIRMED** ([MIT 6.031 Software Construction — Mutability & Immutability](https://web.mit.edu/6.031/www/sp22/classes/08-immutability/)): **"aliasing is what makes mutable types risky,"** and **"passing mutable objects around is a latent bug. It's just waiting for some programmer to inadvertently mutate that array."** The reading's diagnosis: **"An array was mutated through an alias held by one part of the program, without informing the part of the program holding another alias."**
- **WHY it bites:** when two wired consumers share a reference to the same mutable object, one consumer's in-place mutation silently changes what the other sees — an invisible coupling edge that no dependency graph shows. The bug surfaces far from the mutation, in the *other* consumer.
- **Expert avoidance:** **"immutable types are safer from bugs, easier to understand, and more ready for change"** — pass immutable values (or defensive copies) across module boundaries so **"the bugs would have been impossible by design."**
- **PRISM hit:** an engine that returns a shared mutable config/state object and is wired into several dispatchers creates exactly this hidden coupling — the worst case of the content/common coupling the foundations page ranks lowest. Return immutable snapshots across wired boundaries.

### Gotcha 5.2 — returning a cached mutable object creates invisible coupling that outlives the call
**CONFIRMED** (same source): returning mutable objects **"creates lasting obligations"** — the reading's `startOfSpring()` example shows that caching a mutable `Date` and returning it creates **invisible coupling** where **"later mutations by one client break other clients' expectations without warning."**
- **WHY it bites:** the coupling isn't at wiring time — it's at *every future call*. A producer that hands out the same mutable cached instance has wired every consumer to every other consumer through that instance, permanently.
- **Expert avoidance:** never return the internal cached mutable object; return an immutable view or a fresh copy so consumers can't reach back into the producer's state (representation independence, foundations 6).
- **PRISM hit:** a singleton engine caching mutable internal state and returning it directly is the classic "engine wired to all dispatchers" amplifier for this bug — the more consumers, the more cross-contamination. Audit singleton return types for shared-mutable leaks.

## 6. Version skew between producer and consumer — dependency hell

### Gotcha 6.1 — once the system grows, loose/tight version specs both lead to a "pit of despair"
**CONFIRMED** ([Semantic Versioning, semver.org](https://semver.org/)): **"In the world of software management there exists a dreaded place called 'dependency hell.' The bigger your system grows and the more packages you integrate into your software, the more likely you are to find yourself, one day, in this pit of despair."** Two failure modes: **"If the dependency specifications are too tight, you are in danger of version lock (the inability to upgrade a package without having to release new versions of every dependent package)"**; **"If dependencies are specified too loosely, you will inevitably be bitten by version promiscuity (assuming compatibility with more future versions than is reasonable)."**
- **WHY it bites:** a producer engine and its wired consumers drift apart over time. Pin too hard and one upgrade forces a cascade of re-releases (version lock); pin too loose and a consumer silently picks up an incompatible producer version (version promiscuity) — a wiring edge that *was* valid breaks without a code change.
- **Expert avoidance:** version the producer's **contract** explicitly and let consumers depend on a compatible range, not an exact build — the goal is upgradeability without surprise breakage.
- **PRISM hit:** when an engine's action contract changes, every wired consumer is a potential version-skew break. The wiring galaxy's "apply to all galaxies / clone don't fork" rule fights promiscuity (one canonical contract), and an explicit contract version fights lock.

### Gotcha 6.2 — MAJOR vs MINOR/PATCH is the signal that tells a consumer whether a wired contract still holds
**CONFIRMED** (same source): **"Bug fixes not affecting the API increment the patch version, backward compatible API additions/changes increment the minor version, and backward incompatible API changes increment the major version."**
- **WHY it bites:** without a backward-compatibility signal, a consumer can't tell a safe upgrade from a breaking one — so it either never upgrades (stagnation) or upgrades blindly (breakage). The signal *is* the contract between producer and consumer.
- **Expert avoidance:** treat any **backward-incompatible** change to an engine's wired action contract as a MAJOR bump that forces an explicit consumer review; additive changes (MINOR) and internal fixes (PATCH) need no re-wiring.
- **PRISM hit:** changing an engine action's input/output shape is a MAJOR-class change — the wiring audit should flag every wired consumer for review, not assume the existing edges still typecheck. A schema-version bump on the contract is the in-repo form of this signal.

## Owner-gate (NOT promoted)

Left for romeo (wiring owner) to verify against PRISM's actual wiring tooling before any of it is hardcoded into an engine, skill, or audit:

- **Live status of the orphan/auto-wire audits.** Gotcha 2.1 maps to `stop_on_unwired_assets` and `stop-auto-wire.mjs`, but PRISM's own CLAUDE.md notes `stop_on_unwired_assets` is currently bypassed fleet-wide (`PRISM_ALLOW_UNWIRED=1`) with 0 direct Stop-block refs — i.e. the "no-orphans" guarantee is **advisory, not enforced** as of the doc's writing. Romeo must confirm the present wiring of both hooks before claiming either fires; do not infer their behavior from this page.
- **Whether the wiring audit runs an explicit cycle check.** Gotchas 1.1/1.2 require the audit to detect and fail loud on circular dependencies (Kahn-leftover-edges from foundations 2). Whether the live PRISM wiring audit does this — and how it reports a cycle — is NOT confirmed here; flagged for romeo.
- **Freshness-signal of any incremental wiring/index re-run.** Gotcha 4.2 warns that mtime-keyed freshness skips erroneously. Whether PRISM's wiring/index freshness gates use mtime vs content-hash is unverified here — romeo to confirm (note: CLAUDE.md records a real prior fix re-basing a gate to file-mtime, and separate mtime cry-wolf incidents, so this is live territory).
- **Contract-version discipline on engine actions.** Gotchas 6.1/6.2 assume engine action contracts carry an explicit version/compat signal. PRISM uses `schemaVersion` on state JSON; whether engine *action contracts* carry an analogous producer/consumer compat signal that the wiring audit reads is unverified — romeo to confirm.
- **No benchmark/throughput numbers are asserted here.** Any coupling-metric value, orphan count, or audit-latency figure is owner-gated — none stated. No safety thresholds or physics constants are involved in this domain (n/a).

## Sources

Distinct free/legal sources WebFetch-confirmed for this entry (2026-06-10):

1. Circular dependency (domino effect, infinite recursion, reference-counting memory leak, tight coupling, anti-pattern): https://en.wikipedia.org/wiki/Circular_dependency
2. Dependency injection (disadvantages: traceability, configuration demands, upfront effort, framework dependence, reflection/IDE): https://en.wikipedia.org/wiki/Dependency_injection
3. Leaky abstraction (Spolsky's Law of Leaky Abstractions, double-knowledge requirement, reduced labor savings): https://en.wikipedia.org/wiki/Leaky_abstraction
4. Make (software) (forgotten/extra prerequisite subtle bugs, timestamp rebuild + erroneous skip, prerequisites-before-target order): https://en.wikipedia.org/wiki/Make_(software)
5. MIT 6.031 Software Construction — Mutability & Immutability (aliasing risk, passing mutable objects as latent bugs, cached-mutable-return coupling, immutability safer): https://web.mit.edu/6.031/www/sp22/classes/08-immutability/
6. Semantic Versioning, semver.org (dependency hell, version lock vs version promiscuity, MAJOR/MINOR/PATCH compatibility signal): https://semver.org/
