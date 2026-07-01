---
title: Audit-Awareness Substrate
slug: audit-awareness-substrate
type: architecture
created: 2026-05-26
created_by: claude-47501b2a (slot:papa /checkin /goal /loop /yolo)
milestone: SYSTEM-AUDIT-AWARENESS
units: U-AUDIT-REG · U-AUDIT-INJECT · U-AUDIT-CADENCE
status: shipped
tags: [audit, awareness, hooks, registry, cross-slot, papa]
related:
  - master-index-surface
  - awareness-stack
  - close-out-audit
  - close-out-audit-suggest
  - synergy-regression-watch
---

# Audit-Awareness Substrate

PRISM has 36 `audit-*.mjs` scripts + dozens of auxiliary audit sidecars + 4 audit-output directories scattered across `scripts/` and `state/shared/`. Pre-2026-05-26 there was no canonical inventory of "which audits exist + when did each last run + which ones cover THIS domain" — so each chat re-derived from scratch every session, audits drifted silently (often months stale), and cross-slot chats had no visibility into what audit coverage already existed for their work.

The audit-awareness substrate (shipped 2026-05-26 by `claude-47501b2a` slot:papa) closes this with one canonical registry + a UserPromptSubmit injector that surfaces "relevant audits for THIS prompt's domain" to every chat automatically.

## Goal directives closed (papa /goal /loop /yolo, 2026-05-26)

The user's /goal directive named four asks:

1. **"scope system inefficiencies"** — registry classifies 184 audits / 24 domains; 171 are >48h stale. Each row carries a one-line `node scripts/<X>.mjs` re-run hint.
2. **"audits utilized on a 2-day time frame"** — 48h staleness gate baked into registry threshold + inject hook tag (`✓ fresh ≤24h` · `⚠ warn ≤48h` · `⛔ stale >48h`) + Stop 24h auto-refresh.
3. **"all other chats auto-remember we have audits of specific domains"** — UserPromptSubmit T2 hook fires per prompt in every slot. Keyword-tokenizes the prompt against 25 domain patterns; surfaces top-K (default 3) most-relevant audits with re-run hint.
4. **"make sure the master index is fully caught up and system-viz with whats currently in the system"** — tracked separately; `regen-viz` runs in background outside this substrate.

## Three artifacts

### 1. `scripts/build-audit-registry.mjs` (268 LOC)

Atomic registry generator. Scans:

- `scripts/audit-*.mjs` (36 generators, both `.mjs` and `.test.mjs`)
- `state/shared/*audit*.{json,md}` (top-level sidecars + reports)
- `state/shared/.audit-*.json` (dot-prefixed legacy)
- `state/shared/audit/` · `audit-findings/` · `audits/` · `flagship-deep-audits/` (sub-dir reports)

Emits `state/shared/AUDIT-REGISTRY.json` (schemaVersion 1.0.0) with manifest entries `{id, scriptPath?, sidecars[], domain, lastRunIso?, ageHrs?, staleness, scriptMtimeIso?, orphanSidecar?}`. Atomic temp+rename write. Idempotent — re-runs produce stable output.

Domain inference is 25 name-based patterns (first match wins): `mill`, `lathe`, `wedm`, `cad`, `cam`, `post`, `hook`, `scheduled-task`, `wiki`, `memory`, `tribal`, `docker`, `roadmap`, `worktree`, `monolith`, `orphan`, `coverage`, `drift`, `jm-die`, `close-out`, `resource`, `token-savings`, `pipeline`, `psn`, `ai`, `system-viz`. Default: `other`.

Sort order: `stale` → `warn` → `fresh`; within group by `ageHrs` descending; orphan sidecars last.

**Knobs**: `PRISM_AUDIT_REG_STALE_HRS=48` (gate), `PRISM_AUDIT_REG_OUTPUT=<path>` (override output).

### 2. `.claude/hooks/audit-awareness-inject.mjs` (161 LOC, T2 UserPromptSubmit)

Stateless prompt-keyword → domain → top-K-audits search. 25 prompt-tokenization patterns (subset of registry patterns, focused on words a user actually types). Reads `AUDIT-REGISTRY.json`, filters to matched domains, sorts (stale-first), emits `hookSpecificOutput.additionalContext` listing top-K audits with staleness tag + sidecar path + re-run hint.

Silent on no-match (preserves token budget for irrelevant prompts).

**Verified 3/3** inline test cases:

- `{"prompt":"check the hook wiring + look at wiki coverage"}` → 22 matches across `hook`+`wiki`+`coverage`; top 3 emit with `⛔ stale (>48h)` tags
- `{"prompt":"unrelated weather"}` → silent `{"continue":true}`
- `{"prompt":"lathe roadmap drift close out"}` → multi-domain aggregation works (14 matches across `lathe`+`roadmap`+`drift`)

**Knobs**: `PRISM_AUDIT_AWARENESS_DISABLE=1`, `PRISM_AUDIT_AWARENESS_K=N` (1-8, default 3), `PRISM_AUDIT_AWARENESS_STALE_HRS=N`, `PRISM_AUDIT_AWARENESS_VERBOSE=1`.

### 3. `.claude/hooks/stop-audit-registry-refresh.mjs` (51 LOC, T3 Stop)

Detached fire-and-forget regen when `AUDIT-REGISTRY.json` mtime > 24h. Hard-fail-safe: spawn errors are swallowed (Stop must never block). Closes the cadence loop — every chat that ends a session refreshes the registry for the next chat.

**Knobs**: `PRISM_AUDIT_REG_REFRESH_DISABLE=1`, `PRISM_AUDIT_REG_REFRESH_THROTTLE_MS=N` (default 86400000 = 24h).

## Wiring (settings.json — golf-only edit)

```json
// UserPromptSubmit chain — insert after master-index-precheck-inject (T2 group):
{ "matcher": "*", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/audit-awareness-inject.mjs", "timeout": 4000 }] }

// Stop chain — T3 advisory cluster, between session-end-peer-share and duplication-guard-stop:
{ "matcher": "*", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/stop-audit-registry-refresh.mjs", "timeout": 3000 }] }
```

Edit only `C:/Users/wompu/.claude/settings.json` — the `c-to-h-mirror` hook auto-replicates to `H:/.claude/settings.json`.

**Verification one-liner** (after wiring):

```bash
echo '{"prompt":"check the hook wiring"}' | node H:/prism/.claude/hooks/audit-awareness-inject.mjs
```

Expected: `hookSpecificOutput.additionalContext` block listing `audit-hook-stack-cost` + 2 sibling hook audits with `⛔ stale (>48h)` tags + re-run hints.

## First-day stats (2026-05-26 generation)

```
audits=187 fresh=14 warn=2 stale=171 domains=24
```

The 171/187 (91%) stale figure is the **inefficiency surface** the user's directive asked us to "scope". Each stale row has a one-line `node scripts/<X>.mjs` re-run hint embedded in the inject hook output. As chats see those hints they'll opportunistically re-run the audits whose domain matches their work — converting the substrate from passive inventory to active cadence.

## Limitations (follow-up debt)

1. **stdout-only audits don't credit freshness.** Several audits (e.g. `audit-hook-paths.mjs`, `audit-edit-hooks.mjs`) print to stdout without emitting a sidecar JSON. The registry only credits freshness on sidecar mtime; these audits show as permanently stale. Fix: register a uniform sidecar-emit convention (`<repo>/state/shared/.audit-<name>.json` with `{ranAtIso, exitCode, summary}`) — a one-line wrapper around each stdout-only audit's main. Follow-up unit suggestion: `U-AUDIT-SIDECAR-CONVENTION`.

2. **Domain inference is name-based, not content-based.** A script named `audit-monolith-port-state.mjs` gets `domain=monolith` even if its body actually audits CAD or CAM internals. For most rows the name is the source of truth; for the few mis-inferred cases, the registry can be patched manually or the script renamed.

3. **Prompt-keyword match is regex, not embedding.** A prompt that says "manufacturing efficiency" won't match `roadmap` or `coverage` even though both might be relevant. A semantic match layer (using the existing wiki-precheck embeddings) is a future upgrade — for v1 the regex layer is fast (<50ms) and cheap.

4. **No `master-index-query` integration yet.** The registry surface could feed `master-index-query` as an additional ranking signal (e.g. boost any system-graph hit that has a stale audit pointing at it). Tracked as `U-AUDIT-MASTER-INDEX-WIRE`.

5. **24h Stop throttle vs 48h sidecar staleness gap.** The Stop hook refreshes the *manifest* every 24h, but the *underlying audits* aren't re-run automatically — only the manifest's view of each sidecar's mtime is refreshed. To genuinely close the 2-day cadence, a separate cron (or Stop tier) needs to opportunistically re-run stale audits. Tracked as `U-AUDIT-AUTO-RERUN`.

## Composition with existing PRISM substrates

- **Master Index** (`reference_master_index_surface`): audit-awareness operates orthogonally — master-index queries the system graph; audit-awareness queries the audit registry. Future U-AUDIT-MASTER-INDEX-WIRE will cross-link them.
- **Close-out audit** (`reference_close_out_audit_2026_05_13`): close-out is one of the 24 domains; audit-awareness will surface `audit-close-out-candidates` whenever a prompt mentions "close out", "shipped but pending", or "envelope drift".
- **Awareness Stack** (`reference_awareness_stack`): the SessionStart awareness-snapshot is per-session; audit-awareness is per-prompt. Both compose — the snapshot lays out the overall state; the inject hook surfaces the audit subset relevant to THIS prompt.
- **PSN savings aggregate** (`reference_psn_aggregator_shapes_2026_05_26`): the audit registry's `token-savings` domain will surface `audit-nudge-mcp-actions` and `audit-token-savings-coverage` to any chat asking about token efficiency.

## Memory entries

Created (this commit):
- `reference_audit_awareness_substrate_2026_05_26` (this entry — auto-fed by Stop hook to `knowledge/memories/_index/`).

Standing rule:
- _"Any new audit script ships its sidecar emit alongside the script"_ — track as a candidate `feedback_audit_sidecar_convention` after U-AUDIT-SIDECAR-CONVENTION ships.

## Source

- Commit: `6ef81b41e4` (slot:papa, 2026-05-26, BOOTSTRAP-SLOT-ENFORCE on cad-fusion-live-ms0)
- Files: `scripts/build-audit-registry.mjs` · `.claude/hooks/audit-awareness-inject.mjs` · `.claude/hooks/stop-audit-registry-refresh.mjs` · `state/shared/AUDIT-REGISTRY.json` · `state/shared/RECENT-SHIPMENTS-2026-05-26-papa.md`
