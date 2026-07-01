---
description: Manually trigger a session reorientation brief (no compaction)
allowed-tools: mcp__prism__prism_dev
---

# Reorient

Generate a reorientation brief for the current session. Surfaces:
- Current objective
- Active files (recently touched)
- Recent decisions with rationale
- Open todos / milestones
- Resolved errors (so we don't loop)
- Topic drift warning if detected

This is like a compaction handoff — but **nothing is dropped from history**.
The brief is just an in-context refresh of attention.

## Usage
- `/reorient` — generate brief now
- `/reorient should` — check if a brief is needed (without generating)
- `/reorient stats` — show session anchor stats

## Actions
- `prism_dev:reorient_generate_brief` — generate brief
- `prism_dev:reorient_should_generate` — check thresholds
- `prism_dev:reorient_stats` — return counters

## Recording anchors during work
Other hooks/tools record anchors automatically:
- File edits → `file_modified` anchor
- Errors that get fixed → `error_resolved` anchor
- Task starts → `task_anchor` anchor

You can manually record via `prism_dev:reorient_record_anchor`:
- type: `task_anchor | decision | file_modified | error_resolved | milestone | user_directive`
- summary: <= 200 chars
- rationale: optional why
- files: optional list of affected files
- importance: 1-10 (defaults by type)

## When auto-injection fires
The `session-reorient-inject.mjs` UserPromptSubmit hook auto-fires when:
- 15+ prompts since last brief
- 50+ tool calls since last brief
- Topic drift detected (tag overlap < 30%)

Tune via `prism_dev:reorient_update_config`.
