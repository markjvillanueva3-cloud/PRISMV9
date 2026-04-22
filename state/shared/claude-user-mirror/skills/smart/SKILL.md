---
name: smart
description: "Analyze task complexity and set optimal model, effort level, and team dispatch for the current request. Applies settings automatically — no manual follow-up needed."
model: sonnet
effort: medium
allowed-tools: Read, Bash, Agent, Glob, Grep
argument-hint: "<task description or empty for auto-detect>"
---

# /smart — Intelligent Task Router with Effort Enforcement

Analyze the user's task, determine optimal settings, and APPLY them for the rest of the response.

## Step 1: Classify the Task

Read the user's message (or the argument passed to /smart) and classify:

| Dimension | Options |
|-----------|---------|
| **Domain** | engine, dispatcher, test, pipeline, physics, CAD, catalog, docs, config, toolpath, CLI |
| **Complexity** | trivial (1-2), low (3-4), medium (5-6), high (7-8), extreme (9-10) |
| **Risk** | none, low, medium, high, critical |
| **File Scope** | single, few (2-5), multi (6-20), broad (20+) |

## Step 2: Determine SMART CONFIG

Based on classification:

| Complexity | Model | Effort | Agent Model |
|------------|-------|--------|-------------|
| trivial | HAIKU | LOW | haiku |
| low | HAIKU | LOW | haiku |
| medium | SONNET | MEDIUM | sonnet |
| high | OPUS | HIGH | opus |
| extreme | OPUS | MAX | opus |

**Risk overrides:**
- Risk HIGH or CRITICAL → minimum OPUS + HIGH effort
- Editing `constants.ts`, `physics/`, formula files → force OPUS + MAX
- Editing dispatcher `z.enum`, `settings.json`, `index.ts` exports → force OPUS + HIGH minimum

## Step 3: Output SMART CONFIG Header

```
SMART CONFIG
Role:   {domain specialist}
Model:  {HAIKU|SONNET|OPUS}
Effort: {LOW|MEDIUM|HIGH|MAX}
Risk:   {none|low|medium|high|critical}
Scope:  {single|few|multi|broad}
Team:   {none|forge|test|pipeline}
```

## Step 4: APPLY the Settings (MANDATORY)

After outputting the SMART CONFIG header, you MUST apply these settings for the rest of your response:

**Effort Application Rules:**
- EFFORT: LOW -> Use minimal reasoning. Direct answers. Skip exploration. No extended thinking. Fastest path to answer.
- EFFORT: MEDIUM -> Standard reasoning. Read before editing. Verify syntax. One verification pass.
- EFFORT: HIGH -> Deep reasoning. Extended thinking. Read multiple files. Verify assumptions. Run builds/tests after changes. Cross-reference related engines.
- EFFORT: MAX -> Maximum reasoning depth. Consider all edge cases. Cross-reference physics formulas. Monte Carlo where applicable. Multiple verification passes. Read all related files before any edit.

**Model Application Rules:**
- When spawning Agent tool calls, set the model parameter to match the SMART CONFIG model:
  - HAIKU -> model: "haiku"
  - SONNET -> model: "sonnet"
  - OPUS -> model: "opus"

**Extended Thinking Triggers:**
- EFFORT HIGH or MAX -> Use extended thinking (deep chain-of-thought before acting)
- Physics calculations -> Always use extended thinking regardless of effort level
- Security/safety checks -> Always use extended thinking
- Multi-file refactors -> Always use extended thinking
- Dispatcher wiring -> Always use extended thinking

## Step 5: Auto-Escalation (override SMART CONFIG when needed)

- If a haiku-tier task encounters errors -> escalate to sonnet
- If a sonnet-tier task fails twice -> escalate to opus
- If editing physics constants or formulas -> force OPUS + MAX effort
- If editing dispatcher z.enum or settings.json -> force HIGH effort minimum
- If build fails after edit -> escalate effort by one level and retry
- If test count drops -> escalate to OPUS + HIGH and investigate

## Step 6: Team Recommendation (DO NOT auto-spawn agents)

If the task matches these patterns, SET the Team field and SUGGEST the team — but do NOT
auto-spawn Agent calls. Agent spawning hits API rate limits. Instead, proceed with the work
inline and only use Agent tool if the user explicitly requests team dispatch.

1. **"create engine" / "add engine" / "new engine" / "wire engine"**
   -> Team: forge (suggested, not auto-dispatched)
   -> Proceed inline: explore codebase -> implement -> validate

2. **"run tests" / "test sweep" / "check tests" / "fix tests"**
   -> Team: test (suggested, not auto-dispatched)
   -> Proceed inline: run tests via Bash -> analyze failures -> fix

3. **"pipeline" / "full job" / "print to program" / "post-process"**
   -> Team: pipeline (suggested, not auto-dispatched)
   -> Proceed inline: map deps -> build -> verify

4. **"audit" / "sweep" / "validate all" / "check coverage"**
   -> Team: test (suggested, not auto-dispatched)
   -> Proceed inline: run validation checks directly

Set the Team field in SMART CONFIG to the matched team name, or "none" if no pattern matches.
The user can explicitly run `/team-dispatch <team>` if they want multi-agent execution.

## Step 7: Cowork/Dispatch Output Adaptation

If the environment variable PRISM_COMPACT_OUTPUT=1 is set, or CLAUDE_COWORK=1, or CLAUDE_DISPATCH=1:
- Use compact output format (max 80 chars per line)
- Prefix status lines with OK/WARN/FAIL
- Limit tables to 3 columns, 5 rows
- Use basename-only file paths
- Skip verbose explanations

## Examples

```
User: "Fix a typo in the README"
SMART CONFIG
Role:   docs
Model:  HAIKU
Effort: LOW
Risk:   none
Scope:  single
Team:   none
```

```
User: "Create a new CryogenicMachiningEngine with LN2 heat transfer"
SMART CONFIG
Role:   engine/physics
Model:  OPUS
Effort: MAX
Risk:   high
Scope:  multi
Team:   forge
-> Auto-dispatching forge team...
```

```
User: "Run all tests and fix failures"
SMART CONFIG
Role:   test
Model:  SONNET
Effort: HIGH
Risk:   medium
Scope:  broad
Team:   test
-> Auto-dispatching test team...
```
