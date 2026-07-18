# FLEET-HYGIENE/U-ASKOLLAMA-MODE-DOC-FIX — [MAIN-FORCE] [FLEET-HYGIENE]/U-ASKOLLAMA-MODE-DOC-FIX (slot:golf): fix stale ask-ollama mode/model doc in CLAUDE.md

**Commit:** `4d52c4972f2e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T12:06:48-05:00
**Tags:** fleet-hygiene, u-askollama-mode-doc-fix, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-ASKOLLAMA-MODE-DOC-FIX (slot:golf): fix stale ask-ollama mode/model doc in CLAUDE.md

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-ASKOLLAMA-MODE-DOC-FIX (slot:golf): fix stale ask-ollama mode/model doc in CLAUDE.md

CLAUDE.md OLLAMA-EXPAND line cited "modes: viz/summarize/explain/triage/ask;
single warm qwen2.5-coder:3b" -- stale on two counts (verified against source):
- OMITTED the `rerank` mode (ask-ollama.mjs ALL_MODES = viz/rerank/summarize/
  explain/triage/ask -- 6 modes; rerank is the VERIFIED ollama re-rank path).
- Cited qwen2.5-coder:3b -- a tag RETIRED 2026-06-04 (Blackwell migration).
  Actual DEFAULT_MODEL = "qwen2.5-coder:32b" (ask-ollama.mjs:70).
Fixed to: "modes: viz/rerank/summarize/explain/triage/ask; single warm
qwen2.5-coder:32b" + a note the :3b tag was retired. The script's own --help
USAGE block (ask-ollama.mjs:819-832) was already complete; only the CLAUDE.md
mention had drifted. Hunted per the never-idle rule (rung 3 FIXES, ollama domain).
```

## Files touched (2)
- CLAUDE.md | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4d52c4972f2e`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._