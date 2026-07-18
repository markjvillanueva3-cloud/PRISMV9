# HERMES-MEMORY-VAULT-MS0/U-HERMES-LOCAL-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-WIRE (slot:bravo): the SAFE final wiring step — point Hermes at a local Ollama model with no risk of the boot-loop a blind config edit caused before. wire-hermes-local-backend.mjs: (1) GUARD refuses to apply unless the target model is actually pulled (an absent model breaks startup); (2) BACKUP config.yaml -> .bak-<ts>; (3) TARGETED anchored-regex patch of ONLY model.default/provider/base_url (no YAML reserialize that could mangle the file); (4) BOOT-VERIFY by probing the Hermes Web UI + AUTO-ROLLBACK if it doesn't come up in 60s (Hermes can never be left broken). DRY-RUN by default; --apply actuates; --rollback restores. Dry-run vs the live config produces the exact patch (opus-4-8/anthropic -> qwen3-coder:30b/openai/127.0.0.1:11434/v1). patchModelBlock pure + tested (escapes quotes, refuses half-patch, ignores same-named keys at other indents). +10 tests green. Qwen3-Coder 30B (64K-native workhorse) pulling now; once pulled,  wires it. Empirical: rope-scaling qwen2.5-coder:32b to 64K is non-viable (load hung >3.5min).

**Commit:** `c988a21ec4f3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T14:22:08-05:00
**Tags:** hermes-memory-vault-ms0, u-hermes-local-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-WIRE (slot:bravo): the SAFE final wiring step — point Hermes at a local Ollama model with no risk of the boot-loop a blind config edit caused before. wire-hermes-local-backend.mjs: (1) GUARD refuses to apply unless the target model is actually pulled (an absent model breaks startup); (2) BACKUP config.yaml -> .bak-<ts>; (3) TARGETED anchored-regex patch of ONLY model.default/provider/base_url (no YAML reserialize that could mangle the file); (4) BOOT-VERIFY by probing the Hermes Web UI + AUTO-ROLLBACK if it doesn't come up in 60s (Hermes can never be left broken). DRY-RUN by default; --apply actuates; --rollback restores. Dry-run vs the live config produces the exact patch (opus-4-8/anthropic -> qwen3-coder:30b/openai/127.0.0.1:11434/v1). patchModelBlock pure + tested (escapes quotes, refuses half-patch, ignores same-named keys at other indents). +10 tests green. Qwen3-Coder 30B (64K-native workhorse) pulling now; once pulled,  wires it. Empirical: rope-scaling qwen2.5-coder:32b to 64K is non-viable (load hung >3.5min).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-WIRE (slot:bravo): the SAFE final wiring step — point Hermes at a local Ollama model with no risk of the boot-loop a blind config edit caused before. wire-hermes-local-backend.mjs: (1) GUARD refuses to apply unless the target model is actually pulled (an absent model breaks startup); (2) BACKUP config.yaml -> .bak-<ts>; (3) TARGETED anchored-regex patch of ONLY model.default/provider/base_url (no YAML reserialize that could mangle the file); (4) BOOT-VERIFY by probing the Hermes Web UI + AUTO-ROLLBACK if it doesn't come up in 60s (Hermes can never be left broken). DRY-RUN by default; --apply actuates; --rollback restores. Dry-run vs the live config produces the exact patch (opus-4-8/anthropic -> qwen3-coder:30b/openai/127.0.0.1:11434/v1). patchModelBlock pure + tested (escapes quotes, refuses half-patch, ignores same-named keys at other indents). +10 tests green. Qwen3-Coder 30B (64K-native workhorse) pulling now; once pulled,  wires it. Empirical: rope-scaling qwen2.5-coder:32b to 64K is non-viable (load hung >3.5min).
```

## Files touched (4)
- scripts/wire-hermes-local-backend.mjs        | 192 +++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/wire-hermes-local-backend.test.mjs   |  89 +++++++++++++++++++++++
- state/shared/hermes-local/Modelfile.qwen-64k |   4 ++
- 3 files changed, 285 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c988a21ec4f3`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._