# Closed-Loop Tribal+Wiki Self-Improvement Plan — slot:victor (2026-05-27)

> **Operator goal:** *"assess current state of tribal knowledge and wiki across all main domains for the prism app… make plan for wikis and tribal knowledge across categories for the purpose of closed loop system self learning and self improving."*
>
> **Companion doc:** `TRIBAL-WIKI-COVERAGE-VICTOR-2026-05-27.md` (iter-1 coverage matrix; this doc supersedes its "iter-2/3 follows" stub).

---

## Headline state (live audit, 2026-05-22)

| Metric | Value | Read |
|--------|------:|------|
| Wiki files (audit count) | **24,255** | corrects iter-1's filename-match 37,243 (overcounted multi-match) |
| Tribal-wiki entries (in embed index) | **23,573** | source: `state/shared/tribal-embed-index.json` (400MB, regen 2026-05-27 13:01) |
| Missing from tribal | **692** | wiki entries the index doesn't see |
| Stale in tribal | **10** | indexed but source removed |
| **Coverage** | **97.15%** | up from echo iter-7 baseline (99.2% gap → 2.85% gap in ~6 days) |
| Audit report age | **5 days** | stale; gate threshold 720h — re-regen overdue per echo's discipline |

**Read:** the closed-loop is **already wired and working**. Iter-1 framing as "design a closed-loop" was wrong — delta + echo + whiskey shipped this in May. What's needed is (a) per-domain rebalancing for the 5 RED-tier domains, (b) re-ingest cadence enforcement, (c) JM DIE/TRIBAL+WIKI completion. This is a maintenance/extension plan, not a greenfield architecture.

---

## Existing closed-loop pipeline (DO NOT DUPLICATE)

```
SOURCE                  STAGE                                  SCRIPT / HOOK
──────                  ─────                                  ─────────────
PDF corpus              (1) extract                            scripts/pdf-parse-extract.mjs (whiskey, U-WPWT-EXTRACT)
JM DIE/TRIBAL+WIKI      (1a) per-page deep extract             scripts/extract-jm-die-corpus-page-by-page.py
3,935 indexed PDFs      (1b) catalog                           scripts/build-cad-cam-resources-pdf-index.mjs v1.2.0 (delta)
                                                                scripts/catalog-jm-die-tribal-wiki-corpus.mjs
Courses (MIT-OCW etc)   (1c) course → tribal tips              scripts/course-to-tribal-tips.mjs
                                                                scripts/tribal-graph-course-{extract,mine,embed,mapper}.mjs
Monolith                (1d) monolith → tribal                 scripts/monolith-to-tribal-tips.mjs
Tribal corpus           (2) promote conf≥0.9 → wiki            scripts/promote-tribal-to-wiki.mjs (628 already above floor of 3919)
Wiki/Engines/Memories   (3) embed into tribal-embed-index      scripts/embed-{wiki,engines,knowledge-store,tribal-jsonl}-into-tribal-index.mjs
                            (4) build per-domain feature graph  scripts/generate-{extracted-pdf-tips,jm-die-tribal-wiki,milling-tribal-tip-bridge,wiki-tribal,tribal-density}-features.mjs
Embed index (400MB)     (5) inject per-prompt by slot domain    hook: .claude/hooks/tribal-by-domain-inject.mjs
                            (5a) inject coverage gap on session  hook: .claude/hooks/wiki-tribal-coverage-inject.mjs (echo, U-WTCI iter-8)
Audit                   (6) periodic cross-ref audit            scripts/wiki-tribal-cross-ref-audit.mjs (writes .wiki-tribal-cross-ref-audit.json)
Cleanup                 (7) consolidate weekly                  scripts/tribal-consolidate-weekly.mjs
                            (8) fix broken wikilinks            scripts/fix-broken-wikilinks.mjs + create-broken-wikilink-stubs.mjs
                            (9) lint orphans                    scripts/lint-wiki-orphans.mjs
```

**~201 scripts** total in tribal/wiki/extract/promote/catalog surface. The pipeline self-improves via: (a) PDF/course/monolith ingest → tribal jsonl → promotion threshold → wiki, (b) re-embed on schedule, (c) inject surfaces gap to operators every session.

---

## Gap profile across 25 operator-named domains

(From iter-1 filename+memory inventory; numbers are filename-match counts, not embed-index counts.)

| Tier | Domains | Action |
|------|---------|--------|
| **GREEN** (heavy coverage) | mill, lathe, wedm, cad, cam, business, audit, hr, erp | maintenance only — keep weekly consolidation running |
| **YELLOW** (mid coverage) | post-processor, sfc, quoting, ISO, scheduling, maintenance | targeted ingest from existing PDF corpus subdirs |
| **ORANGE** (thin) | shop-floor, payroll, purchasing, alarm/troubleshoot, OSHA | new ingest sources + manual seed authoring |
| **RED — TRUE GAPS** | **logistics**, **evernote/file-digest**, **quickbooks**, plus subset of accounting | brand-new ingest pipelines needed |

**Cross-cutting findings:**
1. **`wedm` vs `wire-edm` filename split** — 1213 vs 6 entries. Search recall is forked. Pick canonical slug, add alias map in `wiki-link-fix-suggester`.
2. **CAM tribal under-promotion** — 4,161 wiki + 2,446 memory but only 28 tribal tips. Promotion pipeline isn't picking up CAM tribal candidates. Investigate why `promote-tribal-to-wiki` is silent on CAM.
3. **Audit lacks per-domain breakdown** — `.wiki-tribal-cross-ref-audit.json` reports global 692/24,255 missing but not WHICH domains contain them. Self-improvement signal too coarse.

---

## Proposed roadmap — TRIBAL-WIKI-AUDIT-MS0 (12 units)

Each unit ships an engine OR script OR hook + real tests + dispatcher wiring (where applicable). No stubs.

### A. Per-domain coverage signal (3 units)

- **U-VICTOR-A1-PER-DOMAIN-AUDIT** — extend `wiki-tribal-cross-ref-audit.mjs` to emit `byDomain: { mill: {coverage, missing[]}, lathe: {…}, … }` for the 25 operator-named domains. Domain classifier reuses `classifyJmDie()` heuristic from delta's `build-cad-cam-resources-pdf-index.mjs`. Tests: 25-domain happy path + unclassified-bucket + zero-coverage domain (logistics) + naming-split (wedm vs wire-edm) merges into single bucket. Files: `scripts/wiki-tribal-cross-ref-audit.mjs` (extend), `scripts/lib/wiki-domain-classifier.mjs` (new, pure), `scripts/wiki-tribal-cross-ref-audit.test.mjs` (extend).
- **U-VICTOR-A2-INJECT-PER-DOMAIN** — extend `.claude/hooks/wiki-tribal-coverage-inject.mjs` to surface top-3 lowest-coverage domains in the SessionStart payload (silent unless any domain <50% coverage). Wired through existing `loadAudit` reader. Tests: per-domain threshold gating, slot-aware filter (so a `mill`-slot chat sees mill-gap first), backward compat with current single-number coverage line.
- **U-VICTOR-A3-AUDIT-REGEN-CADENCE** — durable scheduled task `PRISM Wiki-Tribal Audit Regen` (24h cadence, +480s phase to avoid contention with fleet-reaper at +210s). Currently the audit is regen-on-demand; 5-day staleness is the symptom. Reuses existing `install-fleet-reaper-task.ps1` template.

### B. Close the 5 RED-tier gaps (5 units)

- **U-VICTOR-B1-LOGISTICS-SEED** — bootstrap `knowledge/wiki/architecture/dispatcher-logistics.md` + seed 10 tribal tips on shipping/receiving/inventory/UPS-FedEx integration. No engine yet — wiki+tribal first, engine when domain materializes.
- **U-VICTOR-B2-FILE-DIGEST-EVERNOTE** — operator named "automatic file digest (Evernote) and redistribution of data from the file to all corresponding units." Map: this IS the `knowledge-conversion/` galaxy + `pdf-corpus/` galaxy (already exists). Write a wiki concept-page `knowledge/wiki/concepts/file-digest-redistribution.md` linking the existing engines (`PDFCorpusEngine`, `KnowledgeConversionEngine`, `CourseToTribalTipsEngine`) and the redistribution side (master-index inject, slot-soul routing, per-galaxy memory).
- **U-VICTOR-B3-QUICKBOOKS-CONNECTOR-SEED** — operator named QuickBooks. Check `business/` galaxy for existing QBO connector; if absent, seed `knowledge/wiki/architecture/business-quickbooks-connector.md` with the 4-axis (chart-of-accounts sync, invoice → SFC quote bridge, job-cost → ERP-E2 reconcile, payroll path). Engine deferred to a follow-up MS1.
- **U-VICTOR-B4-OSHA-COMPLIANCE-SEED** — `compliance-safety/` sentinel exists with no ENGINE_DIGEST. Generate it via `scripts/generate-per-galaxy-engine-digest.mjs --galaxy compliance-safety` + extract OSHA-1910 + ISO-12100 + machine-guarding patterns from existing `tribal-knowledge/` galaxy.
- **U-VICTOR-B5-ALARM-TROUBLESHOOT-PATTERN-MINE** — 128 wiki + 41 troubleshoot but only 1 tribal tip. Controller alarm-code knowledge (Fanuc 4-digit, Heidenhain HSCI, Haas LED states, Mazak EIA) lives in machine manuals already in `resources/`. Add `scripts/extract-controller-alarm-codes.mjs` to mine the manual PDFs, emit to `mcp-server/data/tribal/controller-alarms.jsonl`, embed into the index.

### C. Self-improvement triggers (4 units)

- **U-VICTOR-C1-PROMOTION-CADENCE** — auto-run `promote-tribal-to-wiki.mjs --apply --threshold 0.9` nightly. Currently runs only when an operator invokes it. 628 candidates already above 0.9 — proves the threshold works, but no scheduled fire.
- **U-VICTOR-C2-CONSOLIDATE-WEEKLY-CRON** — `tribal-consolidate-weekly.mjs` exists but isn't on a cron. Wire it.
- **U-VICTOR-C3-RE-INGEST-ON-NEW-PDF** — file-watcher on `JM DIE/TRIBAL + WIKI/` + `resources/`: any new `*.pdf` triggers `pdf-parse-extract.mjs --file <new>` automatically. Closes the operator's prior complaint ([[feedback_enumerate_before_read]]) — new resources should auto-flow without operator manually compiling them.
- **U-VICTOR-C4-STALE-AUTO-PRUNE** — 10 stale entries surfaced in audit (indexed but source removed). Extend `tribal-consolidate-weekly.mjs` to drop them; emit a deletion log to `state/shared/tribal-pruned.jsonl`.

### D. Complete the JM DIE/TRIBAL+WIKI ingest (already on roadmap)

- **U-JM-DIE-TRIBAL-WIKI-INGEST-COMPLETE** — delta extracted 8/93 books 2026-05-26 (operator drop). 85 remaining. Pickup via `pdf-parse-extract.mjs --batch` per delta's tiered strategy (medium 1.5-10MB / heavy 10-25MB / massive 100MB+ split). The 115MB SolidWorks 2021 + 48MB InventorCAM 2024 books need chapter-by-chapter splits to avoid pdf-parse OOM. Reference: [[reference_jm_die_tribal_wiki_extraction_starter_2026_05_26]].

---

## Self-improvement architecture (summary)

```
INGEST (new sources)                      ──►   tribal jsonl
   • file-watcher on JM DIE + resources/    (U-VICTOR-C3)
   • controller-alarm mining                (U-VICTOR-B5)
   • OSHA/ISO/compliance corpus             (U-VICTOR-B4)
                                                  │
                                                  ▼
PROMOTE (threshold 0.9)              ──►   wiki canonical
   • nightly cron                            (U-VICTOR-C1)
                                                  │
                                                  ▼
EMBED (re-build tribal-embed-index)  ──►   400MB index
   • already daily (delta)                            │
                                                       ▼
AUDIT (per-domain coverage)          ──►   .wiki-tribal-cross-ref-audit.json
   • daily cron                              (U-VICTOR-A3)
   • per-domain breakdown                    (U-VICTOR-A1)
                                                  │
                                                  ▼
INJECT (per-prompt + per-session)    ──►   surface gaps to chats
   • tribal-by-domain-inject (live)
   • wiki-tribal-coverage-inject (live)
   • per-domain extension                    (U-VICTOR-A2)
                                                  │
                                                  ▼
CONSOLIDATE / PRUNE (weekly)         ──►   drop stale, dedup
   • weekly cron                             (U-VICTOR-C2)
   • stale auto-prune                        (U-VICTOR-C4)
```

The **closed-loop signal** is: per-domain coverage gap surfaces at session-start → operator picks a unit from this plan or kicks off existing extraction → ingest landing increases coverage → next audit cycle reflects it.

---

## Iter-2 deliverables

- This document
- Companion: `TRIBAL-WIKI-COVERAGE-VICTOR-2026-05-27.md` (iter-1 raw inventory)
- Memo proposal: `reference_existing_tribal_wiki_pipeline_2026_05_27.md` (existing-pipeline tour for future chats so they don't re-derive)

## Out of scope

- Engine builds for B1-B4 (logistics/quickbooks/osha/file-digest) — wiki-first seed only; engine work deferred to MS1 after the wiki+tribal foundations land.
- Vector-index re-architecture — 400MB embed-index is healthy.
- `wiki-tribal-coverage-inject` rework — extension only (U-VICTOR-A2).

— slot:victor, /loop iter 2-3, 2026-05-27.
