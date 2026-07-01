---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6b8fe4d-fc13-4bb1-bc76-a3ead6dce73a"
title: "You are reviewer A of three independent Claude PRISM reviewers — strict, holisti"
date: "2026-06-10"
first_ts: "2026-06-10T19:05:19.042Z"
last_ts: "2026-06-10T19:05:29.124Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/a6b8fe4d-fc13-4bb1-bc76-a3ead6dce73a/subagents/agent-ab46aa24c33eb955c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# You are reviewer A of three independent Claude PRISM reviewers — strict, holisti

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a6b8fe4d-fc13-4bb1-bc76-a3ead6dce73a/subagents/agent-ab46aa24c33eb955c.jsonl`

## Transcript

### User | 2026-06-10T19:05:19.042Z

You are reviewer A of three independent Claude PRISM reviewers — strict, holistic. Review commit HEAD on branch cad-fusion-live-ms0.

UNIT: U-ROUTE-SAVINGS-BAND-GATE (slot:bravo, token-efficiency). Adds a rate-band gate to a SessionStart hook so the route-savings telemetry banner emits ONLY when the measured take-rate crosses a 5pp band boundary since last shown fleet-wide, or after a 24h refresh — instead of repeating the same "0.4% below target" banner every session across 26 slots.

FILES (read both end-to-end):
- H:/prism/.claude/hooks/route-savings-session-start-inject.mjs
- H:/prism/.claude/hooks/__tests__/route-savings-session-start-banner.test.mjs

KEY INVARIANTS TO VERIFY:
1. `formatBanner(stats)` output MUST be byte-identical to the prior version (24 pre-existing tests assert exact strings incl "✓", "·", "—", "💰", "~NK tokens", "below 30% target", 3-line shape). The refactor extracted a shared `rateOf()` helper — confirm it changes NO output.
2. New pure fns `computeRateBand` (returns null/"warming"/"b<N>") and `shouldEmitBanner` are correct: band flips exactly at 5pp boundaries (4.9%→b0, 5.0%→b1); emits on first-show/band-change(either direction)/stale(>maxSilent)/missing-shownAt; suppresses ONLY unchanged-band-shown-recently; currentBand null → never emit (unless gateDisabled short-circuit).
3. Band-state is written to a SEPARATE file OWNED by this hook (BAND_STATE_PATH), NOT the route-suggest sidecar (which a different telemetry collector writes) — confirm no second-writer race introduced.
4. Fail-safety: corrupt/missing state file → fail-OPEN (emit once, never hide signal); writeBandState never throws out of main(); atomic tmp+rename write.
5. Knobs documented + parsed safely (invalid band width → default 5; PRISM_ROUTE_SAVINGS_BANNER_BAND=0 = legacy always-emit and writes NO state).
6. ASCII-only in all ADDED lines (PRISM ascii-guard); no stubs/TODOs/placeholder returns; tests use concrete assertions that fail if logic changes (R9).

Acceptance: no st
... [+342 chars truncated]

### Assistant | 2026-06-10T19:05:29.124Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
