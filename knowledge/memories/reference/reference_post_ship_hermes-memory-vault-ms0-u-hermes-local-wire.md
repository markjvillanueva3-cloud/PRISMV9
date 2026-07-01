---
name: reference_post_ship_hermes-memory-vault-ms0-u-hermes-local-wire
description: Auto-distilled learnings from shipping HERMES-MEMORY-VAULT-MS0/U-HERMES-LOCAL-WIRE (commit c988a21ec). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.888Z
aliases: reference_post_ship_hermes-memory-vault-ms0-u-hermes-local-wire
---


# HERMES-MEMORY-VAULT-MS0/U-HERMES-LOCAL-WIRE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-WIRE (slot:bravo): the SAFE final wiring step — point Hermes at a local Ollama model with no risk of the boot-loop a blind config edit caused before. wire-hermes-local-backend.mjs: (1) GUARD refuses to apply unless the target model is actually pulled (an absent model breaks startup); (2) BACKUP config.yaml -> .bak-<ts>; (3) TARGETED anchored-regex patch of ONLY model.default/provider/base_url (no YAML reserialize that could mangle the file); (4) BOOT-VERIFY by probing the Hermes Web UI + AUTO-ROLLBACK if it doesn't come up in 60s (Hermes can never be left broken). DRY-RUN by default; --apply actuates; --rollback restores. Dry-run vs the live config produces the exact patch (opus-4-8/anthropic -> qwen3-coder:30b/openai/127.0.0.1:11434/v1). patchModelBlock pure + tested (escapes quotes, refuses half-patch, ignores same-named keys at other indents). +10 tests green. Qwen3-Coder 30B (64K-native workhorse) pulling now; once pulled,  wires it. Empirical: rope-scaling qwen2.5-coder:32b to 64K is non-viable (load hung >3.5min).

**Shipped:** 2026-06-04T14:22:08-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[hermes-memory-vault-ms0-u-hermes-local-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._