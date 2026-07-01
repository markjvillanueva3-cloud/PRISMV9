---
name: tribal-nx-099
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["siemens-nx", "machine-tool-builder", "kinematic-chain", "isv-setup", "axis-definition"]
confidence: 85
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-099.md
promoted_at: 2026-06-09T22:31:16.487Z
---

# Machine Tool Builder Kinematic Chain Setup

When building a machine model in NX Machine Tool Builder, define the kinematic chain from the machine bed upward through each axis component. Each link in the chain requires: CAD geometry, axis type (linear/rotary), travel limits, home position, and parent link. For a VMC, the chain is: Bed > Column(Y) > Headstock(Z) > Spindle and Bed > Table(X). Set axis speeds and acceleration limits to match the machine's specification sheet. Incorrect kinematics produce silent positional errors in ISV that give false confidence in the program.

**Category:** setup
**Confidence:** 85
**Source:** web:siemens-nx-docs
**Operations:** simulation

## Related
- [[surfcam-cam-tips-sc2-215|SURFCAM Machine Simulation Kinematic Chain Setup]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
