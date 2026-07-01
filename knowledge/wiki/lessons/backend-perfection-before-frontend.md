---
title: "Backend perfection before frontend"
name: backend-perfection-before-frontend
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_backend_before_frontend.md
promoted_at: 2026-06-06T04:55:44.614Z
source_refs: 4
---

# Backend perfection before frontend

Backend must be perfected before building frontend. Skip frontend hardening work (like WEDM-HARDEN S6) in favor of backend physics accuracy.

**Why:** The parameter optimization, material handling, and G-code generation must produce correct results before wrapping a UI around them. Incorrect backend + polished frontend = dangerous.

**How to apply:** When choosing between frontend tasks (React components, accessibility, canvas) and backend tasks (engines, physics, parameter optimization, material databases), always prioritize backend. S6 (Frontend Hardening) should be deferred until backend is production-quality for the shop's actual material portfolio.

## Source

Promoted from memory [[feedback_backend_before_frontend]] (referenced 4x across the vault). The memory remains the editable source of truth.
