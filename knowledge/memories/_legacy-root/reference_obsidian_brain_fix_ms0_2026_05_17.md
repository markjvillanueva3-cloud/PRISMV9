---
name: reference_obsidian_brain_fix_ms0_2026_05_17
description: OBSIDIAN-BRAIN-FIX-MS0/U-OBF01+U-OBF02 — handoff topic-drift orphaning (proven root cause of "brain not aware"); per-slot consolidator + resume-read wiring. 2026-05-17 slot bravo.
source: prism-memory
synced: 2026-05-18T01:02:09.586Z
aliases: reference_obsidian_brain_fix_ms0_2026_05_17
---


# Obsidian-brain fix — topic-drift orphaning was the real "not aware" bug (2026-05-17, slot bravo claude-339c8ff7)

**User report:** *"we were supposed to have built an obsidian brain and memory system so we're always aware of everything but its clearly not working. what more do we have to do to get it to work?"*

**The misdiagnosis I almost shipped:** my first cut blamed "memory-relevance-inject / wiki-precheck not wired on UserPromptSubmit." R8 verification (reading the hooks, not grepping) flipped it: `memory-relevance-inject` is `tier:T1` PreToolUse:Edit **by design** (correctly wired in edit-bundle.mjs — that's why "🧠 Memory recall" fires on edits), and wiki-precheck content **does** surface every prompt. Wiring them would have double-fired / fixed a non-bug. **Lesson: a grep is a hypothesis, not a diagnosis — verify the hook's actual tier/event before "fixing" wiring.**

**The real, proven root cause:** per-agent handoffs are REPLACE-not-merge. Each `/compact` writes `HANDOFF-<base>-<slot>-<topic>.md` with only that session's `## RESUME`; the resume-read path reads only the NEWEST handoff for the instance. Session N+1 under a different topic → session N's unfinished RESUME orphaned. **Proven live:** the `HTML-COMPANION→HTML-PRIMARY→MEMORY-SLOT-VIEW` queue the operator kept asking to "continue the bravo task queue" had sat unread for days in `HANDOFF-claude-339c8ff7-bravo-html-stack.md` — three later sessions compacted under other topics and none re-stated it. The brain didn't forget; the read path couldn't see across topics.

**Fix (2 units, both per-file-gate FAIL→fix→PASS):**

| Commit | Unit | What |
|---|---|---|
| `6eae58748c` | U-OBF01 | `scripts/handoff-consolidate.mjs` — per-slot merger; fail-PRESERVE (drop only on token-boundary git-subject match); output outside HANDOFF-* namespace; 24 tests. Round1 6 findings (P0 substring-collision etc.) → round2 BOTH PASS. |
| `182df1aa35` | U-OBF02 | `session-start-auto-resume.mjs` `getConsolidatedSummary` — bounded pointer-not-payload block after primary RESUME; 3-min mtime throttle (no herd); --slot fast path 242→159ms; SLOT_NAMES 10→13. Round1 split → round2 BOTH PASS. |

Live: post-/compact for this chat now surfaces "39 open cross-topic threads for slot bravo" + pointer. Fail-soft total — primary RESUME byte-preserved on every error path.

**Promoted lessons:**
- Pure-core + injected-readers MUST ship one real-data path test — hermetic fakes hid the `U-OBF01`-vs-`U-OBF010` substring fail-DROP.
- A produced artifact must not share a filename namespace with the consumer's fallback globs (`HANDOFF-<slot>-CONSOLIDATED.md` would have been picked by per-agent-handoff's mtime-sort and resumed blind).
- Read-critical hooks CONSUME, don't PRODUCE — if a producer must run on the read path, throttle it (mtime window) so a 13-chat herd collapses to ≤1 spawn/slot/window.

**Remaining:** U-OBF03 — MEMORY.md auto-compaction that *acts* (re-pointerize over-budget index lines, never delete a pointer, fail-soft if peer-locked). MEMORY.md sits at ~99.8% of the 24,576 ceiling; the watchdog only alerts. Queued on cron `8fd6938f` (20m).

Wiki: [[obsidian-brain-fix-ms0]]. Related: [[reference_slot_identity_cache_2026_05_17]] (sibling SDF13-20 arc, same chat), [[reference_session_continuity_stack_2026_05_15]].


## Related
[[skills/event|/event]] • [[skills/compact|/compact]] • [[skills/handoff-consolidate|/handoff-consolidate]] • [[skills/slot|/slot]] • [[skills/window|/window]]