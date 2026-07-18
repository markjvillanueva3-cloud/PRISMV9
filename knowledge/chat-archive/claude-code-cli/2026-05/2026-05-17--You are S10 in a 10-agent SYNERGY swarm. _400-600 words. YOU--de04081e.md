---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "You are S10 in a 10-agent SYNERGY swarm. ~400-600 words. YOUR AXIS: **Per-unit s"
date: "2026-05-17"
first_ts: "2026-05-17T05:04:38.158Z"
last_ts: "2026-05-17T05:05:46.623Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a9a0207c1994407b0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# You are S10 in a 10-agent SYNERGY swarm. ~400-600 words. YOUR AXIS: **Per-unit s

> **claude-code-cli** | 2026-05-17 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a9a0207c1994407b0.jsonl`

## Transcript

### User | 2026-05-17T05:04:38.158Z

You are S10 in a 10-agent SYNERGY swarm. ~400-600 words.

YOUR AXIS: **Per-unit spec auto-generator — META: how to auto-generate `state/shared/specs/UNITS/<unit_id>.md` from V1 allocation rows**

V1 allocation file (`state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`) §3 + §4 has 17 units with: owner-slot, wave, cost, tool plan, activate/build lists. To make the plan CLEAR-NOT-COMPACT-ready, each unit needs a stand-alone spec at `state/shared/specs/UNITS/<unit_id>.md` that a fresh chat can read cold.

PROTOCOL:
1. Verify `state/shared/specs/UNITS/` directory exists; count any existing files (Glob)
2. Design the per-unit spec template:
   - frontmatter: `unit_id`, `milestone`, `owner_slot`, `wave`, `cost`, `status` (pending/in_progress/shipped), `peer_claims_check_at`
   - body sections: **Goal** | **Activate (do-not-build)** | **Build (net-new)** | **Files-touched** | **Pre-flight** | **Test plan** | **Wiring** | **Test-shipped-criteria** | **Rollback** | **References**
3. Propose generator `scripts/generate-unit-specs.mjs --from <V1-allocation-file> --out state/shared/specs/UNITS/` — parses §3 + §4 of V1; emits one spec per unit
4. Integration with RGS: each generated spec sets a tool-plan reference; RGS can ingest via S9 unit
5. Integration with /pick-unit: `pick-unit-* --reads-spec` flag injects the spec body when claim activates
6. Idempotency: rerun generator → regenerates without clobbering operator-edits (preserve `<!-- operator-edit -->` blocks)

ALSO: if the spec dir is empty AND I (juliett) have time to write 5 inline now (W0+W1 units) for the highest-priority bootstrap — that closes the V1 CLEAR-readiness gap immediately. Recommend which 5.

Return:
```
## S10 — Per-unit specs dir state
- exists: <yes|no>
- file count: <N>

## S10 — Per-unit spec template
- frontmatter fields: <list>
- body sections: <list, 10 named above>
- size target: <≤200 lines per spec>

## S10 — Generator script design
- file: scripts/generate-unit-specs.mjs
- inputs: 
... [+651 chars truncated]

### Assistant | 2026-05-17T05:04:45.617Z

I'll verify the per-unit specs directory state and design the generator.

### Assistant | 2026-05-17T05:04:47.272Z

[tool_use: Bash]

### Assistant | 2026-05-17T05:04:47.739Z

[tool_use: Glob]

### Assistant | 2026-05-17T05:04:48.408Z

[tool_use: Bash]

### User | 2026-05-17T05:04:56.021Z

[tool_result] ls: cannot access 'H:/prism/state/shared/specs/UNITS/': No such file or directory
---COUNT---
0

### User | 2026-05-17T05:04:57.399Z

[tool_result] 2026-05-09-U-DOCKER-HOOK-BROKER.html
2026-05-09-U-DOCKER-HOOK-BROKER.html.hash
2026-05-09-U-DOCKER-HOOK-BROKER.md
2026-05-09-U-FORGE-AUDIT-OMNISCIENT.html
2026-05-09-U-FORGE-AUDIT-OMNISCIENT.html.hash
2026-05-09-U-FORGE-AUDIT-OMNISCIENT.md
2026-05-09-prism-stabilization-design.html
2026-05-09-prism-stabilization-design.html.hash
2026-05-09-prism-stabilization-design.md
2026-05-09-prism-stabilizati
... [+875 chars truncated]

### User | 2026-05-17T05:04:58.872Z

[tool_result] No files found

### Assistant | 2026-05-17T05:05:03.394Z

[tool_use: Bash]

### User | 2026-05-17T05:05:09.060Z

[tool_result] H:/prism/state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md
---
pick-unit.mjs*
verify-unit-ready.mjs*
verify-unit-ready.test.mjs

### Assistant | 2026-05-17T05:05:46.623Z

Good. V1 allocation exists. UNITS/ dir does NOT exist. No generator yet. Returning findings.

## S10 — Per-unit specs dir state
- exists: **no** (`state/shared/specs/UNITS/` not created)
- file count: **0**
- parent `state/shared/specs/` exists with 30+ audit/spec siblings (none match `UNITS/<unit_id>.md` convention)
- no existing generator script (`scripts/generate-unit-specs.mjs` absent); only siblings are `pick-unit.mjs` + `verify-unit-ready.mjs`

## S10 — Per-unit spec template
- **frontmatter fields:** `unit_id`, `milestone`, `owner_slot`, `wave` (W0/W1/W2), `cost` (S/M/L), `status` (pending/in_progress/shipped), `peer_claims_check_at`, `tool_plan_ref`, `depends_on` (array), `unblocks` (array), `roi_score`, `generated_at`, `generator_version`
- **body sections** (10):
  1. **Goal** — 1-sentence intent + acceptance condition
  2. **Activate (do-not-build)** — existing engines/hooks/scripts to wire, NOT recreate (per `feedback_dont_wire_for_wiring_sake_2026_05_16`)
  3. **Build (net-new)** — only what doesn't exist; cite `master_index_query` to prove absence
  4. **Files-touched** — explicit absolute paths (write + read); flags peer-collision risk
  5. **Pre-flight** — `/dedup` + `master_index_query` + `slot-task-claim check` + tool-plan freshness check
  6. **Test plan** — real-value assertions per Karpathy R9; lists vitest/node:test commands
  7. **Wiring** — dispatcher action(s) + hook registrations + settings.json splice points
  8. **Test-shipped-criteria** — concrete pass conditions; what `/verify-unit-ready` must return
  9. **Rollback** — `git revert <sha>` recipe + hook disable knob + reversibility per `feedback_never_delete_only_disable`
  10. **References** — wiki links, memory `[[slug]]`, prior commits, peer-claim history
- **size target:** ≤200 lines per spec (matches CLAUDE.md compliance ceiling pattern)

## S10 — Generator script design
- **file:** `scripts/generate-unit-specs.mjs`
- **inputs:** V1 allocation `.md` (parse §3 wave table + §4 per-uni
... [+3199 chars truncated]
