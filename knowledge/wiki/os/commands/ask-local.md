---
kind: command
slug: ask-local
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/ask-local.md
description: "Offload token-heavy work to a LOCAL Ollama model so it never enters the Claude context window. Use BEFORE reading a large file, searching the system-viz graph, explaining unfamiliar code, or triaging a build/error dump — the heavy input is processed in a subprocess and only a compact answer returns. Drastically cuts Claude token spend."
---

# /ask-local

Offload token-heavy work to a LOCAL Ollama model so it never enters the Claude context window. Use BEFORE reading a large file, searching the system-viz graph, explaining unfamiliar code, or triaging a build/error dump — the heavy input is processed in a subprocess and only a compact answer returns. Drastically cuts Claude token spend.

## Source command

See `.claude/commands/ask-local.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
