# PRISM Awareness-System Assessment + Improvement Roadmap (2026-06-10, slot:bravo)

> Deliverable #2 of the token-efficiency + awareness /goal. This is the **assess
> current state + determine how to improve** phase (the dependency-ordered first
> unit of #2 -- you assess before you build). Grounded in LIVE measurements taken
> this session, not estimates. Tees up sound, non-conflicting next units.

## What the awareness system IS (the surfaces a chat gets situational awareness from)

1. **Global per-session/per-prompt injectors** (settings.json hooks) -- LIVE-measured
   by `scripts/audit-injection-surface.mjs`: **114 recurring injectors** (55
   SessionStart + 59 UserPromptSubmit), 78 context-emitting. These carry the
   CROSS-CUTTING layer to EVERY chat: CLAUDE-BRIEF, awareness-snapshot, master-index,
   slot-soul, slot-domains, slot-context-bundle, PSN-leg-state, wiki/memory/obsidian
   prechecks, CAG-route, skill-auto-trigger, loop/goal discipline, Ollama rewrite.
2. **Per-galaxy CLAUDE.md/MEMORY.md/PATHS.md/TOOLBELT.md** (Bibryam Context Cascade)
   -- the DOMAIN-specific layer, auto-loaded when editing in `engines/<galaxy>/`.
   Presence: **34/35 galaxies have all 4 artifacts** (complete).
3. **Obsidian vault + wiki + tribal + memories** -- the recall/knowledge substrate
   (PSN legs #1/#3/#4/#5). Master-index unifies wiki+memory+graph search.
4. **Hermes/Zulu orchestration + closed-loop** (octopus consensus, weekly synthesis,
   galaxy synthesis brains -> LoRA via vault-to-lora; coverage audited by
   `audit-galaxy-ai-coverage.mjs`).

## KEY DESIGN CONSTRAINT (multi-step impact -- a #2 theme, surfaced this session)

**The cross-cutting layer belongs in the GLOBAL injectors, NOT duplicated into each
galaxy CLAUDE.md.** "Domain-specific per galaxy BUT carrying overall PRISM knowledge"
is ALREADY satisfied: domain context comes from the galaxy CLAUDE.md (cascade), and
overall PRISM/dev-tools/loop/Ollama knowledge comes from the global per-session
injectors. **Duplicating cross-cutting content into 34 galaxy files would directly
FIGHT deliverable #1** (it multiplies redundant auto-injected context). Any #2 unit
that proposes "add PRISM-wide knowledge to each galaxy file" is REJECTED on this basis.
The right lever is making the GLOBAL injectors accurate, tunable, and non-redundant.

## CURRENT STATE -- measured (this session's shipped work)

- Injection surface: 114 recurring injectors, **knob coverage 71.9% -> 78.1%**,
  **KNOBLESS context-injectors 6 -> 3 -> 0** (every context-emitting recurring
  injector is now operator-silenceable). Route-savings banner band-gated
  (322B/session saved). See `reference_injection_surface_token_audit_2026_06_10`.
- Galaxy domain layer: 34/35 complete; AI-coverage (brain->LoRA) audited separately.
- Ollama offload: per the audit, the per-prompt injector PRODUCERS have 0 model calls
  (pure file-assembly) -- offload headroom is in the TASK-ROUTING layer
  (OllamaHookBridge / ask-ollama), measured by `ollama-offload-dashboard.mjs`
  (~11% vs 30% target). NOT on the inject path.

## IMPROVEMENT ROADMAP (dependency-ordered, each a future /loop unit; NONE fight #1)

1. **[measurement] Wire REAL per-injector BYTES into the census.** [SHIPPED
   2026-06-10 as U-INJECTION-BYTES-RANK.] `U-MWO08` = `measure-userpromptsubmit-
   budget.mjs`; reused its `probeHook` behind a `--bytes` opt-in + `--probe`.
   `computeWeight` + `topByBytes` (primary, raw bytes) + `topByWeight` (refined,
   bytes x fires/hr). LIVE cut list: `slot-domain-awareness-inject` 1461B is the
   #1 per-prompt payload. NOTE (R7): kept fire-rate default-on (the weight needs
   it); the fire-counter only instruments 12 hooks, so the bytes-only `topByBytes`
   is the immediately-useful ranking. 27/27 tests. -> directly feeds unit #2.
2. **[ENFORCEMENT] Make injection discipline self-enforcing.** [SHIPPED 2026-06-10
   as U-INJECTION-KNOB-ENFORCE.] OPERATOR DIRECTIVE 2026-06-10: *"we need auto
   enforcement when necessary, not suggestions so you actually follow your own
   instructions."* -> the census/knob-adds/cut-list were all ADVISORY. Shipped a
   PreToolUse Write gate (`injection-knob-enforce.mjs`) that HARD-BLOCKS creating a
   knobless SessionStart/UserPromptSubmit context-injector (reuses the census's own
   detectKnobs+emitsContext; wired settings.json; 11/11 tests). The awareness surface
   can no longer regress to an un-silenceable injection. NOTE (R12): the cut-list's
   raw-bytes #1 (`slot-domain-awareness` 1461B) was a FIRST-EMIT figure -- it already
   dedups to ~126B/repeat, so it is NOT the compression target it looked like.
   FUTURE (enforcement-first, per the directive): a per-prompt injection-budget Stop/
   inject CAP that enforces the <=3KB target (the U-MWO08 budget, still advisory).
3. **[awareness depth] Ollama-offload the SessionStart SYNTHESIS producers' future
   model work** (CLAUDE-BRIEF/awareness-snapshot are deterministic today; if/when
   they gain summarization, route to qwen2.5-coder:32b). Track via offload dashboard.
4. **[closed-loop] Strengthen learning-from-mistakes surfacing:** the memory->wiki
   promotion advisory (U-HRP06, ~25 standing suggestions) + "## Recent regressions"
   are the mistake-learning surfaces; a unit to auto-promote high-confidence
   memory->wiki would compound the self-learning loop.
5. **[impact reasoning] Make /impact + master-index blast-radius a per-edit awareness
   nudge** (downstream/upstream) -- the #2 "multi-step-ahead" ask.

## How each future artifact lands (R15)

- The census + its enrichments are FLEET-WIDE dev tools (serve all galaxies; live in
  `scripts/`, invokable now). Knob additions are per-injector but FLEET-WIDE in effect.
- A relevance-floor / gate is wired into the specific injector hook (settings.json
  already references it; no new wiring). Auto-fires on the hook's existing event.
- Ollama task-routing improvements wire into OllamaHookBridge / ask-ollama (existing).

_Source: live `audit-injection-surface.mjs` + `audit-galaxy-ai-coverage.mjs` reads,
2026-06-10. Memory: reference_injection_surface_token_audit_2026_06_10 (SHIPPED 1-7)._
