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

`ROMEO`, `UNIFORM`, `VICTOR`, `XRAY`, `YANKEE` — unassigned. Operator may designate as new domains emerge.

## Cross-slot coordination doctrine

- **Every slot reads this file via `slot-domain-awareness-inject` hook** before responding. No slot may claim work outside its domain without explicit operator override.
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
