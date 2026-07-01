---
name: reference-existing-tribal-wiki-pipeline-2026-05-27
description: Existing closed-loop tribal+wiki pipeline (~201 scripts, 9 stages, 97.15% coverage) — don't redesign, extend. Tour written slot:victor 2026-05-27 to stop fleet from re-deriving.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.569Z
aliases: reference_existing_tribal_wiki_pipeline_2026_05_27
---


# Existing tribal+wiki closed-loop pipeline (tour, slot:victor 2026-05-27)

When a future chat is asked to "design a closed-loop self-improving wiki/tribal system," **stop and read this first.** The pipeline already exists end-to-end at 97.15% coverage; do not redesign. Extend.

## State (live, 2026-05-22 audit)

- 24,255 wiki entries · 23,573 in tribal-embed-index · **692 missing · 10 stale · coverage 97.15%**
- `state/shared/tribal-embed-index.json` = 400MB, regen daily 2026-05-27 13:01 cron
- Tribal corpus: **2,639 markdown** + **~12,928 JSONL** (jm-die-corpus*, jm-fleet-machines, machine-models-assembly, online-cad-cam-tips=1143, youtube-toolpath-tribal=2520) = ~15K+ tribal entries
- ~201 scripts in tribal/wiki/extract/promote/catalog surface
- Pipeline shipped by slots: echo (audit hook iter-7/8), delta (jsonl embed bridge 2026-05-26 + JM DIE catalog), whiskey (pdf-parse-extract), charlie (quoting closed-loop pattern proof)

## 9-stage closed-loop

```
1. EXTRACT       pdf-parse-extract.mjs · extract-jm-die-corpus-page-by-page.py
                 build-cad-cam-resources-pdf-index.mjs (3935 PDFs catalogued, schema v1.2.0)
                 catalog-jm-die-tribal-wiki-corpus.mjs
                 course-to-tribal-tips.mjs · monolith-to-tribal-tips.mjs
                 tribal-graph-course-{extract,mine,embed,mapper}.mjs

2. PROMOTE       promote-tribal-to-wiki.mjs --apply  (conf ≥ 0.9 threshold; 628 above floor of 3919)

3. EMBED         embed-wiki-into-tribal-index.mjs
                 embed-engines-into-tribal-index.mjs
                 embed-knowledge-store-into-tribal-index.mjs
                 embed-tribal-jsonl-into-index.mjs   (delta, 2026-05-26 — closed the JSONL gap)

4. FEATURE       generate-{extracted-pdf-tips,jm-die-tribal-wiki,milling-tribal-tip-bridge,wiki-tribal,tribal-density}-features.mjs
   GRAPH         (per-galaxy features rolled into regen-viz)

5. INJECT        .claude/hooks/tribal-by-domain-inject.mjs       (UserPromptSubmit, slot-soul filtered)
                 .claude/hooks/wiki-tribal-coverage-inject.mjs   (SessionStart, threshold-gated, echo iter-8)

6. AUDIT         scripts/wiki-tribal-cross-ref-audit.mjs → state/shared/.wiki-tribal-cross-ref-audit.json
                 scripts/audit-tribal-coverage.mjs · scripts/audit-wiki-coverage.mjs

7. CONSOLIDATE   scripts/tribal-consolidate-weekly.mjs       (existence ≠ wired to cron — gap)

8. LINK HEALTH   scripts/fix-broken-wikilinks.mjs
                 scripts/create-broken-wikilink-stubs.mjs
                 scripts/lint-wiki-orphans.mjs
                 scripts/wiki-broken-link-propose-fix.mjs

9. WIKI GEN      scripts/generate-{engine,dispatcher,domain,hook,skill,formula-algo,registry,test,milestone,layer,frontend,monolith,courses,unwired-engine,misc-l8,action}-wiki.mjs
   (per surface) (auto-emit wiki entries for new code shipped — keeps wiki in lockstep with code)
```

## What works today (do NOT re-build)

- 97.15% wiki↔tribal coverage in the embed index
- Auto-promote at conf 0.9 (proven path; 628 already promoted)
- Per-prompt domain-aware injection in operator chats (`tribal-by-domain-inject`)
- Session-start coverage-gap surfacing (`wiki-tribal-coverage-inject`)
- 9 generate-*-wiki scripts keep wiki in sync with code at multiple surface layers
- JM DIE/TRIBAL+WIKI catalogued (93 PDFs); 8 already extracted by delta 2026-05-26
- Cross-source embed bridges (wiki + engines + knowledge-store + jsonl) all live

## What's missing (the actual roadmap surface)

See `state/shared/specs/CLOSED-LOOP-TRIBAL-WIKI-PLAN-VICTOR-2026-05-27.md` for the 12-unit TRIBAL-WIKI-AUDIT-MS0 plan. Headline gaps:

1. **No per-domain coverage breakdown** — audit emits global only. Add `byDomain:` (U-VICTOR-A1).
2. **Audit cadence not enforced** — 5-day stale at time of writing. Add cron (U-VICTOR-A3).
3. **Promotion + consolidation not on cron** — scripts exist but only fire when an operator invokes them (U-VICTOR-C1, C2).
4. **5 RED-tier domains have zero/near-zero coverage**: logistics, evernote/file-digest, quickbooks, OSHA, alarm/troubleshoot (U-VICTOR-B1 through B5).
5. **CAM tribal under-promotion** — 4161 wiki + 2446 memory but only 28 tribal tips. Promotion pipeline silent on CAM cluster — investigate.
6. **`wedm` vs `wire-edm` filename split** — search recall forked. Pick canonical, alias the other.
7. **JM DIE/TRIBAL+WIKI** — 85 PDFs remaining of 93 (delta did 8). U-JM-DIE-TRIBAL-WIKI-INGEST-COMPLETE pickup.

## Pattern precedents

- [[reference_quoting_closed_loop_engine_2026_05_26]] — quoting closed-loop shipped 2026-05-26 (charlie); same pattern, different domain.
- [[reference_quoting_closed_loop_jm_corpus_first_live_2026_05_26]] — first-live closed-loop on JM DocuStrata.
- [[ppg-sfc-closed-loop]] — speed/feed physics learning loop.
- [[reference_pivot_wiki_tribal_2026_05_21]] — operator directive 6 days prior framing this whole pivot.

## How to read the coverage signal

- **Per-prompt:** `tribal-by-domain-inject` already surfaces top hits in your slot's domain.
- **Per-session:** `wiki-tribal-coverage-inject` flashes at SessionStart if coverage gap > 10%.
- **On demand:** `node H:/prism/scripts/wiki-tribal-cross-ref-audit.mjs` regenerates the report.
- **Per-domain (after U-VICTOR-A1 ships):** the audit JSON will carry `byDomain: {…}` with per-domain coverage + missing[]. Until then, fall back to filename counts via Glob (see [[feedback_enumerate_before_read]]).

## R8 lesson encoded by this memo

I (slot:victor, iter-1) wrote a coverage matrix from filename counts BEFORE checking the audit infrastructure. Came up with 2,639 tribal — the real count is ~15K+. Came up with 37,243 wiki — the real audited count is 24,255 (filename match overcounts cross-references). Per Karpathy R8: read before write. The two memory recalls + the pre-write graph context surfaced this in iter-2; the iter-3 plan refactored around it. Future chats: query the audit producer first, not the filesystem.
