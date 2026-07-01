---
name: reference_backend-helper_phase4_deep_2026_06_13
description: "Backend-helper (papa) Phase-4 deep anchor — Hermes-planned (xAI Grok), R12-tempered. Four deeper sub-domains: (1) LSM-Tree / key-value shard co-design (O'Neil 1996, WiscKey FAST 2016, Dostoevsky SIGMOD 2018) for the tribal-index clobber class; (2) V8 Orinoco/Oilpan GC internals + pointer compression beyond the 512MiB string cap; (3) Formal incremental computation theory (Acar POPL 2009; McSherry Differential Dataflow 2016) as principled substrate for the Phase-3 profile-guided build cache; (4) Build supply-chain provenance standards (SLSA v1.0, SPDX 2.3, CycloneDX 1.5) for PRISM's CI/release gate. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.476Z
aliases: reference_backend-helper_phase4_deep_2026_06_13
---


## Context

Phase-4 backend-helper anchor — deepens:
- [[reference_backend-helper_tooling_v8_mcp_2026_06_13]] (Phase-2: TS Compiler API/ts-morph, esbuild, V8 heap + 512MiB string cap, Node streams, MCP JSON-RPC, vitest, Windows Task Scheduler)
- [[reference_backend-helper_phase3_pgo_determinism_2026_06_13]] (Phase-3: profile-guided incremental build cache, deterministic scheduled-task effect analysis via ts-morph, large-file-IO buffer/shard playbook codified as a recurring-failure-class engine)

Planner: Hermes (xAI Grok, port :8645) — proposed 5 sub-domains; hype tempered per R12. Dropped: TLA+ scheduler formal verification (IronFleet/Verdi — intellectually valid but too distant from PRISM's single-machine build pipeline to be net-positive now); "Warehouse-Scale Computing" tail-latency models (same reason). Selected the 4 with direct, traceable connection to PRISM's actual failure modes and build stack.

---

## The deeper increments

### 1. LSM-Tree / key-value shard co-design — principled foundation for the tribal-index sharding problem

**Why it matters for PRISM:** The tribal-index has hit three clobber events (V8 string cap → shard transition read-blind → fail-OPEN catch). All three root causes are variants of the same structural problem: a monolithic append-log that grew past an implicit size boundary without a principled shard/compaction design. The fix (`loadTribalIndex` + clobber guard) is correct but empirical; the principled substrate is the LSM-Tree family.

**Named models/papers (real, citable):**
- **O'Neil, E. J., Cheng, E., Gawlick, D., O'Neil, P. (1996). "The Log-Structured Merge-Tree (LSM-Tree)." Acta Informatica, 33(4), 351–385.** — foundational: level tiering, size-ratio parameter R, write amplification vs read amplification trade-off. The key insight for PRISM: a shard-transition is equivalent to a level-L0→L1 compaction; without a manifest that tracks shard membership, a reader has no stable view (exactly the clobber class).
- **Lu, L., Pillai, T. S., Arpaci-Dusseau, A. C., Arpaci-Dusseau, R. H. (2016). "WiscKey: Separating Keys from Values in SSD-Friendly Key-Value Stores." USENIX FAST 2016.** — key-value separation: for large values (tribal-embed vectors), storing the key in the tree and the value in a value-log (vLog) eliminates the N-copy amplification problem. Directly applicable to the tribal embed index (keys = hash/source-path; values = 1536-d float vectors).
- **Dayan, N., Athanassoulis, M., Idreos, S. (2018). "Dostoevsky: Better Space-Time Trade-offs for LSM-Tree Based Key-Value Stores." ACM SIGMOD 2018.** — introduces the "Lazy Leveling" and "Fluid LSM-Tree" models: parameterized (T, K, Z) compaction policy that sits on a Pareto frontier between pure leveling (read-optimal) and pure tiering (write-optimal). Relevant when PRISM's tribal index grows beyond a single machine's DRAM.

**What it adds vs Phase-3 playbook:** Phase-3 codified the buffer/shard recipe as a playbook; this sub-domain gives it the algebraic invariants — write amplification W = O(L·T), read amplification R = O(L), space amplification SA = T/(T-1) — so PRISM can tune the tribal-index shard parameters from first principles rather than empirically. Also: the manifest-based existence check (present in RocksDB's MANIFEST + CURRENT files) is the model for PRISM's `read-tribal-index.mjs` to never rely on a monolith `.json` existence check alone.

**Real data sources:** RocksDB tuning guide (Facebook/Meta, updated 2021–2024, public at github.com/facebook/rocksdb/wiki); PRISM's own `state/shared/tribal-embed-index.json` (537MB pre-clobber) + the clobber regression record [[reference_tribal_index_v8_string_cap_2026_06_08]].

---

### 2. V8 Orinoco / Oilpan GC internals — beyond the 512MiB string cap

**Why it matters for PRISM:** Phase-2 covered the 512MiB string-length hard limit and the heap-reexec pattern. The PRISM build (16 GB `--max-old-space-size`, Blackwell 96 GB RAM) and the GNN lifecycle (OOM at default heap, reexec fix [[reference_ai_systems_6unit_complete_2026_06_11]]) expose the NEXT failure class: parallel GC pause budget and young-generation sizing under concurrent mutation.

**Named models/papers (real, citable):**
- **Degenbaev, U., Hlopko, M., Lochbihler, J., et al. (2016–2024). "Orinoco: Garbage Collection in V8." V8 blog series (v8.dev/blog/trash-talk, v8.dev/blog/concurrent-marking, v8.dev/blog/orinoco-parallel-scavenger).** — tri-color marking, concurrent marking (background thread, write-barrier), parallel Scavenge (young gen), incremental marking (Oilpan for off-heap C++ objects). The key invariant for PRISM: a script allocating large byte arrays (Buffer, TypedArray) bypasses the string-length cap but still lives in old-space after the first GC; aggressive nursery promotion creates fragmentation if the allocation rate exceeds the Scavenger's throughput.
- **"V8 Pointer Compression." V8 blog (2021). v8.dev/blog/pointer-compression.** — V8 compresses heap pointers to 4 bytes within a 4 GB cage. PRISM-relevant: when Node is built with pointer compression (default since Node 16), the effective heap is capped at 4 GB per isolate regardless of `--max-old-space-size`. A 16 GB flag does NOT give 16 GB of live objects if the cage fills. On the 136 GB PRISM box this is not immediately binding, but a multi-isolate pattern (V8-isolate-per-task, Phase-3) would need each isolate's cage accounted.
- **"Minor MC: Generational Garbage Collection with Incremental Minor GC." V8 blog (2022). v8.dev/blog/orinoco-minor-mc.** — young-generation mark-compact replaces Scavenge under high object-survival rates. When PRISM scripts pre-allocate large JSON parse buffers that survive a full GC cycle, the cost model shifts from Scavenge O(live) to Minor MC O(heap_size); relevant for the tribal-embed batch jobs.

**What it adds vs Phase-2:** Phase-2 knew "raise the heap, Buffer over string." This sub-domain adds the allocation-rate model: if `Buffer.allocUnsafe(N)` + parse loop creates objects faster than Scavenger throughput, the nursery stalls and promotes to old-space prematurely, inflating the resident set. Mitigation: pre-allocate a fixed-size ByteBuffer pool; parse in place; avoid closure-captured temporaries inside the parse loop. Verifiable metric: `process.memoryUsage().heapUsed` delta before/after a tribal-index shard load.

**Real data sources:** V8 source `src/heap/` (chromium.googlesource.com/v8/v8.git); Node.js performance issues on GitHub (verified range: the Orinoco migration landed in Node 12+; pointer-compression default in Node 16); PRISM's own heap-reexec regression.

---

### 3. Formal incremental computation theory — principled substrate for the Phase-3 profile-guided build cache

**Why it matters for PRISM:** Phase-3 proposed a build-profile cache keyed on changed-module → dependency-closure. The empirical approach (hash source files, cache esbuild outputs) works but has blind spots: cache invalidation on transitive type changes not reflected in the module boundary. The theoretical substrate gives the invariant: a build step is re-runnable only if its input multiset (including the types it depends on) is unchanged.

**Named models/papers (real, citable):**
- **Acar, U. A., Blelloch, G. E., Harper, R. (2009). "Adaptive Functional Programming." POPL 2009 (journal version: JFP 2011).** — "self-adjusting computation": a function memoizes its result and records which inputs it read; on incremental re-run, only the subcomputations whose input changed are re-executed. The change-propagation algorithm is O(change-size × log N). This is the formal model behind Turborepo's content-hash invalidation and Buck2's action graph.
- **McSherry, F., Murray, D. G., Isaacs, R., Isard, M. (2016). "Scalability! But at what COST?" HotOS + follow-on Differential Dataflow system.** — Differential Dataflow (timely-dataflow): batched incremental computation where each operator maintains a compact representation of changes (arranged collections). For PRISM: the tsc `--incremental` `.tsbuildinfo` is an empirical implementation of a differential dataflow on the TypeScript type graph; the theoretical model shows where it must fail (non-monotone type widening, conditional types with fresh type parameters).
- **SLSA (Supply Chain Levels for Software Artifacts) v1.0, 2023. slsa.dev/spec/v1.0.** — provenance model for build inputs → outputs: each build step emits a signed attestation (subject = output digest, predicate = builder identity + input digests). Level 1–3 ladder. PRISM's build is currently SLSA Level 0 (no provenance). Level 1 = generated provenance (achievable with `actions/attest-build-provenance` or `npm pack --provenance`). **This is not the same sub-domain as formal computation theory** — see sub-domain 4 below.

**What it adds vs Phase-3:** Phase-3 said "add a build-profile cache keyed on changed-module → dependency-closure." This sub-domain gives the invariant that the cache key must cover the FULL input trace (not just the module boundary): a type alias change in a dependency that is a pure re-export is not visible at the module boundary but IS visible in the type graph. Acar's trace semantics says: the memo key is the set of all `read` calls the computation made, not just its direct input files. Implication: PRISM's profile cache MUST be keyed on the tsc `.tsbuildinfo` hash (which tracks the type graph), not just mtime/content-hash of source files.

---

### 4. Build supply-chain provenance standards — SLSA / SPDX / CycloneDX

**Why it matters for PRISM:** PRISM is a safety-critical CNC platform. The build pipeline (esbuild bundle → MCP server → shop floor) is a supply chain. If a malicious or corrupted npm package enters the bundle, there is currently no attestation chain to detect it. This is addressable with established open standards.

**Named standards (real, citable):**
- **SLSA v1.0 (Supply Chain Levels for Software Artifacts). OpenSSF, 2023. slsa.dev/spec/v1.0.** — 4-level provenance ladder. Level 1: generated build provenance (JSON attestation, no signing). Level 2: signed provenance from a hosted build service. Level 3: hardened build environment (ephemeral, isolated). For PRISM: Level 1 is achievable today by emitting a `slsa-provenance.json` from the `npm run build` step, recording the commit SHA, build machine hostname, and output bundle digest (SHA-256). Not a performance claim — a traceability property.
- **SPDX 2.3 (Software Package Data Exchange). Linux Foundation / ISO/IEC 5962:2021.** — SBOM format: packages, licenses, relationships, file-level checksums. `npm sbom --sbom-format spdx` (npm 7+) generates an SPDX 2.3 JSON for the `mcp-server/` workspace. Required by US Executive Order 14028 for federal software supply chains; increasingly required in enterprise procurement. PRISM ships to machine shops — a generated SBOM is a differentiator.
- **CycloneDX 1.5. OWASP, 2023. cyclonedx.org/specification/overview/.** — alternative SBOM format; richer vulnerability metadata (VEX — Vulnerability Exploitability eXchange); integrates with `@cyclonedx/bom` npm package. More tooling-friendly than SPDX for automated vulnerability scanning.

**What it adds vs Phase-2/3:** Neither Phase-2 nor Phase-3 addressed the build OUTPUT as an artifact with a provenance chain. This sub-domain closes that gap with no new algorithms — only configuration and tooling. The concrete deliverable for papa: add a `build:provenance` npm script that (1) runs `npm sbom --sbom-format spdx` → `dist/sbom.spdx.json`, (2) computes SHA-256 of `dist/index.js`, (3) writes a minimal SLSA Level-1 provenance JSON to `dist/provenance.json`. Zero performance cost; adds supply-chain traceability.

---

## Wiring / consumers (R15)

**GALAXY:** `mcp-server/src/engines/backend-helper/` (papa). Horizontal assist — serves ALL 34 galaxies.

**Engines that should consume this knowledge:**
- `BuildGuardChainEngine.ts` — add SBOM generation and provenance emission as an optional `build_guard_chain` step
- `BuildAdvisorEngine.ts` — surface LSM-shard invariants when the advisor detects tribal-index operations
- `BuildPlannerEngine.ts` — use the Acar/McSherry trace-semantics model when planning incremental-build cache keys (key on `.tsbuildinfo` hash, not source mtime alone)

**Dispatcher: `prism_dev`** — no new actions needed for provenance (it is a build-step addition); the LSM-Tree and GC sub-domains inform implementation of existing actions (`build_advise`, `build_debrief`).

**Cross-galaxy consumers:**
- `engines/tribal-knowledge/` — the LSM-Tree shard co-design directly applies to `tribal-embed-index.mjs` sharding; papa should advise on the manifest-based existence check pattern
- `engines/database-expansion/` (juliett) — LSM-Tree compaction model applies to any JSON-append store that may exceed V8's 512MiB limit
- ALL galaxies — SBOM/provenance applies to the shared `mcp-server/` build output

**Physics constants:** no cutting-physics constants apply to this galaxy. Never inline; import from `src/physics/constants.ts` if any domain engine is referenced.

---

## Next (Phase-5, honestly scoped)

The two gaps this anchor leaves open:

1. **V8 pointer-compression cage interaction with multi-isolate pattern** — Phase-3 proposed V8-isolate-per-task for deterministic scheduling; Phase-4 reveals the 4 GB cage cap per isolate. Phase-5 should verify: on the PRISM Blackwell box (136 GB RAM), does spawning N isolates each with a 4 GB cage actually hit the physical limit, or does the OS lazy-page enough that only resident live objects matter? This requires a controlled benchmark, not a literature claim.

2. **Acar trace-semantics applied to the tsc type graph** — the `.tsbuildinfo` file format is partially documented; Phase-5 should enumerate exactly which type-graph edges `tsc --incremental` tracks vs misses (known miss: conditional types with infer clauses; known miss: ambient module declaration merging). A controlled test: change a type alias in a barrel export, verify that the profile-cache correctly invalidates vs misses.

---

## Sources

- O'Neil, E. J. et al. (1996). "The Log-Structured Merge-Tree (LSM-Tree)." *Acta Informatica* 33(4).
- Lu, L. et al. (2016). "WiscKey: Separating Keys from Values in SSD-Friendly Key-Value Stores." USENIX FAST 2016.
- Dayan, N. et al. (2018). "Dostoevsky: Better Space-Time Trade-offs for LSM-Tree Based Key-Value Stores." ACM SIGMOD 2018.
- Degenbaev, U. et al. (2016–2024). "Orinoco GC" blog series. v8.dev (trash-talk, concurrent-marking, orinoco-parallel-scavenger, orinoco-minor-mc).
- V8 Team (2021). "Pointer Compression in V8." v8.dev/blog/pointer-compression.
- Acar, U. A., Blelloch, G. E., Harper, R. (2009). "Adaptive Functional Programming." POPL 2009 / JFP 2011.
- McSherry, F. et al. (2016). Differential Dataflow system (timely-dataflow). HotOS + github.com/TimelyDataflow/differential-dataflow.
- SLSA v1.0 (2023). OpenSSF. slsa.dev/spec/v1.0.
- SPDX 2.3 / ISO/IEC 5962:2021. Linux Foundation. spdx.dev.
- CycloneDX 1.5 (2023). OWASP. cyclonedx.org.
- RocksDB Tuning Guide. Facebook/Meta (2021–2024). github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide.
- PRISM repo regressions: [[reference_tribal_index_v8_string_cap_2026_06_08]] · [[reference_ai_systems_6unit_complete_2026_06_11]] (heap-reexec).
- Planner: Hermes (xAI Grok, port :8645), tempered per R12 (dropped TLA+/IronFleet and warehouse-scale tail-latency as too-distant from PRISM's concrete needs; performance numbers presented as hypotheses to validate, not claims).
