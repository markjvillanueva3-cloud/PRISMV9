---
name: reference-hermes-dreaming-and-webwright-2026-05-26
description: "2026-05-26 reading of @tonysimons_ Hermes Dreaming v0.1.0 + Microsoft Webwright; both map to existing PRISM substrate with clear bridge gaps. Bravo slot, /checkin /goal /loop."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.138Z
aliases: reference_hermes_dreaming_and_webwright_2026_05_26
---


# Hermes Dreaming + Microsoft Webwright — incorporation analysis for PRISM

**Read date:** 2026-05-26 (bravo, slot 00569f88)
**Triggered by:** operator-supplied /goal "read these articles to see how we can incorporate"
**Articles:**
- https://x.com/tonysimons_/status/2059119768662065523 — "Hermes Dreaming v0.1.0" (Tony Simons, 2026-05-25 22:49)
- https://x.com/mr_r0b0t/status/2059026191646945515 — Microsoft Webwright announcement (mr-r0b0t, 2026-05-25 16:37)
- Webwright project: https://microsoft.github.io/Webwright/ + https://github.com/microsoft/Webwright

## Article 1 — Hermes Dreaming v0.1.0

**Author:** Tony Simons (@tonysimons_) — same Hermes Agent that PRISM's Zulu mirrors.
**Thesis:** *"Controlled mutation with receipts beats clever bullshit every time."* Self-improvement should look like release engineering, not mythology.

**Lifecycle:** `scan → stage → diff → validate → apply → discard`

**Command surface (6 verbs):**
```
dreaming create   --live-root --artifact-root --source ...
dreaming diff     <artifact-id>
dreaming validate <artifact-id> --live-root
dreaming apply    <artifact-id> --live-root --backup-root --approve all
dreaming discard  <artifact-id> --archive-root
dreaming status   --artifact-root
```

**Artifact bundle (the "receipt"):**
- `manifest.json` — what run you're looking at
- `REPORT.md` — human-readable summary
- `sources.jsonl` — what got scanned
- `proposals.jsonl` — proposed mutations

**Offline marker format (no LLM required to test):**
```
DREAM: memory: Keep updates short and concrete.
DREAM: user: Prefer concise status updates.
DREAM: fact: {"type":"preference","key":"tone","value":"casual"}
DREAM: skill: path=skills/review.md | Preserve review gates and backups.
```

**Key constraints:** `--source` is explicit + repeatable (no whole-repo inhale). Apply writes backups first. Discard archives without mutating live.

## Article 2 — Microsoft Webwright

**Thesis:** *"A terminal is all you need for web agents."* Stop predicting next-click on one stateful browser; give the agent terminal + workspace + spawn-discard-rerun browsers.

**Numbers:** ~1K LOC harness, 3 modules (Runner / Model Endpoint / Environment), 86.7% Online-Mind2Web (GPT-5.4, 300 live tasks, 100-step budget), 60.8% Odysseys (35.1% relative SOTA improvement), 66.2% small-model (Qwen3.5-9B + crafted reusable tools).

**Loop:** Send context → Emit bash → Return observations → Refine and finish (final script reruns in fresh folder + self-reflection gate).

**Workspace contents per run:**
```
final_script.py
final_script_log.txt
screenshots/
self_reflect_result.json
```

**Three challenges Webwright explicitly addresses:**
1. *Premature done gate* — final script + rerun in fresh folder + self-reflection before "done"
2. *Context compaction* — long trajectories compact into summaries; workspace keeps concrete artifacts
3. *Reusable tools* — task script parameterized → CLI → shared with coding agents → token+time savings on repeat runs

**Bundled Hermes Agent skill** (Nous Research). Repo: https://github.com/microsoft/Webwright.

## PRISM cross-reference (what's already here)

| Pattern from article | Existing PRISM asset | Gap |
|----------------------|----------------------|-----|
| Hermes Dreaming receipt artifact | SOUL-DREAM-WIRE-MS0 (bravo U-HZP05 already shipped); `prism_session` exposes `dream_propose` `dream_batch_render` `dream_consolidate` `dream_queue_render` | No artifact bundle (manifest/REPORT/sources/proposals.jsonl); no diff/validate/apply/discard split — consolidate is direct-mutation |
| DREAM: marker offline source format | None | Cleanly maps to a new offline source-scanner that reads handoffs + memories for `DREAM:` lines |
| Hermes Dreaming backup-before-apply | `worktree-commit-route` + branch isolation + git reflog | Memory writes (`stop-obsidian-memory-feed.mjs`, [[feedback_auto_memory_feeds_obsidian_stophook]]) have no backup-root; if a write is bad, recovery is git-only |
| Webwright workspace-per-run | Playwright MCP (per [[feedback_playwright_for_online_sources]]) — but sessions are ephemeral | No `state/shared/web-workspaces/<run-id>/` substrate; screenshots + scripts + logs are discarded |
| Webwright skill-promotion (one-shot task → CLI) | `.claude/commands/*.md` skill library + `skill-auto-trigger.mjs` ledger | No path: successful browser task → parameterized skill stub auto-generated |
| Webwright self-reflection gate | 3-of-3 scrutiny gate at Stop (CLAUDE.md §SCRUTINY GATE) | The 3-of-3 is for code change-sets; nothing equivalent for browser task completion |
| Webwright context compaction with persistent workspace | `precompact-handoff.mjs` + workspace ledger files (`loop-state/`, `slot-task-claims.json`) | Browser sessions don't write anything compact-survivable |

## Net takeaways

**These two articles are pointing at the same gap from opposite sides:**
- **Hermes Dreaming** = governance layer for state mutation
- **Webwright** = capability layer for tool generation
- The seam is the **artifact bundle** — both stake their value on "the receipt is the product, the action is the side-effect."

PRISM has the substrate for both (SOUL-DREAM-WIRE-MS0 + Playwright MCP + skill auto-trigger ledger + 3-of-3 scrutiny + handoff topic-keying). What's missing is the *bundle discipline* — write artifacts to a stable workspace, then expose diff/validate/apply/discard as first-class operations across every mutation channel (memory writes, browser sessions, skill promotion, dispatcher action emission).

## Proposed roadmap (bravo-owned, follow-on to HZP-DASH-PSN-MS0)

See companion spec: `state/shared/specs/HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md`

Two milestones, both small:
- **DREAM-RECEIPT-MS0** (5-7 units): bundle artifact format + 5 verb dispatcher actions (`dream_diff`, `dream_validate`, `dream_apply`, `dream_discard`, `dream_status`) + apply-with-backup path; stage memory writes through it.
- **WEBWRIGHT-SKILL-PROMOTION-MS0** (6-8 units): per-session workspace dir + self-reflection arm + skill stub auto-generation from successful Playwright runs; first target = JM-Die CAD scrape + vendor catalog harvest + DocuStrata customer scrape (already exist as one-shot scripts, ready to template).

Both compose: a successfully promoted Webwright skill should arrive in `.claude/commands/` via a Dream artifact bundle for operator review.

## Related (do not duplicate)

- [[reference_session_continuity_stack_2026_05_15]] — precompact + auto-resume already handle the "long trajectory" half of Webwright's challenge #2
- [[feedback_playwright_for_online_sources]] — standing rule already routes browser work through Playwright MCP, so the workspace-wrapper plugs in at the right layer
- [[feedback_handoff_writers]] — explains why writing memory/handoffs directly is rationed; Dream-Receipt fits cleanly as an *exception path* gated on operator review

## Citations

```
@misc{webwright2026,
  title  = {Webwright: A terminal is all you need for web agents},
  author = {Lu, Yadong and Xu, Lingrui and Huang, Chao and Awadallah, Ahmed},
  year   = {2026},
  howpublished = {\url{https://github.com/microsoft/Webwright}}
}
```

Hermes Dreaming v0.1.0: https://github.com/asimons81/hermes-dreaming (MIT-style, install: `hermes plugins install asimons81/hermes-dreaming --enable`).
