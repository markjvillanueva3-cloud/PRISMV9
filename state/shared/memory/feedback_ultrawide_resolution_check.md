---
name: Ultrawide-first layout validation
description: User works on an ultrawide monitor. Check live resolution/viewport before building or validating UI so layouts are not tuned for generic half-width desktop.
type: feedback
---

The user works on an ultrawide monitor and wants that treated as a standing build/validation rule.

## Rule
Before doing meaningful frontend layout work:

- check the live viewport or browser resolution first
- assume ultrawide desktop is the default validation target unless the user says otherwise
- verify wide-screen fills, row spacing, and header proportions against that real width before calling the design done

## Why

Several calculator/header regressions happened because the UI was tuned against a generic desktop width or a constrained browser capture instead of the user's actual ultrawide setup.

## How to apply

- ask what the current resolution is only if it is unknown and the task depends on precision
- otherwise use live browser measurement/screenshot checks before finishing
- treat half-width, centered, or max-width-clamped layouts as suspicious until proven correct on ultrawide
