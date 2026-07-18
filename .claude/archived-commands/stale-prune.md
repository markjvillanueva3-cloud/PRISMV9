---
description: Identify conversation segments safe to drop before compaction
allowed-tools: mcp__prism__prism_dev
---

# Stale Prune

Run the ConversationStaleDetectorEngine to find conversation segments that can be safely dropped before compaction. Complements CompactionSurvivalEngine which scores what to KEEP — this finds what to DROP confidently.

## Usage
- `/stale-prune` — generate prune report

## What gets flagged
- Resolved errors (tool result that succeeded after a failure)
- Completed tasks (✓ marked, no recent reference)
- Failed explorations (no matches found, 0 results)
- Duplicate attempts (same operation repeated)
- Abandoned plans (superseded by a later approach)

## Keep signals (override drop)
- Canonical references (decisions, MUST/MANDATORY)
- User preferences
- Recently referenced topics
- Linked to active task

## Action
Call `prism_dev` action `stale_segment_prune` with empty params.

## Output
- Total segments tracked
- Droppable segments with reasons
- Estimated tokens saved
- Estimated retention rate after pruning
- Recommendations

Use this BEFORE `/compact` to reduce noise that would otherwise be lossy-summarized.
