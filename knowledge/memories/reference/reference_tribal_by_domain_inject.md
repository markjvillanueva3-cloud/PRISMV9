---
name: reference-tribal-by-domain-inject
description: "UserPromptSubmit hook surfaces top-3 tribal entries on every prompt, keyed on the active chat-slot's milestone domain via tribal-rerank.mjs --domain. Sibling of [[reference_wiki_domain_bias]]."
aliases: reference_tribal_by_domain_inject
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.225Z
---


# tribal-by-domain-inject — domain-aware tribal precontext on every prompt

User directive (SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT): the existing tribal infrastructure (tribal-rerank.mjs with `--domain mill|lathe|wedm|cad|cam|general` doubling in-domain cosine scores, tribal-embed-index.json with 30+ domain-tagged tribal nodes) had NO UserPromptSubmit-level injector. Only PreToolUse:Edit (`tribal-inject-on-edit.mjs`, basename-keyed) and SubagentStart (per [[reference_subagent_per_task_presearch_2026_05_15]]) consumed it. This unit closes the gap at the parent-chat prompt level.

## Files

- `.claude/hooks/tribal-by-domain-inject.mjs` (138 LOC, T2 advisory)
- `.claude/hooks/tribal-by-domain-inject.test.mjs` (38 hermetic node:test cases — all pass)

## Pipeline

1. UserPromptSubmit fires
2. `extractPrompt(input)` — own-property check (rejects prototype-pollution); 4..300 char range; trim before length check
3. `chatIdFromInput(input)` + `getDomainTokens({chatId})` — reuse [[reference_wiki_domain_bias|wiki-domain-bias]] helper (no fallback to peer slot)
4. `inferTribalDomain(tokens)` — first-match-wins map (mill→lathe→wedm→cad→cam→general); declaration order is load-bearing
5. `execFileSync` tribal-rerank.mjs with `--query <prompt> --domain <inferred> --k 3 --json --no-cite` (default 2500ms timeout)
6. Parse `hits[]` or `results[]` (drift-tolerant)
7. Format as `## 🧠 Tribal-by-domain precontext — N hit(s) in \`domain\``
8. Emit as `hookSpecificOutput.additionalContext`

## DOMAIN_MAP coverage (P1-B addressed)

- **mill**: mill, milling, kienzle, endmill, facemill, spindle, 5axis, fiveaxis, grinder, grinding, drill, drilling, pocket, chatter
- **lathe**: lathe, turn, turning, okuma, mazak, groove, thread, swiss, swisslike, bar, barfeed
- **wedm**: wedm, edm, wire, sodick, mitsubishi, agie, charmilles, sinker, pcd, ramwedm
- **cad**: cad, fusion, inventor, solidworks, drawing, blueprint, ocr, print, catia, step, iges, ipt, iam
- **cam**: cam, mastercam, hypermill, esprit, toolpath, post, solidcam, powermill, siemensnx, feature
- **fallback**: general (still queries; just no 2× in-domain boost from tribal-rerank)

## Knobs

- `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1` — no-op
- `PRISM_TRIBAL_DOMAIN_INJECT_K=N` — top-K (default 3, max 10)
- `PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS=N` — subprocess timeout (default 2500, max 15000)
- `PRISM_TRIBAL_DOMAIN_INJECT_VERBOSE=1` — telemetry skip reasons

## Wiring

Inserted in `C:/Users/<u>/.claude/settings.json` UserPromptSubmit chain after `master-index-precheck-inject.mjs`, timeout 5000ms. Auto-mirrored to `H:/.claude/settings.json` by c-to-h-mirror.

## Per-file scrutiny gate verdict

**Reviewer A (subagent_type=reviewer)**: PASS, only P2 polish (NaN guard, idiomatic main-module guard).
**Reviewer B (subagent_type=code-analyzer)**: PASS with 2 P1s — both addressed before commit:
- **P1-A** prototype-pollution-style prompt injection → fixed via `ownStr()` helper using `Object.hasOwnProperty.call` (defense-in-depth; JSON.parse output unaffected)
- **P1-B** `DOMAIN_MAP` token set incomplete vs. real milestone vocab → extended +15 tokens covering swiss/5axis/grinder/sinker/pcd/blueprint-ocr/catia/solidcam/powermill/siemensnx/etc.
- **P2-B** 4000ms default timeout × every prompt → lowered default to 2500ms
- **P2-C** declaration-order undocumented → DOMAIN_MAP doc comment now states it explicitly
- **P2-A** module-load failure bypasses `main().catch` → added smoke test asserting clean import

## Live verification

Smoke-test: `echo '{"prompt":"thin wall chatter during pocket roughing","session_id":"a61bbf34-test"}' | node hook.mjs` → returned 3 `cad`-domain hits (slot delta on `cad-fusion-live-ms0` branch matches `cad`+`fusion` tokens). 38/38 hermetic tests pass via `node --test`.

## Related

- [[reference_wiki_domain_bias]] — sibling (UserPromptSubmit wiki-rank boost, same milestone)
- [[reference_subagent_per_task_presearch_2026_05_15]] — SubagentStart tribal precontext (different surface)
- [[reference_viz_first_redirect_glob]] — tool-level system-viz-first doctrine (same milestone)
- [[feedback_tribal_obsidian_viz_utilization_protocol]] — overall tribal × obsidian × system-viz protocol
