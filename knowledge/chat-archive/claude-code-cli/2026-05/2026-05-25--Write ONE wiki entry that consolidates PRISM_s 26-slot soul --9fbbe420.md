---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Write ONE wiki entry that consolidates PRISM's 26-slot soul registry into a sing"
date: "2026-05-25"
first_ts: "2026-05-25T01:46:58.226Z"
last_ts: "2026-05-25T02:02:58.764Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-afd3dbabb5ca5e9d6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Write ONE wiki entry that consolidates PRISM's 26-slot soul registry into a sing

> **claude-code-cli** | 2026-05-25 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-afd3dbabb5ca5e9d6.jsonl`

## Transcript

### User | 2026-05-25T01:46:58.226Z

Write ONE wiki entry that consolidates PRISM's 26-slot soul registry into a single canonical reference. The audit found soul content is scattered across 3 wiki files + 1 memory; no single `slot-souls-registry.md` exists.

STEP 1 — Read the scattered soul source (read-only, ≤5 tool calls):

1. Read `H:/prism/.claude/hooks/slot-soul-inject.mjs` (if it exists) — the hook that surfaces a slot's soul on UserPromptSubmit. Determines where soul data lives.
2. Grep for the existing soul files:
```bash
ls H:/prism/knowledge/ -R 2>&1 | grep -iE "(soul|hermes)" | head -20
```
3. Read 2-3 of the soul-related files (e.g. `stop-fleet-soul-graduation.md`, `stop-soul-evolution.md`, `reference_zpsn02_souls_filled_2026_05_23.md`) to understand the existing structure.
4. Glob the actual slot list — confirm 26 slots (alpha..zulu) per `H:/prism/.claude/helpers/chat-slots.mjs` SLOT_NAMES array.

STEP 2 — Write ONE file:

**File**: `H:/prism-slot-golf/knowledge/wiki/architecture/slot-souls-registry.md`

This is the canonical single-source registry. Format:

```markdown
---
title: Slot Souls Registry — 26-slot NATO fleet
type: architecture
date: 2026-05-24
slot: golf
status: living
schema_version: 1.0.0
---

# Slot Souls Registry — 26-slot NATO fleet

The PRISM fleet runs up to 26 concurrent Claude chat slots (alpha..zulu per the NATO phonetic alphabet, SLOT_NAMES in `.claude/helpers/chat-slots.mjs`). Each slot has a **soul** — a frontmatter+markdown personality layer (Hermes-style) that gets surfaced to that slot's running chat via the `slot-soul-inject.mjs` UserPromptSubmit hook.

This is the canonical registry. Before this entry, soul content was scattered across:
- `H:/prism/.claude/hooks/slot-soul-inject.mjs` (the injector)
- `knowledge/wiki/architecture/skills/project/stop-fleet-soul-graduation.md`
- `knowledge/wiki/architecture/skills/project/stop-soul-evolution.md`
- `knowledge/memories/reference/reference_zpsn02_souls_filled_2026_05_23.md` (24 souls filled batch)

## How souls wor
... [+3160 chars truncated]

### Assistant | 2026-05-25T01:47:17.418Z

I'll start by reading the source files to understand the soul data structure before writing the registry.

### Assistant | 2026-05-25T01:47:17.821Z

[tool_use: Read]

### Assistant | 2026-05-25T01:47:18.337Z

[tool_use: Bash]

### User | 2026-05-25T01:47:36.205Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MS0 / U-HERMES02 — slot-soul-inject UserPromptSubmit hook.
4	// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
5	// frontmatter + voice/behavior sections as additionalContext on every prompt.
6	// Keeps each slot's "Hermes personality" consistent across /compact + reload.
7	//
8	// Safety: never throws (UserPromptSubmit mus
... [+4601 chars truncated]

### User | 2026-05-25T01:50:51.522Z

[tool_result] reference_hermes_evolving_skills_gap_2026_05_17.md  4.4K
reference_hermes_capability_expansion_ms0_2026_05_24.md  7.1K
reference_hermes_evolving_skills_gap_2026_05_17.md  4.4K
reference_hermes_mcp_plugin_inventory_ms0_2026_05_24.md  6.4K
reference_hermes_memory_vault_ms0_2026_05_23.md  4.5K
reference_hermes_psn_rag_synergy_research_2026_05_23.md  6.0K
reference_hermes_zebra_ms0_2026_05_20.md  7.0K
... [+605 chars truncated]

### Assistant | 2026-05-25T01:50:55.222Z

Now let me read the actual soul files and the related wiki entries to get the real data.

### Assistant | 2026-05-25T01:50:56.428Z

[tool_use: Bash]

### Assistant | 2026-05-25T01:50:56.699Z

[tool_use: Read]

### User | 2026-05-25T01:51:16.163Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-25T01:53:01.789Z

[tool_result] README.md  2.8K
alpha.md  2.4K
bravo.md  1.8K
charlie.md  1.9K
delta.md  1.8K
echo.md  2.0K
foxtrot.md  2.0K
golf.md  1.7K
hotel.md  1.9K
india.md  2.1K
juliett.md  2.0K
kilo.md  2.0K
lima.md  1.9K
mike.md  1.6K
november.md  1.2K
oscar.md  1.1K
papa.md  794B
quebec.md  802B
romeo.md  798B
sierra.md  802B
tango.md  798B
uniform.md  806B
victor.md  802B
whiskey.md  806B
xray.md  794B
yankee.md  802B
... [+29 chars truncated]

### Assistant | 2026-05-25T01:53:05.846Z

Good — all 26 soul files exist. Now let me read a sample of them to get the actual frontmatter schema and content, plus the stop-soul-evolution wiki entry.

### Assistant | 2026-05-25T01:53:07.309Z

[tool_use: Bash]

### Assistant | 2026-05-25T01:53:07.610Z

[tool_use: Read]

### User | 2026-05-25T01:57:18.661Z

[tool_result] === alpha ===
---
slot: alpha
role: mill-specialist
voice: physics-first
tone: rigorous
escalation_path: validate-kc-taylor-constants-before-edit; defer-safety-to-physics-reviewer
refuse_list:
  - inline-physics-constants
  - stub-engine-creation
  - softening-safety-thresholds
[35 more lines]
=== bravo ===
---
slot: bravo
role: mill-specialist
voice: physics-first
tone: rigorous
escalation_path: 
... [+6433 chars truncated]

### User | 2026-05-25T01:57:21.844Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### Assistant | 2026-05-25T01:57:30.020Z

I have all 26 soul files' frontmatter. Let me now check the wiki path for the stop-soul files and the reference memory, then read the full soul files for the specialized slots.

### Assistant | 2026-05-25T01:57:30.774Z

[tool_use: Bash]

### Assistant | 2026-05-25T01:57:31.803Z

[tool_use: Read]

### User | 2026-05-25T01:57:51.562Z

[tool_result] 1	---
2	name: reference_zpsn02_souls_filled_2026_05_23
3	description: "U-ZPSN02 (2026-05-23 slot bravo iter1) — 24 missing slot-souls authored; zebra-awareness-index slotCount 3→27; composeSendKeysText emits [psn:...] for all 27 slots end-to-end; closed-loop value still gated on U-ZPSN03 target-side parser"
4	aliases: reference_zpsn02_souls_filled_2026_05_23
5	type: reference
6	source: prism-memor
... [+7003 chars truncated]

### User | 2026-05-25T01:59:32.924Z

[tool_result] H:/prism/knowledge/wiki/architecture/hermes-evolving-skills-gap-2026-05-17.md
H:/prism/knowledge/wiki/architecture/hermes-zebra-integration.md
H:/prism/knowledge/wiki/architecture/hooks/runtime/slot-soul-inject.md
H:/prism/knowledge/wiki/architecture/hooks/runtime/stop-fleet-soul-graduation.md
H:/prism/knowledge/wiki/architecture/hooks/runtime/stop-soul-evolution.md
H:/prism/knowledge/wiki/archite
... [+1257 chars truncated]

### Assistant | 2026-05-25T01:59:36.816Z

I have everything I need. Now let me read the stop-soul-evolution and stop-fleet-soul-graduation files to complete the cross-references, then write the registry.

### Assistant | 2026-05-25T01:59:37.593Z

[tool_use: Read]

### Assistant | 2026-05-25T01:59:37.717Z

[tool_use: Read]

### User | 2026-05-25T01:59:56.552Z

[tool_result] 1	---
2	title: Hook — stop-fleet-soul-graduation
3	type: hook
4	hook_name: stop-fleet-soul-graduation
5	hook_source: runtime
6	source_path: H:/prism/.claude/hooks/stop-fleet-soul-graduation.mjs
7	events: [Stop]
8	generated_by: scripts/generate-hook-wiki.mjs
9	last_verified: 2026-05-23
10	tags: [hook, source-runtime, event-stop]
11	related:
12	  - knowledge/wiki/architecture/layer-l6.md
13	---
14	

... [+927 chars truncated]

### User | 2026-05-25T01:59:56.988Z

[tool_result] 1	---
2	title: Hook — stop-soul-evolution
3	type: hook
4	hook_name: stop-soul-evolution
5	hook_source: runtime
6	source_path: H:/prism/.claude/hooks/stop-soul-evolution.mjs
7	events: [Stop]
8	generated_by: scripts/generate-hook-wiki.mjs
9	last_verified: 2026-05-23
10	tags: [hook, source-runtime, event-stop]
11	related:
12	  - knowledge/wiki/architecture/layer-l6.md
13	---
14	
15	# Hook — `stop-sou
... [+892 chars truncated]

### Assistant | 2026-05-25T02:00:04.678Z

I have all the data I need. Now I'll confirm the target directory exists and write the registry.

### Assistant | 2026-05-25T02:00:05.354Z

[tool_use: Bash]

### User | 2026-05-25T02:01:10.360Z

[tool_result] actions/
algorithms/
combos/
courses/
datacat/
diagrams/
engines/
extracts/
formulas/
frontends/

### Assistant | 2026-05-25T02:01:13.513Z

Good — the directory exists. Now I'll write the registry file.

### Assistant | 2026-05-25T02:02:24.365Z

[tool_use: Write]

### User | 2026-05-25T02:02:45.462Z

[tool_result] File created successfully at: H:/prism-slot-golf/knowledge/wiki/architecture/slot-souls-registry.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:02:58.764Z

File written successfully.

**File:** `H:/prism-slot-golf/knowledge/wiki/architecture/slot-souls-registry.md`
**Line count:** 182 lines

**Soul population breakdown (26 slots):**

- 13 slots with fully specialized souls (real frontmatter + domain-specific refuse_list, voice, escalation):
  alpha, bravo, charlie, delta, echo, foxtrot, hotel, india, juliett, kilo, lima, mike, zebra

- 1 slot with a customized soul (full-stack hermes_role, hygiene-aware):
  golf

- 12 slots with generic work souls (direct/balanced/any, populated in the U-ZPSN02 batch fill):
  november, oscar, papa, quebec, romeo, sierra, tango, uniform, victor, whiskey, xray, yankee, zulu

**All 26 slots populated with actual soul data** — zero left as "(default)" because all 26 soul files exist in `state/shared/slot-souls/` and were read directly. The 13 generic slots are documented accurately as `role: work` / `domain_filter: any` with `hermes_role: work`, which is their real content, not a placeholder.

Key findings surfaced and documented:

- Soul files live at `state/shared/slot-souls/<slot>.md` (not `knowledge/wiki/slot-souls/` as an earlier stale wiki note claimed — that path does not exist)
- The inject hook reads via `SOULS_DIR = path.join(PRISM_ROOT, "state/shared/slot-souls")` — confirmed from source
- Alpha/bravo both carry `mill-specialist` souls (R7 conflict preserved and documented with routing precedence rule)
- The golf-slot write-allowlist blocks soul edits from golf itself — noted under "Updating souls"
- Both Stop hooks (`stop-fleet-soul-graduation`, `stop-soul-evolution`) are auto-generated wiki stubs with no header docblock; source files are the behavior authority
