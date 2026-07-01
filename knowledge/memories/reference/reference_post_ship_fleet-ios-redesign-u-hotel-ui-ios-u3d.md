---
name: reference_post_ship_fleet-ios-redesign-u-hotel-ui-ios-u3d
description: Auto-distilled learnings from shipping FLEET-IOS-REDESIGN/U-HOTEL-UI-IOS-U3D (commit 53515e1e7). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.856Z
aliases: reference_post_ship_fleet-ios-redesign-u-hotel-ui-ios-u3d
---


# FLEET-IOS-REDESIGN/U-HOTEL-UI-IOS-U3D

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-IOS-REDESIGN]/U-HOTEL-UI-IOS-U3D (slot:hotel): close the accent split U3c introduced -- extend the accent token to the remaining INTERACTIVE surfaces so the dial is coherent across all controls, not just primary buttons. TabButton active chrome (border/bg/text/focus-ring) + Stepper active dot (bg-accent/text-accent-fg) + Input/Select focus border+ring all move off hardcoded cyan-300 to accent/accent-fg. No more systemBlue-button-vs-cyan-tab split in iOS mode; semantic tones (emerald done-step) preserved. BUILD-VERIFIED the new opacity classes emit (arbitrary bg-accent/[0.14] -> rgb(var(--accent-rgb)/0.14), ring-accent/35,/60, border-accent/30). 37/37 web tests (WorkspacePrimitives 26->28 +TabButton/Stepper accent locks), tsc clean

**Shipped:** 2026-06-10T12:42:30-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-ios-redesign-u-hotel-ui-ios-u3d]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._