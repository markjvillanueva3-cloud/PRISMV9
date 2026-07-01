/**
 * generate-hotel-domain-features.test.mjs — pure-function tests for the
 * hotel-domain ghost-roost generator. Uses node:test (matches existing scripts/* tests).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyAction,
  safeId,
  readZEnumActions,
  generate,
  ROOST_BUSINESS,
  ROOST_SAFETY,
  ROOST_ACCOUNTING,
} from "./generate-hotel-domain-features.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

test("classifyAction routes OSHA action to safety roost", () => {
  const c = classifyAction("osha_create_incident");
  assert.equal(c?.roost, ROOST_SAFETY);
  assert.equal(c?.axis, "safety");
});

test("classifyAction routes iso9001_validate to safety", () => {
  assert.equal(classifyAction("iso9001_validate")?.axis, "safety");
});

test("classifyAction routes gl_record_invoice to accounting", () => {
  const c = classifyAction("gl_record_invoice");
  assert.equal(c?.roost, ROOST_ACCOUNTING);
  assert.equal(c?.axis, "accounting");
});

test("classifyAction routes adaptive_shop_rate_adapt to accounting", () => {
  assert.equal(classifyAction("adaptive_shop_rate_adapt")?.axis, "accounting");
});

test("classifyAction routes docustrata_ingest_and_post to accounting", () => {
  assert.equal(classifyAction("docustrata_ingest_and_post")?.axis, "accounting");
});

test("classifyAction routes burden_rate_calc to accounting", () => {
  assert.equal(classifyAction("burden_rate_calc")?.axis, "accounting");
});

test("classifyAction routes quote_create to business", () => {
  assert.equal(classifyAction("quote_create")?.axis, "business");
});

test("classifyAction routes emp_scan_in to business", () => {
  assert.equal(classifyAction("emp_scan_in")?.axis, "business");
});

test("classifyAction returns null on garbage / unknown action", () => {
  assert.equal(classifyAction("random_unrelated_xyz"), null);
  assert.equal(classifyAction(""), null);
  assert.equal(classifyAction(null), null);
});

test("classifyAction safety patterns win over business (eval order)", () => {
  // "audit_*" would match safety; if business had "audit_quote" hypothetically,
  // safety takes precedence by eval order.
  const c = classifyAction("audit_run");
  assert.equal(c?.axis, "safety");
});

test("safeId converts to lowercase kebab", () => {
  assert.equal(safeId("Hotel Action Foo"), "hotel-action-foo");
  assert.equal(safeId("ABC_def-123"), "abc_def-123");
  assert.equal(safeId(""), "x");
  assert.equal(safeId("../escape"), "escape");
});

test("readZEnumActions parses a synthetic dispatcher file", () => {
  const tmp = path.join(os.tmpdir(), `dispatcher-${Date.now()}.ts`);
  fs.writeFileSync(
    tmp,
    `import { z } from "zod";
const schema = z.enum([
  "foo_action",
  "bar_action",
  "iso9001_validate",
  "gl_journal_entry",
]);`,
  );
  const actions = readZEnumActions(tmp);
  fs.unlinkSync(tmp);
  assert.deepEqual(actions, ["foo_action", "bar_action", "iso9001_validate", "gl_journal_entry"]);
});

test("generate emits 3 roosts when none exist + classifies known actions", () => {
  // Build a synthetic dispatcher file with a mix of axes.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hotel-gen-"));
  const business = path.join(tmpDir, "business.ts");
  const shop = path.join(tmpDir, "shop.ts");
  fs.writeFileSync(
    business,
    `const s = z.enum([
  "quote_create",
  "gl_record_invoice",
  "iso9001_validate",
  "osha_create_incident",
  "adaptive_shop_rate_adapt",
  "burden_rate_calc",
]);`,
  );
  fs.writeFileSync(shop, `const s = z.enum(["emp_scan_in", "emp_send_message"]);`);

  const out = generate({ businessDispatcherPath: business, shopDispatcherPath: shop });
  fs.rmSync(tmpDir, { recursive: true, force: true });

  assert.equal(out.stats.roostEmitted, 3);
  // 3 accounting (gl, adaptive_shop_rate, burden_rate)
  assert.equal(out.stats.by_axis.accounting, 3);
  // 2 safety (iso, osha)
  assert.equal(out.stats.by_axis.safety, 2);
  // 3 business (quote_create, emp_scan_in, emp_send_message)
  assert.equal(out.stats.by_axis.business, 3);
});

test("generate skips roost when already in existingNodeIds set", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hotel-gen2-"));
  const business = path.join(tmpDir, "business.ts");
  fs.writeFileSync(business, `const s = z.enum(["quote_create"]);`);

  const out = generate(
    { businessDispatcherPath: business, shopDispatcherPath: business },
    new Set([ROOST_BUSINESS]),
  );
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Only safety + accounting roosts emitted (business already present).
  const ids = out.newNodes.filter((n) => n.kind === "ghost-roost").map((n) => n.id);
  assert.ok(!ids.includes(ROOST_BUSINESS));
  assert.ok(ids.includes(ROOST_SAFETY));
});

test("generate increments unmatched counter for non-hotel actions", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hotel-gen3-"));
  const business = path.join(tmpDir, "business.ts");
  fs.writeFileSync(business, `const s = z.enum(["totally_unrelated_action"]);`);

  const out = generate({ businessDispatcherPath: business, shopDispatcherPath: business });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.equal(out.stats.by_axis.unmatched, 2); // counted twice (same file as both)
});
