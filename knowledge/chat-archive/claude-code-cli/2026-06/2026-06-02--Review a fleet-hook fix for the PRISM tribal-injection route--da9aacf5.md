---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Review a fleet-hook fix for the PRISM tribal-injection router. Read these files "
date: "2026-06-02"
first_ts: "2026-06-02T01:53:55.135Z"
last_ts: "2026-06-02T01:54:22.619Z"
cwd: "H:\\prism-slot-alpha"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-aa434ed3c2bee0eb5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:36"
---

# Review a fleet-hook fix for the PRISM tribal-injection router. Read these files 

> **claude-code-cli** | 2026-06-02 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-aa434ed3c2bee0eb5.jsonl`

## Transcript

### User | 2026-06-02T01:53:55.135Z

Review a fleet-hook fix for the PRISM tribal-injection router. Read these files end-to-end:
- H:/prism/.claude/helpers/wiki-domain-bias.mjs  (NEW export: activeSlotName)
- H:/prism/.claude/hooks/tribal-by-domain-inject.mjs  (NEW: SLOT_TRIBAL_DOMAIN map + main() rewire; SLOT_TRIBAL_DOMAIN is now exported)
- H:/prism/.claude/helpers/wiki-domain-bias.test.mjs  (NEW activeSlotName tests)
- H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs  (NEW SLOT_TRIBAL_DOMAIN tests)

CONTEXT / the bug being fixed: tribal-by-domain-inject derived its domain from getDomainTokens(chatId) → inferTribalDomain (DOMAIN_MAP first-match). For topicless slot-worktree chats, branch is "slot/<name>" → tokenize → ["slot","<name>"], and "slot" is a token in the backend-dev match set → EVERY domain slot (incl. foxtrot=mill) mis-routed to backend-dev (the "slot-token hijack"). The fix adds an authoritative slot→domain map (SLOT_TRIBAL_DOMAIN, per operator-canonical CHAT-SLOT-DOMAINS) consulted FIRST in main(); falls back to the old token heuristic for unmapped slots. tribal-rerank.mjs FAILS LOUD (exits non-zero) on any --domain outside VALID_DOMAINS={mill,lathe,wedm,cad,cam,backend-dev,general}, so every SLOT_TRIBAL_DOMAIN value MUST be in that set.

Verify, weighted on LOGIC CORRECTNESS + REGRESSION SAFETY + SILENT-FAILURE:
1. main() resolution (lines ~321-325): `slotName=activeSlotName(chatId); slotDomain=slotName?SLOT_TRIBAL_DOMAIN[slotName]:undefined; domain=slotDomain||inferTribalDomain(getDomainTokens({chatId}))`. Is the fallback correct (unmapped slot → heuristic)? Any way slotDomain could be a falsy-but-valid value that wrongly triggers the fallback? (all map values are non-empty strings, so OK — confirm.)
2. Every SLOT_TRIBAL_DOMAIN value ∈ VALID_DOMAINS (else rerank fail-loud → zero injection). Cross-check against tribal-rerank.mjs VALID_DOMAINS.
3. getDomainTokens is UNCHANGED (its other consumer, wiki-precheck-inject.mjs via domainBoostFor, must be unaffected). Confirm I didn't al
... [+575 chars truncated]

### Assistant | 2026-06-02T01:54:22.619Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
