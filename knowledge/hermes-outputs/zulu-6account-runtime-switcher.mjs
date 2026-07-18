// zulu-6account-runtime-switcher.mjs
// Runtime 90% 5h limit detection + staggered restart for 6 accounts
// Extends account-switch-restart-coordinator.mjs
// Built autonomously in YOLO mode

import { readRotationOrder, listAccounts } from './lib/claude-account-lib.mjs';
import { decideSwitch } from './lib/five-hour-switch-gate.mjs';

export async function runRuntimeSwitchCheck(currentSlotUsage: Record<string, number>) {
  const accounts = await listAccounts();
  const order = await readRotationOrder();

  for (const [slot, pct] of Object.entries(currentSlotUsage)) {
    if (pct >= 88) {
      const nextAccount = order.next;
      console.log(`[ZULU] ${slot} at ${pct}% — triggering staggered switch to ${nextAccount}`);
      
      // Emit directive for account-switch-restart-coordinator
      return {
        trigger: true,
        slot,
        currentPct: pct,
        nextAccount,
        action: 'staggered-relaunch-window'
      };
    }
  }
  return { trigger: false };
}