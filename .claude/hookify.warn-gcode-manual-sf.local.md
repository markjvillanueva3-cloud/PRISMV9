---
name: warn-gcode-manual-sf
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(nc|gcode|tap|mpf|cnc)$
  - field: content
    operator: regex_match
    pattern: S\d+\s+.*F\d+|F\d+\s+.*S\d+
---

**[warn-gcode-manual-sf]** G-code file written with manual S/F values.

Consider running `/auto-speed-feed` or `/program-gen` to physics-optimize the speeds and feeds. PRISM's AutoSpeedFeedEngine applies Kienzle force, Taylor tool life, chip thinning, and power budget models to every cutting line — producing better S/F than manual lookup tables.
