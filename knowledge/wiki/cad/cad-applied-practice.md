---
title: CAD Applied Practice — practitioner technique, failure modes, and gotchas for parametric modeling, DFM, and CAD data exchange
galaxy: cad
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Each practitioner gotcha below was WebFetch-confirmed against a reputable free/legal source (Hubs/Protolabs-class manufacturer DFM knowledge base, COMSOL CAD-import documentation blog, TransMagic CAD-exchange technical blog, Alibre parametric-modeling guide, Engineers Rule SOLIDWORKS practitioner guide). Sources that 404'd / 403'd / had expired TLS certs were retried once then DROPPED, not cited (dropped: gdandtbasics, protolabs design-tip slugs, solidworks.help 403, javelin-tech 403, diecastingdesign cert-expired, scispace PDF 403). The numeric DFM rules-of-thumb that a manufacturer DFM page publishes (e.g. internal-radius >= 1/3 cavity depth, draft >= 2 deg, interior fillet ~0.5x wall) are quoted as that SOURCE's published guidance and are owner-gated for delta to confirm against the part's own process/material before any cad engine hardcodes them — they are general industry guidance, not a normative standard's structural fact."
tags: [cad, applied-practice, dfm, design-for-manufacturing, parametric-modeling, feature-tree, sketch-constraints, assembly-mates, step-export, iges-healing, gotchas, tribal-knowledge]
---

# CAD Applied Practice

The **practitioner-knowledge** layer for the **cad** galaxy: the hard-won "what goes wrong and how an expert avoids it" that pure theory does not teach. This is the third leg of the cad wiki triad and is deliberately **distinct** from its siblings:

- [`cad-foundations.md`](cad-foundations.md) — the *theory* spine (MBD/PMI, B-rep/CSG, NURBS, GD&T taxonomy, STEP/ISO 10303 standards lineage). The *what-is-true*.
- [`cad-source-atlas.md`](cad-source-atlas.md) — the *living link directory* (courses, textbooks, gov portals, standards pages). The *where-to-learn-more*.
- **this file** — the *failure modes, technique decisions, and gotchas* a world-class CAD practitioner carries in their head. The *what-goes-wrong-and-how-to-avoid-it*.

> **R12 honesty boundary:** every gotcha below was fetched from a reputable free source on 2026-06-10 and is cited inline. A manufacturer's published numeric rule-of-thumb (an internal-radius ratio, a draft minimum) is quoted as **that source's guidance** — it is NOT a normative-standard structural fact and stays owner-gated for delta (see Owner-gate). The *qualitative technique* is the promoted practitioner knowledge; the *numbers* are illustrative and gated.

---

## Common failure modes (parametric modeling)

The single largest class of self-inflicted CAD pain is a **fragile feature tree** — a model that rebuilds today but shatters the moment someone edits an upstream feature. An expert builds for the edit that has not happened yet.

### 1. Under-defined sketches distort silently under parameter change

**Gotcha:** an under-constrained sketch *looks* fine but has free degrees of freedom; when a driving dimension changes, the unconstrained geometry moves in an unintended direction and the feature deforms without any error being raised. **Why it bites:** the model regenerates "successfully" so nothing flags the distortion — it is caught visually, often after it has already propagated downstream. **Expert avoidance:** fully define every sketch before building a feature on it. Per Alibre's parametric-modeling guide, *"not fully constraining sketches leads to a lack of control and predictability. It can lead to unintentional changes"* and complicates future edits ([Alibre — Design Intent: A Guide to 3D Parametric Modeling](https://www.alibre.com/blog/design-intent-a-guide-to-3d-parametric-modeling/)).

### 2. Fragile references — dimensioning to geometry that can vanish

**Gotcha:** referencing a fillet edge, chamfer, or other cosmetic/derived face when you sketch or mate. When that referenced geometry is later resized or removed, every dependent feature breaks (a "dangling reference" rebuild error). **Why it bites:** the reference is invisible in the final model — you do not see the dependency until you delete the feature that owned it. Alibre warns specifically against *"features depending on undefined surfaces,"* which *"invite unintended changes when you later modify the referenced geometry"* ([Alibre](https://www.alibre.com/blog/design-intent-a-guide-to-3d-parametric-modeling/)). **Expert avoidance:** dimension and mate to **stable reference geometry** — origin planes, axes, and points that survive edits — not to fillets/chamfers/cosmetic edges that may disappear.

### 3. Feature-order / parent-child cascade breakage

**Gotcha:** because each parametric feature is built on prior ones, reordering or editing a *parent* feature changes all its *children*; a careless edit early in the tree breaks features far below it during regeneration. **Why it bites:** the regeneration is linear over the tree, so a change at feature 3 can throw a rebuild error at feature 40, where the actual cause is non-obvious. As Alibre puts it: *"What if that feature you dimension from changes? Other features that use that feature will also change."* **Expert avoidance:** keep the tree **simple with few parent-child dependencies**, build **base geometry first** and add **computationally heavy / cosmetic features (fillets, rounds, helical features) near the end** of the tree — both for predictable edits and for rebuild performance ([Alibre](https://www.alibre.com/blog/design-intent-a-guide-to-3d-parametric-modeling/)).

---

## Technique decisions (modeling discipline)

These are the "which way do I do this" choices where the right call is non-obvious to a beginner and obvious to an expert.

### 4. Prefer geometric constraints over explicit dimensions

**Decision:** when fully defining a sketch, reach for **geometric relations** (perpendicular, equal, tangent, symmetric, collinear) before adding another driven dimension. **Why:** geometric constraints encode *design intent* that survives a parameter change — Alibre shows that leveraging perpendicularity, equality, and tangency *"preserves intent automatically when dimensions change — much better than purely dimensional sketches"* where *"any dimension updated would break our design intent"* ([Alibre](https://www.alibre.com/blog/design-intent-a-guide-to-3d-parametric-modeling/)). A geometry held square by a perpendicular relation stays square at every size; a geometry held square by two angle dimensions is one fat-fingered value away from a parallelogram.

### 5. Assembly mates: fix-first, mate incrementally, never over-mate

**Decision:** build an assembly by **fixing the first component**, then **fully defining one component at a time** against already-placed parts, resolving every mate error before adding the next. **Why:** an over-defined assembly (redundant mates) is harder to diagnose, slower to solve, and prone to nuisance errors; an under-defined one has parts that drift unpredictably. Engineers Rule's practitioner guide: *"Fix the first component... Mate to planes when possible... fully define one component before moving on to the next"* and *"resolve mate errors immediately. Ignoring them will hurt rebuild performance later"* ([Engineers Rule — Guide to Successful Mates in Your Assembly](https://www.engineersrule.com/guide-to-successful-mates-in-your-assembly/)). **Same fragile-reference rule as sketches:** mate to **planes, axes, and points** (which *"remain stable through edits, unlike model edges or fillets"*), and use **the least complex mate that accomplishes the task** ([Engineers Rule](https://www.engineersrule.com/guide-to-successful-mates-in-your-assembly/)).

---

## Design-for-machining gotchas (CAD that a CNC can actually make)

The most expensive CAD mistake is geometry that is *technically valid* but *needlessly hard to machine*. An expert designs to the tool, not against it.

### 6. Sharp internal corners cannot be milled — radius to the tool, not to zero

**Gotcha:** a perfectly square internal corner is impossible for a rotary end mill (the tool is cylindrical), so a "sharp" CAD corner forces either an undersized tool, a slow plunge, or an EDM operation — all cost. **Expert avoidance:** model internal corners with a radius matched to a standard tool, and **oversize** them where you can: Hubs' CNC design guide states *"Using the recommended value for internal corner radii ensures that a suitable diameter tool can be used,"* recommending radii at least **1/3 the cavity depth (or larger)**; if a truly sharp corner is functionally required, add a **T-bone undercut** instead of fighting tool geometry ([Hubs — How to design parts for CNC machining](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). *(The 1/3-depth ratio is Hubs' published guidance — owner-gated.)*

### 7. Deep pockets cause tool deflection and chatter

**Gotcha:** a deep, narrow cavity makes the tool stick out far from the holder, so it deflects and vibrates, ruining finish and accuracy. **Expert avoidance:** keep cavity depth modest relative to width — Hubs advises limiting cavity depth to **~4x the cavity width**, and notes anything beyond a **6:1 depth-to-diameter ratio is "deep"** and needs specialized tooling that increases cost ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). The same ratio logic governs **drilled holes**: Hubs lists hole depth as recommended **4x diameter**, typical **10x**, feasible **40x** (the last requiring special drills) ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). *(Ratios owner-gated.)*

### 8. Undercuts and tall thin walls multiply cost

**Gotcha (undercuts):** T-slots and dovetails cannot be reached with a standard end mill and require custom tooling — lead time and money. **Expert avoidance:** use **standard tool sizes** (whole-millimeter widths, 45/60-degree angles) so a stock tool exists, and leave clearance around the undercut ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). **Gotcha (thin walls):** walls below a practical minimum (Hubs cites **0.8 mm metals, 1.5 mm plastics**) lose stiffness, amplifying vibration and degrading accuracy — and plastics additionally risk warping/softening ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). *(Minimums owner-gated.)*

### 9. Over-tight tolerances and extra setups are silent cost multipliers

**Gotcha:** every tightened tolerance and every part re-orientation costs machine time the designer never sees. **Expert avoidance:** specify the **loosest tolerance that still functions** — Hubs frames typical at **+/-0.1 mm** with **+/-0.02 mm** feasible "but costly," and warns against over-specifying unless functionally critical ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). Likewise, design so features are **accessible from as few orientations as possible**: Hubs notes *"rotating and realigning the part... increases total machining time,"* with 3-4 rotations acceptable and more "excessive" ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/)). This is the practitioner's version of foundations' GD&T theory: a tolerance is the design's contract with a stochastic process — write the loosest contract the function allows. *(Tolerance/setup numbers owner-gated.)*

---

## Design-for-molding gotchas (when the CAD feeds an injection mold)

Molded-part CAD has its own failure set the machinist never sees — and getting it wrong shows up as sink marks, warp, and stuck parts.

### 10. Every vertical wall needs draft, or the part drags / sticks in the mold

**Gotcha:** a wall with zero draft scrapes the mold steel during ejection, leaving drag marks and risking a stuck part. Hubs: *"Walls without a draft angle will have drag marks on their surface, due to the high friction with the mold during ejection"* — recommending a **minimum 2 deg on vertical walls**, more for tall walls and textured finishes ([Hubs — How to design parts for injection molding](https://www.hubs.com/knowledge-base/how-design-parts-injection-molding/)). **Expert avoidance:** apply draft to every vertical face consistently from the start — retrofitting draft late forces a re-model of dependent features. *(2-degree value owner-gated.)*

### 11. Non-uniform wall thickness causes sink marks and warp

**Gotcha:** thick sections cool slower than thin ones, so the part warps and sinks where material bunches. Hubs: non-uniform walls cause *"warping... as the melted material cools"* and sink marks where interior sections solidify late; the rule is *"Use a uniform wall thickness throughout the part (if possible) and avoid thick sections"* ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-injection-molding/)). **Expert avoidance:** keep walls uniform; where thickness must change, **transition gradually** with fillets, and **core out** thick bosses/ribs rather than leaving solid mass. Hubs gives rib/boss geometry targets (rib thickness <= ~0.5x wall, boss support via ribs not merged into walls) for exactly this reason ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-injection-molding/)). *(Ratios owner-gated.)*

### 12. Sharp corners concentrate stress and disrupt flow

**Gotcha:** a sharp interior corner is a stress riser AND a flow obstruction. Hubs: *"Sharp corners result in stress concentrations which can result in weaker parts,"* recommending an **interior radius ~0.5x wall thickness** and **exterior ~1.5x** so wall thickness stays uniform around the corner ([Hubs](https://www.hubs.com/knowledge-base/how-design-parts-injection-molding/)). **Expert avoidance:** fillet interior corners as a default modeling habit — and note this is the same fillet that, per the feature-tree rule above, belongs **near the end of the tree**, not baked into the base sketch. *(Radius ratios owner-gated.)*

---

## CAD data exchange & healing gotchas (STEP / IGES round-trips)

The neutral-format handoff is where "the model was perfect in my CAD" turns into "the receiving system rejects the solid." An expert heals at the source and prefers the right format.

### 13. IGES is a surface format — solids arrive non-watertight

**Gotcha:** IGES does not natively carry solids; it carries surfaces that "happen to sit next to each other yet know nothing about each other." A solid exported to IGES typically arrives as a **disconnected surface collection** that must be stitched back into a solid — and *"IGES models are surface files and as such have no mass properties information"* (no volume/centroid/weight) ([TransMagic — Six Reasons to Avoid IGES Files](https://transmagic.com/six-reasons-to-avoid-iges-files/)). IGES also **cannot carry PMI/GD&T** (it predates them). **Why it bites feature-recognition:** a downstream machining-feature recognizer needs a **watertight solid** input — an IGES surface salad is not one. **Expert avoidance:** for solid exchange, request **STEP or a kernel format (Parasolid/ACIS)** instead; reserve IGES for legacy/surface-only cases ([TransMagic](https://transmagic.com/six-reasons-to-avoid-iges-files/)).

### 14. Translation injects sliver faces, spikes, and gaps — heal at the source

**Gotcha:** because different CAD systems represent surfaces differently, every format translation can introduce anomalies — *"incomplete surfaces with gaps,"* misaligned faces, **sliver faces** (*"a face with a high aspect ratio"*), and **spikes** (*"a region with a high aspect ratio inside a face"*), which *"often occur where several fillets of different radii meet"* ([COMSOL — Working with Imported CAD Designs](https://www.comsol.com/blogs/working-imported-cad-designs)). **Why it bites:** these defects are often sub-visual and only surface when a later operation (a blend on what is actually two edges with a sliver between them) fails. **Expert avoidance:** run a **"Heal / Check Geometry"** pass *before exporting from the source CAD* (the sending exporter, not the receiving importer, is usually where the loop was left open), and after import use repair tools to **delete short edges, slivers, and small faces below a tolerance** — but cautiously, since over-aggressive deletion can change real surface curvature ([COMSOL](https://www.comsol.com/blogs/working-imported-cad-designs)). **Compounding-damage corollary:** repeated neutral-format round-trips accumulate artifacts, so minimize the number of STEP/IGES hops a model makes.

### 15. STEP gives you a "dumb solid" — and the units may be wrong

**Gotcha:** STEP stores the final B-rep shape, **not the parametric history** — an imported STEP is a *dumb solid* you cannot edit at the sketch level. Separately, a translated file (especially legacy IGES) may arrive in the **wrong units** (inch vs mm). **Why it bites:** the dumb-solid surprise wastes an afternoon expecting an editable feature tree; the units surprise is a **25.4x scale error** that is catastrophic for any geometry/tool/clearance consumer (this is the same units-first hazard PRISM's `units-guard` exists to catch). **Expert avoidance:** plan for non-parametric edits (direct-modeling / feature-recognition) on imported STEP, and **verify units immediately after any translation** before trusting a single dimension ([TransMagic](https://transmagic.com/six-reasons-to-avoid-iges-files/), corroborated by the units-mismatch caution surfaced across CAD-exchange guidance).

---

## Verification (how an expert proves the model is right before it ships)

A model is not "done" because it rebuilds — it is done when its intent survives an edit and its geometry survives a handoff.

- **Drag-test the assembly's degrees of freedom.** A fully defined component does not move when dragged; a free one does. Dragging is the cheap check for both under-definition (parts that drift) and the nuisance errors that over-definition masks ([Engineers Rule](https://www.engineersrule.com/guide-to-successful-mates-in-your-assembly/)).
- **Edit-test the parametric intent.** Change a key driving dimension and confirm the model updates the way you intended (not just *without error*). A sketch that distorts under a parameter sweep was never fully capturing intent ([Alibre](https://www.alibre.com/blog/design-intent-a-guide-to-3d-parametric-modeling/)).
- **Run a geometry check before export.** Use the CAD's Check/Heal Geometry to find invalid faces, open surfaces, and slivers *before* the STEP/IGES handoff — the source side is where a non-watertight solid is cheapest to fix ([COMSOL](https://www.comsol.com/blogs/working-imported-cad-designs)).
- **Conformance-gate the exchange artifact.** For an MBD/PMI STEP, validate that the carried PMI is **semantic (machine-processable), not merely graphical**, and that units/watertightness survived. (The NIST STEP File Analyzer named in [`cad-foundations.md`](cad-foundations.md) §12 is the gov-grade harness for this.)

---

## Owner-gate (NOT promoted — delta must verify before any cad engine hardcodes)

The **qualitative technique** in every gotcha above is the promoted practitioner knowledge. The **numeric rules-of-thumb** are quoted as their *source's* published DFM guidance — general industry guidance, **not** a normative standard's structural fact — and stay owner-gated for delta to confirm against the actual part material/process/machine before any cad/DFM engine relies on them:

- **Machining DFM ratios** (Hubs): internal-radius >= ~1/3 cavity depth; cavity depth <= ~4x width; "deep" at 6:1 depth-to-diameter; hole depth 4x/10x/40x diameter tiers; min wall 0.8 mm metals / 1.5 mm plastics; tolerance +/-0.1 mm typical / +/-0.02 mm feasible; thread depth ~1.5x nominal diameter; "3-4 setups acceptable." These are vendor guidance — verify per machine/tool library/material.
- **Molding DFM ratios** (Hubs): draft >= 2 deg (more for height/texture); interior corner radius ~0.5x wall / exterior ~1.5x wall; rib thickness <= ~0.5x wall, height <= ~3x rib thickness; boss OD ~2x screw diameter. Vendor guidance — verify per resin/mold/tool.
- **Any of the above used as a hard gate in a cad engine** must be sourced to the part's own process spec or a normative standard, not to this wiki entry. R12: a small honestly-cited qualitative set beats a large set of vendor numbers promoted as fact.

## Sources (WebFetch-confirmed by papa, 2026-06-10)

- Hubs (Protolabs) — "How to design parts for CNC machining" (internal radii vs tool, deep pockets, walls, undercuts, tolerances, threads, hole depth, setups) — https://www.hubs.com/knowledge-base/how-design-parts-cnc-machining/
- Hubs (Protolabs) — "How to design parts for injection molding" (draft angles, uniform wall thickness, sharp corners, ribs/bosses) — https://www.hubs.com/knowledge-base/how-design-parts-injection-molding/
- COMSOL — "Working with Imported CAD Designs" (gaps, sliver faces, spikes, repair/heal tools, defeaturing caution) — https://www.comsol.com/blogs/working-imported-cad-designs
- TransMagic — "Six Reasons to Avoid IGES Files" (IGES is a surface format, no mass properties, no PMI, prefer STEP/Parasolid, dumb-solid, units) — https://transmagic.com/six-reasons-to-avoid-iges-files/
- Alibre — "Design Intent: A Guide to 3D Parametric Modeling" (fully-define sketches, geometric constraints over dimensions, parent-child / feature-order, fragile references) — https://www.alibre.com/blog/design-intent-a-guide-to-3d-parametric-modeling/
- Engineers Rule — "Guide to Successful Mates in Your Assembly" (fix-first, mate incrementally, stable reference geometry, simplest mate, resolve errors immediately) — https://www.engineersrule.com/guide-to-successful-mates-in-your-assembly/

## Cross-refs

- Theory spine: [`cad-foundations.md`](cad-foundations.md) (B-rep/CSG, NURBS, GD&T taxonomy, STEP/ISO 10303 lineage, NIST conformance tooling)
- Living source directory: [`cad-source-atlas.md`](cad-source-atlas.md) (free courses, textbooks, gov portals, standards landing pages)
- Galaxy doctrine: `mcp-server/src/engines/cad/CLAUDE.md` (cad-specific gotchas + tribal pointers)
- Galaxy memory: `mcp-server/src/engines/cad/MEMORY.md`
- Tribal: `knowledge/wiki/code-tribal/math-cad-geometry-nurbs-gdt.md`
- PRISM units-first safety rail (the 25.4x scale-error hazard in gotcha 15): CLAUDE.md SAFETY RAILS + `scripts/lib/units-guard.mjs`
