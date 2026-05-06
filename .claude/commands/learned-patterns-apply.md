---
policy:
  tier: 1
  triggers:
    - "learned-patterns-apply"
    - "learned patterns"
    - "apply lessons"
    - "why did this break"
---
# Learned Patterns Apply — Extract + Apply From Error-Learn Ledger

Read the unified error ledger (`mcp-server/data/state/UNIFIED_ERROR_LEDGER.jsonl`), find recurring error+fix pairs, and either preview the lessons or apply them as code edits / hook tightening / skill updates. Closes the loop between "Claude broke something, the user fixed it" and "Claude knows not to break that thing again."

## Args: $ARGUMENTS
- (none) — preview the top 10 learnable patterns
- `--apply=<pattern-id>`: apply a specific pattern (writes diff or hook edit)
- `--top=<n>`: how many patterns to surface (default: 10)
- `--source=<learner|recovery|session|pattern_memory>`: filter by ledger source
- `--since=<iso-date>`: only patterns first seen on/after this date

## Trigger policy
```yaml
policy:
  tier: 2
  triggers:
    - keyword:"learned patterns"
    - keyword:"apply lessons"
    - keyword:"why did this break"
    - on:Stop  # opt-in; off by default
```

## How patterns are extracted
1. **Bucket** ledger rows by `signature` field (canonical: `tool :: errorClass :: first-line-of-message`, paths stripped)
2. **Count** repeats per signature; signatures with ≥3 occurrences become *learnable*
3. **Pair** each error row with the next row from the same session that shows a `fix` payload
4. **Generalise** the (error → fix) pair into a (pattern → policy) shape:
   - Code patterns → suggested guard or assertion
   - Hook patterns → tighten timeout / add precondition
   - Skill patterns → update skill's trigger keywords or examples

## Apply modes
| Mode | What happens |
|------|--------------|
| Code edit | Writes a `// SAFETY: P{milestone}/learned-pattern-{id}` comment + the guard line |
| Hook edit | Updates `.claude/hooks/<name>.mjs` with a new precondition or timeout |
| Skill edit | Adds a policy.trigger or example to the relevant `.claude/commands/*.md` |
| Test add | Generates a regression test if none exists for the pattern |

All apply modes go through the test legitimacy gate so they can't ship as no-op stubs.

## Source schema (ledger row)
```json
{
  "id": "...",
  "ts": "...",
  "source": "learner|recovery|session|pattern_memory",
  "tool": "Bash|Edit|Write|...",
  "context": { ... },
  "signature": "tool :: errorClass :: first-line",
  "embedding_id": null
}
```

## MCP wiring
- Read: `prism_memory:semantic_search { kind: "error", query }` finds similar past errors
- Apply: no dedicated dispatcher yet; this skill drives Edit/Write directly

## Safety
- `--apply` requires the user to confirm the diff before write
- Patterns marked `confidence < 0.6` are surface-only (not applicable)
- Each apply records its own ledger row with `source:applied-by-skill` so future runs don't reprocess

## Related
- `/error-learn-review` — manual triage of recent ledger rows
- `/scrutinize` — uses learned patterns as one of many review axes
