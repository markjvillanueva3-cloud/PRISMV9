---
name: autofire-calibrate-hint
type: autofire
description: Suggest /calibrate when physics_verify returns major_divergence to close the gap with real measured data
trigger_pattern: "major.divergence|MAJOR_DIVERGENCE|divergence.*exceed|physics.*inconsisten|large.*discrepanc|significant.*mismatch"
action: suggest
message: "Physics divergence detected. Use `/calibrate` to submit real measured cutting data (force, tool life, surface finish) — Bayesian updating will improve prediction accuracy and reduce cross-engine divergence."
enabled: true
---
