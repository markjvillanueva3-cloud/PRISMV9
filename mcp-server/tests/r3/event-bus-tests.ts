/**
 * R3-MS4.5-T3 Event Bus / Pub-Sub Formalization Tests
 *
 * Tests the TypedEvent pub/sub protocol added to EventBus:
 *   1.  subscribeTyped — register a subscription and receive a subscription_id
 *   2.  unsubscribeTyped — remove a subscription and verify it is gone
 *   3.  publishTyped — callback is invoked for a matching subscription
 *   4.  glob event pattern matching ("data_*" matches "data_updated")
 *   5.  glob source filter matching ("material_*" matches "material_merge")
 *   6.  payload filter matching (extra key/value on filter)
 *   7.  inactive subscription is not invoked
 *   8.  registerReactiveChain — chain registered and returned id is stable
 *   9.  getReactiveChains — lists registered chains
 *  10.  replayEvents — returns events after a date
 *  11.  replayEvents with glob filter
 *  12.  reactive chain step emits an event that triggers a second subscription
 */

import { EventBus, TypedEvent, TypedEventSubscription, ReactiveChain } from "../../src/engines/EventBus.js";

interface TestCase {
  name: string;
  run: () => Promise<void>;  // throws on failure
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TESTS: TestCase[] = [
  // =========================================================================
  // 1. subscribeTyped — returns a subscription_id string
  // =========================================================================
  {
    name: "subscribeTyped: returns a subscription_id string",
    async run() {
      const bus = new EventBus();
      const id = bus.subscribeTyped({
        event: "data_updated",
        callback: () => {}
      });
      assert(typeof id === "string", "subscription_id should be a string");
      assert(id.length > 0, "subscription_id should not be empty");
      bus.stop();
    }
  },

  // =========================================================================
  // 2. unsubscribeTyped — removes subscription
  // =========================================================================
  {
    name: "unsubscribeTyped: removes subscription and returns true",
    async run() {
      const bus = new EventBus();
      const id = bus.subscribeTyped({
        event: "data_updated",
        callback: () => {}
      });
      const removed = bus.unsubscribeTyped(id);
      assert(removed === true, "unsubscribeTyped should return true for existing id");

      const subs = bus.getTypedSubscriptions();
      assert(!subs.find(s => s.id === id), "subscription should no longer be in the list");

      const removedAgain = bus.unsubscribeTyped(id);
      assert(removedAgain === false, "unsubscribeTyped should return false for unknown id");
      bus.stop();
    }
  },

  // =========================================================================
  // 3. publishTyped — callback is invoked
  // =========================================================================
  {
    name: "publishTyped: callback is invoked with the event",
    async run() {
      const bus = new EventBus();
      let received: TypedEvent | null = null;

      bus.subscribeTyped({
        event: "data_updated",
        callback: (evt) => { received = evt; }
      });

      await bus.publishTyped({
        event: "data_updated",
        source: "test_source",
        payload: { key: "value" }
      });

      assert(received !== null, "callback should have been invoked");
      assertEqual((received as TypedEvent).event, "data_updated", "event name");
      assertEqual((received as TypedEvent).source, "test_source", "source");
      assert((received as TypedEvent).timestamp instanceof Date, "timestamp should be a Date");
      bus.stop();
    }
  },

  // =========================================================================
  // 4. glob event pattern matching
  // =========================================================================
  {
    name: "publishTyped: glob event pattern 'data_*' matches 'data_updated'",
    async run() {
      const bus = new EventBus();
      let callCount = 0;

      bus.subscribeTyped({
        event: "data_*",
        callback: () => { callCount++; }
      });

      await bus.publishTyped({ event: "data_updated", source: "src", payload: {} });
      await bus.publishTyped({ event: "data_loaded", source: "src", payload: {} });
      await bus.publishTyped({ event: "validation_complete", source: "src", payload: {} });

      assertEqual(callCount, 2, "glob 'data_*' should match exactly 2 events");
      bus.stop();
    }
  },

  // =========================================================================
  // 5. glob source filter matching
  // =========================================================================
  {
    name: "publishTyped: source filter 'material_*' matches 'material_merge' only",
    async run() {
      const bus = new EventBus();
      let callCount = 0;

      bus.subscribeTyped({
        event: "data_*",
        filter: { source: "material_*" },
        callback: () => { callCount++; }
      });

      await bus.publishTyped({ event: "data_updated", source: "material_merge", payload: {} });
      await bus.publishTyped({ event: "data_updated", source: "ralph_assess", payload: {} });
      await bus.publishTyped({ event: "data_loaded", source: "material_import", payload: {} });

      assertEqual(callCount, 2, "source filter 'material_*' should match 2 of 3 events");
      bus.stop();
    }
  },

  // =========================================================================
  // 6. payload filter matching
  // =========================================================================
  {
    name: "publishTyped: payload filter key/value matches correctly",
    async run() {
      const bus = new EventBus();
      let callCount = 0;

      bus.subscribeTyped({
        event: "validation_complete",
        filter: { status: "ok" },
        callback: () => { callCount++; }
      });

      await bus.publishTyped({ event: "validation_complete", source: "s", payload: { status: "ok" } });
      await bus.publishTyped({ event: "validation_complete", source: "s", payload: { status: "fail" } });
      await bus.publishTyped({ event: "validation_complete", source: "s", payload: { status: "ok" } });

      assertEqual(callCount, 2, "payload filter should match 2 of 3 events");
      bus.stop();
    }
  },

  // =========================================================================
  // 7. inactive subscription is not invoked
  // =========================================================================
  {
    name: "publishTyped: inactive subscription (active=false) is skipped",
    async run() {
      const bus = new EventBus();
      let callCount = 0;

      bus.subscribeTyped({
        event: "data_updated",
        active: false,
        callback: () => { callCount++; }
      });

      await bus.publishTyped({ event: "data_updated", source: "src", payload: {} });

      assertEqual(callCount, 0, "inactive subscription should not be invoked");
      bus.stop();
    }
  },

  // =========================================================================
  // 8. registerReactiveChain — returns stable chain_id
  // =========================================================================
  {
    name: "registerReactiveChain: returns a chain_id string",
    async run() {
      const bus = new EventBus();
      const chain: ReactiveChain = {
        name: "Test Chain",
        trigger_event: "data_updated",
        steps: [{ action: "log_event", emit_event: "audit_logged" }],
        enabled: true
      };

      const id = bus.registerReactiveChain(chain);
      assert(typeof id === "string", "chain_id should be a string");
      assert(id.length > 0, "chain_id should not be empty");

      // Registering same chain object again should give a different id (no id supplied)
      const id2 = bus.registerReactiveChain({ ...chain });
      assert(id !== id2, "two registrations without explicit id should yield different ids");
      bus.stop();
    }
  },

  // =========================================================================
  // 9. getReactiveChains — lists all registered chains
  // =========================================================================
  {
    name: "getReactiveChains: lists all registered chains",
    async run() {
      const bus = new EventBus();

      bus.registerReactiveChain({
        name: "Chain A",
        trigger_event: "data_updated",
        steps: [{ action: "step_one" }],
        enabled: true
      });
      bus.registerReactiveChain({
        name: "Chain B",
        trigger_event: "validation_complete",
        steps: [{ action: "step_two" }],
        enabled: false
      });

      const chains = bus.getReactiveChains();
      assertEqual(chains.length, 2, "should list 2 chains");
      assert(chains.some(c => c.name === "Chain A"), "Chain A should be listed");
      assert(chains.some(c => c.name === "Chain B"), "Chain B should be listed");
      bus.stop();
    }
  },

  // =========================================================================
  // 10. replayEvents — returns events after a date
  // =========================================================================
  {
    name: "replayEvents: returns events published after the given date",
    async run() {
      const bus = new EventBus();
      const before = new Date(Date.now() - 5000);

      await bus.publishTyped({ event: "data_updated", source: "s", payload: { n: 1 } });
      await bus.publishTyped({ event: "data_loaded", source: "s", payload: { n: 2 } });

      const replayed = bus.replayEvents(before);
      assert(replayed.length >= 2, `should replay at least 2 events, got ${replayed.length}`);

      const future = new Date(Date.now() + 5000);
      const none = bus.replayEvents(future);
      assertEqual(none.length, 0, "replaying from future should return 0 events");
      bus.stop();
    }
  },

  // =========================================================================
  // 11. replayEvents with glob filter
  // =========================================================================
  {
    name: "replayEvents: glob filter narrows results",
    async run() {
      const bus = new EventBus();
      const since = new Date(Date.now() - 5000);

      await bus.publishTyped({ event: "data_updated", source: "s", payload: {} });
      await bus.publishTyped({ event: "data_loaded", source: "s", payload: {} });
      await bus.publishTyped({ event: "validation_complete", source: "s", payload: {} });

      const dataEvents = bus.replayEvents(since, "data_*");
      assert(dataEvents.length === 2, `glob filter 'data_*' should return 2 events, got ${dataEvents.length}`);
      assert(dataEvents.every(e => e.event.startsWith("data_")), "all replayed events should start with 'data_'");
      bus.stop();
    }
  },

  // =========================================================================
  // 12. reactive chain step emits an event that triggers a second subscription
  // =========================================================================
  {
    name: "registerReactiveChain: chain step emit_event triggers downstream subscription",
    async run() {
      const bus = new EventBus();
      let downstreamReceived: TypedEvent | null = null;

      // Subscribe to the downstream event emitted by the chain step
      bus.subscribeTyped({
        event: "audit_logged",
        callback: (evt) => { downstreamReceived = evt; }
      });

      // Register a chain that reacts to "data_updated" and emits "audit_logged"
      bus.registerReactiveChain({
        name: "Audit Chain",
        trigger_event: "data_updated",
        steps: [{ action: "log_to_audit", emit_event: "audit_logged" }],
        enabled: true
      });

      // Publish the trigger event
      await bus.publishTyped({ event: "data_updated", source: "test", payload: { record: 42 } });

      // Give async chain execution time to complete
      await sleep(50);

      assert(downstreamReceived !== null, "downstream subscription should have been triggered by reactive chain");
      assertEqual((downstreamReceived as TypedEvent).event, "audit_logged", "downstream event name");
      bus.stop();
    }
  },

  // =========================================================================
  // 13. registerAction + reactive chain step dispatch
  // =========================================================================
  {
    name: "registerAction: chain step calls registered action handler",
    async run() {
      const bus = new EventBus();

      // Track action invocations
      let actionCalled = false;
      let receivedParams: any = null;

      bus.registerAction("validate_data", async (params, context) => {
        actionCalled = true;
        receivedParams = params;
        return { validated: true, records: 42 };
      });

      // Register chain: on "data_imported" → validate_data → emit "data_validated"
      bus.registerReactiveChain({
        name: "Import → Validate",
        trigger_event: "data_imported",
        steps: [
          { action: "validate_data", params: { strict: true }, emit_event: "data_validated" }
        ],
        enabled: true
      });

      // Subscribe to the downstream event to check result payload
      let validatedEvent: TypedEvent | null = null;
      bus.subscribeTyped({
        event: "data_validated",
        callback: (evt) => { validatedEvent = evt; }
      });

      // Trigger
      await bus.publishTyped({
        event: "data_imported",
        source: "batch_runner",
        payload: { batch_id: "batch_0001", count: 10 }
      });

      await sleep(50);

      assert(actionCalled, "validate_data action should have been called");
      assert(receivedParams !== null, "action should receive params");
      assertEqual(receivedParams.strict, true, "step params should be passed");
      assertEqual(receivedParams.batch_id, "batch_0001", "trigger payload should be merged");

      assert(validatedEvent !== null, "downstream event should fire after action");
      assertEqual((validatedEvent as TypedEvent).payload.validated, true, "action result should be in emitted event payload");
      bus.stop();
    }
  },

  // =========================================================================
  // 14. Missing action fallback — chain continues without throwing
  // =========================================================================
  {
    name: "reactive chain: missing action skipped gracefully (no throw)",
    async run() {
      const bus = new EventBus();

      // Register chain with a non-existent action — should warn, not throw
      bus.registerReactiveChain({
        name: "Chain with missing action",
        trigger_event: "test_trigger",
        steps: [
          { action: "nonexistent_action_xyz", params: { x: 1 }, emit_event: "should_still_emit" }
        ],
        enabled: true
      });

      // Track if downstream event fires (it should, even though action wasn't found)
      let downstreamFired = false;
      bus.subscribeTyped({
        event: "should_still_emit",
        callback: () => { downstreamFired = true; }
      });

      // This should NOT throw — missing action is logged as warning and skipped
      await bus.publishTyped({
        event: "test_trigger",
        source: "test",
        payload: { val: 42 }
      });

      await sleep(50);

      // Chain should have completed (action skipped) and emitted downstream event
      assert(downstreamFired, "Downstream event should still fire even when action is missing");
      bus.stop();
    }
  },

  // =========================================================================
  // 15. listActions returns registered action names
  // =========================================================================
  {
    name: "listActions: returns all registered action names",
    async run() {
      const bus = new EventBus();
      bus.registerAction("action_a", async () => ({}));
      bus.registerAction("action_b", async () => ({}));

      const actions = bus.listActions();
      assertEqual(actions.length, 2, "should have 2 actions");
      assert(actions.includes("action_a"), "should include action_a");
      assert(actions.includes("action_b"), "should include action_b");
      bus.stop();
    }
  }
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runTests(): Promise<void> {
  console.log("=== R3-MS4.5-T3 Event Bus Pub/Sub Tests ===\n");

  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; error: string }> = [];

  for (const test of TESTS) {
    process.stdout.write(`  ${test.name} ... `);
    try {
      await test.run();
      console.log("PASS");
      passed++;
    } catch (err: any) {
      console.log("FAIL");
      failures.push({ name: test.name, error: err.message });
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed}/${TESTS.length} passed, ${failed} failed ===`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  ${f.name}:`);
      console.log(`    ${f.error}`);
    }
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
