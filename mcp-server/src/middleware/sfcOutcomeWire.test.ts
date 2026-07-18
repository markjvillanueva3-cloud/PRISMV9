/**
 * sfcOutcomeWire -- bulk-sweep suppression guard tests.
 *
 * R9/R12: the load-bearing invariant is that a bulk parameter-space sweep (which
 * calls calculate() millions of times) can opt OUT of the global per-domain
 * outcome ledger via PRISM_SFC_DISABLE_OUTCOME_CAPTURE=1, while normal interactive
 * / shop-floor capture is UNCHANGED by default. A 19.6M-cell grind once appended
 * ~215 GB to state/outcomes/speed_feed.jsonl before this guard existed.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { captureSFC } from "./sfcOutcomeWire.js";
import { sfcOutcomeCaptureWireEngine } from "../engines/SFCOutcomeCaptureWireEngine.js";

const ENV = "PRISM_SFC_DISABLE_OUTCOME_CAPTURE";
// The guard returns before touching input (except input.lineageId), and the
// non-suppressed path is mocked, so a minimal cast input is sufficient.
const input = { lineageId: "test-lineage" } as never;

afterEach(() => {
  delete process.env[ENV];
  vi.restoreAllMocks();
});

describe("captureSFC bulk-sweep suppression guard", () => {
  it("suppresses capture when PRISM_SFC_DISABLE_OUTCOME_CAPTURE=1: recordEmission NOT called", () => {
    // mockReturnValue (not a pass-through spy) so that IF the guard ever regressed, the
    // real recordEmission -> fs.appendFileSync to the live ledger never fires -- the
    // regression is still caught by not.toHaveBeenCalled(), with zero side-effect.
    const spy = vi
      .spyOn(sfcOutcomeCaptureWireEngine, "recordEmission")
      .mockReturnValue({ ok: true, lineage_id: "x", event_id: "e", summary: {} } as never);
    process.env[ENV] = "1";
    const r = captureSFC(input);
    expect(spy).not.toHaveBeenCalled(); // no write to the global ledger
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/suppressed/i);
    expect(r.lineage_id).toBe("test-lineage"); // lineage still threaded for the caller
  });

  it("captures normally when the flag is unset: default behavior preserved", () => {
    const spy = vi
      .spyOn(sfcOutcomeCaptureWireEngine, "recordEmission")
      .mockReturnValue({ ok: true, lineage_id: "x", event_id: "e", summary: {} } as never);
    delete process.env[ENV];
    captureSFC(input);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ONLY '1' or 'true' suppress (matching PRISM_SFC_FAST_BULK grammar); others capture", () => {
    // Trunk-absorption change from the slot original ('1'-only): the sibling fast_bulk env
    // accepts '1'|'true', and sweep shells export both knobs together -- a grammar mismatch
    // (fast_bulk ON, ledger guard silently OFF) re-opens the 215GB class this guard prevents.
    const spy = vi
      .spyOn(sfcOutcomeCaptureWireEngine, "recordEmission")
      .mockReturnValue({ ok: true, lineage_id: "x", event_id: "e", summary: {} } as never);
    process.env[ENV] = "true";
    const suppressed = captureSFC(input);
    expect(suppressed.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled(); // 'true' suppresses like '1'
    for (const v of ["0", "yes", "", "2", "TRUE"]) {
      process.env[ENV] = v;
      captureSFC(input);
    }
    expect(spy).toHaveBeenCalledTimes(5); // explicit opt-in only -- none of these suppressed
  });
});
