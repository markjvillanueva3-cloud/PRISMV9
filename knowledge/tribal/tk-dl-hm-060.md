---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-060
title: AC Server mode: watch folder + batch mode for unattended runs
category: setup
domain: document_learned
knowledge_type: rule
confidence: 91
source: document:Running AC in Server
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "server", "batch-processing"]
material_groups: []
operation_types: []
content_hash: ea1134c6b27283d3ad18350039cc1f6b0ce9360f0af94a8aacb51cdbbeec840f
mirror_ts: 2026-05-05T13:36:01.206Z
mirror_engine: TribalVaultPopulatorEngine
---

# AC Server mode: watch folder + batch mode for unattended runs

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `91` · **Source:** `document:Running AC in Server`

## Tip

AUTOMATION Center can run as a server service using PWserverStart.exe. Configure via PWserver.exe: set watch folder (must be network-accessible to all clients), project number (script to execute), priority, and file type. Scripts MUST have no user interaction or the server will hang. Enable 'Batch mode' function in scripts to automatically skip all message boxes. Clients trigger execution via 'Start script on server' or by copying files to the watch folder.

## Related tips

- [[tk-dl-hm-061|Server-side calculation with separate project path]] _(category+tag:3)_
- [[tk-dl-hm-116|AC Basic Tutorial: complete automation script from unaligned part to NC code]] _(category+tag:2)_
- [[tk-dl-hm-119|AC Global Clearance Plane prevents calculation issues across setups]] _(category+tag:2)_
- [[tk-dl-hm-039|AUTOMATION Center hole feature recognition uses frame limits for auto job-list assignment]] _(category+tag:2)_
- [[tk-dl-hm-117|AC NCS orientation: two-face method for automatic part alignment]] _(category+tag:2)_

## Tags

#hypermill #automation-center #server #batch-processing
