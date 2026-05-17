# Injector Utilization Audit
**Date:** 2026-05-17 · slot mike · OBSOLESCENCE-CLEANUP-MS0/U-OBS-D1+D2
**Source:** `mcp-server/data/state/hook-fire-counts.jsonl` last 3000 telemetry rows + live observation this session

## D1 — Viz/obsidian-backed injector firing telemetry

Of the 5 named "good" injectors from AUTO-INVOCATION-MS0:

| Hook | Telemetry fires | Visibly firing this session | Status |
|---|---|---|---|
| `master-index-precheck-inject` | **0** | ✓ (top-5 graph hits on every prompt) | **Telemetry write gap** — hook fires but doesn't log to `hook-fire-counts.jsonl` |
| `audit-viz-first-inject` | **0** (but `viz-first-redirect`: 266) | ✓ (fired this session on "audit" intent) | **Renamed** in telemetry → `viz-first-redirect` is the canonical wire-name |
| `wiki-precheck-inject` | **504-919** | ✓ | HEALTHY |
| `memory-relevance-inject` | **0** | ✓ (fired this session — "Memory recall — feedback that may apply") | **Telemetry write gap** |
| `tribal-by-domain-inject` | **45** | ✓ | LOW (moderate utilization) |

**Top 8 most-fired hooks (3000-row sample):**
1. `skill-auto-trigger` (852)
2. `archived-skill-suggest` (851)
3. `wiki-precheck-inject` (504)
4. `error-pattern-promote` (373)
5. `viz-first-redirect` (266) — canonical name for audit-viz-first
6. `encoding-guard` (108)
7. `tribal-by-domain-inject` (45)
8. `auto-postmortem-on-failure-restart` (1)

**Verdict:** 3 of 5 "good" injectors ARE firing but don't write to the canonical telemetry surface. The naming gap (audit-viz-first vs viz-first-redirect) is also worth resolving — chats reading prior audits may search for the wrong name.

## D1 actions

1. **Fix telemetry write gap** in master-index-precheck-inject, memory-relevance-inject — add a `tele("injected",...)` call at the inject seam (mirror what wiki-precheck-inject does).
2. **Reconcile naming**: `audit-viz-first` vs `viz-first-redirect` — they're the same hook with two names. Pick one canonical name + update CLAUDE.md/wiki refs.
3. **Boost tribal-by-domain-inject relevance** — 45 fires vs wiki-precheck's 504 suggests trigger conditions are too narrow OR re-rank quality is low for non-domain-specific prompts. Investigate the chat-slot domain-resolution path.

## D2 — Viz/obsidian replacement candidates for static-content inject seams

Per the user's directive ("make sure Obsidian PRISM OS and /system-viz is utilized effectively"), looking for inject hooks that fire STATIC content where a viz/obsidian query would give task-relevant signal:

| Hook | Current behavior | Proposed replacement |
|---|---|---|
| `comprehensive-build-enforce` | Fires same ~400-line directive every prompt | Already gated by meta-task-suppressor (AUTO-INVOCATION-MS0/A3). Further: when a build prompt mentions a specific engine, inject that engine's wiki entry + recent test failures instead of generic directive. |
| `discipline-expert-inject` | Random PhD expert block by keyword detection | Already gated by meta-task-suppressor. Further: for domain prompts, REPLACE the static expertise with a viz query for the engine's actual neighborhood (related engines, recent commits, common failure modes). |
| `archived-skill-suggest` (851 fires) | Surfaces archived skills by BM25 against prompt | LIKELY HIGH FALSE-POSITIVE RATE at 851 fires. Investigate skip-rate vs hit-rate. |
| `error-pattern-promote` (373 fires) | Promotes recent errors based on pattern match | Audit: do operators actually act on these? Telemetry hit-rate vs total fires. |
| `awareness-snapshot-inject` (SessionStart) | Injects static snapshot from `AWARENESS-SNAPSHOT.md` | Already viz-backed via `awareness-snapshot.mjs` generator. Quality lift: the F4 classifier fix (AUTO-INVOCATION-MS0/ITER 5) made this informational vs degenerate. ✓ Already covered. |

**3 candidate inject seams** that currently fire generic content but COULD route through viz/obsidian for task-specific signal:

1. **`comprehensive-build-enforce`** — when prompt names a specific engine, query system-viz for that engine's neighborhood (peers in same domain, recent commits, test status) and inject THAT instead of the generic directive. The directive is the right behavior for AUDIT-class prompts but wrong-content for BUILD prompts that already name the target.

2. **`discipline-expert-inject`** — for domain prompts (post-meta-suppressor), the static expert block is generic. A viz lookup of "tribal tips for {detected-domain}" plus "recent commits in {domain}-related engines" gives operationally-relevant context vs theoretical principles.

3. **`archived-skill-suggest`** (851 fires) — this is the SECOND most-firing hook. Investigation needed: are operators actually unarchiving suggested skills? If the hit-rate is <5%, this is high-cost noise. Consider replacing with a viz-graph centrality query: "which 3 EXISTING skills have edges to the named topic?" — that's more actionable than "here's an archived skill that might apply."

## Follow-up

Both D1 telemetry-fix and D2 proposed replacements are advisory; building either is OUT OF SCOPE for this milestone. Recommend follow-up unit `AUTO-INVOCATION-MS1` to:
- Fix the telemetry write gap in 2 injectors
- Reconcile audit-viz-first/viz-first-redirect naming
- Investigate archived-skill-suggest hit-rate (operator survey or click-through telemetry)
- Prototype viz-backed replacement for comprehensive-build-enforce on named-engine prompts
