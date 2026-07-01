# FORGE-AUDIT-V3-MS0/U-FAV3-SKILL — [MAIN] [FORGE-AUDIT-V3-MS0]/U-FAV3-SKILL+EXTRACTOR-WIRE (slot:alpha 2026-05-28): ship forge-audit-v3 skill + add H:/.claude/commands/ to extractor scan path

**Commit:** `0a75b193eedb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-28T15:17:40-05:00
**Tags:** forge-audit-v3-ms0, u-fav3-skill, auto-distilled

## Subject
[MAIN] [FORGE-AUDIT-V3-MS0]/U-FAV3-SKILL+EXTRACTOR-WIRE (slot:alpha 2026-05-28): ship forge-audit-v3 skill + add H:/.claude/commands/ to extractor scan path

## Body
```
[MAIN] [FORGE-AUDIT-V3-MS0]/U-FAV3-SKILL+EXTRACTOR-WIRE (slot:alpha 2026-05-28): ship forge-audit-v3 skill + add H:/.claude/commands/ to extractor scan path

Operator directive: "upgrade forge-audit to v3. the chat fleet are separate
chat windows, I dont treat them as agents. ensure when the chat fleet launches
and they start to build their galaxies, ensure they can take advantage of all
the new features".

## What ships

1. **forge-audit-v3 skill** at H:/.claude/commands/forge-audit-v3.md (NOT
   committed here — outside H:/prism repo). v3 upgrades vs v2:
   - Dynamic-workflows fanout (N=5/10/15 auto-sized; type "workflow" for
     Anthropic research-preview native fan-out)
   - Per-domain specialist routing (physics-review-agent for mill/lathe/wedm,
     wiring-review-agent for dispatcher work, etc.)
   - Octopus cross-vendor consensus arm via prism_ai:consensus_decide
   - PRISM-context preamble auto-injected into spawned subagents (slot,
     galaxy, soul refuses, wiki/tribal cross-refs)
   - Cost gate before N>5 fanout (AskUserQuestion confirmation)
   - Token-spend ledger at state/shared/forge-audit-v3-spend-ledger.jsonl
   - PRISM substrate awareness section listing 7 categories of post-v2
     infrastructure (master-index, galaxy doctrine, closed-loop, skill
     auto-invoke, hooks, octopus, per-slot infra, recent milestones, quality
     gates) the audit MUST query in preflight

2. **scripts/extract-skill-triggers.mjs**: add H:/.claude/commands/ as a
   PRE-precedence SKILL_DIRS entry. Fixes silent skill-gap: skills authored
   at H:/.claude/commands/ (the canonical user-globals path per the c-to-h
   mirror rule) were silently ignored by the extractor → never reached
   _skill-triggers.jsonl → skill-auto-trigger.mjs never fired them → no
   INVOKE_NOW directive. forge-audit-v3 hit this gap on first ship — fix
   applies to all H:-authored skills going forward.

3. **.claude/hooks/skill-auto-trigger.mjs**: forge-audit-v3 added to
   INVOKE_NOW_SKILLS (now 18 entries).

4. **_skill-triggers.jsonl**: regenerated. forge-audit-v3 has 11 invoke
   trigger rows (forge-audit-v3, audit-v3, deep audit, fleet audit, galaxy
   audit, audit all, fanout audit, workflow audit, scope all, 10 parallel
   agents, parallel agents to scope) all action="invoke" score=0.85.

## Codex CLI MCP fix (operational, no commit content)

claude mcp list previously showed codex as ✗ Failed to connect. Root cause:
H:\.claude\bin\codex is a bash shim (Unicode text), not a Windows .exe — the
MCP server couldn't spawn it. Re-registered with the canonical Windows
install at C:\Users\wompu\AppData\Local\OpenAI\Codex\bin\codex.exe. Now
✓ Connected. Codex CLI itself was always logged in via ChatGPT
(`codex --version` confirmed).

## Reviewer-pass on this commit

Per /forge-audit-v3 doctrine: dispatched the 10-agent final-audit fanout
concurrently with this commit. Per operator clarification: any units that
fanout suggests for distribution to slot chats will APPEND to slot queues,
NOT supersede existing tasks. Distribution will land as a discoverable
catalog at state/shared/specs/FLEET-EXPANSION-PLAN-2026-05-28.md when
agents return.
```

## Files touched (4)
- .../wiki/architecture/.skill-triggers-fingerprint  |   2 +-
- knowledge/wiki/architecture/_skill-triggers.jsonl  | 783 +++++++++++----------
- scripts/extract-skill-triggers.mjs                 |  11 +-
- 3 files changed, 408 insertions(+), 388 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a75b193eedb`
- Milestone envelope: `mcp-server/data/milestones/FORGE-AUDIT-V3-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._