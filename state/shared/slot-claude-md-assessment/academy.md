# academy — slot:lima

## Current state

**Size:** 148 lines / ~7.4 KB (CLAUDE.md only; the galaxy has PATHS.md + TOOLBELT.md + MEMORY.md + SOUL.md + AWARENESS.md as companion files — the full doctrine surface is well-structured).

**Quality grade: GOOD**

The current CLAUDE.md is the most domain-specific galaxy file reviewed so far. It has real engine names (all verified present), a concrete 3-leg ship contract, genuine gotchas derived from real incidents, and clear cross-galaxy edges. It avoids the stub/generic patterns seen in weaker galaxy files.

**Stale / inaccurate content found (cite specifics):**

1. **Section 5 gotcha #1 — `lima-course-ship-guard.mjs` cited but ABSENT from integration tree.** The file `.claude/hooks/lima-course-ship-guard.mjs` does NOT exist at `H:/prism/.claude/hooks/` (verified with ls). It may live only in `H:/prism-slot-lima`. The CLAUDE.md states it as a present guard — misleading if a non-lima slot reads it. Must be marked `// slot/lima worktree only — not in integration tree` or promoted.

2. **TOOLBELT.md cites 3 scripts absent from integration tree.** `scripts/audit-academy-prereq-chain.mjs`, `scripts/audit-course-dispatcher-citations.mjs`, and `scripts/scaffold-academy-course.mjs` all return "No such file" in the integration tree. Only `scripts/generate-courses-wiki.mjs` is confirmed present. CLAUDE.md §5 gotchas #3 and #4 and the TOOLBELT.md bash one-liners reference these scripts as if they exist. This is a live reliability risk: a lima chat following these instructions in the integration tree will fail silently. Each must be marked with `// H:/prism-slot-lima only` until promoted.

3. **Course catalog count of "course-0a..course-60"** implies ~60 files; actual integration tree count is 29. The slot/lima worktree holds the 35..60 expansion. CLAUDE.md and MEMORY.md both mention this drift (correctly), but the TOOLBELT.md glob comment `~55 files` is stale for the integration tree.

4. **Cross-refs section** links to `../CLAUDE.md` (engines-wide) and specific sibling sentinels. These are pointer-only and not duplicated here — correct. No fabrication, but `engines/CLAUDE.md` is not a standard file; verify it exists if relied on at runtime (not checked, mark UNVERIFIED).

5. **MEMORY.md "Cross-galaxy bridges" section** states "no edges recorded yet" — inconsistent with CLAUDE.md §7 which gives 4 symmetric edges (knowledge-conversion, ai-training, business, tribal-knowledge). The MEMORY.md is stale on this point.

6. **MEMORY.md status header** says "STUB / awaiting U-GALAXY-MS1-C1 migration" — the CLAUDE.md itself is clearly not a stub, but MEMORY.md's own self-description implies the memory system is incomplete. This framing is honest but should be updated once the migration lands.

---

## KEEP

All of the following sections are accurate, load-bearing, and specific to the academy domain — retain verbatim or with minor annotation:

- **§1 Domain scope** — clean in-scope / out-of-scope split (raw PDF/OCR → xray; knowledge-conversion → juliett; model retraining → india; HR payroll → hotel). Prevents the most common scope-creep errors.
- **§2 Canonical constants reference** — correct that academy touches NO physics constants directly but must cite `mcp-server/src/physics/constants.ts` transitively in speed/feed course content. The table of course DATA locations is honest ("verify before relying").
- **§3 Common academy engines** — all 14 engine names verified present. Dispatcher-surface mapping accurate (mcfi_* in devDispatcher, video_elearning_* in aiReasoningDispatcher, academy_*/course_* in knowledgeDispatcher). Keep.
- **§4 Test commands** — 4 test file targets are domain-specific. Keep as-is.
- **§5 gotchas** — items #1 (3-leg ship contract), #2 (branch drift), #3 (prereq DAG no-cycle), #4 (dispatcher-citation coverage), #5 (MIT-OCW harvest-on-demand / empty dir), #7 (namespace disambiguation prism_knowledge vs prism_operating_system). Keep with the stale-script annotations added.
- **§6 Tribal pointers** — wiki paths, memory search terms, corpus path to `jm-die-corpus-pages.jsonl`, canonical pypdf extractor path. All concrete and verifiable.
- **§7 Cross-galaxy edges** — accurate 4-edge graph with directionality. The 5-dispatcher surface enumeration is the single clearest reference for where lima actions live. Keep.
- **§ Closed-loop integration with india** — `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record` — specific action names; keep (mark UNVERIFIED if not grep-confirmed this session).
- **§ Cross-cutting methodology** — PC specs, Ollama model routing, loop discipline, vault paths, LoRA/CAG/RAG harness. Dense and applicable.
- **AI-SYSTEMS-STATE block** — pointer only, auto-maintained. Keep.
- **Critic + keep-working contract** — pointer to global doctrine, no duplication. Keep.

---

## DROP

Content wasting tokens in the galaxy file that is either universal doctrine (already in main CLAUDE.md) or not load-bearing for academy-specific work:

1. **The "AI-systems fleet state" injected comment block** (`<!-- AI-SYSTEMS-STATE:BEGIN -->`) — identical boilerplate appears in every galaxy file (it is auto-injected). At ~8 lines it is low cost but represents zero academy-specific value; a pointer line `→ see knowledge/memories/patterns/ai-systems-fleet-state.md` suffices.

2. **The "Cross-cutting methodology" section** (~25 lines on PC specs / Ollama tiers / loop discipline / vault / LoRA-CAG-RAG) — this is the GALAXY-ENRICHMENT-PROGRAM cross-cutting lane injected identically into all 34 galaxies. It belongs in the universal-core pointer, not duplicated here. The academy-specific Ollama routing note (quiz generation, course prereq classify → gpt-oss:20b) can remain as a 2-line call-out.

3. **"Critic + keep-working contract" block** — 100% universal R6/R12 doctrine. Pointer only; drop the inline prose.

4. **MEMORY.md "Karpathy agent discipline" section** (~10 lines) — universal doctrine, already in global CLAUDE.md. Pointer only; drop from MEMORY.md.

5. **MEMORY.md "Cascade load order"** — this is DOMAIN-GALAXY-DOCTRINE-MS1 migration scaffolding that has not shipped. Useful as a TODO but adds noise for a working lima chat. Move to a `_staging` note or the MEMORY.md TODO section.

6. **SOUL.md duplication** — the SOUL.md file restates the engine's identity and "What this specialist does" which is already in CLAUDE.md §1. At runtime SOUL.md is auto-loaded separately; the prose duplication adds tokens without adding content.

---

## ADD (domain-specific — the heart of this assessment)

### A. Missing stale-script annotations (P0 — reliability)
The three scripts absent from the integration tree MUST be annotated in-file:
```
scripts/audit-academy-prereq-chain.mjs      // H:/prism-slot-lima ONLY — not in integration tree (verify before running from H:/prism)
scripts/audit-course-dispatcher-citations.mjs  // H:/prism-slot-lima ONLY
scripts/scaffold-academy-course.mjs         // H:/prism-slot-lima ONLY
```
And `lima-course-ship-guard.mjs` must be similarly annotated or promoted.

### B. Dispatcher action list (P0 — daily use, currently scattered across §3 + §7 + TOOLBELT)
A single compact table of the ~42 `knowledgeDispatcher` academy actions does not exist in the CLAUDE.md. The most-used subset that a lima chat needs without opening the dispatcher source:
```
knowledgeDispatcher (prism_knowledge):
  academy_courses                          — list all wired courses
  academy_course_detail {courseId}         — modules + prereqs + lessons
  learn_course_from_source {source}        — corpus → course (canonical builder)
  learn_curriculum_{list,get,progress}     — learner-surface actions
  instructor_{create_class,grade,export}   — LMS instructor surface
  course_build_{from_knowledge,from_mit}   — CourseBuilderEngine entry points

devDispatcher (prism_dev):
  mcfi_query {topic}                       — MIT-OCW course/algo lookup
  mcdl_cite_sources {courseId}             — MIT-OCW attribution provenance

aiReasoningDispatcher (prism_ai):
  video_elearning_{extract,tag,index}      — VideoELearningAIEngine surface
  mit_course_knowledge_query               — OCW query via reasoning path

operatingSystemDispatcher (prism_operating_system):
  course_{create,get,enroll,progress,search}
  learning_media_{upload,list,get}

businessDispatcher (prism_business):
  instructor_dashboard_manage
  learning_{assess,plan,progress,recommend}
```
(Action names above are derived from PATHS.md/TOOLBELT.md; verify exact spellings against dispatcher source before calling — some may have minor drift.)

### C. The 3-leg ship contract as a checklist (P0 — the #1 cause of silent broken courses)
Currently described in prose. Should be a checklist block:
```
## 3-leg ship contract (EVERY course — non-negotiable)
- [ ] LEG 1: course DATA file `mcp-server/src/data/academy/course-N-<topic>.ts` — modules + lessons + citations
- [ ] LEG 2: CurriculumEngine.ts wiring — `import` + `id: "course-N"` entry in courseDefinitions
- [ ] LEG 3: web blueprint in `web/src/data/academy.ts` COURSE_BLUEPRINTS array
Run: node scripts/generate-courses-wiki.mjs (only confirmed script in integration tree)
```

### D. What NOT to do in the academy domain (domain-specific refuses beyond SOUL.md)
```
## Academy DO-NOTs
- NEVER inline kc1.1 / Taylor / material constants into lesson bodies (check with TOOLBELT grep pattern)
- NEVER edit `CurriculumEngine.ts` by full-read — use offset 1 limit 120 (it is large)
- NEVER assume MIT-OCW corpus is on disk — `mcp-server/data/extracted-knowledge/mit-courses/` is EMPTY by design
- NEVER add a course to CurriculumEngine without the matching web blueprint (silent learner-surface gap)
- NEVER Grep engines/ broadly for "learning" — pulls india ML engines; filter to academy/course/curriculum terms
- NEVER trust a course COUNT from a doc — run `ls mcp-server/src/data/academy/course-*.ts | wc -l` live
- NEVER run the 3 slot-only scripts from H:/prism integration tree (they do not exist there)
- NEVER write tribal tips directly to `knowledge/tribal/academy-*.md` — auto-overwritten on regen; use `prism_knowledge:tribal_capture`
- NEVER create a course prereq cycle — run audit (in slot/lima) before marking a course done
- NEVER cite a dead dispatcher action in course DATA — actions get renamed; the citation-audit script catches this
```

### E. Course ID convention and current catalog bounds
The integration tree holds courses `0a, 0b, 0c, 1, 2, 13–29` (29 files confirmed). Courses 30–60 live in `H:/prism-slot-lima`. A lima chat must know which tree it is editing before touching any course-data file above course-29.

### F. Integration tree vs slot-lima worktree decision rule
```
## Which tree am I editing?
- `git -C H:/prism branch --show-current`      → main or cad-fusion-live-ms0 = integration tree (courses 0a-29 only)
- `git -C H:/prism-slot-lima branch --show-current` → slot/lima = full catalog (0a-60)
Course-data commits go to slot/lima branch, NOT the integration tree, until the branch is merged.
```

### G. Cpk qualification floors (cross-galaxy but daily for lima)
The `EmployeeMachineDomainAcademyEngine` gates role advancement on Cpk floors defined in the business galaxy (hotel): operator ≥ 1.0 / setup ≥ 1.33 / programmer ≥ 1.67. These values come from `src/physics/constants.ts` or the business sentinel — do NOT inline them in course DATA. Cite the source when teaching qualification requirements.

### H. NIMS credential domain knowledge (verified by papa WebFetch 2026-06-09)
Academy courses covering machining credentials should align with NIMS (National Institute for Metalworking Skills) two-component model (written knowledge + performance demonstration). Source: `knowledge/wiki/academy/academy-pedagogy-foundations.md` (existence-confirmed). Do not fabricate exam question counts or OJT hours — those specifics are in `knowledge/wiki/academy/_staging/deep-domain-research-2026-06-09.md` and remain UNVERIFIED until lima gate.

### I. Source attribution rule (academy-specific)
Every lesson that derives content from a MIT-OCW course MUST call `prism_dev:mcdl_cite_sources {courseId}` to attach provenance. Every lesson deriving from the JM Die pypdf corpus must cite the page source from `jm-die-corpus-pages.jsonl`. A lesson with no attribution is incomplete by definition — the SOUL.md "refuses" block already lists `dropping-source-attribution-on-course-build`.

---

## IDEAL SECTION OUTLINE

Ordered sections the academy CLAUDE.md should have (a lima chat needs nothing else beyond the universal-core pointer):

```
# Academy Galaxy — CLAUDE.md (slot:lima)

## 1. Domain scope (in-scope / out-of-scope split)
## 2. Which tree am I editing? (integration vs slot/lima decision rule)
## 3. 3-leg ship contract (checklist — the #1 daily guard)
## 4. Core engines (verified table: name | file | dispatcher | primary actions)
## 5. Dispatcher surface (compact action table — 5 dispatchers, most-used actions)
## 6. Course catalog (current bounds per tree; how to count live; glob patterns)
## 7. Academy DO-NOTs (domain-specific refuses)
## 8. Key gotchas (7 items — preserved from current §5, with stale-script annotations)
## 9. Test commands (4 commands — preserved from current §4)
## 10. Tooling scripts (annotated: integration-tree vs slot-lima-only)
## 11. Cross-galaxy edges (4 symmetric edges + Cpk floors from hotel)
## 12. Source attribution rule (MIT-OCW + JM Die corpus provenance)
## 13. Tribal + wiki pointers (search terms, corpus paths, wiki entries)
## 14. India closed-loop integration (outcome-publish / GNN features / calibration monitor)
## 15. Universal-core pointer (→ main CLAUDE.md)
```

Drop from the galaxy file: cross-cutting methodology prose, AI-systems-state boilerplate, critic/keep-working prose, Karpathy discipline prose — all are universal and pointed to from §15.

---

## UNIVERSAL-CORE POINTER

The following rules must remain AVAILABLE to every lima chat but should NOT be duplicated in this galaxy file. A single pointer block at the bottom of CLAUDE.md suffices:

```markdown
## Universal doctrine (pointer — do NOT duplicate here)
Rules R1–R15, scrutiny 3-of-3 gate, per-chat handoff format, commit format `[SCOPE]/U-ID`,
units-first (inch vs mm), no-stub enforcement, Karpathy discipline, token economy (RTK prefix,
Ollama routing), PRISM wiki protocol, fleet-reaper, golf slot hygiene:
→ `H:/prism/CLAUDE.md` (canonical; Bibryam Context Cascade auto-loads when editing academy/)
→ `H:/prism/mcp-server/src/engines/CLAUDE.md` (engines-wide dev/build doctrine)
```

Specific universal rules that ALSO have academy-local expressions and belong as 1-liners here (not full prose):
- **No inline physics constants** — relevant because speed/feed courses teach these values; 1-line reminder + grep pattern in §7.
- **No stub engines** — universal; 1 line in §7 DO-NOTs.
- **Scrutiny 3-of-3 gate** — universal; reference only in §15 pointer.
- **Slot-worktree commit discipline** — referenced in §2 (which-tree decision rule); no further duplication.
