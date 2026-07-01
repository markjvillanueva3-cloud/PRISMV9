// HERMES-MS1 / U-HERMES08-FRAME — multi-surface messaging adapter framework.
//
// Mirrors the Hermes Agent's "20+ messaging surfaces" pattern (Telegram /
// Discord / Slack / email / voice / CLI) — but ships ONLY the framework with
// null-backend stubs. Real transport-config decisions are deferred post-revenue
// per [[feedback_ai_training_first_before_revenue]]; this lets operators wire
// real backends with credentials when JM-Die shop-floor hand-off becomes a
// concrete requirement, with zero architectural rework.
//
// Design:
//   - Adapter contract: { name, available(): bool, send({to, subject, body}): {ok, reason} }
//   - Registry: name → adapter; routeMessage picks first available adapter matching channel rules.
//   - Null backends: every shipped adapter returns ok=true but does nothing (no I/O,
//     no credential leak, no rate-limit cost) until operator swaps in a real backend.
//   - Operator wires real backends by setting env vars (TG_BOT_TOKEN, SLACK_WEBHOOK,
//     SMTP_HOST, etc.) and replacing the null adapter with a transport-specific impl.
//
// Test-friendly: pure-core + injected I/O. Adapter `available()` checks process.env;
// in tests, override via opts.envProbe.

export const ADAPTER_NAMES = Object.freeze(["telegram", "discord", "slack", "email", "voice", "cli"]);
export const SCHEMA_VERSION = "1.0.0";

// Pure: build a registry of available adapters.
// Each adapter is { name, available, send }.
// Caller injects envProbe = (key) => process.env[key] for test hermetism.
export function buildAdapterRegistry(envProbe = k => process.env[k]) {
  return new Map([
    ["telegram", makeNullAdapter("telegram", () => Boolean(envProbe("TELEGRAM_BOT_TOKEN")))],
    ["discord",  makeNullAdapter("discord",  () => Boolean(envProbe("DISCORD_WEBHOOK_URL")))],
    ["slack",    makeNullAdapter("slack",    () => Boolean(envProbe("SLACK_WEBHOOK_URL")))],
    ["email",    makeNullAdapter("email",    () => Boolean(envProbe("SMTP_HOST")))],
    ["voice",    makeNullAdapter("voice",    () => Boolean(envProbe("TWILIO_ACCOUNT_SID")))],
    ["cli",      makeCliAdapter()],
  ]);
}

// Null adapter — reports available based on env, but send() is a no-op that
// returns ok=true with reason="null-backend-deferred". Lets the routing layer
// progress through preference order during framework development without any
// real-world transport firing.
function makeNullAdapter(name, availableFn) {
  return {
    name,
    available: availableFn,
    send(msg) {
      if (!availableFn()) {
        return { ok: false, reason: `${name}-credentials-not-set`, adapter: name };
      }
      // Null backend — real backend swaps this implementation later.
      return { ok: true, reason: "null-backend-deferred", adapter: name, msg };
    },
  };
}

// CLI adapter — the one real backend; writes to stdout. Always available.
function makeCliAdapter() {
  return {
    name: "cli",
    available: () => true,
    send(msg) {
      if (!msg || typeof msg !== "object") {
        return { ok: false, reason: "bad-message", adapter: "cli" };
      }
      const line = `[multi-surface-cli] to=${msg.to || "?"} subj=${msg.subject || "?"}: ${msg.body || ""}`;
      process.stdout.write(line + "\n");
      return { ok: true, adapter: "cli", line };
    },
  };
}

// Pure: route a message by trying preferred adapters in order.
// Inputs:
//   msg = { to, subject, body, priority?: 'urgent'|'normal' }
//   prefs = ["telegram", "slack", "cli"]   ← caller-specified order
//   registry = Map<name, adapter>          ← from buildAdapterRegistry
// Returns: { ok, adapter, tried: string[], reason? }
export function routeMessage(msg, prefs, registry) {
  if (!msg || typeof msg !== "object") {
    return { ok: false, reason: "no-message", tried: [] };
  }
  if (!Array.isArray(prefs) || prefs.length === 0) {
    return { ok: false, reason: "no-preferences", tried: [] };
  }
  if (!(registry instanceof Map)) {
    return { ok: false, reason: "no-registry", tried: [] };
  }
  const tried = [];
  for (const name of prefs) {
    tried.push(name);
    const adapter = registry.get(name);
    if (!adapter) continue;
    if (!adapter.available()) continue;
    const r = adapter.send(msg);
    if (r.ok) return { ok: true, adapter: name, tried, result: r };
  }
  return { ok: false, reason: "no-available-adapter", tried };
}

// Convenience: build a default Hermes-style preference order matching the
// article's listed surfaces. Operator-overridable per-call.
export const DEFAULT_PREFS = Object.freeze([
  "telegram",   // mobile-first (Shann³'s primary)
  "slack",      // team channels
  "discord",    // community / async
  "email",      // formal / archived
  "voice",      // shop-floor hand-off (JM-Die future)
  "cli",        // always-available terminal fallback
]);

// Pure: route an "operator alert" with severity. Urgent messages prefer
// real-time channels (telegram, voice, slack); non-urgent prefer async
// (slack, discord, email).
export function routeOperatorAlert(msg, severity, registry) {
  const urgent = severity === "urgent" || severity === "critical";
  const prefs = urgent
    ? ["telegram", "voice", "slack", "discord", "email", "cli"]
    : ["slack", "discord", "email", "telegram", "voice", "cli"];
  return routeMessage(msg, prefs, registry);
}
