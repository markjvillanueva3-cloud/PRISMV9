---
title: "feedback-psk-kernel"
name: feedback-psk-kernel
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_psk_kernel.md
promoted_at: 2026-06-06T04:55:51.028Z
source_refs: 8
---

# PSK — PRISM Syscall Kernel (canonical definition)

**PSK ≡ PRISM Syscall Kernel.** A single fail-soft CLI dispatcher (`.claude/kernel/psk.mjs`) exposing 10 canonical syscalls that the lifecycle slash-commands (`/startup`, `/checkin`, `/handoff`, `/pick-unit`, `/precompact`) compose. Wired to MCP via `prism_session:psk`. Doctrine pointer — same orphan-pattern fix as [[feedback_psn_definition]] and [[feedback_r5_thru_r12_doctrine]].

## The 10 syscalls (frozen in U-CK01 envelope)

| Syscall | Purpose | Real / Shell |
|---|---|---|
| `whoami` | sessionId / slot / branch / repoRoot / worktree / topic / userClaudeDir / memoryPath | REAL (U-CK02 extended shell) |
| `manifest` | engine / dispatcher / hook / skill counts (live from PRISM-INVENTORY-LATEST.md) | REAL |
| `position` | build / svi / drift / buildState (reads BUILD_STATE.json + roadmap-drift-report.json + MILESTONE_PROGRESS.json) | REAL |
| `delta` | per-session diff vs last checkpoint | REAL (U-CK02 wired SessionDelta) |
| `tools` | dispatcher / skill catalog with filter (fuses dispatcher_map_compact + _skill-triggers.jsonl) | REAL |
| `pick` | delegates to `scripts/pick-unit.mjs` (passes flags, forces `--json`) | REAL |
| `checkin` | delegates to `.claude/helpers/chat-slots.mjs` (`current` is default subcommand) | REAL |
| `handoff` | delegates to `.claude/helpers/per-agent-handoff.mjs` (pipes session_id via stdin, terminal whitelist `/^[a-zA-Z0-9._@-]{1,64}$/`) | REAL |
| `record` | appends telemetry to `state/shared/pipeline-telemetry.jsonl` (capped 256/8KB per field, `PRISM_TELEMETRY_PATH` override) | REAL — feeds CK27/28/29 |
| `recommend` | surface SlashCommandRecommenderEngine (closed feedback loop) | Shell (U-CK15+) |

## Fail-soft invariant

Every syscall returns `{ok, syscall, result|error, degraded?, fallback?, note?}` on every path. Never throws past `dispatch()`. Engine-unreachable → `ok:false` with structured `errorCode` (e.g. `ERR_UNKNOWN_SYSCALL`), never a process crash. Same pattern as the auto-consensus-sync-bash hook ([[reference_graph_octopus_autowire_ms0_2026_05_22]] §C2).

## MCP wiring

`sessionDispatcher.ts` case at the `psk` action. `fs.existsSync` gate on `psk.mjs` path produces an operator-readable error if the kernel is missing. Dynamic ESM import via `pathToFileURL(...).href` (Windows-safe). `FLAT_FORWARD_KEYS` (25 keys) merges flat top-level params into `syscallParams` — nested wins on collision. Schema: `psk: z.object({syscall:z.string().min(1), params:z.record(z.string(),z.unknown()).optional()}).passthrough()`.

## How lifecycle commands compose PSK

- `/startup` reads `psk whoami` + `psk position` to anchor the session and surface drift.
- `/checkin` calls `psk checkin` (chat-slots) + `psk record` (heartbeat telemetry).
- `/handoff` calls `psk handoff` (per-agent-handoff write/read).
- `/pick-unit` calls `psk pick` (filter peer-claimed units).
- `/precompact` calls `psk record` for the compaction-survival event.
- Every PostToolUse:Skill matcher (U-CK26-PRODUCER, [[reference_u_ck26_producer_2026_05_19]]) spawns `psk record --event=command_invoked` fire-and-forget.

## Why this memory exists

PSK was buried inside U-CK01/U-CK26 reference memories — no first-class doctrine entry. The auto-injectors (`master-index-precheck-inject`, `memory-relevance-inject`) only surface `[L8/built] session:psk` / `[L8/built] COMMAND-KERNEL-MS0/U-CK02` graph hits — operator never gets the *composition* picture of how lifecycle commands USE the kernel. Same orphan-pattern fix as [[feedback_psn_definition]]: promote the doctrine concept to a named memory so future sessions inherit it via top-K relevance match.

## Standing rule

- When you see a lifecycle slash-command in this repo, assume it composes PSK syscalls — read `psk.mjs` (or `psk --help`) rather than re-deriving the orchestration.
- Before writing a new lifecycle helper, check if a `psk` syscall already covers it (R8 — read before you write, [[feedback_r5_thru_r12_doctrine]]).
- `psk record` is the canonical telemetry write path — never bypass it for direct jsonl appends (forks the DoS-clamp + fallback, see [[reference_u_ck26_producer_2026_05_19]] §3).

## Cross-refs

- [[feedback_psn_definition]] — orphan-promotion sibling (PSN is the network; PSK is the syscall layer)
- [[reference_u_ck01_ship]] — PSK ship + 24-test contract
- [[reference_u_ck26_producer_2026_05_19]] — `psk record` producer hook closing the ghost-orphan class
- [[reference_r5_thru_r12_doctrine]] — R8 read-before-write applies to PSK syscalls
- [[feedback_karpathy_discipline]] — fail-soft is R12 fail-loud applied at the kernel boundary

## Source

Promoted from memory [[feedback_psk_kernel]] (referenced 8x across the vault). The memory remains the editable source of truth.
