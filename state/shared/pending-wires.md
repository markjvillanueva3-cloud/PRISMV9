# Pending hook wires + git-commit-only items

## ✅ COMPLETE — U-PSN-LEG-STATE-INJECT (iter 3 + iter 6 + iter 7)

**Hook + test:** SHIPPED + WIRED + EXTENDED
- `H:/prism/.claude/hooks/psn-leg-state-inject.mjs` — 6 legs (Wiki #3 · Memories #4 · Tribal #5 · System Viz #6 · Engines #7 · NN/GNN #10)
- `H:/prism/.claude/hooks/psn-leg-state-inject.test.mjs` — 36/36 pass
- Wired in `C:/Users/wompu/.claude/settings.json` UserPromptSubmit chain (auto-mirrored to `H:/.claude/settings.json`)
- **LIVE in the harness** — fires on every substantive prompt. Currently surfaces NN/GNN as UNGRADED (matches the B8 retrain finding). Other 5 legs healthy.

**Git-commit attribution status:** PENDING (peer holds `.git/index.lock` "Device or resource busy"). The .mjs + .test.mjs files on H: disk have the iter-7 extended content; only the git commit for the +172/-7 diff is contended. Will land on next clean window OR get absorbed into a peer commit.

## Outstanding follow-ups (open)

- `U-PSN-LEG-STATE-EXTEND-11` — extend from 6 to all 11 legs (add PRISM OS #2, Algorithms #8, Formulas #9, PRISM AI #11 cheap-probe signals)
- `U-SYSTEM-VIZ-REGEN-FIX` — fix `merge augmentations` exit-1 in `regen-viz.mjs`. Tried once iter4; bash exited 255 (harness timeout, no output flushed). Needs dedicated debug session.
- `U-PSN-INVENTORY-SIDECAR` — extract a stable `state/shared/psn-leg-state.json` snapshot so the hook can read a pre-computed digest instead of re-probing every prompt. Saves ~20-40ms per fire across the fleet.
