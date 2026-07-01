---
description: Check if a file path was already read in this session before re-reading
allowed-tools: mcp__prism__prism_dev
---

# Read Dedup Check

Before issuing a Read tool call, query the FileReadDeduplicationEngine to find out if the same file (or a covering range) was already read in this session.

Saves tokens by reusing prior content instead of paying the read tax again.

## Usage
- `/read-dedup-check <path>` — check single file
- `/read-dedup-check <path> <offset> <limit>` — check partial range

## Action
Call `prism_dev` action `file_read_should_skip` with:
```json
{ "path": "<path>", "offset": <offset>, "limit": <limit>, "current_mtime_ms": <mtime> }
```

## Output
- `skip: true|false`
- `priorReadId`: ID of prior read that covers this range (if skip=true)
- `reason`: why skip|no_prior_read|file_modified

If `skip=true`, do NOT issue the Read — reuse content from earlier in the conversation.
