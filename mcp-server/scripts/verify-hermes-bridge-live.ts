/**
 * verify-hermes-bridge-live.ts -- LIVE read-only verification of HermesAutomationBridge
 * against the REAL installed Hermes Agent (NOT mock, NOT spawn). Closes the "LIVE
 * round-trip never verified" gap for the safe (no-spawn) inspection actions:
 * status / probe / auth_status / cron_list / skill_list. These read Hermes' own files
 * directly, so running them live is safe (no agent spawned, no cost, no reconfigure).
 *
 * Run: cd mcp-server && npx tsx scripts/verify-hermes-bridge-live.ts
 * It exercises the engine the same way the prism_hermes dispatcher would, proving the
 * paths/parse logic work against the real install -- the dispatcher-via-MCP round-trip
 * is the same call once the MCP bridge is reconnected.
 */
import { HermesAutomationBridge } from "../src/engines/HermesAutomationBridge.js";

const b = new HermesAutomationBridge(); // mock-by-default; read-only actions never spawn regardless

function show(label: string, v: { value: unknown; warning?: string }): void {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${label}${v.warning ? `  [warning: ${v.warning}]` : ""} ===`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(v.value, null, 1));
}

show("status", b.status());
show("probe", b.probe());
show("auth_status", b.authStatus());
show("cron_list", b.cronList());
show("skill_list (active profile)", b.skillList());

// A summary verdict line a CI/operator can grep.
const probe = b.probe().value as Record<string, unknown>;
const auth = b.authStatus().value as Record<string, unknown>;
const ok = probe["installed"] === true && (probe["exeExists"] === true);
// eslint-disable-next-line no-console
console.log(`\nVERDICT: ${ok ? "BRIDGE-A-LIVE-READONLY-OK" : "BRIDGE-A-LIVE-READONLY-DEGRADED"} ` +
  `installed=${probe["installed"]} exeExists=${probe["exeExists"]} profiles=${probe["profileCount"]} ` +
  `oauthCreds=${auth["oauthCount"]} expired=${auth["expiredCount"]}`);
