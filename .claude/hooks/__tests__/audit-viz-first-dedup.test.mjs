/**
 * Tests for U-AUDIT-VIZ-DEDUP (2026-06-20, slot:alpha): audit-viz-first-inject adopts the
 * shared injection-dedup lib (TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB), keyed on the
 * INPUT (`intent::noun`) so a dedup-hit skips BOTH the expensive system-viz-query subprocess
 * AND the re-injection (audit-viz-first fired ~identically on most prompts because audit verbs
 * are common in directive/boilerplate text).
 *
 * Covers the pure `decideAuditVizEmit` decision -- no stdin/subprocess needed.
 * Run: node H:/prism/.claude/hooks/__tests__/audit-viz-first-dedup.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { decideAuditVizEmit, DEDUP_TTL_MS } from "../audit-viz-first-inject.mjs";
import { recordEmit, hashBlock } from "../../../scripts/lib/injection-dedup.mjs";

const SID = "16769ed0";
const TAG = `audit-viz-first:${SID}`;
const T0 = 1_000_000;

describe("decideAuditVizEmit", () => {
  // --- happy path ---
  test("first emit on an empty cache -> action=emit, input-keyed hash", () => {
    const d = decideAuditVizEmit({ cache: {}, sid8: SID, matched: "audit", noun: "GHOST", now: T0 });
    assert.equal(d.action, "emit");
    assert.equal(d.hookTag, TAG);
    // KEY is the INPUT (intent::noun), NOT the rendered block -- this is what lets a
    // dedup-hit skip the subprocess. Locks the input-keying contract.
    assert.equal(d.contentHash, hashBlock("audit::GHOST"));
  });

  test("identical input within TTL after recordEmit -> action=marker", () => {
    let cache = {};
    const first = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 });
    cache = recordEmit(cache, first.hookTag, first.contentHash, T0);
    const second = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 + 1000 });
    assert.equal(second.action, "marker");
    assert.equal(second.hookTag, TAG);
  });

  // --- failure modes ---
  test("DIFFERENT noun is NOT deduped (distinct key) even with the prior in cache", () => {
    let cache = {};
    const a = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 });
    cache = recordEmit(cache, a.hookTag, a.contentHash, T0);
    const b = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "ask-ollama", now: T0 + 1000 });
    assert.equal(b.action, "emit");
    assert.notEqual(b.contentHash, a.contentHash);
  });

  test("DIFFERENT intent is NOT deduped (distinct key)", () => {
    let cache = {};
    const a = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 });
    cache = recordEmit(cache, a.hookTag, a.contentHash, T0);
    const b = decideAuditVizEmit({ cache, sid8: SID, matched: "unwired", noun: "GHOST", now: T0 + 1000 });
    assert.equal(b.action, "emit");
    assert.notEqual(b.contentHash, a.contentHash);
  });

  test("TTL expiry -> re-emit (re-runs the query for a possibly-changed graph)", () => {
    let cache = {};
    const a = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 });
    cache = recordEmit(cache, a.hookTag, a.contentHash, T0);
    const expired = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 + DEDUP_TTL_MS });
    assert.equal(expired.action, "emit");
  });

  test("dedupDisabled -> bypass (pre-dedup behavior, never a marker)", () => {
    let cache = {};
    const a = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 });
    cache = recordEmit(cache, a.hookTag, a.contentHash, T0);
    const d = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 + 1000, dedupDisabled: true });
    assert.equal(d.action, "bypass");
  });

  test("missing session_id -> bypass (cannot key the cache safely)", () => {
    const d = decideAuditVizEmit({ cache: {}, sid8: "", matched: "audit", noun: "GHOST", now: T0 });
    assert.equal(d.action, "bypass");
  });

  // --- adversarial ---
  test("adversarial: a cache holding a DIFFERENT input's hash under the same tag does NOT dedup", () => {
    // a prior record for another noun must never suppress our distinct input
    const cache = recordEmit({}, TAG, hashBlock("audit::SomethingElse"), T0);
    const d = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 + 1000 });
    assert.equal(d.action, "emit");
  });

  test("adversarial: key is input-based, NOT rendered-body-based (a body-hash cache never dedups)", () => {
    // If the impl had wrongly keyed on the rendered body, a cache seeded with a body-shaped
    // hash would dedup. Prove it does NOT -> confirms the input-keying contract is load-bearing.
    const bodyShaped = hashBlock("rendered-body-intent-audit-noun-GHOST-full-block-with-hits-and-doctrine");
    const cache = recordEmit({}, TAG, bodyShaped, T0);
    const d = decideAuditVizEmit({ cache, sid8: SID, matched: "audit", noun: "GHOST", now: T0 + 1000 });
    assert.equal(d.action, "emit");
    assert.notEqual(d.contentHash, bodyShaped);
  });
});
