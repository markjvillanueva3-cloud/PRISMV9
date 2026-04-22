---
name: Backend perfection before frontend
description: User explicitly wants backend EDM physics and optimization perfected before any frontend work
type: feedback
---

Backend must be perfected before building frontend. Skip frontend hardening work (like WEDM-HARDEN S6) in favor of backend physics accuracy.

**Why:** The parameter optimization, material handling, and G-code generation must produce correct results before wrapping a UI around them. Incorrect backend + polished frontend = dangerous.

**How to apply:** When choosing between frontend tasks (React components, accessibility, canvas) and backend tasks (engines, physics, parameter optimization, material databases), always prioritize backend. S6 (Frontend Hardening) should be deferred until backend is production-quality for the shop's actual material portfolio.
