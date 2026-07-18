# JULIETT-12CHAT-ALLOCATION-MS0/U-MEMORY-COMPRESS-V2 — [MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2: ship paired compressor + PreToolUse gate (silent-build close-out)

**Commit:** `3798922e497e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T21:55:55-05:00
**Tags:** juliett-12chat-allocation-ms0, u-memory-compress-v2, auto-distilled

## Subject
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2: ship paired compressor + PreToolUse gate (silent-build close-out)

## Body
```
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2: ship paired compressor + PreToolUse gate (silent-build close-out)

The two source files (scripts/memory-compress-v2.mjs + .claude/hooks/pretool-memory-size-gate.mjs)
were on disk but never committed — silent-build debt. The compressor never ran, the gate
never blocked. This commit closes the unit by adding the missing tests, wiring the hook, and
proving production paths via subprocess oracles. Slot:golf shared-tree commit → [MAIN] prefix.

Why this is the highest-ROI task right now (per /goal compile):
  - MEMORY.md is auto-loaded into every chat at SessionStart; harness silently truncates past
    24576B, breaking fleet-wide cross-session recall.
  - 2026-05-16 U-MEMORY-COMPRESS was one-shot, no durable mechanism — re-grew to 100.5% of
    ceiling once already (CLAUDE.md §Recent regressions).
  - This unit ships the DURABLE half: PreToolUse:Edit hard-block refusing any write that
    grows MEMORY.md past 22000B (≈90% of ceiling) unless the edit reduces bytes.
  - Spec roi_score 9.0; unblocks U-AUTO-MEMORY-WRITE + fleet-wide-MEMORY-recall.

Files (4, +1166 LOC):
  scripts/memory-compress-v2.mjs  programmatic compress preserving every [slug](slug.md) skeleton; idempotent; refuses to write if any skeleton would drop (R12).
  scripts/memory-compress-v2.test.mjs  27 cases — spec idempotency + pointer preservation + line cap; failure modes (empty/header-only/malformed); adversarial (huge entry/10k entries/cap=0); 3 cap configurations; live-file mtime-invariance defensive guard.
  .claude/hooks/pretool-memory-size-gate.mjs  T0 PreToolUse:Edit gate; pure cores + hook IO; fail-OPEN on every malformed/unreadable/un-simulable path; kill switch PRISM_MEMORY_GROWTH_GATE_DISABLE=1; bypass PRISM_MEMORY_APPEND_OK=1.
  .claude/hooks/pretool-memory-size-gate.test.mjs  47 cases — 4 spec scenarios as real subprocess oracles (block/trim/bypass/disable); decideGate boundary +1 precision pins strict-> regression; isMemoryFile suffix + missing-segment coverage; stdout-parse hardening; watchdog signal-vs-status-check.

Wiring (settings outside git root — not in this commit):
  C:/Users/wompu/.claude/settings.json + H:/.claude/settings.json — PreToolUse arm matcher
  Edit|MultiEdit → portable-node pretool-memory-size-gate.mjs (timeout 3000ms). 23 → 24 arms.

Acceptance per spec:
  - live MEMORY.md: 13277B (54% of 24576B ceiling, status=fresh) — under target.
  - node --test → 74/74 pass.
  - Live smoke-fire: hook with non-MEMORY.md path → exit 0 (correct scoping).

Per-file scrutiny (multi-file build):
  - compressor test: Reviewer-A (test-review-agent) PASS; Reviewer-B FAIL with 2 hallucinated
    P1s (claimed inlined constants at line 9-10 + COUNT-only pointer compare — both refuted
    by reading the actual file). Added mtime-invariance defensive hardening as the legitimate
    sub-claim from B (defense-in-depth for future non-pure refactor).
  - gate test: Reviewer-A PASS; Reviewer-B FAIL with 2 valid P0 + 3 P1, all fixed in-session:
      P0 boundary +1 precision (catches > → >= regression)
      P0 isMemoryFile false-negative (suffix-after-.md / missing /memory/ / uppercase dir)
      P1 stdout-parse hardening (parseHookJson defensive brace-slice)
      P1 mkdtempSync moved inside try (per-test cleanup race on assertion failure)
      P1 watchdog signal-check before status (honest timeout failure message)

Spec ref: state/shared/specs/UNITS/U-MEMORY-COMPRESS-V2.md
Sibling U-MEMORY-GROWTH-GATE is the paired gate half — both ship together.
```

## Files touched (5)
- .claude/hooks/pretool-memory-size-gate.mjs      | 213 +++++++++++
- .claude/hooks/pretool-memory-size-gate.test.mjs | 455 ++++++++++++++++++++++++
- scripts/memory-compress-v2.mjs                  | 211 +++++++++++
- scripts/memory-compress-v2.test.mjs             | 287 +++++++++++++++
- 4 files changed, 1166 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3798922e497e`
- Milestone envelope: `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._