---
policy:
  tier: 1
  triggers:
    - "review"
    - "how does this look"
    - "second opinion"
---
# Review — Unified Dispatcher

Single entry point for the review family of skills. Routes to the right specialised review based on the first argument. Reviews are subjective-quality checks (style, tradeoffs, gut-feel) — distinct from `/audit` (invariant verification).

## Args: $ARGUMENTS
- `<target>`: one of `cad | error | code | github | sparc | pr | branch | engine | dispatcher | test`
- `[remainder]`: passed through to the routed skill

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"review"
    - keyword:"how does this look"
    - keyword:"second opinion"
    - on:UserPromptSubmit
```

## Routing table

| `<target>` | Routes to | Purpose |
|------------|-----------|---------|
| `cad`        | `/cad-review`           | CAD model: tolerances, fillets, manufacturability flags |
| `error`      | `/error-learn-review`   | Recent error-ledger rows; surface fixable patterns |
| `code`       | `/code-review`          | Style + correctness + readability on changed files |
| `github`     | `/github-review`        | Open PR: diff summary, blast-radius, suggest reviewers |
| `sparc`      | `/sparc-review`         | SPARC-methodology spec/pseudo/refine assessment |
| `pr`         | `/github-review --pr=current` | Same as `github` for the active PR |
| `branch`     | `/scrutinize --branch=current`| Branch-level scrutiny with all 4 review axes |
| `engine`     | `/physics-review`       | PRISM engine: formula sanity, constants references |
| `dispatcher` | `/wiring-review`        | New dispatcher actions: schema + case + test wired |
| `test`       | `/test-review`          | Test legitimacy (no toBeDefined-only stubs) |

## Behaviour
- Unknown target: list valid targets
- `review` with no target: print routing table
- Each routed skill respects its own `policy` (tier, triggers, args)

## Difference from /audit
- `/audit` — invariant verification (does this thing pass the rules?)
- `/review` — subjective quality (is this thing good?)

Both can be run on the same artifact. Audit gives a binary PASS/FAIL; review gives a graded assessment + improvement suggestions.

## Related
- `/scrutinize` — heaviest single-pass review (3-of-3 reviewer consensus)
- `/audit` — sister dispatcher for invariant checks
