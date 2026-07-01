// zulu-6account-runtime-switcher.full.mjs
// Full runtime 90% 5h limit detection + staggered restart logic for 6 accounts
// Extends the existing account-switch-restart-coordinator

import { readRotationOrder } from './lib/claude-account-lib.mjs';

export async function checkAndTriggerSwitch(currentUsage) {
  const rotation = await readRotationOrder();
  const triggers = [];

  for (const [slot, pct] of Object.entries(currentUsage)) {
    if (pct >= 88) {
      const nextAccount = rotation.next;
      triggers.push({
        slot,
        pct,
        nextAccount,
        action: 'staggered-relaunch',
        reason: '90% 5h limit approached'
      });
    }
  }

  return triggers;
}