---
name: prism-session-recovery
description: Recovery protocols for 4 scenarios — normal resume, post-compaction, cross-device, and emergency — with priority reading order and handoff format
---
# Session Recovery

## When To Use
- After compaction occurs mid-session (context was truncated)
- Starting a new chat that needs to continue previous work
- "I lost context" / "What was I doing?" / "Continue from where we left off"
- When CURRENT_POSITION.md exists but you have no memory of the work
- NOT for: normal session start (use prism-session-lifecycle, it covers the 5-step boot)
- NOT for: context pressure monitoring (use prism-context-pressure)

## How To Use
IDENTIFY YOUR SCENARIO, then follow the matching protocol:

**SCENARIO A: NORMAL RESUME** (new chat, clean state exists)
  1. Read CURRENT_POSITION.md (10 seconds — always exists, always first)
  2. Check status: IN_PROGRESS = resume from substep, COMPLETE = advance
  3. Read SESSION_HANDOFF.md if it exists (richer context than position alone)
  4. Continue working. No user confirmation needed if confidence is high.

**SCENARIO B: POST-COMPACTION** (mid-session, context was truncated)
  1. Read CURRENT_POSITION.md (position survives compaction)
  2. Check /mnt/transcripts/journal.txt for this session's transcript
  3. Read last 50 lines of transcript to see what just happened
  4. Check /home/claude/ for any files created this session
  5. Reconcile: if transcript shows more progress than position file, use transcript
  6. State your understanding to user: "I believe I was doing X at step Y. Correct?"

**SCENARIO C: EMERGENCY RECOVERY** (no handoff, unclear state)
  1. Read CURRENT_POSITION.md (if it exists — this is the minimum viable state)
  2. Read last 5 entries from ROADMAP_TRACKER.md (append-only, reliable history)
  3. List recent files in working directories (check modification timestamps)
  4. Reconstruct: piece together what was being done from file evidence
  5. Ask user to confirm before proceeding — never guess silently in emergency

**PRIORITY READING ORDER** (read in this order, stop when confident):
  Priority 1: CURRENT_POSITION.md — 10 sec, always available
  Priority 2: SESSION_HANDOFF.md — 20 sec, if previous session wrote it
  Priority 3: Last 20 lines of target file — 30 sec, if continuing a file
  Priority 4: ROADMAP_TRACKER.md last 5 entries — 30 sec, if position unclear
  Priority 5: Transcript tail — 2 min, only if post-compaction
  Priority 6: Full state reconstruction — 5 min, only in emergency

**WRITING A HANDOFF** (at session end, for the next session):
  Format: COMPLETED [what], PROGRESS [counts], NEXT SESSION SHOULD [action list]
  Include: exact file paths, line numbers if mid-file, counts of items done vs remaining
  Warnings: anything the next session needs to know (broken tests, pending decisions)
  Test: could a fresh Claude instance read this and resume in under 60 seconds?

## What It Returns
- Scenario A: immediate resumption, zero re-discovery
- Scenario B: position reconstruction from multiple sources, confirmed with user
- Scenario C: best-effort reconstruction from file evidence, user-verified
- Handoff writing: clean state that enables any of the above scenarios to succeed
- Guarantee: if CURRENT_POSITION.md exists, recovery takes under 60 seconds

## Examples
- Input: "New chat. CURRENT_POSITION says DA-MS10 substep: 8 skills done, next: session-master"
  Scenario: A (normal resume). Position is clear. No handoff needed.
  Action: load DA phase doc, jump to MS10, continue splitting session-master.
  Time to productive work: under 30 seconds.

- Input: "Context just compacted. I was mid-response writing a skill file."
  Scenario: B (post-compaction). Read position file. Check transcript tail.
  Transcript shows: "Created prism-context-pressure/SKILL.md, 65 lines"
  Position says: MS10 in progress. Reconcile: skill was written, need to index it.
  State to user: "I was creating context-pressure skill. File exists. Need to index and continue."

- Edge case: "No position file, no handoff, tracker last entry is from 3 days ago"
  Scenario: C (emergency). Read tracker: last entry says DA-MS9 COMPLETE.
  List recent files: find 8 new skill directories with today's timestamps.
  Reconstruct: MS10 is in progress, 8 skills created. Ask user to confirm.
  Never silently assume — state reconstruction and get explicit "yes, continue."
SOURCE: Split from prism-session-master (26.9KB)
RELATED: prism-session-lifecycle, prism-context-pressure
