# ZULU Fleet Integration Notes

## How to Activate New Capabilities

1. **Awareness Injection**
   - Call `zulu-master-context-inject.ps1 -Slot <nato>` from `slot-tab-boot.ps1` after setting `PRISM_BOOT_SLOT`.

2. **5h Token Monitoring**
   - Call `zulu-5h-token-monitor.real.ps1 -Slot <nato>` periodically from each tab (or via cron).

3. **Primary Builder Emulation**
   - Load `prism-builder-emulator` skill in Hermes.
   - Use `prism_builder:emulate_primary_builder` action.

4. **6-Account Switching**
   - Use `zulu-6account-runtime-switcher.full.mjs` to detect triggers.
   - Feed output to `account-switch-restart-coordinator.mjs`.

All scripts are designed to be called from the existing PS fleet tabs without moving them out of Windows Terminal.