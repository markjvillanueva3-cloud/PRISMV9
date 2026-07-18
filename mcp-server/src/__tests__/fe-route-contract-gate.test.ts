/**
 * FE-route <-> dispatcher-action contract REGRESSION GATE (slot:sierra, U-FE-ROUTE-CONTRACT-CI-GATE).
 *
 * Rides the existing `npx vitest run` CI step (.github/workflows/ci.yml build-and-test). A mounted
 * Express route calling a dispatcher action that does not exist (-> z.enum reject -> silent HTTP
 * 200 + {error} the SPA's `if (!res.ok)` cannot detect) is a live footgun; this gate blocks any
 * PR that adds a NEW one.
 *
 * BASELINE-RATCHET (honest, not "0"): the verifier currently reports 22 live mounted P0s across
 * erp.ts / manus.ts / orchestration.ts / milling.ts / pipeline.ts (their dispatcher actions were
 * never built / renamed). These are enumerated below as KNOWN_MOUNTED_P0 -- TRACKED LIVE DEBT, owned
 * by the listed slots (NOT hidden). The gate asserts the current mounted-P0 set is a SUBSET of this
 * baseline, so it (a) fails on any NEW regression, (b) ratchets DOWN automatically as an owner fixes
 * one (the fixed entry simply disappears from the live set; remove it from the baseline in the same PR),
 * never UP.
 *
 * HISTORY (R12): an earlier version of this gate asserted p0Mounted === 0. That was WRONG -- it was
 * measured while the verifier's stripComments had a block-before-line bug (U-FE-VERIFIER-STRIPCOMMENTS-FIX)
 * that hid 58 of 75 mounted routers, so 22 real mounted P0s were mis-graded INFO. The 3-of-3 analyst arm
 * caught it. The verifier now sees the true mounted surface (75 routers); these 22 are the real backlog.
 *
 * The verifier (scripts/lib/fe-route-action-contract.mjs) is the single source of truth (22 unit tests).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { auditContract } from "../../../scripts/lib/fe-route-action-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../.."); // mcp-server/src/__tests__ -> repo root

/**
 * KNOWN live mounted P0s as of U-FE-VERIFIER-STRIPCOMMENTS-FIX (2026-06-19). Format: `file tool:action`.
 * Each is a real silent 200+{error}; the action genuinely does not exist on the dispatcher. Owners:
 * erp.ts -> hotel (business/ERP), manus.ts -> manus integration, orchestration.ts/pipeline.ts -> orchestration,
 * milling.ts -> foxtrot (mill). Fix = wire the real action OR honest 501 (see FE-ROUTE-WIRING routing spec),
 * then DELETE the entry here in the same PR. NEVER add a new entry to make a regression green.
 */
// ALL 22 baseline P0s RESOLVED 2026-06-21 (slot:sierra, U-FE-ROUTE-P0-ZERO). 7 were renamed actions ->
// rewired to the real action (milling speed_feed; erp troubleshoot_diagnose->prism_knowledge,
// kaizen_list_suggestions, jm_db_top_customers, academy_dashboard, academy_complete_lesson; pipeline
// roi_advisor_analyze). 15 were genuinely-absent dispatcher actions -> honest 501 (erp value_stream_map/
// dispatch_board/root_cause_list/a3_report_list/a3_report_get/cash_flow_summary/operations_kpis/
// margin_trends/oee_six_losses/timecard_audit_log; manus web_research/code_sandbox; orchestration
// unified_execute/classify/route). The 501'd endpoints name the missing action (owner: hotel/manus/
// orchestration) so the build path is explicit. Baseline is now EMPTY -- the gate enforces ZERO mounted
// P0s. NEVER add a new entry to make a regression green; fix the route (real action or honest 501).
const KNOWN_MOUNTED_P0 = new Set<string>([]);

const result = auditContract({
  routesDir: path.join(REPO, "mcp-server/src/routes"),
  dispatchersDir: path.join(REPO, "mcp-server/src/tools/dispatchers"),
  indexPath: path.join(REPO, "mcp-server/src/routes/index.ts"),
});

const key = (f: { file: string; tool: string; action: string | null }) => `${f.file} ${f.tool}:${f.action}`;
const mountedP0s = result.findings.filter((f) => f.severity === "P0");

describe("FE-route dispatcher-action contract gate (baseline-ratchet)", () => {
  it("introduces NO new mounted P0 beyond the documented baseline", () => {
    const novel = mountedP0s.map(key).filter((k) => !KNOWN_MOUNTED_P0.has(k));
    const detail = novel.length
      ? "NEW mounted route(s) call non-existent dispatcher actions (silent 200+{error}) -- fix the route " +
        "(real action or honest 501), do NOT add to KNOWN_MOUNTED_P0:\n" + novel.map((k) => `  ${k}`).join("\n")
      : "";
    expect(novel, detail).toEqual([]);
  });

  it("ratchets DOWN: every baseline entry still corresponds to a live P0 (else delete the stale entry)", () => {
    // When an owner fixes a baseline P0, its entry must be REMOVED here in the same PR. This catches a
    // stale baseline (an entry that no longer reproduces) so the gate can never silently over-permit.
    const live = new Set(mountedP0s.map(key));
    const stale = [...KNOWN_MOUNTED_P0].filter((k) => !live.has(k));
    expect(stale, stale.length ? `Baseline entries no longer live (delete them):\n${stale.map((k) => `  ${k}`).join("\n")}` : "").toEqual([]);
  });

  it("parses the full dispatcher fleet + mounted surface (no blind spot can mask a P0)", () => {
    // U-FE-VERIFIER-OBJECTMAP closed dispatcher-parse blind spots; U-FE-VERIFIER-STRIPCOMMENTS-FIX
    // closed the mounted-router blind spot (the comment bug that collapsed mounted detection 75->17).
    expect(result.summary.unparsableDispatchers).toEqual([]);
    expect(result.summary.dispatchers).toBeGreaterThan(50);
    // infoUnmounted near-0 is the tell that mounted detection is healthy: when the comment bug was
    // active, the 22 live P0s were mis-counted as INFO (unmounted). If this regresses far upward, the
    // mounted classifier broke again.
    expect(result.summary.resolved).toBeGreaterThan(result.summary.literalPairs * 0.8);
  });
});
