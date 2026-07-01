# /dont-reinvent — Search Before You Build

Fast internal wheel detection for PRISM. Searches existing engines, actions, and algorithms before allowing new component creation.

## Usage
```
/dont-reinvent <component-type> <description>
/dont-reinvent engine thread-depth-calculator
/dont-reinvent action calculate-tap-drill
/dont-reinvent algorithm chatter-prediction
```

## What It Does
1. Searches `SYSTEM_ARCHITECTURE.json` for matching engines/actions/algorithms
2. Greps `src/engines/` and `src/` for similar function names
3. Shows comparison table with similarity scores
4. Gates the operation based on match strength

## Gate Thresholds
- **≥70% match**: HALT — existing solution covers most needs
- **40-69% match**: WARN — related functionality exists, confirm before proceeding
- **<40% match**: PROCEED — safe to create new component

## Token Savings
- New engine from scratch: ~40-80K tokens
- Extend existing: ~5-15K tokens
- Use existing as-is: ~0-2K tokens

## Integration with /forge-engine
This check runs automatically as Step 1B of `/forge-engine` unless `--force` is passed.

## See Also
- `/forge-engine` — full engine scaffolding with duplication checks
- `/prism-lookup` — search existing reference files
- `/engine-browse` — browse engine categories
