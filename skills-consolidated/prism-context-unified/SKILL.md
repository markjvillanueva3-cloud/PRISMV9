---
name: prism-context-unified
description: |
  Unified context management for PRISM. Covers Manus 6 Laws, pressure-based
  truncation (v2), KV-cache optimization, Context DNA fingerprints, and
  session lifecycle. Use when: managing sessions, preventing overflow,
  optimizing tokens, checkpointing, handling compaction, recovering state.
  Consolidates: context-engineering, context-pressure, context-dna, kv-cache-optimizer.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "context", "unified", "management", "manus", "laws", "pressure", "based"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-context-unified")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-context-unified") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about context
→ Load skill: skill_content("prism-context-unified") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires unified guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Context Unified
## Manus 6 Laws + Pressure v2 + KV-Cache + Context DNA

## 1. MANUS 6 LAWS

**Law 1 — KV-Cache Stability:** Stable content (system prompt, skills) at TOP. Changes to early tokens invalidate the entire cache. Use `prism_context→kv_sort_json` for consistent JSON key ordering. Use `prism_context→kv_check_stability` to verify.

**Law 2 — Mask, Don't Remove:** Mark content inactive instead of deleting. Deletion shifts token positions, breaking cache. Use `prism_context→tool_mask_state`.

**Law 3 — File System as Context:** Write intermediate results to disk, read back when needed. Context window is precious; disk is free. Use `prism_context→memory_externalize` / `memory_restore`.

**Law 4 — TODO as Persistent Memory:** Running TODO list survives compaction. Single source of truth. `prism_context→todo_update` (auto-fires @5 calls) / `todo_read`.

**Law 5 — Error Preservation:** Errors are the most valuable context. Never let them scroll away. `prism_context→error_preserve` after failures; `error_patterns` for recurring.

**Law 6 — Vary Responses:** Track outputs, avoid repetition. `prism_context→vary_response`.

## 2. PRESSURE-BASED CONTEXT MANAGEMENT (v2)

The MCP server measures pressure every 8 calls via `autoContextPressure()`.
**Pressure percentage is the SOLE governor of truncation.** Call counts are advisory labels only.

### Truncation Caps (Pressure-Driven)

| Pressure | Cap | Behavior |
|----------|-----|----------|
| 0-59% | 20KB | Full responses, no trimming |
| 60-69% | 12KB | Auto-compress fires, survival save |
| 70-84% | 8KB | Python compress, significant trimming |
| 85%+ | 5KB | Essential content only |

### Advisory Zones (Labels Only — Do NOT Set Caps)

| Zone | Calls | Note |
|------|-------|------|
| 🟢 GREEN | 0-20 | Normal operation |
| 🟡 YELLOW | 21-30 | Plan checkpoint |
| 🔴 RED | 31-40 | Checkpoint recommended |
| ⚫ BLACK | 41+ | Auto-save + survival (but no forced stop) |

A session at call 45 with 30% pressure still gets 20KB cap.

### Automatic Actions
- **60%+:** Auto-compress, COMPACTION_SURVIVAL.json saved, attention scored
- **70%+:** Python compress, 8KB cap
- **85%+:** Emergency 5KB, survival always fresh
- **<40%:** Context pullback — restore previously evicted data

### Survival Saves (Triple Safety Net, All Automatic)
1. Every 15 calls — periodic checkpoint
2. At 41+ calls — with CURRENT_STATE.json
3. At 60%+ pressure — during auto-compress

### Monitoring
Read `_cadence.pressure` in every tool response: `{pressure_pct, zone, truncation_cap}`.
If climbing fast: finish current unit, avoid large requests, save proactively.

## 3. KV-CACHE OPTIMIZATION

### Optimal Prompt Structure
```
[SYSTEM PROMPT]     ← 100% stable, never changes
[SKILLS/KNOWLEDGE]  ← 95% stable, load in CONSISTENT order
[STATE SNAPSHOT]    ← 80% stable, update only at checkpoints
[CONVERSATION]      ← Variable
[CURRENT MESSAGE]   ← Variable
```
Everything above [CONVERSATION] should be cacheable.

### Cache-Breaking Anti-Patterns (AVOID)
1. **Random JSON key ordering** — Use `prism_context→kv_sort_json` for consistency
2. **Timestamps in stable sections** — Only in variable section
3. **Reordering skills between turns** — Use canonical alphabetical/priority order
4. **Inline variable data in stable sections** — Use `[REF]` pattern instead

### Cache Health: GREEN >60% prefix stability | YELLOW 40-60% | RED <40%

## 4. CONTEXT DNA — Session Recovery Fingerprints

Context DNA enables 90% recovery after compaction or new chats.
**Principle:** Store decisions and patterns, not raw data.

### DNA Structure (in CURRENT_STATE.json)
```json
{
  "contextDNA": {
    "version": "1.0",
    "lastUpdated": "ISO-timestamp",
    "essence": {
      "whatWeAreDoing": "Brief project description",
      "currentFocus": "Current task area",
      "currentFile": "Active file path",
      "position": "Exact resume point"
    },
    "keyDecisions": ["max 10 — remove obsolete"],
    "patternsProven": {"taskType": "template → steps"},
    "patternsFailed": ["max 10 — what NOT to do"],
    "criticalPaths": {"state": "...", "materials": "..."},
    "reconstructionHints": ["If lost: Read CURRENT_STATE.json first"]
  }
}
```

### Update Rules
- **Every session:** Verify DNA, update `essence.position` at end
- **On decision:** Add to `keyDecisions` (cap at 10)
- **On success:** Add to `patternsProven`
- **On failure:** Add to `patternsFailed`

### Recovery Protocol
1. **After Compaction:** Read transcript → Read CURRENT_STATE.json → Extract DNA → Resume from `position`
2. **After New Chat:** Read state → Announce recovery → Display essence + decisions + patterns → Resume
3. **Emergency (no state):** Read SESSION_LOGS/ → Reconstruct → Read EXTRACTED/ → Resume from last known

## 5. SESSION LIFECYCLE

### Boot
```
prism_dev→session_boot  // loads state, tracker, roadmap in 1 call
```

### Auto-Fire Cadence
@5: todo_update | @8: pressure check | @10: checkpoint | @12: compaction check | @15: survival save | @20: vary_response

### End
```
prism_session→state_save → prism_session→auto_checkpoint → prism_context→todo_update
```

## 6. ANTI-PATTERNS
- Don't load entire registries into context (3518 materials × 127 params = explosion)
- Don't keep verbose error traces after capturing them
- Don't repeat instructions already in system prompt
- Don't inline large code blocks — reference file paths
- Don't modify content above the "stable line" (breaks KV-cache)
