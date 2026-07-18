// Extended version of account-switch-restart-coordinator.mjs
// Adds support for runtime 90% triggers from zulu-6account-runtime-switcher

import { runCoordinator } from './account-switch-restart-coordinator.mjs';

export async function handleRuntimeTrigger(trigger) {
  if (!trigger.trigger) return { handled: false };

  console.log(`[ZULU] Runtime account switch triggered for ${trigger.slot}`);

  // Call the existing coordinator with the new trigger data
  await runCoordinator({
    ...trigger,
    source: 'runtime-5h-monitor'
  });

  return { handled: true, slot: trigger.slot, nextAccount: trigger.nextAccount };
}