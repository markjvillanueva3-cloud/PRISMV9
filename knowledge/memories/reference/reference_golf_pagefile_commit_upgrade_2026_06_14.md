---
name: golf-pagefile-commit-upgrade-2026-06-14
description: "SYSTEM CHANGE APPLIED (golf, 2026-06-14, operator directive 'can we improve commit size?' + 'make all upgrades relative to pc build'): raised the Windows pagefile to lift the commit limit and end the OOM-CRITICAL spikes. Registry PagingFiles set to `c:\\pagefile.sys 16384 65536` + `h:\\pagefile.sys 131072 131072` (C: 16GB/64GB + H: 128GB/128GB). Commit limit goes 168GB -> ~271GB AT NEXT REBOOT. Live system still 168GB until rebooted (change is reboot-deferred; live pagefile untouched). REVERSAL: set PagingFiles back to `c:\\pagefile.sys 4096 196608`. Root cause it fixes: the old 4GB pagefile INITIAL size made the commit limit start low each boot and grow reactively-too-slow when Ollama's llama-server loads ~103GB commit -> transient 97.2% CRITICAL. New 271GB floor keeps the 103GB model + fleet + bursts (peak seen 171GB) at ~63%, never CRITICAL."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_pagefile_commit_upgrade_2026_06_14
---


**Change applied (2026-06-14, slot golf, session 02a2de10, elevated admin).** Operator asked "can we improve commit size?" then "make all upgrades and improvements relative to pc build and current system settings." Made the pagefile upgrade that fixes the OOM-commit root cause (see [[reference_golf_oom_commit_driver_ollama_2026_06_14]]).

## What changed
Registry: `HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PagingFiles` (REG_MULTI_SZ; the authoritative source Windows reads at boot -- the `Win32_PageFileSetting` CIM setter returned "Value out of range" even when elevated, so registry is the reliable path).
- **BEFORE:** `c:\pagefile.sys 4096 196608` (4GB initial / 192GB max -- grows reactively, starts low each boot)
- **AFTER:** `c:\pagefile.sys 16384 65536` + `h:\pagefile.sys 131072 131072` (C: 16GB/64GB + H: 128GB/128GB)
- **Commit limit:** 168GB -> **~271GB at next reboot** (127GB RAM + 16GB C: floor + 128GB H:).
- H: verified `Win32_LogicalDisk` DriveType=3 (local fixed), 1547GB free -- pagefile valid there.
- C: keeps ~86GB free (vs only 38GB if the whole bump went on C:).

## CRITICAL operational facts
1. **REBOOT-DEFERRED.** The live pagefile is UNCHANGED until a reboot. The running system still has the ~168GB limit. Do NOT expect the new headroom until the machine reboots. Golf did NOT reboot (a reboot kills the entire 26-chat fleet + Ollama -- operator's call, at a planned window).
2. **REVERSAL** (if it ever misbehaves): set PagingFiles back to `c:\pagefile.sys 4096 196608` (the backed-up original) + reboot.
3. **Why it fixes OOM:** the 4GB INITIAL made the commit limit start at ~131GB each boot and grow reactively; when llama-server suddenly commits ~103GB, demand outran the slow pagefile growth -> transient 97.2% CRITICAL (observed once this session, auto-healed). The 271GB floor keeps peak demand (171GB observed) at ~63% -- never CRITICAL.
4. **Verifying after reboot:** `$os=Get-CimInstance Win32_OperatingSystem; [math]::Round($os.TotalVirtualMemorySize/1MB,1)` should read ~271GB (was 168GB). And `(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' PagingFiles).PagingFiles` shows both entries.

## Secondary (demand-side) lever -- NOT yet applied, pending operator
Pin routine Ollama offload to a SMALL model so `llama-server` commits ~5GB instead of 103GB for mechanical tasks (reserving the big model for deep reasoning). Cuts commit pressure at the source. Ties to the offload-mechanism eval (the suggest-but-don't-execute gap; lever `PRISM_OLLAMA_ROUTE_AUTO=1`). Both are fleet-wide behavior changes awaiting the operator's (a)/(b) decision.

Monitoring rule unchanged: track commit% not RAM% ([[reference_golf_oom_commit_driver_ollama_2026_06_14]]). Siblings: [[reference_golf_oom_commit_driver_ollama_2026_06_14]], [[feedback_build_for_blackwell_hardware]], [[reference_fleet_memory_monitor_2026_05_16]].
