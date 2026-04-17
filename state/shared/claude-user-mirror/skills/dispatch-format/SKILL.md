---
name: dispatch-format
description: Format PRISM output for Dispatch (phone) consumption. Compact, emoji-free, 1-line summaries with expandable details.
model: haiku
effort: low
---

# Dispatch Output Formatting Rules

When formatting PRISM results for Dispatch (phone-to-desktop messaging), apply these rules to every response.

## Status Prefix
Every response starts with a status word:
- **OK** — operation succeeded, results nominal
- **WARN** — succeeded with caveats or advisory notes
- **FAIL** — operation failed or critical issue found

## Summary Line
- First line: `STATUS: <summary in max 80 characters>`
- Example: `OK: Ti-6Al-4V milling — 180 m/min, 0.12 mm/tooth, Fc=1.2 kN`
- Example: `WARN: Feed reduced 15% — tool deflection exceeds 0.05 mm`
- Example: `FAIL: No suitable tool found for 0.5 mm slot in Inconel 718`

## Number Formatting
- Use K/M suffixes for large numbers: 95.6K tools, 2.6K+ actions, 1.1M lines
- Round to 3 significant figures: 1,234 N becomes 1.23 kN
- Percentages: one decimal place (87.3%)
- Currency: whole dollars for >$100, cents for <$100

## Tables
- Maximum 3 columns, 5 rows
- Use aligned plain text, not markdown tables
- Header row with dashes separator
- Truncate with "... +N more" if data exceeds 5 rows

## File Paths
- Show basename only: `SpeedFeedOrchestratorEngine.ts` not full path
- Add parent dir only if ambiguous: `engines/SpeedFeedOrchestratorEngine.ts`

## Expandable Details
Structure detailed output in collapsible sections:

```
OK: Simulation complete — 847 blocks, 12.3 min cycle, no violations

[Details]
Blocks processed: 847
Cycle time: 12 min 18 sec
Peak force: 2.34 kN (block 312)
Max deflection: 0.032 mm
Tool wear: 18% of life consumed
Coolant: flood, 40 bar
[/Details]

[Warnings]
Line 312: Force spike near limit (93% of max)
Line 598: Chip evacuation marginal in pocket
[/Warnings]
```

## Prohibited
- No emojis (user preference)
- No ASCII art or decorative elements
- No code blocks unless specifically requested
- No relative time references ("just now", "recently")
- No filler phrases ("Here are the results", "I found that")

## Multi-Result Batches
When returning multiple results (e.g., batch speed/feed):

```
OK: 5/5 operations calculated

1. Face mill 50mm — 200 m/min, 0.15 mm/t
2. Drill 10mm — 80 m/min, 0.22 mm/rev
3. Bore 25mm — 120 m/min, 0.08 mm/rev
4. Tap M12 — 15 m/min, 1.75 mm/rev
5. Chamfer 1mm — 150 m/min, 0.10 mm/t
```
