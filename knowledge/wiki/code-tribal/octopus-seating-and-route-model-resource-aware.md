---
name: octopus-seating-and-route-model-resource-aware
category: code-tribal
domain: backend-dev
tags: [octopus, consensus, ollama, vram, capability-probe, model-routing, hermes, blackwell, prism-development, ai-development]
last_updated: 2026-06-25
---

# Resource-aware model selection: octopus VRAM seating + the in-Read-path route model

Two PRISM local-LLM bugs (slot:zulu, 2026-06-25) shared one root: **a model/resource decision was made from STATIC nominal assumptions instead of actual runtime state** (residency, cold-load latency, live availability). Both collapsed a multi-voice/offload feature to a degraded single path under load. The meta-lesson: *a single hardcoded model or default is a single point of failure the moment runtime conditions diverge from the assumption.*

## Bug 1 — octopus chronic single-voter: the capability probe ignored residency

`OllamaCapabilityProbeEngine.#computeRunnable` decided a model was "runnable" iff `nominal vramGB * MIB_PER_GB <= gpu.freeMiB`. It **never credited an already-resident model**. So a big voice already loaded in VRAM (e.g. `qwen2.5-coder:32b`, 37 GB nominal) was dropped from `runnableModelIds` whenever current free VRAM fell below its nominal size — even though re-using a loaded model costs **0 marginal VRAM**. `resolveDiverseOllamaPanel` then intersected it out, and the 2-voice local octopus panel collapsed to 1. A 1-voice "consensus" agrees with itself (`agreement_score: 1`) = no real consensus.

**Live proof:** with `qwen2.5-coder:32b` resident (54 GB loaded per `/api/ps`) + 24 GB free, `octopus-first-live-record --require-min-voices 2` seated only `gpt-oss:20b` (`meetsFloor: false`).

**Fix** (`8eb9d4dadf`): thread a `residentIds` set (from `loadedModels` = `/api/ps`) into `#computeRunnable`; runnable iff `residentIds.has(m.id) || needMiB <= gpu.freeMiB`.

**Why it's OOM-safe** (it touches a shared 96 GB GPU): `gpu.freeMiB` is already `total − loaded − reserve` on *every* `#correctFreeVram` path (plausible / non-win32 → raw nvidia-smi free which excludes used; win32 WDDM + `/api/ps` → `total − loadedMiB − reserve`). A resident model's VRAM is therefore **already subtracted from free**, so crediting it 0-marginal can never double-spend. Non-resident models still require `nominal <= free` — the OOM gate for *new* loads is unchanged. Id-mismatch (`:latest`/digest forms) fails safe: no credit → falls back to the nominal check. Verified live post-fix: 2-voice octopus with the big model resident → `successCount: 2, meetsFloor: true`.

Companion: the **consumer** side ([[octopus consensus quorum gate]], `4e0c2c2a45`) — `auto-consensus-critical-edit.mjs` now refuses to surface a `<2`-voice run as an authoritative consensus on safety-critical edits (it re-queues a real fan-out), so even when seating *does* degrade under genuine contention, a single-voice run never gives false "consensus approved" confidence.

## Bug 2 — the auto-route gist model timed out in the Read path

The PreToolUse:Read auto-offload (`ollama-route-pretooluse.mjs`) summarizes a bulk file *inside the Read path* under a 30 s timeout, but the configured model was `qwen2.5-coder:32b` — the **32B reasoner cold-loads slower than 30 s**, so every reroute timed out → fail-open → the model never warmed → chicken-and-egg → permanent **0 offloads** despite auto-mode being on. (A prior fix had re-pointed the model to 32b to fix *presence* after a 7b deletion, silently breaking *latency*.)

**Live proof** (same 279 KB `.log`): `32b → pass @ 30042ms` (timeout) vs `1.5b → reroute @ 7825ms cold / 1750ms warm`.

**Fix** (`57caa974e7` + `2fc82e8fd4`): a log/dump gist is a *trivial* mechanical task — route it at the trivial tier (`qwen2.5-coder:1.5b`), and add `resolveRouteModel(preferred, liveModels)` that auto-recovers a *retired* configured model to a live `FAST_ROUTE_TIER` member (so a deleted model still offloads instead of failing open). Default fallback dropped from `32b` → `1.5b`. Regression test pins the shipped config to a Read-path-fast model so the churn (which broke this **twice**) can't recur.

## The reusable rules

1. **A model already in VRAM (`/api/ps`) is runnable at 0 marginal cost** — never gate it on free-VRAM vs its nominal size. Credit residency in any "does it fit" check.
2. **Match the model tier to the path's latency budget, not just the task quality.** A model used inside a timeout-bounded hot path (a Read hook, a per-Stop drain) must cold-load *well under* that timeout. A heavy reasoner on a trivial gist is both slow and wasteful — use the trivial tier.
3. **Resolve the model against live `/api/tags`, never a single hardcoded name.** Model tags get deleted (Blackwell migrations); a hardcoded model is a single point of failure. Fall back to a fast-tier preference list intersected with live availability; fail safe to pass-through, never to a silent 0-result.
4. **A degraded result must be labeled degraded, not trusted.** A 1-voice "consensus", a fail-open empty offload, a stale cache — the *consumer* must detect the degradation (voter count, floor check) and not present it as a full result, especially on safety-critical paths (R12).

## Sibling lessons

- [[consensus-drain-hardening-race-exit-voice]] — the drain-side race/exit hardening (distinct layer: the drain, not the probe).
- Meta-pattern also seen this session in `audit-close-out-candidates.mjs` (`40e87be513`): a heavy-scan script **OOM'd under the default ~432 MB portable-node heap** — same "static default vs actual runtime need" failure. Fix: self-reexec with `--max-old-space-size` (Blackwell doctrine "never fight a low default"; clone of `nn-graph-retrain-lifecycle.mjs`'s `shouldReexecForHeap`).
