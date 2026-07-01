---
name: reference-juliett-12chat-allocation-2026-05-17
description: 12-chat ROI allocation V1 across alpha..mike; 5-wave ordering; CLEAR-NOT-COMPACT doctrine; per-unit specs convention
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.475Z
aliases: reference_juliett_12chat_allocation_2026_05_17
---


# JULIETT 12-chat allocation (2026-05-17, juliett iter-2)

10-agent post-/compact ROI swarm (A1-A10) → V1 allocation `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`. Distributes 17 units across 12 work slots in 5 waves:

- **W0**: U-WIRE-DOCTRINE-RESOLUTION (operator), U-RGS-RULE-BACKEND-DEV (lima), U-CLEAR-AUTO-RESUME (alpha)
- **W1**: U-MEMORY-COMPRESS-V2 + U-MEMORY-GROWTH-GATE (mike), U-ACTIVATE-BEFORE-BUILD-PRECHECK (alpha), U-PRECOMMIT-PATHSPEC-ONLY (echo)
- **W2**: U-AUTO-MEMORY-WRITE (bravo), U-NEW-TOOL-AUTO-WIRE (charlie), U-DOCTRINE-OBSOLESCENCE-SWEEP (delta) — settings.json serialize
- **W3**: U-GOLF-CRASH-FAILOVER (golf), U-CHECKIN-VAULT-INJECT (delta), U-SLOT-WORKTREE-FORCED-CUTOVER (charlie) — fleet-wide quiesce
- **W4**: 10 hand-picked backend-dev wirings (foxtrot/hotel/india/kilo/lima/mike): DLQ/OTel/Prometheus/ChaosDrill/LatencyBudget/Pact/DistLock/LSHDedup/EntropyTracker/OllamaContextFloor

**CLEAR-NOT-COMPACT doctrine** (new): prefer `/clear` over `/compact` for token headroom; 11 bypass systems documented in V1 §1. Per-unit specs at `state/shared/specs/UNITS/<unit_id>.md` make every unit /clear-pickup-ready.

**Cost downgrades discovered:** 5 of 8 V2.1 Stage-2 BLOCKERS partially-shipped (V2 watchdog already shipped by mike U-OBS-B1, alpha-guardian preserved, distill writer works except MEMORY.md index append, OBSOLESCENCE-CLEANUP-MS0 has A4/B1/B2/C1 shipped, vault inject can share search-lib).

See [[reference_juliett_devtools_synergy_map_2026_05_17]] for iter-3 synergy follow-up.

Wiki: `knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`

## Per-slot RGS allocator (2026-05-17, juliett continuation)

Work order "begin rgs pipeline for each chat slot" → built `scripts/allocate-rgs-per-slot.mjs`: deterministic generator that partitions the priority-queue pool across the 13 slots. 12 work slots (alpha..foxtrot, hotel..mike) get a round-robin slice of the priority-ordered pool (`--per-slot`, default 6); golf gets hygiene-milestone units only (`CLEANUP|FLEET-REAPER|FLEET-MEMORY|OBSOLESCENCE|REAP|HYGIENE`) + standing duties. Emits `state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-<date>.{json,md}` atomically. Picking is **delegated** to `.claude/helpers/priority-queue.mjs` (R8 — never re-implements selection). Advisory only, deterministic, fail-loud on duplicate assignment (exit 1) and on priority-queue schema drift (exit 2), empty-pool safe (recovers priority-queue's `[]` stdout from its exit-1). First run: 78 units (12×6 + golf 6). 2-reviewer per-file gate: round 1 FAIL (P0 empty-pool exit-code collision + P1 silent field-name coupling + P1 spec overclaimed claim-filtering) → fixed → round 2 PASS. Complements the hand-curated ROI swarm allocation above — this is the mechanical RGS partition. Wiki: [[per-slot-rgs-allocation]].

## Injecting RGS allocation into live slot queues (2026-05-17, juliett)

Follow-up work order "build the roadmaps for each chat slot then inject them into their task queues" → built `scripts/topup-slot-queues.mjs`. The live per-slot queue is `state/shared/slot-task-queues.json` (read by `scripts/slot-queue.mjs`, which `/checkin-<slot> /loop` uses as preferred pickup). Found it was NOT empty — a peer juliett session (claude-de04081e) had generated a fresh but lopsided allocation 3.5h earlier (alpha=30 eligible, juliett=1, india/kilo=0). Operator chose "top up starved slots only" (non-destructive). The injector appends units to slots with eligible < `--min-depth` (default 6): first from the RGS allocation, then a `priority-queue.mjs` deep-tail fallback when dedup exhausts the allocation. golf exempt from the fallback (hygiene slot — fallback yields feature units). Global case-insensitive dedup, atomic write, `--dry-run`. depends_on:[] on all topped-up entries (RGS inventory has 0/3197 units with dep data — recorded honestly in `lastTopup.note`, not implied). First run: 9 starved slots topped up, +33 units, every slot reached eligible ≥6. 2-reviewer per-file gate: round 1 (A PASS / B FAIL — case-mismatch dedup + depends_on) → fixed (norm() helper + honest-disclosure on depends_on since the data genuinely doesn't exist) → round 2 PASS/PASS. Wiki: [[per-slot-rgs-allocation]] §Injecting.

## Domain-specialized re-allocation + forge-audit-v2 (2026-05-17, juliett)

Work order: "/forge-audit-v2 read all chats/plans/orphan-nodes for unplanned features, then break up prism tasks into the 12 chats — each chat owns one PRISM domain." 15 domains → 12 work slots + golf reconciled (operator chose: golf=database+hygiene, merge erp+hr and academy+learning). Domain map: alpha=mill bravo=lathe charlie=wire delta=cad echo=cam foxtrot=tribal hotel=erp+hr india=post juliett=speedfeed kilo=print2prog lima=academy+learning mike=misc golf=database. **forge-audit-v2**: 6 parallel agents scanned specs/handoffs/unwired-engines/`extracted/` v8.89 monolith (895 files)/Resources(164K)/JM-DIE(174K). Headline gap: **674 unwired engines, ~595 absent from any roadmap** (lathe 77, wire 73, misc 328); v8.89 monolith digest=0 features (CAD geometry kernel, CAM toolpath primitives, ERP subsystem, 220-courses academy, 2500-alarm DB). 64 curated gap units → `FEATURE-GAP-UNITS-2026-05-17.json`. **Allocator** `scripts/allocate-domains-to-slots.mjs`: keyword-classifies ROADMAP-CONSOLIDATED (cam rule BEFORE mill — HYPERMILL contains MILL), merges gap units (lead each queue as `wave:GAP`), re-keys `slot-task-queues.json` — 3235 units across 13 domain slots (mike/misc=1491 infra-heavy, expected). Atomic, advisory, preserves non-`queues` keys. 2-reviewer per-file gate PASS/PASS. Audit doc: `state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.{md,html}`. Wiki: [[per-slot-rgs-allocation]] §Domain-specialized · [[feature-gap-audit-2026-05-17]].

## Audit → system-viz automation (2026-05-17 follow-up, juliett)

Work order: "add everything missing strategically to the road maps and divide it among the chat slots. add ghost nodes if they're missing and ghost wires to /system-viz. make sure we're using it and automate it." Built the complete audit→roadmap→slot-queue→system-viz pipeline as PERMANENT automation:

1. **Canonicalize gap units as a real milestone:** `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json` (64 units, generated from FEATURE-GAP-UNITS JSON, schema-compatible with build-milestone-progress.mjs); registered in `roadmap-index.json` (750→751 milestones). MILESTONE_PROGRESS regenerated +64 → 5200 total.
2. **System-viz integration:** new `scripts/generate-feature-gap-features.mjs` follows the priority-queue/misc-tasks/bridge-synergy pattern exactly. Emits `ghost.feature_gap_audit` roost (L8) + 64 gap-unit children (L9, domain-color-coded) + 64 explicit `audit-discovered` ghost wires. Atomic tmp+rename write. Newest-FEATURE-GAP-UNITS-*.json glob (lexical date-sort).
3. **Auto-flow registration:** added to `regen-viz.mjs` FAST[] array (next to generate-priority-queue) + `merge-augmentations.mjs` loadOptional + splice block (mirrors priority-queue block — dedup by id, dedup edges by from|to|type, G.meta.featureGap). Post-commit hook + hourly cron auto-pick-up future audits.
4. **Domain allocation already wired** (allocate-domains-to-slots.mjs reads FEATURE-GAP-UNITS and routes each gap to its owning slot's queue as wave:GAP — lead position).

Per-file 2-reviewer gate (both files: generator + merge splice + envelope + FAST registration): **PASS/PASS** — sibling-pattern fidelity, no scope shadowing, schema-compatibility verified, R12 honest (advisory_only/must_human_verify, no overclaim). Commit pending. Wiki: [[feature-gap-audit-2026-05-17]].

**Doctrine confirmed:** /system-viz IS PRISM's canonical task/roadmap tracking surface (the 13-domain slot queues + the ghost roosts collectively render every remaining unit). Future audits drop a new FEATURE-GAP-UNITS-<date>.json and the pipeline propagates without manual steps.


## Related
[[skills/compact|/compact]] • [[skills/shared|/shared]] • [[skills/specs|/specs]] • [[skills/hotel|/hotel]] • [[skills/india|/india]] • [[skills/kilo|/kilo]] • [[skills/lima|/lima]] • [[skills/mike|/mike]] • [[skills/clear|/clear]] • [[skills/clear-pickup-ready|/clear-pickup-ready]]