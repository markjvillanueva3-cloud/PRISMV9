# FUSION360-FULL-CAPABILITIES-ROADMAP: 5-Role Specialist Review

**Document:** `H:\prism\mcp-server\data\docs\roadmap\FUSION360-FULL-CAPABILITIES-ROADMAP.md`
**Reviewed:** 2026-04-03 | 734 lines | 8 milestones | 36 units | ~17 sessions

---

## ROLE 11: MACHINIST VALIDATOR — Score: 72/100

### CRITICAL Findings

1. **INTENT statements are inconsistent — some describe code, not machinist experience.**
   - Line 32: "After this session, PRISM's Fusion add-in enforces free/pro/ultimate access gating" — this describes what *code* does, not what a *machinist* experiences. A machinist INTENT should read: "A machinist can install PRISM and only sees features their license covers — no confusing grayed-out buttons or error popups for features they didn't pay for."
   - Line 150: "PRISM can discover and populate ALL parameters" — again, code perspective, not user perspective.
   - Line 209: "PRISM can inject optimized params..." — same issue.
   - **Good examples exist:** Line 92 ("A machinist installs PRISM Lite, sees a clean panel...gets physics-backed S/F recommendation instantly") and line 406 ("PRISM politely asks 'what makes your setup better?'") are excellent machinist-centric INTENTs. The rest should follow this pattern.

2. **Failure messages not specified anywhere.** The roadmap specifies ABORT_CRITERIA for developers but never defines what the machinist sees when something fails. For example:
   - Line 117: "S/F values off by >15% vs HSMAdvisor baseline" — what does the panel show the user? "Calculation failed"? A red warning? An explanation?
   - Line 316: "pre-check >5s latency" — what does the machinist see during a 5-second wait? No loading indicator is specified.
   - **Must define:** Error message templates, warning levels (red/yellow/green), and fallback behavior when physics calculations fail.

3. **Thin wall / deep pocket rules (lines 502-504) are hard-coded and not shop-configurable.**
   - "Remaining stock < 2mm, reduce feed by 30%" and "Z depth > 3x tool_diameter, reduce feed by 15%" — these are reasonable starting points but shops running different materials need different thresholds. Titanium thin walls need more conservative rules than aluminum. No mechanism to override.

### HIGH Findings

4. **Tier pricing not specified.** The roadmap defines 3 tiers (lines 8-10) but never states prices. For shop economics: Free tier must be genuinely useful (it is — basic S/F). Pro needs to be priced for a single-seat shop ($50-100/mo range is industry standard). Ultimate needs enterprise pricing discussion. Without pricing, "priced appropriately for shop economics" cannot be validated.

5. **S/F validation target of +/-10% vs HSMAdvisor (line 135) is appropriate** for roughing but may be too loose for finishing. Industry standard for finishing surface speed is +/-5% for aerospace. The roadmap should differentiate roughing vs. finishing tolerance bands.

6. **The "politely asks" learning dialog (line 415) could interrupt workflow.** A machinist mid-program doesn't want popups. The dialog should be deferred to end-of-session or a separate review panel, not inline during operation creation.

### MEDIUM Findings

7. **No mention of imperial units.** U.S. shops overwhelmingly use inches/IPM/SFM, not mm/min. The panel (line 103) shows "mm/min" — there must be a unit toggle. The mm-to-cm conversion for Fusion is mentioned (line 172) but no inch support is specified.
8. **Setup analysis warnings (line 362) use engineer language** ("Force ratio: Fc_actual / spindle_max_force"). A machinist needs: "WARNING: Cutting force at 80% of spindle limit — reduce stepdown or slow down."
9. **No offline mode specified.** Shops often have spotty internet. The free tier panel should work fully offline after initial activation.

---

## ROLE 12: FUSION 360 API ACCURACY REVIEWER — Score: 68/100

### CRITICAL Findings

1. **`adsk.core.Palette` reference (line 91) is correct** for creating HTML panels in Fusion 360. However, Palette-based add-ins are being deprecated by Autodesk in favor of the newer `adsk.core.CustomGraphics` and web-based panels. The roadmap should note this risk and plan for the Fusion API evolution.

2. **400+ params discovery target (line 158) is ambitious but plausible.** Fusion's `operation.parameters` API does expose parameters per operation type. However, not all parameters are writable via the API — some are computed/read-only (e.g., certain linking parameters are auto-calculated by Fusion's HSM kernel). The roadmap does not distinguish between readable and writable params. Attempting to inject into read-only params will silently fail or throw, and the roadmap has no error handling for this.

3. **`Tool.createFromJson` is not a real Fusion 360 API method.** The roadmap doesn't explicitly use this name, but the tool import flow (line 298, `POST /tool-import-assembly`) implies creating tools programmatically. Fusion's API for tool creation is `adsk.cam.Tool()` constructor with property-by-property assignment, or importing from `.tools` library files. Bulk programmatic tool creation is limited — Fusion expects tool libraries, not JSON injection. The 50-assembly batch import (line 301) may hit Fusion's single-threaded Python execution bottleneck.

4. **The mm-to-cm conversion issue (line 172) is correctly flagged** but understated. Fusion 360 internally uses centimeters for all geometry while displaying millimeters in the UI. This affects EVERY parameter that involves length: tool diameter, DOC, WOC, heights, linking distances, lead-in/out radii. A single missed conversion will produce values off by 10x. This needs a centralized conversion layer, not per-param handling.

5. **`/execute` endpoint for runtime parameter discovery (line 157)** — Fusion's `adsk.core.Application.executeTextCommand()` is undocumented and unsupported. Relying on it for production parameter discovery is fragile. Parameter names can change between Fusion versions without notice.

### HIGH Findings

6. **Python add-in architecture is correct** — Fusion 360 add-ins use Python 3.x with the `adsk` module. The `fusion360_api_server.py` approach of running a local HTTP server inside the add-in is a known pattern (used by NX Post Hub and others). However, Fusion add-ins run in a single thread and HTTP server requests block the Fusion UI. Long-running operations (engagement extraction at line 459, collision pre-check at line 310) will freeze Fusion. The roadmap needs async execution or background threading.

7. **Fusion's toolpath coordinate access (line 459-462)** — `adsk.cam.Toolpath` provides `getToolPathData()` which returns motion events, not raw G-code blocks. The roadmap describes parsing "G1, G2/G3, G0" which implies parsing post-processed output, not Fusion's internal toolpath data. These are two different things. If using Fusion's API, the data is motion events with coordinate pairs; if parsing G-code, it's post-processor dependent. The roadmap conflates these.

8. **Hybrid execution model (line 578-588)** — Fusion does not support injecting external G-code blocks into its toolpath sequence. Fusion's post-processor generates G-code as a complete unit per setup. "Merging PRISM blocks + Fusion blocks" would require post-processing the entire output and splicing, not integration at the Fusion API level. This is doable but the roadmap implies API-level integration that doesn't exist.

### MEDIUM Findings

9. **No mention of Fusion 360's API version compatibility.** Fusion updates monthly and API breaking changes occur. The add-in should pin to a minimum Fusion version.
10. **The CPS parser reference (line 372)** is correct — Fusion's post-processors use .cps (JavaScript-based). FusionCPSParserEngine parsing these is valid but complex; CPS files are full JavaScript programs, not declarative configs.

---

## ROLE 13: SECURITY REVIEWER — Score: 61/100

### CRITICAL Findings

1. **HMAC-SHA256 for JWT (line 41) is a symmetric algorithm.** The signing key must be embedded in the client (Python add-in or TypeScript bundle) for offline verification. A determined user can extract this key from the distributed binary and forge license tokens for any tier. **This is a fundamental architectural flaw for offline JWT validation.** Solutions:
   - Use RS256 (asymmetric) — embed only the public key in the client, keep private key on activation server.
   - Or accept that offline validation is advisory only and enforce server-side for critical operations.

2. **Machine fingerprint (line 41) is trivially spoofable.** Common fingerprinting methods (MAC address, disk serial, CPU ID) can all be changed or virtualized. The roadmap doesn't specify what constitutes the fingerprint or how it's generated. Without hardware TPM integration or platform-specific secure enclaves, machine fingerprint is a speed bump, not security.

3. **License file at `%APPDATA%/.../license.json` (line 55) — "license file unencrypted" is listed as an abort criterion** but the roadmap doesn't specify WHAT encryption. AES-256 with what key? If the key is in the source code, encryption is security theater. The key management strategy is completely unspecified.

4. **No license revocation mechanism.** Once a JWT is issued and validated offline, there's no way to revoke it until expiry. If a license is shared or stolen, the legitimate customer continues to be charged while pirates use the same token. Need: online revocation check at minimum on startup (with grace period for offline use).

### HIGH Findings

5. **Belt-and-suspenders (Python + TS) enforcement (lines 49-69) is correct in principle** but creates two attack surfaces instead of one. If either layer has a bypass, the attacker only needs to find one. The Python layer is more vulnerable because:
   - Python source is distributed uncompiled (readable)
   - `_check_tier()` decorator (line 53) can be monkey-patched at runtime
   - No code signing or integrity verification mentioned

6. **API endpoints on localhost:18360 (line 124) are unauthenticated within the local machine.** Any local process can call these endpoints. If the machine runs untrusted software (browser extensions, malware), they can access PRISM's full API. Need: at minimum a per-session token, ideally mutual TLS for localhost.

7. **No audit logging specified.** License validation events, tier access attempts, denied access — none of these are logged to a tamper-resistant store. Without audit logs, detecting license abuse is impossible.

### MEDIUM Findings

8. **Cloud CAM indexing (line 622-629) stores shop floor data in PostgreSQL.** No mention of encryption at rest, access controls per shop, or data isolation between customers. Shop floor data (part geometry, tooling, strategies) is highly sensitive IP.
9. **The learning engine stores override data (line 418)** keyed by material/operation/tool/machine. Cross-shop learning (fleet learning, line 10) implies this data leaves the shop. No consent mechanism, no data anonymization specified.
10. **No rate limiting on the activation endpoint (line 42).** Brute-force attacks against license activation are not addressed.

---

## ROLE 14: TESTING STRATEGY REVIEWER — Score: 76/100

### CRITICAL Findings

1. **180-case test matrix (line 656) uses only 5 ISO groups, not 6.** The roadmap references 6 ISO groups throughout (P/M/K/N/S/H — line 100, line 90) but the matrix formula is "3 tiers x 5 ISO groups x 4 strategy types x 3 machine types = 180." This means one ISO group is untested. At 6 groups it should be 216 cases. Either the matrix formula is wrong or group H (hardened steels) is excluded — which would be a critical gap since H materials are the most demanding.

2. **No edge case coverage specified for physics engines.** The roadmap should explicitly test:
   - NaN propagation: what happens when Kienzle kc1.1 is undefined for a non-standard material?
   - Division by zero: engagement_angle = 0 (tool not in cut), chip thickness = 0
   - Timeout: 3,600+ blocks in per-block physics — what's the timeout? What if it exceeds?
   - Negative values: negative stock-to-leave (line 190 mentions this as abort criterion but not as a test case)
   - Collision false negatives: the most dangerous failure mode — a missed collision that causes a crash

3. **Integration tests requiring live Fusion instance (line 658) are not CI-compatible.** Fusion 360 requires a GUI, an Autodesk account, and a Windows desktop. These tests cannot run in headless CI. The roadmap needs:
   - Mock/stub layer for Fusion API calls in CI
   - Separate "live integration" test suite run manually before release
   - Clear separation of unit tests (CI) vs integration tests (manual)

### HIGH Findings

4. **Golden comparison targets are well-specified** (line 666-669): S/F +/-10%, cycle time +/-15%, no physics violations. However, the reference baselines (HSMAdvisor, GWizard) are themselves approximations. The roadmap should specify which HSMAdvisor version/settings are the baseline, since HSMAdvisor's algorithms have changed between versions.

5. **Per-unit abort criteria are specific and good.** Every unit has >=3 abort criteria with concrete thresholds (e.g., ">0.01mm", ">15%", "<90% coverage"). This is well above average for roadmap specifications. However, abort criteria are developer-facing; there are no user-acceptance test criteria.

6. **Test files alongside engines (line 45, 68, etc.) — consistently specified.** Every unit that creates an engine also creates a corresponding test file. Good practice.

7. **No load/stress testing specified.** 95,608 tools in the catalog, 910 machines, 3,600+ blocks per program — what happens under load? Memory, CPU, response time under peak usage are unaddressed.

### MEDIUM Findings

8. **Controller dialect validation (line 670) lists 5 dialects** (Fanuc, Haas, Siemens, Mazak, Okuma) but PostProcessorPipelineEngine supports 20 dialects. The test matrix should cover all 20 or justify why 5 are sufficient.
9. **Exit gates specify omega_floor >= 0.85** (most milestones) and **0.90** (final milestone). This is a PRISM-internal metric — its correlation to actual quality is assumed but not validated.
10. **No regression test strategy.** When MS6 changes are made, how are MS2-MS5 features re-validated? No mention of regression suite.

---

## ROLE 15: PERFORMANCE REVIEWER — Score: 65/100

### CRITICAL Findings

1. **Per-block physics on 3,600 blocks (implied by line 467-476) has no latency budget.** Each block requires:
   - Kienzle force calculation (Fc = kc1.1 x h^(1-mc) x b)
   - SLD check against stability lobe diagram
   - Deflection check
   - Thermal compensation check
   - This is 4 calculations x 3,600 blocks = 14,400 physics evaluations. At 1ms each = 14.4 seconds. At 10ms each = 144 seconds (2.4 minutes). The roadmap specifies no target latency for the full per-block pipeline.

2. **95,608-tool catalog search (line 123) has a latency target of <2s** (line 127), which is reasonable. But the catalog is loaded how? In-memory? Indexed? If loaded into memory, at ~500 bytes/tool that's ~48MB. If searching via PostgreSQL, indexes must be pre-built. No specification of the search mechanism.

3. **Engagement extraction from toolpath (line 459)** requires parsing every motion segment and computing ae/ap geometrically. For a complex adaptive toolpath with thousands of arc segments, this is computationally expensive. No latency target specified. If this runs inside Fusion's single-threaded Python environment, it WILL freeze the UI for complex parts.

4. **No memory budget specified anywhere.** The system loads:
   - 95,608 tools (catalog)
   - 910 machines
   - 2,957 materials
   - 762 strategies
   - 3,819 tribal tips
   - Per-block engagement data for potentially 10,000+ blocks
   - Cloud CAM history index

   Total memory footprint is unestimated. Fusion 360 itself is memory-hungry (2-4GB typical). The add-in running inside Fusion's process shares this memory space.

### HIGH Findings

5. **Latency targets that ARE specified are reasonable:**
   - Collision pre-check <5s (line 316) — acceptable for a pre-CAM check
   - Tip retrieval <500ms (line 431) — good for UI responsiveness
   - Override detection <1s (line 396) — acceptable
   - Cloud history retrieval <2s (line 629) — acceptable

   But these cover only 4 of the ~20 endpoints. The remaining 16 have no latency targets.

6. **Batch limits are specified but not enforced:**
   - 50 assemblies per import (line 301) — good
   - But no batch limit on per-block optimization (could be 10,000+ blocks)
   - No batch limit on multi-setup planning (number of setups unbounded)
   - No batch limit on cloud indexing queries

7. **Monte Carlo tolerance stack (line 594) with >10K samples** for multi-setup planning. At what computational cost? Monte Carlo with 10K samples over a 6-setup datum chain with 20 tolerance features = 10K x 6 x 20 = 1.2M evaluations. This needs a time budget.

### MEDIUM Findings

8. **No unbounded loop risk identified,** which is positive. The per-block iteration is bounded by block count. The Monte Carlo is bounded by sample count. The SLD check is bounded by frequency range. Good structural design.
9. **Exponential backoff for reconnection (line 125)** is correctly specified but no maximum retry count or total timeout is given. Could retry indefinitely.
10. **Cloud indexing feature hash computation (line 628)** — "collisions >5%" is the abort criterion, implying the hash is lossy. At 5% collision rate with thousands of parts, false matches will degrade recommendations. Should target <1%.

---

## SUMMARY SCORECARD

| Role | Score | Verdict |
|------|-------|---------|
| 11 - Machinist Validator | 72 | Solid foundation but INTENT statements need machinist rewrite; failure UX unspecified |
| 12 - Fusion 360 API Accuracy | 68 | Several API assumptions are wrong or fragile; hybrid execution model needs rethinking |
| 13 - Security Reviewer | 61 | HMAC-SHA256 offline JWT is fundamentally flawed; license file encryption unspecified |
| 14 - Testing Strategy | 76 | Best-specified area; matrix formula has ISO group count error; no CI strategy for live tests |
| 15 - Performance Reviewer | 65 | Per-block physics has no latency budget; memory footprint unestimated; most endpoints lack targets |

**Overall: 68.4/100** — The roadmap is structurally excellent (dependency graph, abort criteria, 4-LOOP methodology, forge-triple pattern) but has significant gaps in security architecture, API accuracy, performance budgeting, and machinist-facing UX specification.

### Top 5 Must-Fix Items (across all roles):
1. **Replace HMAC-SHA256 with RS256 for JWT** — symmetric key in distributed binary is a showstopper
2. **Fix test matrix: 5 ISO groups should be 6** (or explicitly document why H is excluded)
3. **Add per-block physics latency budget** — 3,600 blocks x 4 calculations needs a target and a fallback
4. **Add centralized mm-to-cm conversion layer** — per-param handling will produce 10x errors
5. **Rewrite INTENT statements** for MS1, MS3, MS4, MS5 sessions to describe machinist experience, not code behavior
