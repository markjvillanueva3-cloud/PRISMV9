---
session: claude-72879035
topic: ollama-fleet-autoexec
slot: india
written_at: 2026-06-11T13:45:56.356Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-72879035
status: active
---

# HANDOFF: claude-72879035
Updated: 2026-06-11T13:45:56.357Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-72879035

## STATE
Ollama audit complete (slot:india). Server healthy; advisory-only root cause verified. Sonnet 6-agent fan-out -> OLLAMA-FLEET-AUDIT-2026-06-11.md. Build the 6-item P0 plan next session (too big for current 70pct budget). verifiedOffload fallback param IS the Sonnet-fallback hook point.

## RESUME
OLLAMA AUDIT COMPLETE -- BUILD is next phase (fresh context). Read FIRST: state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md (28KB ranked P0 plan, file:line). Root cause (verified): Ollama healthy; offload hook layer is advisory-only; keystone scripts/lib/ollama-verified-offload.mjs verifiedOffload (fallback param = Sonnet-fallback) built but never wired = 671 suggest/0 offload. BUILD P0: 1 wire verifiedOffload auto-exec into ollama-task-offloader.mjs; 2 wire ollama-route-pretooluse into settings.json+read-bundle; 3 wire resolveExecutor Sonnet/Claude fallback into ask-ollama+offloader; 4 ask-ollama keep_alive 10m to 30m; 5 gpt-oss120b co-residency OOM guard; 6 input-scaled timeout. TEST: auto-exec fires every UserPromptSubmit, must be fail-soft+latency-bounded. Commit to slot/india.

## CONTEXT

