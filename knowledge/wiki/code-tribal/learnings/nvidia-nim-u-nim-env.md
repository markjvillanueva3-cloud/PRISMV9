# NVIDIA-NIM/U-NIM-ENV — NVIDIALLMCAMEngine resolves PRISM-canonical NIM_URL + /v1-doubling fix

**Commit:** `c03ffbe4c94d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T21:19:04-05:00
**Tags:** nvidia-nim, u-nim-env, auto-distilled

## Subject
[NVIDIA-NIM]/U-NIM-ENV: NVIDIALLMCAMEngine resolves PRISM-canonical NIM_URL + /v1-doubling fix

## Body
```
[NVIDIA-NIM]/U-NIM-ENV: NVIDIALLMCAMEngine resolves PRISM-canonical NIM_URL + /v1-doubling fix

resolveEndpoint() read only NVIDIA_NIM_ENDPOINT / TRITON_HTTP_ENDPOINT, so
the prism_cam:nvidia_cam_* actions ignored PRISM's actual NIM endpoint env
var NIM_URL (the canonical name — also consumed by local-llm-bridge.mjs and
the nim-autostart.mjs SessionStart hook). It worked only by the coincidence
that the hardcoded default http://127.0.0.1:8000 equals where NIM runs.

- Add process.env.NIM_URL to the resolution chain (after the two existing
  vars — precedence: override > NVIDIA_NIM_ENDPOINT > TRITON_HTTP_ENDPOINT >
  NIM_URL > default).
- New normalizeNimBase() strips trailing slashes AND a trailing /v1 segment.
  NIM_URL is /v1-suffixed (http://127.0.0.1:8000/v1); the engine appends its
  own /v1/chat/completions and /v1/models routes — without the strip a
  /v1-suffixed endpoint produced a doubled /v1/v1/... URL (latent bug, also
  fixed for explicit overrides).
- Tests: +8 cases (NIM_URL fallback, /v1 strip, /v1+slash, precedence x2,
  override /v1 strip, resolveEndpoint meta); beforeEach now deletes NIM_URL
  so the default-endpoint tests are hermetic on a shell that exports it.
  41 -> 49 tests, all green; tsc clean.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../src/__tests__/NVIDIALLMCAMEngine.test.ts       | 62 ++++++++++++++++++++++
- mcp-server/src/engines/NVIDIALLMCAMEngine.ts       | 27 ++++++++--
- 2 files changed, 85 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c03ffbe4c94d`
- Milestone envelope: `mcp-server/data/milestones/NVIDIA-NIM.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._