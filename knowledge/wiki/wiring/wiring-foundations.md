---
title: Wiring Foundations — dependency graphs, topological order, dependency injection, coupling/cohesion, build orchestration
galaxy: wiring
owner_slot: romeo
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/software-architecture facts WebFetch-confirmed against primary/reference sources (MIT 6.031 Software Construction courseware x2, and the established CS reference literature on topological sorting, DAGs, dependency injection, coupling, cohesion, modular programming, and Make build automation); engineering-relevance mapping to the wiring galaxy is editorial
tags: [wiring, dependency-graph, topological-sort, DAG, dependency-injection, inversion-of-control, coupling, cohesion, modular-programming, build-orchestration, make, MIT-6031, designing-for-change]
---

# Wiring Foundations

The domain-knowledge spine for the **wiring** galaxy (owner: romeo): how PRISM closes the engine -> dispatcher -> consumer dependency graph, orders multi-unit builds, and keeps the asset graph free of orphans and cycles. The wiring galaxy's core job — connecting every engine to every dispatcher/consumer that would naturally use it (R15: "WIRE -> TEST -> VALIDATE -> APPLY-TO-ALL-GALAXIES"), inferring missing edges, and auditing for unwired orphans — is the applied face of a deep CS literature on **dependency graphs, dependency injection, coupling/cohesion, and build orchestration.** Each section below grounds a piece of that theory in a cited WebFetched source and maps it to how the wiring galaxy uses it. CS reference facts are marked **CONFIRMED**; the per-section engineering relevance is editorial.

## 1. Dependency graphs as DAGs (the wiring graph's shape)

**CONFIRMED** ([Directed acyclic graph, Wikipedia](https://en.wikipedia.org/wiki/Directed_acyclic_graph)):
- A DAG is **"a directed graph with no directed cycles"** — edges follow directions that **"will never form a closed loop."**
- The reachability relation in a DAG **formalizes as a partial order**: `u <= v` exactly when there is a directed path from `u` to `v`. (Different DAGs may give the same reachability relation.)
- A core theorem: **"A directed graph is acyclic if and only if it has a topological ordering."**
- DAGs represent task dependencies; **"A cycle in this graph is called a circular dependency, and is generally not allowed, because there would be no way to consistently schedule the tasks involved in the cycle."**
- **Transitive reduction** keeps the minimum edges preserving reachability — it discards `u -> v` when a longer directed path `u -> ... -> v` already exists; **transitive closure** is the maximum-edge form preserving the same reachability.

**Engineering relevance for wiring:** PRISM's engine/dispatcher/consumer asset graph IS a dependency DAG — a wired edge says "this consumer needs this engine before it can run." A circular dependency (engine A wires to B which wires back to A) is exactly the unschedulable cycle this section forbids; the wiring galaxy's audits must reject it. Transitive reduction is the right model when deciding which edges are *load-bearing* vs redundant (an engine already reached via a longer wired path need not carry a direct edge).

## 2. Topological order (the order a multi-unit build must run in)

**CONFIRMED** ([Topological sorting, Wikipedia](https://en.wikipedia.org/wiki/Topological_sorting)):
- A topological sort is **"a linear ordering of its vertices such that for every directed edge (u,v) from vertex u to vertex v, u comes before v in the ordering."**
- **"A topological ordering is possible if and only if the graph has no directed cycles, that is, if it is a directed acyclic graph (DAG)."**
- Standard algorithms run in **O(|V|+|E|)** time (linear in nodes plus edges).
- **Kahn's algorithm** repeatedly takes a node with **zero incoming edges (in-degree 0)**, emits it, decrements the in-degree of its successors, and adds any newly-zero successor to the frontier; **edges remaining after all nodes are processed indicate a cycle.**
- The **DFS-based algorithm** prepends a node to the output **"only after considering all other nodes that depend on n"** (first described in print by Tarjan, 1976).

**Engineering relevance for wiring:** R13's "logical (dependency) order — build the verifiable core before the integration/inline, each unit on a proven foundation" is literally a topological sort of the build DAG. Kahn's "process zero-in-degree first" is the rule for picking which unit a slot may safely build now (no unbuilt dependency). And the cycle-detection corollary — leftover edges mean a cycle — is the algorithmic basis for a wiring audit that fails loud on circular dependencies instead of looping forever.

## 3. Dependency injection + inversion of control (how a wired dependency is supplied)

**CONFIRMED** ([Dependency injection, Wikipedia](https://en.wikipedia.org/wiki/Dependency_injection)):
- DI is **"a programming technique in which an object or function receives other objects or functions that it requires, as opposed to creating them internally."**
- It answers **"How can a class be independent from the creation of the objects it depends on?"** and **"How can an application... support different configurations?"**
- It **"implements the idea of inverting control over the implementations of dependencies"** (inversion of control): the framework constructs the object AND instantiates its dependencies.
- Roles: a **service** is a class with useful functionality; a **client** uses services; an **injector** (a.k.a. assembler, container, provider, factory) **"introduces services to the client."** Clients **"should not know how their dependencies are implemented, only their names and API."**
- Forms: **constructor injection** (via the constructor), **setter injection** (a setter method accepts the dependency), and **interface injection** (the dependency's interface provides an injector method).

**Engineering relevance for wiring:** "wiring an engine into a dispatcher" is dependency injection at the architecture scale — the dispatcher (client) receives the engine (service) rather than newly constructing it, so the engine can be configured/swapped without editing the dispatcher. The wiring galaxy's job of pointing each consumer at a singleton/engine API (not at a hard-coded `new`) is the inversion-of-control principle applied across PRISM, and is why `// WIRE-EXEMPT: <wrapper>` exists for the singleton-wrapper case.

## 4. Coupling vs cohesion (the metric wiring optimizes for)

**CONFIRMED — coupling** ([Coupling, Wikipedia](https://en.wikipedia.org/wiki/Coupling_(computer_programming))):
- Coupling is **"the degree of interdependence between software modules, a measure of how closely connected two routines or modules are."**
- **"Low coupling is often thought to be a sign of a well-structured computer system and a good design."**
- Tight coupling's three costs: a change in one module **triggers cascading modifications** in dependents; assembly **needs more effort**; modules become **harder to reuse and test** because dependents must be dragged along.
- Procedural coupling ranks from worst to best: **content -> common -> control -> stamp -> data** coupling.

**CONFIRMED — cohesion** ([Cohesion, Wikipedia](https://en.wikipedia.org/wiki/Cohesion_(computer_science))):
- Cohesion is **"the degree to which the elements inside a module belong together."**
- High cohesion correlates with **robustness, reliability, reusability, and understandability**, and **"increased system maintainability, because logical changes in the domain affect fewer modules."**
- Cohesion types rank from worst to best: **coincidental -> logical -> temporal -> procedural -> communicational -> sequential -> functional.**
- The two are complementary: **"Low coupling often correlates with high cohesion, and vice versa"** — the design target is low coupling + high cohesion.

**Engineering relevance for wiring:** the wiring galaxy's target metric is exactly *low coupling + high cohesion across the asset graph*. An engine that touches many dispatchers via a stable, narrow API is low-coupling-good; one whose internals leak into consumers (content/common coupling) is the cascading-change cost above. When wiring decides "is this one engine or two," the functional-cohesion test ("parts contributing to a single well-defined task") is the deciding criterion — and matches the modular-programming rule in section 6 that a cyclic dependency means the two pieces should be one module.

## 5. Build orchestration (Make: dependency graph + only-rebuild-what-changed)

**CONFIRMED** ([Make (software), Wikipedia](https://en.wikipedia.org/wiki/Make_(software))):
- Make **"performs actions ordered by configured dependencies as defined in a... makefile."**
- Each rule is a **target**, its **prerequisites** (the dependencies after the colon), and a **recipe** ("a series of TAB indented command lines that define how to generate the target from the components").
- Rebuild decision: **"Make updates target files from source files if any source file has a newer timestamp than the target file or the target file does not exist"** — i.e. it skips up-to-date targets.
- By **evaluating prerequisites before targets**, Make processes the implicit dependency graph in correct (topologically valid) build order.

**Engineering relevance for wiring:** Make is the canonical proof that a dependency DAG + topological order + a freshness check ("rebuild only what is stale") is the right engine for incremental, correct builds. PRISM's incremental build/wiring re-runs mirror this: re-wire/re-test only the assets whose upstream changed, and always in prerequisite-before-target order — the same discipline `npm run build:incremental` and the wiring audits apply, so a one-engine change doesn't force a full-graph rebuild.

## 6. Modular programming + interface/implementation separation (why wiring is changeable)

**CONFIRMED** ([Modular programming, Wikipedia](https://en.wikipedia.org/wiki/Modular_programming)):
- Modular programming **"emphasizes organizing the functions of a codebase into independent modules, each providing an aspect of a computer program."**
- A module separates its **interface** (**"the elements that are provided and required by the module... detectable by other modules"**) from its **implementation** (**"the working code that corresponds to the elements declared in the interface"**).
- Built on **information hiding (1972)** and **separation of concerns (1974)**: internal changes can be made **without affecting other modules that depend on the interface.**
- Module dependency management: **"modules form a directed acyclic graph (DAG); in this case a cyclic dependency between modules is seen as indicating that these should be a single module."**

**CONFIRMED — designing for change** ([MIT 6.031 Software Construction, Static Checking](https://web.mit.edu/6.031/www/sp22/classes/01-static-checking/) and [Equality / abstraction barriers](https://web.mit.edu/6.031/www/sp22/classes/15-equality/)):
- 6.031's three properties of good software are **safe from bugs, easy to understand, and ready for change** — "Software always changes. Some designs make it easy to make changes; others require throwing away and rewriting a lot of code."
- **"Static checking makes it easier to change your code by identifying other places that need to change in tandem"** — a wired type graph surfaces the blast radius of a change.
- Abstract data types are **"characterized by their operations, not by their representation"**; clients should **depend on the abstraction (the set of operations and their contracts), not the representation**, so implementations change independently of client code as long as the contract holds (**representation independence**).

**Engineering relevance for wiring:** this is the theoretical license for PRISM's whole architecture — engines expose a dispatcher-action interface; consumers wire to the *action contract*, not the engine internals; so an engine's implementation can be rewritten without re-wiring every consumer (designing for change). The modular-programming rule that "a cyclic dependency means these should be one module" is the same cycle-forbidding constraint as sections 1-2, restated at the module-design level — and 6.031's "static checking shows what else must change in tandem" is exactly what a wiring `/impact` blast-radius query computes.

## Owner-gate (NOT promoted)

The following were deliberately left for romeo (wiring owner) to verify against PRISM's actual wiring tooling before any of it is hardcoded into an engine, skill, or audit:

- **Mapping the theory to specific PRISM scripts/hooks.** This entry grounds the *CS theory*; it does NOT assert the current behavior of `stop_on_unwired_assets`, `stop-auto-wire.mjs`, the NN-GRAPH tier-5 wiring-inference cascade, or any `prism_dev` wiring action. Those are live PRISM assets whose exact contracts romeo must read before citing — do not infer their behavior from this foundations page.
- **Which coupling/cohesion type PRISM's audit actually measures.** The taxonomies above (content..data coupling; coincidental..functional cohesion) are the reference ranking. Whether PRISM's wiring audit computes any of these as a metric (vs a simple edge-count / orphan check) is unverified here — romeo to confirm.
- **Cycle-detection in the live graph.** Sections 1-2 establish that the wiring DAG must be acyclic and that leftover edges in Kahn's algorithm detect a cycle. Whether the current PRISM wiring audit runs an explicit cycle check (and how it reports one) is NOT confirmed — flagged for romeo.
- No safety thresholds or physics constants are involved in this domain, so none were gated on that axis (n/a).

## Sources

Distinct free/legal sources WebFetch-confirmed for this entry (2026-06-10):

1. MIT 6.031 Software Construction — Static Checking (designing for change, static checking): https://web.mit.edu/6.031/www/sp22/classes/01-static-checking/
2. MIT 6.031 Software Construction — Equality / abstraction barriers (representation independence): https://web.mit.edu/6.031/www/sp22/classes/15-equality/
3. Topological sorting (definition, Kahn's algorithm, DFS, complexity, cycle condition): https://en.wikipedia.org/wiki/Topological_sorting
4. Directed acyclic graph (DAG, partial order, circular dependency, transitive reduction): https://en.wikipedia.org/wiki/Directed_acyclic_graph
5. Dependency injection (DI, inversion of control, roles, injection forms): https://en.wikipedia.org/wiki/Dependency_injection
6. Coupling (computer programming) (interdependence, tight/loose, coupling types): https://en.wikipedia.org/wiki/Coupling_(computer_programming)
7. Cohesion (computer science) (cohesion definition, ranking, maintainability): https://en.wikipedia.org/wiki/Cohesion_(computer_science)
8. Make (software) (build automation, target/prerequisite/recipe, timestamp rebuild, build order): https://en.wikipedia.org/wiki/Make_(software)
9. Modular programming (interface/implementation, information hiding, module DAG): https://en.wikipedia.org/wiki/Modular_programming
