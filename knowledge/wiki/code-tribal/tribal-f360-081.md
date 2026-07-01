---
name: tribal-f360-081
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["fusion360", "machine-configuration", "kinematics", "simulation", "post-processor"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-081.md
promoted_at: 2026-06-09T22:31:16.271Z
---

# Machine Configuration Ties Post to Kinematic Model

Link your post processor to a Machine Configuration in the Machine Library to enable accurate simulation. The Machine Configuration defines axis types (linear/rotary), travel limits, home positions, and pivot distances. When the post references the machine configuration, it automatically applies correct axis output order (e.g., XYZ vs XZY), rotary axis direction, and safe retract to machine home. Without this link, simulation results may not match actual machine behavior.

**Category:** post_processor
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** post_processing

## Related
- [[fusion360-cam-tips-ext-f360-086|In-App Simulation Resolution for Detecting Small Gouges]]
- [[fusion360-cam-tips-ext-f360-090|Stock Model Updates Between Operations]]
- [[fusion360-cam-tips-ext-f360-158|Custom Machine Configuration for Non-Standard Kinematics]]
- [[fusion360-cam-tips-ext-f360-159|Simulation Speed Control for Collision Investigation]]
- [[fusion360-cam-tips-ext-f360-160|Cycle Time Estimation from Simulation]]
