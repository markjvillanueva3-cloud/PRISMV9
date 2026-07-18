# NVIDIA-NIM/U-NIM-DEPLOY — NVIDILLMCAMEngine default model + timeout match the deployed local NIM

**Commit:** `dbffe67178c6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T22:29:47-05:00
**Tags:** nvidia-nim, u-nim-deploy, auto-distilled

## Subject
[NVIDIA-NIM]/U-NIM-DEPLOY: NVIDILLMCAMEngine default model + timeout match the deployed local NIM

## Body
```
[NVIDIA-NIM]/U-NIM-DEPLOY: NVIDILLMCAMEngine default model + timeout match the deployed local NIM

Live E2E against a freshly-stood-up NIM container surfaced two defaults that
did not match a real deployment:

- DEFAULT_MODEL was meta/llama-3.1-8b-instruct, but the canonical PRISM NIM
  compose (H:/Tools/nim/compose/rtx4080.yml) serves meta/llama-3.2-3b-instruct
  on the default port-8000 endpoint -> every default-model call returned
  HTTP 404 model_not_found. Default model now matches the default endpoint;
  the 8b is reached by passing opts.model + opts.endpoint.
- DEFAULT_TIMEOUT_MS was 12_000, but a local NIM's FIRST guided-JSON request
  pays a one-time xgrammar grammar-compile cost exceeding 12s -> first call
  returned nvidia_timeout. Raised to 30_000 (warm requests measured ~1.5-1.8s).

Verified: live engine -> NIM E2E for strategyRecommend / parameterExtract /
operationClassify all return success:true with schema-valid parsed output.
49/49 unit tests green; tsc clean.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- mcp-server/src/__tests__/NVIDIALLMCAMEngine.test.ts |  2 +-
- mcp-server/src/engines/NVIDIALLMCAMEngine.ts        | 14 +++++++++++---
- 2 files changed, 12 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dbffe67178c6`
- Milestone envelope: `mcp-server/data/milestones/NVIDIA-NIM.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._