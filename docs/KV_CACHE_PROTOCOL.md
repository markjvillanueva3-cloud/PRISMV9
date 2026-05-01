# PRISM KV-CACHE PROTOCOL v1.0
## Session 1.1 Deliverable | Token Efficiency Framework
---

## OVERVIEW

KV-cache (Key-Value cache) enables LLMs to reuse computed attention values for identical prompt prefixes, reducing token costs by up to 90%.

**Target:** 80%+ cache hit rate across sessions
**Method:** Keep prompt prefixes identical, push dynamic content to end

---

## CORE PRINCIPLE

```
┌──────────────────────────────────────────────────────────────────┐
│                    PROMPT STRUCTURE                               │
├──────────────────────────────────────────────────────────────────┤
│  LINES 1-50:  STABLE PREFIX (CACHED)                             │
│  ─────────────────────────────────────────────────────────────   │
│  • System identity, role, laws                                   │
│  • Tool references, path references                              │
│  • Quality equations, validation gates                           │
│  • NEVER CHANGES between sessions                                │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  LINES 51+:   DYNAMIC SUFFIX (NOT CACHED)                        │
│  ─────────────────────────────────────────────────────────────   │
│  • Session ID, timestamps                                        │
│  • Resource counts, tier status                                  │
│  • Current task, progress, quick resume                          │
│  • CHANGES every session (expected)                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## FORBIDDEN IN PREFIX (Lines 1-50)

| Pattern | Example | Reason |
|---------|---------|--------|
| ISO Timestamps | `2026-02-01T08:00:00Z` | Changes every session |
| Dates | `2026-02-01` | Changes daily |
| Session IDs | `SESSION-20260201-080000` | Unique per session |
| Version numbers | `v4.2`, `v1.1.0` | Changes on updates |
| Dynamic counts | `135 skills`, `66 tools` | Changes as resources added |
| Day names | `Monday`, `February 1` | Changes daily |
| Status markers | `COMPLETE ✓`, `← CURRENT` | Changes on progress |
| Update timestamps | `Last updated: ...` | Changes on updates |

---

## REQUIRED IN PREFIX (Lines 1-50)

| Content | Purpose |
|---------|---------|
| System identity | "PRISM Manufacturing Intelligence" |
| Role definition | Primary developer, safety-critical |
| Core laws | 5 Laws (Safety, Complete, No Regress, Predict, Roadmap) |
| Quality equation | Ω(x) formula (static) |
| Tool categories | Named categories (no counts) |
| Path references | Static paths to state files |
| Validation gates | G1-G9 definitions |

---

## HOOKS (CTX-CACHE Series)

### CTX-CACHE-001: Validate Prefix Stability
```yaml
trigger: session_start
action: Compare prefix hash to previous session
on_match: Log cache HIT, increment streak
on_mismatch: Log cache MISS, reset streak
metric: cache_hit_rate (target: ≥80%)
```

### CTX-CACHE-002: Block Dynamic Content in Prefix
```yaml
trigger: prompt_construction, file_write
action: Scan prefix for forbidden patterns
on_violation: ERROR - block save/use
enforcement: HARD BLOCK
```

### CTX-CACHE-003: Force Sorted JSON
```yaml
trigger: json_serialization
action: Always use sort_keys=True
rationale: Unsorted keys cause cache misses
```

---

## MCP TOOLS

### prism_cache_validate
```python
# Validate content for KV-cache stability
result = mcp.call("prism_cache_validate", {
    "file_path": "C:/PRISM/docs/GSD_CORE_v4.md",
    "prefix_lines": 50
})

# Returns:
{
    "valid": True/False,
    "issues": [...],
    "prefix_hash": "abc123...",
    "stability_score": 95,
    "cache_potential": "95.5%"
}
```

### prism_json_sort
```python
# Sort JSON keys for cache stability
result = mcp.call("prism_json_sort", {
    "file_path": "C:/PRISM/state/CURRENT_STATE.json",
    "write": True
})

# Returns:
{
    "sorted": True,
    "was_already_sorted": False,
    "written": True
}
```

---

## METRICS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| cache_hit_rate | ≥80% | TBD | TRACKING |
| prefix_stability | 100% | TBD | TRACKING |
| json_sort_compliance | 100% | TBD | TRACKING |
| dynamic_in_prefix | 0 | TBD | TRACKING |

---

## VALIDATION CHECKLIST

Before deploying prompt changes:

```bash
# 1. Validate for dynamic content
py -3 C:\PRISM\scripts\cache_checker.py --audit <file>

# 2. Check JSON sorting
py -3 C:\PRISM\scripts\prism_json_sort.py <file.json> --check

# 3. View cache metrics
py -3 C:\PRISM\scripts\cache_monitor.py --status
```

**All checks must pass before commit.**

---

## FILE INVENTORY

| File | Purpose | Location |
|------|---------|----------|
| cache_checker.py | Audit prompts for dynamic content | C:\PRISM\scripts\ |
| cache_monitor.py | Track cache hit rates | C:\PRISM\scripts\ |
| cache_mcp.py | MCP tools for cache validation | C:\PRISM\scripts\core\ |
| prism_json_sort.py | Sort JSON keys | C:\PRISM\scripts\ |
| STABLE_PREFIX_TEMPLATE.md | Template for cache-stable prompts | C:\PRISM\docs\ |
| CTX_CACHE_HOOKS.md | Hook definitions | C:\PRISM\docs\ |
| GSD_CORE_CACHE_AUDIT.md | GSD_CORE audit results | C:\PRISM\docs\ |

---

## INTEGRATION

### Session Start (gsd_startup.py)
```python
# Validate cache stability on startup
from cache_monitor import CacheMonitor
monitor = CacheMonitor()
result = monitor.log_session_start(prompt_content, source="gsd_startup")
```

### File Write Operations
```python
# Always sort JSON before writing
import json
with open(path, 'w') as f:
    json.dump(data, f, indent=2, sort_keys=True)  # sort_keys=True REQUIRED
```

### Checkpoint Operations
```python
# Log cache metrics at checkpoint
monitor.get_status()  # Returns current hit rate
```

---

## TROUBLESHOOTING

### Cache Miss Detected
```
Symptom: Hit rate below 80%
Cause: Dynamic content in prefix

Fix:
1. py -3 cache_checker.py --audit <prompt_file>
2. Identify dynamic content
3. Move to line 51+
4. Verify with --audit again
```

### JSON Unsorted Warning
```
Symptom: CTX-CACHE-003 warning
Cause: json.dumps without sort_keys

Fix:
1. py -3 prism_json_sort.py <file.json> --write
2. Update code to always use sort_keys=True
```

---

## MATHEMATICAL IMPACT

```
WITHOUT KV-CACHE:
  Sessions: 100
  Tokens/session: 50,000 (prompt) + 10,000 (completion)
  Total: 6,000,000 tokens

WITH KV-CACHE (80% hit):
  Cached tokens: 50,000 × 0.80 = 40,000 (not recharged)
  Billed tokens: 10,000 (prompt dynamic) + 10,000 (completion)
  Total: 2,000,000 tokens

SAVINGS: 67% token reduction = 3x cost efficiency
```

---

**v1.0 | Session 1.1 | KV-Cache Protocol**
