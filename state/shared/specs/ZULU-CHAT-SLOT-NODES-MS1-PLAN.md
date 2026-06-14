# ZEBRA-CHAT-SLOT-NODES-MS1 — Per-slot deep population (5-parallel-agent autopilot)

**Date:** 2026-05-25 · **Slot:** bravo (`claude-7979e425`) · **Origin:** user directive
*"each chat agent becomes fully self aware of their domain and their task to produce a
value generating feature of the prism app or improvements to overall system"*

Follow-on to **ZEBRA-CHAT-SLOT-NODES-MS0** (foundation, this commit) which shipped
the chat-fleet roost + 26 NATO slot nodes + baseline PSN synergy edges. MS1 deepens
each per-slot node with engine refs, tribal-knowledge refs, CAD/print resources,
PRISM-AI feature bindings, and active-work refs — making each chat-slot node a
**rich PSN-leg consumer surface**.

This is the durable execution plan for a **5-parallel-agent autopilot** run in the
next session (current session at 75% context — fail-loud-honest about budget).

## MS0 baseline (already shipped)

- `scripts/generate-chat-slot-nodes-features.mjs` — generator
- `scripts/generate-chat-slot-nodes-features.test.mjs` — 20/20 tests pass
- Registered in `scripts/regen-viz.mjs` FAST[] + `scripts/merge-augmentations.mjs` splice
- Augmentation output: `state/shared/system-viz/chat-slot-nodes-augmentation.json`
- Schema: 1 roost (`ghost.chat_fleet`) + 26 children (`ghost.chat_slot.<slot>`)
- Each child has metadata `{slot, sessionId, branch, topic, loopRunning, tokenZone, decision, refuseCount, hermesRole, skipped}`
- Synergy edges per slot: soul · token · branch · loop (if bound) · domain (from hermes_role)

## MS1 unit decomposition (5 parallel-agent batches)

The 26 slots split into **5 batches of ~5 slots each** so the autopilot can run
4 parallel research/build agents + 1 integrator (me) per batch:

| Batch | Slots (5 each) | Primary domain bias |
|-------|----------------|---------------------|
| **B1** | alpha, bravo, charlie, delta, echo | mill / wedm / cad |
| **B2** | foxtrot, golf, hotel, india, juliett | hygiene / erp / post / speed-feed |
| **B3** | kilo, lima, mike, november, oscar | print-to-program / academy / misc |
| **B4** | papa, quebec, romeo, sierra, tango | unassigned / dev-ops / orchestration |
| **B5** | uniform, victor, whiskey, xray, yankee, zulu, zebra | unassigned + orchestrator (zebra) |

For each slot, the agent enriches the node with these refs (where applicable):

### U-CSN-M1 — Engine refs (per slot domain)
- Bravo → mill engines (KienzleForceModel, UltimateSpeedFeed, ChatterStabilityLobe, etc.)
- Charlie → wire-EDM engines
- Delta → CAD engines
- Echo → CAM-toolpath engines
- (Default lookup: PRISMSelfAwarenessEngine.recommendAIFeatures(slot.hermes_role))

Each ref becomes a `synergy` edge `chat_slot.<slot> → engine.<name>` (graph already has engine nodes).

### U-CSN-M2 — Tribal-knowledge refs
For each slot domain, attach top-K tribal tips (`knowledge/tribal/<domain>-*-tips-*.md`).
Edge: `chat_slot.<slot> → tribal-tip.<id>` (kind: `synergy`, label: `tribal-knowledge`).

### U-CSN-M3 — Wiki refs
Master-index search for the slot's domain → top-3 wiki entries. Edge:
`chat_slot.<slot> → wiki.<entry-slug>` (kind: `synergy`, label: `wiki`).

### U-CSN-M4 — Resource refs (CAD/prints/docs, where applicable)
For shop-floor-bound slots (mill/lathe/wedm specialists), attach:
- JM Die customer-folder refs (`H:/PRISM/JM DIE/<MACHINE>/<CUSTOMER>/`)
- Recent print-to-program units
- Active CAD/STEP files in regression test sets

### U-CSN-M5 — PRISM-AI feature refs
For each slot, call `PRISMSelfAwarenessEngine.recommendAIFeatures(domain)` and attach
top-K AI engine refs (creative reasoning, multi-path reasoning, etc.).

### U-CSN-M6 — Active-work refs
For each bound slot, parse the slot's recent git commits (`git log --author-pattern slot/<name>`)
and attach the current unit-in-flight as a `current-work` edge.

## Acceptance criteria

MS1 ships when:
- Each of 26 slot nodes has **≥3 enrichment edges** beyond the MS0 baseline (engine, tribal, wiki).
- Resource edges (CAD/print) emit only for slots where applicable (domain filter).
- AI feature edges land for every soul-bound slot.
- Active-work edges land for every chat-bound slot with recent commits.
- All edges idempotent (re-run produces no duplicates — `existingNodeIds` + `edgeKey` dedup).
- Hermetic tests for each enrichment fn (pure-fn over a synthetic slot+ctx fixture).
- /system-viz dashboard renders the enriched fleet — visual confirmation each slot node has the right substrate bindings.

## Execution protocol — 5-parallel-agent autopilot

**Per batch (5 slots, ~30 min wall time):**

1. **Spawn 4 parallel agents** (`Explore` subagent_type):
   - Agent A: B1.slot1 enrichment research
   - Agent B: B1.slot2 enrichment research
   - Agent C: B1.slot3 enrichment research
   - Agent D: B1.slot4 enrichment research
   Each agent reports: engine refs + tribal refs + wiki refs + resource refs + AI feature refs for its slot.
2. **Me (5th agent)** handles B1.slot5 + integrates results from A-D into the generator.
3. **Append enrichment fn** to `scripts/generate-chat-slot-nodes-features.mjs` (new exported `enrichSlot(slot, ctx, refs)` pure fn).
4. **Re-run generator** → augmentation updated with new edges.
5. **Run `node scripts/regen-viz.mjs --fast`** → graph rebuilt with enrichment.
6. **Per-batch commit** with [BOOTSTRAP-SLOT-ENFORCE] prefix.

Repeat for B2..B5. End-of-task 3-of-3 scrutiny on the final batch.

## Risk register

| Risk | Class | Mitigation |
|------|-------|-----------|
| Context wall mid-batch (each Explore agent costs 150-250K) | P0 | Cap to 1 batch per session if context >40% on entry; 2 batches if <30% |
| Domain mis-classification (bravo not actually mill?) | P1 | Read `slot-soul.<slot>.md` `domain_filter` field — that's the canonical source |
| Engine refs explode graph size (26 × ≥3 engines = 78+ edges minimum) | P2 | Cap top-K=5 per slot per substrate |
| /system-viz regen OOM on the enriched graph | P1 | Streaming JSON I/O already shipped (U-VIZ-STREAMING-IO, papa 2026-05-24) |
| Concurrent agent edits to same generator file | P0 | Sequential append per batch — no parallel edits to `generate-chat-slot-nodes-features.mjs` |
| Slot soul says "specialist-X" where X isn't a known PRISM domain | P2 | Fall-soft: tag node with `domain:unknown`, emit advisory |

## Out of scope (deliberate)

- **Lifting the operator-gate** — chat-slot nodes remain SUGGESTION-only surfaces; no actuation.
- **Real-time enrichment refresh** — MS1 ships static enrichment, regenerated on `regen-viz.mjs` runs. Real-time would need a daemon.
- **Cross-slot decision logic** — that's Zebra's MS1 territory (`decideSlotAction` ADT). Different envelope.

## Cross-refs

- **MS0 commit**: this session's foundation commit (chat-slot-nodes generator + tests + registration)
- **Library**: `scripts/lib/zebra-context-bundle.mjs` (PSN aggregator — already shipped)
- **CLI**: `scripts/zebra-context-load.mjs` + `scripts/zebra-context-fleet-dashboard.mjs`
- **Hook**: `.claude/hooks/slot-context-bundle-inject.mjs` (per-prompt fleet precheck)
- **Spec source**: ZEBRA-OMNISCIENT-MS0-PLAN.md §5 (5-surface read-side complete)
- **Wiki**: `knowledge/wiki/architecture/zebra-omniscient-ms0.md`
- **Memory**: `reference_zebra_fleet_precheck_2026_05_25.md` · `reference_u_zo_ms0_05_06_2026_05_25.md`

## Synergy contract (per /goal directive 2026-05-25)

Operator directive (paraphrased): *"each chat agent becomes fully self aware of their
domain and their task to produce a value generating feature of the prism app or
improvements to overall system"*.

**MS0 satisfies the foundation:** every slot has a node with PSN-leg synergy edges.
**MS1 satisfies the value:** every node lights up with engines, tribal, wiki,
resources, and AI features — turning the fleet roster into a substrate-aware
collaboration graph the operator can visualize and reason about.

The autopilot loop (5-parallel × 5 batches) is the execution shape; this spec is
the durable plan.
