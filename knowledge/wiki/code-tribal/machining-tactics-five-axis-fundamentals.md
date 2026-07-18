---
schema: ideablock-v1
title: "5-axis fundamentals — 3+2 vs simultaneous, RTCP, singularity, tool-axis control"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Multi-Axis Machining
  - Sandvik + hyperMILL + Fusion 360 5-axis application guides
  - Appraiou + Bohez — 5-axis kinematics literature
  - 4245-tribal corpus 5-axis subset
extracted_via: human-authored
extracted_at: 2026-05-21T13:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-5AXIS-FUNDAMENTALS)
---

## Question

When do I need 3+2 vs simultaneous 5-axis, what is RTCP, what is a singularity, and how do I keep the tool axis sane?

## Answer (canonical — 3+2 by default; simultaneous only when the surface demands it; RTCP makes both usable)

### 3+2 (positional) vs simultaneous (continuous) 5-axis

| | 3+2 (positional / indexed) | Simultaneous (continuous 5-axis) |
|---|---|---|
| Rotary axes | Lock at an angle, then 3-axis cut | Move continuously WITH the linear axes |
| Programming | Simple — it's 3-axis cutting in a tilted plane | Complex — tool axis varies along the path |
| Use for | Reaching faces a 3-axis machine can't; multi-side parts in one setup | Sculptured surfaces, impellers, blades, ports |
| Rigidity | High — rotary axes clamped | Lower — rotary axes moving under load |
| Surface finish | Good (rigid) | Can be excellent (tool axis optimized to surface) OR poor (if tool axis chatters) |

**The default is 3+2.** It captures most of 5-axis's value (one-setup multi-side machining, reaching difficult faces, shorter tools by tilting toward the feature) with a fraction of the programming + risk. Simultaneous is reserved for genuinely sculptured geometry where the tool axis MUST vary continuously — turbine blades, impeller passages, blended ports.

### RTCP — the feature that makes 5-axis usable

RTCP (Rotation around Tool Center Point; also TCPC, G43.4/G43.5) keeps the **tool tip** on the programmed path while the rotary axes move. Without RTCP, rotating the head/table moves the tool tip away from where you programmed it — the operator would have to hand-compute the compensation.

```
Without RTCP: program point = machine point → rotary move displaces the tool tip
With RTCP:    program point = tool TIP → the control solves the kinematics so the tip stays put
```

RTCP is what lets you program to the part surface and let the machine figure out the axis positions. Modern controllers (Fanuc G43.4, Heidenhain TCPM, Siemens TRAORI) all have it. A 5-axis program written assuming RTCP, run on a machine with RTCP off, crashes. Verify RTCP is active — it's the #1 5-axis setup error.

### Singularities — the kinematic trap

A **singularity** occurs when the tool axis aligns with a rotary axis such that the rotary position becomes indeterminate — typically when the tool points straight along the machine's primary rotary axis. Near a singularity:
- A tiny change in tool axis demands a HUGE, fast rotary move.
- The rotary axis "whips" — slams from one position to another to keep the tool axis correct.
- Result: surface gouge, dwell mark, or an over-speed alarm.

**Singularity management:**
1. **Avoid the pole** — program tool paths that don't drive the tool axis through the singular orientation.
2. **Singularity-aware CAM** — modern CAM (hyperMILL, Fusion, NX) detects + smooths the rotary motion through near-singular regions.
3. **Tilt away** — keep the tool axis a few degrees off the pure-axial orientation; the small lead/tilt avoids the singularity entirely.

PRISM's `prism_5axis:singularity_check` + `MultiAxisSingularity` engines model this — see [[cam-engine-wiring-bridge]] for the multi-axis wiring (cam + 5axis + safety triple).

### Tool-axis control — lead + tilt

The tool axis relative to the surface is set by two angles:
- **Lead angle** — tilt in the *direction of travel* (forward/back). Positive lead = tool leans into the cut.
- **Tilt angle** — tilt *perpendicular to travel* (side to side).

| Goal | Lead/tilt choice |
|---|---|
| Avoid the ball-nose dead center (zero SFM at the tip) | Lead 10-15° so the cut happens on the flank, not the tip |
| Maximize finish on a wall | Tilt to bring the flute, not the corner, onto the wall |
| Reach into a pocket without holder collision | Lead/tilt away from the colliding wall |
| Constant scallop on a sculptured surface | CAM varies lead/tilt continuously to hold engagement |

The ball-nose dead-center problem is the most common: at the exact tip, surface speed is zero → rubbing, not cutting → poor finish + accelerated wear. A few degrees of lead moves the contact to the flank where SFM is real.

### When 5-axis pays — and when it doesn't

**Pays:**
- Multi-side parts (one setup vs 3-5 setups → eliminates the tolerance-transfer stack-up; see [[part-setup-tolerance-stack-up-methods]])
- Deep features reachable only by tilting (shorter, stiffer tools — [[synthesis-rigidity-envelope]])
- Sculptured surfaces (blades, impellers, ports) — genuinely needs continuous tool-axis control
- Reduced setup labor at production volume

**Doesn't pay:**
- Simple prismatic parts a 3-axis machine handles in 1-2 setups
- When the shop lacks 5-axis CAM + post + operator skill (the machine alone isn't the capability)
- One-offs where programming time dominates

### Anti-patterns from the floor

- **"5-axis means simultaneous 5-axis."** No — 3+2 (positional) is 5-axis and is the right default. Most "5-axis parts" are 3+2 parts. Simultaneous is the specialist subset.

- **"RTCP is automatic."** It's a *mode* — G43.4/G43.5/TCPM must be active AND the machine's kinematic model must be calibrated. A program assuming RTCP on a machine with it off (or miscalibrated) crashes or gouges.

- **"The CAM handles singularities."** Modern CAM detects + smooths them — IF the post-processor + controller support the smoothed motion. Verify the prove-out (see [[machining-tactics-pre-cut-prep]]) actually runs the near-singular regions; that's where 5-axis crashes hide.

- **"Tilt the tool, get better finish."** Only if the tilt moves the cut off the ball-nose dead center AND doesn't introduce holder collision. Random tilt can make finish worse. Tilt with a reason (dead-center avoidance, wall access, scallop control).

- **"5-axis is always more rigid because tools are shorter."** Shorter tools are stiffer, yes — but simultaneous 5-axis moves the rotary axes *under cutting load*, and rotary-axis stiffness is often the weak link. 3+2 (clamped rotaries) keeps the rigidity; simultaneous trades some away. See [[synthesis-rigidity-envelope]].

### Tie-ins

- [[machining-tactics-pre-cut-prep]] — 5-axis prove-out (singular regions are where crashes hide)
- [[synthesis-rigidity-envelope]] — short-tool stiffness gain vs rotary-axis stiffness loss
- [[part-setup-tolerance-stack-up-methods]] — one-setup 5-axis eliminates the multi-setup stack
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — 5-axis strategies (port, blade, contour)
- [[cam-engine-wiring-bridge]] — multi-axis engine wiring (cam + 5axis + safety triple)
- [[tooling-toolholders-and-runout-control]] — short-tool stickout discipline

## Provenance

Distilled from the 5-axis subset of the 4245-tribal corpus + Machinery's Handbook 31e §Multi-Axis Machining + Sandvik/hyperMILL/Fusion 5-axis guides + Bohez 5-axis kinematics literature. Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-5AXIS-FUNDAMENTALS — **43rd canonical entry** of the wiki+tribal pivot. Tier-2 broad-domain (every advanced shop runs 5-axis); closes the 5-axis fundamentals gap.

System injection: `tribal-by-domain-inject` auto-surfaces on `5-axis`, `five axis`, `3+2`, `positional 5-axis`, `simultaneous 5-axis`, `RTCP`, `TCPC`, `G43.4`, `TCPM`, `TRAORI`, `singularity`, `tool axis`, `lead angle`, `tilt angle`, `ball-nose dead center` keywords. Zero new wiring required.

## Cross-references

- [[machining-tactics-pre-cut-prep]] — 5-axis prove-out
- [[synthesis-rigidity-envelope]] — short-tool vs rotary-axis stiffness
- [[part-setup-tolerance-stack-up-methods]] — one-setup eliminates the stack
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — 5-axis strategies
- [[cam-engine-wiring-bridge]] — multi-axis engine wiring
- [[tooling-toolholders-and-runout-control]] — stickout discipline
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
