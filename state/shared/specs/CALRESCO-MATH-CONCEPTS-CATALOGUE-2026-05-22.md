# CALResCo — Mathematical Techniques Catalogue → PRISM Engines

> **Provenance** — slot `november`, 2026-05-22, session `b4c5e890`. Work order: *"calresco.org —
> see if we can use any of the math and concepts contained from that site."*
> **Companion to** `CALRESCO-COMPLEXITY-APPLICABILITY-2026-05-22.md` (the CAS-meta cut: fleet, GNN,
> Omega) and `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md`. **This file is the third cut: the
> concrete *mathematical techniques* from calresco.org applied to PRISM's *manufacturing* engines.**
> Advisory — nothing injected into `atomic-roadmap.json`.

---

## 1. Method

calresco.org's 28 substantive science pages were deep-read this morning. The first assessment
extracted *systems concepts* and applied them to PRISM-the-organization (F1–F12). This pass
extracts the **formal mathematics** — every named technique, equation, or algorithm — and asks one
question per item: *which PRISM manufacturing engine does this math improve?* Items already fully
covered by the F-series or the topology T-series are cross-referenced, not repeated.

## 2. The mathematics catalogue

| # | Math technique (calresco source) | Concrete form | PRISM engine it improves | Status |
|---|----------------------------------|---------------|--------------------------|--------|
| C1 | **Bifurcation theory / Feigenbaum cascade** (nonlin, edge-methodology) | period-doubling, logistic map `x=f(x)`, Feigenbaum δ=4.669 | `chatter_stability_lobes`, `chatter_detect`, `regen_chatter_*`, thermal-runaway | partial — see F5/T6 |
| C2 | **Phase-space reconstruction / Takens embedding** (attractors, transient-attractors) | time-delay embedding of a 1-D signal → attractor in Rⁿ | sensor pipelines, `chatter_multi_frequency`, tool-wear trajectory | **gap** — see T6 |
| C3 | **Attractor classification** (attractors) | point / periodic / strange; basin boundaries; Lyapunov exponent sign | chatter regime ID, surface-finish state, `session_stability_lyapunov` (exists!) | partial |
| C4 | **Fractal / box-counting dimension** (fractal) | `D = log N(ε) / log(1/ε)`; Koch=1.26; Hausdorff dimension | **surface metrology** — `surface_finish_*`, `roughness_convert`, `microstructure_analyze` | **gap — C-tier, concrete** |
| C5 | **NK fitness-landscape model** (fitness, emerge) | epistasis K → landscape ruggedness; correlated↔chaotic landscapes | optimizer *selection* for `sf_optimize`, `optimize_parameters`, `ga/de/pso/sa` | **gap — landscape characterizer** |
| C6 | **Pareto / evolutionary multiobjective** (multiobjective-optimisation) | dominance, Pareto front, EMOO | `moo_nsga2`, `pareto_optimize`, `sf_optimize` | have — see F1 (usage gap) |
| C7 | **Cellular automata** (automata) | local totalistic rules, neighborhoods, Wolfram class 4 | **microstructure / solidification** — `am_solidification`, `am_melt_pool`, `microstructure_analyze`; voxel `voxel_remove_path` | **gap — CA grain-growth** |
| C8 | **L-systems & Iterated Function Systems** (classifiers) | rewriting grammars + turtle geometry; contractive affine maps | **generative AM lattice geometry** — `additive_*`, `cad_part_*` | **gap — generative geometry** |
| C9 | **Kohonen Self-Organizing Map** (neural) | unsupervised topology-preserving clustering | tool-condition / material clustering — complements `kmeans_cluster`, `cluster_meanshift` | **gap — SOM** |
| C10 | **Shannon entropy / information theory** (cybernetics, quantify) | `H = −Σ p log p`; channel capacity; algorithmic (Kolmogorov) complexity | sensor-signal information content, surface-texture entropy, `quantifying-complexity` metrics | **gap — entropy metrics** |
| C11 | **Ashby Requisite Variety** (cybernetics) | controller variety ≥ disturbance variety (variety in bits) | adaptive-control action-space sizing (`rtac_*`), GNN reference pool | concept — see F2/F7 |
| C12 | **Boolean / Kauffman NK networks** (boolean) | N nodes, K inputs, canalizing functions, state-cycle attractors | discrete process-logic models; engine wiring graph | concept — see F2 |
| C13 | **Genetic-algorithm schema theorem** (genetic) | Holland: above-average schemas get exponentially more samples; coevolution | `ga_optimize`, `aco_*`; coevolved adversarial tests | have GA — see F11 |
| C14 | **Self-Organized Criticality / power laws** (perturb, quantify) | Bak sandpile; `P(s) ∝ s^−α`; avalanche statistics | chip-formation avalanches, tool-wear/scrap event statistics | concept — see F4 |
| C15 | **Hysteresis / slowly-varying-parameter dynamics** (transient-attractors) | output lags input; transient memory; probabilistic categorization | thermal-lag compensation, probabilistic feature/fault classification | concept — see F3 |

## 3. The four genuinely-new, concrete, manufacturing-grade items

Items C1–C3, C6, C11–C15 are already covered (or near-covered) by the F-series / T-series. The
**four below are new, formal, and directly buildable** — they are the real answer to "what math can
we use":

### C4 — Fractal dimension as a surface-metrology descriptor · HIGH · concrete
A machined surface is **fractal over a wide scale band** — turning, milling, grinding, and EDM each
leave a profile whose **box-counting / Hausdorff dimension** is a stable, physically-meaningful
descriptor that **Ra and Rz cannot capture** (two surfaces with identical Ra can have very
different fractal dimension, hence different fatigue, friction, and sealing behaviour). The fractal
dimension of a turned surface also **correlates with tool wear and process stability** — it drifts
as the edge degrades. PRISM has `surface_finish_*`, `roughness_convert`, `surface_measure_calc`,
`cad_surface_finish_predict` but **no fractal-dimension action**. Build: a `surface_fractal_dimension`
calc (box-counting on a profile or areal map) → a new roughness channel + a wear-correlation
feature. Math is clean (log-log regression of N(ε) vs 1/ε; numerically stable; O(n log n)).

### C5 — NK landscape-ruggedness characterizer · MEDIUM-HIGH · concrete
Kauffman's **NK model**: a fitness landscape's *ruggedness* is set by epistasis K — how strongly the
N parameters interact. K=0 ⇒ one smooth peak (gradient ascent wins); K=N−1 ⇒ maximally rugged,
fragmented (only evolutionary / population search works). PRISM has six optimizers
(`ga/de/pso/sa/aco/bayesian`) but **selects between them ad hoc**. A landscape-ruggedness
estimator — sample the process-parameter response surface, estimate the epistasis / autocorrelation
of fitness — would let PRISM **pick the right optimizer automatically**: smooth landscape → cheap
gradient/Bayesian; rugged → evolutionary. Directly improves `sf_optimize`, `optimize_parameters`,
`process_robustness`. (This is distinct from F1, which was about *outputting* a Pareto front — C5
is about *characterizing the search space* before choosing the method.)

### C7 — Cellular-automata grain-growth for microstructure & solidification · MEDIUM · concrete
CA are the **standard computational method for grain-growth, recrystallization, and dendritic
solidification** — exactly the physics behind PRISM's `am_solidification`, `am_melt_pool`,
`heat_treat_*`, and `microstructure_analyze`. A CA microstructure model (von Neumann / Moore
neighborhood, nucleation + growth rules driven by the local thermal field) predicts grain size and
morphology from a thermal history — feeding heat-treat-response and AM process-window engines with
a physically-grounded microstructure instead of empirical correlations. Math: discrete spatial
dynamics; trivially parallel.

### C8 — L-systems / IFS for generative additive-manufacturing geometry · MEDIUM · concrete
**L-systems** (context-sensitive rewriting grammars + turtle geometry) and **IFS** (contractive
affine maps) are the canonical generators of **organic, branching, and self-similar lattice
structures** — precisely the geometry additive manufacturing exists to make and that conventional
parametric CAD struggles with. A generative `lsystem_geometry` / `ifs_lattice` engine feeding the
`additive_*` / `cad_part_*` surfaces would let PRISM produce conformal lattices, branching
supports, and bone-like topology-optimized infill. IFS also gives **fractal compression** as a
compact encoding for large toolpaths / point clouds.

## 4. Recommended roadmap units (advisory — new units only; F-series units are in spec 1)

| Pri | Unit | Item | Effort | Why |
|-----|------|------|--------|-----|
| P1 | `U-SURFACE-FRACTAL-DIM` — box-counting fractal-dimension calc; new roughness channel + tool-wear-correlation feature | C4 | S–M | Concrete, clean math, real metrology value Ra/Rz miss |
| P1 | `U-LANDSCAPE-RUGGEDNESS` — NK-style epistasis/autocorrelation estimator that auto-selects the optimizer for `sf_optimize`/`optimize_parameters` | C5 | M | Makes the six existing optimizers self-routing |
| P2 | `U-CA-MICROSTRUCTURE` — cellular-automata grain-growth/solidification model feeding `am_*` + `heat_treat_*` + `microstructure_analyze` | C7 | M | Physics-grounded microstructure vs. empirical correlations |
| P2 | `U-LSYSTEM-AM-GEOMETRY` — L-system + IFS generative engine for AM lattices / branching supports, wired to `additive_*`/`cad_part_*` | C8 | M | Generative geometry conventional CAD can't do |
| P3 | `U-SIGNAL-ENTROPY-METRICS` — Shannon-entropy + algorithmic-complexity descriptors for sensor signals & surface texture | C10 | S | Cheap new feature channel; folds into the C4/T6 work |
| — | (Kohonen SOM, C9) — fold into existing clustering rather than a standalone unit; add `cluster_som` as a mode of the cluster engines | C9 | S | Low marginal value over kmeans/meanshift already present |

## 5. Bottom line

**Yes — there is genuinely usable math on calresco.org, and it is mostly *not* the same content as
the first (CAS-meta) assessment.** That assessment found systems-level diagnostics for PRISM the
organization. This pass finds **four concrete, buildable, manufacturing-grade mathematical
techniques** for PRISM the *toolchain*: fractal-dimension surface metrology (C4), NK
landscape-ruggedness optimizer-routing (C5), cellular-automata microstructure (C7), and L-system/IFS
generative AM geometry (C8). C4 is the highest-confidence, lowest-risk build — clean, numerically
stable math with real metrology value that Ra/Rz cannot deliver. The remaining catalogue items
(C1–C3, C6, C11–C15) are real but already captured by the F-series and topology T-series — use
those specs as their home, not this one.
