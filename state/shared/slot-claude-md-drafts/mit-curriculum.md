# mit-curriculum Galaxy — fleet-managed (no dedicated slot)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = mit-curriculum domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** MIT OpenCourseWare extraction and indexing — PDF/transcript/problem-set ingest, course-id
registration, harvest-on-demand orchestration, course-leaf artifact emission for downstream consumers.

**EXCLUDES:**
- 7-algorithm port (OperatorSplitting/ODEIntegrator/LinearStateSpace/FDM/GradientDescent/FEM/Lagrangian)
  → **knowledge-conversion** galaxy (these shipped under KNOWLEDGE-CONVERSION-MS0; do NOT attribute here)
- 3-lane router (Lane A/B/C forge-queue classification) → **knowledge-conversion** galaxy
- Course teaching / curriculum delivery → **academy** galaxy
- Page-by-page PDF text extraction at scale → **pdf-corpus** galaxy (lima's pypdf pipeline)
- SafeExpressionEvaluator → owned by **knowledge-conversion**; this galaxy feeds raw data it must sanitize

**Slot:** fleet-managed — no dedicated work-slot. Any slot may work here; claim via `/pick-unit` +
heartbeat. Worktree: `H:/prism-slot-<nato>` / branch `slot/<nato>` per active claimant.

---

## §2 — Verified engines

All 11 engines confirmed on disk at `mcp-server/src/engines/<name>.ts` (flat, not in subdirectory):

| Role | Engine file |
|------|-------------|
| Course index (200+ OCW courses) | `MitCourseIndexEngine.ts` |
| Course registry (id → metadata) | `MITCourseRegistryEngine.ts` |
| Knowledge extraction from course content | `MITCourseKnowledgeEngine.ts` |
| Deep-learning over course content | `MITCourseDeepLearningEngine.ts` |
| PP-AGI academic course integration | `MITCourseIntegrationEngine.ts` |
| Phase 0.23 U-UTL9 full integration | `MITCourseFullIntegrationEngine.ts` |
| Additional MIT courses U-AWR33 | `MITCourseExpansionEngine.ts` |
| OCW resource URL/path resolver | `MitOcwResourceResolverEngine.ts` |
| Course builder | `CourseBuilderEngine.ts` |
| Curriculum management | `CurriculumEngine.ts` |
| Bridge to knowledge-conversion pipeline | `KnowledgeCurriculumBridgeEngine.ts` |

**No local .ts engines inside `mit-curriculum/` subdir** — all engines live in the flat
`mcp-server/src/engines/` root. The `mit-curriculum/` subdir holds CLAUDE.md/MEMORY/PATHS/SOUL only.

---

## §3 — Dispatcher quick-ref

**DISPATCHER: NONE** — zero `prism_*` dispatcher actions exist for this domain (confirmed: no
`prism_course` / `prism_mit` / `prism_curriculum` in DISPATCHER_DIGEST.md).

Invocation pattern: call engines directly, or route through **knowledge-conversion** galaxy pipeline
(`KnowledgeCurriculumBridgeEngine` is the handoff point). Do NOT invent a `prism_course` or
`prism_mit` dispatcher — none exists and any fabricated action will silently fail.

MCP-down fallback: `node scripts/lib/galaxy-reasoning-bridge.mjs mit-curriculum "<query>"` (local Ollama,
$0 cost) — domain Q&A without any dispatcher dependency.

---

## §4 — Canonical constants + data paths

**No physics constants apply** — this is an extraction/indexing domain. NEVER inline course metadata
as constants; all course-id → topic/difficulty/prereq-DAG mappings live in the corpus index files below.

| Store | Verified path | Access rule |
|-------|---------------|-------------|
| Corpus source root | `H:/PRISM/resources/MIT COURSES/` | Contains 20+ course dirs + zips + `MIT COURSES 2/3/4/5/` subdirs |
| Course catalog index | `H:/PRISM/resources/MIT COURSES/PRISM_COURSE_CATALOG.json` | Query this FIRST before scanning raw dirs |
| Course index | `H:/PRISM/resources/MIT COURSES/MIT_COURSE_INDEX.json` | Authoritative id→path map |
| Algorithm registry | `H:/PRISM/resources/MIT COURSES/ALGORITHM_REGISTRY.json` | Verified on disk |
| Extracted output | `mcp-server/data/extracted-knowledge/mit-courses/` | Write target; do NOT write to `H:/PRISM/extracted/mit-ocw/` (does not exist) |

Per-course structure: `<course-dir>/pages/{lecture-notes,assignments,exams,readings,syllabus}/` + `data.json`.

---

## §5 — Domain gotchas / safety rails

1. **Wrong extracted output path** — `H:/PRISM/extracted/mit-ocw/` does NOT exist. The real write
   target is `mcp-server/data/extracted-knowledge/mit-courses/`. Writing to the wrong path silently drops output.
2. **7-algorithm attribution** — OperatorSplitting/ODEIntegrator/FEM/FDM/etc. belong to
   **knowledge-conversion**, not this galaxy. Citing them here misleads the slot into re-building
   already-shipped work or re-attributing KNOWLEDGE-CONVERSION-MS0 to the wrong domain.
3. **Harvest-on-demand — never bulk** — the corpus is large (20+ dirs + batches). Pre-extracting
   everything at once exhausts memory and produces unvalidated output. Always receive a course-id
   request → resolve → extract → index → emit.
4. **`mit-courses-registry.ts` does NOT exist** — the fabricated path
   `mcp-server/src/data/mit-courses-registry.ts` was in the old CLAUDE.md; confirmed absent. Use
   `MITCourseRegistryEngine.ts` (the live engine) and the JSON corpus indexes above.
5. **Course-id format matters** — MIT IDs follow `<dept>.<number>-<semester>-<year>` (e.g.
   `10.34-fall-2015`, `6.046j-spring-2015`). Malformed IDs will miss registry hits silently.
6. **Router-lane misclassification corrupts knowledge-conversion pipeline** — even though the
   3-lane router (A/B/C) lives in knowledge-conversion, this galaxy feeds it raw course artifacts.
   A wrong lane assignment poisons downstream forge-queue node typing.

---

## §6 — What NOT to do (domain refuses)

- **NEVER bulk-harvest all courses at once** — on-demand only; bulk exhausts memory and bypasses validation
- **NEVER emit course stubs without prereq DAG links wired** — orphan stubs break academy curriculum graph
- **NEVER write extracted output to `H:/PRISM/extracted/mit-ocw/`** — path does not exist
- **NEVER overwrite `MITCourseRegistryEngine` data with unverified course IDs** — corrupts downstream consumers
- **NEVER misclassify a course into the wrong router lane (A/B/C)** — poisons knowledge-conversion forge-queue
- **NEVER invent a `prism_course` or `prism_mit` dispatcher** — none exists; invoke engines directly
- **NEVER cite the 7-algorithm KNOWLEDGE-CONVERSION-MS0 output as this galaxy's work** — wrong domain
- **NEVER confuse this galaxy with knowledge-conversion (the router) or academy (the teacher)**
- **NEVER full-read `PRISM_COURSE_CATALOG.json` inline** — query via `MITCourseRegistryEngine`; the file may be large
- **NEVER use `mit-courses-registry.ts` as a path** — file does not exist on disk

---

## §7 — Domain workflow / pipeline contract

Harvest-on-demand sequence (per-request):

```
RECEIVE course-id request
  → RESOLVE path via MitOcwResourceResolverEngine (corpus root + index lookup)
  → EXTRACT content (PDF/transcript/problem-set per-course page structure)
  → INDEX via MitCourseIndexEngine
  → REGISTER in MITCourseRegistryEngine (id → topic + difficulty + prereq-DAG)
  → EMIT course artifact → KnowledgeCurriculumBridgeEngine → knowledge-conversion pipeline
```

Do NOT skip the REGISTER step — `MITCourseRegistryEngine` is the canonical identity store consulted
by academy and knowledge-conversion before building on a course.

---

## §8 — Tribal + corpus pointers

**Wiki entries (verified in `knowledge/wiki/architecture/`):**
- `courses-index.md` — master index of harvested courses
- `college-courses-psn-incorporation.md` — PSN leg wiring for course content
- `college-course-autogen-specs.md` — autogen spec for course-stub emission
- `course-forge-conversions.md` — KNOWLEDGE-CONVERSION-MS0 conversion specs
- `course-forge-stubs-emitter.md` — stub emission protocol
- `mit-curriculum-galaxy.md` — galaxy-level overview
- `curriculumengine.md` — CurriculumEngine API notes
- `courses/` subdirectory — per-course wiki leaves

**Key memories (on disk):**
- `reference_knowledge_conversion_ms0_2026_05_17.md`
- `reference_course_forge_conversions_2026_05_17.md`
- `reference_course_forge_stubs_emitter_2026_05_17.md`

**Tribal write rule:** `prism_knowledge:tribal_capture slot=<nato> domain=mit-curriculum` — never
write `knowledge/tribal/*.md` directly (auto-overwritten).

**JM Die corpus:** not applicable to this domain — no JM Die customer data in MIT-OCW extraction.

---

## §9 — Cross-galaxy edges (PSN)

| Edge | Direction | Bridge |
|------|-----------|--------|
| mit-curriculum → knowledge-conversion | PRODUCES course artifacts | `KnowledgeCurriculumBridgeEngine.ts` |
| mit-curriculum → academy | FEEDS course registry for curriculum delivery | `MITCourseRegistryEngine` lookup |
| mit-curriculum ← pdf-corpus | RECEIVES raw PDF bytes for page extraction | lima pypdf pipeline upstream |
| mit-curriculum ↔ database-expansion | READS/WRITES extracted-knowledge store | `mcp-server/data/extracted-knowledge/mit-courses/` |

**Producer boundary:** this galaxy is a SOURCE. It does not classify, route, or teach — it extracts
and indexes. knowledge-conversion classifies; academy teaches.

---

## §10 — Closed-loop integration (india)

```
xproc_outcome_publish { slot: '<active-nato>', domain: 'mit-curriculum' }  // UNVERIFIED action name
```
Tribal capture after each harvest: `prism_knowledge:tribal_capture slot=<nato> domain=mit-curriculum`.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "MIT|Course|Curriculum|SafeExpression"
```

No domain-specific lint/health script verified on disk for this galaxy. Run the targeted vitest pattern
after any engine edit; confirm no cross-galaxy test regressions (`MitsubishiMV1200R*` is WEDM, not
this domain — do not include in scope).

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs mit-curriculum "<question>"
```

Local Ollama routing for this domain:
- Summarize/classify OCW course content → `gpt-oss:20b`
- Lint/generate engine code → `qwen2.5-coder:32b`
- Deep domain reasoning (prereq DAG, router-lane strategy) → `gpt-oss:120b`

Zero dedicated AI dispatcher actions exist for this galaxy — the reasoning bridge is the sole AI path.
AI-systems fleet state: `knowledge/memories/patterns/ai-systems-fleet-state.md`.
