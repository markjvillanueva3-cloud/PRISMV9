# TOKEN-EFFICIENCY-INJECT/U-CAG-NOSIGNAL-SUPPRESS — [MAIN] [TOKEN-EFFICIENCY-INJECT]/U-CAG-NOSIGNAL-SUPPRESS (slot:bravo): suppress cag-router no-signal visible block; sidecar still written

**Commit:** `76ef09d34847` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T11:50:47-05:00
**Tags:** token-efficiency-inject, u-cag-nosignal-suppress, auto-distilled

## Subject
[MAIN] [TOKEN-EFFICIENCY-INJECT]/U-CAG-NOSIGNAL-SUPPRESS (slot:bravo): suppress cag-router no-signal visible block; sidecar still written

## Body
```
[MAIN] [TOKEN-EFFICIENCY-INJECT]/U-CAG-NOSIGNAL-SUPPRESS (slot:bravo): suppress cag-router no-signal visible block; sidecar still written

Operator directive (token efficiency across galaxies/domains/systems, "we
auto-inject a bunch of context, make it more efficient without sacrificing
quality"). LIVE-measured surface: 59 UserPromptSubmit + 55 SessionStart hooks
fire every prompt/session across 26 slots.

cag-router-inject ALWAYS emitted a ~3-line visible block, even for the
no-keyword route "HYBRID (conf 0%) -> (no sources)" which summarize()'s own
comment calls the MOST COMMON classification fleet-wide -- ~50 tokens of pure
noise on the majority of prompts, every prompt, every slot.

FIX (quality-preserving): suppress only the VISIBLE emit when the classifier
has no actionable opinion (confidence < minConf [0.15] AND zero cold/hot
sources AND savings==0). The decision SIDECAR is written BEFORE the branch, so
the consume path (cag-consume.mjs -> master-index/memory-relevance/tribal
short-circuit) is byte-identical. verbose keeps the surface;
PRISM_CAG_ROUTER_MIN_CONF=0 restores legacy always-emit.

LIVE: no-signal prompt stdout 290B->0B; doctrine prompt still emits 410B
(signal preserved). 17/17 tests (4 new: suppress-but-write-sidecar,
verbose-override, minConf=0-legacy, route-with-sources-never-suppressed).
2-arm per-file scrutiny PASS (0 P0/P1); applied P3 Number.isFinite guard.

Backlog (memory reference_injection_surface_token_audit_2026_06_10): extend
relevance-floor to master-index (needs U-RAG-5 eval calibration); memory-index
score:0.0 is an RRF DISPLAY artifact NOT noise (do NOT suppress); Ollama
offload belongs on the cron/synthesis path not per-prompt; slot-injector
gating audit; take-rate-driven prioritization.
```

## Files touched (3)
- .claude/hooks/cag-router-inject.mjs      | 26 ++++++++++++++++++++++++++
- .claude/hooks/cag-router-inject.test.mjs | 62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 88 insertions(+)

## Lessons surfaced in commit body
- till written
- till emits 410B

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 76ef09d34847`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._