# INFRA-DEVTOOLS/U-COLD-ARCHIVE-PATTERN-3 — [MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-PATTERN-3: archive 19 patterned cold scripts (write_qa/gen/verify/generate, 80-100d old)

**Commit:** `5bc287110fff` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:54:21-05:00
**Tags:** infra-devtools, u-cold-archive-pattern-3, auto-distilled

## Subject
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-PATTERN-3: archive 19 patterned cold scripts (write_qa/gen/verify/generate, 80-100d old)

## Body
```
[MAIN] [INFRA-DEVTOOLS]/U-COLD-ARCHIVE-PATTERN-3: archive 19 patterned cold scripts (write_qa/gen/verify/generate, 80-100d old)

Cold-script-rank pattern-batch from root scripts/. Three obvious-legacy
script families:

  write_qa_ms6..14.py (9 files) — milestone QA generators, one per MS
    ~4000 LOC total, all 80 days old
  gen_polymers.py + gen_ceramics_refractories.py — material category data gen
  verify_materials_phase1/materials/accurate/final/consolidated.py —
    5 successive 'verify' iterations of materials DB build
  generate_verified_stainless.js + generate_tool_holder_db.py +
    generate_free_machining_steels.py — one-shot DB generators

All output paths are now owned by mcp-server/src/registries/materials/
(canonical TS source-of-truth). Verified by zero callers in .claude/
+ mcp-server/src/.

Destination: scripts/_archive/materials-legacy/ (canonical archive bucket).
Reversible per feedback_never_delete_only_disable. Explicit-path git add
(no glob — avoids 755831a951-class peer absorption).

PIVOT-3 progress: 102/498 (20.5%). Cumulative this session: 102 archived
across 8 commits.
```

## Files touched (20)
- scripts/{ => _archive/materials-legacy}/gen_ceramics_refractories.py      | 0
- scripts/{ => _archive/materials-legacy}/gen_polymers.py                   | 0
- scripts/{ => _archive/materials-legacy}/generate_free_machining_steels.py | 0
- scripts/{ => _archive/materials-legacy}/generate_tool_holder_db.py        | 0
- scripts/{ => _archive/materials-legacy}/generate_verified_stainless.js    | 0
- scripts/{ => _archive/materials-legacy}/verify_accurate.py                | 0
- scripts/{ => _archive/materials-legacy}/verify_consolidated.py            | 0
- scripts/{ => _archive/materials-legacy}/verify_final.py                   | 0
- scripts/{ => _archive/materials-legacy}/verify_materials.py               | 0
- scripts/{ => _archive/materials-legacy}/verify_materials_phase1.py        | 0
_(+10 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5bc287110fff`
- Milestone envelope: `mcp-server/data/milestones/INFRA-DEVTOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._