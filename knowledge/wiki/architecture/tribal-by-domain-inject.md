---
title: tribal-by-domain-inject — domain-aware tribal precontext on every prompt (PSN leg #5)
type: architecture
domain: dev-infra
created: 2026-06-09
by: claude-1dcb25dc
unit: U-P1-TRIBAL-BY-DOMAIN-INJECT
commit: 173291ff7
tags: [hook, UserPromptSubmit, tribal, PSN, awareness, domain-routing, advisory]
---

# tribal-by-domain-inject

A T2-advisory `UserPromptSubmit` hook (`.claude/hooks/tribal-by-domain-inject.mjs`, ~138 LOC,
38 hermetic tests) that surfaces the **top-3 tribal entries** relevant to the active chat-slot's
**milestone domain** on every parent-chat prompt. It is the parent-prompt consumer of PRISM's
tribal infrastructure — **PSN leg #5 (tribal injection)** at the prompt level.

## Why it exists
The tribal infrastructure already existed — `tribal-rerank.mjs` (doubles in-domain cosine score
via `--domain mill|lathe|wedm|cad|cam|general`) over `tribal-embed-index.json` (domain-tagged
nodes) — but only **PreToolUse:Edit** (`tribal-inject-on-edit.mjs`, basename-keyed) and
**SubagentStart** ([[subagent-per-task-presearch]]) consumed it. There was no injector at the
**parent-chat prompt** level, so a slot working in (say) the mill domain got no tribal precontext
until it touched a file. This hook closes that gap.

## Pipeline
1. `UserPromptSubmit` fires.
2. `extractPrompt(input)` — own-property check (rejects prototype-pollution), 4..300 char range, trim before length check.
3. `chatIdFromInput(input)` + `getDomainTokens({chatId})` — reuses the wiki-domain-bias helper; **no fallback to a peer slot's domain** (a mis-attributed domain is worse than none).
4. `inferTribalDomain(tokens)` — first-match-wins map (mill→lathe→wedm→cad→cam→general); **declaration order is load-bearing**.
5. `execFileSync` `tribal-rerank.mjs --query <prompt> --domain <inferred> --k 3 --json --no-cite` (2500ms default timeout).
6. Parse `hits[]` or `results[]` (drift-tolerant).
7. Format as `## 🧠 Tribal-by-domain precontext — N hit(s) in \`domain\``.
8. Emit as `hookSpecificOutput.additionalContext`.

## DOMAIN_MAP coverage
Keyword→domain (first match wins): **mill** (mill/milling/kienzle/endmill/facemill/spindle/5axis/
grinder/drill/pocket/chatter) · **lathe** (lathe/turn/okuma/mazak/groove/thread/swiss/barfeed) ·
**wedm** (wedm/edm/wire/sodick/mitsubishi/agie/charmilles/sinker/pcd) · **cad** (cad/fusion/
inventor/solidworks/blueprint/ocr/print/step/iges) · **cam** (cam/mastercam/hypermill/esprit/
toolpath/post/powermill) · else **general**. The map is a known [[reference_tribal_domain_map_gap_2026_06_01]]
extension point — non-machining domains (speed-feed/database/business) fall to `general`.

## Dependencies & failure mode
Reads `tribal-rerank.mjs`, which reads `state/shared/tribal-embed-index.json`. That index is the
corpus the V8-string-cap + clobber incidents touched ([[reference_tribal_index_v8_string_cap_2026_06_08]]) —
a cap-safe loader now guards the read. The hook is **advisory** and fail-soft: a rerank timeout,
parse error, or empty index yields no injection, never an error — so PSN leg #5 degrades silently
rather than breaking the prompt.

## See also
[[reference_tribal_by_domain_inject]] · [[reference_tribal_domain_map_gap_2026_06_01]] ·
[[subagent-per-task-presearch]] · [[feedback_psn_definition]] (the 11-leg PSN taxonomy) ·
[[reference_tribal_index_v8_string_cap_2026_06_08]]
