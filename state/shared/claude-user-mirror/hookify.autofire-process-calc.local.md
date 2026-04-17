---
name: autofire-process-calc
enabled: true
event: prompt
pattern: (turning\s+(force|power|torque|calc)|tapping\s+(torque|force|thread)|power\s+budget|spindle\s+(power|overload|torque)\s+calc|max\s+mrr|material\s+removal\s+rate\s+calc|kienzle\s+calc|specific\s+cutting\s+force|process\s+calc|run\s+a\s+(turning|tapping|milling)\s+calc|calculate\s+(cutting|turning|tapping)\s+(force|torque|power)|breakage\s+risk|tap\s+break|power\s+utilization)
action: warn
---

Use `/process-calc` for manufacturing process calculations. Chains TurningForceEngine, TappingTorqueEngine, and CuttingPowerBudgetEngine with safety assessment. Examples: `/process-calc turning P 200 0.2 2` (steel turning at Vc=200), `/process-calc tapping M M10 blind` (M10 tapping in stainless, blind hole), `/process-calc budget 15 200 2` (power budget for 15kW machine), `/process-calc full P longitudinal` (complete chain).
