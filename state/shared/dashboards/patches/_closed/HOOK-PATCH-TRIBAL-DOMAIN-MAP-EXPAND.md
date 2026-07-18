# PATCH-SIBLING — expand tribal-by-domain-inject DOMAIN_MAP (unlock tribal injection for oscar/juliett/hotel + 3 folded)

**From:** slot alpha (Obsidian/memory/tribal injection infra owner) · **For:** golf (hooks/helpers lane) · **Date:** 2026-06-01
**Goal:** "enhance memory/wiki/tribal injection, highest priority oscar/echo/delta/kilo/foxtrot/mike/whiskey/xray/juliett/hotel/india."

## ✅ RESOLVED 2026-06-01 — the CORRECT fix shipped (commit `8998f53693`, U-TRIBAL-SLOT-DOMAIN-WIRE)
Do NOT action the DOMAIN_MAP approach below — it's superseded by the real architectural fix, now committed + tested. The fix maps each slot to its authoritative domain at the resolution layer (not a DOMAIN_MAP token band-aid):
- `wiki-domain-bias.mjs` — new `activeSlotName(chatId)` (returns the chat-slots KEY, fail-soft, chatId-gated).
- `tribal-by-domain-inject.mjs` — new exported `SLOT_TRIBAL_DOMAIN` (23 slots → nearest VALID tribal-rerank domain: foxtrot/oscar→mill, whiskey→lathe, mike→wedm, delta/xray→cad, kilo/echo→cam, india/juliett→backend-dev, hotel/charlie/lima/quebec/november→general, dev-infra→backend-dev). `main()` consults it FIRST, falls back to the old token heuristic only for unmapped slots. `getDomainTokens` UNTOUCHED (wiki-precheck unaffected).
- This resolves the **slot-token hijack** (topicless `slot/<name>` → "slot" token → backend-dev for every domain slot). E2E verified: foxtrot now → `mill` (was backend-dev). 80 tests (31 helper + 49 hook) incl. a `SLOT_TRIBAL_DOMAIN`-validity guard (every value ∈ VALID_DOMAINS — blocks the rerank-fail-loud regression class).
- **Note (orthogonal):** Ollama was down all session → rerank times out → tips don't physically inject until Ollama recovers. That's fleet-wide + environmental; the fix corrects the DOMAIN routing, which is now right. New-domain corpora (speed-feed/business/database tagged tribal entries) remain a separate domain-owner content build if dedicated domains are ever wanted.

## ⛔ SUPERSEDED 2026-06-01 — PREMISE FALSE, DO NOT APPLY FIX 1 AS A ONE-LINER
Alpha attempted Fix 1 this session (operator-authorized bypass), then VERIFIED it end-to-end through the real rerank seam and **reverted it** — it is a **regression**, not a fix. Two false assumptions in the original gap analysis below:

1. **The "182 / 12,497 / 1,569 tips" were keyword-substring MISCOUNTS, not domain-tagged corpus.** The live `tribal-embed-index.json` (33,044 entries) `domain` field has only these values: `general 18924 · cam 5346 · mill 3138 · cad 3133 · lathe 1077 · engine-reference 575 · wedm 526 · backend-dev 325`. There are **ZERO** entries tagged `speed-feed`, `database`, or `business`. Verify: `node -e "const j=require('H:/prism/state/shared/tribal-embed-index.json');const c={};for(const e of j.entries)c[e.domain]=(c[e.domain]||0)+1;console.log(c)"`.
2. **`.claude/scripts/tribal-rerank.mjs` FAILS LOUD on an unknown `--domain`.** `VALID_DOMAINS = {mill, lathe, wedm, cad, cam, backend-dev, general}` (line ~131); any other value → `process.exit` with an "unknown domain" error. So routing oscar→`speed-feed` makes the hook call `--domain speed-feed` → rerank exits non-zero → `runRerank` catches `{ok:false}` → **the hook injects NOTHING**. That is strictly WORSE than today's behavior (oscar's slot tokens don't match any set → domain `general` → real general tips returned).

**Net: applying the original Fix 1 regresses oscar/juliett/hotel from "general tips" to "zero tips."**

## The REAL fix (3-component, dependency-ordered — NOT a hook one-liner)
To genuinely route tribal tips for a new domain, ALL of these are required, in order:
1. **Corpus (the binding constraint):** `tribal-embed-index.json` must actually CONTAIN entries tagged `domain:"<new>"`. Today there are none for speed-feed/database/business. This is **content work owned by the domain slot** (oscar tags speed-feed tribal tips, etc.) — re-tag existing entries or ingest+tag new ones. Note: `business`/`database` may have **no meaningful manufacturing-tribal corpus at all** (the corpus is shop-floor manufacturing wisdom; ERP/DB knowledge isn't in it) — for those, "general" may be the honest permanent state.
2. **Rerank:** add the new domain(s) to `VALID_DOMAINS` in `.claude/scripts/tribal-rerank.mjs` (else fail-loud).
3. **Hook:** add to `DOMAIN_MAP` in `tribal-by-domain-inject.mjs` (Fix 1 below) — only AFTER 1+2.

**Cheaper interim alternative (no new corpus, no rerank change) — nearest-existing-domain mapping** (a judgment call the DOMAIN OWNER should make, not alpha): route juliett→`backend-dev` (database = backend infra; 325 real tips), oscar→`mill` or `cam` (speed/feed = cutting physics; 3138/5346 tips), hotel→`general` (no business corpus). This uses only valid rerank domains + existing corpus → no regression, imperfect-but-real bias. Implement by adding the slot's distinctive tokens to an EXISTING valid domain's match set, NOT by creating a new domain.

## Architectural root cause (3rd-round finding — supersedes even the "interim" above)
Verified against live `chat-slots.json`: oscar/juliett/hotel have `topic: undefined`, `branch: "slot/<name>"`. `getDomainTokens` (`.claude/helpers/wiki-domain-bias.mjs`) tokenizes `branch` → `["slot","<name>"]`, and **`"slot"` is in the `backend-dev` match set** → every topicless slot-worktree chat (incl. foxtrot=mill!) currently routes to **backend-dev**, not "general". So a DOMAIN_MAP token band-aid is the wrong layer: (a) domain-vocab tokens steal peer cutting slots via first-match; (b) slot-NAME tokens get polluted by the SHARED `CURRENT_POSITION.md` title (read for all slots). **The correct fix lives in `getDomainTokens`:** derive the domain from the slot's AUTHORITATIVE galaxy (the slot-context-bundle / `CHAT-SLOT-DOMAINS.md` already map oscar→speed-feed, juliett→database, hotel→business), then galaxy→nearest-valid-rerank-domain. Owner: hook owner + domain owners, fleet-regression-tested. Full analysis: memory `reference_tribal_domain_map_premise_false_2026_06_01.md`.

⛔ **The original gap table + Fix 1 below are retained for history only — do not action without first doing the `getDomainTokens` galaxy-derivation rework + (for genuinely new domains) corpus-tag + rerank `VALID_DOMAINS`.**

## Fix 1 — add 3 dedicated domains to `DOMAIN_MAP` (`.claude/hooks/tribal-by-domain-inject.mjs`)
**CORRECTED 2026-06-01 (slot:alpha, against live code re-read).** Insert this block **AFTER the `cam` entry and BEFORE the `backend-dev` entry** (~line 93) — NOT after backend-dev as this patch originally said. The live hook's loop is **first-match-wins** (see its own comment ~line 79: *"the 5 manufacturing domains keep first-match-wins precedence … backend-dev is placed LAST"*). So: manufacturing domains stay first (a mill/lathe milestone keeps its physical domain), the 3 new dedicated domains win over the generic dev catch-all, and tokens MUST be collision-free (a duplicated token never reaches the second set — the loop does NOT match-all).
```js
  { domain: "speed-feed", match: new Set(["speedfeed", "sfc", "feedrate", "chipload", "surfacefeet", "sfm", "cuttingspeed", "mrr", "merchant", "altintas", "ipt", "woc"]) },
  { domain: "database", match: new Set(["database", "persistence", "qdrant", "sqlite", "agentdb", "jsonl", "schemaversion", "migration", "datastore", "embedstore"]) },
  { domain: "business", match: new Set(["business", "erp", "quoting", "quote", "invoice", "payroll", "accounting", "crm", "purchase", "vendor", "costing"]) },
```
> **Collision audit (done 2026-06-01 against the live 6-domain DOMAIN_MAP):** dropped `kienzle` (already in `mill` → first-match routes it to mill, so it would be a DEAD token in speed-feed), `taylor` is unique-keep, `doc` (too generic — hits "document/docs"), `wal` (too generic — hits "wall/firewall"). All remaining tokens verified absent from mill/lathe/wedm/cad/cam/backend-dev sets. The original NOTE ("the loop matches all") was WRONG — corrected.

## Fix 2 — domain bias tokens (`.claude/helpers/wiki-domain-bias.mjs` `getDomainTokens`)
Add bias-token arrays for `speed-feed`, `database`, `business` mirroring the existing domain entries so the lexical rerank weights the right tips. (If getDomainTokens falls back gracefully for unknown domains, this is optional but improves precision.)

## Optional Fix 3 — promote folded domains to dedicated (echo/xray/india)
post-processor, blueprint-vision, ai-training currently ride cam/cad/backend-dev. If their tribal precision matters, add dedicated `post-processor`, `blueprint-vision`, `ai-training` domains with distinctive tokens (e.g. post: `gcode,cps,controller,fanuc,haas,okuma,siemens840d`; blueprint: `gdt,tolerance,titleblock,callout`; ai-training: `lora,ewc,rag,checkpoint,finetune`). Lower priority — they already get partial routing.

## Verify after applying
```
echo '{"prompt":"speed feed sfm chipload for 4140"}' | node .claude/hooks/tribal-by-domain-inject.mjs   # expect speed-feed tips
echo '{"prompt":"qdrant schemaVersion migration"}'   | node .claude/hooks/tribal-by-domain-inject.mjs   # expect database tips
echo '{"prompt":"erp quote invoice costing"}'        | node .claude/hooks/tribal-by-domain-inject.mjs   # expect business tips
```

## Why alpha can't apply directly (VERIFIED 2026-06-01, not assumed)
Alpha attempted the Edit this session and got the hard block — exact message:
> `Cross-worktree write blocked: this chat is in worktree h:/prism-slot-alpha but the target h:/prism/.claude/hooks/tribal-by-domain-inject.mjs is a HARD-blocked shared-state file in the main tree (… matched ^\.claude\/hooks\/[^/]+\.mjs$; tier: harness-exec (always hard)). … The 2026-05-31 main-tree-write grant relaxed DOC/coordination files to advisory, but NOT these.`

The guard offers exactly two sanctioned paths:
1. **From a main-tree / golf chat** (worktree = `H:/prism`): edit `DOMAIN_MAP` per Fix 1 above, commit, done. ← preferred.
2. **Emergency override** `PRISM_CROSS_WORKTREE_BYPASS=1` (the hook logs every bypass) — NOT appropriate for a routine tribal-map edit; reserve for emergencies.

**⚠ Runtime-location flag for whoever applies this:** confirm WHICH copy the wired hook actually executes before editing. `H:/.claude/settings.json` is the hook source-of-truth, and the `c-to-h-mirror` replicates `C:→H:` only. The edit must land on the copy the harness runs (likely `H:/.claude/hooks/` and/or `H:/prism/.claude/hooks/`) — verify with `prism_hook:list` or by grepping settings.json for the hook's resolved path, then apply Fix 1 there (+ run the Fix-3 echo/xray/india promotion if desired). Corpus already present (speed-feed 182 / database 12497 / business 1569 tips) — no slot content authoring required.
