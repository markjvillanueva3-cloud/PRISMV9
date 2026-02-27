# KNOWLEDGE EXTRACTION PROTOCOL — PRISM Session Knowledge System
# Execute at session end, before handoff, or before expected compaction.
# Maximum 10 entries per session. Quality over quantity.

## WHEN TO EXTRACT
- Session end (normal handoff)
- Before compaction (if health_check returns YELLOW/RED)
- After resolving a significant bug or making an architectural decision

## SIX KNOWLEDGE TYPES

### 1. DECISION
Trigger: Claude chose between alternatives (A vs B, decided A)
Format: "Chose [X] over [Y] because [reason]. Context: [phase-MS]"
Confidence: verified (tested) | observed (seen) | hypothesized (inferred)

### 2. ERROR_FIX  
Trigger: Error encountered and fix found
Format: "[Component] fails when [condition]. Fix: [solution]. Root cause: [why]"
Confidence: verified (fix tested and works)

### 3. ASSUMPTION
Trigger: Assumption validated or invalidated during work
Format: "Assumed [X]. Result: [true/false]. Evidence: [what showed it]"
Confidence: verified (directly tested)

### 4. PERFORMANCE
Trigger: Performance characteristic observed or benchmarked
Format: "[Operation] takes [time/resources] under [conditions]"
Confidence: verified (measured) | observed (estimated)

### 5. BLOCKER
Trigger: Step blocked; resolved or deferred with context
Format: "[Phase-MS] step [N] blocked by [issue]. Resolution: [fix/deferred to MS-X]"
Confidence: verified (if resolved) | observed (if deferred)

### 6. RELATIONSHIP
Trigger: Cross-registry connection discovered during work
Format: "[Entity A] requires/connects to [Entity B] because [reason]"
Confidence: verified (tested) | hypothesized (inferred from docs)

## ENTRY SCHEMA
```json
{
  "id": "[date]_[slug]",
  "type": "decision|error_fix|assumption|performance|blocker|relationship",
  "phase": "DA|R1|R2|...",
  "milestone": "MS0|MS1|...",
  "summary": "1-2 sentence summary (max 200 chars)",
  "detail": "Full context, 1-4 sentences (max 500 chars)",
  "tags": ["tag1", "tag2"],
  "date": "YYYY-MM-DD",
  "confidence": "verified|observed|hypothesized",
  "file": "[type]/[date]_[slug].md",
  "promoted_to": null
}
```

## EXTRACTION RULES
1. Each entry: 1-4 sentences. Not paragraphs. Not raw conversation.
2. Tag with: phase, milestone, relevant component names
3. Maximum 10 entries per session (aim for 3-8)
4. Prefer verified > observed > hypothesized
5. Skip trivial observations ("build succeeded" is not knowledge)
6. Focus on SURPRISES and DECISIONS — things that save future time

## QUERY AT BOOT
After position recovery, load entries matching current phase + milestone:
  - Decisions: must be respected (don't re-decide)
  - Error fixes: must be avoided (don't re-debug)  
  - Assumptions: must be checked (don't re-assume wrong things)
  - Performance: informs optimization choices
  - Blockers: shows what's deferred and why

## PROMOTION RULES (every ~5 sessions)
- error_fix verified 2+ sessions → test case or code fix
- decision verified 3+ sessions → protocol rule or code comment
- relationship verified → Branch 3 edge
- performance confirmed → PERF_BASELINES.json benchmark
- blocker resolved → archive
- assumption invalidated → flag code that still assumes wrong thing
