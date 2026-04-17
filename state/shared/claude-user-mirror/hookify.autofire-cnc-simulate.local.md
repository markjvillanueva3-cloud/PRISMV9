---
name: autofire-cnc-simulate
type: autofire
description: Suggest /cnc-simulate when user discusses G-code simulation, collision checking, or program verification
trigger_pattern: "simulat.*g.code|simulat.*program|collision.*check|verify.*program|vericut|run.*simulation|check.*collision"
action: suggest
message: "Use `/cnc-simulate` for Vericut-class G-code simulation — collision detection, cutting physics, tool life prediction, cost estimation, and safety scoring."
enabled: true
---
