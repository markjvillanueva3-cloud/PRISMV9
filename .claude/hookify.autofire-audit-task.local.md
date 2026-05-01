---
name: autofire-audit-task
enabled: true
event: prompt
pattern: (audit (this|the|a) (milestone|unit|task)|check quality|review completed|verify (the |this )?(milestone|unit|work)|quality check)
action: warn
---

Use the `/audit-task` skill to audit completed PRISM milestones. Invoke it with the Skill tool: `skill: "audit-task"`. This runs the 5-check audit protocol (structural, code quality, wiring, functional gaps, enhancements) and saves findings.
