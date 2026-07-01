## mit-curriculum — fleet-managed

### Current state

**Size:** 95 lines / ~4,400 bytes (CLAUDE.md as read 2026-06-13).
**Quality grade:** PARTIAL

**Stale / inaccurate / fabricated content found:**

1. **§2 Constants reference** cites `mcp-server/src/data/mit-courses-registry.ts` — this file does NOT exist on disk (confirmed by MEMORY.md §Key engines note: "does NOT exist on disk — only `mitsubishi-*` data files match `mit*` there"). This is a fabricated path that should be removed or corrected.

2. **§3 Common engines** mentions "mit-courses-* MCP actions" — there are NO mit-curriculum dispatcher actions in DISPATCHER_DIGEST.md (confirmed: zero matches for course/curriculum/mit-ocw). This is an invented claim.

3. **§3 Common engines** attributes the 7-algorithm port (OperatorSplitting / ODEIntegrator / LinearStateSpace / FDM / GradientDescent / FEM / Lagrangian) and SafeExpressionEvaluator to this galaxy. These engines do NOT exist in `mcp-server/src/engines/` under those names — they belong to the **knowledge-conversion** galaxy. The `knowledge-conversion/` directory has no `.ts` engine files of its own either, suggesting these shipped under the top-level engines dir keyed to knowledge-conversion, NOT mit-curriculum. Citing them here crosses the producer/router boundary the domain itself defines.

4. **§ Key engines (grounded in PATHS.md)** — the Ollama-distilled block inherited PATHS.md's raw name-match output verbatim, which contains **~18 false-positives**: `CADFunctionParameterEmitterEngine.ts`, `ConfidenceCommitEventBusEngine.ts`, `HyperMill5AxisTiltLimitHook.ts`, `LathePrintProgramEmitterEngine.ts`, `LatheProofCarryingEmitEngine.ts`, `LocalCommitMessageEngine.ts`, `MachineForceLimitValidationEngine.ts`, `MacroBulkEmitOrchestratorEngine.ts`, `MacroPerMachineEmitterEngine.ts`, `MitsubishiMV1200RWireEDMMasterPostEngine.ts`, `PeerCommitAuditorEngine.ts`, `PostEmitSafetyGateEngine.ts`, `RateLimitEngine.ts`, `RateLimitGovernorEngine.ts`, `RateLimitingEngine.ts`, `SwissChannelFileEmitterEngine.ts`, `WEDMPostMitsubishiEngine.ts`, `WEDMPulseLimitEngine.ts`. These are WEDM, lathe, CAD, rate-limit, and commit-audit engines — none belong to this domain.

5. **§5/6/7 STUB** — three sections are explicitly stubs, never filled by india slot.

6. **§ High-ROI domain memories** — the "Engine Synergy: Consuming engines such as `systemhealthengine`, `paretooptimizeengi`, etc." line is Ollama-hallucinated truncated engine names. Not verified, not useful.

7. **§ Tribal pointers** — cites only `knowledge/wiki/code-tribal/commit-subject-discipline.md`, which is a fleet-wide commit hygiene rule, not a domain-specific tribal tip for MIT-OCW extraction.

---

### KEEP

- **§1 Domain scope** — accurate: OCW PDF/transcript/problem-set ingest, 3-lane router (A/B/C), course-forge-stubs emission. Keep the producer role definition. *Remove the 7-algo attribution (knowledge-conversion's domain).*
- **§4 Test commands** — `npx vitest run -t "MIT|Course|Curriculum|SafeExpression"` is a valid targeted run pattern for this galaxy. Keep.
- **§ Related galaxies** — the knowledge-conversion symmetric edge note is accurate and load-bearing.
- **§ Cross-cutting methodology** — the PC-specs/Ollama offload tier table, loop discipline, Obsidian vault paths, and CAG/RAG/LoRA pointers are cross-galaxy fleet doctrine accurately reproduced. Keep as a pointer block (already structured as such with `<!-- GALAXY-CLAUDEMD-FILL -->` guards).
- **§ Critic + keep-working contract** (the `<!-- CRITIC-KEEPWORKING-STANZA -->` block) — correct universal rail pointer. Keep.
- **§ AI-systems fleet state** pointer block — correct pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md`. Keep.
- **Cross-refs** section — links to parent specs and siblings are accurate. Keep.
- **SOUL.md refuses list** (in SOUL.md, not CLAUDE.md — worth promoting to CLAUDE.md): `harvest-all-courses-at-once-without-demand`, `emit-course-stubs-with-missing-prereq-links`, `bypass-safeexpressionevaluator-for-user-code`, `misclassify-course-into-wrong-router-lane`, `overwrite-mit-courses-registry-with-unverified-data`.

---

### DROP

- **§2 Constants reference** — the cited `mit-courses-registry.ts` path does not exist. Drop the section or replace with the real corpus index paths.
- **§3 Common engines** — drop the "mit-courses-* MCP actions" claim (no dispatcher exists). Drop the 7-algorithm / SafeExpressionEvaluator attribution (wrong galaxy).
- **§ Key engines (grounded in PATHS.md)** — drop all 18 false-positive engine entries from the Ollama-distilled block. The `<!-- GALAXY-CLAUDEMD-FILL -->` block should list ONLY the 11 verified MIT-domain engines.
- **§5/6/7 STUB** — three stub sections with no content; remove the placeholder headers entirely.
- **§ High-ROI domain memories** — the truncated hallucinated engine names (`systemhealthengine`, `paretooptimizeengi`) should be removed. The accurate facts (harvest-on-demand, real corpus path `data/extracted-knowledge/mit-courses/`) can be folded into the domain scope section.
- **§ Tribal pointers** — the lone commit-discipline pointer is not domain-specific. Drop it from this file; it belongs in the universal core pointer block.

---

### ADD (domain-specific — the heart of this assessment)

**1. Verified domain engine list (replace fabricated list)**

Engines confirmed on disk under `mcp-server/src/engines/` that are genuinely MIT-curriculum domain:
- `MitCourseIndexEngine.ts` — indexes 200+ MIT OpenCourseWare courses (ENGINE_DIGEST confirmed)
- `MITCourseRegistryEngine.ts` — course registry (canonical course-id → metadata)
- `MITCourseKnowledgeEngine.ts` — knowledge extraction from course content
- `MITCourseDeepLearningEngine.ts` — deep-learning over course content
- `MITCourseIntegrationEngine.ts` — PP-AGI Academic Course Integration (ENGINE_DIGEST confirmed)
- `MITCourseFullIntegrationEngine.ts` — Phase 0.23 U-UTL9 (ENGINE_DIGEST confirmed)
- `MITCourseExpansionEngine.ts` — additional MIT courses for U-AWR33 (ENGINE_DIGEST confirmed)
- `MitOcwResourceResolverEngine.ts` — resolves OCW resource URLs/paths
- `CourseBuilderEngine.ts` — course builder
- `CurriculumEngine.ts` — curriculum management
- `KnowledgeCurriculumBridgeEngine.ts` — bridge to knowledge-conversion pipeline

**2. Corpus structure (verified)**

Primary source root: `H:/PRISM/resources/MIT COURSES/` — confirmed on disk with:
- 22 top-level items: individual course dirs (e.g. `10.34-fall-2015/`, `6.046j-spring-2015/`) + zipped exports + subdirectory batches (`MIT COURSES 2/3/4/5/`)
- Root-level indexes: `ALGORITHM_REGISTRY.json`, `MIT_COURSE_INDEX.json`, `PRISM_COURSE_CATALOG.json`
- Per-course structure: `pages/{lecture-notes,assignments,exams,readings,syllabus}/` + `data.json`
- Extracted knowledge output: `mcp-server/data/extracted-knowledge/mit-courses/` (NOT `H:/PRISM/extracted/mit-ocw/` — the latter does NOT exist)

**3. No dedicated dispatcher — explicit rule**

Zero `prism_*` dispatcher actions exist for this domain (DISPATCHER_DIGEST confirmed). A chat in this galaxy invokes engines directly or routes through the adjacent `knowledge-conversion` galaxy's pipeline. Do NOT invent dispatcher actions. Document this explicitly.

**4. Producer/router boundary — critical invariant**

This galaxy is an **extraction/indexing SOURCE**. It produces indexed course artifacts. It does NOT:
- Classify OCW content into the 6-node-type forge-queue (that is `knowledge-conversion` galaxy)
- Teach courses (that is `academy` galaxy)
- Extract PDF text page-by-page at scale (that is `pdf-corpus` / lima's pypdf pipeline)

The 3-lane router (Lane A direct-wire 259 tribal tips / Lane B port-verify / Lane C 6-node-type forge-queue) lives in knowledge-conversion, not here. CLAUDE.md §1 correctly names it but must not imply ownership.

**5. Harvest-on-demand pattern — the key operational rule**

Courses are harvested ON DEMAND from `H:/PRISM/resources/MIT COURSES/`. This galaxy does NOT bulk-pre-extract everything. The pattern: receive a course-id request → resolve via `MitOcwResourceResolverEngine` → extract → index via `MitCourseIndexEngine` → register in `MITCourseRegistryEngine` → emit course artifact for downstream consumers.

**6. Course-id taxonomy**

MIT course IDs follow department.number-semester-year (e.g. `10.34-fall-2015`, `6.046j-spring-2015`, `2.830-control-of-manufacturing-processes`). Manufacturing-relevant departments: 2.xxx (Mechanical Engineering), 16.xxx (Aeronautics/Astronautics), 10.xxx (Chemical Engineering), 6.xxx (EECS for ML/AI content). The `PRISM_COURSE_CATALOG.json` and `MIT_COURSE_INDEX.json` at corpus root are the authoritative indexes — query these before scanning raw dirs.

**7. Wiki entries for this domain (verified)**

Under `knowledge/wiki/`:
- `architecture/courses-index.md` + ~115 `architecture/courses/mit-*.md` per-course leaves
- `architecture/college-courses-psn-incorporation.md`
- `architecture/college-course-autogen-specs.md`
- `architecture/knowledge-conversion-ms0.md`, `architecture/course-forge-conversions.md`, `architecture/course-forge-stubs-emitter.md`

**8. What NOT to do in this domain**

- Do NOT bulk-harvest all courses at once — harvest on demand only
- Do NOT emit course stubs without prereq DAG links wired
- Do NOT bypass SafeExpressionEvaluator when course formulas contain user-evaluable expressions (even if knowledge-conversion owns it, this galaxy feeds it raw data that must be sanitized)
- Do NOT write to `H:/PRISM/extracted/mit-ocw/` — that path does not exist; extracted output is `mcp-server/data/extracted-knowledge/mit-courses/`
- Do NOT overwrite `MITCourseRegistryEngine` data with unverified course IDs
- Do NOT misclassify a course into the wrong router lane (A/B/C) — misclassification corrupts the knowledge-conversion pipeline
- Do NOT invent a `prism_course` or `prism_mit` dispatcher — none exists; route directly through engines
- Do NOT confuse this galaxy with knowledge-conversion (the router) or academy (the teacher)
- Do NOT cite the 7-algorithm KNOWLEDGE-CONVERSION-MS0 algorithms as this galaxy's output

**9. Reasoning bridge**

`node scripts/lib/galaxy-reasoning-bridge.mjs mit-curriculum "<question>"` — $0, local Ollama. Use for domain Q&A before burning Claude tokens. AWARENESS.md confirms this is the only AI surface for this galaxy (0 dedicated AI dispatcher actions, 0 AI engines — the reasoning bridge is the sole AI path).

**10. Key memories (verified on disk)**

- `reference_knowledge_conversion_ms0_2026_05_17.md`
- `reference_course_forge_conversions_2026_05_17.md`
- `reference_course_forge_stubs_emitter_2026_05_17.md`

---

### IDEAL SECTION OUTLINE

```
# mit-curriculum galaxy — CLAUDE.md

## 1. Domain identity (3 sentences: what this galaxy IS, what it is NOT, who consumes it)
## 2. Canonical corpus paths (verified)
   — source root: H:/PRISM/resources/MIT COURSES/  (ALGORITHM_REGISTRY.json, MIT_COURSE_INDEX.json, PRISM_COURSE_CATALOG.json)
   — extracted output: mcp-server/data/extracted-knowledge/mit-courses/
   — per-course structure pattern
## 3. Verified domain engines (11 engines, each with 1-line role)
## 4. Dispatcher: NONE — direct engine invocation pattern
## 5. Key invariants + safety rules
   — Harvest on demand (not bulk)
   — Producer/router/teacher boundary (this vs knowledge-conversion vs academy)
   — No SafeExpressionEvaluator bypass
   — No writing to non-existent H:/PRISM/extracted/mit-ocw/
## 6. Course-id taxonomy + manufacturing-relevant departments
## 7. What NOT to do (8-item list from SOUL.md refuses + additional)
## 8. Cross-galaxy edges (academy / knowledge-conversion / pdf-corpus — with role labels)
## 9. Wiki + knowledge atlas pointer (4-entry verified list)
## 10. Test commands
## 11. Reasoning bridge (galaxy-reasoning-bridge.mjs)
## 12. AI-systems fleet state pointer (<!-- AI-SYSTEMS-STATE --> block)
## 13. Cross-cutting methodology pointer (loop / Obsidian / CAG/RAG/LoRA — pointer only, not duplicated)
## 14. Critic + keep-working contract pointer (<!-- CRITIC-KEEPWORKING-STANZA --> block)
## 15. Universal-core pointer (→ main CLAUDE.md)
```

---

### UNIVERSAL-CORE POINTER

The following rules must remain available to any mit-curriculum chat via pointer to the main `H:/PRISM/CLAUDE.md` — NOT duplicated into this galaxy file:

- **Safety rails:** R1–R15 in full, especially R12 (fail loud), R13 (comprehensive route), R15 (wire→test→validate→all-galaxies)
- **Scrutiny gate:** 3-of-3 PASS protocol (`scrutiny-3way.mjs`), per-file 2-arm review, scrutiny ledger
- **Per-chat handoff:** `per-agent-handoff.mjs` read/write pattern, topic naming enforcement
- **Commit format:** `[SCOPE]/U-ID: title` — slot-worktree branch discipline
- **Units-first:** inch vs mm source verification (not directly relevant to this domain but universal)
- **No-stub rule:** hook blocks placeholder returns; `comprehensive-build-enforce` hook
- **Duplication guard:** `duplicationGuardEngine.mustCheckBeforeCreating()` before any new engine
- **Physics constants:** never inline — `mcp-server/src/physics/constants.ts`
- **Token economy:** RTK prefix, Ollama offload ladder, parallel tool calls
- **KARPATHY DISCIPLINE:** 5-step pre-coding checklist
- **Fleet hooks:** `scrutinize-before-stop`, `enforce-handoff-topic`, `stop_on_failing_tests`, `file-claim-guard`

Pointer form: `> Universal rails: see [H:/PRISM/CLAUDE.md](../../../../CLAUDE.md) §Safety, §Scrutiny Gate, §Per-Chat Handoff, §Token Economy.`
