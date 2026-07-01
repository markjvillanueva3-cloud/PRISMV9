# Recent shipments inbox — 2026-05-18 / 2026-05-19

> **Purpose** — Pointer inventory of milestones/units shipped in the last 36 h that
> do NOT yet have a summary section in `CLAUDE.md`. Each entry is a one-line pointer
> to where the actual detail lives (commit SHA, wiki entry, memory file). A golf-slot
> chat will batch-promote these into full CLAUDE.md sections in a follow-up sweep —
> this file is the inbox they drain, mirroring the `## Recent regressions` pattern.
>
> Add a row here whenever a new milestone ships and its summary block isn't ready
> for CLAUDE.md yet. Drain rule: a row leaves this file when its detail lands in
> CLAUDE.md proper (or when it's been determined to be CLAUDE.md-out-of-scope).
>
> _Last sync: 2026-05-19 22:30 by golf chat `claude-e20e2b52`._

## Audit method

```
for M in AWARENESS-READINESS SLOT-RECLAIM FLEET-REAPER-MS3 FLEET-RESILIENCE \
         SYSTEM-SYNERGY-AUDIT WIRE-UNWIRED-MS0 COMMAND-KERNEL-MS0 \
         INFRA-CONSENSUS-WIRE BACKEND-DEV-LOOP DOCKER-MCP-WIRE \
         SLOT-COMPACT-SYNERGY BRIDGE-WIRING AI-TRAINING-FIRST \
         KNOWLEDGE-CONVERSION-MS0 U-MEMORY-COMPRESS-V2 FLEET-DOCTRINE-26; do
  HITS=$(grep -c "$M" H:/prism/CLAUDE.md)
  printf "%-30s  CLAUDE.md_HITS: %s\n" "$M" "$HITS"
done
```

Re-run periodically to detect new staleness (rows with `HITS=0` are missing summary).

## Inbox (HITS=0 = missing CLAUDE.md summary)

| Milestone / unit | Latest commit | Wiki | Memory | Action |
|---|---|---|---|---|
| **AWARENESS-READINESS** | `1694bec82f` (5/19 15:31) | _missing_ | [[reference_awareness_readiness_2026_05_19]] | NEEDS-SUMMARY |
| **FLEET-REAPER-MS3** | `1f71dae7c8` (5/19 22:30 DOCS) — D `97d60775ec` · C `51b2d04a10` · B `9baacb056e` · A peer-absorbed · SPEC `c30889550e` · SPEC-HTML `5d410e09d6` | [[fleet-reaper-ms3]] | [[reference_fleet_reaper_ms3_2026_05_19]] | **READY FOR GOLF DRAIN** — patch-sibling at `state/shared/dashboards/patches/CLAUDE-MD-PATCH-fleet-reaper-ms3.md` |
| **SYSTEM-VIZ-FS-COVERAGE-MS2** | `06f3fa418f` (5/17 U-LLM-CLASSIFY) + `1644245953` (U-SIBLING-INFER) + `9ef5f995d9` (U-GHOST-UNWIRED-TUNE) + `0148652887` (U-GHOST-UNWIRED) | [[system-viz-fs-coverage]] + [[system-viz-fs-coverage-ms1]] _(exists; MS2 wiki entry pending)_ | _missing — write `reference_system_viz_fs_coverage_ms2_2026_05_17` during drain_ | **READY FOR GOLF DRAIN** — patch-sibling at `state/shared/dashboards/patches/CLAUDE-MD-PATCH-system-viz-fs-coverage-ms2.md` (U-SAF-B2, slot charlie) |
| **FLEET-RESILIENCE-MS0** | `a942538d72` (5/19 15:29 U-FR-TRIGGER-STALL-DETECT) | _missing_ | _missing_ | NEEDS-SUMMARY + memory |
| **SYSTEM-SYNERGY-AUDIT** | `79a9462921` (5/19 16:07 U-HANDOFF-PRUNE) | _missing_ | _missing_ | NEEDS-SUMMARY + memory |
| **WIRE-UNWIRED-MS0** | multiple `U-WIRE-TOOL-CA*` 5/19 | _missing_ | _missing_ | NEEDS-SUMMARY when milestone closes |
| **INFRA-CONSENSUS-WIRE-MS0** | `ac907e31c4` (5/19 P0-U03) + `86337a35ce` (P0-U04) | _missing_ | _missing_ | NEEDS-SUMMARY when P0 series closes |
| **BACKEND-DEV-LOOP** | `cd17a3a62c` (5/19 U-LIMA-A1), `b69e66732f` (A5), `ef1a44f4a4` (A4) | _missing_ | _missing_ | NEEDS-SUMMARY (in-flight, lima chat) |
| **DOCKER-MCP-WIRE-MS0** | `f0467f2362` (5/19 juliett), `c43a7820ee`, `8edfebbfe1`, `8ca0b959e8` | _missing_ | [[reference_docker_mcp_wire_ms0_2026_05_19]] | NEEDS-SUMMARY |
| **SLOT-COMPACT-SYNERGY-MS0** | `85e282fe59` (5/19 U-WAVE...), multiple | _missing_ | _missing_ | NEEDS-SUMMARY when wave series closes |
| **BRIDGE-WIRING** | `b6da645f4c` (5/19 U-WIRE-TRILOBE-EL) | _missing_ | _missing_ | NEEDS-SUMMARY (bridge units in progress) |
| **AI-TRAINING-FIRST-MS0** | `75e6ad694e` (5/19 U-AITRAIN*) | _missing_ | _missing_ | NEEDS-SUMMARY (early-stage milestone) |
| **SLOT-RECLAIM** | `ed5c49044b` (5/19 14:25), `500b2b9907` (wiki entry 14:37) | [[slot-reclaim]] _(exists)_ | [[reference_slot_reclaim_2026_05_19]] | CLAUDE.md has 4 mentions — partial; consider full §SLOT-RECLAIM block |

## Already in CLAUDE.md (no action)

| Milestone / unit | Status |
|---|---|
| **COMMAND-KERNEL-MS0** | 1 mention in CLAUDE.md (U-CK* series) — partial coverage; consider full block when series closes |
| **KNOWLEDGE-CONVERSION-MS0** | Existing CLAUDE.md section + 7 forge-conversion sub-sections (P1..P7) |
| **U-MEMORY-COMPRESS-V2** | Wiki [[u-memory-compress-v2]] + memory [[reference_u_memory_compress_v2_2026_05_19]] — no CLAUDE.md block needed (single unit; full detail in wiki) |
| **FLEET-DOCTRINE-26** | Wiki [[fleet-doctrine-26]] + memory [[reference_fleet_doctrine_26_2026_05_19]] (this commit) — the sweep that landed itself |

## Operator workflow

1. **When closing a milestone:** if no CLAUDE.md section exists, add a row to this
   inbox with the commit SHA + planned wiki/memory entries.
2. **Golf drain pass (weekly cadence):** golf chat reads this inbox, batches the
   NEEDS-SUMMARY rows into full CLAUDE.md sections, removes the row.
3. **CLAUDE.md size discipline:** a milestone earns a CLAUDE.md block only when it
   meets one of: cross-cutting (touches 3+ subsystems), durable (≥30-day relevance),
   or operator-load-bearing (changes how chats interact with PRISM). Single-unit
   ships go in the wiki + memory, not CLAUDE.md.

## See also

- `## Recent regressions` block in CLAUDE.md — sister pattern, the same inbox idea
  for bug findings (this file is the same pattern for new feature/milestone ships).
- [[feedback_reflect_all_changes_post_update]] — 4-surface rule that defines when a
  change deserves CLAUDE.md vs only memory + wiki.
