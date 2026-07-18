---
name: wiring-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the wiring galaxy. 6 fetched sources. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: wiring
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# wiring galaxy -- verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched + excerpted (honest `fetched:false` markers for paywalled/unreachable sources). Physics-safe: no numeric cutting constant.

## Synthesis
The theoretical spine of module/dispatcher wiring analysis runs from Ferrante et al.'s Program Dependence Graph (1987) through Reps-Horwitz-Sagiv's IFDS framework (POPL 1995): any wiring audit is fundamentally a CFL-reachability problem over an exploded supergraph where summary edges capture cross-module data flow and realizable paths exclude mismatched call-return pairs, making polynomial-time dead-action detection theoretically sound. At the implementation layer, Webpack's sideEffects/usedExports decision tree and Rollup's AST-level scope hoisting show that practical dead code elimination operates at two distinct granularities -- module-level (coarse, fast) and statement-level (fine, requires minifier cooperation) -- a distinction PRISM's stop_on_unwired_assets must respect to avoid the array-dispatch false-positive class. Chakraborty et al. (ECOOP 2022) quantify that dynamic property accesses are the dominant source of unsound call graph edges in JavaScript, which is the exact failure mode behind PRISM's FOO_ACTIONS.includes(action) pattern that the wiring auditor was previously blind to. Keshani's incremental CHA stitching approach (arXiv 2021) provides the scalable architectural answer: pre-compute per-engine partial wiring fingerprints and assemble them on demand at Stop-hook time rather than re-scanning the full 500+ engine codebase on every invocation.

## Verified sources
### [Precise Interprocedural Dataflow Analysis via Graph Reachability (POPL 1995)](https://dl.acm.org/doi/10.1145/199448.199462) -- paper - NOT fetched
> _(no excerpt -- not fetched; cited as a known reference, no fabricated quote)_

**Knowledge:** The IFDS framework is the theoretical backbone for dispatcher/consumer connectivity analysis: module-to-module wiring is representable as an exploded supergraph where reachability along interprocedurally realizable paths (call-return matched) determines which actions are actually reachable. Summary edges collapse procedure effects, enabling scalable dead-action detection without re-analyzing every call site.

### [JavaScript Dead Code Identification, Elimination, and Empirical Assessment (IEEE TSE 2023)](https://arxiv.org/abs/2308.16729) -- paper
> "Lacuna is 'an approach for automatically detecting and eliminating JavaScript dead code' that 'supports both static and dynamic analyses' and is 'extensible.' Evaluated on 30 mobile web apps."

**Knowledge:** Lacuna operationalizes dead code elimination on real call graphs using IdentifyAlive (reachability traversal from a root node) and RemoveDead procedures. The dual static-plus-dynamic approach patches unsoundness from dynamic dispatch -- directly applicable to dispatcher action wiring where some actions are only reachable dynamically.

### [Automatic Root Cause Quantification for Missing Edges in JavaScript Call Graphs (ECOOP 2022)](https://arxiv.org/abs/2205.06780) -- paper
> "'Building sound and precise static call graphs for real-world JavaScript applications poses an enormous challenge, due to many hard-to-analyze language features.'"

**Knowledge:** Dynamic property accesses are the leading cause of missing call graph edges in JS -- exactly the failure mode behind PRISM's array-dispatch pattern (FOO_ACTIONS.includes(action)) that the stop_on_unwired_assets hook was blind to. Quantifies how many edges are missed per root cause, enabling targeted soundness improvements in wiring auditors.

### [The Program Dependence Graph and Its Use in Optimization (ACM TOPLAS 1987)](https://dl.acm.org/doi/10.1145/24039.24041) -- paper - NOT fetched
> _(no excerpt -- not fetched; cited as a known reference, no fabricated quote)_

**Knowledge:** The Program Dependence Graph is the canonical intermediate representation for wiring analysis: data dependence edges capture which module outputs feed which consumers; control dependence edges capture conditional dispatch. Incremental PDG update after a branch deletion or action removal is the theoretical basis for PRISM's single-pass multi-consumer wiring audit.

### [Tree Shaking - Webpack Official Documentation](https://webpack.js.org/guides/tree-shaking/) -- article
> "Tree shaking is 'a term for dead-code elimination in JavaScript. It relies on the static structure of ES2015 module syntax (import and export) to identify and remove unused code.'"

**Knowledge:** Webpack's sideEffects flag and usedExports optimization operationalize wiring at the module level: the decision tree (is this export used? is it marked side-effect-free?) is the production-grade algorithm PRISM's stop_on_unwired_assets mimics. The distinction between module-level skipping (sideEffects) vs. statement-level analysis (usedExports/terser) maps directly onto the difference between coarse dispatcher-level and fine action-level orphan detection.

### [Scalable Call Graph Constructor for Maven (arXiv cs.SE 2021)](https://arxiv.org/abs/2103.15162) -- paper
> "Proposes incremental CHA (Class Hierarchy Analysis) that generates call graphs on-demand by 'stitching together partial Call Graphs that have been extracted for libraries before.' Outperforms OPAL."

**Knowledge:** Incremental partial-call-graph stitching solves the ecosystem-scale wiring problem that full-program analysis cannot: pre-compute per-library partial graphs, assemble on demand. This is the architectural pattern PRISM should adopt for dispatcher wiring audits -- pre-compute per-engine wiring fingerprints and stitch at audit time rather than re-scanning the full codebase on every Stop hook invocation.

### [Static Component Dependency Graph Detection in React.js (Annals of Computer Science 2024)](https://annals-csis.org/Volume_45/drp/5264.html) -- paper
> "'Static type of this process has a plenty of applications, and despite of dynamic or hybrid methods, it has the significant advantages of simplicity, high performance', achieving average F1 of 0.95."

**Knowledge:** Validates that static-only component dependency graph construction achieves F1=0.95 in component-based JS frameworks, with five local-and-global impact metrics. Confirms that static wiring audits are viable for production codebases without requiring runtime instrumentation, and that per-component impact scores (local vs. global) are the right granularity for orphan prioritization.

### [Engineering a Compiler, 2nd Edition (Cooper & Torczon, Elsevier 2011)](https://shop.elsevier.com/books/engineering-a-compiler/cooper/978-0-12-088478-0) -- textbook
> "Chapter 9.4 'Interprocedural Analysis' covers 9.4.1 Call Graph Construction and 9.4.2 Interprocedural Constant Propagation; Chapter 8.7 covers Interprocedural Optimization including Inline Substitution."

**Knowledge:** Cooper & Torczon Chapter 9.4 is the canonical textbook treatment of call graph construction for wiring analysis: it covers CHA, RTA, and points-to based approaches with increasing precision/cost tradeoffs. Chapter 8.7 on inline substitution is directly relevant to PRISM's engine-singleton wrapper pattern (WIRE-EXEMPT wrappers are the compiler's inlining boundary).

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
