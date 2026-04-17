---
name: autofire-program-gen
enabled: true
event: user_prompt
action: autofire
conditions:
  - field: user_message
    operator: regex_match
    pattern: (generate|create|write|make).*(cnc|g-?code|nc).*(program|code)|auto.*(speed|feed).*(program|gcode)|program.*with.*(speed|feed)|line.by.line.*(speed|feed)
---

**[autofire-program-gen]** User wants CNC program generation with auto speed/feed.

Run `/program-gen $USER_MESSAGE` to generate a complete, physics-optimized CNC program with automated line-by-line speeds and feeds using PRISM's UltimateSpeedFeedEngine pipeline.
