## cad — slot:delta

### Current state

**Size:** 20,573 bytes / 172 lines (galaxy CLAUDE.md at `mcp-server/src/engines/cad/CLAUDE.md`).

**Quality grade: EXCELLENT**

The cad galaxy CLAUDE.md is one of the strongest in the fleet. It was purpose-built for the Bibryam Context Cascade pattern and loaded with verified, specific content. No fabrications found. Specific findings:

- All engine names in §3 are verified present at `mcp-server/src/engines/` (confirmed by Glob — both `cadDispatcher.ts` at `mcp-server/src/tools/dispatchers/cadDispatcher.ts` and `CADFeatureRecognitionEngine.ts` at `mcp-server/src/engines/CADFeatureRecognitionEngine.ts` exist).
- §5 gotcha #1 honestly flags `CADFeatureRecognitionEngine` as a potential stub (ENGINE_DIGEST marks it "stub U-EFF25") — R12-compliant.
- §5 gotcha #7 correctly states hyperCAD v31 RUNNING (not v33) and SolidWorks COM unregistered — both still accurate per PATHS.md + MEMORY.md.
- Action counts (cadDispatcher: 564, cadAutomationDispatcher: 367) are sourced from PATHS.md with an explicit "(verify against dispatcher z.enum before quoting)" caveat — honest R12 framing.
- The AI-SYSTEMS-STATE block and CRITIC-KEEPWORKING-STANZA are **pointer-only** (no duplication of global doctrine body) — correct pattern.
- The cross-cutting methodology section (§ after §7) is somewhat long (~60 lines) and partially duplicates global CLAUDE.md content (Ollama tag roster, loop discipline, CAG/RAG/LoRA overview). Worth trimming to a pointer.
- Minor staleness risk: MEMORY.md mentions `DELTA-CONTEXT-LEDGER.md` as the startup artifact ("last reconcile 2026-06-10") — not referenced in CLAUDE.md. Low priority but worth a pointer.
- `AWARENESS.md` confirms 5 AI engines and 18 dispatcher actions but notes "reasoning/neural bridges: 0" — the galaxy-reasoning-bridge IS present in TOOLBELT.md as a bash one-liner. This is an audit-file inconsistency, not a CLAUDE.md error.

---

### KEEP

All of these sections are accurate, load-bearing, and domain-specific — keep verbatim or with only minor trim:

1. **§1 Domain scope** — precise boundary definition including the explicit EXCLUDED list (cam/post/xray/quoting/india). This is the most important section for preventing galaxy-scope drift. Keep in full.
2. **§2 Canonical constants reference** — ToleranceDB (260 entries), ThreadDB (339 entries), WorkholdingDB (14 entries), AlgorithmRegistry paths. Verified via PATHS.md registered-db-intake block. Keep in full.
3. **§3 Common cad engines (by-name pointers)** — the table of 26+ verified engine names with size hints. Directly actionable for delta. Keep in full, including the stub warning on `CADFeatureRecognitionEngine`.
4. **§4 Test commands** — the 4 specific test commands (vitest -t "CAD", cad-fleet-verify.mjs, cad-fleet-regen-valid.mjs, cad-analyze-step.mjs) are delta-specific and not in global doctrine. Keep in full.
5. **§5 cad-specific gotchas** — all 8 gotchas are verified, domain-specific, safety-relevant, and not duplicated anywhere else in the fleet. This is the highest-value section for preventing delta's known failure modes. Keep every item:
   - CADFeatureRecognitionEngine stub warning
   - CAD-Topology = pipeline-wiring, not one-off edits
   - Live regen = corpus coverage tracking (CAD_COVERAGE_MATRIX.json)
   - CADArchiveJoinAugmenterEngine under-integration warning
   - GPU embedder migration deferred (768-d stays)
   - Trilobe/electrode generators proven + UNITS trap (25.4×, brass JM 9106325)
   - hyperCAD v31 NOT v33; SolidWorks COM unregistered
   - CollisionDetectionEngine is the safety surface — pair with prism_safety
6. **§6 Tribal pointers** — all paths verified via PATHS.md knowledge-atlas block. Keep in full including the JM Die corpus counts (1,154 .step / 10,532 .ipt / 1,581 .dxf / 85,334 .pdf).
7. **§7 Cross-galaxy edges** — the typed dependency graph (cad→cam, cad←xray, cad→quoting, cad→india, cad↔academy, cad→safety) is load-bearing for preventing wrong-galaxy work. Keep in full.
8. **Related galaxies + Cross-refs block** — keep the PSN edge table and the explicit cross-ref links to sibling CLAUDE.mds.
9. **Closed-loop integration with india** — outcome publishing via `xproc_outcome_publish`, feature emission via `xproc_kg_project_features`, tribal capture via `prism_knowledge:tribal_capture slot=delta`. These are delta-specific wiring contracts not in global doctrine. Keep.
10. **AI-SYSTEMS-STATE pointer block** — keep as pointer only (<!-- comment --> style). Correct pattern.
11. **CRITIC-KEEPWORKING-STANZA** — keep as pointer-only (no body duplication). Correct pattern.

---

### DROP

These sections are duplicating global CLAUDE.md content and waste tokens for a per-domain file:

1. **Cross-cutting methodology §** (the ~60-line block after §7, starting "PC-specs + Ollama. Box: RTX PRO 6000...") — specifically these sub-sections duplicate global content:
   - Ollama model tag roster (`:32b`, `:1.5b`, `:120b`, retired tags) — already in global CLAUDE.md §TOKEN ECONOMY and `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md`. The **cad-specific** examples (summarize a STEP AP242 feature tree → `gpt-oss:20b`; lint CAD engine code → `qwen2.5-coder:32b`) ARE worth keeping as 2 lines.
   - Loop discipline (loop-state tick, parallel reviewer agents in ONE message) — global R6 + CLAUDE.md §DEV PRODUCTIVITY HOOKS. Drop; replace with pointer.
   - LoRA/CAG/RAG overview (3 paragraphs) — global CLAUDE.md covers these; the deploy-gate (AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15) is in india's galaxy. Keep only the CAD-specific hook: "CAG is high-ROI for static STEP AP242 entity taxonomy (cache it); RAG for live JM Die corpus coverage state."
   - Obsidian vault recall path — already in TOOLBELT.md; single line is fine.
2. **TOOLBELT.md OPERATIONAL CONTEXT block** (auto-wired) — this is in TOOLBELT.md not CLAUDE.md, so no action on CLAUDE.md. Noted for completeness.
3. Any future copy of R1-R15 rule text — global CLAUDE.md owns these. A pointer is sufficient.

**What to replace the dropped content with:** a single "§ Operational context pointer" line: `> PC specs / Ollama roster / loop discipline / CAG-RAG-LoRA doctrine → global CLAUDE.md §TOKEN ECONOMY + §CLAUDE.md RULES + state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md. CAD-specific: STEP taxonomy → CAG; JM Die corpus coverage state → RAG; code/lint → qwen2.5-coder:32b.`

---

### ADD (domain-specific — the heart of this assessment)

Items the current CLAUDE.md lacks or has only weakly:

#### A. DELTA-CONTEXT-LEDGER pointer (critical startup artifact — missing from CLAUDE.md)
MEMORY.md §1 calls `state/shared/DELTA-CONTEXT-LEDGER.md` the "curated, ROI-ordered, git-reconciled open-threads ledger" and says to read it FIRST on `/startup-delta`. CLAUDE.md has no mention. Add:
```
## 0. Startup: read context ledger first
`state/shared/DELTA-CONTEXT-LEDGER.md` — the single-read domain context regain artifact for slot:delta. Read on /startup-delta BEFORE any other context-building. Supersedes stitching handoff + goal-roadmap + task-queue. Reconcile §2 (done) + §3 (open) on each /handoff-delta.
```

#### B. Text→CAD lane entry point (added to MEMORY.md but not CLAUDE.md)
The Ollama text→CAD pipeline shipped (`scripts/cad-text-to-cadquery.mjs`, wiki `[[cad-text-to-cad-landscape]]`, buildout queue `state/shared/specs/DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md`) but is only in MEMORY.md §"Text→CAD generation". Add a §8 or subsection in §1 scope covering:
- `scripts/cad-text-to-cadquery.mjs` — canonical text→CadQuery pipeline (qwen2.5-coder:32b, gated staging at `state/shared/cad-text-gen/`)
- Wiki `[[cad-text-to-cad-landscape]]` — open-source landscape (Seek-CAD / Text-to-CadQuery 170K / STEP-LLM)
- Buildout queue: `state/shared/specs/DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md`
- Navigate-by-reference beats UI: kilo's `PRISM_Fusion_Drive` add-in `:18365` endpoints (`[[fusion-backend-nav-map]]`, `state/shared/fusion-backend/BACKEND-NAV-MAP.md`)

#### C. Seat-UI navigation (critical operational knowledge — missing from CLAUDE.md)
MEMORY.md has the seat-UI navigation hard-coded facts but CLAUDE.md lacks them. These are safety-relevant for delta:
- **Fusion 360 API unit trap:** API returns cm, display is mm; `2.54 cm` scale trap vs `25.4 mm`. This is a geometry correctness issue.
- **hyperCAD-S v31 (NOT v33):** macro/feature automation = native hook (NOT scripted); v33 is installed but NOT the running version.
- **Mastercam X8 classic menus:** NET-Hook = modern lane; classic UI for X8.
- **SolidWorks COM unregistered** (already in §5 gotcha #7 — cross-link from here).
- Navigate-by-reference: `:18365` JSON query beats UI screenshot parsing for Fusion.
Add as a new "§8 Seat-UI navigation" with these 4 bullets.

#### D. Complex assembly doctrine pointer
MEMORY.md references `[[cad-complex-assembly-archetypes]]` (skeleton-first decomposition, 7 proven `ARCHETYPE_RECIPES` in `cad-assembly-plan-lib.mjs`, T1-T4 capability grading). This is high-ROI for delta's assembly work and absent from CLAUDE.md. Add 2-line pointer:
```
Complex assembly: [[cad-complex-assembly-archetypes]] — skeleton-first + 7 ARCHETYPE_RECIPES in `scripts/lib/cad-assembly-plan-lib.mjs` (turbine/blisk/impeller/mold-die/...). Extend the registry, never rebuild.
```

#### E. CAD function taxonomy pointer
`[[cad-function-taxonomy]]` — every CAD function class graded for the programmatic (CadQuery/build123d) lane — is referenced in MEMORY.md but absent from CLAUDE.md. Pair with `CADOperationTaxonomyEngine` (`cad_taxonomy_*` 9 actions). Add 1-line pointer to §3 under taxonomy engines.

#### F. SOUL.md Refuses list as "What NOT to do" section
SOUL.md has 8 domain-specific refuses (verified, auto-generated from the AI-synergy audit) that are NOT in CLAUDE.md:
- `export-step-without-validation`
- `apply-tolerance-without-gdt-check`
- `modify-brep-using-unverified-boolean`
- `bypass-collision-clearance-check`
- `generate-drawing-from-incomplete-feature-tree`
- `inline-iso286-fit-values`
- `silent-feature-recognition-fallback`
- `dropping-pmi-data-on-import`
These are domain-expert-level and should appear as a "§ What NOT to do (domain refuses)" section in CLAUDE.md. Currently a delta chat working from CLAUDE.md alone never sees them.

#### G. Authoritative free-source corpus pointer
MEMORY.md §"Authoritative free-source corpus" lists ISO 1101:2017, ISO 10303-242:2025, NIST AP242 paper + the VERIFIED-PARTIAL `knowledge/wiki/cad/cad-foundations.md` (MBD standards, AP242 PMI, feature-recognition taxonomy). CLAUDE.md has no pointer to these. Add 2-line pointer to §2 constants reference or §6 tribal pointers:
```
External standards (pull-fresh): [[cad-foundations]] (WebFetch-verified: ASME Y14.41/ISO 16792 MBD, AP242 PMI, 4-family feature-recognition taxonomy). Numeric GD&T constants stay UNVERIFIED in knowledge/wiki/cad/_staging/ until delta verifies vs source.
```

#### H. `DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md` as active roadmap pointer
The buildout queue spec is delta's current active roadmap for the CAD galaxy. CLAUDE.md should carry a 1-line pointer so a new delta session picks it up without reading MEMORY.md first.

#### I. Octopus consensus use-case for CAD (TOOLBELT.md has it, CLAUDE.md does not)
TOOLBELT.md documents: use octopus when `feature_recognize` confidence is low OR STEP-vs-IGES unit-interpretation disputes arise, dissent ledger at `state/shared/octopus-outcomes/cad.jsonl`. This is a domain-specific AI-routing rule that belongs in CLAUDE.md §3 or §5 gotchas.

#### J. `prism_algorithm:spatial_ransac_fit` entry point
Available for planar-face extraction from noisy point clouds (robust line/plane fit, rejects outliers, deterministic given seed). In MEMORY.md §"Available algorithm primitives" but absent from CLAUDE.md. Add 1-line to §3 under geometry algorithms.

---

### IDEAL SECTION OUTLINE

Ordered list of sections for the ideal cad galaxy CLAUDE.md (a delta chat needs nothing else but the universal-core pointer):

```
## 0. Startup: read context ledger first          [NEW — DELTA-CONTEXT-LEDGER pointer]
## 1. Domain scope — what counts as "cad"         [KEEP verbatim — boundary + exclusions]
## 2. Canonical constants reference               [KEEP + ADD free-source corpus pointer]
## 3. Common cad engines (by-name pointers)       [KEEP + ADD function-taxonomy + RANSAC + octopus]
## 4. Dispatchers + key actions                   [KEEP cadDispatcher/cadAutomationDispatcher/cadDrawingKnowledgeDispatcher/cadRegressionDispatcher with action-count caveat]
## 5. Test commands                               [KEEP verbatim]
## 6. cad-specific gotchas                        [KEEP all 8 + ADD Fusion API unit trap (2.54cm)]
## 7. What NOT to do (domain refuses)             [NEW — from SOUL.md refuses list]
## 8. Seat-UI navigation                          [NEW — Fusion/hyperCAD/Mastercam/SolidWorks]
## 9. Text→CAD generation lane                    [NEW — cad-text-to-cadquery.mjs + landscape]
## 10. Complex assembly doctrine                  [NEW — ARCHETYPE_RECIPES pointer]
## 11. Tribal pointers + corpus atlas             [KEEP §6 verbatim]
## 12. Cross-galaxy edges                         [KEEP §7 verbatim]
## 13. Closed-loop integration with india         [KEEP verbatim]
## 14. Operational context (1-liner pointer)      [REPLACE ~60-line cross-cutting block with 1 pointer line]
## 15. Related galaxies + Cross-refs              [KEEP verbatim]
<!-- AI-SYSTEMS-STATE pointer block -->           [KEEP as comment pointer]
<!-- CRITIC-KEEPWORKING-STANZA -->                [KEEP as pointer]
```

Target size: ~160 lines / ~18KB (trim ~2.5KB from current by collapsing cross-cutting methodology).

---

### UNIVERSAL-CORE POINTER

The following universal rules must remain available to delta at all times but must NOT be duplicated in the galaxy CLAUDE.md — they belong in the global `H:/prism/CLAUDE.md` and are accessed via the Bibryam cascade. Reference them with a single pointer line:

**Rules delta needs but must only point to:**
- R1-R15 (Karpathy discipline + agent-era rules) → global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5-13
- Scrutiny 3-of-3 gate (scrutiny-3way.mjs, per-file 2-arm scrutiny) → global CLAUDE.md §SCRUTINY GATE + §PER-FILE SCRUTINY GATE
- Per-chat handoff (per-agent-handoff.mjs read/write, topic naming) → global CLAUDE.md §PER-CHAT HANDOFF
- Commit format `[SCOPE]/U-ID: title` + slot-worktree discipline (`H:/prism-slot-delta`, `slot/delta` branch) → global CLAUDE.md §SESSION HYGIENE + §PER-CHAT HANDOFF
- Units-first safety rail (UNITS FIRST, 25.4× trap, units-guard.mjs) → global CLAUDE.md §SAFETY RAILS (NOTE: the CAD-specific 25.4× and Fusion 2.54cm API trap warrant a 1-line ECHO in §6 gotchas — this is not duplication, it is a domain-specific instantiation of the global rule)
- No-stub enforcement, comprehensive-build-enforce, duplication guard → global CLAUDE.md §HOOK ENFORCEMENT GATES
- Ollama model roster + fallback ladder (Sonnet agents on Ollama miss) → global CLAUDE.md §TOKEN ECONOMY + §AI SYSTEM ROUTING
- Loop discipline (loop-state tick, parallel reviewer agents) → global CLAUDE.md §CLAUDE.md RULES R6 + §DEV PRODUCTIVITY HOOKS
- LoRA/CAG/RAG deploy gates (AUROC/F1/Brier thresholds) → india galaxy CLAUDE.md + global CLAUDE.md §NN-GRAPH
- MCP dispatcher index (prism_calc/prism_cam/prism_ai etc.) → global CLAUDE.md §MCP DISPATCHERS + DISPATCHER_DIGEST.md

**Recommended pointer line for top of galaxy CLAUDE.md (after §0):**
```
> Universal doctrine (R1-R15 · scrutiny gate · handoff · commit format · no-stub · Ollama routing · loop discipline) → root `/CLAUDE.md`. THIS file covers cad-domain surface ONLY.
```
