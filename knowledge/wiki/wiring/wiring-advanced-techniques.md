---
title: Wiring Advanced Techniques — incremental topological rebuild, DI-container/object-graph composition, cycle-breaking via interface seams, diamond/version-skew resolution
galaxy: wiring
owner_slot: romeo
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: state-of-the-art CS/software-architecture techniques WebFetch-confirmed against free/legal primary and reference sources (Build Systems a la Carte / Microsoft Research publication page, the Dependency Inversion Principle reference, Russ Cox's Minimal Version Selection article on research.swtch.com, and the CS reference literature on strongly connected components, incremental computing, and inversion of control); the mapping of each technique to the wiring galaxy is editorial
tags: [wiring, advanced-techniques, incremental-build, build-systems-a-la-carte, scheduler-rebuilder, early-cutoff, verifying-traces, dependency-inversion-principle, ioc-container, composition-root, cycle-breaking, interface-seam, strongly-connected-components, condensation, minimal-version-selection, diamond-dependency, version-skew, incremental-computing]
---

# Wiring Advanced Techniques

The **world-leader-depth** layer for the **wiring** galaxy (owner: romeo). Read [[wiring-foundations]] (intro theory: DAGs, topological order, dependency injection, coupling/cohesion, Make, modular programming) and [[wiring-applied-practice]] (the common practitioner gotchas: cycles at init, orphan wiring, DI over-abstraction, stale builds, shared-mutable aliasing, version skew) FIRST — this page deliberately does not repeat them. This is the next tier: the **state-of-the-art strategies and methods an expert reaches for once the basics and the common gotchas are handled** — the advanced rebuild scheduler, the composition-root discipline, the principled cycle-break, and the diamond-resolution algorithm that separate a correct-but-naive wiring layer from a world-class one.

Each technique below states **the method**, **WHEN an expert reaches for it**, **the trade-off DIRECTION** (never a tuned number), with the source cited inline, plus one line on how the wiring galaxy applies it. Reference CS facts are marked **CONFIRMED**; the per-technique wiring-galaxy mapping is editorial.

---

## Theme A — Incremental rebuild as a designed system (scheduler x rebuilder)

The foundations page treats "rebuild only what is stale, in dependency order" as Make's behavior. The advanced view is that this is **two independent design axes** you choose deliberately, not one monolith.

### A1. Decompose the rebuild engine into a *scheduler* and a *rebuilder* (Build Systems a la Carte)
**CONFIRMED** ([Build Systems a la Carte, Microsoft Research](https://www.microsoft.com/en-us/research/publication/build-systems-la-carte/)): the paper presents **"a systematic, and executable, framework for developing and comparing build systems, viewing them as related points in [a] landscape rather than as isolated phenomena,"** and shows that by **decomposing existing build systems** one **"can recombine their components, allowing us to prototype new build systems with desired properties."** The two recombinable components are the **scheduler** (decides the order tasks run) and the **rebuilder** (decides whether a given task actually needs to run).
- **WHEN an expert reaches for it:** when the naive "topo-sort then rebuild every stale node" engine is too coarse — you want to mix-and-match an ordering strategy with a freshness strategy independently (e.g. a suspending scheduler with a verifying-trace rebuilder), or reason about *why* one build tool behaves differently from another.
- **Trade-off DIRECTION:** separating the two axes adds conceptual machinery up front, but buys the ability to upgrade the freshness decision (mtime -> hash/trace) without touching the ordering logic, and vice versa — more design surface, far less coupling between "what order" and "what to skip."
- **PRISM hit:** a wiring/test re-run is exactly a scheduler (which assets in which order — the topo sort from foundations 2) x a rebuilder (which assets are actually stale). Treat the freshness decision as a swappable component so the orphan-audit ordering and the staleness check evolve independently.

### A2. Prefer trace-based freshness (verifying / constructive traces) over a bare dirty bit
**CONFIRMED** (same source — the rebuilder taxonomy named in the paper's framework): build systems differ by **rebuilder** strategy, ranging from a simple **dirty bit** through **verifying traces** and **constructive traces** to **deep constructive traces** — successively richer records of what a task depended on and produced, used to decide if recomputation is needed. (The publication page confirms the recombination framework; the rebuilder spectrum is the paper's central taxonomy of these strategies.)
- **WHEN an expert reaches for it:** when a dirty-bit / timestamp signal is untrustworthy (the mtime cry-wolf failure from applied-practice 4.2) or when you want **early cutoff** — stopping the rebuild of downstream nodes whose inputs, after recompute, turned out unchanged.
- **Trade-off DIRECTION:** a richer trace costs storage and bookkeeping per task, but eliminates whole classes of false-stale and false-fresh decisions a dirty bit cannot catch — pay memory to buy correctness and skipped work.
- **PRISM hit:** key a wiring/index freshness gate on a recorded content trace (what edges/inputs produced this index) rather than a single mtime flag, so a re-wire skips truly-unchanged assets and never serves a stale graph that merely *looks* fresh.

### A3. Distinguish static from dynamic dependencies before choosing a scheduler
**CONFIRMED** (Build Systems a la Carte framework, same publication): the framework's scheduling story turns on whether a task's dependencies are **known in advance (static)** or **discovered while the task runs (dynamic)** — a topological scheduler suffices for static dependencies, while dynamic dependencies require a **restarting** or **suspending** scheduler that can react to a dependency it only learns about mid-build.
- **WHEN an expert reaches for it:** the moment a node's dependency set is not fully knowable before it runs (a consumer that resolves which engine to wire at runtime) — a plain topo sort over a pre-known edge set is then *unsound*.
- **Trade-off DIRECTION:** a static topological scheduler is simplest and fastest but assumes the full edge set up front; a suspending/restarting scheduler handles runtime-discovered edges at the cost of more complex control flow — reach for it only when dependencies are genuinely dynamic.
- **PRISM hit:** wiring edges resolved by reflection or runtime config (the "invisible edge" warned about in applied-practice 3.2) are *dynamic* dependencies — a build/audit that assumes a static edge set will miss them. Prefer statically declared edges precisely so the simpler scheduler stays sound.

### A4. Track *which outputs to recompute* via the transitive closure of the change (incremental computing)
**CONFIRMED** ([Incremental computing, Wikipedia](https://en.wikipedia.org/wiki/Incremental_computing)): incremental computing **"attempts to save time by only recomputing those outputs which depend on the changed data,"** using **"a dependency graph of all the data elements that may need to be recalculated, and their dependencies"** — and **"the elements that need to be updated when a single element changes are given by the transitive closure of the dependency relation."** It also names the **static** (derive the incremental program by transformation, before any change) vs **dynamic** (record an execution, reuse it when the input changes) split.
- **WHEN an expert reaches for it:** when a full re-wire/re-audit of the whole asset graph is wasteful and you can bound the work to exactly the change's downstream cone.
- **Trade-off DIRECTION:** the article is explicit that there is a tension — you **"balanc[e] the amount of dependency information to be tracked with the amount of recomputation to be performed,"** and notes that for complex dependencies **"complete reevaluation... may be more efficient in practice."** Track more to recompute less, but past a point full re-evaluation wins. Choose the side deliberately.
- **PRISM hit:** when an engine's contract changes, the set of consumers to re-verify is the **transitive closure** of that engine in the wiring DAG — exactly what an `/impact` blast-radius query should compute, and the principled answer to "what must I re-test after this edit."

---

## Theme B — DI as architecture: object-graph composition, not scattered injection

Foundations covered *what* DI is; applied covered *over-abstraction*. The advanced discipline is **where and how the whole object graph gets assembled** — a single composition concern, not injection sprinkled everywhere.

### B1. Centralize assembly: let the IoC container own the object graph and lifetimes (composition root)
**CONFIRMED** ([Inversion of Control, Wikipedia](https://en.wikipedia.org/wiki/Inversion_of_control)): under IoC **"it is the external code or framework that is in control and calls the custom code"**; the framework **"orchestrates their interaction"** and handles **object assembly**, while custom code **"fills in the blanks."** IoC achieves decoupling through **"run-time binding,"** so that **"reusable code and the problem-specific code are developed independently even though they operate together."**
- **WHEN an expert reaches for it:** once the dependency graph is large enough that constructing it ad hoc at each call site duplicates wiring and scatters lifetime decisions — you pull all assembly into one place (a composition root) the container owns.
- **Trade-off DIRECTION:** a central assembler concentrates the wiring knowledge (and the framework dependence warned about in applied-practice 3.2) in one module — more indirection at the seam, but the rest of the system stops knowing *how* its dependencies are built. Centralize assembly; keep consumers ignorant of construction.
- **PRISM hit:** PRISM's dispatcher registration (each dispatcher binding the engines it serves) is a composition-root pattern — assembly lives at the wiring layer, and consumers receive engine APIs rather than constructing engines. Keep the assembly concentrated there, not duplicated into every consumer.

### B2. Choose the IoC mechanism deliberately — injection vs service-locator vs config-driven binding
**CONFIRMED** (same source): IoC is implemented by several distinct mechanisms — **dependency injection** (**"a dependent object or module is coupled to the object it needs at run time"**), the **service-locator pattern**, **callbacks/schedulers/event-loops/template-method** (**"examples of design patterns that follow the inversion of control principle"**), and **dynamic configuration** where code is **"linked statically during compilation, but finding the code to execute by reading its description from external configuration."**
- **WHEN an expert reaches for it:** every wiring seam is a choice among these — injection (caller hands in the dependency, statically traceable), a locator (callee asks a registry, looser), or config-driven binding (the edge lives in data).
- **Trade-off DIRECTION:** injection keeps the edge visible to static tooling (preserving the blast-radius advantage from foundations 6); a service-locator / config-driven edge is more flexible but becomes the *invisible edge* that defeats "find references." Prefer the most statically discoverable mechanism the requirement allows.
- **PRISM hit:** prefer a real import + an action contract (injection-style, statically discoverable) over a registry lookup or config-resolved edge, so `/impact` and the wiring audits can actually see the dependency — reserve dynamic/config binding for edges that genuinely must vary at runtime.

---

## Theme C — Principled cycle-breaking (beyond "just merge them")

Applied-practice said a true cycle should become one module. The advanced toolkit is how you (1) *find* cycles precisely and (2) *break* a cycle you must keep separate.

### C1. Detect and isolate cycles via strongly connected components + condensation
**CONFIRMED** ([Strongly connected component, Wikipedia](https://en.wikipedia.org/wiki/Strongly_connected_component)): an SCC is a maximal strongly-connected subgraph; **"A directed graph is acyclic if and only if it has no strongly connected subgraphs with more than one vertex, because a directed cycle is strongly connected."** **Tarjan's algorithm** finds all SCCs in **"linear time (that is, Theta(V + E))"** in a single DFS pass. Collapsing each SCC to one vertex gives the **condensation**: **"each strongly connected component is contracted to a single vertex, the resulting graph is a directed acyclic graph, the condensation of G"** — which is then topologically sortable.
- **WHEN an expert reaches for it:** when a wiring graph is too large to eyeball and you need to know *exactly which nodes* form each cycle (not just that one exists) before deciding how to break it.
- **Trade-off DIRECTION:** SCC analysis is one extra linear pass over the graph, but it converts "there is a cycle somewhere" into a precise, minimal cluster to act on — and the condensation restores a sortable DAG so the rest of the graph still gets a valid build order. Cheap pass, exact diagnosis.
- **PRISM hit:** a wiring audit that fails loud on cycles (applied-practice 1.1) should report the **SCC** — the exact engine/dispatcher set in the loop — and topo-sort the condensation so the acyclic remainder still builds. Naming the SCC tells romeo precisely where the back-edge lives.

### C2. Break a required cycle by inverting the dependency onto an abstraction the high-level module owns (DIP)
**CONFIRMED** ([Dependency Inversion Principle, Wikipedia](https://en.wikipedia.org/wiki/Dependency_inversion_principle)): **"High-level modules should not import anything from low-level modules. Both should depend on abstractions (e.g., interfaces),"** and **"Abstractions should not depend on details. Details (concrete implementations) should depend on abstractions."** The inversion is in *ownership*: **"the abstracts are owned by the higher/policy layers,"** so the low-level implementation conforms to an interface the high-level module defines — reversing the traditional dependency direction.
- **WHEN an expert reaches for it:** when two modules genuinely must interact but merging them (the applied-practice answer) is wrong — you introduce an interface **seam** so the concrete back-edge becomes a dependency on an abstraction, eliminating the cycle without fusing the modules.
- **Trade-off DIRECTION:** DIP adds an interface/abstraction layer (more indirection, the leaky-abstraction caveat from applied-practice 2.2 still applies), but it converts a forbidden concrete cycle into two acyclic edges pointing at a shared contract — pay one abstraction to keep two modules separately reusable and testable.
- **PRISM hit:** when engine A and a dispatcher need each other, define the seam as an interface the higher-level (policy) side owns and have the lower-level side implement it — the wiring edge now points at the contract, not the concrete peer, so the cycle is gone but the modules stay distinct.

---

## Theme D — Diamond resolution and version skew at graph scale

Applied-practice flagged version skew as a gotcha. The advanced layer is the *resolution algorithm* — how a world-class system actually picks one version when the graph disagrees.

### D1. Resolve the diamond with Minimal Version Selection — newest of the required minimums, not newest available
**CONFIRMED** ([Minimal Version Selection, Russ Cox / research.swtch.com](https://research.swtch.com/vgo-mvs)): MVS builds the version list by starting **"with the target itself, and then append[ing] each requirement's own build list. If a module appears in the list multiple times, keep only the newest version"** — i.e. it selects **the minimum version that satisfies all requirements, not the newest** available. This is the diamond-dependency answer: when two paths require different versions of a shared dependency C, MVS picks the highest of the explicitly-required versions, and **"users will never get a version of C that some module in the program did not explicitly request."**
- **WHEN an expert reaches for it:** any time multiple consumers in the wiring graph depend on different versions of one shared producer (the diamond) and you need a single, reproducible choice.
- **Trade-off DIRECTION:** MVS favors **reproducibility and minimal surprise** over always-latest — you trade "automatically pick the newest" for "pick exactly the oldest version that satisfies everyone, deterministically." Deterministic and high-fidelity, not bleeding-edge.
- **PRISM hit:** when several galaxies wire to different revisions of one shared engine contract, the conservative resolution is the newest *explicitly required* revision — not whatever is newest on disk — so the build is reproducible and no consumer silently gets a contract nobody asked for.

### D2. Keep version selection tractable and assume forward-compatibility (the import compatibility rule)
**CONFIRMED** (same source): MVS stays polynomial — it **"lie[s] in the intersection of three of the six tractable SAT subproblems: 2-SAT, Horn-SAT, and Dual-Horn-SAT,"** avoiding the **NP-complete** general constraint-satisfaction that newest-wins/SAT-based managers must solve. It rests on the **import compatibility rule**: the assumption that **"packages in any newer version should work as well as older ones,"** which lets requirements specify **only minimum versions** rather than maximum/exclusion constraints. A build is **"high-fidelity when it deviates from the author's own build only to satisfy a requirement elsewhere."**
- **WHEN an expert reaches for it:** when designing the *constraint shape* of your dependency specs — minimum-only constraints keep resolution tractable; max-bounds and exclusions push you toward an NP-complete solver.
- **Trade-off DIRECTION:** minimum-only specs + forward-compatibility assumption buy polynomial, predictable resolution; they cost you the ability to express "must be *below* version X" (you instead enforce compatibility via a major-version/contract bump, per applied-practice 6.2). Constrain less, resolve faster, signal breakage out-of-band.
- **PRISM hit:** model an engine action contract so consumers depend on a **minimum** compatible contract version and a backward-incompatible change is a major-bump signal (applied-practice 6.2) — this keeps the wiring resolution tractable and matches the "clone don't fork / one canonical contract" rule that fights version promiscuity.

---

## Owner-gate (NOT promoted)

Deliberately left for romeo (wiring owner) to verify against PRISM's actual wiring tooling before any of it is hardcoded into an engine, skill, or audit:

- **No numeric thresholds, cutoffs, or constants are promoted here.** This is a cutting-domain galaxy in name only for wiring, but the rule still binds: any concrete value — a staleness window, a trace-store size cap, an `/impact` traversal depth limit, a graph-size threshold above which full re-evaluation beats incremental (the incremental-computing trade-off in A4), a version-pin floor, or an audit-latency budget — is owner-gated and stated nowhere above. Romeo sets these against live data.
- **Which scheduler/rebuilder PRISM's wiring/test re-run actually implements.** Theme A names the design axes (scheduler x rebuilder, static vs dynamic scheduling, dirty-bit vs trace rebuilders). Whether PRISM's incremental wiring/index re-run uses a topological vs suspending scheduler, and a dirty-bit vs trace-based rebuilder, is NOT asserted — romeo to read the live tooling.
- **Whether the live wiring audit runs SCC/condensation cycle detection.** Theme C1 prescribes SCC + condensation as the precise way to find and report cycles; whether PRISM's audit (`stop_on_unwired_assets` / `stop-auto-wire.mjs` / the NN-GRAPH tier-5 cascade) computes SCCs or just an orphan/edge check is unverified here (and CLAUDE.md notes `stop_on_unwired_assets` is currently bypassed fleet-wide) — flagged for romeo.
- **Whether engine action contracts carry an MVS-style version/compat signal.** Theme D assumes a producer/consumer contract version that resolution can read. PRISM uses `schemaVersion` on state JSON; whether engine *action contracts* expose an analogous minimum-version/compat signal the wiring audit consumes is unverified — romeo to confirm.
- **The composition-root mapping.** Theme B maps DI assembly to PRISM's dispatcher registration as a composition root; the exact assembly/lifetime semantics of the live registration path are romeo's to verify, not to be inferred from this page.

## Sources

Distinct free/legal sources WebFetch-confirmed for this entry (2026-06-10):

1. Build Systems a la Carte (Mokhov, Mitchell, Peyton Jones) — Microsoft Research publication page (executable framework decomposing build systems into recombinable scheduler + rebuilder components; static vs dynamic dependency / scheduling and dirty-bit..trace rebuilder taxonomy): https://www.microsoft.com/en-us/research/publication/build-systems-la-carte/
2. Incremental computing (recompute only dependents, dependency-graph transitive closure, static vs dynamic, tracking-vs-recomputation trade-off): https://en.wikipedia.org/wiki/Incremental_computing
3. Inversion of Control (IoC definition, framework owns object assembly + run-time binding, injection vs service-locator vs config-driven mechanisms): https://en.wikipedia.org/wiki/Inversion_of_control
4. Strongly connected component (SCC definition, Tarjan linear-time, condensation -> DAG, acyclic-iff-no-multivertex-SCC): https://en.wikipedia.org/wiki/Strongly_connected_component
5. Dependency Inversion Principle (high/low modules depend on abstractions, abstractions owned by policy layer, ownership-inversion cycle break): https://en.wikipedia.org/wiki/Dependency_inversion_principle
6. Minimal Version Selection — Russ Cox / research.swtch.com (minimum-satisfying version, diamond resolution, tractable SAT subproblems, import compatibility rule, high-fidelity builds): https://research.swtch.com/vgo-mvs
