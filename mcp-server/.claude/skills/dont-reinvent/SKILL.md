---
name: dont-reinvent
description: Intercepts build requests to search for existing PRISM engines, actions, and patterns before writing new code. Prevents internal wheel reinvention.
argument-hint: <component-type> <name-or-description>
---

# /dont-reinvent — Internal Wheel Detection

## Trigger Phrases
This skill should be invoked BEFORE creating new:
- Engines ("build an engine", "create a new engine", "write an engine for")
- Actions ("add an action", "implement action", "new action for")
- Algorithms ("create an algorithm", "add algorithm")
- Dispatchers ("new dispatcher", "add dispatcher")
- Any component ("implement", "build", "create", "write", "add") + manufacturing/physics concept

## Args: $ARGUMENTS
Optional: `<component-type> <description>`
Example: `engine thread-depth-calculator`

## Protocol — Search Before Scaffold

### Step 1: Parse Intent
Extract from user request or $ARGUMENTS:
- **Component type**: engine | action | algorithm | dispatcher | hook | utility
- **Domain concept**: the manufacturing/physics concept (e.g., "thread depth", "cutting force", "tool life")
- **Keywords**: 2-4 search terms derived from the concept

### Step 2: Search SYSTEM_ARCHITECTURE.json
Read `H:\prism\mcp-server\SYSTEM_ARCHITECTURE.json` and search:

1. **Engines array**: Match keywords against engine names
2. **Dispatcher actions**: Match keywords against action names in all dispatchers
3. **Algorithms array**: Match keywords against algorithm names

Record all matches with similarity scores (exact match = 100%, partial = 50-99%, keyword overlap = 20-49%).

### Step 3: Grep Codebase for Functions
Search the codebase for function names containing the keywords:

```bash
# Search engine files for similar function/method names
grep -rn "function.*<keyword>\|<keyword>.*=\s*function\|<keyword>(" src/engines/ --include="*.ts" | head -20

# Search for exported functions/methods
grep -rn "export.*<keyword>\|public.*<keyword>" src/ --include="*.ts" | head -20
```

### Step 4: Check ENGINE_DIGEST.md (if engine request)
If requesting a new engine, read categories in:
- `H:\prism\mcp-server\data\docs\ENGINE_DIGEST.md` (if exists)
- Or grep for similar engine class names in `src/engines/`

### Step 5: Build Comparison Table

If matches found, present:

```
EXISTING SOLUTIONS FOUND
========================
| Match | Component | Location | Similarity | What It Does |
|-------|-----------|----------|------------|--------------|
| 1     | <name>    | <path:line> | <X>%    | <brief desc> |
| 2     | <name>    | <path:line> | <X>%    | <brief desc> |
| ...   | ...       | ...      | ...        | ...          |

RECOMMENDATION
--------------
[ ] USE EXISTING: <name> at <path> — covers <X>% of your needs
[ ] EXTEND: <name>.addMethod() — add missing functionality
[ ] NEW ENGINE: Only if <reason why existing doesn't work>

TOKEN ESTIMATE
--------------
- New engine from scratch:  ~40-80K tokens
- Extend existing engine:   ~5-15K tokens  
- Use existing as-is:       ~0-2K tokens (just import)
```

### Step 6: Gate Decision

**If similarity >= 70%:**
WARN: "Existing solution covers most of your needs. Explain why it won't work before proceeding."

**If similarity >= 40%:**
ASK: "Related functionality exists. Would you like to extend <X> or create new?"

**If similarity < 40%:**
PROCEED: "No close matches found. Safe to create new component."

## Quick Reference Files

| Purpose | File | Use When |
|---------|------|----------|
| All engines | SYSTEM_ARCHITECTURE.json → .engines | Always |
| All actions | SYSTEM_ARCHITECTURE.json → .dispatchers{}.actions | Always |
| All algorithms | SYSTEM_ARCHITECTURE.json → .algorithms | Algorithm request |
| Engine categories | ENGINE_DIGEST.md or src/engines/ | Engine request |
| Physics engines | src/physics/*.ts | Physics/force/thermal request |
| Registries | src/registries/*.ts | Data model request |

## Example Run

**User**: "I want to build an engine that calculates thread tap drill sizes"

**Search Results**:
```
EXISTING SOLUTIONS FOUND
========================
| Match | Component | Location | Similarity |
|-------|-----------|----------|------------|
| 1 | calculate_tap_drill | threadDispatcher.ts:51 | 95% |
| 2 | ThreadingEngine | engines/ThreadingEngine.ts | 85% |
| 3 | get_thread_specifications | threadDispatcher.ts:53 | 60% |

RECOMMENDATION: USE EXISTING
Action `calculate_tap_drill` in prism_thread dispatcher already does this.
Call: `prism_thread` → `calculate_tap_drill` with { thread_spec, material, fit_class }

TOKEN SAVINGS: ~50K tokens avoided
```

## DO NOT
- Skip this check when user says "just build it" — show matches anyway
- Create new engines without checking SYSTEM_ARCHITECTURE.json first
- Ignore partial matches — 40%+ overlap means potential extension point
- Forget to check dispatcher actions — they often wrap engine functionality
