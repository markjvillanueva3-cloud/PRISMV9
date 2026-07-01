---
name: feedback_verify_live_config_value_not_symptom
description: "A verifier (even an adversarial live one) manufactures a FALSE finding when it infers \"X is off / unwired / missing\" from a downstream SYMPTOM instead of reading the actual config value. Always read the live value before reporting a config/wiring gap — especially before a P0."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.451Z
aliases: feedback_verify_live_config_value_not_symptom
---


# Verify the LIVE config VALUE, never infer it from a symptom

**Why:** On 2026-06-22 (Hermes+Obsidian utilization assessment, slot:zulu) TWO adversarial Sonnet live-verifiers each produced a FALSE P0/lever by reasoning from a symptom instead of reading the actual value:
- One reported the Obsidian H→C reverse mirror was "UNWIRED — zero settings.json refs → operator vault edits silently lost" (a P0). It enumerated a wrong/partial PostToolUse hop. **Direct read of the live `C:`+`H:` settings.json: `h-to-c-obsidian-mirror.mjs` IS in PostToolUse group 0 of both, not disabled.** Wired + live.
- The other recommended "set `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1`" as "the single highest-leverage fix," inferring from the 62:1 suggestion:execution ratio that autoexec was off. **It was already `"1"`** in both settings copies. Not the lever.

Both findings would have had me "fix" already-applied config, and the false reverse-mirror P0 was persisted into the assessment's own spec + memory (a fabricated finding inside a vault-quality assessment).

**How to apply:**
- Before reporting any config/wiring/env GAP — especially a P0 — READ THE ACTUAL VALUE: `node -e` the settings.json key, `grep` the wired hook list, print the env var. A symptom (low offload rate, a stale stat, a degraded result) is evidence of A problem, NOT proof of a SPECIFIC cause.
- A symptom has many possible causes. "Offload is 22%" does NOT prove "autoexec is off" — it could be model-slowness, narrow auto-route coverage, or work that legitimately needs Claude. Read the knob, THEN attribute.
- When you spawn verifier subagents, instruct them to CITE the live value they read (file:line / the printed value), not infer it. An adversarial framing ("assume nothing is done until you SEE it run") is necessary but NOT sufficient — the agent must actually read the value, and "I didn't find it in my enumeration" is not "it doesn't exist" ([[feedback_never_claim_absence_without_deep_search]]).
- The orchestrator (the one synthesizing agent outputs) must spot-check the single most alarming claim against the live system BEFORE presenting/persisting it. A P0 in a durable artifact is worth one direct read.

Sibling of [[feedback_never_claim_absence_without_deep_search]] and [[feedback_read_full_content_not_titles]] (existence/value ≠ inferred-from-symptom). Source: [[reference_hermes_obsidian_utilization_assessment_2026_06_22]].
