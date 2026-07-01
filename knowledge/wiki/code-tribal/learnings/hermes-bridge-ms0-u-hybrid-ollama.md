# HERMES-BRIDGE-MS0/U-HYBRID-OLLAMA — [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HYBRID-OLLAMA: repoint Hermes fleet to free local Ollama (hybrid)

**Commit:** `dca56309fab2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T23:54:44-05:00
**Tags:** hermes-bridge-ms0, u-hybrid-ollama, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HYBRID-OLLAMA: repoint Hermes fleet to free local Ollama (hybrid)

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HYBRID-OLLAMA: repoint Hermes fleet to free local Ollama (hybrid)

Hermes agent loop was pinned to Anthropic (400 billing) AND xai (bravo, bad key).
scripts/hermes-config-hybrid-ollama.py (ruamel, idempotent, --dry-run) flips every
primary model block (model/fallback_model/vision) from any non-ollama provider ->
local ollama across root + 21 profiles. Forces base_url=http://127.0.0.1:11434/v1
on every ollama block (Hermes 'ollama' defaults to CLOUD unless base_url has :11434).
Models gpt-oss:120b/qwen2.5-coder:32b/qwen2.5vl:32b. Reinstall: stopped 11 agents,
pip install -e .[all] (0.16.0). LIVE E2E: hermes chat -Q -q -> PRISM_HERMES_LOCAL_OK
via local gpt-oss:120b, exit 0, no 400. Re-run after hermes update: --apply.
```

## Files touched (2)
- scripts/hermes-config-hybrid-ollama.py | 181 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 181 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dca56309fab2`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._