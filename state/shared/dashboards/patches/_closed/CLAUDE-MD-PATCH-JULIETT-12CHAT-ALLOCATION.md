# CLAUDE-MD-PATCH — JULIETT-12CHAT-ALLOCATION-MS0

> PATCH-SIBLING file for the next CLAUDE.md editor to splice.
> Written by juliett (claude-de04081e) 2026-05-17 — CLAUDE.md was peer-locked by claude-77971357 during iter-3.
> Splice target: append after `## RGS-TOOL-AUTOINVOKE-MS0` section (line ~470ish; before `## OLLAMA-PIPELINE-MS0`).

---

## JULIETT-12CHAT-ALLOCATION-MS0 (2026-05-17, juliett)

12-chat ROI allocation across alpha..mike (12 work slots; golf hygiene). 5-wave ordering coordinates Stage-2 BLOCKERS, 5 NEW V2.1 units, 10 SYNERGY units (iter-3), and 10 hand-picked backend-dev wirings (A4 6%-true-orphan filter). **CLEAR-NOT-COMPACT doctrine** added: prefer `/clear` over `/compact` for token headroom; 11 bypass systems documented (per-agent handoff, terminal-pin, obsidian memory+wiki, /system-viz query, master-index, awareness inject, build-state, per-unit specs, chat-bus, slot-task-claim, RGS tool-plan). **5 silent-degrade fixes** (F1-F5) discovered iter-3: master-index-search-lib 200MB cap on 331MB graph; session-start-auto-resume accepts `clear` source in code but settings.json wires only `compact`; error-pattern-capture 0-fire (entire 3-stage error-learn loop dead); 10 duplicate hook wirings (stress-harness-emit ×4); `state/shared/specs/UNITS/` dir didn't exist. Files: `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`, `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md`, `state/shared/specs/UNITS/U-{RGS-RULE-BACKEND-DEV,CLEAR-AUTO-RESUME,MEMORY-COMPRESS-V2,ACTIVATE-BEFORE-BUILD-PRECHECK,PRECOMMIT-PATHSPEC-ONLY}.md` (5 hand-bootstrapped; 20 more pending `U-UNIT-SPEC-GENERATOR`). Wiki: [`knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`](knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md). Memory: [[reference_juliett_12chat_allocation_2026_05_17]].

---

## PATCH-SIBLING convention (also new)

When a target doc surface (CLAUDE.md, MEMORY.md, Obsidian memory) is peer-locked at write time, the writing chat saves a `state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md` sibling for the next owner to splice. Iter-3 S6 synergy unit `U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS` (echo) elevates this to a fleet-wide Stop hook that auto-writes patches when peer-locks block direct writes.

---

## Recent regressions (append to the running tail)

- 2026-05-17 | **master-index-search-lib silently returns null on 331MB graph (200MB cap)** | observed-in: iter-3 S5 synergy agent | fix: raise `MAX_BYTES` 200MB→512MB OR set `PRISM_GRAPH_MAX_BYTES=536870912` | verify: `node -e "import('./scripts/lib/master-index-search-lib.mjs').then(m=>console.log(m.runMasterIndexSearch('test',5).length))"` returns >0 hits
- 2026-05-17 | **session-start-auto-resume `clear` matcher wire missing** | observed-in: iter-3 S8 synergy agent | fix: V1 W0 U-CLEAR-AUTO-RESUME (alpha) | verify: `grep '"clear"' C:/Users/wompu/.claude/settings.json` ≥1 in SessionStart array
- 2026-05-17 | **error-pattern-capture 0-fire — entire error-learn 3-stage chain dead** | observed-in: iter-3 S1 synergy agent | fix: diagnose broken matcher; restore capture → promote → vault-bridge chain | verify: `node scripts/hook-health-check.mjs --hook error-pattern-capture --window=24h` shows ≥1 fire
