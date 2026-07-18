// Production version of the 6-account runtime switcher
// Detects 90% 5h limits and triggers the account-switch-restart-coordinator

import { checkAndTriggerSwitch } from './zulu-6account-runtime-switcher.full.mjs';
import { handleRuntimeTrigger } from './account-switch-restart-coordinator.extended.mjs';

export async function runRuntimeSwitchCheck(currentUsage) {
  const triggers = await checkAndTriggerSwitch(currentUsage);

  for (const trigger of triggers) {
    await handleRuntimeTrigger(trigger);
  }

  return triggers;
}