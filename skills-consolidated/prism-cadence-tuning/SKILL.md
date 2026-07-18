---
name: prism-cadence-tuning
description: Tune auto-fire cadence intervals, add/remove cadence functions, adjust thresholds — the operational playbook for the autoHookWrapper timing system
---
# Cadence Tuning

## When To Use
- Cadence functions firing too often (noise) or too rarely (gaps in coverage)
- Adding a new auto-fire function to the cadence system
- "Why isn't autoPhaseSkillLoader firing?" / "autoCheckpoint fires every call, too noisy"
- After changing phases when different cadence functions become relevant
- When session_enhanced_shutdown.py reports 0 cadence fires
- NOT for: creating hooks (use prism-hook-authoring) or NL hooks (use prism-nl-hook-lifecycle)

## How To Use
**UNDERSTAND THE TIMING SYSTEM:**
All cadence lives in `src/auto/autoHookWrapper.ts` function `autoFireCadenceFunctions()`.
Each function has a fire-interval N meaning "fire every Nth tool call".
Current intervals from autoHookWrapper.ts:
```
Call#  Function                    Category
5      autoTodoRefresh             Infrastructure
8      autoContextPressure         Infrastructure
10     autoCheckpoint              Infrastructure
12     autoAttentionScore          Infrastructure
15     autoCompactionDetect        Infrastructure
20     autoSkillHint               Knowledge
25     autoPhaseSkillLoader        Knowledge (DA-MS11)
30     autoSkillContextMatch       Knowledge (DA-MS11)
35     autoNLHookEvaluator         Hooks (DA-MS11)
40     autoScriptRecommend         Scripts (DA-MS11)
42     autoD4PerfSummary           Performance (D4 subsystem stats)
45     autoHookActivationPhaseCheck Hooks (DA-MS11)
50     autoRecoveryManifest        Infrastructure
60     autoSurvivalSave            Infrastructure
```

**TUNING AN INTERVAL:**
1. Open `src/auto/autoHookWrapper.ts`
2. Find the `callCount % N === 0` check for the target function
3. Change N. Guidelines:
   - Infrastructure (todo, pressure, checkpoint): 5-15 (frequent)
   - Knowledge (skills, hints): 20-35 (moderate)
   - Audit (hooks, scripts): 35-50 (infrequent)
   - Safety-net (recovery, survival): 50-60 (rare)
4. Build: `npm run build` from `C:\PRISM\mcp-server`
5. Verify: restart Claude app, check cadence fires via shutdown script

**ADDING A NEW CADENCE FUNCTION:**
1. Write the function in `src/auto/cadenceExecutor.ts`:
```typescript
export function autoMyNewFunction(
  callCount: number,
  conversationHistory: Array<{role: string; content: string}>,
  context: {sessionId?: string; phase?: string}
): string {
  // Return empty string for no injection, or return text to inject
  const relevant = checkSomeCondition(context);
  if (!relevant) return '';
  return '\n[MY_NEW_CADENCE] Actionable message here\n';
}
```
2. Import in `src/auto/autoHookWrapper.ts`:
```typescript
import { autoMyNewFunction } from './cadenceExecutor.js';
```
3. Wire it in `autoFireCadenceFunctions()` with chosen interval:
```typescript
if (callCount % 30 === 0) {
  injections.push(autoMyNewFunction(callCount, conversationHistory, context));
}
```
4. Add to HOOK_ACTIVATION_MATRIX.md for the relevant phase(s)
5. Build and test

**REMOVING/DISABLING A CADENCE FUNCTION:**
Comment out the `if (callCount % N === 0)` block — don't delete, may need later.
Remove from HOOK_ACTIVATION_MATRIX.md expected list (move to optional or remove).

**DIAGNOSING "NOT FIRING":**
1. Run: `py -3 C:\PRISM\scripts\session_enhanced_shutdown.py --json`
2. Check `cadence_fires` in output — if function missing, it never fired
3. Common causes:
   - Interval too high (N=60 but session only had 40 tool calls)
   - Function returns empty string (no injection content)
   - Import missing in autoHookWrapper.ts
   - Build not run after changes
4. Fix: lower interval, check function logic, verify wiring, rebuild

**PHASE-SPECIFIC TUNING:**
Different phases need different cadence profiles:
- Development (D1-D4): Infrastructure heavy, knowledge moderate
- Wiring (W*): Knowledge heavy, audit moderate
- DA (current): All categories active, balanced intervals
- Registry (R*): Knowledge heavy, infrastructure moderate
- Features (F*): Depends on feature — check HOOK_ACTIVATION_MATRIX.md

## What It Returns
- Tuned cadence system where functions fire at appropriate intervals
- New cadence functions wired and firing in the auto-hook system
- Diagnostic data from shutdown script showing actual fire counts vs expected
- Phase-appropriate cadence profile matching HOOK_ACTIVATION_MATRIX.md expectations

## Examples
- Input: "autoNLHookEvaluator never fires in my sessions"
  Diagnose: run shutdown script → check cadence_fires → NL hook evaluator absent
  Check: interval is 35, but average session is 25 tool calls → lower to 20
  Fix: edit autoHookWrapper.ts, change `callCount % 35` to `callCount % 20`, rebuild

- Input: "I want to add a cadence function that checks for stale registry data"
  Write: `autoRegistryStaleCheck()` in cadenceExecutor.ts
  Wire: import + add `if (callCount % 30 === 0)` block in autoHookWrapper.ts
  Matrix: add to W5/R1 expected hooks in HOOK_ACTIVATION_MATRIX.md
  Build: `npm run build`, restart Claude app, verify via startup script

- Edge case: "Two cadence functions at same interval"
  Both fire on same call — this is fine, they're independent.
  If one depends on the other's output, stagger intervals (e.g., 25 and 30).
