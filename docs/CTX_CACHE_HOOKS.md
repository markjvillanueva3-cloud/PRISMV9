# PRISM CONTEXT HOOKS - CTX-CACHE Series
## KV-Cache Stability | Manus Law 1 Implementation
---

## OVERVIEW

The CTX-CACHE hooks enforce KV-cache stability rules to achieve up to 10x token cost reduction.

**Key Insight:** When prompt prefixes are identical across sessions, the LLM can reuse cached key-value computations instead of reprocessing them.

---

## HOOK DEFINITIONS

### CTX-CACHE-001: Validate Prefix Stability

```yaml
id: CTX-CACHE-001
name: Validate Prefix Stability
category: context_cache
priority: HIGH

trigger:
  - session_start
  - prompt_load

action: |
  1. Load previous session's prompt prefix hash
  2. Compute current prompt prefix hash (first 50 lines)
  3. Compare hashes
  4. Log result to CACHE_STABILITY_LOG.json

validation:
  - prefix_hash_match: true
  - max_prefix_changes: 0

on_failure:
  - severity: WARN
  - message: "Prefix changed - KV-cache invalidated. Expected 10x cost increase."
  - action: log_and_continue

metrics:
  - cache_hit_potential: 0.0-1.0
  - prefix_stability_streak: integer (consecutive stable sessions)

implementation: |
  # Python pseudocode
  def validate_prefix_stability():
      prev_hash = load_previous_prefix_hash()
      curr_hash = compute_prefix_hash(current_prompt, lines=50)
      
      if prev_hash != curr_hash:
          log_warning("CTX-CACHE-001: Prefix changed")
          record_cache_miss()
      else:
          record_cache_hit()
          increment_stability_streak()
```

---

### CTX-CACHE-002: Block Dynamic Content in Prefix

```yaml
id: CTX-CACHE-002
name: Block Dynamic Content in Prefix
category: context_cache
priority: CRITICAL

trigger:
  - prompt_construction
  - file_write (to prompt files)

action: |
  1. Scan first 50 lines for forbidden patterns
  2. Forbidden patterns:
     - ISO timestamps: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}
     - Dates: \d{4}-\d{2}-\d{2}
     - Session IDs: SESSION-\w+
     - Dynamic counts: \d+ (skills|agents|hooks)
     - Version numbers in dynamic context
  3. If found in prefix → ERROR

validation:
  - dynamic_content_in_prefix: 0

on_failure:
  - severity: ERROR
  - message: "Dynamic content detected in prefix at line {line}"
  - action: BLOCK (do not save/use prompt)
  - suggestion: "Move dynamic content to line 51+ or end of file"

enforcement: HARD_BLOCK

patterns_to_detect:
  - pattern: '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
    name: ISO timestamp
    
  - pattern: 'SESSION-\w+-\d+'
    name: Session ID
    
  - pattern: '\d+ (skills|agents|hooks|formulas)'
    name: Dynamic resource count
    
  - pattern: 'Last updated:.*'
    name: Update timestamp
    
  - pattern: '"lastUpdated":\s*"[^"]+"'
    name: JSON timestamp field

implementation: |
  def block_dynamic_in_prefix(content: str) -> bool:
      lines = content.split('\n')[:50]  # First 50 = prefix
      prefix = '\n'.join(lines)
      
      for pattern in DYNAMIC_PATTERNS:
          if re.search(pattern, prefix):
              raise CacheStabilityError(
                  f"CTX-CACHE-002: Dynamic content in prefix: {pattern}"
              )
      return True
```

---

### CTX-CACHE-003: Force Sorted JSON

```yaml
id: CTX-CACHE-003
name: Force Sorted JSON Keys
category: context_cache
priority: HIGH

trigger:
  - json_serialize
  - json_write
  - state_save

action: |
  1. Intercept all JSON serialization
  2. Apply sort_keys=True
  3. Verify output is alphabetically sorted
  4. Log any violations

validation:
  - json_keys_sorted: true

on_failure:
  - severity: WARN
  - message: "JSON keys not sorted - cache may be affected"
  - action: auto_sort_and_continue

rationale: |
  JSON object key order affects string representation.
  {"b": 1, "a": 2} != {"a": 2, "b": 1} as strings
  Unsorted keys cause cache misses even with identical data.

implementation: |
  # Always use this for JSON serialization
  def safe_json_dumps(data, **kwargs):
      kwargs['sort_keys'] = True
      kwargs.setdefault('indent', 2)
      return json.dumps(data, **kwargs)
  
  # Monkey-patch if needed
  original_dumps = json.dumps
  json.dumps = lambda *a, **kw: original_dumps(*a, sort_keys=True, **kw)
```

---

## METRICS DASHBOARD

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| cache_hit_rate | ≥ 80% | TBD | TRACKING |
| prefix_stability | 100% | 100% | ✓ |
| dynamic_in_prefix | 0 | 0 | ✓ |
| json_sort_compliance | 100% | 100% | ✓ |

---

## INTEGRATION POINTS

### 1. Session Start (gsd_startup.py)
```python
# Add to session start
from cache_checker import compute_prefix_hash, validate_prefix_stability

def on_session_start():
    # CTX-CACHE-001
    validate_prefix_stability()
    
    # Log for metrics
    log_cache_event("session_start", {
        "prefix_hash": compute_prefix_hash(current_prompt),
        "timestamp": datetime.now().isoformat()
    })
```

### 2. File Write (any prompt/state file)
```python
# Add to file write operations
def write_prompt_file(path, content):
    # CTX-CACHE-002
    if is_prompt_file(path):
        validate_no_dynamic_in_prefix(content)
    
    # CTX-CACHE-003
    if path.endswith('.json'):
        content = sort_json_keys(json.loads(content))
        content = json.dumps(content, sort_keys=True, indent=2)
    
    write_file(path, content)
```

### 3. Checkpoint (session_memory_manager.py)
```python
# Add to checkpoint
def checkpoint():
    # Record cache metrics
    metrics = {
        "prefix_hash": get_current_prefix_hash(),
        "stability_streak": get_stability_streak(),
        "cache_hit_potential": compute_cache_hit_potential()
    }
    append_to_log("CACHE_METRICS", metrics)
```

---

## CACHE STABILITY CHECKLIST

Before deploying any prompt changes:

- [ ] Run `py -3 cache_checker.py --audit <file>`
- [ ] Verify prefix_safe = true
- [ ] Verify dynamic_in_prefix = 0
- [ ] Run `py -3 prism_json_sort.py <file.json> --check`
- [ ] All JSON files sorted
- [ ] No timestamps in first 50 lines
- [ ] No session IDs in first 50 lines
- [ ] No dynamic counts in first 50 lines

---

## TROUBLESHOOTING

### Cache Miss Detected
```
Symptom: CTX-CACHE-001 warns "Prefix changed"
Cause: Something in first 50 lines changed
Fix:
  1. Run cache_checker.py --compare <old> <new>
  2. Identify the difference
  3. Move dynamic content to end of file
  4. Restore prefix to previous version
```

### Dynamic Content Warning
```
Symptom: CTX-CACHE-002 errors "Dynamic content in prefix"
Cause: Timestamp/count/ID in first 50 lines
Fix:
  1. Find the offending line
  2. Move to line 51+ or end of file
  3. Replace with static placeholder if needed
```

### Unsorted JSON
```
Symptom: CTX-CACHE-003 warns "JSON keys not sorted"
Cause: json.dumps called without sort_keys=True
Fix:
  1. Run prism_json_sort.py <file.json>
  2. Update code to always use sort_keys=True
```

---

**v1.0 | Session 0.1 Deliverable | CTX-CACHE Hooks**
