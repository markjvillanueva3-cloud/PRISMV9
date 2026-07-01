# BACKEND-DEV-LOOP/U-TRIBAL-BACKEND-DEV-WIKIS — [MAIN] [BACKEND-DEV-LOOP]/U-TRIBAL-BACKEND-DEV-WIKIS: 6 high-density auto-injecting backend-dev wikis (iter1)

**Commit:** `c346fe51b27f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T13:19:25-05:00
**Tags:** backend-dev-loop, u-tribal-backend-dev-wikis, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-TRIBAL-BACKEND-DEV-WIKIS: 6 high-density auto-injecting backend-dev wikis (iter1)

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-TRIBAL-BACKEND-DEV-WIKIS: 6 high-density auto-injecting backend-dev wikis (iter1)

/goal iter1 — exhaust backend-dev tribal injection. Adds 6 new
auto-injecting wiki pages so future chats querying coding / AI / DL /
NN / agent / scrutiny topics surface concrete doctrine, not just
inference from CLAUDE.md.

  knowledge/wiki/software-engineering/
    karpathy-12-rule-discipline.md     R1-R12 full reference (the 4 +
                                       the 8 agent-era complement,
                                       PRISM-specific applications +
                                       fail-loud anti-patterns)
    fail-loud-r12-patterns.md          fail-loud vs fail-safe vs fail-
                                       soft (intent-by-disposition);
                                       verify-it-worked rail; hostile-
                                       payload corollary
    per-file-scrutiny-gate.md          per-file 2-reviewer + Stop 3-of-3
                                       protocol; reviewer prompt template;
                                       hermetic-mock blindspot lesson
    atomic-write-idempotency-patterns.md
                                       temp+rename atomic write; lockfile
                                       + fsync escalation rubric; plan/
                                       apply split; partial-failure
                                       tolerance composition rule

  knowledge/wiki/code-tribal/
    tribal-precontext-architecture.md  6-layer pipeline (memories →
                                       embed-index → rerank → inject →
                                       citation → telemetry); domain-
                                       inference ordering invariants;
                                       coverage targets
    llm-agent-loop-design.md           4 loop shapes (interactive/
                                       subagent/Ollama-subprocess/
                                       Ollama-harness); subagent prompt
                                       template; parallel dispatch;
                                       R10 checkpoints in /loop mode

  state/shared/CLOSE-OUT-CANDIDATES.{json,md} refreshed (was 5h stale)

These pages will surface via the existing wiki-precheck-inject hook
(BM25 over wiki/index.md + _leaf-index.jsonl + cosine fallback over
_embeddings.jsonl) once the index regen runs. Until then they are
discoverable via direct file-path navigation and via the wiki-domain-
bias scorer (`domain: backend-dev` frontmatter feeds the bias hook).

Cross-references the 2026-05-18 lima wiring commit 817c95ba72 (the
DOMAIN_MAP backend-dev addition + 34-entry retag). The wiring made
backend-dev a tribal-rerank domain; these wikis make it a wiki-
precontext domain too. Together they double the auto-injection surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (9)
- .../wiki/code-tribal/llm-agent-loop-design.md      | 109 ++++
- .../code-tribal/tribal-precontext-architecture.md  |  96 ++++
- .../atomic-write-idempotency-patterns.md           |  93 ++++
- .../software-engineering/fail-loud-r12-patterns.md |  81 +++
- .../karpathy-12-rule-discipline.md                 |  58 +++
- .../software-engineering/per-file-scrutiny-gate.md |  88 ++++
- state/shared/CLOSE-OUT-CANDIDATES.json             | 546 ++++++++++++++++++++-
- state/shared/CLOSE-OUT-CANDIDATES.md               |  37 +-
- 8 files changed, 1102 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- tile-
- til then they are

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c346fe51b27f`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._