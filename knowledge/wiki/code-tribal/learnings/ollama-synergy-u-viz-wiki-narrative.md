# OLLAMA-SYNERGY/U-VIZ-WIKI-NARRATIVE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-VIZ-WIKI-NARRATIVE (slot:sierra): $0-Claude local-LLM narrative for viz->wiki entries

**Commit:** `cd54edb940e1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T13:06:54-05:00
**Tags:** ollama-synergy, u-viz-wiki-narrative, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-VIZ-WIKI-NARRATIVE (slot:sierra): $0-Claude local-LLM narrative for viz->wiki entries

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-VIZ-WIKI-NARRATIVE (slot:sierra): $0-Claude local-LLM narrative for viz->wiki entries

OLLAMA-SYNERGY backlog #1 (sierra-lane). The viz->wiki entries (architecture/{layer,domain,dispatcher}-*.md) were 100% procedural field-dumps; this adds a 1-2 sentence local-LLM 'what/why' narrative -- $0-Claude, never-Claude CREATION that lifts search recall on PRISM's own canonical wiki tier.
- scripts/lib/viz-wiki-narrative.mjs: PURE inject/strip/extract helpers + content-hash; idempotent marker block. 15 tests (incl AUTO-block coexistence + idempotency invariant, mutation-verified).
- scripts/generate-viz-wiki-narrative.mjs: flag-gated post-pass (PRISM_VIZ_WIKI_NARRATIVE=1; default OFF -> hot path unchanged). Reuses generateBlurb (contextual-blurb.mjs). Ollama-down /api/tags probe (no 148-fetch spin); fail-soft (null blurb -> entry untouched); content-hash cache (no re-narrate loop); --dry-run is count-only (no Ollama).
- Wired into regen-wiki-from-viz.mjs after the 3 field-dump generators, before crosslinks/leaf-index (recall-searchable).
- VALIDATED live: qwen2.5-coder:32b enriched real entries ~1.25s warm with a clean situating blurb; re-run byte-identical (idempotent). gpt-oss:20b REJECTED live (empty .response harmony format + 38s cold-load > 30s timeout). layer-stack-overview.md EXCLUDED (full-overwrite by a later generator). 2-reviewer per-file (A PASS, B caught the overview P1 + dry-run P2 -> both fixed).
```

## Files touched (5)
- scripts/generate-viz-wiki-narrative.mjs | 126 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/viz-wiki-narrative.mjs      | 123 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/viz-wiki-narrative.test.mjs | 155 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regen-wiki-from-viz.mjs         |   5 +++
- 4 files changed, 409 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cd54edb940e1`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._