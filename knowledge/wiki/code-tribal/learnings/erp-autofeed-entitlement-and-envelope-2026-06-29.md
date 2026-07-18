---
title: A fail-closed engine gate is bypassable if the route forwards a caller-supplied flag; and the recurring prism_business {type,text} envelope dead-panel
tags: [security, entitlement, fail-closed, envelope, dead-panel, quoting, erp, prism_business, slimResponse, R9, scrutiny, charlie]
slot: charlie
date: 2026-06-29
commits: [eb091d2a54, c3c4f700ab]
---

# Two findings the 3-of-3 caught on the ERP-autofeed unit

The ERP/employee-portal autofeed (`ErpAutofeedProjectionEngine` + `ErpAutofeedWriterEngine`
composing the 28-stage `QuoteToShipOrchestratorEngine`) passed per-file scrutiny but the
end-of-task 3-of-3 gate FAILED it on two real findings. Both are reusable classes.

## Finding 1 (P1) -- a fail-closed ENGINE gate is bypassable if the ROUTE feeds it a caller-supplied flag

`ErpAutofeedProjectionEngine` withholds the CAD/CAM program paths + setup sheet unless
`input.cadcam_paid === true` (a deliberate, exact-boolean fail-closed gate). But the wired
route forwarded the request body verbatim:

```ts
// BEFORE (bypassable):
router.post("/erp-autofeed", verifyToken, async (req, res) => {
  res.json(await callTool("prism_business", "quote_to_ship_erp_autofeed", req.body ?? {}));
});
```

`req.body.cadcam_paid` flows straight to the engine's gate -> any authenticated caller could
self-assert `cadcam_paid: true` in the POST body and obtain the real CNC program paths +
setup sheet **without paying for the option**. The engine's "fails closed" invariant was
real but **structurally dead at the wired surface**.

### Fix

Strip the body-supplied flag and source the entitlement ONLY from the verified token:

```ts
const { cadcam_paid: _ignored, ...safeBody } = req.body ?? {};
const cadcamEntitled = resolveCadCamEntitlement(req); // reads req.userPermissions (set by verifyToken)
const body = cadcamEntitled ? { ...safeBody, cadcam_paid: true } : safeBody;
```

This mirrors the `actor_role`-from-token rule the commit route already used. Lesson:

> **A fail-closed engine gate is only as strong as the wired surface that feeds it.** If a
> route forwards a caller-supplied flag (`cadcam_paid`, `actor_role`, `is_admin`, an id) straight
> into an authorization/entitlement check, the gate is bypassed. Source EVERY entitlement, role,
> and identity from the VERIFIED token (`req.userId`/`req.userRoles`/`req.userPermissions`),
> never from the request body. Sibling of the anon-cost-leak class and the invertible-input
> class (machine_invest_roi).

## Finding 2 (P0) -- the recurring prism_business {type,text} slimResponse envelope dead-panel

`prism_business` returns `slimResponse({type, text})` with **no `content[]` wrapper**. The
`callTool` helper peels `result?.content?.[0]?.text` -- which a slimResponse does NOT have --
so it returns the BARE `{type:"text", text:"<json>"}` envelope. The route does
`res.json(await callTool("prism_business", ...))`, so the FE receives that bare envelope, NOT
a `{ok, data}` DataResponse. The FE client read `.data` off it -> `undefined` -> the ERP panel
rendered **permanently empty**.

This is the EXACT same class already bitten on estimate-flow, quote-compat-redact, and
RFQInbox -- now ERP-autofeed. The fix is the same: the FE client must `unwrapQuotingBody(raw)`
(which parses the `.text` payload) and surface it in `.data`.

### Why per-file scrutiny missed it (R9)

My FE test mocked the client function's return as the convenient `{data}` shape -- so the test
was green while production was dead. The regression test now mocks the PRODUCTION `{type,text}`
wire (`mockFetchJson.mockResolvedValue({type:"text", text: JSON.stringify(payload)})`) and
asserts `.data.job_id === "JOB-1"` (which would be `undefined` if reading `.data` off the bare
envelope). Lesson:

> **Mock the PRODUCTION wire shape, not the convenient one.** Any route doing
> `res.json(await callTool("prism_business", ...))` returns the bare slimResponse `{type,text}`
> envelope; the FE client MUST `unwrapQuotingBody`. A test that mocks `{data}` is green while the
> panel is dead. (prism_intelligence returns `content[]` -> callTool DOES peel it -> different;
> the envelope class depends on the DISPATCHER, not the route.)

## Found-by

3-of-3 scrutiny gate (arm A P1 entitlement; arm C P0 envelope) on commit eb091d2a54. Both
closed in c3c4f700ab; re-run 3-of-3 cleared (all arms PASS). 39 backend + 35 FE tests green.
