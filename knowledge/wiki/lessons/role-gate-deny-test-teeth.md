# Role-gate deny-test teeth — a `role→200` allow test has NO teeth

**Source:** U-INBOX-INTEGRATIONS-AUTH (slot:hotel, commit 35959c2ec8, 2026-06-24). The 3-of-3 scrutiny arm C (R9-analyst) FAILed the unit TWICE while arms A+B PASSed — both catches were the same class.

## The trap

A route gated with `requireRole("lead","hr_manager","admin")` whose ONLY authed test is `lead → 200` is **untested**: `lead` also satisfies the baseline `verifyToken`, so the test passes **with OR without** the `requireRole` middleware. The gate can be silently dropped and the suite stays green.

```ts
// HOLLOW — passes whether or not DOC_WRITE_ROLES is on /doc/append:
it("lead POST /doc/append -> 200", ...)          // lead satisfies bare verifyToken too

// TEETH — fails the instant DOC_WRITE_ROLES is removed from /doc/append:
it("operator POST /doc/append -> 403", () => {
  expect(status).toBe(403);
  expect(captured).toHaveLength(0);              // engine never reached
})
```

## The rule

**Every role-gated write route needs its OWN `wrong-role → 403` deny test**, asserting `status===403` AND `captured.length===0` (engine not reached). Prove the teeth empirically: remove the gate → the deny test FAILS; restore → green. An allow-path (`role→200`) test is a *selectivity* control (not-a-blanket-403), NOT a gate-existence control.

## How it was found

The PRISM 3-of-3 gate (arms A holistic, B test-integrity, C silent-breakage/R9) — arms A+B both PASSed twice; only arm C (weighted to R9/regression) caught (round 1) `/doc/migrate` missing the gate entirely, then (round 2) `/doc/append` having the hollow allow-only test. **This is why the gate is 3 independent arms, not 1** — the R9-weighted analyst sees what the holistic reviewers rubber-stamp.

Related: [[reference_inbox_integrations_auth_2026_06_24]] · [[feedback_wire_test_validate_all_galaxies]] (R9 — tests verify intent not behavior).
