/**
 * CrossProcessPostBridge -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * The bridge is PURE routing + validation: it classifies the process (via the
 * already-tested CrossProcessAIBridge.classify), then either returns a dry-run
 * routing preview OR delegates NC emission verbatim to the canonical
 * masterPostProcessorUnifiedAGIEngine.generatePost. It emits NO G-code itself.
 *
 * These tests lock the bridge's OWN behavior -- request validation, the dry-run
 * short-circuit, the explicit-process-override classification pass-through, the
 * fail-loud `post_input` requirement (R12 -- never fabricate G-code), and that a
 * supplied body actually reaches delegation. The real NC emission belongs to
 * MasterPost's own suite and is NOT re-tested here (the bridge forwards the
 * opaque body verbatim).
 */

import { describe, it, expect } from "vitest";
import { CrossProcessPostBridge } from "../engines/CrossProcessPostBridge.js";

// The documented routing target (engine-private const ROUTED_ENGINE).
const ROUTED = "MasterPostProcessorUnifiedAGIEngine.generatePost";

describe("CrossProcessPostBridge", () => {
  describe("request validation (fail-loud)", () => {
    it("throws when no request object is supplied", async () => {
      await expect(CrossProcessPostBridge.emit(null as never)).rejects.toThrow("request object required");
    });

    it("throws when the request is not an object", async () => {
      await expect(CrossProcessPostBridge.emit("post it" as never)).rejects.toThrow("request object required");
    });
  });

  describe("dry-run routing preview (no emission)", () => {
    it("returns the routing decision for an explicit process override (confidence 1.0), no post_response", async () => {
      const r = await CrossProcessPostBridge.emit({ dry_run: true, process: "mill" });
      expect(r.dry_run).toBe(true);
      expect(r.routed_to).toBe(ROUTED);
      expect(r.classification.process).toBe("mill");
      expect(r.classification.confidence).toBe(1); // explicit override => CONFIDENCE_EXPLICIT = 1.0
      expect("post_response" in r).toBe(false); // dry-run never emits
      // notes carry the 4 routing facts the bridge assembles
      expect(r.notes).toEqual([
        `routed_to=${ROUTED}`,
        "dry_run=true",
        "process=mill",
        "confidence=1.00",
      ]);
      expect(r.warnings).toEqual([]);
    });

    it("honors a different explicit override (lathe) at confidence 1.0", async () => {
      const r = await CrossProcessPostBridge.emit({ dry_run: true, process: "lathe", features: ["turn"] });
      expect(r.classification.process).toBe("lathe");
      expect(r.classification.confidence).toBe(1);
      expect(r.notes).toContain("process=lathe");
    });

    it("defaults to mill classification when no override/intent signals are present", async () => {
      const r = await CrossProcessPostBridge.emit({ dry_run: true });
      expect(r.classification.process).toBe("mill"); // documented no-signal default
      expect(r.classification.confidence).toBeGreaterThanOrEqual(0);
      expect(r.classification.confidence).toBeLessThanOrEqual(1);
      expect(r.routed_to).toBe(ROUTED);
      expect("post_response" in r).toBe(false);
    });
  });

  describe("post_input requirement (R12 -- never fabricate G-code)", () => {
    it("FAILURE MODE: a non-dry-run call without post_input throws", async () => {
      await expect(CrossProcessPostBridge.emit({})).rejects.toThrow(/requires `post_input`/);
    });

    it("FAILURE MODE: dry_run:false without post_input throws (explicit non-dry-run)", async () => {
      await expect(CrossProcessPostBridge.emit({ dry_run: false, process: "mill" })).rejects.toThrow(/requires `post_input`/);
    });

    it("ADVERSARIAL: dry_run:true SHORT-CIRCUITS before the post_input gate (no throw without a body)", async () => {
      // The dry-run preview returns the routing decision and never reaches the
      // post_input check -- so a body is NOT required for a preview.
      const r = await CrossProcessPostBridge.emit({ dry_run: true, process: "mill" });
      expect(r.dry_run).toBe(true);
      expect("post_response" in r).toBe(false);
    });
  });

  describe("delegation", () => {
    it("reaches MasterPost delegation when post_input is supplied (past the bridge's fail-loud gate)", async () => {
      // generatePost is invoked synchronously; the bridge's own contribution ends
      // here. We only prove the body GETS PAST the bridge's gate to delegation --
      // either it resolves with a post_response attached, or MasterPost itself
      // rejects the minimal body (which must NOT be the bridge's own gate error).
      await CrossProcessPostBridge.emit({ process: "mill", post_input: { controller: "haas", operations: [] } }).then(
        (r) => {
          expect(r.dry_run).toBe(false);
          expect(r.routed_to).toBe(ROUTED);
          expect("post_response" in r).toBe(true); // delegation result attached
        },
        (e) => {
          // MasterPost may reject a minimal body -- acceptable. It proves the bridge
          // delegated (got past its own post_input gate), so the error must be MasterPost's.
          expect(String(e)).not.toMatch(/requires `post_input`/);
          expect(String(e)).not.toMatch(/request object required/);
        },
      );
    });
  });
});
