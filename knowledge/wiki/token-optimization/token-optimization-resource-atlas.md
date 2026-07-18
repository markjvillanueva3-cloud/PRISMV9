---
title: Token-Optimization Resource Atlas — Where to REACH (canonical repos + papers + standards + local code, Free/Legal)
galaxy: token-optimization
owner_slot: alpha
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "LOCAL pointers reproduce verified PRISM paths (engine dir, scripts/lib/cag-router.mjs, RTK binary at C:/Users/wompu/bin/rtk, ollama-offload-stats.json + ollama-offload-dashboard.mjs all confirmed present on disk 2026-06-10 via ls/head). ONLINE: every URL below was fetched live with WebFetch on 2026-06-10 and content-confirmed to match the described resource, free, and legal BEFORE listing. The Anthropic prompt-caching candidate's original docs.anthropic.com URL returned a 301 redirect to platform.claude.com — the redirect target was re-fetched and confirmed (the canonical host listed). No seeded candidate returned an unresolvable 404; none was guessed. Each 'reach for' line is a PRISM-internal mapping (reasoned, not quoted) and is the appropriate place for owner scrutiny. R12: no numeric threshold/constant is promoted here — methods/sources only."
tags: [token-optimization, resource-atlas, where-to-reach, canonical-source, prompt-caching, prompt-compression, lora, information-theory, llmlingua, official-docs, github-repo, primary-paper, free-legal, keep-fresh]
---

# Token-Optimization Resource Atlas

This is the **where-to-REACH index** for the token-optimization galaxy (owner: alpha): a single hub that links the galaxy's own LOCAL code/stores to the CANONICAL free online destinations — the official tool's repo, the seminal free paper, the authoritative docs page — so a chat in this galaxy jumps STRAIGHT to the authoritative source instead of re-deriving or guessing.

It is deliberately distinct from its sibling [[token-optimization-source-atlas]], which is the **where-to-LEARN curriculum** (courses, open textbooks, video lectures — a directory of *destinations to go deeper*). This page is the **where-to-REACH index**: the canonical repo / primary paper / official standard you cite or clone, paired with the local PRISM code that implements or consumes it. Source-atlas answers "where do I keep learning the theory?"; resource-atlas answers "what is the authoritative artifact and where is our code for it?"

Every online link below was fetched and content-confirmed live (see frontmatter `verification_method`). Every local pointer is a verified PRISM path.

---

## 1. Local code + stores (PRISM's own trove — reach here first)

These are the galaxy's own engine directory and real on-disk stores. Reach these before any external lookup — the implementation that already exists beats re-deriving from a paper.

### Galaxy engine directory
- `mcp-server/src/engines/token-optimization/` — the galaxy meta-dir. Contains `CLAUDE.md` (operational scope + inventory + PSN edges), `MEMORY.md` (cross-session brain + master-brain link), `PATHS.md` (H:-wide path atlas — converts Grep/Glob from O(N)→O(1) for this domain), `TOOLBELT.md` (token-lean tool-call patterns). Start at `PATHS.md` — it indexes every engine/hook/state-file in the galaxy.
- The token/efficiency engines themselves live in `mcp-server/src/engines/*.ts` and are enumerated in `PATHS.md` (`TokenAwarenessEngine`, `TokenBudgetAllocatorEngine`, `TokenEconomyEngine`, `SessionTokenLedgerEngine`, `DiffTokenEstimatorEngine`, `HookEfficiencyEngine`, and the CAD/cost bridges). Read `PATHS.md` for the live list rather than hardcoding it here.

### CAG (cache-augmented generation) router
- `scripts/lib/cag-router.mjs` — the galaxy's prompt-cache routing library (cold-cache anchoring / soul-cache blocking; consumed by the `cag-*` hooks listed in `PATHS.md`). This is the local code that implements the prompt-caching technique the Anthropic docs below describe.

### Offload telemetry + token-economy stores
- **RTK** (Rust Token Killer) — the bash output-compression proxy. Binary at `C:/Users/wompu/bin/rtk` (confirmed on disk 2026-06-10); wraps ~100 commands (git/gh/npm/vitest/tsc/docker/grep) to strip redundant output. Reach for it on every bash call (see project `RTK.md` / `/rtk-setup`).
- **ollama-offload-stats** — `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0; `offloaded`/`keptOnClaude` are TOP-LEVEL — schema-probe `j.schemaVersion` before reading). The cumulative local-LLM offload telemetry store. Read it via the dashboard: `scripts/ollama-offload-dashboard.mjs` (`--json` / `--window=48h` / `--reset`). This is the local evidence surface for the offload routing that LLMLingua-style compression and Ollama offload both feed.

> For the complete, always-current local path list (state JSON, dashboards, hooks, dispatcher actions) read `mcp-server/src/engines/token-optimization/PATHS.md` — it is the single source of truth and is kept fresher than any prose copy here.

---

## 2. Canonical repos + papers + official docs (verified free/legal)

Each row was WebFetch-confirmed on 2026-06-10. These are the *authoritative artifacts* — the official docs page, the primary paper, the maintainer's repo — not secondary summaries.

### Official docs (the canonical operator reference)

| Resource | URL | What it is | Reach for it when |
|----------|-----|------------|-------------------|
| **Anthropic — Prompt caching** (official Claude docs) | https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching | The official feature page: how to mark prompt prefixes with cache control so repeated context resumes from cache. The authoritative spec behind the galaxy's `cag-router.mjs` + `cag-*` hooks. | Implementing or debugging prompt-cache anchoring; confirming the exact cache-control contract before changing `cag-router.mjs`. (Original `docs.anthropic.com` URL 301-redirects here — this is the canonical host.) |
| **Anthropic — Token counting** (official Claude docs) | https://platform.claude.com/docs/en/docs/build-with-claude/token-counting | The official `count_tokens` endpoint reference: measure a message's input tokens *before* sending, for budget/route decisions. The canonical method behind the galaxy's diff/ledger token estimators. | Verifying the authoritative token-count method (vs. an estimate); deciding model routing or whether a prompt fits the window. Numbers stay owner-gated — link the method, not a count. |

### Primary papers (read the original — arXiv, free)

| Resource | URL | What it is | Reach for it when |
|----------|-----|------------|-------------------|
| **Shannon (1948), "A Mathematical Theory of Communication"** — Bell System Technical Journal, on Internet Archive | https://archive.org/details/bstj27-3-379 | The founding paper of information theory (entropy, the bit, source coding, channel capacity). Freely viewable + downloadable (PDF / EPUB / full text). The primary source under the entire galaxy doctrine. | You need the original derivation of the entropy floor / source-coding bound rather than a secondary summary. (Theory synthesis lives in [[token-optimization-foundations]].) |
| **Hu et al. (2021), "LoRA: Low-Rank Adaptation of Large Language Models"** — arXiv 2106.09685 | https://arxiv.org/abs/2106.09685 | The LoRA paper: freeze pretrained weights, inject trainable rank-decomposition matrices per Transformer layer for parameter-efficient fine-tuning. Free PDF/HTML/TeX on arXiv. | Reaching for the canonical method behind PRISM's LoRA fine-tuning (per-galaxy adapters / the india AI-training substrate) — the authoritative spec, not a blog restatement. |
| **Jiang et al. (2023), "LLMLingua: Compressing Prompts for Accelerated Inference of Large Language Models"** — arXiv 2310.05736 (EMNLP 2023) | https://arxiv.org/abs/2310.05736 | The primary paper for coarse-to-fine prompt compression (drop non-essential tokens via a compact LM, up to ~20× compression). Free on arXiv. The method behind the galaxy's local prompt-compression hooks. | You need the *why/how* behind prompt compression before tuning the local prompt-rewriter / offload routing. |
| **Liu et al. (2023), "Lost in the Middle: How Language Models Use Long Contexts"** — arXiv 2307.03172 (TACL) | https://arxiv.org/abs/2307.03172 | The primary evidence that LM performance is highest when relevant info is at the *beginning or end* of context and degrades in the middle. Free on arXiv. The empirical basis for relevance-ordered injection. | Justifying / designing where the galaxy places injected context (anchor-at-edges); the canonical citation for the "lost in the middle" gotcha. |

### Tool repo (official maintainer, free/legal license)

| Resource | URL | What it is | Reach for it when |
|----------|-----|------------|-------------------|
| **microsoft/LLMLingua** (GitHub, MIT license) | https://github.com/microsoft/LLMLingua | The official Microsoft repo for prompt + KV-cache compression (LLMLingua / LongLLMLingua / LLMLingua-2). MIT-licensed, freely usable. The reference implementation of the compression family. | You want the canonical reference implementation (or to compare PRISM's local prompt-compression approach against the maintainer's). MIT — legal to read/clone. |

> R12 / FREE+LEGAL discipline: only the verified URLs above are listed. A seeded candidate's original Anthropic docs host redirected (followed + confirmed to `platform.claude.com`); no candidate was dropped for a 404 this pass, and nothing unverified is listed. No paywalled or LibGen source appears here.

---

## 3. Curated video (verified)

None promoted this pass. Video lectures for the *theory* (information theory / compression) belong in the where-to-LEARN curriculum — see [[token-optimization-source-atlas]] §"Free video lectures" rather than duplicating here. This resource-atlas surfaces canonical *artifacts* (repos/papers/docs), and no maintainer-canonical video for the official tools above was WebFetch-confirmable this pass; add one only when content-confirmed live (see Keep-fresh cadence).

---

## 4. Cross-links (sibling wiki layers)

- [[token-optimization-foundations]] — synthesized THEORY (entropy, Kraft, KL, channel capacity). The *why*.
- [[token-optimization-source-atlas]] — where-to-LEARN curriculum (courses, open textbooks, video). The *keep-learning directory* (distinct from this where-to-REACH index).
- [[token-optimization-applied-practice]] — practitioner GOTCHAS (cache TTL, lossy generation loss, dedup false-merge, lost-in-the-middle). The *what goes wrong*.
- [[token-optimization-advanced-techniques]] — advanced methods (CAG, relevance-ranked injection, compression pipelines). The *how to push further*.
- [[prism-methodology-foundations]] — PRISM-wide methodology this galaxy's discipline sits within.

---

## 5. Keep-fresh cadence (do not stay stagnant)

Operator directive: every galaxy's resource index must stay reachable and live.
- **On touch / monthly, whichever first:** re-WebFetch each ONLINE URL. Anthropic docs URLs in particular move hosts (the prompt-caching link already migrated `docs.anthropic.com` → `platform.claude.com`) — follow redirects to the new canonical host and update the row; never leave a stale host listed. Drop any link that 404s or no longer content-matches; re-find the canonical replacement before delisting.
- **On any galaxy-code change:** if an engine/hook/store path moves, the LOCAL section here defers to `mcp-server/src/engines/token-optimization/PATHS.md` — re-sync that file first; this page intentionally points at it rather than duplicating the live list.
- **New canonical artifact:** when a new official tool repo / primary paper / standard becomes relevant, WebFetch-confirm it (free + legal) and add a row with a "reach for it when" mapping. Curriculum/learning material goes to [[token-optimization-source-atlas]], not here.
- **R12 invariant:** no numeric threshold, constant, or benchmark figure is promoted into this atlas — methods/sources only. Numbers stay owner-gated to alpha + `mcp-server/src/physics/constants.ts` (and galaxy-owned state). If a refresh tempts a number in, link the source instead.

---

## Owner-gate (NOT promoted)

The following are deliberately **not** asserted in this atlas and remain owner-gated to alpha (the galaxy owner) and the canonical constant stores:

- **No numeric thresholds/constants** — e.g. cache-hit ratios, compression ratios, offload-rate targets, token-budget ceilings, AUROC/quality gates, LoRA rank values. The papers/docs above describe the *methods*; the *numbers* live with alpha + `constants.ts` + galaxy state files, never duplicated into wiki prose (per R12 + the project's "NEVER inline constants" rule).
- **No PRISM-internal benchmark figures** — offload counts, tokens-saved totals, dashboard readings. Read them live from `ollama-offload-stats.json` via `scripts/ollama-offload-dashboard.mjs`; they are not frozen here.
- **The "reach for it when" mappings** are reasoned PRISM-internal guidance, not claims quoted from the linked sources — they are the appropriate point for owner scrutiny.

## Sources

LOCAL (verified PRISM paths on disk, 2026-06-10):
- `mcp-server/src/engines/token-optimization/` (CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md — confirmed via `ls -la`)
- `scripts/lib/cag-router.mjs` (confirmed present)
- `C:/Users/wompu/bin/rtk` (RTK binary — confirmed present)
- `mcp-server/data/state/ollama-offload-stats.json` + `scripts/ollama-offload-dashboard.mjs` (confirmed present; schema head read)

ONLINE (each WebFetch-confirmed live 2026-06-10, free + legal):
- Anthropic Prompt caching — https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching (original docs.anthropic.com link 301→ this host; redirect followed + confirmed)
- Anthropic Token counting — https://platform.claude.com/docs/en/docs/build-with-claude/token-counting
- Shannon 1948, "A Mathematical Theory of Communication" — https://archive.org/details/bstj27-3-379
- LoRA (Hu et al. 2021), arXiv 2106.09685 — https://arxiv.org/abs/2106.09685
- LLMLingua (Jiang et al. 2023), arXiv 2310.05736 — https://arxiv.org/abs/2310.05736
- Lost in the Middle (Liu et al. 2023), arXiv 2307.03172 — https://arxiv.org/abs/2307.03172
- microsoft/LLMLingua (MIT) — https://github.com/microsoft/LLMLingua
