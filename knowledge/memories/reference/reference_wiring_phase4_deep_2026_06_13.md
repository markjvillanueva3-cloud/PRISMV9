---
name: reference_wiring_phase4_deep_2026_06_13
description: "wiring galaxy (slot:romeo) Phase-4 deep anchor — Hermes-planned (fallback), R12-tempered. Five deeper sub-domains mastered by world-leading wiring-closure experts: pointer/alias analysis (Andersen/Steensgaard), Program Dependence Graph (Ferrante-Ottenstein-Warren), ECMAScript module graph semantics (ECMA-262 §16.2), escape analysis + effect systems, and incremental demand-driven modular analysis (Ryder/Horwitz/Sridharan). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.267Z
aliases: reference_wiring_phase4_deep_2026_06_13
---


# Wiring Galaxy — Phase-4 Deep Knowledge Anchor

## Context

Phase-2 anchor (`reference_wiring_reachability_dispatch_2026_06_13.md`) established:
- 4-shape dispatch taxonomy (switch/case · lookup-table · plain-object · array-membership `FOO_ACTIONS.includes(action)`)
- Dependency graph + reachability, dead-code/tree-shaking (Dragon Book Ch.10; Rollup, esbuild)
- AST tooling (ts-morph, SWC), call-graph + def-use chains, lazy-import / code-splitting

Phase-3 anchor (`reference_wiring_phase3_shape_reachability_2026_06_13.md`) added:
- Shape-aware reachability analyzer implementation with ts-morph (4-shape classifier)
- Import/call reachability graph from all consumer root types
- Engine→engine consumer classification (library-layer WIRED-VIA-ENGINE pattern)
- Comment/URL-aware stripping (false-negative guard — a `case` behind `//` must not clear a real orphan)
- Minimal missing-wiring contract emission; next step = replace name-heuristic in `audit-unwired-engines.mjs`

**PRISM live state (2026-06-13):** 54 UNWIRED engines (down from 593 at galaxy birth); 3,789 total; 113 WIRE-EXEMPT; 39 WIRED-VIA-ORCH. The audit runs `scripts/audit-unwired-engines.mjs` which now recognizes all 4 shapes + engine→engine consumption.

This Phase-4 anchor deposits the **next layer** — the CS sub-disciplines that a world-leading wiring-closure expert masters beyond shape-detection and basic reachability.

---

## The Deeper Increments

### 1. Pointer / Alias Analysis (Andersen 1994; Steensgaard 1996)

**What it is:** Pointer analysis determines, for each variable at each program point, the set of abstract heap locations (or symbolic engine names) it may point to at runtime. The two canonical algorithms:

- **Andersen (1994) — inclusion-based / subset-based:** Constraints are set-inclusion `pts(p) ⊇ pts(q)` for every `p = q` assignment. Propagated to a fixpoint via Datalog-like saturation. Result: flow-insensitive, context-insensitive, but **strictly more precise** than unification because it distinguishes sources and sinks.
- **Steensgaard (1996) — unification-based / equality-based:** Constraints collapse to `pts(p) = pts(q)`, computed in near-linear time via union-find. Result: faster but coarser — two pointers that *could* alias are forced into the same equivalence class even if they never do.

**Why it matters for PRISM wiring:** TypeScript DI containers (`tsyringe`, `inversify`), factory functions, and dynamic `import()` expressions produce *pointer-like* indirection where the static engine name is not visible at the assignment site. Example:

```typescript
// The dispatcher holds an abstract reference; shape-detection sees no literal name
const handler = registry.get(action);  // handler is an AbstractEngine reference
handler.execute(params);
```

Without alias analysis, `audit-unwired-engines.mjs` cannot follow the `registry.get(action)` edge to determine which concrete `FooEngine` is reached. An inclusion-based scan over the registry population at initialization time closes this gap.

**PRISM-specific application:**
- `LazyEngineRegistry` pattern: `const engine = await import('../engines/${name}.js')` — the template literal is a pointer; enumerate `name` over known action→engine maps to resolve.
- Singletons exported as `export const fooEngine = new FooEngine()` ARE pointer-safe (the name is literal at the export site) — no alias analysis needed for these.
- The array-membership shape `FOO_ACTIONS.includes(action)` is itself a pointer into the FOO_ACTIONS constant — resolved once at shape-detection time (already handled in Phase-3), but the downstream `sub-engine.handle(action)` is a second-level alias.

**Implementation note (R12):** Full Andersen on 3,789 engines is expensive. Demand-driven partial alias analysis (sub-domain 5 below) combined with a registry-population initializer scan is the practical approach.

---

### 2. Program Dependence Graph (PDG) — Ferrante, Ottenstein, Warren (1987)

**What it is:** The PDG combines two dependency relations over a procedure's statements into a single graph:

- **Control dependence edges (CDG):** Statement `S` is control-dependent on `C` if `C` is a conditional whose branch determines whether `S` executes. Computed from the post-dominator tree of the CFG: `S` is control-dependent on `C` iff there exists a CFG edge `(C→Y)` such that `Y` post-dominates `S` but `C` does not post-dominate `S`.
- **Data dependence edges (DDG):** Statement `D` is data-dependent on `S` if `S` defines a variable used by `D` with a reaching-definition path (classic def-use chain).

Together they enable **program slicing**: given a slicing criterion `(statement S, variable v)`, the backward slice is the set of all statements that *might* affect the value of `v` at `S`. Forward slicing propagates forward to find all statements *affected by* a definition.

**Why it matters for PRISM wiring:**

- **Orphan detection via slice-based reachability:** An engine `E` is provably dead (WIRE-EXEMPT-DEAD vs WIRE-EXEMPT-LIBRARY) if no forward slice from any `E.someMethod(...)` call site reaches an observable output (dispatcher response, HTTP reply, log emission, file write). The PDG makes this check precise: pure computation + no output = true dead code, not just "not found in import graph."
- **Slice-driven WIRE-EXEMPT classification:** The current heuristic uses `// WIRE-EXEMPT: <reason>` comments. A PDG-based forward slice would *verify* the claim: if the slice is empty (no externally-visible effect), the exemption is justified; if the slice reaches a response, the exemption is wrong.
- **Change impact analysis:** When a dispatcher action signature changes, a backward PDG slice from that action enumerates all engine methods that *must* be updated — the blast-radius report. This is `/impact` (per CLAUDE.md) formalized.

**Tooling:** `esprima`/`babel` AST + custom CDG/DDG builder. For TypeScript specifically, `ts-morph`'s `getReferencesInSourceFile()` approximates the DDG for identifier-level def-use; the CDG must be built separately from the CFG.

---

### 3. ECMAScript Module Graph Semantics (ECMA-262 §16.2, ES2022)

**What it is:** The ES module system defines a **Module Record** graph with precisely-specified linking and evaluation order. Key aspects that affect static reachability:

- **`import()` — Dynamic Import Expression (§16.3.6):** Returns a Promise; the module specifier may be a computed string. ts-morph resolves `import('./engines/Foo.js')` but NOT `import(\`./engines/\${name}.js\`)`. The latter is a *dynamic import* that requires alias analysis or conservative enumeration.
- **Top-Level Await (TLA, §16.3.11):** A module with TLA makes its *importers* asynchronously dependent — the importer's evaluation is suspended until the dependency resolves. For wiring audits this means: a dispatcher that `await import(...)` in its action handler is NOT a synchronous shape.
- **Re-exports (`export { X } from './Y'`):** Create *namespace transparency* — if `Y.ts` re-exports `FooEngine` from `engines/foo/FooEngine.ts`, the import graph must trace through the re-export chain to find the actual engine source. ts-morph's `getExportedDeclarations()` handles this when given the re-exporting module.
- **Circular dependencies:** ES modules handle cycles via the *linking phase* (§16.2.1): a cycle is permitted if no TDZ (Temporal Dead Zone) variable from the cycle is accessed during the cycle's evaluation. However, static circular import graphs can cause `undefined` engine references at runtime even when TypeScript compilation succeeds — a wiring audit must flag circular engine→dispatcher import chains as suspect.

**PRISM-specific application:**
- `mcp-server/src/tools/dispatchers/*.ts` use `await import('../engines/...')` (lazy-load pattern per CLAUDE.md). This is a *static* dynamic import — the specifier is a string literal, resolvable by ts-morph. No alias analysis needed for these.
- Template-literal specifiers (`\`../engines/\${category}/\${name}\``) require conservative enumeration: intersect the `category` and `name` domains (readable from the registry) to produce the reachable engine set.
- Re-export chains in `src/engines/index.ts` barrel files must be traversed to correctly attribute a re-exported engine to its defining module.

---

### 4. Escape Analysis + Effect Systems

**What it is:**

**Escape analysis** (Choi et al. 1999; Blanchet 2003) determines whether a heap-allocated object's reference *escapes* the scope in which it was created — i.e., becomes reachable from outside the creating method or thread. An object that does NOT escape is *thread-local* and *effect-local*.

**Effect systems** (Lucassen & Gifford 1988; Talpin & Jouvelot 1994) extend type systems with *effect annotations* that describe what a function *does* beyond returning a value: reads/writes to specific memory regions, raises specific exceptions, performs I/O. A function with effect `{}` (empty effect) is *pure*.

**Why it matters for PRISM wiring:**

- **WIRE-EXEMPT candidate identification:** An engine whose *only* externally-visible effects are pure computation (no I/O, no state mutation of shared objects, no dispatcher invocation) is a safe WIRE-EXEMPT candidate. An effect system would make this verifiable rather than comment-based.
- **Cross-dispatcher side-effect reasoning:** When `FooEngine.compute()` calls `BarEngine.persist()` which writes to `mcp-server/data/state/`, that write *escapes* into shared state. A dispatcher that calls `FooEngine` is therefore *transitively* responsible for the `BarEngine` state write — this is the WIRED-VIA-ENGINE pattern formalized.
- **Async effect escape:** In `async` TypeScript functions, `await`-ed promises can escape effects across microtask boundaries. A simple synchronous escape analysis is unsound for async engine methods.

**Practical approximation for PRISM:** TypeScript's type system does not natively encode effects, but:
- `readonly` fields + absence of `void`-returning methods = heuristic purity indicator.
- Engines that only `return { value, confidence, source, unit }` (the `AtomicValue<T>` pattern per CLAUDE.md) with no `writeFileSync`, no dispatcher calls, no `logger.warn`, no DB calls are very likely pure.
- A lightweight effect tagger (grep for `writeFileSync|appendFileSync|fetch|axios|pg\.query|prism_` inside engine bodies) approximates the non-pure set.

---

### 5. Incremental / Demand-Driven Modular Analysis (Ryder 1988; Horwitz 1990; Sridharan 2005)

**What it is:**

- **Incremental interprocedural analysis (Ryder 1988):** Re-analyzes only the *affected subgraph* of the call graph when a change occurs, rather than restarting from scratch. Change = add/remove an edge or modify a node's transfer function. The affected set propagates via summary recomputation.
- **Interprocedural slicing (Horwitz, Reps, Binkley 1990):** Extends PDG slicing across procedure boundaries using *summary edges* — precomputed transitive input-to-output dependences for each procedure. Allows whole-program slicing without re-expanding every callee.
- **Demand-driven points-to analysis for JavaScript (Sridharan & Bodík 2006; Feldthaus et al. 2013):** Instead of computing the complete points-to set for all variables, answers only the specific *query* `pts(p) ∋ o?` demanded by the analysis client. For PRISM: the client asks "does dispatcher D reach engine E?" — the demand-driven algorithm chases only that reachability question, not all reachability questions simultaneously.

**Why it matters for PRISM wiring at scale:**

- **3,789-engine codebase:** Full whole-program alias + PDG computation is O(n²)–O(n³) in the number of statements. Rerunning it on every `audit-unwired-engines.mjs` invocation (which fires on every session and every build) is impractical.
- **AST-hash caching:** The correct engineering solution is: hash each engine file's AST (or its `mtime`); cache the computed shape + reachability summary keyed by `(fileHash, engineName)`; on re-run, only recompute summaries for engines whose hash changed. This is the incremental analysis pattern.
- **The `PRISM_SCRUTINY_GIT_TIMEOUT_MS` pattern:** The scrutiny script already uses a 120s timeout for the git diff — this timeout reflects the cost of the unoptimized whole-diff approach. An incremental analysis with file-level summaries would make the per-engine cost ~1ms (cache hit) rather than proportional to the full corpus.
- **Demand-driven for dispatcher queries:** `audit-unwired-engines.mjs` already knows *which* engines are suspect (the UNWIRED set, currently 54). It should fire demand-driven reachability only for those 54 engines, not the entire 3,789-engine corpus. This reduces the analysis by ~98.6%.

**Implementation recipe for PRISM:**
1. On first run: compute full shape+reachability, serialize per-engine summaries to `mcp-server/data/state/wiring-summaries/<hash>.json`.
2. On subsequent runs: `mtime`-diff + AST-hash to find changed engines → recompute only those summaries → merge with cached summaries.
3. For dispatcher queries: demand-driven BFS from each dispatcher's action handler set, stopping when the engine is reached or the engine's import set is exhausted.
4. Summary cache invalidation: any change to a dispatcher file invalidates all engine summaries that reference it (reverse index).

---

## Wiring / Consumers (R15)

These 5 sub-domains feed directly into the wiring galaxy's active work:

| Sub-domain | Feeds into |
|---|---|
| Pointer/alias analysis | `audit-unwired-engines.mjs` — closes the DI-container/dynamic-import blind spot |
| PDG | WIRE-EXEMPT verification + `/impact` blast-radius formalization |
| ES module graph semantics | ts-morph reachability pass (Phase-3 next step) — re-export chain traversal + TLA-aware async dispatch |
| Escape analysis + effects | Automated WIRE-EXEMPT candidate tagging (replace comment-only heuristic) |
| Incremental demand-driven analysis | `audit-unwired-engines.mjs` performance: AST-hash cache → sub-second re-runs on 3,789-engine corpus |

**Romeo's immediate next unit** (per `H:/prism/mcp-server/src/engines/wiring/MEMORY.md`): replace the name-heuristic in `audit-unwired-engines.mjs` with the ts-morph shape+reachability pass (Phase-3). The ES module graph semantics sub-domain is directly load-bearing for that unit (re-export chain traversal in barrel files).

---

## Next (Phase-5)

Phase-5 should cover:
- **Bidirectional type inference for dispatcher contracts:** TypeScript's conditional types + mapped types can express the full action→params→result contract; a type-level linter can flag wiring mismatches at tsc time rather than at runtime.
- **Abstract interpretation / lattice-based analysis (Cousot & Cousot 1977):** The theoretical foundation for both pointer analysis and effect systems; understanding the widening/narrowing operators would allow tuning the precision/performance trade-off for PRISM's scale.
- **Concurrency + transactional wiring:** When two dispatchers both wire to the same engine singleton, the engine's shared mutable state is a concurrency hazard. `DistributedLockManager.withLock()` is the PRISM guard; a formal happens-before analysis (Lamport 1978) would make the safety proofs explicit.
- **Whole-program optimization integration:** How esbuild's tree-shaking + the wiring audit interact — an engine that is WIRE-EXEMPT-DEAD should be excluded from the esbuild bundle to reduce the `dist/` output size (currently 16GB heap build).

---

## Sources

1. Andersen, L.O. (1994). *Program Analysis and Specialization for the C Programming Language*. PhD thesis, University of Copenhagen. (Inclusion-based pointer analysis.)
2. Steensgaard, B. (1996). Points-to analysis in almost linear time. *POPL '96*. (Unification-based, near-linear.)
3. Ferrante, J., Ottenstein, K.J., & Warren, J.D. (1987). The program dependence graph and its use in optimization. *TOPLAS 9(3)*. (PDG: CDG + DDG; backward/forward slicing.)
4. ECMA-262, 13th Edition (ES2022), §16.2 — Module Semantics; §16.3.6 — Dynamic Import; §16.3.11 — Top-Level Await. https://tc39.es/ecma262/
5. Choi, J.D., Gupta, M., Serrano, M., Sreedhar, V.C., & Midkiff, S. (1999). Escape analysis for Java. *OOPSLA '99*. (Escape analysis.)
6. Lucassen, J.M., & Gifford, D.K. (1988). Polymorphic effect systems. *POPL '88*. (Effect systems foundation.)
7. Ryder, B.G. (1988). Incremental data-flow analysis algorithms. *TOPLAS 10(1)*. (Incremental interprocedural.)
8. Horwitz, S., Reps, T., & Binkley, D. (1990). Interprocedural slicing using dependence graphs. *TOPLAS 12(1)*. (Summary-edge slicing.)
9. Sridharan, M., & Bodík, R. (2006). Refinement-based context-sensitive points-to analysis for Java. *PLDI '06*. (Demand-driven points-to.)
10. Feldthaus, A., Schäfer, M., Sridharan, M., Dolby, J., & Tip, F. (2013). Efficient construction of approximate call graphs for JavaScript IDE services. *ICSE '13*. (JS demand-driven call graph; practical scale reference.)
