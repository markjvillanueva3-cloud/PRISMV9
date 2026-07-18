---
type: "chat-session"
source: "claude-code-cli"
session_id: "ae615ea8-e898-4173-ac12-90c5a5ad041e"
title: "Review an additive READ-ONLY op in the C# CIMCO driver `H:\\prism\\mcp-server\\data"
date: "2026-06-10"
first_ts: "2026-06-10T15:44:31.151Z"
last_ts: "2026-06-10T15:45:56.078Z"
cwd: "H:\\prism\\mcp-server\\data\\posts\\prism-base\\cimco-bridge\\ui-driver"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/ae615ea8-e898-4173-ac12-90c5a5ad041e/subagents/agent-a07f919ef2a812887.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review an additive READ-ONLY op in the C# CIMCO driver `H:\prism\mcp-server\data

> **claude-code-cli** | 2026-06-10 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver
> Raw: `H:/.claude/projects/H--prism/ae615ea8-e898-4173-ac12-90c5a5ad041e/subagents/agent-a07f919ef2a812887.jsonl`

## Transcript

### User | 2026-06-10T15:44:31.151Z

Review an additive READ-ONLY op in the C# CIMCO driver `H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver\Program.cs`. Read the whole file, focusing on the NEW `case "read-setting":`, the `IsCheckboxButton()` helper, and the `BM_GETCHECK`/`GWL_STYLE`/`GetWindowLongPtr` additions.

CONTEXT: read-setting opens the CIMCO Setup #32770 (--pre fires "Configure Machine Type"), navigates the SysTreeView32 to the page whose controls contain --name (substring), and reports each control + each checkbox's state via BM_GETCHECK. It reuses the already-reviewed FindSetupTree/CollectTreeItems/AllChildHwnds/TVM_SELECTITEM (all 2-arm-PASS'd). It is READ-ONLY: BM_GETCHECK is a read message, no BM_CLICK/SETCHECK/SETTEXT, no OK pressed, tree left neutral. Live-validated: read the Select-plugins page, "Disable advanced simulation" cid 14016 = unchecked (add-on active), and correctly showed 2 OTHER plugins checked/disabled (differentiated real states, not all-zero).

VERIFY (flag P0/P1, grade PASS/FAIL):
1. READ-ONLY guarantee: confirm the op sends ONLY BM_GETCHECK (read) + TVM_SELECTITEM (navigation) + TVM_GETNEXTITEM — NO BM_CLICK/BM_SETCHECK/WM_SETTEXT, no OK/Apply press. Nothing persists.
2. GetWindowLongPtr P/Invoke: EntryPoint="GetWindowLongPtrW" exists on x64 user32; the (style & 0x0F) BS_TYPEMASK check correctly identifies checkbox/radio/3state (0x02/03/04/05/06/09) vs pushbutton.
3. BM_GETCHECK interpretation: checkState 1=BST_CHECKED -> checked:true; 0/2 -> false. Correct? (2=indeterminate reported as checkState but checked:false — acceptable.)
4. JSON validity: balanced brackets, Esc on strings, cid + checkState as raw ints, the conditional ",checked"/",checkState" only emitted for checkboxes. Parse-safe?
5. Fail-closed paths: no --name -> return 2; no Setup dialog -> return 2; no page matches hint -> return 2 (after re-selecting root neutral). The --allow-actions gate present (opens a dialog via --pre).
6. Crash-safety: no MSAA tree-walk (only --pre FireControl 
... [+249 chars truncated]

### Assistant | 2026-06-10T15:44:40.169Z

I'll review the read-setting operation in the C# CIMCO driver. Let me start by reading the whole file.

### Assistant | 2026-06-10T15:44:40.825Z

[tool_use: Read]

### User | 2026-06-10T15:44:42.782Z

[tool_result] 1	// PrismCimcoUI - drive CIMCO Edit 2026 Machine Simulation via MSAA / IAccessible (oleacc). slot:echo, 2026-06-04.
2	//
3	// WHY MSAA, not UIA: CIMCO's Codejock XTP ribbon ships an MSAA (IAccessible) provider but NO UI-Automation
4	// provider, so System.Windows.Automation sees an empty 15-21 node tree (0 buttons) while oleacc
5	// AccessibleObjectFromWindow on the XTPToolBar exposes ~213 childr
... [+65078 chars truncated]

### Assistant | 2026-06-10T15:45:56.078Z

I have read the entire file. Now let me analyze the new `read-setting` path and its helpers against each verification point. Let me cross-check the Win32 constants and BS_TYPEMASK values precisely.

The key code for review:
- `case "read-setting":` lines 408-463
- `IsCheckboxButton()` lines 637-642
- `BM_GETCHECK`/`GWL_STYLE`/`GetWindowLongPtr` additions lines 632-636

Let me verify the Win32 constant values and BS_TYPEMASK semantics carefully, since those are the highest-risk correctness claims.

The BS_* style constants per the Windows SDK (`winuser.h`):
- `BS_PUSHBUTTON` = 0x00, `BS_DEFPUSHBUTTON` = 0x01
- `BS_CHECKBOX` = 0x02, `BS_AUTOCHECKBOX` = 0x03
- `BS_RADIOBUTTON` = 0x04, `BS_3STATE` = 0x05, `BS_AUTO3STATE` = 0x06
- `BS_GROUPBOX` = 0x07, `BS_USERBUTTON` = 0x08, `BS_AUTORADIOBUTTON` = 0x09
- `BS_OWNERDRAW` = 0x0B
- `BS_TYPEMASK` = 0x0F

`BM_GETCHECK` = 0x00F0, `GWL_STYLE` = -16, `TVM_GETNEXTITEM` = TV_FIRST(0x1100)+10 = 0x110A, `TVM_SELECTITEM` = TV_FIRST+11 = 0x110B, `TVGN_ROOT` = 0x0000, `TVGN_NEXT` = 0x0001, `TVGN_CHILD` = 0x0004, `TVGN_CARET` = 0x0009. All match the file.

Now let me work through each verification point and report concrete findings.

## Code Quality Analysis Report — `read-setting` op + helpers

### Summary
- Scope: NEW `case "read-setting":` (Program.cs:408-463), `IsCheckboxButton()` (637-642), the `BM_GETCHECK`/`GWL_STYLE`/`GetWindowLongPtr`/`BS_TYPEMASK` additions (632-642).
- Verdict: **PASS** — the op is genuinely read-only, fail-closed, crash-safe, JSON-safe, and convention-conformant. Findings below are P2/P3 only; no P0/P1.

---

### 1. READ-ONLY guarantee — VERIFIED PASS

The read-setting path sends only read/navigation messages. Concretely:
- `Program.cs:430` `SendMessage(rsTree, TVM_SELECTITEM, ...)` — tree navigation (selection, not edit).
- `Program.cs:438` `SendMessage(rsTree, TVM_GETNEXTITEM, (IntPtr)TVGN_ROOT, ...)` — read.
- `Program.cs:439` `SendMessage(rsTree, TVM_SELECTITEM, ...)` — re-select root (navigation only).

... [+9601 chars truncated]
