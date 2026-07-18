# OLLAMA-OFFLOAD/U-DO-EVERYTHING-NOW — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-DO-EVERYTHING-NOW (slot:zulu): LEG-B/C freshness ceilings + LoRA-corpus clobber-guard (live near-miss) + producer chain into the night lane + sibling probe semantics (operator blanket directive)

**Commit:** `36aeea3f7219` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:52:43-05:00
**Tags:** ollama-offload, u-do-everything-now, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-DO-EVERYTHING-NOW (slot:zulu): LEG-B/C freshness ceilings + LoRA-corpus clobber-guard (live near-miss) + producer chain into the night lane + sibling probe semantics (operator blanket directive)

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-DO-EVERYTHING-NOW (slot:zulu): LEG-B/C freshness ceilings + LoRA-corpus clobber-guard (live near-miss) + producer chain into the night lane + sibling probe semantics (operator blanket directive)

U-LEGBC-FRESHNESS (unblocked by the operator's 'do everything now'):
- evalLegB freshness on artifact MTIME (48h ceiling, knob
  PRISM_AISYN_LORA_MAX_AGE_H), evalLegC on NN-EVAL assessedAt (21d,
  PRISM_AISYN_NNEVAL_MAX_AGE_D); shared resolveCeiling (whitespace-knob
  guard); disk path enforces ALL time-decaying legs; opt-in keeps the 27
  hermetic fixtures untouched. LIVE: gate green with evidence on every
  leg (A 2.4h<=24h, B 0.0h<=48h, C 6.5d<=21d).

U-LORA-CLOBBER-GUARD (found executing the directive): the assembler's
--out had NO empty-guard and the 11:26 inventory partial-regen left 0
'present' lora sources -- a --out run would have written 0 rows over the
1219-row LEG-B artifact (tribal-clobber class 8bf1873577). assertNoClobber
REFUSES >50% shrink/empty (PRISM_LORA_ALLOW_SHRINK=1 escape). india's own
real-data test (>=1 present lora source) was already RED since 11:26 --
independent confirmation. Re-ran the inventory builder (9 present sources
restored) + assembler --out through the guard: 1366 rows (+147, new CAD
datasets unioned). Inventory-drift root cause routed to india.

NIGHT LANE: +fleet-corpus-inventory +assemble-fleet-lora-corpus --out
(dependency-ordered after vault-to-lora x2; guard-protected) -- the LEG-B
ceiling is now structurally maintained. Registry suite re-validates 13 jobs.

SIBLING PROBE (P2-b from U-OLLAMA-PROBE-CRYWOLF-FIX): session-consolidate-
graph ollamaUp() abort now = up-but-busy -> SPAWN (only refusal skips; the
old 1.5s abort->false skipped embed refresh exactly under load); env URL.

Tests: gate 30/30 (3 new freshness) + assembler suite green (3 new guard
tests; pre-existing red real-data test now green) + night-batch 12/12.
YT shakedown also ran live: 14 mill tips staged, ingested=0/wikiPath=null
(staging invariant held in production). R12: subagent quota still blocked
until 15:50 -- per-file scrutiny for these files queued on the cron chain.
```

## Files touched (7)
- .claude/hooks/session-consolidate-graph.mjs   | 25 +++++++++++++++++--------
- scripts/ai-systems-synergy-goal-gate.mjs      | 81 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------------
- scripts/ai-systems-synergy-goal-gate.test.mjs | 44 ++++++++++++++++++++++++++++++++++++++++++++
- scripts/assemble-fleet-lora-corpus.mjs        | 26 ++++++++++++++++++++++++++
- scripts/assemble-fleet-lora-corpus.test.mjs   | 25 +++++++++++++++++++++++++
- state/shared/ollama-night-batch-registry.json | 14 ++++++++++++++
- 6 files changed, 189 insertions(+), 26 deletions(-)

## Lessons surfaced in commit body
- till blocked
- til 15:50 -- per-file scrutiny for these files queued on the cron chain.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 36aeea3f7219`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._