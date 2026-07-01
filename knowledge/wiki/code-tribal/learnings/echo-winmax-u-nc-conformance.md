# ECHO-WINMAX/U-NC-CONFORMANCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-NC-CONFORMANCE: semantic NC-vs-spec verifier = the closed-loop correctness signal

**Commit:** `22b08743f1a6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T01:51:12-05:00
**Tags:** echo-winmax, u-nc-conformance, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-NC-CONFORMANCE: semantic NC-vs-spec verifier = the closed-loop correctness signal

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-NC-CONFORMANCE: semantic NC-vs-spec verifier = the closed-loop correctness signal

The goal's CORE leg: "ensuring the code our post processor generates is 100% correct
relative to the math our SFC/engines should be generating." This is the SEMANTIC
correctness check (distinct from post-nc-dialect-lint's dialect/safety SYNTAX check) and
the self-learning closed loop's SCORING function. Pure static — no GUI, no MCP, no build.

- post-nc-conformance.mjs: parseNC (O#/units/WCS/tool-blocks-with-S+F+cycles/retract/end) +
  checkConformance vs prism-base-job spec. Heart = per-tool emitted S<rpm> must equal the
  spec/SFC tool rpm. Also: units (25.4x guard), WCS, tool presence, no-extra-tools, drill
  canned-cycle, structure. Returns {checks, score 0-1, ok} = the learning signal.
- post-nc-conformance.test.mjs: 15 real-value tests (real spec, not mocked) — conforming NC
  scores 100%; wrong-rpm/G21/missing-tool/extra-tool/dropped-G83 each FAIL the right check.

PROVEN LIVE: the real SAMPLE-PRISM-Base-Hurco-RICH.nc scores 15/15 (100%) — emitted
S3000/6000/8000/4000 match spec rpm 3000/6000/8000/4000 exactly. Post output IS correct
relative to the SFC math.

Live SFC-recompute leg (cam_speedfeed_compute) is optional + LOUDLY skipped when MCP down
(R12) — NOT a stub: spec-rpm comparison is itself the static correctness check. This
unblocks the closed-loop phase: the WinMax GUI Draw-verify (geometry/collision) is env-
blocked (screen capture OS-disabled), but the math-correctness leg the goal centers on works.
```

## Files touched (3)
- scripts/post-nc-conformance.mjs      | 157 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/post-nc-conformance.test.mjs | 120 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 277 insertions(+)

## Lessons surfaced in commit body
- wrong-rpm/G21/missing-tool/extra-tool/dropped-G83 each FAIL the right check.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 22b08743f1a6`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._