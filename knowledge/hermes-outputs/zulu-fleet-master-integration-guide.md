# ZULU Fleet Master Integration Guide

## Goal
Make ZULU the master brain that orchestrates the fleet from the Hermes app while the 4 PS Windows Terminal tabs remain the execution surface.

## Required Changes

### 1. Awareness Injection (Highest Priority)
- Copy `zulu-master-context-inject.ps1` into `H:/Tools/prism-fleet/`
- Modify `slot-tab-boot.ps1` to call it after setting `PRISM_BOOT_SLOT`
- Recommended file: `slot-tab-boot.zulu-integrated.ps1`

### 2. 5h Token Monitoring
- Copy `zulu-5h-token-monitor.production.ps1` into the fleet folder
- Call it periodically from each tab (or via a background job)

### 3. 6-Account Runtime Switching
- Use `zulu-6account-runtime-switcher.production.mjs`
- Wire output into `account-switch-restart-coordinator.extended.mjs`

### 4. Primary Builder Emulation
- Load `prism-builder-emulator` skill in Hermes
- Use `prism_builder:emulate_primary_builder` action

### 5. Launcher Integration
- Use `Launch-PRISM-Fleet.zulu-integrated.ps1` and `Launch-PRISM-Fleet-3win.zulu-integrated.ps1`

## Status
All components built. Ready for integration and testing.