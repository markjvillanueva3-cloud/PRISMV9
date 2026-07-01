---
name: dormant-data-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the dormant-data galaxy. 6 fetched sources. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: dormant-data
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# dormant-data galaxy -- verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched + excerpted (honest `fetched:false` markers for paywalled/unreachable sources). Physics-safe: no numeric cutting constant.

## Synthesis
The dormant-data domain rests on three interlocking theoretical pillars. First, reachability-as-liveness from garbage collection theory (Jones & Lins; SPARK/MISRA C taxonomy) gives a formal definition of dead assets: anything with zero live references in the call-graph or dependency graph is a candidate for reclamation, with the critical MISRA C refinement that unreachable (control-flow-dead) assets are a strict subset of dead assets (effect-free-but-reachable). Second, industrial-scale detection requires multi-signal analysis: static call-graph traversal surfaces syntactic orphans, but Meta's SCARF demonstrates that business-signal overlays and dynamic runtime evidence are necessary to avoid false positives at scale — a pattern directly applicable to PRISM's orphan-engine audit pipeline. Third, for data-at-rest the authoritative lifecycle framework is NIST SP 800-88's Clear/Purge/Destroy ladder, which mandates that sanitization decisions (not merely detection) are integrated across the full asset lifecycle from procurement through decommission, with formal verification and documented chain-of-custody; Hasan & Burns complement this with a proactive waste hierarchy borrowed from environmental recycling theory, treating unused digital data as a pollution class requiring systematic regeneration, reuse, or disposal policies rather than reactive ad-hoc deletion. Together these sources prescribe that any production dormant-data engine must operate as a pipeline: formal dependency-graph construction to classify assets as dead vs. dormant vs. alive, bounded-model-checking traversal for tractable coverage, multi-signal confirmation (static + dynamic + business), and a tiered disposal action (archive/purge/destroy) governed by retention policy — not a single sweep.

## Verified sources
### [The Life and Death of Unwanted Bits: Towards Proactive Waste Data Management in Digital Ecosystems](https://arxiv.org/abs/1106.6062) -- paper
> "unwanted and unused data also pollutes the digital environment by degrading the performance and capacity of storage systems and requiring costly disposal."

**Knowledge:** Hasan & Burns introduce a formal waste hierarchy for digital objects (analogous to physical recycling), proposing regeneration, reuse, and smart space-reclamation policies as first-class lifecycle operations rather than afterthoughts. Directly maps to PRISM's dormant-data galaxy: identifying and safely disposing of orphaned/stale data assets using a principled taxonomy.

### [NIST Special Publication 800-88, Revision 1: Guidelines for Media Sanitization](https://www.nist.gov/publications/nist-special-publication-800-88-revision-1-guidelines-media-sanitization) -- standard
> "Media sanitization refers to a process that renders access to target data on the media infeasible for a given level of effort. Information disposition and sanitization decisions occur throughout the information system life cycle."

**Knowledge:** NIST SP 800-88r1 (2015) defines Clear/Purge/Destroy as a three-tier reclamation ladder keyed to data-sensitivity classification. The lifecycle integration model (procurement → deployment → operation → decommission → verification → documentation) is the authoritative government framework for when dormant data must be purged vs. archived, directly informing retention-policy engines.

### [Automating dead code cleanup (Meta Engineering Blog)](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/) -- article
> "SCARF combines static and dynamic analysis of programs to detect dead code from both a business and programming language perspective."

**Knowledge:** Meta's SCARF (Systematic Code and Asset Removal Framework) is the largest public case study in industrial-scale dead-asset detection. It shows that static analysis alone produces too many false positives and must be paired with runtime call-graph evidence and business-signal overlays — exactly the multi-signal approach a dormant-data engine in PRISM should adopt for orphan-engine detection.

### [Garbage Collection: Algorithms for Automatic Dynamic Memory Management (Jones & Lins, Wiley 1996) — book review by Andrew W. Appel, Princeton University](https://www.cs.princeton.edu/~appel/papers/gcreview.html) -- textbook
> "This book is an excellent and up-to-date survey of garbage collection algorithms and techniques... to reclaim unused data structures and function closures."

**Knowledge:** Jones & Lins is the canonical CS textbook covering mark-sweep, reference counting, generational GC, and cycle detection as a unified framework for dead-object identification and reclamation. The theoretical underpinning — reachability as a proxy for liveness — is directly applicable to PRISM's orphan-asset detection: an engine or data node with zero live references in any dispatcher call-graph is dead by this definition.

### [Detecting Unreachable Code and Dead Code (AdaCore SPARK / MISRA C Developer Guide)](https://learn.adacore.com/courses/SPARK_for_the_MISRA_C_Developer/chapters/08_unreachable_and_dead_code.html) -- course
> "MISRA C defines unreachable code as code that cannot be executed, and dead code as code that can be executed but has no effect on functional behavior."

**Knowledge:** The MISRA C / SPARK distinction between unreachable code (control-flow unreachable) and dead code (no effect on outputs despite being reachable) is the field's authoritative taxonomy. SPARK detects both via dependency-graph construction linking every statement to inputs/outputs. This two-class model should drive PRISM's orphan classification: truly unreachable engines vs. reachable-but-effect-free ones that silently consume resources.

### [Towards Bounded Infeasible Code Detection (arXiv:1205.6527)](https://arxiv.org/abs/1205.6527) -- paper
> "we present a formal method to automatically compute test cases for this purpose based on the idea of a bounded infeasible code detection."

**Knowledge:** Christ, Hoenicke & Schäf formalize infeasible/unreachable code detection using weakest-precondition analysis and bounded model checking. The bounded approach (limiting the search depth) is the key insight for practical orphan detection at scale: rather than a global reachability proof (undecidable in general), PRISM's dormant-data engine should use bounded path analysis per dispatcher action to flag candidates, then confirm with dynamic call evidence.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
