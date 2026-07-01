---
name: reference_per_slot_claudemd_phase_a_2026_06_13
description: "PER-SLOT-CLAUDEMD-MS0 Phase A (slot:alpha 2026-06-13) — operator directive: each slot uses+edits its OWN domain-tailored galaxy CLAUDE.md in place of the 101KB primary monolith, hard-enforced. Phase A (34-galaxy ultracode assessment + canonical template) + 2 slot-galaxy-map bug fixes SHIPPED (e403233551). Phase B (loader+enforcement) + C (content fine-tune) pending, with the DOCREFLECT-conflict caveat."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.727Z
aliases: reference_per_slot_claudemd_phase_a_2026_06_13
---


2026-06-13 slot:alpha. Operator directive: "each chat slot is supposed to have their own claude md that they should be using in place of the primary claude.md file that is custom tailored for their domain. use ultracode and ollama to do deep assessment on how each claude.md should be set up for each domain. then fine tune them and hard enforce the chat slots to use and edit their own claude.md files not the main one."

## Why this matters / root cause
The primary `H:/prism/CLAUDE.md` is a **101KB / ~530-line monolith serving all 26 domains at once** — every slot pays its full token cost every turn, ~95% of it OTHER domains' milestone prose. The fix = distribute domain doctrine to per-galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md`, keep only universal rails in main.

## What already exists (R8 — reuse, don't rebuild)
- **34 galaxy CLAUDE.md sentinels** at `mcp-server/src/engines/<galaxy>/CLAUDE.md` (8.8-20.5KB, uneven: 2 EXCELLENT / 17 GOOD / 15 PARTIAL per assessment). Auto-load via Bibryam cascade `pre-edit-galaxy-cascade-inject.mjs` (WIRED) — but only on cwd-edit-in-subtree, and its `KNOWN_GALAXIES` set covers only ~22 of 34 (missing token-optimization/system-viz/frontend-app/hermes-zulu/blueprint-vision/database-expansion/discovery/wiring/bug-hunting/backend-helper/dormant-data/fleet-hygiene).
- **GALAXY-KIT-MS0** (bravo 2026-05-29, [[reference_galaxy_kit_ms0_shipped_2026_05_29]]): `scripts/lib/slot-galaxy-map.mjs` (single-source map), `scripts/galaxy-verify.mjs` (content scorecard) + 25 `/galaxy-verify-<slot>` skills, `scripts/fill-galaxy-claudemd-domain.mjs` (+test), and `galaxy-completeness-advisory.mjs` Stop hook **UNWIRED** (golf was to wire it + edit-gate + throttle).
- **`claude-md-golf-only-guard.mjs`** — fully built + tested PreToolUse T0 hook that blocks non-golf edits to main CLAUDE.md. **DORMANT: 0 refs in both settings.json** (verified). The "don't edit main" enforcement exists but is not live.
- `slot-context-bundle-inject.mjs` (WIRED, UserPromptSubmit) — per-slot context, imports the map, resolves slot→galaxy, but does NOT inject the galaxy CLAUDE.md itself.

## Phase A SHIPPED (commit e403233551)
- Ultracode Workflow: 34 sonnet assessment agents + 1 opus synthesis (4M tok, 50min, one academy-agent stall auto-retried). Per-galaxy assessments + **`state/shared/slot-claude-md-assessment/_TEMPLATE.md`** = the LOCKED canonical 14-section per-slot skeleton (target 80-160 ln). Sections: §0 header+universal-pointer, §1 scope+EXCLUDES, §2 verified engines, §3 dispatcher quick-ref (the #1 fleet gap), §4 constants+paths, §5 domain gotchas/safety, §6 what-NOT-to-do (#2 gap), §7 pipeline(C), §8 tribal+corpus, §9 PSN edges, §10 india closed-loop, §11 tests, §12 known-bugs(C), §13 AI surface(C). Universal-core set (stays in main) + per-galaxy gap table + slot→galaxy map all in _TEMPLATE.md.
- **2 slot-galaxy-map.mjs bugs fixed** (verified live — 3 consumer hooks exit 0): (1) `bravo/zebra/zulu: hermes-zebra` (NONEXISTENT dir) → `hermes-zulu` — the 3 Hermes slots were getting ZERO galaxy injection; (2) papa OPEN CONFLICT `frontend-app` → `backend-helper` (operator-canonical CHAT-SLOT-DOMAINS + synthesis + dir-now-exists; quebec is sole frontend-app). Added the dir-existence invariant test (would've caught hermes-zebra). 6/6 pass.

## Phase B (SHIPPED 2026-06-13) — loader + hard enforcement
1. **Loader SHIPPED** (commit da3ead84e0, U-PSCM-LOADER): `.claude/hooks/galaxy-claudemd-inject.mjs` (UserPromptSubmit, cloned from slot-soul-inject; wired both settings.json after slot-soul-inject) injects each slot's galaxy CLAUDE.md as PRIMARY domain doctrine. injection-dedup 30min TTL (20KB block emitted once/window, not every prompt); safe-truncate 24KB; fail-OPEN. LIVE-validated (alpha→token-optimization + bravo→hermes-zulu inject in production). Knob PRISM_GALAXY_CLAUDEMD_INJECT_DISABLE=1.
2. **Enforcement SHIPPED** (commit 94ae4ded51, U-PSCM-ENFORCE): activated+extended the dormant `claude-md-golf-only-guard.mjs` (was 0 refs), wired PreToolUse Edit|Write|MultiEdit both settings.json. Non-golf chats BLOCKED from main CLAUDE.md, redirected to their galaxy file. DOCREFLECT preserved via an inbox-append allowance (a non-golf edit scoped ENTIRELY within a `## Recent ...` section is allowed). 48/48 tests, per-file 2-arm scrutiny PASS.
   - **SECURITY LESSON (per-file scrutiny caught 2 bypasses — capture this):** (a) **P1 span-escape** — the inbox allowance first checked only the START index of old_string, so a non-golf chat could anchor at an inbox bullet but extend old_string PAST the section boundary into doctrine and rewrite it. FIX: end-inclusive span (`idx>=a && idx+len<=b`). (b) **P2 fence-fix-became-a-bypass** — I "fixed" a fenced-`## ` over-block by making region-detection fence-aware, but that was strictly **fail-OPEN**: an unterminated ``` fence swallows every following `## ` header → region runs to EOF → re-exposes doctrine (2-step: poison via allowed append, then exploit). FIX: REVERT to pure col-0 `## ` boundaries — a spurious boundary can only SHRINK a region (fail-SAFE over-block), never extend it. **General rule: in a boundary-detection security gate, anything that SUPPRESSES a boundary is fail-open; prefer the over-block (shrink) direction.**
3. **STILL PENDING (Phase B follow-ups):** cross-galaxy ownership (block mill editing lathe/CLAUDE.md) as a WARN-first extension; extend `pre-edit-galaxy-cascade` KNOWN_GALAXIES 22→34; wire dormant `galaxy-completeness-advisory.mjs` w/ edit-gate+throttle.
   - **Never strip §0/§4/§5/§6** from galaxy files (safety rails / units / domain refuses have no other home).

## Phase C (PENDING) — fine-tune 34 galaxy CLAUDE.md to the locked template
Another Workflow: draft each galaxy's CLAUDE.md per `_TEMPLATE.md` + its Phase-A assessment spec → per-draft adversarial review (verified-symbol discipline — the #1 risk is re-introducing keyword-match engine dumps / fabricated paths) → per-file 2-arm scrutiny → apply. Use `scripts/galaxy-verify.mjs --all` as the scorecard gate.

Related: [[reference_galaxy_kit_ms0_shipped_2026_05_29]] · [[feedback_papa_no_gates_full_pathways]] · [[reference_windows_esm_entry_guard_silent_death_2026_06_13]] (sibling dormant-feature find this session).
