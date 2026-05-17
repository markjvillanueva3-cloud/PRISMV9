# Boris Loop + Agent Doctrine for PRISM

**Author:** claude-cee63f1f (synthesizing Boris Cherny's published Claude Code workflow + cyrilXBT/Thariq/darkzodchi/Ashwin/Akshay articles + Karpathy discipline)
**Date:** 2026-05-09
**Purpose:** Canonical reference embedded into `/forge*` and `/forge-audit*` so every PRISM build run uses loops as the **primary product-shipping mechanism**, not as an afterthought.

## Sources

| Author | Resource | Key contribution |
|---|---|---|
| Boris Cherny (Anthropic, Head of Claude Code) | [howborisusesclaudecode.com](https://howborisusesclaudecode.com/) · [Pragmatic Engineer interview](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny) · [VentureBeat workflow reveal](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are) | "**#1 tip: give Claude a way to verify its work. If Claude has that feedback loop, it will 2-3x the quality.**" Parallel-5 instances. `/loop` + `/schedule` + composite `/go`. Hooks as infrastructure. |
| Andrej Karpathy | LLM-Wiki gist | Anti-drift checkpoint every 5 tasks. Wiki-as-compounding. |
| CyrilXBT | "Vault Writes Back to Itself" (`H:/prism/state/shared/x-fetch/cyrilXBT-status-2052923836090167526.md`) | 6 autonomous workflows on schedule — Daily Context, Queue, Weekly Synth, Connection Finder, Project Auto-Updater, Knowledge Distillation |
| Thariq (Anthropic Claude Code) | "Unreasonable Effectiveness of HTML" | All forge outputs (specs, reports, dashboards) should be HTML — info density + 2-way interaction + shareable |
| darkzodchi | "AI team that doesn't quit" | 3 rules: narrow job descriptions, real-time observability, don't host on laptop (= Docker) |
| Ashwin Gopinath (Sentra) | "Company Brain" | Markdown brains are prototypes; org-scale needs provenance/ontology/conflict-resolution/action-traces/eval-gates |
| Akshay Pachaar | "RAG done wrong" | IdeaBlocks (question + validated answer + governance) — 2.3× retrieval relevance |

---

## §1 — The Three Nested Loop Scales

Every PRISM build operates at three loop scales simultaneously. Forge runs that miss any of the three drift, regress, or compound poorly.

### Loop scale 1: MICRO (Karpathy — per-task, ~5 minutes)

Anti-drift checkpoint every 5 tasks:
- Am I still on the user's goal or did I wander?
- Is this the simplest solution or am I over-engineering?
- Did I check existing assets before building new?
- Have I made any assumptions I haven't verified?

**Tool:** `/karpathy` skill, /context-budget, TodoWrite per unit. Already wired in `/forge5`.

### Loop scale 2: MESO (cyrilXBT — per-day/week, recurring cron)

6 autonomous workflows that fire without prompting:
- Daily 6 AM: synthesize yesterday's notes + active projects + inbox → daily context
- Hourly: walk PRs, auto-fix lint
- Every 2h: process queue/ folder
- Weekly Sunday 8 PM: 4-question retro
- Weekly: scan for non-obvious connections
- Monthly: distill resources/areas into canonical reference docs

**Tool:** Boris's `/schedule` (cloud cron) + `/loop` (local cron) + cyrilXBT's N8N pattern. New track in our 32-unit plan (Track B).

### Loop scale 3: MACRO (Boris — per-PR/release, verification chain)

The single most important pattern Boris named:
1. **Plan mode** (shift+tab twice) — iterate the plan until solid
2. **Auto-accept** — eliminate permission prompts
3. **Verification feedback loop** — Claude has a way to check its own work (run tests, hit endpoint, render UI, eval against reference)
4. **Composite chain** — `/go` does verify → simplify → PR atomically
5. **Subagent isolation** — `isolation: worktree` for parallel batch work; "10 parallel agents" for migrations

**Tool:** Existing skills `/scrutinize`, `/simplify`, `/test`, `/verify-loop`, `/peer-review`. Need composite chaining.

---

## §2 — Boris's specific tactical patterns

### Parallel-5 strategy
- 5 Claude instances in separate git checkouts (or worktrees)
- Plus 5-10 sessions on claude.ai/code
- Numbered tabs 1-5
- System notifications when input needed
- Shell aliases (za, zb, zc) for switching

→ **Maps to PRISM**: we already run 6+ chats. The chat-bus + per-agent handoff system is the equivalent. Gap: **no shell-alias layer for fast switching** (Boris-grade ergonomics).

### Subagent dispatch
- Named agents in `.claude/agents/`: `code-simplifier`, `verify-app`, `sentry-errors`, etc.
- Each specifies `isolation: worktree`
- "10 parallel agents with worktree isolation" for async I/O migration
- Subagent runs end-to-end before opening PR

→ **Maps to PRISM**: forge-team already exists (3-agent team). Gap: **most subagents don't use `isolation: worktree`** — they share the parent tree, causing the conflict-fork-rule pain we hit this session.

### Hook lifecycle
- **PostToolUse**: auto-format
- **Stop**: nudge Claude to continue, route permission to Slack/Opus, run custom logic
- **SessionStart**: dynamically load context
- **PermissionRequest**: route approvals to external channels
- **PostCompact**: re-inject critical instructions after compression

→ **Maps to PRISM**: we have all 5 hook types with 423 hooks total. Gap: **PermissionRequest hook is unused** — could route auto-approval through Opus 4.5 like Boris does.

### Verification by domain
- Backend: end-to-end test runs
- Frontend: Chromium extension iterative test
- Desktop: computer use
- "If Claude has that feedback loop, it will 2-3x the quality"

→ **Maps to PRISM**: physics engines have reference-value tests, CAM has prove-out, AI has eval sets. Gap: **the verification loop is per-engine, not per-forge-run** — forge runs don't currently REQUIRE a verification feedback channel before ending.

### CLAUDE.md back-flow
- "Anytime we see Claude do something incorrectly we add it to CLAUDE.md, so Claude knows not to do it next time."
- Tag `@.claude` on PRs to auto-update CLAUDE.md as part of PR workflow

→ **Maps to PRISM**: `error-pattern-promote.mjs` Stop hook does some of this. Gap: **regressions caught by /scrutinize don't auto-flow into CLAUDE.md** — the loop is broken.

### Plan-first methodology
- Most sessions start in Plan mode (shift+tab twice)
- "A good plan is really important to avoid issues down the line"
- One team member spawns second Claude to review plan as staff engineer

→ **Maps to PRISM**: `/forge5` already requires plan via `/rgs5 generate` (16-stage pipeline). Gap: **the plan reviewer is the same model not a peer Claude** — Boris's "spawn 2nd Claude as staff engineer to review" pattern is our `/peer-review` skill but it's not auto-invoked.

---

## §3 — The 12 Boris-patterns we need to embed in /forge*

| # | Pattern | Currently | After upgrade |
|---|---|---|---|
| 1 | Verification feedback loop required to close a unit | optional | **HARD GATE** — engine can't be marked built until verification channel runs and passes |
| 2 | Plan reviewed by peer Claude as staff engineer | manual | Auto-dispatch `/peer-review` after plan emit |
| 3 | Subagents use `isolation: worktree` | sometimes | Default ON for any subagent that touches >2 files |
| 4 | Composite verify→simplify→PR chain | 3 separate skills | New `/forge-go` chain skill |
| 5 | `/loop` schedules forge unit continuation | not wired | New unit envelope field: `continueOn: schedule\|user-prompt` |
| 6 | `/schedule` for cyrilXBT 6 workflows | not built | Track B units register cron via `/schedule` skill |
| 7 | CLAUDE.md auto-updates on regression | partial (error-pattern-promote) | Stop hook explicitly appends regression patterns to project CLAUDE.md |
| 8 | PermissionRequest hook auto-approves safe ops via Opus | unused | New hook routes permission decisions through Opus classifier |
| 9 | HTML output for specs/plans (Thariq) | absent | All forge plans, audits, dashboards emit `.html` alongside `.md` |
| 10 | Parallel-5 default | up to user | Forge offers `--parallel N` flag that spawns N worktrees |
| 11 | Anti-drift Karpathy every 5 units | partial | `/karpathy` auto-fires at units {5,10,15,…} during forge |
| 12 | Recurring audits via `/loop` | absent | `/forge-audit-v2` self-schedules a 7-day re-run |

---

## §4 — Forge command upgrade matrix

### `/forge-go` (NEW composite skill — Boris's /go for PRISM)

```
1. /test affected      ← verification feedback loop (Boris #1)
2. /simplify           ← post-build cleanup
3. /scrutinize         ← multi-role review
4. commit + push       ← if all green
5. /handoff            ← write per-agent handoff
6. (optional) /loop    ← schedule re-verify in 4h
```

Single command, atomic chain. Replaces the current 5 separate invocations.

### `/forge7` (proposed — supersedes /forge6 with Boris discipline)

Strictly additive over `/forge6`. Adds:

- **Phase 0.7 (NEW)**: Verify a feedback channel exists for every unit. If unit has no test/eval/observable-state, BLOCK and force user to declare one.
- **Phase 4.5 (NEW)**: Auto-spawn `/peer-review` against the plan emitted by `/rgs6 generate`. Boris pattern: spawn 2nd Claude to review as staff engineer.
- **Phase 4 LOOP 2 default**: Subagent dispatched with `isolation: worktree`. Override via `--no-isolation` flag for trivial units.
- **Phase 6.M (NEW)**: Append any regression detected during this run to `H:/prism/CLAUDE.md` under `## Recent regressions` section. Boris CLAUDE.md back-flow.
- **Phase 6.N (NEW)**: Emit HTML version of the milestone summary alongside markdown. Thariq pattern.
- **Phase 6.O (NEW)**: If milestone has follow-up units, register them via `/loop` (local) or `/schedule` (cloud cron). cyrilXBT pattern.

### `/forge-audit-v2` (NEW — supersedes /forge-audit)

The audit-specific upgrade. See companion file: `H:/.claude/commands/forge-audit-v2.md`.

Key additions:
1. Audit MUST emit a re-runnable measurement tool (META artifact — same as /forge5 §6L compounding-gains)
2. Audit MUST dispatch a 2nd Claude (subagent) to challenge findings ("grill me on these — don't accept until I pass your test")
3. Audit MUST emit HTML + Markdown
4. Audit MUST register itself via `/loop` for re-run in 7 days (so it's not a one-shot)
5. Audit MUST flow regression patterns into CLAUDE.md

---

## §5 — How this lands in our 32-unit MS3 plan

The plan we wrote in `OBSIDIAN-INTELLIGENCE-MS3-UNIFIED-PLAN.md` already has Track B (cyrilXBT 6 workflows). Boris's loop discipline upgrades that:

- B1 (Daily Context) → registered via `/schedule` not raw cron
- B3 (Queue Processor) → fires every 2h via `/schedule`
- B4 (Weekly Synthesis) → registered via `/schedule`

NEW units to add to MS3 (Track J — Boris discipline):
- **J1. U-FORGE-GO-CHAIN** — composite verify+simplify+PR skill
- **J2. U-FORGE7** — next forge with verification gate + plan peer-review + isolation default
- **J3. U-FORGE-AUDIT-V2** — audit upgrade with all 5 patterns above
- **J4. U-CLAUDE-MD-BACKFLOW** — Stop hook appends regressions to CLAUDE.md
- **J5. U-PERMISSION-OPUS-ROUTER** — PermissionRequest hook auto-approves safe ops via Opus
- **J6. U-PARALLEL-5-ALIASES** — shell aliases for fast worktree switching (za, zb, zc, zd, ze)

That brings the plan to **38 units across 10 tracks**.

---

## §6 — Anti-patterns to reject

These are Boris's pitfalls + our session-observed traps:

| Anti-pattern | Symptom | Fix |
|---|---|---|
| **Build without verification channel** | Engine ships, breaks in prod | Phase 0.7 gate — declare verification before any code |
| **Manual loop instead of /loop** | "I'll re-run this in 4h" but you don't | `/loop` schedules it deterministically |
| **Single-Claude reviews own plan** | Confirmation bias | Auto-`/peer-review` spawn |
| **Subagent shares main tree** | Conflict-fork-rule trigger | Default `isolation: worktree` |
| **Markdown-only spec >100 lines** | Nobody reads it (Thariq) | Emit HTML companion |
| **Audit fires once** | Drift accumulates | Self-schedule audit re-run |
| **Permission babysitting** | Velocity drag (Boris) | Opus classifier auto-approve |

---

## §7 — Reading order for new contributors

1. This file (BORIS-LOOP-AGENT-DOCTRINE.md) — patterns
2. `OBSIDIAN-INTELLIGENCE-MS3-UNIFIED-PLAN.md` — 32+6 units
3. `SYSTEM-SYNERGY-AUDIT-2026-05-09.md` — 22.2% baseline
4. `H:/prism/CLAUDE.md` — project enforcement gates
5. `H:/.claude/commands/forge7.md` — upgraded forge (when shipped)
6. `H:/.claude/commands/forge-audit-v2.md` — upgraded audit (when shipped)

---

## §8 — MD / HTML role split (HTML-COMPANION-MS0 + HTML-PRIMARY-MS0 doctrine)

Thariq's "HTML is the new markdown" (2026-05-08, ~5M views) and Karpathy's
"docs should be one text file" are NOT in conflict — they govern different
surfaces. The PRISM rule:

> **MD = report (LLM-consumed). HTML = interface (human-consumed). Strategic
> spec docs get BOTH (sibling files, MD-canonical, HTML-companion).**

### Qualifying artifacts — get an HTML companion

A markdown file qualifies for an auto-generated HTML companion when ANY of:

| Trigger | Example | Why |
|---|---|---|
| Strategic spec doc ≥150 lines | `state/shared/specs/SYSTEM-SYNERGY-AUDIT-*.md` | Operator scans for severity tags, copies blocks, navigates |
| Audit report (severity tables, findings, evidence) | `STALE-NODES-AUDIT-2026-05-16.md` | Same; copy-button + sticky nav are the load-bearing affordance |
| Roadmap / atomized plan | `BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-*.md` | Operator iterates rows, filters by tier/leverage |
| Operator setup sheet | future `setup-sheets/*.md` | Shop-floor terminal often a browser tab, not Claude Code |
| Design doc with diagrams | `*-DESIGN.md`, `*-PLAN.md` | SVG renders natively; ASCII art does not |

**Generator:** `SpecHTMLCompanionEngine` (`mcp-server/src/engines/SpecHTMLCompanionEngine.ts`),
invoked via `scripts/emit-spec-html.ts` (single file) or
`scripts/emit-all-spec-html.ts` (batch). Wire as PostToolUse Write hook on
`state/shared/specs/**.md` so new specs auto-get HTML within seconds.
MCP-callable via `prism_dev:spec_html_render` + `prism_session:doc_render`.

**Drift guard:** `.claude/hooks/html-companion-guard.mjs` checks every HTML
companion's `<meta name="prism-source-hash">` against its MD source. If a
hand-edit on the HTML diverges from the MD, the next regen would silently
overwrite it; the guard surfaces the drift before that happens.

**A11y gate:** `scripts/check-spec-html-a11y.mjs` (also wired in the guard).
WAI-ARIA + axe-cli rules. WebAim 2025 found 41% of HTML-rendering tools
regress accessibility; this is the pre-commit blocker.

### Non-qualifying surfaces — MD-only, no HTML companion

A markdown file is **machine-consumed** when ANY of:

| Surface | Why MD-only |
|---|---|
| `H:/prism/CLAUDE.md` + project CLAUDE.md | Claude Code loads markdown literally — HTML would never inject |
| `H:/prism/.claude/commands/**.md` (skills) | Skill bodies are LLM prompt fragments, not human-readable |
| `H:/prism/.claude/hooks/**.{mjs,sh,md}` | Hook source + hook-body docs; HTML adds nothing |
| `mcp-server/data/docs/{ENGINE,DISPATCHER,DIRECTORY}_DIGEST.md` | Zero-IO discovery tables read by code |
| `state/shared/handoffs/HANDOFF-*.md` | Inter-session context the next chat reads as raw text |
| Wiki entries `knowledge/wiki/architecture/**.md` | LLM-recall via BM25 / cosine over the raw MD |
| Obsidian memory `C:/Users/<u>/.claude/projects/.../memory/*.md` | Same — LLM context injection |
| `MEMORY.md` (≤200-line pointer index) | Loaded literally into every session's system reminder |
| `state/shared/AWARENESS-SNAPSHOT.md` / `BUILD_STATE.md` / `CLAUDE-BRIEF.md` | Auto-injected into every SessionStart as text |

Universal MD→HTML migration is a NET REGRESSION on these — the LLM can't
parse HTML tags efficiently, and the harness doesn't render HTML for the
operator.

### The role-split decision rule (one-liner for future contributors)

> "Will a human open this file in a browser to navigate / copy / share it?
> → HTML companion. Will a model load this file as context to act on?
> → MD-only. **Both** (rare, strategic) → both files, MD-canonical,
> drift-guarded."

### Wiring path (operator reference)

```
state/shared/specs/<name>.md  (MD canonical, human-author or LLM-author)
  → PostToolUse Write hook html-companion-guard.mjs
    → scripts/emit-spec-html.ts <name>.md
      → SpecHTMLCompanionEngine.render({ source, theme:'auto', toc:true })
        → state/shared/specs/<name>.html (sibling, with <meta prism-source-hash>)
          → state/shared/specs/<name>.html.hash (sidecar audit trail)
            → guard re-checks hash on subsequent commits; flags drift
```

**Reference shipped specs:** `SYSTEM-SYNERGY-AUDIT-2026-05-09.html` (480 LOC),
`HOOK-SYNERGY-V2-PLAN.html` (300 LOC), `2026-05-09-prism-stabilization-design.html`,
`2026-05-09-tribal-node-binder-design.html`. Pattern: dark theme, sticky TOC,
severity pills (P0/P1/P2/P3), copy-to-prompt buttons on code blocks,
SVG-rendered diagrams.

---

## Sources

- [How Boris Uses Claude Code](https://howborisusesclaudecode.com/) — first-party canonical workflow
- [Boris Cherny — Pragmatic Engineer interview](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny) — parallel-5 strategy
- [The creator of Claude Code reveals his workflow — VentureBeat](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are) — verification feedback loop "#1 tip"
- [Anthropic's Boris Cherny: Why Coding Is Solved](https://www.youtube.com/watch?v=SlGRN8jh2RI) — strategic context
- `H:/prism/state/shared/x-fetch/cyrilXBT-status-2052923836090167526.md` — 6 autonomous workflows
- `H:/prism/state/shared/x-fetch/trq212-status-2052809885763747935.md` — HTML > markdown
- `H:/prism/state/shared/x-fetch/zodchiii-status-2052368125480354000.md` — narrow job descriptions
- `H:/prism/state/shared/x-fetch/ashwingop-status-2052777467732283817.md` — Company Brain infrastructure
- `H:/prism/state/shared/x-fetch/akshay_pachaar-status-2052743644411765230.md` — IdeaBlocks
