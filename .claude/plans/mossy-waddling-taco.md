# Plan — `/pick-dev` + `COMMAND-KERNEL-MS0` roadmap merge + completed-status reconciliation

## Context

A multi-turn `/forge6` brainstorm scoped a **Command Kernel**: a thin syscall layer (`psk`) every PRISM slash command resolves live state through instead of hardcoding counts/paths; a formal pipeline-composition primitive; the Obsidian wiki promoted to the literal OS state store; and a closed telemetry→adaptive feedback loop. Exploration (3 parallel agent passes over the `BACKEND-DEVTOOLS-RGS6` roadmap) established that ~7 existing milestones already build the *substrate* the kernel composes — **none build the kernel itself**, and every overlap is EXTEND, not REUSE.

The user's directive — three concrete asks:
1. **`/pick-dev`** — a slash command like `/pick-unit`/`/pick-task`, locked to the backend-devtools roadmap, auto-including the Command Kernel work.
2. **Merge the Command Kernel plan into the backend-devtools roadmap** as `COMMAND-KERNEL-MS0` — "one master dev-tool roadmap."
3. **Reconcile completed status** — `MILESTONE_PROGRESS.json` shows 173 drifted milestones (envelope says `not_started`, git proves units shipped).

This plan **registers** `COMMAND-KERNEL-MS0` (writes the envelope + roadmap surfaces), **builds** `/pick-dev`, and **reconciles** drift. It does **not** build the 29 Command Kernel units — those become the envelope content, pickable via `/pick-dev` in future sessions.

**Known gap:** `x.com/sourfraser/status/2035454870204100810` is unreadable (Playwright MCP not connected; X returns HTTP 402 to WebFetch; search did not surface it). Plan proceeds without it — fold its ideas in as a refinement pass once the user pastes the text.

## Decisions locked (from user)
- Kernel surface: **CLI + thin MCP action**
- Obsidian-as-OS: **literal — vault is the state store**
- Drift reconciliation: **full sweep, all 173 milestones, review-gated** (per-envelope approval, no `--auto-confirm`)
- `AUTO-LEARNING-LOOP-MS0` reverse-drift: **investigate disk, then decide**

---

## Part 1 — `COMMAND-KERNEL-MS0` milestone design (the slotted plan)

A **synthesis-layer capstone**: it composes substrate built by ~7 sibling RGS6 milestones into a coherent command operating system. It is the line-successor to the shipped `OBSIDIAN-PRISM-OS-MS0`.

**Envelope metadata:** `id: COMMAND-KERNEL-MS0` · `track: BACKEND-DEVTOOLS` · `roadmap_priority: 0` · `version: 1.0.0` · `status: not_started` · `total_units: 29` · `total_sessions: "6-8"` · phased (5 phases).
**`dependencies` (shipped foundations):** `HOOK-SYNERGY-MS0`, `OBSIDIAN-PRISM-OS-MS0`, `DEV-VELOCITY-AUTOTRIGGER-MS0`, `ACP-MS0`.

Disposition legend: **N** net-new · **E:`<id>`** extends an existing unit · **R:`<id>`** reuses an existing unit as-is.

### Phase P0 — Kernel Foundation (6 units)
| Unit | Title | Disposition |
|---|---|---|
| U-CK-P0-01 | `psk` CLI skeleton + thin `prism_session` MCP action (syscall dispatch shell) | N |
| U-CK-P0-02 | `psk whoami` / `position` / `manifest` syscalls | N · E:U-GAC01 · R:stable-session-id/chat-slots/build-state helpers · R:U-SKU06 (skill-inventory backend) |
| U-CK-P0-03 | `psk handoff` / `checkin` / `pick` syscalls | N (shell) · R:per-agent-handoff.mjs/chat-slots.mjs/pick-unit.mjs · E:U-TODOWRITE-HANDOFF-BRIDGE |
| U-CK-P0-04 | `knowledge/wiki/os/` namespace + entity frontmatter schema (commands/pipelines/processes/runqueue/sessions/syscalls) | N · E:U-VAULT01 |
| U-CK-P0-05 | Generated-mirror generators (chat-slots.json / atomic-roadmap.json / SLASH_COMMAND_REGISTRY.json become mirrors of `os/` entities) | N |
| U-CK-P0-06 | Canonical command frontmatter schema (name/desc/version/tier/triggers/consumes/produces/composes_with/effort/model) | N · R:U-SKU06 (base) · reconciles with U-VAULT04 |

### Phase P1 — Command-Surface Migration (5 units)
| Unit | Title | Disposition |
|---|---|---|
| U-CK-P1-01 | `command-migrate.mjs` codemod | N · E:U-WIKI-RENAME-PROPAGATE (donor cross-surface batch-rewrite engine) |
| U-CK-P1-02 | Migrate ~300 commands: standardize frontmatter, de-hardcode counts/paths, register as `os/commands/` entities | N · R:ACP-MS0 inventory+gap-map · R:U-SKU03 linter · R:U-SKU01 3Q gate |
| U-CK-P1-03 | Hand-tune the 7 lifecycle commands (startup/checkin/pick-task/pick-unit/precompact/handoff/boot) to thin `psk` clients | N |
| U-CK-P1-04 | Merge `/pick-task` → `/pick-unit` alias; deprecate conflicts | N |
| U-CK-P1-05 | Per-category scrutiny pass over the migrated corpus | N |

### Phase P2 — Composition Layer (5 units)
| Unit | Title | Disposition |
|---|---|---|
| U-CK-P2-01 | Pipeline registry — adopt ACP-MS0A automation-chain schema (chain-id/steps/triggers/token-budget/event-to-chain/command-to-chain/fail-closed/telemetry) | R:ACP-MS0A (verify shipped in P0) |
| U-CK-P2-02 | Pipeline EXECUTOR (runtime: stage graph, gating, rollback, dry-run) | N · contributed back to the ACP line |
| U-CK-P2-03 | Activate dormant `pipeline_integrations:` frontmatter + wire to executor | N · E:the 11 skills already carrying the field |
| U-CK-P2-04 | Populate `consumes/produces/composes_with` frontmatter across migrated commands | N · E:U-CK-P1-02 · E:U-VAULT04 |
| U-CK-P2-05 | Extend `skill-auto-trigger.mjs` → pipeline-aware, fires on PostToolUse/Stop | E:DEV-VELOCITY-AUTOTRIGGER-MS0 |

### Phase P3 — New Composite Pipeline Commands (9 units)
| Unit | Title | Disposition |
|---|---|---|
| U-CK-P3-01 | `/session-cycle` (checkin→pick→research→build→close-out→handoff) | N · composes the 7 lifecycle commands |
| U-CK-P3-02 | `/research <token\|unit>` | N (shell) · E:U-ALL01..06 |
| U-CK-P3-03 | `/scrutiny-gate` | N · E:U-HKA05 · E:U-HKA08 · E:U-CLAUDE-MD-BACKFLOW |
| U-CK-P3-04 | `/learn-pipeline <src>` | N (shell) · R:/pdf-learn,/video-learn · E:U-ALL chain |
| U-CK-P3-05 | `/wire-pipeline` (orphan-inventory→dedup→wire→test→close) | N |
| U-CK-P3-06 | `/diagnose-fix <artifact>` | N · composes forensic skills |
| U-CK-P3-07 | `/program-perfect <part>` (gen→optimize→validate→ship) | N |
| U-CK-P3-08 | `/forge-supervised` | N |
| U-CK-P3-09 | `/pipeline <name>` meta-command (list/dry-run/execute/resume) | N · the executor's user face |

### Phase P4 — Feedback Loop (4 units)
| Unit | Title | Disposition |
|---|---|---|
| U-CK-P4-01 | `psk record` emits real command-invocation telemetry → `pipeline-telemetry.jsonl` | N · E:U-SKU06 (populates `invocation_count_30d`) |
| U-CK-P4-02 | Wire `pipeline-telemetry.jsonl` → `adaptive-thresholds.mjs` (built, unwired today) | N (wiring) · E:U-ALL04 (classifier template) |
| U-CK-P4-03 | Close command-utilization → auto skill-tier loop | N · E:U-SKU04 · E:U-SKU05 · R:SkillTierRegistryEngine `classify_all` |
| U-CK-P4-04 | outcome → memory/vault → `psk recommend` learns | N · E:U-VAULT03 · R:U-VAULT02/U-WIKI-FLEETING-PROMOTE |

**Outbound contributions (noted in envelope, not COMMAND-KERNEL-MS0 units):** the pipeline executor (U-CK-P2-02) logically belongs in the ACP line — flag as a future `ACP-MS1` contribution. Lifecycle-event hooks (PostCompact, SessionEnd) are **reused** from `CCM-MS0` P0-U08/P0-U09 rather than rebuilt.

**Reuse payoff:** of 29 units, ~21 are net-new; ~8 reuse/adopt existing units outright, and ~16 extend pending substrate units across 6 sibling milestones. Without the reuse the kernel would be ~50+ units.

---

## Part 2 — Deliverable A: `/pick-dev` command

**One file, no new script.** `pick-unit.mjs` is fully data-driven — `--priority devtools` filters `roadmap_priority === 0`, which is already its default. `/pick-dev` is `/pick-unit` with priority **locked** to devtools (never overridable). Duplication check: confirmed no existing `/pick-dev`, `pick-dev.mjs`, or similar.

- **CREATE** `H:/prism/.claude/commands/pick-dev.md` — frontmatter (`name`, `description`, `trigger.autoSuggest.keywords`, `allowed-tools: [Bash, Read]`); body delegates to `node H:/prism/scripts/pick-unit.mjs --priority devtools --slot $SLOT [--tier] [--limit] [--json]`. Documents: no `--priority` flag accepted; once `COMMAND-KERNEL-MS0` is injected with `roadmap_priority: 0` it appears automatically (data-driven, no code change); inherits the research-pack block.

---

## Part 3 — Deliverable B: merge `COMMAND-KERNEL-MS0` into the roadmap

Ordered steps (each file gets the per-file scrutiny gate):

1. **CREATE** `H:/prism/mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` — phased envelope per `mcp-server/src/schemas/roadmapSchema.ts` (`RoadmapEnvelope`): required `id/version/title/brief/created_at/phases[]/total_units/total_sessions`; 5 phases, 29 units from Part 1; each unit carries `id/title/phase/sequence/role/role_name/model/effort` + `dependencies` + `exit_conditions` + `rationale` (the N/E/R disposition). `track: BACKEND-DEVTOOLS`, `roadmap_priority: 0`, `status: not_started`.
2. **EDIT** `H:/prism/mcp-server/data/roadmap-index.json` — add a `MilestoneEntry` to `milestones[]` (`id`, `title`, `track: BACKEND-DEVTOOLS`, `status: not_started`, `total_units: 29`, `completed_units: 0`, `sessions`, `envelope_path: "milestones/COMMAND-KERNEL-MS0.json"`, `dependencies`, `description`); increment `total_milestones`.
3. **EDIT** `H:/prism/scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs` — generalize: read `track` + `roadmap_priority` from each envelope with fallback to the current hardcoded `training-pipeline`/`0` defaults (backward-compatible — the existing 3 milestones are unaffected); rename the internal const `TRIBAL_PIPELINE_MILESTONES` → `INJECT_MILESTONES` and add `"COMMAND-KERNEL-MS0"`. No file rename (referenced by CLAUDE.md/`/pick-unit`).
4. **RUN** `node H:/prism/scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs --dry-run` then without `--dry-run` — injects the 29 units into `state/shared/atomic-roadmap.json` (idempotent via `milestone::unit_id` keys; do NOT hand-edit atomic-roadmap.json).
5. **RUN** `node H:/prism/scripts/build-milestone-progress.mjs` + `node H:/prism/scripts/build-state-snapshot.mjs` — regen the downstream surfaces so `/pick-unit`/`/pick-dev` see the new milestone.

---

## Part 4 — Deliverable C: completed-status reconciliation (full sweep, review-gated)

1. **RUN** `node H:/prism/scripts/build-milestone-progress.mjs` — regenerate the git-grounded truth fresh.
2. **RUN** `/envelope-drift-fix --fix` (review-gated — **no** `--auto-confirm`) — surfaces all 173 drifted milestones; review each against its git evidence and approve/skip per the gate. The orchestrator updates all 4 surfaces atomically (envelope `status` + `roadmap-index.json` `completed_units`/`status` + `MILESTONE_PROGRESS` + `BUILD_STATE`) and auto-commits its sweep separately.
3. **`AUTO-LEARNING-LOOP-MS0` reverse-drift** (envelope `complete`, git scan `4/12`): when surfaced, pause and **investigate disk** — `ls H:/prism/mcp-server/src/engines/` for `ReputableSourceMonitorEngine`, `NoveltyDetectionEngine`, `AutoResearchOrchestratorEngine`, `SynergyClassifierEngine`, `VizAutoAugmentationEngine`, `RoadmapAutoAppendEngine` + U-ALL07..12 wiring. If the deliverable files **exist** → leave `complete` (the 2026-05-12 history strip undercounts git-grep). If they **don't** → roll the envelope back to `in_progress` at the disk-verified count.
4. **Verify** — re-run `build-milestone-progress.mjs`; drift count should drop toward zero.

**Hard rules:** never mark a unit shipped if its artifact doesn't exist; never roll back a `complete` milestone whose artifacts exist on disk; respect the `enforce-roadmap-closeout` / `goal-complete-gate` Stop hooks; all 4 surfaces update atomically (the orchestrator handles this). ~173 review gates is a long interactive pass — it lands as its own commit, separate from A+B.

---

## Execution order + gates
1. **Pre-flight:** `/checkin` to confirm slot + lane; if `cad-fusion-live-ms0` (current branch) is peer-owned for this scope, fork to `work/command-kernel` per the conflict-fork rule. Duplication guard auto-fires on the new-file creates.
2. **Deliverable A** → per-file scrutiny gate (2 parallel reviewers) on `pick-dev.md`.
3. **Deliverable B** → per-file scrutiny gate after each of: `COMMAND-KERNEL-MS0.json`, the `roadmap-index.json` edit, the injection-script edit. Then run steps 4-5.
4. **Commit 1:** `[COMMAND-KERNEL-MS0]/U-CK-REGISTER: /pick-dev + COMMAND-KERNEL-MS0 envelope + roadmap merge`.
5. **Deliverable C** → `/envelope-drift-fix --fix` drives its own review + commit (Commit 2).
6. **End-of-task 3-of-3 scrutiny gate** before Stop.

## Verification
- **`/pick-dev`:** `node H:/prism/scripts/pick-unit.mjs --priority devtools --limit 10` and `/pick-dev` both list `COMMAND-KERNEL-MS0` units; `/pick-dev` rejects/ignores any `--priority` argument.
- **Roadmap merge:** `COMMAND-KERNEL-MS0` present in `roadmap-index.json` (`total_milestones` incremented); `node -e` over `atomic-roadmap.json` finds 29 `COMMAND-KERNEL-MS0` units with `roadmap_priority: 0`; envelope parses against `roadmapSchema.ts`.
- **Build unaffected:** `cd mcp-server && npm run build` passes (only data/command files changed — should be clean).
- **Drift reconciliation:** post-sweep `build-milestone-progress.mjs` shows drift count near zero; `AUTO-LEARNING-LOOP-MS0` disk-investigation result documented in the commit body.

## Known gaps / follow-ups
- **sourfraser article** — unread; refinement pass once pasted.
- **`ACP-MS0A` status** — P0 must verify whether the automation-chain schema phase shipped; U-CK-P2-01 is `R:` if shipped, `E:` if pending.
- **Atomization pass** — `COMMAND-KERNEL-MS0` is registered at the WHAT level; the HOW-level atomized spec (`state/shared/specs/atomized/...`) is a separate future pass before the units are built.
- **`/pick-task`** left untouched here; its merge into `/pick-unit` is `COMMAND-KERNEL-MS0` unit U-CK-P1-04.

## Critical files
- CREATE `H:/prism/.claude/commands/pick-dev.md`
- CREATE `H:/prism/mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`
- EDIT `H:/prism/mcp-server/data/roadmap-index.json`
- EDIT `H:/prism/scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs`
- REGEN (via scripts) `H:/prism/state/shared/atomic-roadmap.json`, `MILESTONE_PROGRESS.{json,md}`, `BUILD_STATE.{json,md}`
- EDIT (via `/envelope-drift-fix`, Deliverable C) ~173× `H:/prism/mcp-server/data/milestones/*.json` + `roadmap-index.json`; possibly `AUTO-LEARNING-LOOP-MS0.json`
- READ-ONLY references: `H:/prism/scripts/pick-unit.mjs`, `scripts/close-out-milestone.mjs`, `scripts/build-milestone-progress.mjs`, `scripts/build-state-snapshot.mjs`, `mcp-server/src/schemas/roadmapSchema.ts`, `.claude/commands/envelope-drift-fix.md`
