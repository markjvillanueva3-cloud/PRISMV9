# ECC-to-PRISM Integration Roadmap

## Context

The `everything-claude-code` (ECC) repository contains 30 agents, 136 skills, 60 commands, and automated hooks for Claude Code workflows. After deep analysis of actual file contents (not just titles), 9 capabilities from Tiers 1-3 are worth incorporating into PRISM. These fill gaps in our hook automation, review quality, context management, and learning infrastructure.

All new capabilities must work for both Claude and Codex agents via the shared state system at `H:/prism/state/shared/` and the command bridge at `claude-codex-command-registry.json`.

## Scrutiny Findings Applied (3-agent parallel review)

The following critical findings from scrutiny have been incorporated:

1. **HOOK-CRITICAL: directory-freeze.mjs vs file-protect.sh block signal incompatibility** → directory-freeze.mjs will use bash exit codes (not JSON `decision:block`) to match file-protect.sh pattern
2. **HOOK-CRITICAL: tool-counter.mjs must have try-catch with fallback to 0** → added error recovery spec
3. **HOOK-CRITICAL: Windows nested cache paths may use mixed separators** → all paths use `path.join()`, no string concatenation
4. **CODEX-CRITICAL: No notification to Codex after bridge regeneration** → Phase 5 now posts to AGENT_CHAT.jsonl + updates AGENT_COORDINATION_STATUS.json
5. **CODEX-CRITICAL: JSONL race conditions for concurrent writers** → file-lock via task-queue.mjs required for shared JSONL appends
6. **REVIEW-CRITICAL: True blind isolation impossible (shared filesystem)** → reframed as "dual-perspective" review (independent but not blind)
7. **REVIEW-CRITICAL: 2 haiku agents insufficient for physics validation** → 3 agents: Physics (sonnet) + Wiring (haiku) + Test (haiku)
8. **REVIEW-CRITICAL: review-complete.sh may not fire if Agent tool used** → prism-review.md explicitly calls review-complete.sh via Bash at end
9. **REVIEW-HIGH: de-sloppify sequencing unclear** → runs AFTER review, AFTER fixing findings (Phase 3 of 4-LOOP)
10. **REVIEW-HIGH: disputed findings policy undefined** → disputed CRITICAL/HIGH = must fix, disputed MEDIUM = defer with justification
11. **HOOK-HIGH: all new hooks must specify timeouts** → added to each phase
12. **HOOK-HIGH: mcp-health-recovery.mjs must be async** → marked async
13. **CODEX-HIGH: all hooks family-agnostic** → documented per hook
14. **REVIEW-MEDIUM: rubric needs Zod schema** → added to Phase 0-B

### Round 2 Scrutiny Findings (machinist + cost + completeness):
15. **SHOP-CRITICAL: Pattern extraction pollutes TribalKnowledge with code patterns** → split: manufacturing patterns → TribalKnowledge, code patterns → separate EXTRACTED_CODE_PATTERNS.jsonl
16. **SHOP-CRITICAL: Review rubric has no shop-acceptance dimension** → add `shop_acceptance` dimension: DOC sustainability, spindle load <90%, feed rate vs machine max
17. **SHOP-HIGH: Verify loop has no G-code/machine validation phase** → add optional Phase 7 for engine-change sessions
18. **SHOP-MEDIUM: De-sloppify may remove safety guards (warn/log branches)** → exclude conditionals with warn()/log() side effects
19. **COST-CRITICAL: compact-counter on EVERY tool call = 20K tokens/session** → sample every 10th call, fast-path exit for non-threshold calls
20. **GAP-CRITICAL: No rollback plan for settings.json** → add Phase 0-C pre-implementation safety gate
21. **GAP-CRITICAL: Compaction survival missing new directive line numbers** → specified exact line locations
22. **GAP-HIGH: Pattern-extractor preconditions (error-log format) not verified** → added pre-condition spec
23. **GAP-HIGH: review-complete.sh pattern must match Agent-based review** → prism-review.md runs explicit Bash with "prism-review" keyword
24. **GAP-MEDIUM: MEMORY.md not updated** → added to Phase 5

---

## Phase 0: Foundation Libraries (No Dependencies)

### 0-A: Tool Counter Library `[S]`
Shared tool-invocation counter used by compact counter (1-A), safety gates (1-B), and pattern extraction (4-A).

**Create:** `H:/prism/.claude/helpers/tool-counter.mjs`
- Exports: `getCount(name)`, `increment(name)`, `reset(name)`, `getAll()`
- Persists counters using `path.join(cachePath("counters"), counterName)` — NO string concatenation for paths
- Imports from existing `hook-cache.mjs` for `cachePath()`, `ensureCacheDir()`
- **Error recovery:** All reads wrapped in try-catch; corrupt/missing files reset to 0 with warning logged
- **Fires for both Claude and Codex** — family-agnostic, no identity gating
- Self-test mode when invoked directly: `node tool-counter.mjs --selftest`

### 0-B: Review Rubric Schema `[S]`
Machine-parseable rubric for dual-perspective review (2-A). All reviewers evaluate against identical criteria.

**Create:** `H:/prism/.claude/helpers/review-rubric.json`
- **Zod-validated schema** — includes TypeScript interface for review findings output format
- Dimensions: correctness, completeness, consistency, safety, performance, physics-accuracy, **shop-acceptance**
- Shop-acceptance sub-checks: DOC sustainable for material+machine?, spindle load <90% rated?, feed rate < machine max?, tool coating temp limit respected?
- Scoring: PASS / WARN / FAIL per dimension
- Aggregation: PASS if all dimensions PASS or WARN; FAIL if any dimension FAIL
- Disputed findings policy: disputed CRITICAL/HIGH = must fix; disputed MEDIUM = defer with justification
- Manufacturing-specific checks: constants from canonical source, AtomicValue returns, uncertainty propagation
- File criticality weights: engine files=10, dispatcher/schema=5, test files=3
- Output schema enforced in reviewer briefs (same JSON shape for all agents → deterministic merge)

### 0-C: Pre-Implementation Safety Gate `[S]`
Before modifying settings.json, create safety net.

**Steps:**
1. `cp H:/prism/.claude/settings.json H:/prism/.claude/settings.json.pre-ecc-backup`
2. After EACH hook addition to settings.json, validate: `node -e "JSON.parse(require('fs').readFileSync('H:/prism/.claude/settings.json','utf8'))"`
3. After each validation, test that `file-protect.sh` and `review-gate.sh` still fire
4. Create `H:/prism/.claude/helpers/rollback-ecc.sh` that restores from backup

---

## Phase 1: Hook-Based Capabilities (Parallel after Phase 0)

All four items are independent — build in any order. Assign to **Claude (backend/infra)**.

### 1-A: Strategic Compact Counter `[M]` — depends on 0-A

Mechanical counter that suggests `/compact` at thresholds, with a decision matrix.

**Create:** `H:/prism/.claude/helpers/compact-counter.mjs`
- PostToolUse hook (universal, no matcher), `async: true`
- **FAST-PATH:** Increments in-memory counter. Only reads/writes disk every 10th call (90% cost reduction vs per-call I/O)
- At thresholds (50, 75, 100, ...): checks recent tool types from `session-breadcrumb.mjs` data
  - Last N tools = Read/Grep/Glob (research) → suggest compact
  - Last N tools = Write/Edit (mid-implementation) → suppress
  - Hard ceiling (150) → stronger warning
- Deduplicates: tracks whether suggestion was already given at current threshold
- Emits: `{ additionalContext: "COMPACT SUGGESTION: ..." }` or `{}`
- **Family-agnostic** — fires for both Claude and Codex

**Modify:** `H:/prism/.claude/settings.json`
- Add to PostToolUse universal section (lines 148-158, alongside `loop-detector.mjs`)
- Timeout: 1500ms, `async: true`, `continueOnError: true`
- **Family-agnostic** — fires for both Claude and Codex

### 1-B: Loop Operator Safety Gates `[L]` — depends on 0-A

4 pre-flight checks + 4 escalation triggers for autonomous execution.

**Create 3 files:**
1. `H:/prism/.claude/helpers/safety-gates.mjs` — PreToolUse hook on `^Task$` matcher
   - Checks: (1) review-gate operational, (2) test cache exists, (3) git clean state, (4) not on main branch
   - Blocks with `{ decision: "block", reason: "..." }` if any check fails

2. `H:/prism/.claude/helpers/safety-escalation.mjs` — PostToolUse hook on `^Task$`, `async: true`
   - Monitors: (1) no progress across 2 task completions, (2) identical errors repeating 3+, (3) tool counter >200 since checkpoint, (4) git conflict markers
   - Escalates via `{ additionalContext: "SAFETY ESCALATION: ..." }`

3. `H:/prism/.claude/commands/safety-check.md` — Manual pre-flight command

**Modify:** `H:/prism/.claude/settings.json`
- Add `safety-gates.mjs` to PreToolUse `^Task$` (before `task-context-injector.mjs`, line ~44)
- Add `safety-escalation.mjs` to PostToolUse `^Task$` (new matcher section)

### 1-C: Directory Freeze (Safety Guard) `[M]` — no Phase 0 dependency

Restricts file edits to a specified directory via PreToolUse hook.

**Create 3 files:**
1. `H:/prism/.claude/helpers/directory-freeze.mjs` — PreToolUse hook on `^(Write|Edit|MultiEdit)$`
   - Reads `cachePath("directory-freeze.json")`; if freeze active, blocks writes outside frozen path
   - Uses **bash exit code 2** to block (matching file-protect.sh signal convention, NOT JSON `decision:block`)
   - Timeout: 1000ms, `continueOnError: true`
   - **Emergency thaw:** manually delete `C:\PRISM\.claude\cache\directory-freeze.json`

2. `H:/prism/.claude/helpers/directory-freeze-manage.mjs` — CLI utility
   - `freeze <path>` / `thaw` / `status` commands
   - Uses `agent-identity.mjs` for `set_by` tracking

3. `H:/prism/.claude/commands/safety-guard.md` — Command spec
   - `/safety-guard freeze <path>` | `/safety-guard thaw` | `/safety-guard status`

**Modify:** `H:/prism/.claude/settings.json`
- Add `directory-freeze.mjs` to PreToolUse `^(Write|Edit|MultiEdit)$` hooks, BEFORE `file-protect.sh` (line ~6)

### 1-D: MCP Health Recovery Hook `[M]` — no Phase 0 dependency

Detects MCP-specific tool failures and suggests reconnection.

**Create:** `H:/prism/.claude/helpers/mcp-health-recovery.mjs`
- PostToolUseFailure hook (runs before existing `error-recovery.mjs`)
- Detects MCP tools via `TOOL_NAME` matching `mcp__*` pattern
- Logs to `cachePath("mcp-error-log")` with timestamp, server, tool, error (APPEND mode)
- After 3+ failures from same server in 5 minutes → suggests reconnection
- PRISM MCP server specifically: suggests `npm run build && npm start`
- **Timeout: 2000ms, `async: true`, `continueOnError: true`** — must not block error-recovery.mjs
- **Family-agnostic** — fires for both Claude and Codex

**Modify:** `H:/prism/.claude/settings.json`
- Add `mcp-health-recovery.mjs` to PostToolUseFailure, BEFORE `error-recovery.mjs` (lines 322-338)

---

## Phase 2: Review System Upgrade (Parallel after Phase 0-B)

Assign to **Codex (quality/process)** or build sequentially.

### 2-A: Unified /prism-review with Dual-Perspective Protocol `[L]` — depends on 0-B

**Merge Santa Method INTO `/prism-review`** — the old `/prism-review` is broken (rate limits) and has no command file. We create a proper command that combines domain-specialized roles with independent dual-perspective verification.

**Design (post-scrutiny, 3 critical fixes applied):**
- **NOT "dual-blind"** — true filesystem isolation is impossible in Claude Code (agents share disk). Reframed as **"dual-perspective"**: independent reviewers give verdicts without pre-exchanging findings, but we accept they CAN read cached files.
- **3 agents, not 2** — Physics validation requires more than haiku. Agent lineup:
  - **Physics Reviewer** (model:sonnet) — Kienzle/Taylor constants, AtomicValue, uncertainty, dimensional analysis. Gets engine diffs + physics rubric.
  - **Wiring Reviewer** (model:haiku) — z.enum coverage, lazy imports, dispatcher connectivity, schema validation. Gets dispatcher/schema diffs + wiring rubric.
  - **Test Reviewer** (model:haiku) — coverage, manufacturer data comparison, regression. Gets test diffs + test rubric.
- 3 agents sequential (1 sonnet + 2 haiku), within rate limits — the old failure was 3-5 Opus agents, not haiku/sonnet.
- Files scored by criticality weight: engine=10, dispatcher=5, test=3
- Deterministic merge of all 3 outputs
- **Counter reset:** prism-review.md explicitly runs `bash /h/prism/.claude/helpers/review-complete.sh` via Bash tool at the end (ensures PostToolUse hook fires regardless of how agents were invoked)
- **Disputed findings policy:** agreed CRITICAL/HIGH = must fix. Disputed CRITICAL/HIGH = must fix. Disputed MEDIUM = defer with written justification.
- **Fallback:** If any agent spawn fails (rate limit), perform that review pass INLINE (read files yourself)

**Create 3 files:**
1. `H:/prism/.claude/commands/prism-review.md` — The unified command spec:
   - Reads rubric from `review-rubric.json`
   - Collects diff of recent changes (`git diff HEAD~1` or staged)
   - Determines which reviewers to spawn based on changed files:
     - Engine files changed → spawn Physics Reviewer (sonnet) + either of the other two
     - Only dispatcher/schema changed → spawn Wiring Reviewer (haiku) + Test Reviewer (haiku)
     - Mixed changes → spawn all 3
   - Each reviewer writes Zod-validated structured findings JSON
   - Runs `review-merge.mjs` to combine all findings
   - Reports: per-reviewer verdict, agreed/disputed breakdown, overall PASS/FAIL
   - Runs `bash /h/prism/.claude/helpers/review-complete.sh` as final step (counter reset)
   - Appends to PRISM_REVIEW_LOG.jsonl via file-lock (concurrent-safe)

2. `H:/prism/.claude/helpers/review-merge.mjs` — Deterministic merge utility
   - Takes 2-3 review JSON paths as arguments
   - Validates each against rubric Zod schema (rejects malformed output)
   - Categories: `agreed` (2+ reviewers found), `disputed` (only 1 found)
   - Agreement rate and per-dimension breakdown
   - Verdict: PASS if no FAIL dimensions across any reviewer
   - Outputs unified findings + audit trail

3. `H:/prism/state/shared/PRISM_REVIEW_LOG.jsonl` — Append-only review history
   - Each entry: timestamp, agent identity, files reviewed, per-reviewer verdicts, agreement rate, overall, tokens_used
   - **Concurrent-safe:** uses file-lock via task-queue.mjs before appending
   - Rotation: archive after 500 entries or 90 days

### 2-B: De-Sloppify Pattern `[M]` — no hard dependency

Focused cleanup agent that strips over-engineering after code generation. **Runs AFTER review findings are fixed** (Phase 3 of 4-LOOP: GAP FILL), not before review.

**Sequencing in 4-LOOP:** BUILD → SCRUTINIZE (`/prism-review`) → fix findings → `/de-sloppify` → run tests → LOOP

**Create 2 files:**
1. `H:/prism/.claude/commands/de-sloppify.md` — Command spec:
   - Accepts file path or uses last modified engine file
   - Spawns cleanup agent (haiku) with brief: remove unnecessary abstractions, premature generalization, dead code, verbose comments
   - **Explicit exclusions:** Do NOT simplify conditionals with `warn()`/`log()` side effects, edge-case guards (zero/negative/NaN), or safety-critical branches. These are manufacturing safety guards.
   - Agent outputs proposed simplification diff
   - Parent reviews diff, applies safe changes
   - Runs `npx tsc --noEmit` + affected tests to verify no behavior change

2. `H:/prism/.claude/helpers/de-sloppify-brief.md` — Standalone agent brief readable by both Claude and Codex

---

## Phase 3: Verification & Context (Parallel, no Phase 1-2 dependency)

### 3-A: Context Budget Audit `[M]`

Systematic token overhead audit per component.

**Create 2 files:**
1. `H:/prism/.claude/commands/context-audit.md` — Command spec:
   - Scans all CLAUDE.md files (flags >300 lines)
   - Scans agent descriptions (flags >30 words)
   - Scans skill files (flags >200 lines)
   - Counts hook entries and estimated token cost
   - Counts command registry entries
   - Outputs budget table: component, lines, ~tokens, status (OK/WARN/OVER)
   - Writes `H:/prism/state/shared/CONTEXT_BUDGET_AUDIT.json` + `.md`

2. `H:/prism/.claude/helpers/context-audit-scan.mjs` — Scanning utility callable from hooks

### 3-B: 6-Phase Verification Loop `[M]`

Formalizes the 4-LOOP into discrete reusable phases.

**Create 2 files:**
1. `H:/prism/.claude/commands/verify-loop.md` — Command spec:
   - Phase 1: `npm run build` (fail-fast)
   - Phase 2: `npx tsc --noEmit` (fail-fast)
   - Phase 3: ESLint or `mcp__eslint__lint-files` (report, configurable fail)
   - Phase 4: `npx vitest run` (fail-fast on failures)
   - Phase 5: Security scan (console.log, `any` types, hardcoded secrets via grep)
   - Phase 6: `git diff HEAD~1 --stat` + suggestion for review if engines changed
   - Each phase: PASS/FAIL/SKIP + duration
   - Writes result to `cachePath("verify-loop-result")`

2. `H:/prism/.claude/helpers/verify-phase-runner.mjs` — Utility to run individual phases

**Modify:** `H:/prism/CLAUDE.md`
- In V24 4-LOOP section, reference `/verify-loop` as the mechanical implementation (enhancement, not replacement)

---

## Phase 4: Continuous Learning (After Phase 0-A)

### 4-A: Session Pattern Extraction `[L]` — depends on 0-A

Stop hook that auto-extracts reusable patterns from session activity and feeds TribalKnowledge.

**Create 3 files:**
1. `H:/prism/.claude/helpers/pattern-extractor.mjs` — Stop hook (async, after `session-summary.mjs`)
   - Reads error log from `cachePath("error-log")` → extracts error-resolution pairs
   - Reads breadcrumbs from `cachePath("session-breadcrumbs")` → identifies debugging sequences
   - Formats as `KnowledgeTip` (from `TribalKnowledgeEngine.ts` line 44):
     ```
     { id, title, body, category, tags, confidence: 60, source: "session-auto:<timestamp>", created_at, usage_count: 0 }
     ```
   - **Category routing (prevents TribalKnowledge pollution):**
     - If category is in CORE_CATEGORIES (setup, tooling, speeds_feeds, etc.) → append to `EXTRACTED_PATTERNS.jsonl` → feeds TribalKnowledge
     - If category is programming/code-related → append to `EXTRACTED_CODE_PATTERNS.jsonl` (separate file, does NOT feed TribalKnowledge)
   - Pre-condition checks: if `cachePath("error-log")` missing, skip error extraction; if `cachePath("session-breadcrumbs")` missing, skip debugging extraction
   - Appends to `H:/prism/state/shared/EXTRACTED_PATTERNS.jsonl` (manufacturing only)
   - If PRISM MCP running, calls `knowledge_capture` to feed TribalKnowledgeEngine directly
   - Emits: "Extracted N patterns (M error-resolution, K debugging)"

2. `H:/prism/.claude/commands/learn-session.md` — Manual trigger for mid-session extraction

3. `H:/prism/.claude/helpers/pattern-ingest.mjs` — CLI batch ingestion from JSONL → TribalKnowledge

**Modify:** `H:/prism/.claude/settings.json`
- Add `pattern-extractor.mjs` to Stop hooks, AFTER `session-summary.mjs` but BEFORE `sync-memory.mjs` (so extraction completes before memory sync). Timeout: 5000ms, `async: true`, `continueOnError: true`
- Uses file-lock via task-queue.mjs before appending to EXTRACTED_PATTERNS.jsonl (concurrent-safe)

---

## Phase 5: Integration & Bridge (After Phases 1-4)

### 5-A: Command Bridge Regeneration + Codex Notification `[S]`
- Run `node H:/prism/scripts/index/build-command-bridge.mjs`
- Verify registry includes all 7 new commands: `/prism-review` (dual-perspective), `/de-sloppify`, `/safety-guard`, `/safety-check`, `/context-audit`, `/verify-loop`, `/learn-session`
- **Post to AGENT_CHAT.jsonl:** `"ECC capabilities integrated: 7 commands + 5 hooks added. Registry updated. Run /startup to discover."`
- **Update AGENT_COORDINATION_STATUS.json:** add `registry_refreshed_at` timestamp so Codex re-reads bridge on next startup

### 5-B: Shared Directive `[S]`
**Create:** `H:/prism/state/shared/CLAUDE-CODEX-ECC-CAPABILITIES-DIRECTIVE.md`
- Documents all 9 capabilities, invocation syntax, when they fire automatically
- Both agents read this on startup

**Modify:**
- `H:/prism/.claude/helpers/compaction-survival.mjs` — Add new directive to DIRECTIVES array
- `H:/prism/.claude/helpers/pre-compact.mjs` — Add new directive to DIRECTIVES array

### 5-C: CLAUDE.md + MEMORY.md Update `[S]`
**Modify:** `H:/prism/CLAUDE.md` (check line count first; if >280 lines, condense before adding)
- Reference `/verify-loop` in 4-LOOP section
- Note `/prism-review` is now dual-perspective (3 agents) — the canonical review command
- Note `/de-sloppify` as post-generation cleanup (runs AFTER review, excludes safety guards)
- Note `/safety-check` as pre-autonomy gate

**Modify:** `H:/prism/state/shared/memory/MEMORY.md`
- Add reference entry for CLAUDE-CODEX-ECC-CAPABILITIES-DIRECTIVE.md
- Note: /prism-review is dual-perspective (1 sonnet + 2 haiku, rate-limit safe)

---

## Parallelism Map

```
Phase 0-A (counter lib) ──┐
Phase 0-B (rubric)     ──┤
                          │
     ┌────────────────────┘
     │
     ├── 1-A compact counter ─────┐
     ├── 1-B safety gates ────────┤
     ├── 1-C directory freeze ────┤  All 8 items parallel
     ├── 1-D MCP health ──────────┤  after Phase 0
     ├── 2-A prism-review (dual-blind) ┤
     ├── 2-B de-sloppify ─────────┤
     ├── 3-A context audit ───────┤
     ├── 3-B verify loop ─────────┤
     └── 4-A pattern extraction ──┘
                                  │
                          Phase 5 (integration)
```

**Agent assignment:**
- **Claude:** Phase 0 + Phase 1 (hooks/infra) + Phase 4 (learning) + Phase 5
- **Codex:** Phase 2 (review) + Phase 3 (verification/audit)

---

## File Inventory

| # | Action | Path | Phase |
|---|--------|------|-------|
| 1 | CREATE | `.claude/helpers/tool-counter.mjs` | 0-A |
| 2 | CREATE | `.claude/helpers/review-rubric.json` | 0-B |
| 3 | CREATE | `.claude/helpers/compact-counter.mjs` | 1-A |
| 4 | CREATE | `.claude/helpers/safety-gates.mjs` | 1-B |
| 5 | CREATE | `.claude/helpers/safety-escalation.mjs` | 1-B |
| 6 | CREATE | `.claude/commands/safety-check.md` | 1-B |
| 7 | CREATE | `.claude/helpers/directory-freeze.mjs` | 1-C |
| 8 | CREATE | `.claude/helpers/directory-freeze-manage.mjs` | 1-C |
| 9 | CREATE | `.claude/commands/safety-guard.md` | 1-C |
| 10 | CREATE | `.claude/helpers/mcp-health-recovery.mjs` | 1-D |
| 11 | CREATE | `.claude/commands/prism-review.md` | 2-A |
| 12 | CREATE | `.claude/helpers/review-merge.mjs` | 2-A |
| 13 | CREATE | `state/shared/PRISM_REVIEW_LOG.jsonl` | 2-A |
| 14 | CREATE | `.claude/commands/de-sloppify.md` | 2-B |
| 15 | CREATE | `.claude/helpers/de-sloppify-brief.md` | 2-B |
| 16 | CREATE | `.claude/commands/context-audit.md` | 3-A |
| 17 | CREATE | `.claude/helpers/context-audit-scan.mjs` | 3-A |
| 18 | CREATE | `.claude/commands/verify-loop.md` | 3-B |
| 19 | CREATE | `.claude/helpers/verify-phase-runner.mjs` | 3-B |
| 20 | CREATE | `.claude/helpers/pattern-extractor.mjs` | 4-A |
| 21 | CREATE | `.claude/commands/learn-session.md` | 4-A |
| 22 | CREATE | `.claude/helpers/pattern-ingest.mjs` | 4-A |
| 23 | CREATE | `state/shared/CLAUDE-CODEX-ECC-CAPABILITIES-DIRECTIVE.md` | 5-B |
| 24 | MODIFY | `.claude/settings.json` | 1-A,1-B,1-C,1-D,4-A |
| -- | (no modify needed for 2-A — review-complete.sh already matches `prism.review`) | |
| 26 | MODIFY | `.claude/helpers/compaction-survival.mjs` | 5-B |
| 27 | MODIFY | `.claude/helpers/pre-compact.mjs` | 5-B |
| 28 | MODIFY | `CLAUDE.md` | 3-B, 5-C |

**Total: 23 new files, 4 modified files**

---

## Verification Plan

After each phase, verify:
1. **Hooks fire:** Add the hook to settings.json, trigger the tool type, check for expected output
2. **Commands work:** Run the `/command`, verify expected behavior
3. **Codex discovery:** Run `node H:/prism/scripts/index/build-command-bridge.mjs`, verify new entries in registry
4. **No regression:** Existing hooks still fire (review-gate, file-protect, bash-intercept)
5. **Cross-agent:** Verify shared state files (`PRISM_REVIEW_LOG.jsonl`, `EXTRACTED_PATTERNS.jsonl`, `CONTEXT_BUDGET_AUDIT.json`) are readable by both agents

**End-to-end smoke test after Phase 5:**
1. Start fresh session → compact counter should initialize
2. Edit an engine file → review-gate still works
3. Run `/safety-guard freeze src/engines/` → edit outside should be blocked
4. Run `/verify-loop` → all 6 phases should report
5. Run `/prism-review` on a changed engine file → dual-blind review completes, both reviewers report, merge shows agreement
6. Run `/de-sloppify` on an over-engineered file → simplification without breakage
7. Run `/context-audit` → budget table generated
8. Stop session → pattern extractor runs, check `EXTRACTED_PATTERNS.jsonl`
9. Run `/safety-check` → all 4 pre-flight gates report status

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| More hooks = slower session start | All new hooks use `async: true` where non-blocking; specified timeouts per hook |
| Dual-perspective review costs 3 agents | 1 sonnet + 2 haiku sequential; within rate limits since old failure was 3-5 Opus |
| Physics reviewer needs sonnet (not haiku) | Only spawned when engine files changed; pure wiring/test changes use 2 haiku |
| Auto-extracted patterns are low quality | `confidence: 60` vs 80-100 for human tips; TribalKnowledge sorts by confidence |
| Directory freeze locks out accidentally | Emergency thaw: delete cache file; `/safety-guard thaw`; `continueOnError: true` |
| Concurrent JSONL writes corrupt files | File-lock via task-queue.mjs for PRISM_REVIEW_LOG + EXTRACTED_PATTERNS |
| tool-counter.mjs fails = cascade | try-catch in all reads; corrupt files reset to 0; dependent hooks have `continueOnError: true` |
| settings.json edit makes all hooks fail | Validate JSON before saving; backup settings.json.bak before Phase 1 changes |
| Codex doesn't discover new commands | Phase 5 posts to AGENT_CHAT + updates COORDINATION_STATUS timestamp |
