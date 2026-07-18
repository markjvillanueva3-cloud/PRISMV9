---
source: global
section: KARPATHY DISCIPLINE (mental checklist every 5 tasks)
slug: karpathy-discipline-mental-checklist-every-5-tasks
indexed_at: 2026-06-23T02:05:18.098Z
---

## KARPATHY DISCIPLINE (mental checklist every 5 tasks)

**Before writing ANY code:**
```
1. CLASSIFY — Problem type? (search, state, async, parse, cache, validate, transform)
2. TECHNIQUE — Hash vs tree? FSM vs reducer? Promise.all vs sequential?
3. EDGE CASES — Empty, null, overflow, concurrent, NaN, unicode, timeout
4. FAILURE MODES — Network, disk, OOM, race condition, invalid state
5. THEN WRITE — Code handles ALL above from line 1
```

**Anti-drift checkpoint (every ~5 tasks):**
- Am I still on the user's goal or did I wander?
- Is this the simplest solution or am I over-engineering?
- Did I check existing assets before building new?
- Have I made any assumptions I haven't verified?
- **Where is this ultimately going** — what consumes it / where does it belong in the FULL PRISM-app build — and will this change actually REACH that destination, not orphan in the repo? (generating != delivering; building != wiring) → [[feedback_ultimate_destination_check]]

---
