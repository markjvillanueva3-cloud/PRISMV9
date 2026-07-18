# USER BUILD-REQUESTS LOG

**Purpose.** A persistent, cross-session ledger of what the operator (Mark) asks PRISM to build — split into **backend-development** improvements and **PRISM app-feature** improvements. This is the *intent* layer: it records what the user wanted, in their words, dated. It is NOT the roadmap — `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md}` (5,826 items) is the consolidated work inventory. This log is upstream of that: it captures the user's ask before/as it becomes a roadmap unit.

**Why it exists.** Build requests were scattered across session transcripts and handoffs and lost between sessions. A chat three weeks later had no way to know "the user asked for X in a prior session." This log is the durable capture point.

## How to append (every chat — standing protocol)

When the operator expresses a build or feature intent in ANY session — "can we build…", "I want…", "add…", "make it…", "improve…" applied to a capability — append a row to the correct table below. Date it (absolute, `YYYY-MM-DD`). Then do the **system-viz cross-reference**:

```bash
node H:/prism/scripts/system-viz-query.mjs find "<keywords from the request>"
```

Set the **viz status** column from the result:
- `existing-node` — a built engine/dispatcher/skill already covers it → the request is wiring/enhancement, not net-new. Cite the node.
- `ghost-node` — a `ghost.*` node or a `ROADMAP-CONSOLIDATED` pending unit already represents it → link the unit id.
- `needs-creation` — no node, no ghost, no roadmap unit → genuinely new; should become a roadmap unit.

Do NOT delete rows. Mark delivered ones `✅ shipped <commit>`; supersede with a new row if intent changes (R7 — surface, don't average).

## Cross-reference surfaces (check these before tagging a row)

| Surface | What it answers |
|---|---|
| `scripts/system-viz-query.mjs find <kw>` | Is there an existing node? |
| `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md}` | Is it already a pending roadmap unit (4,497 pending)? |
| `state/shared/specs/MISC-TASKS-INVENTORY.md` | Is it an already-identified orphaned task (318)? |
| `mcp-server/scripts/build-vision-spec.json` | Is it in the product vision (SFC / Master Post / CAD-CAM AI)? |
| `.claude/helpers/priority-queue.mjs --pick` | Runtime next-best-unit picker |

---

## Backend-development requests

Dev-tooling, pipelines, hooks, token-economy, awareness-system, fleet-hygiene.

| Date | Request (operator's intent) | viz status | Status |
|------|------------------------------|-----------|--------|
| 2026-05-17 | "make it a rule to always update wiki for bug findings… that should be hooked" | needs-creation | ✅ shipped `bb198d9285` — `stop-bug-finding-wiki-gate.mjs` |
| 2026-05-17 | Assess + improve token-saving measures effectiveness | existing-node (audit) | ✅ shipped `f03a11d07c` — TOKEN-SAVINGS-AUDIT-MS0 + `token-savings-rank.mjs` META |
| 2026-05-17 | Install RTK so bash-output token filtering actually works | existing-node (rtk-setup skill) | ✅ shipped — RTK 0.40.0 installed + hook wired |
| 2026-05-17 | Default-on chat-bus compact mode (cut per-prompt injection) | existing-node (`chat-bus-inject`) | ✅ shipped — `PRISM_CHAT_BUS_COMPACT=1` in settings.json |
| 2026-05-17 | error-pattern-promote: skip the 99.8%-no-op full ledger read | existing-node (hook) | ✅ shipped `5146a943df` — memo guard |
| 2026-05-17 | Improve chat awareness of the system-viz + obsidian + prism-awareness + memories + tribal injection system | existing-node (`feedback_tribal_obsidian_viz_utilization_protocol`) | 🔄 in progress — extending the utilization protocol doc |
| 2026-05-17 | This log — persistent cross-session capture of build requests | needs-creation | ✅ shipped — this file |
| _open backlog_ | F3 Ollama offload 9.6%→30% (scoped build) · memory-relevance-inject telemetry/threshold tune · slot-worktree fleet-default | mixed | ⏳ pending — see AUDIT-TOKEN-SAVINGS-2026-05-17 |
| 2026-05-17 | High-ROI node wirings — wire built-but-unwired engines to dispatchers | existing-node | ⏳ pending — system-viz scan: 729 engines NEEDS_WIRING (77.7% wire rate), but raw signal has ~50% false-positive (CLAUDE.md regression). Genuine highest-leverage cluster: **Lathe domain, 82 unwired engines** — a domain-focused wiring pass is the best single milestone. Validate first: `node scripts/validate-unwired-signal.mjs`. Ranked findings: `node scripts/high-value-additions-rank.mjs --json` (F3 orphan-engines P0 lev 72.9, F1 orphan-hooks P0 lev 61.9). |

## PRISM app-feature requests

Saleable / shop-facing capability: SFC, Master Post, CAD/CAM AI, CAM bridges, domain studios.

| Date | Request (operator's intent) | viz status | Status |
|------|------------------------------|-----------|--------|
| _pre-log_ | Speed/Feed Calculator (SFC) — saleable subscription product | existing-node + ghost (many SFC units) | ⏳ ongoing — see `build-vision-spec.json` + ROADMAP-CONSOLIDATED |
| _pre-log_ | Master Post — saleable post-processor product | existing-node + ghost | ⏳ ongoing |
| _pre-log_ | CAD/CAM AI — autonomous CAD generation + CAM programming | existing-node + ghost | ⏳ ongoing |
| _pre-log_ | 6 tier-1 CAM bridges (Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks) | mixed (some bridges built) | ⏳ ongoing — DEEP_INTEGRATION_BRIDGES in ROADMAP-CONSOLIDATED |

> The app-feature section is seeded from the product vision (`CLAUDE-BRIEF.md` / `build-vision-spec.json`). It was NOT retroactively reconstructed from prior session transcripts — those requests are not all recoverable. From 2026-05-17 forward, every operator feature ask gets its own dated row here.

---

## Honesty note

This log starts 2026-05-17. It does not claim to be a complete history of every request the operator has ever made — earlier asks live (partially) in `ROADMAP-CONSOLIDATED`, handoffs, and memory. What this log guarantees going forward: **every build/feature intent the operator states is captured here, dated, and cross-referenced to system-viz** — so no future request is lost between sessions.
