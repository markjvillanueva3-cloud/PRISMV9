---
title: A segregation-of-duties guard must fail closed for an unidentified actor
tags: [security, segregation-of-duties, fail-closed, quoting, traveler, checklist, R12, scrutiny]
slot: charlie
date: 2026-06-29
commits: [e44fa1c398, 8a724cac51]
---

# SoD guard must fail closed -- not degrade open for an unresolvable identity

## Context

`JobChecklistEngine` (the per-job/per-step/per-item check-off store shipped with
the auto-generated print->shipping job traveler, commit e44fa1c398) enforces a
department segregation-of-duties guard: a non-supervisory employee may only check
items on a step whose department matches the employee's department.

The 3-of-3 scrutiny gate's arm C (analyst) caught a real gap the other two arms
missed: the guard **degraded OPEN**.

## The bug

```ts
// resolveEmployee returns { department: "", role: "" } when neither an explicit
// override nor an EmployeeEngine record resolves the employee.
const { department: empDept, role: empRole } = this.resolveEmployee(input);
if (!isSupervisor) {
  const stepHrDept = TRAVELER_DEPT_TO_HR_DEPT[step.department];
  if (empDept && stepHrDept && empDept !== stepHrDept) {   // <-- empDept falsy -> SKIPPED
    throw new Error(...);
  }
}
```

When `empDept` was empty (an unknown `employee_id` with no `employee_department`
override), the `if (empDept && ...)` short-circuited to false -> the guard was
**skipped entirely** -> an unidentified actor could check any non-sign-off item on
any department. The HTTP route also passes `employee_department` straight from the
request body, so a caller could self-assert any department. The inspector-gate
sign-off guard still held (an empty role is not in `INSPECTION_ROLES`), so the
worst case was non-sign-off items -- but a SoD guard that opens for an
unidentified actor is the wrong default regardless.

## The fix (8a724cac51)

Fail **closed**: a non-supervisory actor with no resolvable department is
REJECTED, not allowed.

```ts
if (!isSupervisor) {
  const stepHrDept = TRAVELER_DEPT_TO_HR_DEPT[step.department];
  if (!empDept) {
    throw new Error(`... has no resolvable department; supply employee_department
      (or register the employee) -- cannot check a department-scoped item without
      an identified department`);
  }
  if (stepHrDept && empDept !== stepHrDept) { throw new Error(...); }
}
```

Supervisory roles still bypass (by design). Added a fail-closed regression test
that fails on revert; live-proven on :3199 (a GHOST employee with no department
is denied; a real machining operator with `employee_department` still passes).

## Lesson

- **A security/authorization guard must default to DENY for an unidentified
  actor.** "If we can identify a violation, block it" is the wrong frame -- the
  right frame is "if we cannot identify the actor as authorized, block it." An
  `if (resolvedAttribute && violatesPolicy)` check silently opens the moment the
  attribute fails to resolve. Invert it: deny on unresolved identity FIRST, then
  check the policy on the resolved attribute.
- **The 3-of-3's analyst arm (silent-breakage / I/O-security weighted) is what
  catches this class** -- the holistic + test-integrity arms both PASSed; only the
  arm explicitly looking for "can this be bypassed / does it fail open" found it.
  Keep all three arms genuinely independent.
- Sibling of the anon-cost-leak class (`optionalToken` never rejects anon): both
  are "the guard's default branch is permissive." The fix is the same shape --
  make the default branch deny.

## Found-by

3-of-3 scrutiny gate, arm C (code-analyzer), on commit e44fa1c398. Closed same
session in commit 8a724cac51.
