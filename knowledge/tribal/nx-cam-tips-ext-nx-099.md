---
id: "nx-099"
title: "Machine Tool Builder Kinematic Chain Setup"
source: "web:siemens-nx-docs"
confidence: 85
category: "setup"
tags: ["siemens-nx", "machine-tool-builder", "kinematic-chain", "isv-setup", "axis-definition"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.398Z
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
