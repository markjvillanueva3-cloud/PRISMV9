# SECURITY AUDIT: PRISM Employee/HR/Job Tracking Plan
**Auditor Role:** Security & Auth Vulnerability Assessment
**Plan Reference:** C:\Users\Mark Villanueva\.claude\plans\serene-meandering-prism.md
**Date:** 2026-03-31
**Status:** PLAN MODE (findings only, no execution)

---

## CRITICAL FINDINGS (3)

### CRIT-1: In-Memory Token Storage — Tokens Lost on Restart, No Revocation Support
**Location:** `H:\prism\mcp-server\src\engines\AuthEngine.ts`, lines 131-132, 419-423
**Severity:** CRITICAL
**Impact:** Revoked/expired tokens remain valid if app restarts; logout doesn't invalidate access; token rotation during restart leaks old tokens

**Attack Vector:**
1. User logs in, receives `access_token` + `refresh_token`
2. Admin tries to revoke user's session (line 345: `revokeSession()`)
3. `revokeSession()` only marks `sessions` as inactive, NOT the `tokens` Map
4. If app restarts, all `tokens` Map entries are lost, BUT user's old token is still "valid" in memory until its TTL expires
5. User can still make API calls with old token after logout/session revocation

**Scenario:** Disgruntled employee gets fired → admin calls `revokeSession()` → employee still has valid token → queries payroll data for revenge

**Fix Required:**
- Move token storage to persistent backend (Redis or DB)
- Implement token blacklist/revocation list (even in-memory Bloom filter as fallback)
- On `revokeSession()`, delete corresponding tokens from Map
- On restart, reload revoked token list from DB

**Proof of Concept:**
```javascript
// AuthEngine.login() → issues token "ABC123"
// Admin calls AuthEngine.revokeSession(sessionId) → only marks sessions map
// tokens.get("ABC123") still returns { user_id, expires_at, type: "access" }
// App restarts
// tokens map is now empty BUT old token wasn't in DB, so no revocation record
// User still has "ABC123" token in browser localStorage
// API call with "ABC123" fails because tokens map is empty
// Actually, this is SEMI-OK because restart clears it — BUT...
// If there's a load balancer with multiple server instances,
// other instances still have the token cached!
```

**Recommended Fix Priority:** CRITICAL - implement immediately before prod deploy

---

### CRIT-2: Missing RBAC on Payroll & HR Endpoints — shop_floor User Can Access /payroll-run, /employee-create
**Location:** `H:\prism\mcp-server\src\routes\erp.ts`, lines 113-199
**Severity:** CRITICAL
**Impact:** Role-based access control NOT enforced on ANY ERP route. Any authenticated user (including shop_floor) can:
- Create/edit employees (line 114-118: `employee_create`, `employee_search`)
- Run payroll (line 121: `payroll_run`)
- Create invoices (line 124-125: `invoice_create`, `invoices`)
- Access GL/financial records (lines 155-163)
- Create/update purchase orders (lines 146-152)
- View HR compliance (line 194: `hr_compliance_alerts`)

**Attack Vector:**
1. Shop floor operator logs in with credentials (AuthEngine allows login for any role)
2. No role check on POST `/employee-create`
3. Operator creates fake employee "phantom_worker" with `rate: 200/hr`
4. No role check on POST `/payroll-run`
5. Operator runs payroll, phantom employee gets paid
6. Finance doesn't notice due to lack of HR manager approval gate

**Scenario:** Retail payroll fraud — operator creates 10 ghost employees, runs payroll monthly, diverts $50k

**Root Cause:**
- All routes in `erp.ts` use `bizRoute()` helper which does NOT call `verifyToken()` or `requireRole()`
- Routes should be wrapped: `router.post("/payroll-run", verifyToken, requireRole("hr_manager"), bizRoute(...))`

**Proof of Concept:**
```typescript
// Line 121: router.post("/payroll-run", bizRoute(callTool, "payroll_run"));
// This calls bizRoute WITHOUT any middleware, so:
// - No verifyToken() → req.userId is undefined
// - No requireRole() → any role can POST
// - callTool("prism_business", "payroll_run", req.body) runs with no auth check

// Expected correct pattern:
// router.post("/payroll-run", verifyToken, requireRole("hr_manager"), bizRoute(...));
```

**Fix Required:**
- Wrap ALL ERP routes with `verifyToken` middleware (to extract user info)
- Add role gates to sensitive endpoints:
  - Payroll, GL, invoicing: `requireRole("admin", "hr_manager")`
  - Employee CRUD: `requireRole("admin", "hr_manager")`
  - PO/GL: `requireRole("admin", "accountant")`
  - QA/compliance: `requireRole("admin", "quality", "hr_manager")`
  - Job/capacity: `requireRole("admin", "lead", "operator")`

**Code Pattern (fix):**
```typescript
// Line 104-105 (current — BROKEN):
router.post("/shift-clock-in", bizRoute(callTool, "clock_in"));

// Fixed:
router.post("/shift-clock-in", verifyToken, requireRole("operator", "lead", "admin"), bizRoute(callTool, "clock_in"));

// Payroll (SENSITIVE):
router.post("/payroll-run", verifyToken, requireRole("admin", "hr_manager"), bizRoute(callTool, "payroll_run"));
```

**Recommended Fix Priority:** CRITICAL - all routes affected, high-impact data exposure

---

### CRIT-3: auth_user_id Linking Allows Privilege Escalation if Employee Record Not Locked to Current User
**Location:** `H:\prism\mcp-server\src\engines\EmployeeEngine.ts` (not shown but referenced in plan, line 32)
**Severity:** CRITICAL
**Impact:** The plan links `auth_user_id` in employee table to enable "login → fetch employee" workflow. BUT if employee records are mutable by users or have weak edit gates, an attacker can:
1. Create/control an employee record with `clearance_level: "admin"`
2. Register an auth user
3. Link that auth user to the admin employee via UPDATE employee SET auth_user_id = ? WHERE id = ?
4. Login with that auth user → automatically get admin clearance

**Attack Vector (Scenario):**
1. Attacker creates new auth user "hacker" (POST /register)
2. Attacker (if they have any employee CRUD access) or admin account exists and is compromised
3. Attacker runs: UPDATE employees SET auth_user_id = (SELECT id FROM users WHERE username='hacker') WHERE id = '123' (admin employee)
4. Attacker logs in as "hacker"
5. AuthContext fetches employee by auth_user_id → finds admin employee
6. Attacker is now admin

**Root Cause:**
- Plan says "call employee by auth_user_id" (line 61 in AuthContext spec) but doesn't specify:
  - Who can UPDATE auth_user_id?
  - Can shop_floor users call this endpoint?
  - Is there a mutual agreement check (employee must approve linking)?

**Fix Required:**
- Only admins/HR managers can assign `auth_user_id` to employees
- Implement mutual linking: employee must opt-in or admin explicitly pairs them with explicit audit log
- On employee DELETE/DISABLE, cascade auth_user deactivation
- Add audit log to employee auth_user_id changes
- Validate that `auth_user_id` is NOT already linked to another employee (UNIQUE constraint)

**Recommended Fix Priority:** CRITICAL - privilege escalation vector

---

## HIGH FINDINGS (4)

### HIGH-1: No Rate Limiting on /login Endpoint — Brute Force Password Attack Possible
**Location:** `H:\prism\mcp-server\src\engines\AuthEngine.ts`, lines 180-239 (login method)
**Severity:** HIGH
**Impact:** Lockout logic is IN AuthEngine (lines 195-204), but there's no rate limiting at HTTP layer. Attacker can:
1. Make 1000 POST /login requests/second with different passwords
2. Each triggers crypto.pbkdf2Sync() which is intentionally slow (100,000 iterations)
3. Server is DOSed; legitimate users can't log in due to slowdown

**Attack Scenario:** Attacker targets a known employee (e.g., "jsmith") with top 10,000 common passwords in parallel

**Current Lockout Logic (lines 217-219):**
- 5 failed attempts → 15-minute lockout
- But HTTP layer has NO rate limiting, so:
  - Attacker can probe different usernames in sequence
  - Attacker can DOS with 5 attempts per username × 1000 usernames = 5000 failed auths

**Fix Required:**
- Add express-rate-limit middleware on /login: max 5 attempts per IP per 15 min
- Or: implement exponential backoff per IP
- Log failed login attempts to DB for forensic analysis
- Return generic "Invalid credentials" for both user-not-found AND wrong password (no username enumeration)

**Recommended Fix Priority:** HIGH - but not blocking since base lockout logic exists

---

### HIGH-2: Clearance Hierarchy Not Enforced — "lead" User Can Create "admin" Employee
**Location:** Plan lines 31, 75-77, and implied in EmployeeEngine
**Severity:** HIGH
**Impact:** Plan defines clearance_level enum: `"shop_floor" | "lead" | "hr_manager" | "admin"`. But if POST /employee-create doesn't validate that:
- User creating employee cannot assign clearance_level ≥ their own level

Attack:
1. User with clearance_level="lead" calls POST /employee-create with `clearance_level: "admin"`
2. Employee created with admin access
3. Attacker links that employee to their account → privilege escalation

**Root Cause:**
- Employee creation endpoint doesn't validate requester's clearance level
- No hierarchy check like: `if (requester.clearance < requested_employee.clearance) throw FORBIDDEN`

**Fix Required:**
- Add validation: user creating employee must have `clearance ≥ requested clearance`
- Or: restrict non-admin users to creating only `shop_floor` or `lead` level employees
- Better: only `admin` + `hr_manager` can assign clearance levels (operators just clock in/out)

**Recommended Fix Priority:** HIGH - easily bypassed privilege escalation

---

### HIGH-3: Session ID Not Validated on Each Request — Session Hijacking Possible
**Location:** `H:\prism\mcp-server\src\middleware\auth.ts`, lines 33-57 (verifyToken)
**Severity:** HIGH
**Impact:** Auth middleware validates the access token but does NOT cross-check it against an active session. Attacker who steals a token can:
1. Use stolen token indefinitely (until expiry) even if victim's session was revoked
2. Session revocation (line 345: revokeSession) marks AuthSession as inactive, but verifyToken doesn't check it

Attack Scenario:
1. Employee logs in → gets session_id "SES-ABC123" and access_token "TOKEN-XYZ"
2. Employee's session is revoked (by admin) → AuthSession.is_active = false
3. Attacker with TOKEN-XYZ still makes requests
4. verifyToken() checks tokens.get("TOKEN-XYZ") — STILL VALID (no session check)
5. Request succeeds even though session was revoked

**Root Cause:**
- `verifyToken()` (line 376) checks token validity but doesn't validate corresponding session.is_active
- No session_id in the token payload, so verifyToken can't cross-check

**Fix Required:**
- Embed `session_id` in access token payload
- On verifyToken, after token validation, also check: `sessions.get(session_id).is_active === true`
- If session revoked, return 401

**Proof of Concept:**
```typescript
// AuthEngine.issueToken (line 417) currently returns:
// { access_token: "TOKEN-XYZ", refresh_token: "...", user_id: "...", roles: [...] }
// NO session_id included

// Fix: include session_id:
const token = {
  access_token: accessToken,
  session_id: session.session_id,  // ADD THIS
  user_id: user.id,
  roles: user.roles,
  // ...
};

// Then in verifyToken (middleware/auth.ts), add session check:
const sessionData = authEngine.getSession(tokenData.session_id); // new method
if (!sessionData?.is_active) return 401; // session revoked
```

**Recommended Fix Priority:** HIGH - session revocation bypass

---

### HIGH-4: PII Exposure in Error Messages — Payroll Data Disclosed on 500 Error
**Location:** `H:\prism\mcp-server\src\routes\erp.ts`, lines 18-25
**Severity:** HIGH
**Impact:** The `bizRoute()` error handler returns raw error.message:
```typescript
} catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
```

If payroll engine throws an error like:
```
"Cannot calculate OT for employee Jane Smith (EMP-456) with salary $85,000 — no tax ID on file"
```

This exposes:
- Employee name
- Employee ID
- Employee salary
- Tax status

GDPR/CCPA violation potential; dangerous for insider threats to gather employee salary data

**Fix Required:**
- Log full error to server log (Winston) with request context
- Return generic error to client: `{ error: "An error occurred. Reference: ERR-XYZ-123 for IT support" }`
- Include error reference code for support to lookup in logs
- Implement error sanitization middleware that scrubs PII before response

**Recommended Fix Priority:** HIGH - compliance + privacy issue

---

## MEDIUM FINDINGS (3)

### MED-1: Token Expiry Not Refreshed on API Activity — Fixed 1-Hour Window Allows Zombie Access
**Location:** `H:\prism\mcp-server\src\engines\AuthEngine.ts`, lines 114, 422
**Severity:** MEDIUM
**Impact:** Access tokens have fixed 1-hour TTL (line 114: `ACCESS_TOKEN_EXPIRY_SEC = 3600`). No sliding window / activity refresh.

Scenario:
1. User logs in at 08:00, gets token valid until 09:00
2. User actively works until 08:50
3. User steps away (bathroom, break) for 15 minutes, returns at 09:05
4. All tokens have expired; user must re-authenticate
5. OR: if frontend doesn't auto-refresh, user doesn't realize they're logged out until they try to save data

This is UX pain but also a security gap: if user left session open, they must re-auth, but if they don't, silent failures happen.

**Fix Required:**
- Implement sliding window: each successful API call refreshes token TTL
- Or: implement separate session-timeout UI (5-min warning before logout)
- Return 401 with specific code: `{ error: ..., code: "TOKEN_EXPIRED" }` so frontend can prompt re-auth gracefully

**Recommended Fix Priority:** MEDIUM - low risk but good practice

---

### MED-2: Multi-Machine / Load Balancer Token Inconsistency — No Cluster-Wide Revocation
**Location:** `H:\prism\mcp-server\src\engines\AuthEngine.ts` (singleton, line 453)
**Severity:** MEDIUM
**Impact:** If PRISM scales to multiple servers behind a load balancer:
- AuthEngine is a singleton PER PROCESS
- Each server has its own tokens Map
- Admin revokes user on Server-A: `revokeSession(sessionId)` → Server-A's tokens map updated
- User makes request to Server-B: token still valid on Server-B's authEngine instance
- User still has access

Fix Required:
- Use Redis (or shared session store) for tokens instead of in-memory Map
- Even for MVP (single server), future-proof the architecture

**Recommended Fix Priority:** MEDIUM - architectural debt, not critical for single-server MVP

---

### MED-3: No Audit Logging on Sensitive Operations — Payroll Runs, Employee Creates Not Logged
**Location:** `H:\prism\mcp-server\src\routes/erp.ts` (all routes) + `H:\prism\mcp-server\src\engines\AuthEngine.ts` (login/session)
**Severity:** MEDIUM
**Impact:** Cannot detect who created ghost employees, who ran payroll, when sensitive data was accessed. Compliance violation (SOC2, ISO 27001).

Required by GDPR/HIPAA:
- All employee data modifications must be logged with: who, when, what changed, from where (IP)
- All payroll runs must be logged with: who approved, timestamps, amounts
- All login/logout events must be logged

Fix Required:
- Add audit logging to every business endpoint (call a separate AuditEngine)
- Log: timestamp, user_id, action, params, result, IP address
- Immutable append-only log (can't modify historical records)

**Recommended Fix Priority:** MEDIUM - compliance requirement, not product-breaking but mandatory for production

---

## SUMMARY TABLE

| ID | Severity | Category | Fix Effort | Blocking |
|----|----|----|----|---|
| CRIT-1 | CRITICAL | Token Storage | 4h | YES — must fix before DB wiring |
| CRIT-2 | CRITICAL | RBAC | 2h | YES — blocks all routes |
| CRIT-3 | CRITICAL | Privilege Escalation | 3h | YES — employee linking unsafe |
| HIGH-1 | HIGH | Brute Force | 1h | NO — can add after CRIT fixes |
| HIGH-2 | HIGH | Clearance Bypass | 1h | YES — related to CRIT-3 |
| HIGH-3 | HIGH | Session Hijacking | 2h | YES — revocation bypass |
| HIGH-4 | HIGH | PII Exposure | 1h | YES — compliance risk |
| MED-1 | MEDIUM | Token Refresh | 2h | NO — UX nice-to-have |
| MED-2 | MEDIUM | Multi-Server | 3h | NO — future-proofing |
| MED-3 | MEDIUM | Audit Logging | 4h | NO — compliance add-on |

---

## RECOMMENDED EXECUTION ORDER

1. **CRIT-1 + CRIT-2 (4 hours)** — Fix token storage + RBAC gates on routes
   - Cannot proceed with Phase 2 auth wiring until RBAC works
   - Token storage must be persistent before multiInstance support

2. **CRIT-3 + HIGH-2 (3 hours)** — Secure employee auth_user_id linking
   - Validate clearance hierarchy
   - Add mutual linking + audit

3. **HIGH-3 (2 hours)** — Session revocation check in verifyToken
   - Embed session_id in token payload
   - Cross-validate on each request

4. **HIGH-1 + HIGH-4 (2 hours)** — Rate limiting + error sanitization
   - Lower risk but high-value additions

5. **MED-1/2/3 (optional for MVP)** — Token refresh, cluster support, audit logging
   - Can be post-launch, but plan for them

---

## NEXT STEPS (For Implementation Phase)

1. **Immediate:** Pause the Phase 2 auth wiring (AuthContext, ProtectedRoute) until CRIT fixes done
2. **Create subtasks for each CRIT/HIGH finding** with specific file paths and test cases
3. **Implement test coverage** for auth scenarios (brute force, session hijacking, privilege escalation)
4. **Review with security team** before proceeding to Phase 3/4 frontend work
5. **Conduct penetration test** (even informal) after fixes: attempt privilege escalation, token theft, brute force

---

**Audit Complete**
**Recommendation:** FIX ALL CRITICAL FINDINGS BEFORE PHASE 2 IMPLEMENTATION
Estimated effort: 13 hours for CRIT+HIGH; can run MVP with MEDs deferred post-launch.
