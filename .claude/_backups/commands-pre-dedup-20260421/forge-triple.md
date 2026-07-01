---
name: "forge-triple"
description: "Create matched engine + skill + hook triple with exhaustive extraction"
effort: high
maxTurns: 30
policy:
  tier: 1
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "forge triple"
      - "create engine and skill"
      - "create engine and hook"
      - "new engine skill hook"
  mode: "warn"
  priority: 75
  timeout_ms: 2000
  token_budget: 300
---

# Forge Triple — Engines + Skills + Hooks Pipeline

Run three forge pipelines back-to-back in a single session for maximum system growth.

## Args: $ARGUMENTS
- Empty: run all three in sequence (engines → skills → hooks)
- `engines-only`: just engines
- `skills-only`: just skills
- `hooks-only`: just hooks
- `[count]`: create up to N items per pipeline (default: 3)

## THOROUGHNESS + EXHAUSTIVE SCIENCE LAW (HARD RULES — apply to every phase)
- **NEVER skim, skip, or dismiss content without deep reading.** Every source gets a full assessment.
- **Exhaust ALL mathematical, statistical, and scientific possibilities** — every applicable model, formula, algorithm, and combination including novel cross-domain approaches.
- "Low novelty" / "already covered" claims REQUIRE citing the SPECIFIC existing engine/formula/tip — name it or extract it.
- Check PRISM's 499 formulas, 880+ engines, 52 algorithms for existing coverage before building new.
- Before committing: "Did I extract EVERYTHING useful? Did I exhaust every math/science angle?"
- **Completeness > Speed.** Missing content or a missed mathematical model is a permanent capability gap.

## Phase 0: Load Path Index
Read these files directly (do NOT Glob/Grep to explore):
1. `H:/PRISM/mcp-server/data/docs/MASTER_INDEX_COMPACT.md` — full system map (~735 tokens)
2. `H:/PRISM/mcp-server/data/docs/ENGINE_DIGEST.md` — all engines with 1-line descriptions (for gap analysis)
3. `H:/PRISM/mcp-server/data/docs/DISPATCHER_DIGEST.md` — all dispatchers with action counts

**CRITICAL: Do NOT Glob src/engines/ to list engines — ENGINE_DIGEST.md already has them all. Do NOT read MASTER_INDEX.md (5,000 tokens) — use MASTER_INDEX_COMPACT.md (735 tokens).**


**Token-Efficient Navigation** (use instead of Glob/Grep):
- `/digest-all` — loads DIRECTORY_DIGEST + DSL_COMPACT + PATH_INDEX (~1100 tokens total)
- `/navigate <topic>` — zero-IO file routing via FileSystemNavigatorEngine (25 domain routes)
- `/code-index <shortcode>` — resolve E0001→path instantly (1,865 indexed files)
- `ENGINE_DIGEST.md` — 880 engines with 1-line descriptions if you need engine-level detail
- `DISPATCHER_DIGEST.md` — 66 dispatchers with action counts if you need action routing


## DSL Shortcode Output Rule (MANDATORY)
When referencing PRISM files in output, use DSL shortcodes to save tokens:
- `E####: EngineName` instead of `src/engines/EngineName.ts`
- `D##: DispatcherName` instead of `src/tools/dispatchers/DispatcherName.ts`
- `A##: AlgorithmName` instead of `src/algorithms/AlgorithmName.ts`
- `T####: TestName` instead of `src/__tests__/TestName.test.ts`
Resolve via `/code-index` or `codeSystemIndexEngine.resolve()`. Lookup via `.lookup(path)`.
## FULL ENFORCEMENT CHAIN (20 hooks, 5 events — all fire automatically)

**PRE-LEVEL (4 hooks — before ANY engine Write/Edit):**
- `enforce-knowledge-consult.py` → WARNS/BLOCKS if domain knowledge not consulted (16 domains detected from filename). Lists EXACT sources: tribal tips, playbook, formulas, manufacturer data.
- `enforce-context-retention.py` → BLOCKS new engine creation without ENGINE_DIGEST.md. WARNS on src/ edits without HANDOFF.md. Prevents duplicates and lost context.
- `enforce-plan-before-build.py` → BLOCKS new engine Write without /plan-build. Plan must outline: what to build, knowledge sources, machinist output, edge cases, wiring targets.
- Knowledge graph reminder → prefer codebase-memory-mcp over Grep/Glob.

**POST-LEVEL (10 hooks — after ANY Write/Edit):**
- `enforce-stub-detector.py` → BLOCKS return {}, return null, TODO/STUB, empty methods in engines
- `enforce-test-quality.py` → BLOCKS || true, trivially-passing assertions, skipped tests
- `enforce-constants-check.py` → BLOCKS inline kc1.1/Taylor constants (must use src/physics/constants.ts)
- `enforce-unit-counter.py` → WARN@20, STRONG@40, BLOCK@60 edits. Tracks review gap + test gap.
- `enforce-knowledge-consult-mark.py` → Records domain consultation from reads/greps
- `enforce-auto-compact.py` → Auto-triggers compaction at 20/40/55 edit thresholds
- **Physics & manufacturing agent** (Haiku) → Deep review: formula correctness, realism, knowledge utilization, completeness
- **Wiring & integration agent** (Haiku) → MCP readiness, cross-engine consistency, reasoning trail

**COMPACT-LEVEL (4 hooks — before compaction):**
- `enforce-review-gate.py` → WARNS if engines without tests, /prism-review, or wiring
- `enforce-wiring-gate.py` → WARNS if engines not referenced by dispatcher or other engine
- `enforce-forge-triple-output.py` → WARNS if engines missing MCP action + skill + protective hook
- **Session quality audit agent** (Haiku) → Reviews completeness, 4-loop compliance, physics integrity

**POST-COMPACT (1 hook):** Auto-continuation → /startup + /handoff read + resume
**STOP-LEVEL (1 hook):** Wiring gate → orphaned engines flagged

## FORGE-TRIPLE OUTPUT RULE (enforced by hook)
Every forge-triple session must produce 3 PRODUCTS per capability built:
1. **PROTECTIVE HOOK** → prevents future degradation of what was just built
2. **MCP DISPATCHER ACTION** → makes capability callable by PRISM app (Zod schema + handler)
3. **SLASH COMMAND / SKILL** → gives users direct access to the capability

No capability ships without all 3. The forge-triple gate BLOCKS compaction if any are missing.
This is how the system COMPOUNDS — each session makes the enforcement + utility layer stronger.

## BUILD PROTOCOL (mandatory per engine)
1. `/plan-build [engine]` → creates plan in state/active-plan.json (hook enforces this)
2. Consult knowledge sources from plan (hook tracks consultation)
3. Build engine with REAL logic (stub detector blocks placeholders)
4. Use canonical constants only (constants checker blocks inline values)
5. Write tests with real assertions (test quality checker blocks || true)
6. 4-LOOP: SCRUTINIZE (/prism-review) → GAP FILL (/test + /trace) → TIE UP (no TODOs, reasoning[])
7. Wire to dispatcher + create MCP action (wiring gate checks)
8. Create protective hook + slash command (forge-triple gate checks)
9. /compact when auto-triggered (auto-compact hook) → /startup auto-continues

## Phase 1: Smart Config (`/smart` protocol)
1. Complexity: COMPLEX (three chained forge pipelines)
2. Domain: Manufacturing Process + TypeScript + System Architecture
3. Roles: Manufacturing Expert + Senior TS Engineer + Systems Architect
4. Model: OPUS
5. Effort: HIGH

## Phase 2: YOLO Mode (`/yolo-mode` protocol)
Maximum velocity — no proceed questions, continuous flow across all three pipelines.

## Phase 3: Forge Engines (`/forge-engines` protocol)
Run the full engine discovery → creation → wiring → test → commit pipeline:
1. **Discover**: gaps via ENGINE_DIGEST + knowledge graph (search_graph for orphans)
2. **Plan**: `/plan-build [engine]` → outline in state/active-plan.json (REQUIRED by hook)
3. **Consult knowledge**: query TribalKnowledgeEngine + PlaybookEngine + FormulaRegistry for domain
4. **Build**: real logic (stub detector blocks), canonical constants (checker blocks), full interfaces
5. **Wire**: to dispatcher with Zod schema + case handler (wiring gate checks)
6. **Test**: vitest with real assertions (test quality checker blocks anti-patterns)
7. **4-LOOP**: SCRUTINIZE (/prism-review 3 agents) → GAP FILL (/test + /trace) → TIE UP
8. **Commit**: with clear message

## Phase 4: Forge Skills (`/forge-skills` protocol)
For EACH engine created in Phase 3, forge a user-facing slash command:
1. **Map**: engine capability → user need (what would a machinist ask for?)
2. **Design**: skill that calls engine via MCP dispatcher action
3. **Create**: .md file in ~/.claude/commands/ with proper frontmatter
4. **Wire**: skill references the MCP action, not the engine directly
5. **Test**: invoke skill, verify output matches expected

## Phase 5: Forge Hooks (`/forge-hooks` protocol)
For EACH engine created in Phase 3, forge a protective enforcement hook:
1. **Identify**: what quality rule protects this capability from degradation?
2. **Build**: Python script at ~/.claude/hooks/lib/ that validates the rule
3. **Wire**: add to settings.json (PreToolUse/PostToolUse/PreCompact as appropriate)
4. **Test**: pipe test JSON through hook, verify BLOCK on violation, ALLOW on pass
5. **Result**: future sessions are PROTECTED from breaking what was just built

## Phase 6: MCP Action Verification
For EACH engine created in Phase 3, verify the MCP action works end-to-end:
1. **Dispatcher**: action exists in z.enum + case handler with lazy-load
2. **Schema**: Zod input/output schema matches engine interface
3. **Call test**: invoke via MCP → verify correct response
4. **PRISM app readiness**: action callable via Claude API + MCP bridge

## Phase 7: Combined Postflight
After all pipelines complete:
1. Verify FORGE-TRIPLE output: each engine has hook + MCP action + skill (gate checks)
2. Update MASTER_INDEX + MEMORY.md with new counts
3. Run build + full test suite — 0 regressions
4. /prism-review (3 agents) on all changes
5. Final commit
6. Auto-compact if edit threshold reached

## Summary Report
```
FORGE TRIPLE COMPLETE
=====================
Engines:  [N] created, [N] tests added
Skills:   [N] created
Hooks:    [N] created/modified
Build:    PASS
Tests:    [N] passing (0 regression)
Commits:  [N] total

System Growth:
  Engines: [old] → [new]
  Skills:  [old] → [new]
  Hooks:   [old] → [new]
  Actions: [old] → [new]
```

## Error Handling
- If any pipeline fails, complete current item, commit what's done, continue to next pipeline
- Context budget: if running low, complete current pipeline, skip remaining, report what's done
- Build failures block all subsequent pipelines until fixed

