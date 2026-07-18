---
name: prism-hook-activation-audit
description: Run hook activation coverage audits for any phase — identify missing hooks, diagnose wiring gaps, fix coverage issues using the HOOK_ACTIVATION_MATRIX
---
# Hook Activation Audit

## When To Use
- After switching development phases to verify correct hooks are active
- "Which hooks should fire during F3 but aren't?" / "Why is my hook coverage 60%?"
- Session shutdown reports low hook coverage percentage
- Before starting a new phase to ensure proper hook infrastructure
- When adding new features that need hook coverage verification
- NOT for: authoring individual hooks (use prism-hook-authoring)
- NOT for: tuning fire intervals (use prism-cadence-tuning)

## How To Use
**QUICK AUDIT via script:**
```bash
py -3 C:\PRISM\scripts\session_enhanced_startup.py --phase F3
```
Shows: expected hooks, optional hooks, readiness score for that phase.

```bash
py -3 C:\PRISM\scripts\session_enhanced_shutdown.py --json
```
Shows: which hooks actually fired, which were missing, coverage percentage.

**FULL AUDIT via MCP:**
```
prism_hook → coverage    # Shows all hook coverage stats
prism_hook → gaps        # Shows registration gaps
prism_hook → performance # Shows slow/failing hooks
prism_hook → failures    # Shows recent hook failures
```

**READING THE HOOK_ACTIVATION_MATRIX:**
File: `C:\PRISM\mcp-server\data\docs\roadmap\HOOK_ACTIVATION_MATRIX.md`
Format: `| Phase | Expected Hooks | Optional Hooks | Notes |`

Expected = MUST fire during that phase or coverage is degraded.
Optional = CAN fire, improves coverage, but not penalized if absent.
Infrastructure hooks (todo, checkpoint, pressure, compaction, attention, survival, recovery) fire in ALL phases and aren't listed per-phase.

**DIAGNOSING LOW COVERAGE:**
1. Get phase: check CURRENT_STATE.json or startup log
2. Get expected: read HOOK_ACTIVATION_MATRIX.md for that phase row
3. Get actual: run shutdown script, read `hook_audit.fired` array
4. Diff: `missing = expected - fired`
5. For each missing hook, check:
   a. Is it imported in autoHookWrapper.ts? → if no, add import
   b. Is it wired in autoFireCadenceFunctions()? → if no, add wiring
   c. Is its interval reachable? → if N>session_length, lower N
   d. Does it return content? → if always empty string, fix logic
   e. Was there a build after wiring? → `npm run build`

**FIXING A COVERAGE GAP:**
Scenario: `autoPhaseSkillLoader` expected but missing.
```
Step 1: verify import in autoHookWrapper.ts
  → search for "autoPhaseSkillLoader" in imports
Step 2: verify wiring in autoFireCadenceFunctions()
  → search for "autoPhaseSkillLoader" in function body
Step 3: check interval  
  → if callCount % 25 but session had 20 calls, lower to 15
Step 4: check function logic in cadenceExecutor.ts
  → does it return empty for current phase?
Step 5: rebuild and retest
```

**UPDATING THE MATRIX:**
When adding a new cadence function or changing phase coverage:
1. Open HOOK_ACTIVATION_MATRIX.md
2. Add function name to Expected or Optional column for target phases
3. Use comma-separated list within the cell
4. Infrastructure hooks don't need per-phase listing
5. Commit: the matrix is the source of truth for coverage auditing

**CROSS-PHASE COVERAGE CHECK (all phases at once):**
```python
import subprocess, json
phases = ['D1','D2','D3','D4','DA','W1','W2','W3','W4','W5','R1','F1','F2','F3','F4','F5','F6','F7','F8']
for p in phases:
    result = subprocess.run(['py','-3','C:\\PRISM\\scripts\\session_enhanced_startup.py','--phase',p,'--json'], capture_output=True, text=True)
    data = json.loads(result.stdout)
    hooks = data['hooks']
    print(f"{p}: {hooks['expected_count']} expected, {hooks['optional_count']} optional")
```

## What It Returns
- Coverage percentage: fired hooks / expected hooks * 100
- List of missing hooks that should fire but didn't
- List of extra hooks that fired but weren't in the matrix
- Actionable fix steps for each gap (import, wire, interval, logic, build)
- Cross-phase coverage report for all development phases

## Examples
- Input: "Run hook audit for current DA phase"
  Execute: `py -3 C:\PRISM\scripts\session_enhanced_shutdown.py --json`
  Result: coverage_pct=70%, missing=[autoKnowledgeCrossQuery, autoDocAntiRegression]
  Fix: check if those functions exist in cadenceExecutor.ts, add if missing, wire in autoHookWrapper.ts

- Input: "Verify F5 multi-tenant phase has proper hooks before starting"
  Execute: `py -3 C:\PRISM\scripts\session_enhanced_startup.py --phase F5`
  Result: expected=[autoTenantIsolation, autoMultiTenantValidation], optional=[autoSLBPatternShare]
  Action: confirm all expected hooks exist, are wired, and have reachable intervals

- Edge case: "Coverage shows 100% but shutdown quality is still low"
  Hook coverage is only one factor in quality score. Check also:
  cadence fire total (>0 required), skill injection count, session duration.
  Quality formula penalizes: 0 cadence fires (-15), 0 skills injected (-5), short sessions with no work (-30).
