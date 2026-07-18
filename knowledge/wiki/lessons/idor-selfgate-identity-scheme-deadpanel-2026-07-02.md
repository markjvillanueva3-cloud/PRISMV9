---
title: A route self-gate keyed on target===userId dead-panels self-service when the id vocabularies differ (U-ERP-IDOR-SELFGATE)
date: 2026-07-02
slot: hotel
tags: [lesson, security, idor, auth, dead-panel, R9, R12, R16, hotel-erp]
commits: [2c28567eb5, 201feddd44]
---

# An IDOR self-gate that compares an EMP-* target against a USR-* auth id 403s 100% of legitimate self-service

## Symptom
The layer-2 IDOR self-gate (U-ERP-IDOR-SELFGATE) added `requireSelfOrPrivileged` to
self-service ERP/portal routes, comparing the request's `employee_id` target against
`req.userId`. Both scrutiny arms FAILed it: `req.userId` is a `USR-*` auth id (AuthEngine),
while the FE sends `EMP-*` employee ids -- they never match, so every non-privileged
self-service call would 403. Not a leak (fail-closed), but a total availability regression:
the gate locks out the exact users it exists to protect.

## Why the test was green (R9)
The test sent `employee_id === userId` ("test-user") -- a coincidence impossible in production.
A mocked identity contract that happens to coincide is not the production identity contract.
Corroborated independently by `business/MEMORY.md:143` (AuthUser has no employee_id field).

## Second P1 (same commit)
`/pto/request` had allow-only test coverage -- dropping its gate left the suite green (the
false-green class). Every gated route needs its own deny-direction (403) test; mutation-proven:
neutralizing the deny check fails 6 (hotel) + 2 (shopLive) tests.

## Fix
`EmployeeEngine.findByAuthUserId(authUserId)` (null-safe linear scan) resolves the caller's OWN
employee id via the `auth_user_id` link. "self" = {resolved employee_id, req.userId}. The 403
fires ONLY when the caller's employee identity is KNOWN (mapping resolved) AND the target is a
proven peer. When no mapping resolves (the current state -- `auth_user_id` is null on all 8
canonical seeds), the gate **DEGRADES to verifyToken-only** -- never a dead-panel, still
fail-closed on the anon axis, auto-engaging the instant the mapping is wired. Tests seed a
linked employee via `update()` (create() forces auth_user_id:null) so the deny path exercises
REAL resolution, plus a degrade-path test (unmapped userId -> 200 for a peer).

## Standing rules
1. A route self-gate keyed on `target === userId` is DEAD unless userId IS the target's
   identity vocabulary. Resolve the caller's DOMAIN identity from the auth id via the canonical
   link field; never assume auth-id == domain-id.
2. **Degrade, don't dead-panel:** a security check you cannot perform (missing mapping) should
   degrade to the prior behavior, not 403 -- fail-closed on the axis you can prove (anon),
   inert-but-documented (R12) on the axis you can't, auto-engaging when the dependency lands.
3. Every gated route needs a deny (403) test; an allow-only test survives a dropped gate.
4. Seed the REAL identity link in tests; a userId===employee_id coincidence is the masking bug.

## Open residue
erp.ts:56-67 `requireSelfOrAdmin` STILL uses the naive compare -- it re-opens this exact
dead-panel once `auth_user_id` is wired (task U-ERP-CLOCK-SELFGATE-HARDEN; clone the hardened
helper, consider hoisting to middleware/auth.ts -- 3 copies now). The identity mapping itself
(populate auth_user_id) is an india/operator dependency; until then IDOR enforcement is
aspirational, not active.

Related: [[baseline-guard-second-vocabulary-2026-07-02]] (same session, same R16 "first pass
leaves gaps the gate catches" pattern).
