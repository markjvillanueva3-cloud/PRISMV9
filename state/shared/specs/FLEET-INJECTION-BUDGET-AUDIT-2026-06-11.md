# FLEET INJECTION BUDGET AUDIT -- UserPromptSubmit + SessionStart (2026-06-11)

Owner: slot:alpha (token-efficiency architect). Operator directive: "look for inefficiencies that
is causing us to waste tokens every turn, fix for the entire fleet."

UserPromptSubmit hooks fire EVERY turn in up to 26 concurrent chat slots, so their steady-state bytes
dominate the fleet token bill. Multiply every per-turn byte figure below by ~26 for fleet impact.

## Measurement ground-truth (R12 -- live numbers beat the findings JSON where they conflict)

`node scripts/measure-injection-budget.mjs --json` (60 wired UserPromptSubmit injectors):

| Metric | Bytes | ~Tokens |
|--------|-------|---------|
| First-emit total (cold, full-freight) | 9,247 | 2,642 |
| Steady-state total (2nd emit, same prompt+sid) | 3,208 | 917 |

CAVEAT on the two numbers (honest, load-bearing for sizing every fix below):
- The measure script runs each hook TWICE with the SAME prompt and a FIXED session_id. The 2nd
  emit is the best case for self-dedup: identical input means content-hash dedup suppresses.
- In a REAL fleet turn the prompt changes every turn, and several injectors embed live state
  (loop-state, token-zone, BM25 over the live prompt) so their hash changes turn-over-turn and
  dedup CANNOT suppress. For those, the realistic per-turn cost is the FIRST-emit figure, not the
  2nd. The findings JSON's larger estBytesPerTurn (e.g. slot-context-bundle-inject 4657) reflects
  this changing-content worst case; the live 2nd-emit 222 reflects the identical-prompt best case.
  Both are true under different assumptions. Fixes are sized against the realistic (changing) path.

## Ranked offenders (by realistic every-turn waste, reconciled live + findings + source read)

Waste = STATIC-or-near-static content that re-injects every turn WITHOUT dedup suppression, x26 slots.
A guard that emits 0 bytes most turns (mcp-connectivity-check, slot-bind-enforce, token-awareness-*,
session-id-pin, slot-brief-inject, heartbeats, the *-prewarm / consensus gates) is NOT a target.

| # | Hook | Live r1 / r2 | Realistic B/turn | Static? | Dedup? | Fleet B/turn (x26) | Fix |
|---|------|--------------|------------------|---------|--------|--------------------|-----|
| 1 | slot-context-bundle-inject | 2306->222* | ~4657 (changing legs break hash) | partly | yes (fragile) | ~121K | extract token-zone sub-block + size-cap 2048 |
| 2 | prompt-context-inject | 246->246 | 246 (stale daemon-down notice, NO dedup) | yes | NO | ~6.4K | throttle stale-warn 1/10m + dedup-wrap |
| 3 | slot-soul-inject | 2306->219 | 219 (marker) / 2306 cold | yes | yes | ~5.7K | merge-into bundle (dedup already good) |
| 4 | local-compute-intent | 1351->577 | 577 (keyword-gated, partial dedup) | yes | partial | gated | size-cap 800 + tighten gate |
| 5 | auto-consensus-userprompt | 331->331 | 331 (NO dedup, keyword-gated) | no | NO | gated | dedup-wrap |
| 6 | slot-domain-awareness-inject | 1567->208 | 208 (marker) / 1567 cold | yes | yes | ~5.4K | merge-into slot-soul-inject/bundle |
| 7 | psn-leg-state-inject | 766->217 | 217 | near | yes | ~5.6K | tighten-gate (emit only on leg-state change) |
| 8 | mcp-broadcast-reconnect-inject | 40->40 | 40 (NO dedup, static) | yes | NO | ~1K | dedup-wrap |
| 9 | node-capability-inject | 40->40 | 40 (mostly silent; fires on node-id) | n/a | NO | ~1K | none (gate already tight) |
| 10 | obsidian-vault-precheck-inject | 226->226 | 226 (keyword-gated, BM25 live) | no | yes | gated | tighten-gate vs master-index overlap |
| 11 | master-index-precheck-inject | 1026->0* | ~1026 (changing prompt re-fires) | no | yes | gated, high-value | none (keep) |
| 12 | ai-synergy-awareness-inject | 467->223 | 223 | near | yes | ~5.8K | tighten-gate |
| 13 | search-thoroughness-inject | -- | 1104 cold (static, keyword-gated) | yes | NO | gated | dedup-wrap |
| 14 | comprehensive-build-enforce | 1612 cold | gated (build verbs only) | yes | partial | gated | dedup-wrap |
| 15 | delta/xray/foxtrot/echo domain injects | 1685-3064 cold | gated, self-dedup | yes | yes | gated | size-cap 800-1500 |

`*` r2=0 / r2=222 are the identical-prompt best case; real turns re-fire near r1 (see CAVEAT).

### Honest non-targets (do NOT touch -- 0 bytes most turns)
mcp-connectivity-check (silent when MCP up), slot-bind-enforce, slot-brief-inject, session-id-pin,
token-awareness-sidecar / token-awareness-inject (GREEN=0B), heartbeat-keepalive,
slot-session-sidecar-heartbeat, golf-slot-reaper-guardian, active-chat-priority-boost,
token-budget-gate, comprehensive-build-enforce (gated), stress-harness-emit, lima-academy /
zulu-advisory / psn-tag-parser / session-reorient (all gated/empty). Per R12 these are guards, not waste.

## Fix groups (est savings, fleet-wide x26)

### Group A -- Dewire duplicate wirings (MECHANICAL, lowest risk, do FIRST)
Confirmed in C:/Users/wompu/.claude/settings.json (mirrors to H: via c-to-h-mirror):
- SessionStart: `session-start-auto-resume` wired x4 -> keep 1, remove 3
- PreToolUse: `pre-tool-savings-multi` wired x4 -> keep 1, remove 3
- PostToolUse: `build-cache-guard` wired x2 -> keep 1, remove 1
These run the hook N times per event. session-start-auto-resume is SessionStart (1x/session) so the
byte cost is bounded, but the duplicate EXECUTIONS waste wall-clock + risk double-injection. The
PreToolUse/PostToolUse dupes fire on EVERY tool call -- the real CPU/latency drain.
Est byte savings: low (these are mostly side-effecting), but removes 8 redundant executions/turn-cluster.
Risk: low -- pure de-duplication of identical wirings; verify each removed entry is byte-identical first.

### Group B -- Dedup-wrap every-turn NO-DEDUP static emitters (LOW risk, mechanical)
Route through `scripts/lib/injection-dedup.mjs` (dedupeOrMarker) so unchanged content emits a 1-line
marker after first fire:
- prompt-context-inject (246B/turn stale-daemon notice) -- ALSO throttle the stale-warn to 1/10m.
  This is the single clearest every-turn waste: the context-bundle daemon is DOWN, so it emits a
  246B "stale (NNNNNm old)" warning EVERY turn with no suppression. ~6.4K/turn fleet-wide of noise.
- mcp-broadcast-reconnect-inject (40B/turn static) -> dedup-wrap. ~1K/turn fleet.
- auto-consensus-userprompt (331B, keyword-gated) -> dedup-wrap.
- search-thoroughness-inject (1104B static, keyword-gated) -> dedup-wrap.
- comprehensive-build-enforce (1612B static, keyword-gated) -> dedup-wrap.
Est fleet savings: ~8-10K B/turn realized on the every-turn ones (prompt-context + mcp-broadcast),
plus large per-fire savings on the gated ones (search-thoroughness, comprehensive-build, consensus).
Risk: low -- the dedup library is already imported by 21 hooks; mechanical add of the same wrapper.

### Group C -- Size-cap oversized static domain/awareness blocks (LOW-MED risk)
Hard-cap rendered output; these are keyword-gated so they do not fire every turn, but when they do
they are 1.6K-3K of largely static domain boilerplate already covered by the slot bundle + tribal:
- delta-cad-awareness-inject 3064 -> cap 1500
- xray-blueprint-domain-inject 2728 -> cap 1400
- foxtrot-mill-awareness-inject 2495 -> cap 1200
- echo-post-domain-inject 1685 -> cap 800
- local-compute-intent 577 -> cap 800 (already near; tighten gate instead)
Est savings: ~5K B PER FIRE on the matching slot (not every turn). Per-slot, not fleet-multiplied,
since each fires only in its own galaxy slot.
Risk: med -- must preserve the load-bearing head of each block (path pointers, refuse_list); cap by
truncating the trailing tribal/example section, not the operative pointers.

### Group D -- Merge redundant slot/domain/soul injectors into slot-context-bundle-inject (HIGHER risk, do LAST)
Three injectors surface overlapping slot identity every turn (soul, domain table, bundle):
- slot-soul-inject (219 marker / 2306 cold) -- bundle already reads the soul for refuse_list (PSN leg #19)
- slot-domain-awareness-inject (208 marker / 1567 cold) -- bundle implies domain via soul
- ai-synergy-awareness-inject (223) + charlie-quoting-awareness-inject (400) -- per-slot awareness
Action: absorb soul + domain table into the bundle under ONE dedup clock + ONE chat-slots.json read.
ALSO (the high-value structural fix for offender #1): extract the token-zone sub-block out of the
bundle so the fast-changing token section has its own hash -- the slow-changing legs (soul, domain,
roadmap) then stay dedup-suppressed instead of the whole 4657B block re-firing every turn because
the embedded token% changed. This is the biggest single realistic lever.
Est savings: collapses 3-4 TTL sidecar writes -> 1, and (via token-zone extraction) lets the ~4K
slow-changing portion of the bundle actually dedup-suppress turn-over-turn. Realistic fleet savings
~60-100K B/turn IF the token-zone extraction lands (the dominant lever in the whole audit).
Risk: med-high -- merging TTL clocks + preserving the 2048B soul cap + not double-injecting. Must
ship behind a flag and validate per-slot that soul/domain/refuse_list still surface exactly once.

### Group E -- SessionStart consolidation (LOW-MED, 1x/session so low fleet weight)
- build-state-inject (1800) + awareness-snapshot-inject (1000) overlap -> merge awareness into build-state.
- goal-synergy-status-inject is re-derived by knowledge-link-audit / wiki-tribal-coverage(-per-domain)
  / prism-ai-memo-coverage -> merge the 4 coverage injectors into goal-synergy-status-inject.
- nn-graph-health-inject (280) vs substrate-health-inject (220) overlap -> dedup-wrap nn-graph.
Est savings: ~2-3K B/session (NOT per-turn -- SessionStart fires once). Lower priority than A-D.
Risk: low-med. Deferrable.

## Dependency-ordered remediation (risk-ascending)

1. U-INJ-DEWIRE-DUPES (Group A) -- remove the 3+3+1 duplicate wirings. Pure settings.json edit;
   verify byte-identical before removing. No code change. PREREQ for clean measurement of B-D.
2. U-INJ-DEDUP-PROMPT-CONTEXT (Group B) -- throttle + dedup-wrap prompt-context-inject's stale-daemon
   notice. Highest every-turn realized saving. Standalone.
3. U-INJ-DEDUP-MCP-BROADCAST (Group B) -- dedup-wrap mcp-broadcast-reconnect-inject. Standalone.
4. U-INJ-DEDUP-GATED-STATICS (Group B) -- dedup-wrap auto-consensus, search-thoroughness,
   comprehensive-build-enforce. Standalone, mechanical.
5. U-INJ-SIZECAP-DOMAIN (Group C) -- cap delta/xray/foxtrot/echo + tighten local-compute-intent.
   Per-slot; independent of 1-4.
6. U-INJ-BUNDLE-TOKENZONE-EXTRACT (Group D, part 1) -- extract token-zone sub-block from
   slot-context-bundle-inject so slow legs dedup-suppress. THE dominant lever. Ship behind flag.
   Depends on 1 (clean measurement) to prove the saving.
7. U-INJ-BUNDLE-MERGE-SOUL-DOMAIN (Group D, part 2) -- absorb slot-soul + slot-domain into the
   bundle under one clock. Depends on 6 (bundle hashing must be split first).
8. U-INJ-SESSIONSTART-CONSOLIDATE (Group E) -- merge SessionStart coverage injectors. Lowest
   priority (1x/session). Independent.

## Validation protocol (every unit)
Re-run `node scripts/measure-injection-budget.mjs --json` before+after each unit; assert
totalSecondEmitBytes drops and NO hook's r1 increases (no regression). For Group D, additionally
verify per-slot that soul/domain/refuse_list each appear EXACTLY once in a real UserPromptSubmit
(spawn one fire per slot, grep the additionalContext). Per R15: wire -> test -> validate-live -> all-slots.

## Honest caveats (R12)
- The 3,208 B steady-state is the IDENTICAL-PROMPT best case. Real every-turn cost is higher because
  prompt + live-state injectors re-hash; the true fleet bill is between 3.2K and 9.2K B/turn/slot,
  i.e. roughly 83K-240K B/turn across 26 slots. Group D's token-zone extraction is what moves the
  realistic number toward the 3.2K floor.
- prompt-context-inject's 246B is a SYMPTOM of the context-bundle daemon being down (45997m stale).
  Restarting/fixing the daemon would make the legacy injectors it replaces redundant -- a larger
  structural win than dedup-wrapping the warning, but out of scope for this byte-audit; flagged.
- Findings JSON contains DUPLICATE rows for several hooks (slot-context-bundle-inject x4,
  master-index-precheck-inject x3, etc.) with divergent estBytesPerTurn. These are different
  measurement passes, not 4 separate hooks. Ranking above de-duplicates them against the live run.
- No hook was deleted in this plan; all fixes are dewire-dup / dedup-wrap / size-cap / merge. Asset
  preservation (never-delete) intact.

---

## ⚠️ ALPHA VERIFICATION ADDENDUM (2026-06-11, slot:alpha) -- READ BEFORE ACTING ON THE ABOVE

The synthesis above was produced by sonnet sub-agents and its per-hook CLAIMS were NOT all correct.
I (alpha) deterministically verified each top "quick win" before implementing. Results:

- **"Dewire 3 duplicate wirings" (session-start-auto-resume x4, pre-tool-savings-multi x4, build-cache-guard x2) -> FALSE POSITIVE.** Each copy is wired under a DIFFERENT matcher: session-start-auto-resume fires on `compact`/`clear`/`startup`/`resume` (the 4 distinct SessionStart triggers); pre-tool-savings-multi targets `Glob`/`Grep`/`Write`/`Bash`; build-cache-guard spans PreToolUse:Bash + PostToolUse:Bash + PostToolUse:Edit|Write|.... Removing any would BREAK that trigger/tool. The deterministic guard `scripts/dedupe-settings-hook-wirings.mjs` (which only collapses event+matcher+command identical entries) reports CLEAN. **Do NOT dewire these.**
- **mcp-broadcast-reconnect-inject "40B static every turn" -> FALSE POSITIVE.** It is SIGNAL-GATED (`exitSilent()` when no active, non-expired reconnect signal) -> emits nothing on a normal turn.
- **slot-context-bundle-inject "never dedup-suppresses, 3000B lever" -> ALREADY FIXED.** It already routes through `dedupedContext` (line 266, U-OBS-SLOTBUNDLE-DEDUP shipped by alpha 2026-06-09); the token-zone line is only included when zone != GREEN, so on a GREEN/steady slot the content is stable and DOES dedup-suppress. The residual (hash churn while a slot flaps non-GREEN) is real but narrow, NOT 3000B.

### Genuinely real + SHIPPED this pass
- **prompt-context-inject** -- the context-bundle daemon has been DOWN ~32 days (`context-bundle.json` 46,002 min old), so this hook re-emitted a 204B "daemon may be down" notice EVERY turn in every slot with NO dedup. FIX (commit pending): throttle to 1/30min per session via `dedupedContext` and SUPPRESS to 0 bytes on repeat; also surrogate-guard the naive `block.slice()`. Live-verified: fire 1 = 204B, fire 2 = 0B. Saves ~204B/turn x 26 slots on every repeat turn.

### The honest fleet picture
Empirical floor (measure-injection-budget.mjs): ~3,208 B/turn (~917 tok) per slot identical-prompt; ~9,247 B/turn ceiling with changing content. The big STRUCTURAL sink (slot-context-bundle) was already deduped 2026-06-09. Remaining real levers are incremental: dedup-wrap the few standalone every-turn emitters that bypass the chokepoint, and (infra, golf/papa lane) RESTART the context-bundle daemon so the ONE compact bundle replaces the 60 legacy injectors as designed. NEXT: verify+dedup-wrap the keyword-gated static blocks (search-thoroughness 1104B, comprehensive-build-enforce 1612B) -- low per-turn impact (gated), low risk.
