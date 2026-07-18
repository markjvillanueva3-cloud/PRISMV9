# ZULU Master Integration Patch Set

## Summary of Changes Needed

### 1. slot-tab-boot.ps1
Add this line after setting `$env:PRISM_BOOT_SLOT`:
```powershell
& "$PSScriptRoot\zulu-master-context-inject.ps1" -Slot $Slot
```

### 2. Fleet Launchers
Use the `.zulu-integrated.ps1` versions or add the same injection call.

### 3. 5h Monitoring
Add periodic calls to `zulu-5h-token-monitor.production.ps1` from each tab.

### 4. Account Switching
Wire `zulu-6account-runtime-switcher.production.mjs` into the existing coordinator.

### 5. Primary Builder
Load the `prism-builder-emulator` skill and use `prism_builder:emulate_primary_builder`.

**Status:** All components ready. Integration is now a straightforward copy + minimal edit task.