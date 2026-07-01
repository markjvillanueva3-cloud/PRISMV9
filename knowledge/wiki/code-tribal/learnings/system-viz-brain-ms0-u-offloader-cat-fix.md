# SYSTEM-VIZ-BRAIN-MS0/U-OFFLOADER-CAT-FIX — classifier category accuracy + Unicode-bypass safety pre-gate

**Commit:** `2bbf12654020` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T21:55:23-05:00
**Tags:** system-viz-brain-ms0, u-offloader-cat-fix, auto-distilled

## Subject
[SYSTEM-VIZ-BRAIN-MS0]/U-OFFLOADER-CAT-FIX: classifier category accuracy + Unicode-bypass safety pre-gate

## Body
```
[SYSTEM-VIZ-BRAIN-MS0]/U-OFFLOADER-CAT-FIX: classifier category accuracy + Unicode-bypass safety pre-gate

Diagnoses the "76 of 84 events labeled category=unknown" gap that made the
ollama-offload-stats dashboard useless. Routing decisions were already correct;
labeling was the only thing broken — and along the way, surfaced a real
safety bypass: "explain the kienzle model" was offloading to a local model
that lacks mcp-server/src/physics/constants.ts.

Two surgical fixes, scrutiny-gated through 3 rounds of 2-arm review:

1. KEEP_ON_CLAUDE labeling
   - Converted RegExp[] -> {pattern, category}[] so keep-decisions carry
     accurate labels: orchestration / operator_directive / git_ops /
     multi_file / deep_reasoning / safety_physics (previously all "complex"
     or "unknown").
   - Added explicit patterns for: PRISM slash-commands (/checkin variants
     incl. all 12 NATO slots, /loop, /goal, /forge*, /handoff, /system-viz,
     etc.) + operator imperatives ("continue", "fix this", "sync",
     "close out", "resume").

2. SAFETY_PRE pre-gate (load-bearing)
   - New unified safety-physics gate that runs BEFORE OFFLOADABLE_PATTERNS
     so "explain the kienzle model" cannot be offloaded. Includes:
       * Bare-match: kienzle / johnson-cook / safety-critical (rare
         outside physics)
       * Taylor + physics ctx (tool-life|wear|equation|formula) so
         "taylor swift" / "taylor series in calculus" / "john taylor"
         don't false-positive.
       * Collision-check + mfg ctx (on|for|the|toolpath|cycle|spindle|
         fixture|machine) so "hash collision-check" doesn't false-positive.
       * Generic physics-verb + verify-noun pattern
         (force|stress|thermal|deflection + calculation|model|verify|validate).
   - normalizeForSafety() helper applies NFKD + default-ignorable strip +
     25-char homoglyph remap (Cyrillic 10 + Greek 11 + Latin-Extended 4)
     before SAFETY_PRE so attacks via Cyrillic, Greek, Turkish dotless-i,
     ZWSP/ZWNJ/ZWJ, bidi controls (RLO/LRM/RLM), word-joiner, variation
     selectors, tag chars, and ligatures cannot evade the safety gate.

Tests (node:test, vitest harness still broken per [[reference_fleet_reaper_ms1]])
- 36 cases / all PASS / 80ms
- 15-case Unicode-bypass lock array (one named test)
- 5-case spurious-trigger lock (taylor swift / hash collision-check)
- 5-case word-boundary lock (discontinue / asynchronous / incontinent)
- Regression replay: all 8 historical "unknown" events from
  ollama-offload-stats.json now classify into meaningful categories

Per-file scrutiny: 3 rounds × 2 arms (code-analyzer + reviewer)
- Round 1: Arm A FAIL (P0 git_summary `changes?` over-match + 3 P1)
- Round 2: Arm A PASS, Arm B FAIL (P0 Unicode evasion + P1 spurious triggers)
- Round 3: Both PASS, no new P0

Wiring verify (no settings.json change — ollama-task-offloader was already wired):
  rtk git -C H:/prism show --stat HEAD | head

Deferred to follow-up: P2 widen `(^|\s)` orchestration anchor to also accept
quoted/bracketed forms; P3 enlarge homoglyph map to Armenian + Cherokee +
Hebrew lookalikes; P3 build HOMOGLYPH_RX programmatically from
UNICODE_HOMOGLYPHS keys to eliminate manual-sync drift.

Refs:
- feedback_ollama_docker_pipeline_dead_code_2026_05_16  (the audit memo
  that surfaced this gap — offloader cat=unknown was the headline finding)
- feedback_scrutiny_gate_finds_hostile_payload_class    (E1 lesson:
  Arm B catches what Arm A passes through)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../ollama-task-offloader-classify.test.mjs        | 329 +++++++++++++++++++++
- .claude/hooks/ollama-task-offloader.mjs            | 115 +++++--
- 2 files changed, 424 insertions(+), 20 deletions(-)

## Lessons surfaced in commit body
- till broken per [[reference_fleet_reaper_ms1]])
- tile_payload_class    (E1 lesson:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2bbf12654020`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._