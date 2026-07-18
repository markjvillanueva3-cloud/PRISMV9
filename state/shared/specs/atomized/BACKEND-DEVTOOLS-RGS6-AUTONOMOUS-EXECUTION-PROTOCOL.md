---
title: BACKEND-DEVTOOLS-RGS6 — Autonomous Execution Protocol
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
applies_to_all: state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-2026-05-10.md
date: 2026-05-10
status: governs every atomized milestone file
overrides: none (additive)
existing_infrastructure_consumed:
  - state/shared/AGENT_WORKBOARD.md
  - state/shared/AGENT_CHAT.md
  - state/shared/AGENT_COORDINATION_STATUS.md
  - state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md
  - .claude/helpers/per-agent-handoff.mjs
  - .claude/helpers/stable-session-id.mjs
  - .claude/helpers/precompact-handoff.mjs
  - .claude/hooks/file-claim-guard.mjs
  - .claude/hooks/commit-ownership-guard.mjs
  - .claude/hooks/git-anti-clobber.mjs
  - .claude/hooks/enforce-handoff-topic.mjs
  - .claude/hooks/scrutinize-before-stop.mjs
  - mcp-server/data/claims/<unit>/claim.json (lock pattern)
---

# Autonomous Execution Protocol

> **Purpose.** Make BACKEND-DEVTOOLS-RGS6 self-executing across the 6-chat fleet. Every chat picks a named lane, claims its units, ships its commits, auto-compacts before context exhaustion, auto-writes handoffs at every session boundary, and registers auto-loops so the work continues without prompting.
>
> **What this is.** The execution layer over the 15 milestone atomization files. Every atomized unit inherits this protocol implicitly — no per-unit duplication.
>
> **What this is NOT.** A new workflow. Every primitive used here (file-claim, commit-ownership-guard, per-agent-handoff, conflict-fork-rule) already exists in PRISM. This document codifies how they compose for autonomous backend-devtools execution.

---

## §1 — Named Lane Allocation (6 lanes, deterministic mapping)

| Lane name | Chat-id pattern | Milestones claimed | Unit count | Tier mix |
|---|---|---|---|---|
| **lane-A-hooks-foundation** | `claude-*-hooks-foundation` | HOOK-SYNERGY-MS0 (8) + HOOKS-AUTOMATION-V2-MS0 (10) + AUTO-LEARNING-LOOP-MS0 (12) | 30 | T0 heavy |
| **lane-B-octopus-cost** | `claude-*-octopus-cost` | K2-CLOUD-MS0 (14) + OCTOPUS-NEURAL-MS0 (5) + COST-CASCADE-MS0 (8) | 27 | T1 |
| **lane-C-vault-knowledge** | `claude-*-vault-knowledge` | OBSIDIAN-COMPOUND-MS1 (6) + KNOWLEDGE-VAULT-MS0 (6) + WIKI-EVOLVE-MS0 (6) | 18 | T1 |
| **lane-D-html-surfaces** | `claude-*-html-surfaces` | HTML-COMPANION-MS0 (6) + HTML-PRIMARY-MS0 (7) + GRAPH-AS-LLM-CONTEXT-MS0 (8) | 21 | T1 |
| **lane-E-external-tools** | `claude-*-external-tools` | TOOL-INVENTORY-MS0 (10) + MACHINE-CONNECTIVITY-MS0 (6) + LOOP-MIGRATE-MS0 (5) | 21 | T1 |
| **lane-F-bridges** | `claude-*-bridges` | All 4 BUILD/WIRE splits + reclassifications + any orphan unit not above | ~6 | T1 |

**Hard rule:** a chat MUST set its lane on session start. Lane is encoded in the chat's handoff topic suffix (`HANDOFF-<chat-id>-<lane>.md`). The `enforce-handoff-topic.mjs` Stop hook already enforces this; it just needs the lane slug used consistently.

### 1.1 — Lane claim protocol

```bash
# At session start, every chat runs:
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
LANE="lane-A-hooks-foundation"   # picked from §1 table by the chat
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --agent "claude-${STABLE}" \
  --status active \
  --lane "$LANE" \
  --message "claiming $LANE for BACKEND-DEVTOOLS-RGS6"

# Write handoff with lane topic
node H:/prism/.claude/helpers/per-agent-handoff.mjs write \
  --source live-chat --terminal "$STABLE" --topic "$LANE" \
  --resume "Continue first unclaimed unit in $LANE per milestone atomization file" \
  --state "session started, lane claimed"
```

### 1.2 — Lane conflict resolution

Two chats picking same lane → second one observes via `AGENT_COORDINATION_STATUS.md` and picks a different lane OR forks to a sibling worktree with `lane-X-shadow` suffix.

---

## §2 — Commit Format (lane-scoped, conflict-proof)

Every commit on this roadmap MUST follow:

```
[<LANE>][<MILESTONE>]/<U-ID>: <one-line title>

<optional body>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Examples:
- `[lane-A-hooks-foundation][HOOKS-AUTOMATION-V2-MS0]/U-HKA01: read-once PreToolUse dedup hook`
- `[lane-B-octopus-cost][K2-CLOUD-MS0]/K2-K0: build KimiTransportEngine`
- `[lane-D-html-surfaces][HTML-PRIMARY-MS0]/U-HPS01: build SpecHTMLCompanionEngine`

### 2.1 — Why this prevents tainting

The `commit-ownership-guard.mjs` hook already inspects:
1. Files staged in the commit
2. Active file-claims by lane (from `mcp-server/data/claims/<unit>/claim.json`)
3. The `[<LANE>]` prefix in the commit message

If staged files include any file claimed by a DIFFERENT lane, the commit is BLOCKED. No retroactive cleanup needed.

### 2.2 — Pre-commit micro-protocol per unit

```bash
LANE="lane-A-hooks-foundation"
UNIT="U-HKA01"
MILESTONE="HOOKS-AUTOMATION-V2-MS0"

# 1. Claim every file you'll edit (before any Edit/Write)
for f in <files-to-edit>; do
  node H:/prism/.claude/scripts/claim-file.mjs --file "$f" --lane "$LANE" --unit "$UNIT" --ttl 600
done

# 2. Do the work (Edit/Write/Bash per atomized micro-steps)

# 3. Stage + commit with required format
git add <files>
git commit -m "[$LANE][$MILESTONE]/$UNIT: <title>"

# 4. Release claims (commit-ownership-guard does this automatically on success)
```

---

## §3 — Auto-Compaction Triggers (preserve context, prevent crash)

Repeated chat crashes in `last.md` show context exhaustion is real. Every chat auto-compacts BEFORE OOM, not after.

### 3.1 — Trigger thresholds

| Trigger | Threshold | Action |
|---|---|---|
| Context window | ≥ 75% of available | Pre-compact handoff + queue `/compact` |
| Unit count | After every 3 units shipped | Pre-compact handoff + queue `/compact` |
| Time-in-session | ≥ 90 minutes wall-clock | Pre-compact handoff + queue `/compact` |
| Tool-call count | ≥ 200 calls in session | Pre-compact handoff + queue `/compact` |
| Risky-op imminent | Before any 100+ file edit or full-suite rebuild | Pre-compact handoff + queue `/compact` |

### 3.2 — Pre-compact handoff protocol (existing helper)

```bash
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
LANE="lane-A-hooks-foundation"
NEXT_UNIT="U-HKA02"   # the next unit in this lane's atomization

node H:/prism/.claude/helpers/per-agent-handoff.mjs write \
  --source live-chat --terminal "$STABLE" --topic "$LANE" \
  --resume "Continue $LANE: next unit is $NEXT_UNIT. Read state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-<MILESTONE>-ATOMIZED-2026-05-10.md §$NEXT_UNIT and execute micro_steps." \
  --state "<3-bullet what was completed this session>"

# Arm the compact-pending guard so Stop hook can't exit without /compact
node H:/prism/.claude/hooks/precompact-pending-guard.mjs --mark
```

Then prompt the user: "Handoff written, run `/compact` to continue."

### 3.3 — Why this is autonomous

The trigger evaluation runs inside a UserPromptSubmit hook (`auto-compact-trigger.mjs` — to be added per U-HKA-AUTOCOMPACT, see §10 below). The hook injects a "you should compact now" suggestion into context when any threshold trips. The chat (Claude) then performs the handoff write + asks the user to /compact. The user only types `/compact`.

---

## §4 — Auto-Handoff at Session End (always, regardless of compact)

The `scrutinize-before-stop` Stop hook + `enforce-handoff-topic` + `stop_on_uncommitted_critical` already form the chain. We just enforce: every chat writes a fresh handoff on every Stop, with the `--topic <lane>` flag mandatory.

### 4.1 — Stop-time micro-protocol

```bash
# Stop hook fires this automatically:
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
LANE="<from session context>"

# 1. Write handoff with mandatory lane topic
node H:/prism/.claude/helpers/per-agent-handoff.mjs write \
  --source live-chat --terminal "$STABLE" --topic "$LANE" \
  --resume "<specific next unit>" \
  --state "<bullet completed list>"

# 2. Post to chat-bus
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --agent "claude-$STABLE" --status idle \
  --lane "$LANE" \
  --message "session ended in $LANE; resume: <next unit>"

# 3. Release any active file-claims
node H:/prism/.claude/scripts/release-claims.mjs --lane "$LANE"
```

Anti-tainting: claims released so peer lanes can read; commits are already lane-prefixed so no merge contamination.

---

## §5 — Auto-Loop Registry (recurring autonomous tasks)

Every milestone closes with `/loop` or `CronCreate` registration. The 17 loops/crons from the mega-roadmap §10 split into 3 cadences:

### 5.1 — High-frequency (every 15min - 1h)

| Cron | Source | Purpose |
|---|---|---|
| `*/15 * * * *` | U-ALL04 | Synergy classifier re-run |
| `*/30 * * * *` | U-ALL02 | Novelty scan |
| `*/30 * * * *` | U-HKA-VERIFY (new) | `verify-hook-refs.mjs` drift check |
| `7 * * * *` | U-GAC07 | Stale-graph guard |
| `13 * * * *` | U-ALL03 | Auto-research flush |
| `17 * * * *` | U-HPS02 | HTML twin regen |
| `27 * * * *` | U-ALL05 | Viz auto-augment |

### 5.2 — Medium-frequency (4h - 1d)

| Cron | Source | Purpose |
|---|---|---|
| `7 */4 * * *` | U-ALL01 | Reputable source sweep |
| `13 */6 * * *` | U-AUDIT-REENG (new) | `roadmap-engine-existence-check.mjs` |
| `3 9 * * *` | U-ALL09 | Daily auto-learning digest |

### 5.3 — Low-frequency (7d - 30d)

| /loop | Purpose |
|---|---|
| `/loop --interval 7d --max 4` | Backend-readiness scorer |
| `/loop --interval 7d --max 4` | `/forge-audit-v2 BACKEND-DEVTOOLS-RGS6` |
| `/loop --interval 7d --max 4` | Auto-learning rubric retune (U-ALL04) |
| `/loop --interval 7d --max 12` | Memory→wiki promotion (U-VAULT02) |
| `/loop --interval 30d --max 6` | `/forge-audit-v2` on this roadmap |
| `/loop --interval 30d --max 12` | Source-list audit (U-ALL11) |
| `CronCreate "3 9 * * 1"` | Monday weekly milestone-progress digest |

### 5.4 — Loop registration is per-lane

Each lane registers ITS loops at milestone close, not at global level. This prevents one chat from claiming all cron slots. Loop registry file: `state/shared/lane-loops.jsonl` (append-only, one entry per registration).

---

## §6 — Cross-Lane Conflict Prevention (existing primitives composed)

| Threat | Mitigation | Where enforced |
|---|---|---|
| 2 lanes edit same file | `file-claim-guard.mjs` PreToolUse hook BLOCKS write to peer-claimed file | `H:/prism/.claude/hooks/` |
| Commit with peer-claimed file staged | `commit-ownership-guard.mjs` PreToolUse on Bash matching `git commit` BLOCKS | same |
| Force-push over peer commits | `git-anti-clobber.mjs` BLOCKS | same |
| Handoff topic missing/wrong | `enforce-handoff-topic.mjs` Stop hook renames or BLOCKS | same |
| Two lanes claim same milestone | `agent-coordination.mjs post` warns; second lane forks to `-shadow` | helper |
| Stale claim (chat died) | `reap-stale-claims.mjs` cron every 5min auto-releases TTL-expired | cron |

**Zero new infrastructure.** Pure composition of existing hooks + helpers.

---

## §7 — Per-Atomized-Unit Augmentation (applies to all 15 files)

Every unit in every atomized file inherits these fields IMPLICITLY (no need to repeat per unit):

```yaml
inherited_from_protocol:
  required_lane: <see §1 table>
  required_commit_format: "[<LANE>][<MILESTONE>]/<U-ID>: <title>"
  pre_unit_claim:
    - tool: Bash
      command: node .claude/scripts/claim-file.mjs --file <each-file-edited> --lane $LANE --unit $UID --ttl 600
  post_unit_release: automatic via commit-ownership-guard
  auto_compact_check: after every 3 units
  auto_handoff_on_stop: mandatory, with --topic $LANE
  loop_inheritance: see §5 for lane-level cron/loop
  conflict_resolution:
    - peer_claim_observed: skip unit, pick next in lane
    - peer_commit_to_claimed_file: file-claim-guard blocks them; we proceed
    - merge conflict: conflict-fork-rule (fork to sibling worktree)
```

**This means: per-unit micro_steps in atomized files focus on the WORK. Lane discipline + auto-handoff + auto-compact are NOT repeated per unit — they're inherited.**

---

## §8 — Bootstrap (how a fresh chat onboards into autonomous mode)

```bash
# Step 1 — verify infrastructure
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$STABLE" 2>&1 | head -20

# Step 2 — pick lane (read AGENT_COORDINATION_STATUS for live state)
cat H:/prism/state/shared/AGENT_COORDINATION_STATUS.md | head -40

# Step 3 — claim lane (post to chat-bus per §1.1)

# Step 4 — read this protocol + the atomized file for the milestone(s) in your lane
ls H:/prism/state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-*.md

# Step 5 — execute units sequentially per atomization §micro_steps, respecting §7 inheritance
```

A low-class LLM following Steps 1-5 with the atomization file open can ship units autonomously.

---

## §9 — Termination conditions (when the autonomous fleet stops)

The fleet runs until ANY:

1. All 137 units shipped (success)
2. `state/shared/EMERGENCY_STOP.flag` exists (manual user override)
3. Adaptive-thresholds runaway (auto-detected via `/rgs6 self-optimize-audit`)
4. CLAUDE.md regression-count > 100 unfixed (quality cliff)
5. Backend-readiness scorer < 5% delta over 4 weeks (stalled)

On termination, the human-in-loop weekly review (U-ALL10) becomes the durable surface.

---

## §10 — Net-new units this protocol adds to the roadmap

| Unit ID | Lane | Purpose |
|---|---|---|
| **U-PROTO-AUTOCOMPACT** | lane-A | UserPromptSubmit hook `.claude/hooks/auto-compact-trigger.mjs` — evaluates §3.1 thresholds, suggests `/compact` when tripped |
| **U-PROTO-LANECLAIM** | lane-A | Script `scripts/claim-lane.mjs` — atomic lane-claim with conflict resolution |
| **U-PROTO-LANELOOPLEDGER** | lane-A | Append-only ledger `state/shared/lane-loops.jsonl` + helper `register-lane-loop.mjs` |
| **U-PROTO-AUDITLANE** | lane-F | Recurring `/loop --interval 24h` to audit lane assignments + reap stale claims |

These 4 are folded into lane-A and lane-F. **Total roadmap unit count: 137 + 4 = 141.**

---

## §11 — Failure modes for autonomous mode (10 enumerated)

| # | Failure | Mitigation |
|---|---|---|
| 1 | Chat dies between handoff-write and `/compact` → next chat reads stale handoff | precompact-pending-guard.mjs already prevents Stop without /compact for 30min |
| 2 | Lane abandoned (chat picks lane, dies) | `reap-stale-claims.mjs` releases TTL >30min; lane reclaimable by another chat |
| 3 | Cron oversubscribe (many lanes register overlapping crons) | lane-loops.jsonl is append-only; CronCreate dedupes by exact expression |
| 4 | Auto-compact fires mid-tool-call | trigger runs at UserPromptSubmit only, never mid-tool |
| 5 | Lane claims wrong milestone | §1 table is authoritative; deviation → audit-lane unit flags |
| 6 | Commit prefix missing `[<LANE>]` | commit-ownership-guard refuses commit |
| 7 | File-claim TTL expires mid-edit | claim-file.mjs auto-renews on every Edit/Write |
| 8 | Two lanes pick same `-shadow` suffix | shadow-suffix is `<lane>-shadow-<short-uuid>` |
| 9 | Auto-handoff overwrites peer handoff | per-agent-handoff.mjs uses stable-session-id, not PID; collisions impossible |
| 10 | Roadmap stalled at termination cliff | `/forge-audit-v2 BACKEND-DEVTOOLS-RGS6` 30d loop catches |

---

## §12 — Adversarial cases

- **Lane spoofing**: chat A commits with `[lane-B]` prefix to taint lane B's history. Mitigation: commit-ownership-guard cross-checks chat-id from session metadata vs declared lane.
- **Claim flooding**: one lane claims 1000 files to block others. Mitigation: max-claims-per-lane = 50 enforced in claim-file.mjs.
- **Handoff poisoning**: malicious handoff content induces next chat into wrong action. Mitigation: handoff content sanitized before injection into next-session context.
- **Cron storm**: one lane registers 100 crons. Mitigation: max-crons-per-lane = 8 enforced in register-lane-loop.mjs.

---

## §13 — Variability axis (full)

- **Lane count**: 1 (single-chat) / 3 (small fleet) / 6 (full fleet) / 9 (over-subscription with shadows)
- **Compact cadence**: every 1 / 3 / 5 / 10 units
- **Handoff verbosity**: minimal (resume directive only) / standard (3-bullet state) / full (everything from this session)
- **Loop cadence**: 15min / 1h / 6h / 24h / 7d / 30d (all 6 cadences exercised)
- **Conflict mode**: forbid (block second claimer) / fork (allow shadow) / share (auto-merge windows)

---

## §X — Closing

**This protocol IS the autonomous spine.** Every atomized milestone file inherits §7 implicitly. New chats onboard via §8. Termination is bounded by §9. Failure modes (§11) + adversarial cases (§12) covered by existing infrastructure.

**Net deltas to PRISM:**
- 4 new units (U-PROTO-*) → total roadmap 141 units
- 1 new hook (`.claude/hooks/auto-compact-trigger.mjs`)
- 1 new helper (`scripts/claim-lane.mjs`)
- 1 new ledger (`state/shared/lane-loops.jsonl`)
- 0 new doctrine — all primitives already exist

**The roadmap can now ship itself.**
