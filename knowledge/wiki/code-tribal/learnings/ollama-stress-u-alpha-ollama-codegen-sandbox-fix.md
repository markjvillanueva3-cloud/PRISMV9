# OLLAMA-STRESS/U-ALPHA-OLLAMA-CODEGEN-SANDBOX-FIX — [MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-CODEGEN-SANDBOX-FIX (slot:alpha): close a vm sandbox ESCAPE in the codegen battery (Workflow review P0)

**Commit:** `f00515f3d75f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:44:41-05:00
**Tags:** ollama-stress, u-alpha-ollama-codegen-sandbox-fix, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-CODEGEN-SANDBOX-FIX (slot:alpha): close a vm sandbox ESCAPE in the codegen battery (Workflow review P0)

## Body
```
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-CODEGEN-SANDBOX-FIX (slot:alpha): close a vm sandbox ESCAPE in the codegen battery (Workflow review P0)

The codegen battery executes MODEL-GENERATED code in a vm sandbox to verify
correctness. The Workflow's adversarial reviewer found the sandbox was ESCAPABLE:
vm.createContext({}) with no codeGeneration option let the constructor-chain attack
(function(){return this})().constructor.constructor('return process')() exfiltrate
the host process object (confirmed: process.pid matched host, process.env readable).
The file's own security comment falsely claimed 'no require/process/fs'.

FIX (two layers, both required): vm.createContext({}, { codeGeneration: { strings:
false, wasm: false } }) closes the arrow-function-this path; prepending 'use strict'
to the model code closes the regular-function-this path. Self-test still green.
This matters because the harness runs UNTRUSTED model output -- a real safety fix,
not cosmetic. The other 5 batteries' review fixes (reasoning/json/instruction/mfgdomain
P0/P1) were already in 135fdb5a2e.
```

## Files touched (2)
- scripts/lib/stress-battery-codegen.mjs | 17 +++++++++++++----
- 1 file changed, 13 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f00515f3d75f`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-STRESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._