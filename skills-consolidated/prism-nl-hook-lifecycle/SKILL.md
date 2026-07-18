---
name: prism-nl-hook-lifecycle
description: Full NL hook lifecycle — create from natural language, evaluate effectiveness, promote/retire, integrate with cadence auto-fire system
---
# NL Hook Lifecycle

## When To Use
- Creating a new hook from a natural language description instead of writing TypeScript
- "Every time someone asks about titanium, also check tool wear" → NL hook
- Evaluating whether existing NL hooks are firing and providing value
- Promoting a proven NL hook to a permanent TypeScript hook
- Retiring an NL hook that's no longer relevant
- Integrating NL hooks with the DA-MS11 cadence evaluation system
- NOT for: authoring TypeScript hooks directly (use prism-hook-authoring)
- NOT for: tuning cadence intervals (use prism-cadence-tuning)

## How To Use
**CREATE an NL hook (natural language → live hook):**
```
prism_nl_hook → create
params: {
  "description": "When calculating cutting parameters for titanium alloys, always warn about thermal management",
  "event": "calc:speed_feed",
  "priority": "BUSINESS_LOGIC"
}
```
This parses your description into a pattern matcher + action handler.
The NL Hook Engine converts "titanium alloys" → material match pattern,
"warn about thermal management" → warning injection.

**PARSE without creating (dry run):**
```
prism_nl_hook → parse
params: { "description": "Block any calculation with negative depth of cut" }
```
Returns: parsed pattern, proposed event point, confidence score.
Review before approving.

**APPROVE a parsed hook (make it live):**
```
prism_nl_hook → approve
params: { "hook_id": "nl_hook_abc123" }
```
Hook is now active and will fire on matching events.

**LIST all NL hooks:**
```
prism_nl_hook → list
```
Shows: all registered NL hooks with status (active/inactive/pending).

**EVALUATE NL hooks via cadence:**
The `autoNLHookEvaluator` cadence function (fires every 35 tool calls) checks:
1. Which NL hooks have fired since last evaluation
2. Which NL hooks have NEVER fired (potentially stale)
3. Whether any NL hooks are producing excessive warnings (noisy)
4. Pattern match accuracy: are hooks firing on the right events?

Manual evaluation:
```
prism_nl_hook → stats
```
Returns: fire counts, last-fired timestamps, accuracy estimates per hook.

**PROMOTE an NL hook to TypeScript (graduation):**
When an NL hook has proven its value (fired >10 times, no false positives):
1. Get hook logic: `prism_nl_hook → get { "hook_id": "nl_hook_abc123" }`
2. Examine the generated pattern and action
3. Write equivalent TypeScript in the appropriate engine:
   ```typescript
   registerHook('titanium-thermal-warn', 'calc:speed_feed', async (payload) => {
     if (payload.material?.category === 'titanium') {
       return { continue: true, warnings: ['Titanium: verify thermal management strategy'] };
     }
     return { continue: true };
   }, { priority: PRIORITY.BUSINESS_LOGIC });
   ```
4. Retire the NL hook: `prism_nl_hook → remove { "hook_id": "nl_hook_abc123" }`
5. The TypeScript version is faster and more precise.

**RETIRE an NL hook:**
```
prism_nl_hook → remove
params: { "hook_id": "nl_hook_abc123" }
```
Hook stops firing. Disk file preserved in NL_HOOKS_DIR for history.

**CADENCE INTEGRATION:**
The DA-MS11 cadence system has two NL-hook-related functions:
- `autoNLHookEvaluator` (every 35 calls): Checks NL hook fire rates and health
- `autoHookActivationPhaseCheck` (every 45 calls): Verifies phase-appropriate hooks are active

Startup script checks NL hook health: ACTIVE/CODE_ONLY/MISSING status.
Shutdown script includes NL hook evaluation in quality metrics.

**NL HOOK PATTERNS — What works well:**
Good: "When [specific condition], [specific action]"
  "When machining Inconel, warn about work hardening"
  "When tool diameter < 3mm, reduce recommended feed by 20%"
  "Block calculations where spindle speed exceeds machine max RPM"

Bad: Vague descriptions that can't be pattern-matched
  "Make things safer" → too vague, what events? what conditions?
  "Help with titanium" → not actionable, what action to take?

**DISK STORAGE:**
NL hooks persist to: `C:\PRISM\mcp-server\data\nl_hooks\*.json`
Each file contains: pattern, action, event point, priority, creation date, fire count.
Survives MCP server restarts. Loaded on NLHookEngine initialization.

## What It Returns
- Created NL hooks that fire automatically on matching events
- Evaluation reports showing hook effectiveness and fire rates
- Promotion path from NL hook → permanent TypeScript hook
- Integration with cadence system for continuous health monitoring
- Persistent disk storage for cross-session hook survival

## Examples
- Input: "Create a hook that warns when someone asks for cutting params on hardened steel above 55 HRC"
  Create: `prism_nl_hook → create { description: "When calculating cutting parameters for hardened steel above 55 HRC, warn about CBN/ceramic tooling requirement" }`
  Result: NL hook created, fires on calc:speed_feed when material hardness > 55 HRC
  Cadence: autoNLHookEvaluator will track its fire rate at every 35 calls

- Input: "My NL hooks aren't showing up in the startup readiness check"
  Check: `prism_nl_hook → list` → if empty, no hooks created yet
  Check: `ls C:\PRISM\mcp-server\data\nl_hooks\` → if no .json files, hooks not persisted
  Fix: create hooks via `prism_nl_hook → create`, verify disk files appear
  Re-run startup: NL hook health should change from MISSING to ACTIVE

- Input: "NL hook 'titanium-thermal' has fired 50+ times with 0 false positives, promote it"
  Get: `prism_nl_hook → get { hook_id: "titanium-thermal" }`
  Write: equivalent TypeScript hook in appropriate engine file
  Register: at BUSINESS_LOGIC priority (100-199)
  Retire: `prism_nl_hook → remove { hook_id: "titanium-thermal" }`
  Update: HOOK_ACTIVATION_MATRIX.md if the new hook becomes phase-expected
