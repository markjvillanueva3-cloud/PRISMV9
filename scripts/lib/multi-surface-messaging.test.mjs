// HERMES-MS1 / U-HERMES08-FRAME — adapter framework tests (pure, hermetic).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADAPTER_NAMES,
  SCHEMA_VERSION,
  DEFAULT_PREFS,
  buildAdapterRegistry,
  routeMessage,
  routeOperatorAlert,
} from "../../scripts/lib/multi-surface-messaging.mjs";

const ENV_NONE = () => undefined;
const ENV_ALL = (k) => ({
  TELEGRAM_BOT_TOKEN: "x",
  DISCORD_WEBHOOK_URL: "x",
  SLACK_WEBHOOK_URL: "x",
  SMTP_HOST: "x",
  TWILIO_ACCOUNT_SID: "x",
}[k]);

describe("constants", () => {
  it("ADAPTER_NAMES is frozen + has 6", () => {
    assert.equal(Object.isFrozen(ADAPTER_NAMES), true);
    assert.equal(ADAPTER_NAMES.length, 6);
  });
  it("DEFAULT_PREFS is frozen + cli is fallback", () => {
    assert.equal(Object.isFrozen(DEFAULT_PREFS), true);
    assert.equal(DEFAULT_PREFS[DEFAULT_PREFS.length - 1], "cli");
  });
  it("SCHEMA_VERSION is 1.0.0", () => assert.equal(SCHEMA_VERSION, "1.0.0"));
});

describe("buildAdapterRegistry", () => {
  it("returns 6 adapters", () => {
    const reg = buildAdapterRegistry(ENV_NONE);
    assert.equal(reg.size, 6);
    for (const name of ADAPTER_NAMES) assert.equal(reg.has(name), true);
  });
  it("CLI adapter is always available", () => {
    const reg = buildAdapterRegistry(ENV_NONE);
    assert.equal(reg.get("cli").available(), true);
  });
  it("Telegram requires TELEGRAM_BOT_TOKEN", () => {
    const reg1 = buildAdapterRegistry(ENV_NONE);
    const reg2 = buildAdapterRegistry((k) => k === "TELEGRAM_BOT_TOKEN" ? "secret" : undefined);
    assert.equal(reg1.get("telegram").available(), false);
    assert.equal(reg2.get("telegram").available(), true);
  });
  it("Slack requires SLACK_WEBHOOK_URL", () => {
    const reg = buildAdapterRegistry((k) => k === "SLACK_WEBHOOK_URL" ? "https://x" : undefined);
    assert.equal(reg.get("slack").available(), true);
  });
  it("null adapter send returns null-backend-deferred when credentialed", () => {
    const reg = buildAdapterRegistry(ENV_ALL);
    const r = reg.get("telegram").send({ to: "x", body: "hi" });
    assert.equal(r.ok, true);
    assert.equal(r.reason, "null-backend-deferred");
    assert.equal(r.adapter, "telegram");
  });
  it("null adapter send returns NOT-ok when no credentials", () => {
    const reg = buildAdapterRegistry(ENV_NONE);
    const r = reg.get("telegram").send({ to: "x", body: "hi" });
    assert.equal(r.ok, false);
    assert.match(r.reason, /credentials-not-set/);
  });
});

describe("routeMessage", () => {
  it("returns no-message on null input", () => {
    const r = routeMessage(null, ["cli"], new Map());
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-message");
  });
  it("returns no-preferences on empty prefs", () => {
    const r = routeMessage({}, [], new Map());
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-preferences");
  });
  it("returns no-registry on bad registry", () => {
    const r = routeMessage({}, ["cli"], null);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-registry");
  });
  it("walks prefs in order, returns first ok", () => {
    const reg = buildAdapterRegistry(ENV_ALL);
    const r = routeMessage({ to: "x", subject: "test", body: "hi" }, ["slack", "telegram", "cli"], reg);
    assert.equal(r.ok, true);
    assert.equal(r.adapter, "slack");
    assert.deepEqual(r.tried, ["slack"]);
  });
  it("skips unavailable adapters", () => {
    const reg = buildAdapterRegistry((k) => k === "SLACK_WEBHOOK_URL" ? "x" : undefined);
    const r = routeMessage({ body: "hi" }, ["telegram", "voice", "slack"], reg);
    assert.equal(r.ok, true);
    assert.equal(r.adapter, "slack");
    assert.deepEqual(r.tried, ["telegram", "voice", "slack"]);
  });
  it("falls through to cli when no credentialed adapters available", () => {
    const reg = buildAdapterRegistry(ENV_NONE);
    const r = routeMessage({ to: "ops", subject: "y", body: "hello" }, ["telegram", "slack", "cli"], reg);
    assert.equal(r.ok, true);
    assert.equal(r.adapter, "cli");
    assert.deepEqual(r.tried, ["telegram", "slack", "cli"]);
  });
  it("returns no-available-adapter when nothing matches", () => {
    const reg = buildAdapterRegistry(ENV_NONE);
    // remove cli to simulate no fallback
    reg.delete("cli");
    const r = routeMessage({ body: "x" }, ["telegram", "slack"], reg);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-available-adapter");
  });
});

describe("routeOperatorAlert", () => {
  it("urgent prefers real-time channels first", () => {
    const reg = buildAdapterRegistry(ENV_ALL);
    const r = routeOperatorAlert({ body: "fire" }, "urgent", reg);
    assert.equal(r.adapter, "telegram");
  });
  it("non-urgent prefers async channels first", () => {
    const reg = buildAdapterRegistry(ENV_ALL);
    const r = routeOperatorAlert({ body: "log" }, "normal", reg);
    assert.equal(r.adapter, "slack");
  });
  it("falls back to cli when nothing else is configured", () => {
    const reg = buildAdapterRegistry(ENV_NONE);
    const r = routeOperatorAlert({ body: "x" }, "urgent", reg);
    assert.equal(r.adapter, "cli");
  });
});
