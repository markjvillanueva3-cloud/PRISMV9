# PRISM Skills + Hooks Audit (golf, 2026-06-11)

> **Advisory — `mustHumanVerify: true`.** Produced by ultracode Workflow `wf_cba6f0c3-d11` (18 agents, 1.34M subagent tokens, 12 skill buckets) + golf-slot independent R8 verification. Do NOT auto-execute the disable list or hook builds without the per-item verification noted below.

## ⚠ PROVENANCE + R8 CORRECTIONS (read first — R12)

The workflow's dedicated **`hook:propose` + `hook:r8-verify` agents FAILED (rate-limited)** mid-run. The 3 hook proposals below were reconstructed by the *synthesis* agent from prior-art digests **without the adversarial R8-verify pass**. Golf then independently R8-verified each against disk:

| Proposal | Synthesis said | Golf R8 (disk-verified 2026-06-11) | Verdict |
|----------|---------------|-------------------------------------|---------|
| **HRH-NEW-1 CAG cold/hot inject hook** | "`Glob .claude/hooks/cag-router*.mjs` → No files found" | **FALSE.** `.claude/hooks/cag-router-inject.mjs` (7574 B, 2026-06-10) + `cag-router-inject.test.mjs` (13661 B) EXIST and are **WIRED in settings.json** — the hook is *firing in this session* (the "Master-index precheck skipped — CAG-route tier=COLD" message IS this hook acting). | ❌ **REJECTED — already built+wired.** |
| **HRH-NEW-2 Regression-lock enforcement hook** | audit exists, enforcement doesn't | **CONFIRMED.** `scripts/regression-lock-audit.mjs` exists (audits only); NO `.claude/hooks/regression-lock*` enforcement hook. | ✅ Novel — BUT the enforcement hook lives in `.claude/hooks/*.mjs` → **cross-worktree-firewall-blocked for golf**. Build logic in `scripts/lib/` + route hook+splice to owner. |
| **HRH-NEW-3 Write-time per-file typecheck hook** | no PostToolUse:Write tsc | **CONFIRMED.** No `*write*tsc*` hook; no PostToolUse:Write+tsc wiring. | ✅ Novel — same firewall constraint (`.claude/hooks/`). Owner-gated wiring. |

**Lesson (recurrence of [[reference_goal_crosssurface_queue_2026_06_09]]):** an agent-built/synthesis-built hook queue does NOT reliably R8-check existing assets — ALWAYS disk-verify each "novel" claim before building. 1 of 3 here was already built+wired+firing.

Separately, the genuinely-novel item golf personally R8-verified earlier this session is **advisory-decay** ([[reference_route_suggest_decay_gap_confirmed_2026_06_11]]): `scripts/audit-mcp-route-takerate.mjs` recommends `suppress` for proven-noise classifiers (route-suggest fires 10450× @ 0.4% take-rate) but NO hook consumes it. Golf-buildable as `scripts/lib/route-suggest-decay.mjs` (keystone) + a firewall-gated splice patch.

## Skills inventory (532 evaluated / 12 buckets)

**Counts by tree:** C: user `~402` · H: project `742` · archived `125` · container/plugin SKILL.md `~326` (octo 53, python-dev 16, superpowers 14, figma 9, developer-essentials 11, …). `H:/prism/skills/` = empty stub (1 file).

**Verdict:** library is structurally healthy. **104 NATO slot-wrappers + 130 per-slot pipeline variants** (`checkin/handoff/startup/precompact/smart-<slot>`) are auto-generated integration points → KEEP, exempt. **~446 KEEP / ~12 high-confidence functional disable-candidates + the generic-scaffold bucket (92 evaluated, keep:0 — claude-flow/sparc/swarm/github boilerplate, most already in `commands-archive/`).** Raw per-bucket disable sum = 86 (includes the generic-scaffold boilerplate).

### Disable-candidate list (soft-disable → archive on BOTH C: + H:; NEVER delete — [[feedback_never_delete_only_disable]]). EACH needs per-skill disk verification before archiving (synthesis was wrong on a hook claim; treat skill claims with the same skepticism).

| Skill | Bucket | Reason | Supersedes-check needed |
|-------|--------|--------|--------------------------|
| `forge-from-scout` | dev-pipeline | no `name:`, no trigger, zero usage | verify `forge-supervised` covers it |
| `forge-drift` | dev-pipeline | no `name:`, no trigger | verify `envelope-drift-fix` covers it |
| `lathe-masterpost` | lathe | stub desc (bare slash name), no version/triggers | verify `lathe-master-post` is the live one |
| `lathe-agi-explain` | lathe | stub desc; unverified `prism_business:lathe_agi_*` | verify dispatcher action exists |
| `lathe-erp` | lathe | stub desc; ERP = hotel galaxy | |
| `lathe-lora` | lathe | single-phrase desc; LoRA = india galaxy | |
| `lathe-postgen` | lathe | stub-prefix desc; composition target | verify `lathe-master-post` composes it |
| `lathe-print-to-program` | lathe | stub desc; pipeline in `prism_cam:lathe_p2p_*` | verify dispatcher actions |
| `mill-awareness` | mill | no `name:`, no triggers, no `consumes:` | |
| `drill-calc` | mill | no engine/dispatcher ref; generic calc | |
| `cam-strategy` | cam | missing `name:`+`description:` | verify `cam-strategy-select`+`-compare` cover it |
| generic-scaffold bucket (92) | generic | claude-flow/sparc/swarm/github boilerplate, keep:0 | most already archived; confirm active `claude-flow-*` are dead |

**KEEP-but-fix (R3, non-blocking):** add `triggers:` to `impact`, `deep-think` (make discoverable by `skill-auto-trigger.mjs`); add `name:` to `mill-agi`, `mill-master`, `lathe-lint` (they carry active `consumes:` wiring → keep).

### Per-skill disk verification — ACTIONABLE verdict (golf, 2026-06-11 /goal continuation, R8)

The advisory list above was disk-verified candidate-by-candidate (frontmatter + inbound `.claude/commands/` references + superseder existence). **Result: 0 of 11 are unilaterally golf-archivable.** The list is entirely "fix-frontmatter + coordinate-with-domain-owner", not "archive". Bulk-archiving would have broken **≥10 live cross-references** and killed **5 active `consumes:` wirings**.

| Skill | Audit claim | Disk verdict (golf) | Action |
|-------|-------------|---------------------|--------|
| `forge-drift` | "no `name:`, no trigger" | **FALSE** — HAS `name: forge-drift`; referenced by 4 live cmds (`autopilot`, `autopilot-full`, `forge-app-wire`, `forge-mcp-wire`) | **KEEP** — audit false-positive (R8 catch #2 of this /goal) |
| `drill-calc` | "generic calc, no ref" | functional 138-line drilling calc (peck/breakthrough/cycle); 0 inbound refs but a **direct-invoke leaf**; `calc`/`process-calc` don't cover drilling-specifics | **KEEP-but-fix** (add `triggers:`) |
| `lathe-agi-explain` | stub desc | HAS `name:` + `consumes:` (active wiring), ref'd by `lathe.md` | **KEEP-but-fix** |
| `lathe-erp` | stub desc | HAS `name:` + `consumes:`, ref'd by `lathe.md` (ERP overlap w/ hotel = coordination note, not archive) | **KEEP** |
| `lathe-lora` | single-phrase | HAS `name:` + `consumes:`, ref'd by 4 (`lathe`, `forge2`, `rgs2`, DIGEST) | **KEEP** |
| `lathe-postgen` | stub-prefix | HAS `name:`, **composed by `lathe-master-post`** (live) | **KEEP** (live composition dep) |
| `lathe-print-to-program` | stub | HAS `name:` + `consumes:`, ref'd by `lathe.md` + `wet-run.md` | **KEEP-but-fix** |
| `cam-strategy` | missing `name:`+`description:` | H: missing `name:` (C: HAS it) + HAS `triggers:`, ref'd by `cam-strategy-select`/`-compare` | **KEEP-but-fix** (H/C **mirror drift** — H copy stale; has triggers → discoverable) |
| `forge-from-scout` | stub frontmatter | 147-line body, NO `name:`, referenced by `scout.md` | **NEEDS-COMPANION-EDIT** — dev-pipeline/discovery lane (tango) |
| `mill-awareness` | no `name:`/triggers/consumes | 87-line body, NO `name:`, referenced by `mill.md` + `mill-galaxy-foxtrot` + `mill-node-maximize` | **NEEDS-COMPANION-EDIT** — mill lane (foxtrot) |
| `lathe-masterpost` | stub | confirmed stub; ref'd by `lathe.md`; `lathe-master-post` is the live superseder | **NEEDS-COMPANION-EDIT** — lathe lane (whiskey) |

**Tally:** KEEP/KEEP-but-fix = 8 · NEEDS-COMPANION-EDIT (domain-owner lane) = 3 · SAFE-TO-GOLF-ARCHIVE = **0**. The only archive-eligible mass remains the **generic-scaffold bucket (92)** (claude-flow/sparc/swarm/github boilerplate, `keep:0`), most of which are **already in `commands-archive/`** (confirmed: `_archive:forge2..6`, `_archive:rgs2..5`, `sparc:ask` all show as archived in the live skill list). Net new archive candidates from the disable list: **0**. This is itself a high-value R12 finding — an 18-agent workflow's 11-item disable list contained 1 outright false positive and 0 safe-to-execute items; the "advisory / `mustHumanVerify` / never bulk-archive" framing is fully validated. Frontmatter fixes (`name:`/`triggers:` additions + the `cam-strategy` H/C mirror-drift repair) are the real actionable residue → route to each domain owner's lane (golf does not unilaterally rewrite peer-domain skill frontmatter).

## High-ROI hook build queue (post-R8, golf-buildable shape)

1. **Advisory-decay** (golf-verified novel; operator's headline token-savings item). Keystone `scripts/lib/route-suggest-decay.mjs` consumes `mcp-route-takerate-audit.json`'s `suppress` verdicts to mute proven-noise classifiers (~10450 fires/0.4% take = pure context tax). Lib golf-buildable; the 2-line `mcp-route-suggest.mjs` splice is firewall-gated → patch to **bravo** (route/ollama owner).
2. **HRH-NEW-2 regression-lock enforcement** (novel). Logic reuses `regression-lock-audit.mjs`; enforcement hook `.claude/hooks/regression-lock-gate.mjs` firewall-gated → owner-route. Advisory-first, `PRISM_REGRESSION_LOCK_ENFORCE=1` to block.
3. **HRH-NEW-3 write-time per-file typecheck** (novel, MEDIUM). PostToolUse:Write `tsc --noEmit` scoped to edited file, piped through existing `tsc-error-dedup.mjs`. Firewall-gated hook → owner-route.

**REJECTED / already-built (R8 catches):** CAG inject hook (HRH-NEW-1, built+wired+firing) · `build-cache-guard.mjs` (U-HRH01) · `mcp-readonly-cache.mjs` (U-HRH02) · `tsc-error-dedup.mjs` (U-HRH03) · precompact/context-retention (saturated) · obsidian routing/memory-mirror (wired) · skill-trigger extractor/backfill/ROI-rank (all exist).

## Recommended golf next action
Build **advisory-decay** (`scripts/lib/route-suggest-decay.mjs` + tests) — the one item golf personally R8-verified, operator's headline token-savings lever, keystone golf-buildable. Route the hook splice to bravo. The other two novel hooks are owner-gated by the cross-worktree firewall.
