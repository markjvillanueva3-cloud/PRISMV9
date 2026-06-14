## bug-hunting — slot:uniform

### Current state

**Size:** 127 lines, ~5.9 KB.
**Quality grade: GOOD**

The current CLAUDE.md is one of the better galaxy files in the fleet. It has genuine domain content: a 10-class bug taxonomy, a verified anti-pattern list, Karpathy 5-step adapted to bug-hunting work, related-galaxy bridges, and dispatcher bridge-OUT declarations. It does NOT read like a copy-paste stub.

**Stale / inaccurate content found (cite):**

1. `scripts/hook-fire-rate-audit.mjs` (line 27) — **does NOT exist** at that path. The real file is `scripts/hook-fire-rank.mjs` (verified by `ls`). The CLAUDE.md cite is a fabricated path.
2. `scripts/scrutiny-3way.mjs` (line 28) — **wrong path**. The real location is `.claude/scripts/scrutiny-3way.mjs` (verified). Citing it as a bare `scripts/` path will cause `node scripts/scrutiny-3way.mjs` to fail.
3. `engines/ErrorPatternLearningEngine.ts`, `engines/RegressionHunterEngine.ts`, `engines/AntiRegressionGateEngine.ts` (lines 29-31) — **not found as real `.ts` files** in `mcp-server/src/engines/`. The `bug-hunting/` directory contains only 6 `.md` files; no `.ts` engines are owned here. These names appear only in this CLAUDE.md and PATHS.md — they are either unbuilt stubs or hallucinated names. Marked `// UNVERIFIED` until a real `grep -r` of the engine tree confirms them.
4. `outcome-bus-auto-tap.mjs` (line 88 area) — referenced without a path prefix; existence unverified in this session. Left as advisory.
5. The `## Cross-cutting methodology` block (lines 101-127) and `## AI-systems fleet state` comment-block are boilerplate injected fleet-wide by `scripts/wire-galaxies-to-operational-context.mjs` / `scripts/fill-galaxy-memory-sections.mjs`. They add ~25 lines of generic operational context that duplicates TOOLBELT.md + MEMORY.md content already visible in the galaxy dir. Token waste without delta value in the galaxy CLAUDE.md.
6. `prism_dev:test_generate` bridge (line 77) — **action verified real** (`devDispatcher.ts:5951`). Keep.
7. `prism_guard:error_ledger_append` and `prism_guard:pattern_scan` — **verified real** (`guardDispatcher.ts:45,711`). Keep.

---

### KEEP

- **Lines 1-8** — scope declaration + domain identity (what uniform does; R12 fail-loud as primary prey). Load-bearing.
- **Lines 10-20** — Bug-class catalog (10 classes, all domain-specific + accurate). The best part of this file. Keep verbatim.
- **Lines 22-28 (partial)** — Audit script citations: `audit-roadmap-drift.mjs`, `audit-close-out-candidates.mjs`, `audit-unwired-engines.mjs`, `declared-vs-actual.mjs` all verified real at `H:/prism/scripts/`. Keep with corrected paths.
- **Lines 33-38** — Skill surface (`/scrutiny-batch`, `/regression-audit`, `/audit-task`, `/error-learn-review`, `/learn-from-mistake`). Domain-specific, load-bearing.
- **Lines 40-47** — Anti-patterns (uniform refuses). Excellent, domain-specific. Keep verbatim.
- **Lines 49-55** — Karpathy 5-step adapted for bug-hunting. High value; contains domain-specific technique choices (bisect/mutation/fuzzing/declared-vs-actual). Keep.
- **Lines 57-63** — Related galaxies (wiring/romeo, backend-helper/papa, discovery/tango, dormant-data/victor). Accurate, load-bearing for cross-galaxy verification targets.
- **Lines 64-70** — Wiki cross-refs. Accurate and useful.
- **Lines 72-77** — Bridges OUT (`prism_guard:error_ledger_append`, `prism_guard:pattern_scan`, CLAUDE.md Recent regressions, `prism_dev:test_generate`). All verified real. Keep.
- **Lines 81-98** — Closed-loop integration with india (`xproc_outcome_publish`, `xproc_kg_project_features`, `prism_knowledge:tribal_capture`). Keep as-is — these are the learning-loop hooks that make bug findings compound across sessions.

---

### DROP

- **Lines 27** — `scripts/hook-fire-rate-audit.mjs` — replace with `scripts/hook-fire-rank.mjs` (real path).
- **Lines 28** — `scripts/scrutiny-3way.mjs` — replace with `.claude/scripts/scrutiny-3way.mjs` (real path).
- **Lines 29-31** — `engines/ErrorPatternLearningEngine.ts`, `engines/RegressionHunterEngine.ts`, `engines/AntiRegressionGateEngine.ts` — DROP until existence verified by a real Glob of the engine tree. Citing unverified paths violates R12 and the HONESTY RULES.
- **Lines 101-127** — The entire `## Cross-cutting methodology (galaxy-enrichment program)` block and `## AI-systems fleet state` comment-block. These are auto-injected fleet-wide boilerplate; identical copies live in TOOLBELT.md and MEMORY.md for this galaxy. Loading both in CLAUDE.md is pure token burn. Replace with a single pointer line: `> Operational context (hardware/Ollama/loops/vault): see TOOLBELT.md. AI-systems fleet state: knowledge/memories/patterns/ai-systems-fleet-state.md`.
- **Lines 122-127** — `## Critic + keep-working contract` — pure universal doctrine (R6, R12, scrutiny gate). Already in main CLAUDE.md. Drop from galaxy file; keep the universal-core pointer at bottom of file.

---

### ADD (domain-specific — the heart of this assessment)

**1. Verified engine-to-path mapping (what uniform actually owns/uses)**
The galaxy has zero `.ts` engines of its own. Uniform's primary engines are CROSS-GALAXY consumers:
- `mcp-server/src/engines/AdvancedRegressionEngine.ts` — verified in PATHS.md name-match list (real file per engine name-match scan); use for regression baseline computation
- `mcp-server/src/engines/RegressionBaselineEngine.ts` — verified in PATHS.md
- `mcp-server/src/engines/CAMInHostRegressionDetectorEngine.ts` — verified in PATHS.md
- `mcp-server/src/engines/PrintToProgramRegressionHarnessEngine.ts` — verified in PATHS.md
- These 15 regression engines (full list: PATHS.md §Engines) are uniform's toolset, not owned by uniform but USED by it.

**2. Dispatcher action surface (daily-use, verified)**

| Dispatcher | Actions uniform uses | Verified |
|---|---|---|
| `prism_guard` | `error_ledger_append`, `error_ledger_append_and_embed`, `error_ledger_recent`, `error_ledger_recall_similar`, `pattern_scan`, `pattern_history`, `learning_query` | guardDispatcher.ts:26,45 |
| `prism_dev` | `test_generate`, `test_generate_scan`, `test_generate_read` | devDispatcher.ts:5951,5959,5964 |
| `prism_cad_regression` | (regression-check actions) | cadRegressionDispatcher.ts:277 — verify action list before use |

**3. Canonical script paths (corrected)**
```
.claude/scripts/scrutiny-3way.mjs    # 3-arm Stop gate + manual reviewer driver
scripts/audit-roadmap-drift.mjs       # envelope vs git reality
scripts/audit-close-out-candidates.mjs
scripts/audit-unwired-engines.mjs
scripts/declared-vs-actual.mjs
scripts/hook-fire-rank.mjs            # wired-silent hook surface (NOT hook-fire-rate-audit.mjs)
```

**4. Regression test landing zone**
Every bug found by uniform MUST produce a failing test at:
`mcp-server/src/__tests__/regression/` — the canonical regression test dir. Add this path explicitly; it is not in the current CLAUDE.md.

**5. Inlined-constant grep recipe (ready to run)**
One of the top bug classes is inlined physics constants. Add the canonical hunt:
```bash
rtk grep -r "kc1\.1\s*=" mcp-server/src/engines --include="*.ts" | grep -v constants.ts
rtk grep -r "Taylor\|C_Taylor\|n_taylor" mcp-server/src/engines --include="*.ts" | grep -v constants.ts
```

**6. Weak-assertion sweep recipe**
```bash
rtk grep -rn "toBeDefined\(\)\|toBeTruthy\(\)" mcp-server/src/__tests__ --include="*.test.ts" | grep -v "// verified-weak-ok"
```
Legacy weak assertions without the exemption comment are uniform's open debt queue.

**7. Schema-drift hunt recipe**
```bash
rtk grep -rn "schemaVersion" mcp-server/data/state/*.json | head -20
# Then: grep for all JSON state consumers that don't check schemaVersion on read
```

**8. "What NOT to do" list (currently absent)**
Add an explicit section:
- Do NOT grep-and-fix a single instance of a bug class without sweeping ALL 34 galaxy engine trees for the same pattern.
- Do NOT mark a bug "fixed" without a mutation test (mutate the fix and verify the test goes red).
- Do NOT open `system-graph.json` (548MB) directly — use `node scripts/system-viz-query.mjs node-card <id>` instead (CHEAP-NODE-ACCESS-MS0).
- Do NOT disable a Stop hook that is blocking — investigate the signal. The block IS the finding.
- Do NOT report a found class without appending to `CLAUDE.md ## Recent regressions` AND filing a wiki lesson under `knowledge/wiki/lessons/` or `knowledge/wiki/code-tribal/`.

**9. `prism_cad_regression` dispatcher — missing entirely from current CLAUDE.md**
`cadRegressionDispatcher.ts` (verified at `mcp-server/src/tools/dispatchers/cadRegressionDispatcher.ts:277`) is a full dispatcher uniform should surface, given the 15 regression engines name-matched to this galaxy. Add with caveat to read its action list before use.

**10. Bug-class escalation path**
Currently implied but not explicit. Add:
- Single instance found → regression test in `src/__tests__/regression/`
- Pattern confirmed (2+ instances) → wiki lesson under `knowledge/wiki/lessons/`
- Pattern recurs post-fix → error ledger via `prism_guard:error_ledger_append_and_embed` + promote to Stop hook candidate
- Hook candidate → file in `.claude/hooks/` via `/forge-triple`; coordinate with golf (hook wiring owns golf's lane)

---

### IDEAL SECTION OUTLINE

```
## bug-hunting — slot:uniform

### 1. Domain identity + scope (4 lines)
### 2. Bug-class catalog (the 10 classes — keep verbatim, add escalation tier)
### 3. Canonical audit scripts (corrected paths — 6 scripts)
### 4. Dispatcher action surface (verified: prism_guard / prism_dev / prism_cad_regression)
### 5. Regression test landing zone + mutation discipline
### 6. Skill surface (/scrutiny-batch /regression-audit /audit-task /error-learn-review /learn-from-mistake)
### 7. Anti-patterns (uniform refuses — keep verbatim)
### 8. What NOT to do (new section — 5 explicit rules)
### 9. Karpathy 5-step for bug-hunting (keep verbatim)
### 10. Bug-class escalation path (instance → pattern → hook)
### 11. Related galaxies (wiring/romeo, backend-helper/papa, discovery/tango, dormant-data/victor)
### 12. Wiki cross-refs (keep verbatim)
### 13. Bridges OUT (verified prism_guard + prism_dev actions)
### 14. Closed-loop integration with india (keep verbatim)
### 15. Universal-core pointer (1 line — do NOT duplicate)
```

---

### UNIVERSAL-CORE POINTER

The following rules must remain accessible via the main `H:/PRISM/CLAUDE.md` pointer and must NOT be duplicated into this galaxy file:

- **R1-R15** (Karpathy + agent-era rules) — pointer only; the bug-hunting Karpathy 5-step in §9 above is the DOMAIN ADAPTATION, not a duplicate
- **Scrutiny 3-of-3 gate** (`.claude/scripts/scrutiny-3way.mjs` + ledger protocol) — pointer only; the path correction in §ADD above is load-bearing
- **Per-chat handoff** (`per-agent-handoff.mjs` write/read pattern) — pointer only
- **Commit format** (`[SCOPE]/U-ID: title`) — pointer only
- **Units-first safety rail** (inch vs mm) — pointer only (less relevant for this domain but must not be missing)
- **No-stub engine rule** (`comprehensive-build-enforce` hook) — pointer only
- **Honesty rules** (verify before citing, "I don't know" beats confident guess) — pointer only; the FACT that uniform found fabricated paths in its own CLAUDE.md is proof this pointer must be live

Add this single line at the bottom of the galaxy CLAUDE.md:
```
> Universal doctrine (R1-R15 · scrutiny gate · handoff · commit format · safety rails): H:/PRISM/CLAUDE.md — read on session start, do not duplicate here.
```
