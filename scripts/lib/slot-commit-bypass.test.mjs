// scripts/lib/slot-commit-bypass.test.mjs
// Tests for U-SLOT-COMMIT-ENFORCE-LIVE: the bypass-decision that makes slot-branch
// enforcement actually fire (the [BOOTSTRAP-SLOT-ENFORCE] marker is no longer a blanket pass).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commitBypass, BOOTSTRAP_MARKER } from "./slot-commit-bypass.mjs";

const COMMIT = (subj) => `cd /h/prism && git commit -m "${subj}"`;

describe("commitBypass", () => {
  it("THE FIX: a plain [BOOTSTRAP-SLOT-ENFORCE] commit no longer bypasses (default OFF -> ENFORCE)", () => {
    // This is the regression that neutered the gate fleet-wide -- the marker is the standard prefix.
    assert.equal(commitBypass(COMMIT("[BOOTSTRAP-SLOT-ENFORCE] [SCOPE]/U-ID (slot:india): work"), {}), null);
    // ... even combined with [MAIN] (which only bypasses worktree-commit-route, NOT this gate).
    assert.equal(commitBypass(COMMIT("[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE]/U-ID (slot:india): work"), {}), null);
  });

  it("[MAIN-FORCE] is the narrow audited cross-cutting escape -> bypasses", () => {
    assert.equal(commitBypass(COMMIT("[MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-X: fleet infra"), {}), "main-force");
    // case + inner-space tolerant (mirrors worktree-commit-route's regex)
    assert.equal(commitBypass(COMMIT("[ main-force ] x"), {}), "main-force");
  });

  it("kill switch always wins, even over an otherwise-enforced plain commit", () => {
    assert.equal(commitBypass(COMMIT("[SCOPE]/U-ID: x"), { PRISM_SLOT_COMMIT_ENFORCE_DISABLE: "1" }), "kill-switch");
  });

  it("bootstrap marker bypasses ONLY inside the operator-opened transition window (opt-in)", () => {
    const env = { PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP: "1" };
    assert.equal(commitBypass(COMMIT(`${BOOTSTRAP_MARKER} [SCOPE]/U-ID: x`), env), "bootstrap-optin");
    // window CLOSED (default) -> the same command ENFORCES
    assert.equal(commitBypass(COMMIT(`${BOOTSTRAP_MARKER} [SCOPE]/U-ID: x`), {}), null);
  });

  it("precedence: kill-switch > main-force > bootstrap-optin", () => {
    const all = { PRISM_SLOT_COMMIT_ENFORCE_DISABLE: "1", PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP: "1" };
    assert.equal(commitBypass(COMMIT(`[MAIN-FORCE] ${BOOTSTRAP_MARKER} x`), all), "kill-switch");
    const noKill = { PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP: "1" };
    assert.equal(commitBypass(COMMIT(`[MAIN-FORCE] ${BOOTSTRAP_MARKER} x`), noKill), "main-force");
  });

  it("adversarial: non-string / empty / null cmd -> ENFORCE (never throws, never bypasses)", () => {
    assert.doesNotThrow(() => {
      assert.equal(commitBypass(null, {}), null);
      assert.equal(commitBypass(undefined, {}), null);
      assert.equal(commitBypass(42, {}), null);
      assert.equal(commitBypass("", {}), null);
    });
  });

  it("adversarial: env undefined -> treated as empty -> ENFORCE (no crash on missing env)", () => {
    assert.doesNotThrow(() => {
      assert.equal(commitBypass(COMMIT("[SCOPE]/U: x")), null);
      assert.equal(commitBypass(COMMIT("[SCOPE]/U: x"), undefined), null);
    });
  });

  it("adversarial: env flags set to anything other than exactly '1' do NOT bypass", () => {
    assert.equal(commitBypass(COMMIT(`${BOOTSTRAP_MARKER} x`), { PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP: "true" }), null);
    assert.equal(commitBypass(COMMIT("x"), { PRISM_SLOT_COMMIT_ENFORCE_DISABLE: "0" }), null);
    assert.equal(commitBypass(COMMIT("x"), { PRISM_SLOT_COMMIT_ENFORCE_DISABLE: "yes" }), null);
  });
});
