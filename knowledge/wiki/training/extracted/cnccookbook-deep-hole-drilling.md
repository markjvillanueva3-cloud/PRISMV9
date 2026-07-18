---
type: extracted-book
source_book: "Deep Hole Drilling: Easy Guide [Tips, CNC Programming, & Video]"
author: "CNCCookbook"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter66"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Deep Hole Drilling_ Easy Guide.pdf"
extraction_focus: "Deep-hole drilling — depth-driven technique selection, peck drilling fundamentals, parabolic flute drills, TSC + HPC, custom deep-hole cycles, F/S reduction at depth, rapid retraction, gun drilling/BTA"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/cnccookbook-deep-hole-drilling-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_66_tips: 169
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# Deep Hole Drilling: Easy Guide (CNCCookbook 2024) — extraction

> Eighteenth pass overall (iter66). Specialty drilling guide that extends drilling tribal beyond cncg-005's basic rules. The depth-driven technique-selection chart (3-4× standard → 7× parabolic → 20× parabolic+custom → 20+× gun/BTA) is the canonical reference. Closes the gap that the prior generic drilling tips (foc14-205 + hm18-006 + cncg-005) left for specialty deep work.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| dh24-001 | Depth-driven technique selection (3-4× standard / 7× parabolic / 20× +custom / 20+ gun BTA) | CamStrategySelect + MillExpertAdvisor + ToolDeflection + MillChipEvacuationPredictor + AdaptiveFeedrate |
| dh24-002 | Peck drilling — chip-trap-at-bottom avoidance + never-clear-the-hole rule + 0.001 slight-retract spin trick | CamStrategySelect + MillExpertAdvisor + MillChipEvacuationPredictor + ToolDeflection + PostProcessor + MachineController |
| dh24-003 | Parabolic flute drills — geometric chip extraction, 7× → 20× D depth extension | CamStrategySelect + MillExpertAdvisor + MillChipEvacuationPredictor + ToolDeflection + MaterialSelection |
| dh24-004 | TSC + HPC — coolant via bit center, 500-3000psi, JM Die V11 M88 fix tied here | CamStrategySelect + MillExpertAdvisor + MillChipEvacuationPredictor + PostProcessor + MachineController + HyperMillStrategy |
| dh24-005 | Custom deep-hole cycles — peck size progression + frequency progression + adaptive retract behavior | CamStrategySelect + PostProcessor + MachineController + MillChipEvacuationPredictor + MillExpertAdvisor + AdaptiveFeedrate |
| dh24-006 | F/S reduction at threshold depth — 20-30% past 5×D, 40-50% past 10×D | AdaptiveFeedrate + CamStrategySelect + PostProcessor + MachineController + ToolDeflection + MillExpertAdvisor |
| dh24-007 | Rapid vs feedrate retraction — custom-cycle rapids save 27-36% cycle time | CamStrategySelect + PostProcessor + MachineController + GCodeTimeEstimator + MillExpertAdvisor |
| dh24-008 | Gun drilling + BTA — beyond 20×D; production-only economics; refer to specialist for one-offs | CamStrategySelect + MillExpertAdvisor + QuoteEstimator + JMDieCustomer + MachineController |

## High-leverage rules

- **Depth-thresholds drive technique:** 3-4× standard, 7× parabolic, 20× parabolic+custom, 20+× gun/BTA. Mis-pick = drill breakage + scrap + downtime.
- **Never clear the hole** during peck cycle — chips get pushed back down, double evacuation work.
- **0.001in slight-retract + spin trick** evacuates the deepest chips during peck pause.
- **TSC + HPC unlocks 20× D capability** — the JM Die HurcoV11 M88 fix (iter27) is the exact post code that enables this.
- **Custom cycles > canned for deep work** — adaptive peck size + frequency + F/S reduction + rapid retract; canned cycles can't express these.
- **Gun drilling is specialist territory** — refer customer to gun-drill shop for one-off deep holes; setup overhead unjustified for low volume.

## Pipeline status after iter66

- Roost: 99 book pivots, **397 tribal tips** (was 389), 497 total nodes
- NEW BOOK: 104 → 105 books
- Cumulative iter27-66: **169 page-cited tips**
- **Key unlock**: Deep-hole-drilling specialty tribal extends MillChipEvacuationPredictorEngine (iter73 sibling) + custom-cycle programming for AdaptiveFeedrateEngine. Direct link from dh24-004 TSC + HPC content to the iter27 HurcoV11 M88 fix (the post code that activates TSC for these cycles).

## See also

- [[hypermill-2018]] — hyperMILL hm18-006 drilling cycles (14 cycles including Optimised Deep Hole + Gun Drilling)
- [[autodesk-2014-toolpath-tips]] — Autodesk foc14-205 facing-first reference
- [[cnc-complete-engineering-guide]] — cncg-005 hole design rules (depth 4× nominal recommended)
- iter27 ppgh01 HurcoV11 TSC M88 fix (in git history) — the post code that activates TSC for deep-hole cycles
