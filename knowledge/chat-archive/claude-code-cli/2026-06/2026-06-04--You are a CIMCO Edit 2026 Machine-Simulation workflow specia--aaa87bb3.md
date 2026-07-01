---
type: "chat-session"
source: "claude-code-cli"
session_id: "aaa87bb3-eea6-4fc4-8793-363322989a8b"
title: "You are a CIMCO Edit 2026 Machine-Simulation workflow specialist. Read the decom"
date: "2026-06-04"
first_ts: "2026-06-04T14:19:01.780Z"
last_ts: "2026-06-04T14:25:21.394Z"
cwd: "H:\\prism"
messages: 70
user_msgs: 30
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/aaa87bb3-eea6-4fc4-8793-363322989a8b/subagents/workflows/wf_683cfc07-22b/agent-ac1ff06e684427496.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# You are a CIMCO Edit 2026 Machine-Simulation workflow specialist. Read the decom

> **claude-code-cli** | 2026-06-04 | 70 msgs (30 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/aaa87bb3-eea6-4fc4-8793-363322989a8b/subagents/workflows/wf_683cfc07-22b/agent-ac1ff06e684427496.jsonl`

## Transcript

### User | 2026-06-04T14:19:01.780Z

You are a CIMCO Edit 2026 Machine-Simulation workflow specialist. Read the decompiled CHM help pages under H:/prism/resources/cimco-2026/_extracted/edit_us/ (Glob/Grep for simulation/backplot/machine/report/setup pages — e.g. *imulat*, *backplot*, *machine*, *report*). Document the EXACT end-to-end Machine Simulation workflow a driver must reproduce: (1) how you open/enter Machine Simulation from an open NC, (2) HOW a machine is selected/loaded (the .mcfg picker dialog — menu path, dialog name, control names), (3) HOW the controller/control-type is set for that machine, (4) how the simulation is RUN and how you know it FINISHED, (5) how the Simulation Report (collision/over-travel/gouge results) is generated and EXPORTED/saved to a file (format + path), (6) every keyboard accelerator documented. Quote the source .htm filenames. Be concrete and exhaustive; flag anything the CHM does NOT document (a real gap the live probe must fill). Also cross-check against H:/prism/state/shared/cimco/nav-map.json (backplot.* and simulation-report surfaces).


EMPIRICAL GROUND TRUTH (verified by the live chat this session, DESKTOP-N7MI1VB):
- REAL licensed install: C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe (29.4MB, MFC/C++ app, v26.01.10) hosts File-Compare + Machine Simulation. Dll\CIMCOSimulation.exe (6.7MB, v1.0.0.469) is the 3D sim engine. Sys\KeyManager.exe gates the license. The HKCU\SOFTWARE\CIMCO\CIMCOEdit tree has saved DockingPaneLayouts -> the app HAS been run interactively before. No .lic file (CIMCO uses KeyManager online/dongle licensing). OPERATOR HAS PURCHASED the Machine Simulation add-on and granted permission to launch CIMCO.
- H:\prism\resources\cimco-2026\CIMCOEdit is a REFERENCE COPY (no license) — do NOT target it for the live driver; use C:\Program Files\CIMCO 2026. The decompiled CHM help is at H:\prism\resources\cimco-2026\_extracted\edit_us\ (154 .htm pages).
- GOAL (operator): get CIMCO to read PRISM-generated posts RELATIVE TO the machine+contr
... [+2080 chars truncated]

### Assistant | 2026-06-04T14:19:23.521Z

I'll work through the CHM help pages systematically. Let me start by finding the relevant simulation/machine/backplot/report pages and cross-checking the nav-map.

### Assistant | 2026-06-04T14:19:24.446Z

[tool_use: Glob]

### Assistant | 2026-06-04T14:19:25.956Z

[tool_use: Bash]

### User | 2026-06-04T14:19:37.178Z

[tool_result] resources\cimco-2026\_extracted\edit_us\1716471188564797.htm
resources\cimco-2026\_extracted\edit_us\1718194028854266.htm
resources\cimco-2026\_extracted\edit_us\advanced-configuration-editor.htm
resources\cimco-2026\_extracted\edit_us\backplot-fast.htm
resources\cimco-2026\_extracted\edit_us\backplotgeometrymanager.htm
resources\cimco-2026\_extracted\edit_us\backplotnavigation.htm
resources\cimco
... [+5888 chars truncated]

### User | 2026-06-04T14:19:41.233Z

[tool_result] backplot-fast.htm
backplotgeometrymanager.htm
backplotnavigation.htm
backplotsimulationreport.htm
backplotvariables.htm
custom-machines.htm
dncsetup.htm
dncsetupftp.htm
dncsetupftpportsetup.htm
dncsetupftptransmitsettings.htm
dncsetupftpversioninfo.htm
dncsetupserial.htm
dncsetupserialdirectorysettings.htm
dncsetupserialportsetup.htm
dncsetupserialreceivesettings.htm
dncsetupserialtransmitsettings
... [+955 chars truncated]

### Assistant | 2026-06-04T14:19:54.351Z

The key pages are clear. Let me read the core simulation/backplot/machine pages in parallel.

### Assistant | 2026-06-04T14:19:54.891Z

[tool_use: Read]

### Assistant | 2026-06-04T14:19:55.302Z

[tool_use: Read]

### Assistant | 2026-06-04T14:19:56.247Z

[tool_use: Read]

### Assistant | 2026-06-04T14:19:56.311Z

[tool_use: Read]

### User | 2026-06-04T14:20:00.776Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="new-simulation.htm">Simulation</a><spa
... [+11334 chars truncated]

### User | 2026-06-04T14:20:00.781Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="new-simulation.htm">Simulation</a></di
... [+2809 chars truncated]

### User | 2026-06-04T14:20:02.722Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="editorsetup.htm">Editor Setup</a><span
... [+2842 chars truncated]

### User | 2026-06-04T14:20:03.173Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="editorsetup.htm">Editor Setup</a><span
... [+5745 chars truncated]

### Assistant | 2026-06-04T14:20:21.341Z

Now the keystone page — `backplot-fast.htm` (Machine Simulation add-on), plus the backplot config and ribbon/control pages.

### Assistant | 2026-06-04T14:20:22.386Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:22.752Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:23.212Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:23.896Z

[tool_use: Read]

### User | 2026-06-04T14:20:26.605Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="new-simulation.htm">Simulation</a><spa
... [+3783 chars truncated]

### User | 2026-06-04T14:20:28.365Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="editorsetup.htm">Editor Setup</a><span
... [+5649 chars truncated]

### User | 2026-06-04T14:20:28.367Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+1145 chars truncated]

### User | 2026-06-04T14:20:28.674Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="new-simulation.htm">Simulation</a><spa
... [+11940 chars truncated]

### Assistant | 2026-06-04T14:20:36.453Z

Now the critical menu pages — `menubackplotfile` (where Machine Simulation launches), `menubackplotfiletype` (Control Type / machine selection), `menubackplottoolpath` (Stop Conditions), and the report-related menus. Plus the keyboard accelerators which appear in menu pages.

### Assistant | 2026-06-04T14:20:36.454Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:36.458Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:36.461Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:37.222Z

[tool_use: Read]

### User | 2026-06-04T14:20:42.365Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+9329 chars truncated]

### User | 2026-06-04T14:20:43.309Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+1945 chars truncated]

### User | 2026-06-04T14:20:44.040Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+2586 chars truncated]

### User | 2026-06-04T14:20:50.840Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+2757 chars truncated]

### Assistant | 2026-06-04T14:20:58.490Z

This is the keystone gap area. The Simulation Report has no documented "export/save to file" button — only `Save Presentation` (simulation playback, not the collision/over-travel verdict). Let me check the remaining backplot menus for any report-export, the printing setup (report printing), and the global accelerator list. Then cross-check the nav-map.

### Assistant | 2026-06-04T14:20:58.597Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:58.600Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:58.602Z

[tool_use: Read]

### Assistant | 2026-06-04T14:20:58.953Z

[tool_use: Read]

### User | 2026-06-04T14:21:03.735Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+9055 chars truncated]

### User | 2026-06-04T14:21:04.537Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="new-simulation.htm">Simulation</a><spa
... [+12605 chars truncated]

### User | 2026-06-04T14:21:04.538Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+9724 chars truncated]

### User | 2026-06-04T14:21:05.469Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="new-simulation.htm">Simulation</a><spa
... [+1887 chars truncated]

### Assistant | 2026-06-04T14:21:14.613Z

I have the full picture on the Simulation Report export gap. Now let me confirm the keyboard accelerators across the editor file/print menus and check the printing setup for any report-print path, then cross-check the nav-map.json.

### Assistant | 2026-06-04T14:21:14.628Z

[tool_use: Read]

### Assistant | 2026-06-04T14:21:14.658Z

[tool_use: Read]

### Assistant | 2026-06-04T14:21:14.687Z

[tool_use: Read]

### Assistant | 2026-06-04T14:21:15.545Z

[tool_use: Bash]

### User | 2026-06-04T14:21:19.790Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="editorsetup.htm">Editor Setup</a><span
... [+5441 chars truncated]

### User | 2026-06-04T14:21:20.924Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+2320 chars truncated]

### User | 2026-06-04T14:21:20.938Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+2784 chars truncated]

### User | 2026-06-04T14:22:52.258Z

[tool_result] H:/prism/resources/cimco-2026/_extracted/edit_us/chm.css
H:/prism/resources/cimco-2026/_extracted/edit_us/global/icons/generic_section_arrow_down.png
H:/prism/resources/cimco-2026/_extracted/edit_us/global/icons/generic_setup_small.png
H:/prism/resources/cimco-2026/_extracted/edit_us/global/icons/generic_updown_arrows.png
H:/prism/resources/cimco-2026/_extracted/edit_us/global/images/chm-footer-lo
... [+3132 chars truncated]

### Assistant | 2026-06-04T14:23:01.009Z

Let me get the precise accelerator list by grepping just the .htm content, and read the editor file menu (which holds the main accelerators) plus the menusetup page. Then cross-check nav-map.json.

### Assistant | 2026-06-04T14:23:01.010Z

[tool_use: Grep]

### Assistant | 2026-06-04T14:23:01.392Z

[tool_use: Read]

### User | 2026-06-04T14:23:03.800Z

[tool_result] File content (443.7KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-04T14:23:08.852Z

[tool_result] resources\cimco-2026\_extracted\edit_us\setupmachine.htm:62:F1000
resources\cimco-2026\_extracted\edit_us\menuncassistantmultichannel.htm:22:Ctrl+
resources\cimco-2026\_extracted\edit_us\menuncassistantmultichannel.htm:26:Ctrl+
resources\cimco-2026\_extracted\edit_us\menubackplotfile.htm:7:Ctrl+
resources\cimco-2026\_extracted\edit_us\menubackplotfile.htm:7:Shift+
resources\cimco-2026\_extracted\e
... [+3085 chars truncated]

### Assistant | 2026-06-04T14:23:21.946Z

Let me get the remaining accelerator pages and the menubackplotother (full screen Escape), and cross-check nav-map.json for backplot.* and simulation-report surfaces.

### Assistant | 2026-06-04T14:23:21.965Z

[tool_use: Read]

### Assistant | 2026-06-04T14:23:22.478Z

[tool_use: Bash]

### User | 2026-06-04T14:23:26.024Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+4742 chars truncated]

### User | 2026-06-04T14:23:32.196Z

[tool_result] TOP KEYS: schemaVersion, generatedBy, generatedFrom, generatedAt, note, surfaceCount, duplicateIdsDropped, channelDistribution, proofRelevantCount, clusters, criticalPathVerdicts, synthesis, surfaces
criticalPathVerdicts [arr 5]

### Assistant | 2026-06-04T14:23:39.272Z

Let me extract the critical-path verdicts and the backplot/simulation-report surfaces from nav-map.json to complete the cross-check.

### Assistant | 2026-06-04T14:23:39.471Z

[tool_use: Bash]

### User | 2026-06-04T14:23:44.422Z

[tool_result] === META ===
surfaceCount: 511 proofRelevantCount: 370 channelDistribution: {"uia":374,"dnc-api":14,"file":120,"cli":3}

=== criticalPathVerdicts ===
[
 {
  "pathName": "open-nc-in-editor",
  "navigable": true,
  "coveredSteps": [
   "Launch CIMCO Edit -> editor.file.open (cli) [exe-launch-with-path mechanism]; supporting: setup.general.associate-extensions (uia)",
   "Open a specific .nc/.min/.hn
... [+20683 chars truncated]

### Assistant | 2026-06-04T14:23:50.569Z

The nav-map cross-check is comprehensive and confirms the CHM read. The nav-map's `sim.report` is explicitly flagged "GUI-only — must be read via UIA (no documented export/file)" — exactly matching the CHM gap. Let me do one final verification: confirm there is no separate "supported-controls" page documenting controller-set for a machine, and check `menusetup.htm` (the Setup tab entry that holds Editor Setup access). Then I have everything.

### Assistant | 2026-06-04T14:23:50.839Z

[tool_use: Read]

### Assistant | 2026-06-04T14:23:50.955Z

[tool_use: Read]

### User | 2026-06-04T14:23:55.382Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="program-tabs.htm">Program Tabs</a><spa
... [+645 chars truncated]

### User | 2026-06-04T14:23:55.757Z

[tool_result] 1	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><link rel="stylesheet" type="text/css" href="chm.css"></head><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div class="breadcrumbs"><span class="separator">/</span><a class="breadcrumbs__link" href="editorsetup.htm">Editor Setup</a><span
... [+1586 chars truncated]

### Assistant | 2026-06-04T14:25:21.394Z

I now have the complete, exhaustive picture from the CHM plus the nav-map cross-check. Both sources independently confirm the keystone gap. Here is the documentation.

---

# CIMCO Edit 2026 — Machine Simulation Workflow (CHM-documented, end-to-end)

Source CHM root: `H:/prism/resources/cimco-2026/_extracted/edit_us/`. Every claim below is quoted from a named `.htm`. The live driver targets `C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe` (NOT the H: reference copy).

## Naming reality (read this first)
The CHM has **no entity literally called "the .mcfg picker dialog."** What the operator/probe think of as machine selection is split across TWO surfaces with TWO different dropdowns. The CHM term "Machine Simulation" = the licensed add-on that turns plain Backplot into kinematic (machine-body) simulation. The collision/over-travel/gouge "verdict" lives in a docking-pane tab literally named **"Simulation"** (the **Simulation Report**), not a separate report window.

---

## (1) Entering Machine Simulation from an open NC

Source: `menubackplotfile.htm`, `backplot-fast.htm`, `new-simulation.htm`.

- With an NC open, the editor exposes a ribbon tab **"Backplot"** (`tabbackplot.htm`). Under it, the **Backplot** menu group (`menubackplotfile.htm`) holds two distinct launch commands:
  - **"Backplot / *Ctrl+Shift+P*"** — plain toolpath simulation (no machine body). `menubackplotfile.htm:7`.
  - **"Machine Simulation"** — the add-on. `menubackplotfile.htm:11`: *"Select this option to simulate the current NC program in Machine Simulation."* **This menu item is only visible with a valid Machine Simulation license** (`menubackplotfile.htm:14`: *"You will only see this option with a valid license for Machine Simulation installed"*). The operator has purchased it, so it will be present.
- `backplot-fast.htm:5`: *"Machine Simulation is started from the Machine Simulation option in the Backplot menu. This is similar to starting Backplot except it shows the machine…"*
- On lau
... [+14525 chars truncated]
