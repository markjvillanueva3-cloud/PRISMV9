---
name: feedback_prism_for_inexperienced_machinists
description: "PRISM's north-star: it's built for SHOPS WITH INEXPERIENCED MACHINISTS, solving the real-world machinist shortage. Automate as much as possible; every output must be operator-self-sufficient (no CNC expertise assumed). Fleet-wide doctrine, not just echo."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.440Z
aliases: feedback_prism_for_inexperienced_machinists
---


**Operator vision (2026-05-30, slot echo):** *"we need to automate as much as we can, remember we're building prism for shops with inexperienced machinists. we're trying to solve a real world problem of lack of machinists."*

**Why:** The bottleneck PRISM attacks is the **machinist shortage** — shops can't hire experienced operators. So PRISM must let an inexperienced person run parts safely. The software, not the human, must carry the CNC expertise.

**How to apply (every domain, every output):**
- **Automate the manual steps, don't just document them.** Prefer "one command → ready-to-run packet" over "here's a sheet to key in by hand." (echo demo: `prepare-hurco-job.mjs` posts NC + lints + emits tool library + plain-language operator setup card + README in ONE folder.)
- **Outputs must be self-sufficient for a novice.** The program/packet explains: stock + how to set the work zero (the #1 thing novices get wrong), exact tools + offsets, what each op does, a first-run safety checklist (feed override ~50%, hand on feed-hold), and what-to-do-if-it-goes-wrong. Plain language, no jargon assumed.
- **The machine carries the expertise:** auto speeds/feeds (prismPaths), auto safety clamps (power/stickout/ae guards stay active unless prove-out), canned cycles so the control owns peck/dwell/retract. The operator shouldn't change feeds on the first run.
- **Single source of truth → no drift.** Tool library, operator card, and the program all derive from ONE job definition ([[reference_echo_winmax_bridge]] sibling: `scripts/lib/prism-base-job.mjs`), with a drift-guard test that the described tools match what the program actually calls.
- This is **fleet-wide** (every slot/galaxy): CAD, CAM, lathe, wire, quoting, etc. all serve the same novice-operator end user. Pairs with [[feedback_build_comprehensive_route]] (the thorough, fully-automated route is the default).
