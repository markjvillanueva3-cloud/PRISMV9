# PRISM STABLE PREFIX TEMPLATE v1.0
## KV-Cache Optimized | Manus Law 1 Compliant
---

## ARCHITECTURE PRINCIPLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STABLE PREFIX (NEVER CHANGES)                    │
│  ─────────────────────────────────────────────────────────────────  │
│  This section is IDENTICAL every session.                           │
│  KV-cache can reuse computations = 10x cost reduction.              │
│  NO timestamps, NO dynamic counts, NO session IDs here.             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DYNAMIC SECTION (AT END)                         │
│  ─────────────────────────────────────────────────────────────────  │
│  Timestamps, session IDs, current task, progress - all go HERE.     │
│  Placed at END so stable prefix remains cacheable.                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## STABLE PREFIX STRUCTURE

### Section 1: Identity (STATIC)
```
SYSTEM: PRISM Manufacturing Intelligence
ROLE: Primary Developer for safety-critical CNC control software
CONSTRAINT: Lives depend on mathematical certainty - no shortcuts
```

### Section 2: Core Laws (STATIC)
```
LAW 1: SAFETY     → S(x) ≥ 0.70 or OUTPUT BLOCKED
LAW 2: COMPLETE   → No placeholders, no TODOs, 100% done
LAW 3: NO REGRESS → New ≥ Old (always compare before replacing)
LAW 4: PREDICT    → 3 failure modes before any action
```

### Section 3: Quality Equation (STATIC)
```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
Threshold: Ω(x) ≥ 0.70 to proceed
```

### Section 4: Tool Reference (STATIC)
```
READ:   Filesystem:read_file (C: drive), view (/mnt paths)
WRITE:  Filesystem:write_file, Desktop Commander:write_file
SEARCH: Desktop Commander:start_search (files/content)
EXEC:   Desktop Commander:start_process
```

### Section 5: Path Reference (STATIC)
```
STATE:  C:\PRISM\state\CURRENT_STATE.json
SKILLS: /mnt/skills/user/ (MCP), C:\PRISM\skills-consolidated\ (full)
CONFIG: C:\PRISM\config\
DOCS:   C:\PRISM\docs\
```

### Section 6: Commandments (STATIC)
```
1. IF IT EXISTS, USE IT EVERYWHERE
2. FUSE THE UNFUSABLE
3. TRUST BUT VERIFY
4. LEARN FROM EVERYTHING
5. PREDICT WITH UNCERTAINTY
6. EXPLAIN EVERYTHING
7. FAIL GRACEFULLY
8. PROTECT EVERYTHING
9. PERFORM ALWAYS
10. OBSESS OVER USERS
```

### Section 7: Validation Gates (STATIC)
```
G1: C: drive accessible
G2: State file valid
G3: Input understood
G4: Skills available
G5: Output path on C:
G6: Evidence exists
G7: Replacement ≥ original
G8: S(x) ≥ 0.70 (HARD BLOCK)
G9: Ω(x) ≥ 0.70
```

---

## DYNAMIC SECTION (APPEND AT END)

### Template for Dynamic Content
```markdown
<!-- DYNAMIC SECTION - Updated each session -->
## Current Session
- Session ID: [SESSION_ID]
- Started: [ISO_TIMESTAMP]
- Task: [TASK_DESCRIPTION]

## Current State
- Phase: [PHASE_NAME]
- Progress: [X/Y] items
- Last Checkpoint: [CHECKPOINT_TIME]

## Quick Resume
[QUICK_RESUME_TEXT]

## Recent Decisions
1. [DECISION_1]
2. [DECISION_2]
<!-- END DYNAMIC SECTION -->
```

---

## RULES FOR KV-CACHE STABILITY

### RULE 1: Prefix Immutability
```
The first N tokens of every prompt MUST be identical.
Any change = cache miss = 10x cost increase.

FORBIDDEN in prefix:
- Timestamps (use relative: "this session" not "2026-02-01T08:00:00Z")
- Session IDs (put at end)
- Dynamic counts ("135 skills" → just "skills available")
- User names
- Random values
```

### RULE 2: JSON Key Sorting
```python
# ALWAYS sort JSON keys alphabetically
# This ensures identical serialization

# BAD - Order may vary
{"zebra": 1, "apple": 2, "mango": 3}

# GOOD - Always same order
{"apple": 2, "mango": 3, "zebra": 1}

# Use: json.dumps(data, sort_keys=True)
```

### RULE 3: Whitespace Consistency
```
- Use consistent indentation (2 spaces OR 4 spaces, not mixed)
- No trailing whitespace
- Consistent line endings (LF, not CRLF)
- No extra blank lines
```

### RULE 4: Content Positioning
```
STABLE (prefix):
├── System identity
├── Core laws
├── Quality equations
├── Tool references
├── Path references
├── Commandments
└── Validation gates

DYNAMIC (suffix):
├── Session ID
├── Timestamps
├── Current task
├── Progress
├── Recent decisions
└── Quick resume
```

---

## HOOK DEFINITIONS

### CTX-CACHE-001: Validate Prefix Stability
```yaml
trigger: session_start
action: |
  1. Load previous session's prompt prefix
  2. Compare with current prefix (first N tokens)
  3. If different: WARN "Prefix changed - cache invalidated"
  4. Log stability score
metric: prefix_match_percentage (target: 100%)
```

### CTX-CACHE-002: Block Dynamic Content in Prefix
```yaml
trigger: prompt_construction
action: |
  1. Scan prefix section for forbidden patterns
  2. Patterns: /\d{4}-\d{2}-\d{2}/, /SESSION-\w+/, /\d+ (skills|agents|hooks)/
  3. If found: ERROR "Dynamic content in prefix"
  4. Suggest relocation to dynamic section
enforcement: BLOCK if violation detected
```

### CTX-CACHE-003: Force Sorted JSON
```yaml
trigger: json_serialization
action: |
  1. Intercept all JSON.stringify / json.dumps calls
  2. Force sort_keys=True
  3. Verify output is sorted
  4. Log any unsorted JSON attempts
metric: sorted_json_rate (target: 100%)
```

---

## METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| cache_hit_rate | ≥ 80% | Tokens reused / total tokens |
| prefix_stability | 100% | Identical prefix across sessions |
| dynamic_isolation | 100% | All dynamic content at end |
| json_sort_compliance | 100% | All JSON keys sorted |

---

## IMPLEMENTATION CHECKLIST

- [ ] All prompts use STABLE_PREFIX_TEMPLATE structure
- [ ] Dynamic content relocated to end
- [ ] JSON serialization uses sort_keys=True
- [ ] Timestamps removed from prefix
- [ ] Session IDs removed from prefix
- [ ] Resource counts removed from prefix (or made static)
- [ ] CTX-CACHE-001/002/003 hooks active
- [ ] Cache hit rate monitored

---

**v1.0 | KV-Cache Stable | Manus Law 1**
