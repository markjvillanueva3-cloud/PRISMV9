---
title: CAD Advanced Techniques — master-model/skeleton top-down strategy, robust-reference modeling, history-vs-direct decision, configuration tables, and class-A surfacing
galaxy: cad
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced STRATEGY below was WebFetch-confirmed against a reputable free/legal source: FreeCAD official documentation (GitHub raw, topological naming problem), Wikipedia (Class A surface, Geometric continuity, Parametric design, Computer-aided design parametric-vs-direct, Design for manufacturability), GoEngineer SOLIDWORKS practitioner blog (design tables), CadActive Creo practitioner blog (skeleton models) — the last two corroborated by an aggregated WebSearch over PTC/Autodesk/SolidWorks-help/Engineers-Rule results. Sources that 404'd / 403'd / 503'd / were Anubis-blocked were retried once then DROPPED, not cited (dropped: FreeCAD wiki HTML behind Anubis, SolidWorks help 403/timeout, PTC top-down blog 403, Autodesk Inventor skeletal-modeling help 503, Ondsel toponaming blog 403, several Engineers-Rule/DesignWorld/GrabCAD slugs 404). ONLY the qualitative strategy / method / trade-off DIRECTION is promoted. Every numeric constant — surface-continuity tolerances (G1 deg deviation, G0 mm), DFM ratios, tolerance values, draft degrees, cutting parameters (SFM/RPM/IPR/chip-load/feed/DOC) — is owner-gated for delta and lives only in mcp-server/src/physics/constants.ts. State the SHAPE of the relationship, never the number."
tags: [cad, advanced-techniques, top-down-design, skeleton-model, master-model, topological-naming, robust-reference, history-vs-direct, design-tables, configurations, part-family, class-a-surface, surface-continuity, dfm-intent]
---

# CAD Advanced Techniques

The **world-leader-depth** layer for the **cad** galaxy: the state-of-the-art *strategies* an expert parametric-CAD modeler reaches for once intro theory and the common gotchas are already second nature. This is the fourth leg of the cad wiki set and is deliberately **distinct** from its siblings — read them first so this entry never repeats them:

- [`cad-foundations.md`](cad-foundations.md) — the *theory* spine (MBD/PMI, B-rep/CSG, NURBS, GD&T taxonomy, STEP/ISO 10303 lineage). The *what-is-true*.
- [`cad-applied-practice.md`](cad-applied-practice.md) — the *common* practitioner gotchas (under-defined sketches, fragile references, deep-pocket deflection, draft, STEP/IGES healing). The *what-goes-wrong-day-to-day*.
- **this file** — the *advanced STRATEGY that makes the difference at the top of the field*: how an expert architects a model so a 200-part assembly stays editable, how they pick history vs direct, how they ship a part family from one definition, and how they hit a show-surface finish. The *what-the-best-do-differently*.

> **R12-SAFETY boundary:** only the **qualitative strategy / method / trade-off DIRECTION** is promoted. Every cited source's numbers — a continuity-deviation degree, a DFM ratio, a tolerance, a draft angle, and absolutely any cutting constant (SFM/RPM/IPR/chip-load/feed/depth/coolant-psi) — are **owner-gated for delta** and live only in `mcp-server/src/physics/constants.ts`. Where a source gave a number, the technique is described and the number gated (see Owner-gate). Applied-practice's gotcha #2 (fragile references) and #3 (feature order) introduce the *symptom*; this entry promotes the *architectural strategy* that prevents the whole class — they are complementary, not duplicative.

---

## 1. Robust-reference architecture — defeat the topological-naming problem by design

The single highest-leverage advanced skill in parametric CAD is building a model whose references **cannot** go stale. This is the architectural answer to applied-practice gotcha #2; that entry says "don't dimension to a fillet," this entry says *why the whole class exists and how to engineer it away*.

### 1.1 Understand the failure: internal IDs are volatile

**Technique:** treat every face/edge/vertex reference as a liability, because the CAD kernel names topology with **internal IDs that renumber when upstream geometry regenerates**. FreeCAD's official documentation names this the **topological naming problem**: it occurs when *"a shape changing its internal name after a modelling operation (pad, cut, union, chamfer, fillet, etc.) is performed,"* which causes *"other parametric features that depend on that shape to break or be incorrectly computed"* — concretely, *"if a feature is supported on a face (or edge or vertex), the feature may break if the underlying solid changes size or orientation, as the original face (or edge or vertex) may be internally renamed"* ([FreeCAD documentation — Topological naming problem](https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/Topological_naming_problem.md)).
**When an expert uses it:** always, as a default modeling stance — and it is **not vendor-specific** (the same fragility exists in SolidWorks, NX, Creo; only the kernel's mitigation maturity differs).
**Trade-off direction:** the more downstream features hang off *generated* faces/edges, the more brittle the model; anchoring to *stable* references trades a little extra up-front datum-construction for large rebuild-robustness gains.

### 1.2 Datum-first modeling — the mitigation

**Technique:** attach sketches and features to **stable named datums** (origin planes, datum planes, axes, points) rather than to derived solid faces. FreeCAD's documentation recommends exactly this — *"support sketches not on faces, but on the main planes of the PartDesign Body's Origin, or on datum planes attached to those main planes,"* which produces *"a more stable model"* where *"each sketch can be modified essentially independently from each other"* ([FreeCAD documentation](https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/Topological_naming_problem.md)).
**When an expert uses it:** for any feature that must survive an upstream edit — the load-bearing geometry, mounting interfaces, mate references.
**Trade-off direction:** datums add a few non-solid construction objects (more tree entries) but decouple features so an upstream size/orientation change no longer cascades into a rebuild storm — robustness up, fragile-coupling down.
**PRISM cad application:** when `CADFeatureRecognitionEngine` or an electrode/trilobe generator emits or rebuilds a parametric tree, it should anchor recovered/generated features to a constructed datum frame, not to the raw recognized faces — so a parameter sweep (the validation method in §5) does not shatter the reference graph.

### 1.3 Feature-ordering strategy — cosmetic last

**Technique:** sequence the tree so **shape-defining operations come first and cosmetic/topology-multiplying operations (fillets, chamfers, drafts) come last**. Applied-practice gotcha #3 introduces this for rebuild speed; the *advanced* reason is reference stability — fillets/chamfers split one edge into many and are the largest single source of renumbered topology, so deferring them shrinks the window in which a downstream feature can grab a soon-to-be-renamed edge.
**Trade-off direction:** building cosmetic features last means the base solid looks "unfinished" longer, but the model becomes dramatically less exposed to topological-naming breaks and rebuilds faster.
**PRISM cad application:** a generator that emits a feature recipe should order it base-solid → functional-cuts → fillets/chamfers, mirroring this expert discipline.

---

## 2. Master-model / skeleton top-down assembly strategy

The technique that separates a hobbyist assembly from a production one: drive many parts from **one central definition** instead of mating independently-built parts and hoping they fit.

### 2.1 The skeleton/master model — single source of geometric truth

**Technique:** build a non-solid **skeleton part** (datums, layout sketches, reference surfaces, named parameters) that holds the assembly's interfaces, and let every component **inherit** its critical geometry and position from that skeleton. CadActive (Creo practitioner reference) defines a skeleton model as *"a feature of top-down design in which a model sets and defines design intent and product structure at the beginning of the design process"* — specialized part files of **non-solid geometry** (datums + surfaces) that *"serve as a master reference that components inherit from throughout an assembly hierarchy,"* and crucially *"when a skeleton model is modified, any part referencing it automatically updates, ensuring consistency across the assembly"* ([CadActive — Basics of Skeleton Models](https://cadactive.com/blog/2021/04/01/basics-of-skeleton-models/)).
**When an expert uses it:** for any assembly where multiple parts share an interface (a bolt-circle, a mating face, an envelope) and the fit must hold under change — i.e. essentially every real product, and mandatory for large/teamed assemblies.
**Trade-off direction:** a skeleton costs up-front planning (you design the interfaces before the parts) but converts a "change ripples through dozens of parts by hand" problem into a **single-point-of-change** edit that propagates automatically — change-management cost down, initial-architecture cost up.

### 2.2 Top-down vs bottom-up — the directional choice

**Technique:** choose **top-down** (intent flows down from a layout/skeleton into parts) when interfaces and fit dominate; choose **bottom-up** (model parts independently, assemble later) only when parts are truly independent or off-the-shelf. The non-solid skeleton is excluded from mass/BOM, so it controls geometry without polluting the bill of materials ([CadActive](https://cadactive.com/blog/2021/04/01/basics-of-skeleton-models/)).
**When an expert uses it:** top-down for in-house, interface-coupled, change-prone designs; bottom-up for catalog hardware and one-off independent parts.
**Trade-off direction:** top-down maximizes fit-correctness-by-construction and parallel team work at the cost of a more disciplined, less ad-hoc start; bottom-up is faster to begin but accumulates mis-fit / rework risk as the assembly grows.
**PRISM cad application:** for a generated assembly (e.g. an electrode + holder + fixture set), emit a skeleton carrying the shared datums/interfaces and derive each component from it — so a single envelope change re-drives the whole set, exactly the propagation a downstream CAM/clearance consumer needs to stay coherent.

### 2.3 Multi-skeleton hierarchy for large products

**Technique:** when one skeleton would be overcrowded, **derive sub-skeletons** from the master so design parameters are controlled hierarchically per sub-assembly (the formalized "multi-level skeleton" approach). This keeps each level's skeleton legible while preserving top-down propagation across the whole product tree.
**Trade-off direction:** more skeleton files to maintain, but each stays simple and the parameter-control hierarchy mirrors the product structure — scalability up, per-skeleton complexity down.

---

## 3. History-based vs direct (explicit) modeling — the strategic decision

An expert does not religiously prefer one; they pick the paradigm that matches the job and **switch deliberately**.

### 3.1 When to stay history-based (parametric)

**Technique:** keep the full feature **history/timeline** when the design will be **edited repeatedly, parameterized, or configured** — because history is where *design intent* lives. Wikipedia's CAD overview frames parametric modeling as making *"objects and features ... modifiable. Any future modifications can be made by changing on how the original part was created,"* maintaining *"geometric and functional relationships"* under change ([Wikipedia — Computer-aided design](https://en.wikipedia.org/wiki/Computer-aided_design)); parametric design lets *"the designer ... reveal the versions of the project ... without going back to the beginning, by establishing the parameters and ... the relationship between the variables"* ([Wikipedia — Parametric design](https://en.wikipedia.org/wiki/Parametric_design)).
**Trade-off direction:** history captures intent and enables configuration/automation, but demands disciplined construction (robust references, §1) and carries a regeneration/rebuild cost that grows with tree depth.

### 3.2 When to go direct (explicit / history-free)

**Technique:** use **direct modeling** — push/pull edits on the geometry itself — when there is **no useful history to preserve**: an imported "dumb solid" (a STEP with no feature tree, per applied-practice gotcha #15), a late one-off edit, or a quick what-if where rebuilding intent would cost more than it returns. Wikipedia: direct modeling provides *"the ability to edit geometry without a history tree,"* where the designer *"modifies only the resulting geometry — no original sketch reference needed,"* yet can still preserve local *"relationships between selected geometry (e.g., tangency, concentricity)"* ([Wikipedia — Computer-aided design](https://en.wikipedia.org/wiki/Computer-aided_design)).
**When an expert uses it:** repairing/editing imported neutral-format geometry, fast concept exploration, or any edit on a model whose history is absent or untrustworthy.
**Trade-off direction:** direct trades away parametric intent and configurability for freedom from the dependency chain and immediate edits on history-less geometry — the right call exactly when there is no intent worth keeping.
**PRISM cad application:** this is the principled decision behind the "imported STEP is a dumb solid" gotcha — a feature-recognition pass *recovers* enough intent to go parametric, but where recovery is not worth it, direct edits on the recognized B-rep are the correct, expert-sanctioned route rather than forcing a brittle synthetic history.

---

## 4. Configuration / parameter tables — ship a part family from one definition

The strategy that turns one model into a catalog: drive a **family of variants** from a single parametric master via a table, instead of maintaining one file per size.

### 4.1 Design tables / configurations

**Technique:** represent a part family as **one configured model** whose variants are rows in a parameter table (dimensions, feature suppression states, materials, custom properties). GoEngineer (SOLIDWORKS practitioner reference): design tables let you *"quickly build and manipulate Part and Assembly Feature parameters in different configurations,"* controlling *"dimensions and feature suppression states, equations and sketch relations, materials and custom properties"* — the Allen-wrench example replaces *separate part files for each size variant* with *one part file containing multiple configurations* ([GoEngineer — SOLIDWORKS Design Tables Made Easy](https://www.goengineer.com/blog/solidworks-design-tables-made-easy)).
**When an expert uses it:** for any true part family — fastener series, fitting sizes, a scalable bracket — where parts *"have similar features and generally vary a few dimensions."*
**Trade-off direction:** a configured model trades a larger single file (and a regeneration step) for eliminating per-variant file proliferation and guaranteeing the whole family updates from one edit; GoEngineer flags the cost directly — *"multiple configurations can lead to an increase in file size resulting in performance issues."*

### 4.2 Drive as few parameters as possible — "customer inputs"

**Technique:** when configuring, **minimize the driven parameters**, exposing only the ones a *consumer of the family actually chooses* and letting everything else follow from equations/relations. This is a design-intent discipline, not just tidiness: the fewer the inputs, the harder it is to produce an invalid or self-contradictory variant.
**Trade-off direction:** pushing logic into equations/relations up front (more setup) yields a family that is near-impossible to mis-configure and trivial to extend — robustness and extensibility up, input surface down.
**PRISM cad application:** when the cad galaxy emits a parametric family (electrode/trilobe sizes, fixture variants), expose the minimal "customer-input" parameter set and derive the rest — so a downstream quote/CAM consumer selects a valid variant by a few inputs, never by hand-editing dependent dimensions.

---

## 5. Class-A surfacing and the surface-continuity strategy (vs solid modeling)

The top-of-field skill for any *visible* or *aerodynamic* surface: control not just where surfaces meet but how *smoothly* — a discipline ordinary engineering-solid work never touches.

### 5.1 Continuity-level intent — G0 vs G1 vs G2 (and higher)

**Technique:** specify the **geometric-continuity level** a junction must hold, not merely that surfaces touch. Wikipedia defines the ladder precisely: **G0** — *"the curves touch at the join point"* (position only); **G1** — *"the curves also share a common tangent direction at the join point"*; **G2** — *"the curves also share a common center of curvature at the join point"* ([Wikipedia — Geometric continuity](https://en.wikipedia.org/wiki/Geometric_continuity)). The directional rule for aesthetics is explicit: *"For good aesthetics ... higher levels of geometric continuity are required,"* and *"a class A surface requires G2 or higher continuity to ensure smooth reflections in a car body."*
**When an expert uses it:** any consumer-visible, reflective, or flow-critical surface (automotive body, consumer-product shell, airfoil); ordinary internal structural surfaces can live at G0/G1.
**Trade-off direction:** higher continuity costs more control points, tighter patch layout, and modeling effort, but buys reflection-smooth, undulation-free surfaces; under-specifying continuity yields visible tangent kinks or curvature jumps that no amount of polishing hides.

### 5.2 Class-A surfacing vs solid modeling — different objective functions

**Technique:** recognize that **class-A surfacing optimizes for surface quality (aesthetic reflectivity + curvature continuity), whereas solid modeling optimizes for manufacturable volume** — and that show-surfaces should be modeled as high-continuity surfaces first, then thickened/solidified, not extracted from a solid built for function. A Class A surface is *"a freeform surface of high efficiency and quality, in terms of aesthetical reflectivity,"* expected to hold *"G2 or G3 geometric continuity,"* distinct from lower-continuity engineering ("Class B") surfaces that are *"acceptable for everything to go well in CAM/CAD"* but lack the reflection quality ([Wikipedia — Class A surface](https://en.wikipedia.org/wiki/Class_A_surface)).
**When an expert uses it:** styling/show surfaces lead the model (surface-first), with structure built behind them; for purely functional parts the solid leads and surfacing is incidental.
**Trade-off direction:** a surface-first class-A workflow costs specialized surfacing effort and a curvature-comb review pass, but is the only route to a premium visible finish; forcing a class-A look out of a function-first solid almost always fails the reflection test.
**PRISM cad application:** the cad galaxy must recognize that a *cosmetic/styling* surface and a *functional* solid have different success criteria — when round-tripping or generating visible geometry, preserve the rational NURBS weights and patch continuity (foundations §6 — the weight is where exactness lives) so a G2 junction is not silently degraded to G0 by a lossy operation, the surfacing analog of the units-/weight-leak class of error.

---

## 6. DFM feature-intent strategy — design to the process, encoded in the model

The advanced framing of design-for-manufacturing: not a checklist of minimums (applied-practice covers those) but the **strategic stance** that geometry and tolerance choices are a contract with a real, stochastic process — and that the contract should be encoded as model intent.

**Technique:** treat manufacturability as a **first-class design input from the outset**, designing *to* the chosen process's capabilities rather than retrofitting machinability later. Wikipedia frames DFM as *"the engineering practice of designing a product to reduce the cost of its manufacture and to make its manufacture easier,"* where *"probable production problems may be addressed during the design stage"* and the directional rule on precision is unambiguous: *"specify the loosest tolerance that will serve the function of the component"* rather than over-specifying ([Wikipedia — Design for manufacturability](https://en.wikipedia.org/wiki/Design_for_manufacturability)).
**When an expert uses it:** at concept time and at every feature — choosing the radius, wall, draft, and tolerance the intended process can economically achieve, not the nominal a CAD cursor can draw.
**Trade-off direction:** designing-to-the-process constrains geometric freedom early but removes the expensive late surprise (an un-machinable corner, an un-ejectable wall, an un-holdable tolerance); the loosest-functional-tolerance rule trades nothing real away and removes cost the designer never sees.
**PRISM cad application:** this is the strategic spine of the `cad-dfm` path — a feature-recognition / DFM pass should evaluate each feature against the *process's* capability envelope (held in `constants.ts`, owner-gated) and flag the *direction* of any violation (e.g. "internal radius below tool reach — increase radius or move to EDM"), never asserting a specific machinable number in the wiki. The applied-practice gotchas are the symptoms; designing-to-the-process is the strategy that prevents them.

---

## Owner-gate (NOT promoted — delta must verify before any cad engine hardcodes)

Only the **qualitative strategy / method / trade-off DIRECTION** above is promoted. Every number any cited source mentioned is owner-gated for delta and must come from `mcp-server/src/physics/constants.ts` or the part's own process/standard spec — never from this wiki:

- **Surface-continuity numeric tolerances** — the specific G0 positional tolerance (mm) and G1 maximum tangent deviation (degrees), and any "G2/G3 required" numeric thresholds a vendor publishes. The *ladder* (G0 position → G1 tangent → G2 curvature → higher) and the *direction* ("aesthetics need higher continuity") are promoted; the numeric deviations are gated.
- **All DFM ratios and minimums** — internal-radius-to-depth ratios, depth-to-width/diameter ratios, hole-depth tiers, minimum walls, draft degrees, corner-radius-to-wall ratios, rib/boss ratios, and "typical vs feasible" tolerance values. These are vendor/process guidance (already gated in `cad-applied-practice.md`), not promoted facts.
- **Every cutting / machining constant** — SFM, RPM, IPR, chip-load, feed, depth-of-cut, stepover, coolant pressure (psi), kc1.1, Taylor C/n. These are categorically owner-gated for a cutting galaxy and live ONLY in `constants.ts`. No advanced-technique discussion above states one; each describes the *relationship shape* (e.g. "deeper/narrower pocket → more tool deflection → reduce engagement") and gates the number.
- **Tolerance-stack and statistical constants** — any RSS/worst-case formula constants, sigma-coverage percentages, or "reduces stack by ~sqrt(n)" heuristics (also gated in `cad-foundations.md`). The *strategy* (loosest functional tolerance, design to a stochastic process) is promoted; the math constants are gated.
- **Design-table / configuration numeric limits** — any specific file-size or configuration-count performance thresholds. The *trade-off direction* ("more configurations → larger file → performance cost") is promoted; specific limits are gated.

Why gated, in one line: **a small honestly-verified strategy set beats a large unverified one** (R12), and a numeric direction-error in a cutting/clearance galaxy is scrap/crash-class — numbers come from the normative spec or `constants.ts`, not a blog or a wiki.

## Sources (WebFetch-confirmed by papa, 2026-06-10)

- FreeCAD documentation — "Topological naming problem" (internal-name volatility on pad/cut/union/chamfer/fillet; datum-first mitigation; sketches on Origin/datum planes for a stable model) — https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/Topological_naming_problem.md
- CadActive — "Basics of Skeleton Models" (skeleton = non-solid master reference that components inherit; modify-once propagation; excluded from mass/BOM) — https://cadactive.com/blog/2021/04/01/basics-of-skeleton-models/
- Wikipedia — "Computer-aided design" (parametric/history modeling preserves intent under change; direct/explicit modeling edits geometry without a history tree) — https://en.wikipedia.org/wiki/Computer-aided_design
- Wikipedia — "Parametric design" (parameters drive geometry; reveal versions without restarting; relationship between variables) — https://en.wikipedia.org/wiki/Parametric_design
- GoEngineer — "SOLIDWORKS Design Tables Made Easy" (one model, many configurations via embedded Excel; dimensions/suppression/materials/properties; file-size trade-off) — https://www.goengineer.com/blog/solidworks-design-tables-made-easy
- Wikipedia — "Geometric continuity" (G0 position / G1 tangent / G2 curvature; higher continuity for aesthetics; class-A needs G2+) — https://en.wikipedia.org/wiki/Geometric_continuity
- Wikipedia — "Class A surface" (freeform aesthetic-reflectivity surface; G2/G3 expectation; distinct from lower-continuity engineering surfaces) — https://en.wikipedia.org/wiki/Class_A_surface
- Wikipedia — "Design for manufacturability" (design to reduce manufacture cost/difficulty; address production problems at design stage; loosest functional tolerance) — https://en.wikipedia.org/wiki/Design_for_manufacturability

## Cross-refs

- Theory spine: [`cad-foundations.md`](cad-foundations.md) (B-rep/CSG, NURBS weights, GD&T taxonomy, STEP/ISO 10303, NIST conformance tooling) — §6 NURBS exactness underpins §5 continuity-preservation here
- Common gotchas: [`cad-applied-practice.md`](cad-applied-practice.md) (fragile references #2, feature-order #3, dumb-solid STEP #15 — the symptoms this entry's strategies prevent)
- Living source directory: [`cad-source-atlas.md`](cad-source-atlas.md) and [`cad-resource-atlas.md`](cad-resource-atlas.md)
- Galaxy doctrine: `mcp-server/src/engines/cad/CLAUDE.md` (cad-specific gotchas + tribal pointers)
- Galaxy memory: `mcp-server/src/engines/cad/MEMORY.md`
- Tribal: `knowledge/wiki/code-tribal/math-cad-geometry-nurbs-gdt.md`
- PRISM units-first safety rail + owner-gated physics constants: CLAUDE.md SAFETY RAILS + `mcp-server/src/physics/constants.ts`
