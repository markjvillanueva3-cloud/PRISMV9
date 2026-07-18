---
description: Deterministic next-unit picker (devtools-first, revenue-second) via the psk kernel. Subtracts shipped units, returns top-N with spec paths + a research pack.
allowed-tools: Bash, Read
composes_with:
  - "/awareness-snapshot"
  - "/broadcast"
  - "/checkin"
  - "/dedup"
  - "/master-index"
  - "/orphan-inventory"
  - "/system-viz"
consumes:
  - "prism_session:master_index_query"
---
# /pick-unit — pick the next unit deterministically via psk

Reads `state/shared/atomic-roadmap.json` + `MILESTONE_PROGRESS.json` and ranks
the next units to ship — devtools-first (`roadmap_priority === 0`), revenue
second. The psk `pick` syscall delegates to `scripts/pick-unit.mjs`, which owns
the live shipped-unit subtraction + slot-aware filtering + per-pick research
pack.

## Invocation

```bash
node H:/prism/.claude/kernel/psk.mjs pick --pretty                     # top picks for THIS chat's slot
node H:/prism/.claude/kernel/psk.mjs pick --pretty --slot bravo        # explicit slot
node H:/prism/.claude/kernel/psk.mjs pick --pretty --priority revenue  # revenue-only
node H:/prism/.claude/kernel/psk.mjs pick --pretty --priority any      # both roadmaps, devtools still wins ranking
node H:/prism/.claude/kernel/psk.mjs pick --pretty --tier 0            # tier-0 only
node H:/prism/.claude/kernel/psk.mjs pick --pretty --limit 1           # top recommendation only
```

Pass-through flags whitelisted in psk: `slot`, `priority`, `tier`, `limit`,
`chatId`, `noClaimFilter`. Re-runs always read live state — two chats hitting
the same lane get the same answer.

## Output shape

Ranked list of `{unit_id, milestone, title, spec_path, depends_on, effort,
research[]}`. `research[]` is the **research-before-claiming pack** — concrete
commands in order: `/system-viz` → `system-viz-query find` → `…blast-radius` →
`prism_session:master_index_query` → `/awareness-snapshot` → `/orphan-inventory`
→ `/dedup`. Devtools lane exhausted? `--priority revenue` (see
[[feedback_prioritize_devtools_backend]]).

## Manual fallback (if psk is unavailable)

```bash
node H:/prism/scripts/pick-unit.mjs --json
```

— Hand-tuned 2026-05-19, COMMAND-KERNEL-MS0/U-CK09 (thin psk client; was 132 lines).
