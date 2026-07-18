# Chat-slot domain designations

> **Canonical source.** Operator-locked 2026-05-27, mirrored from `H:/CHAT-SLOT-DOMAINS.md`.
> **Awareness mechanism:** `.claude/hooks/slot-domain-awareness-inject.mjs` (UserPromptSubmit) reads this file and injects a compact slot-domain table into every chat's prompt context — every slot knows every other slot's territory.
> **Refresh:** edit `H:/CHAT-SLOT-DOMAINS.md` (authoritative root copy) AND this shared copy. The hook reads the shared copy (so worktree peers see it without H: root sync).

## Active slot designations (22 of 26 NATO slots assigned)

| Slot | Domain |
|---|---|
| **ALPHA** | Token optimization + efficiency hunting + Obsidian + per-chat memory + per-chat-slot galaxy (each with own memories + CLAUDE.md) |
| **BRAVO** | Hermes / Zebra building + stub hunting |
| **CHARLIE** | Quoting software — backend AND frontend |
| **DELTA** | CAD |
| **ECHO** | Post processors |
| **FOXTROT** | **Milling Wizard** |
| **GOLF** | Fleet reaper (MUST KEEP RUNNING AT ALL TIMES) — zombie/orphan node sweep (bash, git, read, grep, search, task-manager processes) · MCP server updates/upgrades/fixes · general work |
| **HOTEL** | Employee · HR · accounting · office personnel · managers · workers · legal · owner · ERP · business management · Kaizen · Sigma · Lean |
| **INDIA** | Full system training — AI systems, NN, GNN, LoRA, RAG, deep learning, deep reasoning, machine learning, pattern recognition, algorithm + engine coordination, loop-learning self-improving training system |
| **JULIETT** | Database expansion · **DocuStrata + JM-file database (primary)** — ingestion, schema-versioning, atomic consolidation of the JM Die / DocuStrata corpus into queryable stores (`mcp-server/data/jm-die-database/`) |
| **KILO** | **CAM** |
| **LIMA** | PRISM Academy courses |
| **MIKE** | **Wire Wizard** |
| **NOVEMBER** | U-DEA |
| **OSCAR** | **Speed and Feed Calculator** |
| **PAPA** | Backend helper |
| **QUEBEC** | Frontend web app AND phone app |
| **SIERRA** | System-viz upgrades, integration, utilization |
| **TANGO** | Algorithm, engine, and pipeline discovery |
| **WHISKEY** | **Lathe Wizard** |
| **ZEBRA** | Hermes agent chat fleet orchestrator |

## Slots without explicit domain (4 of 26)

`UNIFORM`, `VICTOR`, `YANKEE` — unassigned. Operator may designate as new domains emerge. (`ROMEO`=wiring and `XRAY`=OCR/blueprint were assigned 2026-05-28 — see `H:/CHAT-SLOT-DOMAINS.md`.)

## Multi-domain fleet policy — ALL slots are any-domain (operator override 2026-06-30)

> **Operator directive 2026-06-30 — "all chats multi-domain (fleet policy)":** every chat slot may access and work in ANY domain from now on, not just its specialty. The previous 9-slot any-domain restriction (alpha, bravo, golf, sierra, zulu, india, papa, romeo, xray) is **superseded** — all 26 slots are now any-domain-capable.
>
> **Prefer-own-domain-first STILL HOLDS** (a slot is its specialty's lead and does that work by default — see the table above + the cross-slot coordination doctrine below), but a slot is NO LONGER domain-bound: it may pick up cross-domain work whenever doing so serves the operator's goal, AND it auto-expands to any domain's roadmap/leftover units rather than idling when its own queue is dry. This is the standing fleet policy, not a per-session override.
>
> **What did NOT change:** worktree/lane isolation (`git-add-lane-guard`, `pre-edit-lane-guard`, `main-tree-write-block`, `slot-commit-worktree-enforce`) still enforce which git tree a slot commits from — those are NOT domain guards and stay. Cross-domain work on the shared trunk lands via `[MAIN-FORCE]`; coordinate via chat-bus + `[MAIN-FORCE]` commits so peer slots don't double-build the same artifact. The conflict-fork rule still applies: two slots must not edit the same file concurrently.
>
> Verbatim operator directive 2026-06-30: *"can you make it so chats can access multiple domains from now on."* (Prior 2026-06-18 9-slot directive — *"if they don't have domain work, change alpha, bravo, golf, sierra, zulu, india, papa, romeo and xray to work in any domain"* — was the predecessor; this 2026-06-30 directive generalizes it to all slots.)

**ANY_DOMAIN_SLOTS:** alpha, bravo, charlie, delta, echo, foxtrot, golf, hotel, india, juliett, kilo, lima, mike, november, oscar, papa, quebec, romeo, sierra, tango, uniform, victor, whiskey, xray, yankee, zulu

Mechanism (already wired — no idle while work exists): `loop-state.mjs cmdNext → pickUnitTop` resolves own-lane first (`pick-unit --slot <slot>`), then on empty falls back fleet-wide (`pick-unit` with no `--slot`, peer-claim-filtered) — i.e. ANY domain's next unit. The fleet-fallback already applies to every slot; this marker now lists all 26 so `slot-domain-awareness-inject` surfaces the any-domain capability to each one. Doctrine: [[feedback_loop_exhaustion_domain_fallback]] (the all-slots fallback ladder) + [[feedback_any_domain_fallback_slots]] (any-domain expansion, now fleet-wide). Auto-surfaced every prompt by `slot-domain-awareness-inject.mjs`.

## NEVER-IDLE HUNT LADDER (operator directive 2026-06-18)

> Verbatim: *"make it a rule that all chat slots never idle, they must always hunt for work, fixes, wirings, ghost builds, ghost wirings, or backlog work. ultimate fall back is each chat slot reads ALL transcripts and chats to ensure we built everything we needed to but need to compare and assess to current build to ensure it syncs well with current build."*

A slot NEVER answers "Idle." When its current unit is done it HUNTS down this ladder (descend only when the rung above is dry; PREFER own domain first):
0. **Finish in-flight work** (anti-drift) — never abandon a unit mid-build to hunt.
1. **Own-domain leftover/deferred** — this + prior sessions' deferred P2s, HANDOFF / DELTA / MASTER-CONTEXT open-threads, `state/shared/handoffs/consolidated/<slot>.md`.
2. **Slot-task / priority queue + backlogged roadmaps** — `loop-state.mjs next`, `pick-unit --slot <slot>`, `PRISM-UNIFIED-ROADMAP-v2.md`, `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md}`.
3. **FIXES** — failing tests (`npx vitest run`, `stop_on_failing_tests`), tsc errors (`rtk tsc`), the CLAUDE.md `## Recent regressions` debt, `bug-hunting`/`regression-hunter` silent-no-op + route-verify.
4. **WIRINGS** — unwired engine→dispatcher: `node scripts/audit-unwired-engines.mjs`, `BUILD_STATE.md` NEEDS_WIRING, `stop_on_unwired_assets`, the `wiring` galaxy closure.
5. **GHOST builds / ghost wirings** — /system-viz ghost roosts (`ghost.unwired-engine`, `ghost.misc_tasks`, `ghost.bridge_synergy`), `prism_session:master_index_query`, `/system-viz find`. Build the unbuilt, wire the unwired.
6. **BACKLOG** — `state/shared/specs/MISC-TASKS-INVENTORY.{json,md}` (318 orphaned tasks across 912 transcripts + 504 handoffs). The 9 any-domain slots EXPAND to ANY domain's units here.
7. **ULTIMATE FALLBACK — transcript + chat reconciliation vs current build.** When every rung above is dry: confirm everything promised/needed was actually built, then COMPARE + ASSESS vs the CURRENT build so it syncs. Use the EXISTING miners — **never read raw transcripts into Claude context** (R5/Ollama-first): run `node scripts/mine-galaxy-transcripts.mjs <galaxy>` / `mine-india-transcripts.mjs`; read the already-mined `MISC-TASKS-INVENTORY` + `ROADMAP-CONSOLIDATED`; reconcile that promised set vs `BUILD_STATE.md` / `ENGINE_DIGEST.md` / `DISPATCHER_DIGEST.md` / /system-viz; surface gaps (built-but-unwired, promised-but-unbuilt, drifted) → build/wire them (back to rungs 3-5).

Idle is valid ONLY when rungs 1-7 are ALL dry AND budget is RED (a spiral — R6 — is the only other stop signal; context growth is NOT). Doctrine: [[feedback_slots_never_idle_always_hunt]].

## Cross-slot coordination doctrine

- **Every slot reads this file via `slot-domain-awareness-inject` hook** before responding. No slot may claim work outside its domain without explicit operator override — EXCEPT the 9 **any-domain fallback slots** above (operator-sanctioned 2026-06-18), which expand to any domain when their own queue is dry.
- **Wizard handoffs:** foxtrot (mill) ↔ whiskey (lathe) ↔ mike (wire) share the print-to-program orchestrator pattern. CAM-side coordination flows through kilo. Post-emit through echo. SFC through oscar.
- **Domain-crossing units** (e.g., a Mill Wizard unit that needs CAM bridge code from kilo) must be coordinated via chat-bus broadcast BEFORE work begins. The slot whose domain owns the *core* artifact ships the unit; sibling slots provide composition surfaces.
- **The kilo CAM ⊃ foxtrot Mill division of labor:**
  - **Kilo owns:** cross-CAM strategy (Fusion/Mastercam/hyperMILL/Inventor/NX/Esprit/SolidCAM/PowerMill), CAM-level interrupted-cut avoidance, adaptive-pipeline orchestrator, host-sim-result-reader, variable repositioning algorithm, cross-CAM action-template library, .f3d / .mcx-8 / .hmc / .esp / .prt corpus indexing, CAM tribal corpus.
  - **Foxtrot owns:** Mill Wizard surface (MillMasterOrchestratorFacadeEngine + 49 dispatcher actions) + mill-side wiring of (CAM + post + SFC + quoting + ERP + databases) into the wizard + mill-specific decision logic (HEM vs trochoidal, conventional vs climb, ap/ae for mill geometry).
  - **Echo owns:** post-processor emit + per-vendor master-posts (Hurco V11, Okuma OSP, etc.).
  - **Oscar owns:** Speed-Feed Calculator nine-axis stack + outcome feedback wire.
  - **Charlie owns:** Quoting backend + frontend.
  - **Hotel owns:** ERP integration + workorder + shop-floor cost.
  - **Juliett owns:** the DocuStrata + JM-file **database** (corpus ingestion, schema-versioning, atomic consolidation → `mcp-server/data/jm-die-database/`). Charlie (quoting), Echo (post PDFs), and Hotel (accounting/ERP) **consume** juliett`s stores; juliett owns their persistence health + schema, not their business logic.

## Updating

To add a domain or reassign a slot:

1. Edit `H:/CHAT-SLOT-DOMAINS.md` (authoritative)
2. Edit `state/shared/CHAT-SLOT-DOMAINS.md` (this file, hook reads it)
3. Broadcast to chat-bus so live peers re-read

The hook caches the parsed table per-session; restart the chat (or wait for `/compact`) to pick up edits mid-session.

## See also

- `state/shared/chat-slots.json` — runtime slot binding state (who currently holds which slot)
- `H:/prism/.claude/helpers/chat-slots.mjs` — slot claim/release/reap logic + `SLOT_NAMES` enum
- `.claude/hooks/slot-bind-enforce.mjs` — UserPromptSubmit hook that pins slot binding
- `.claude/hooks/slot-domain-awareness-inject.mjs` — UserPromptSubmit hook that reads THIS file and injects the table
- CLAUDE.md §PER-CHAT HANDOFF + §GOLF SLOT — slot-system doctrine
