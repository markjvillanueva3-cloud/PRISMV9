---
type: "chat-session"
source: "claude-code-cli"
session_id: "ae615ea8-e898-4173-ac12-90c5a5ad041e"
title: "Review a single additive change to a C# MSAA/Win32 UI driver: `H:\\prism\\mcp-serv"
date: "2026-06-10"
first_ts: "2026-06-10T13:54:51.892Z"
last_ts: "2026-06-10T13:56:45.505Z"
cwd: "H:\\prism\\mcp-server\\data\\posts\\prism-base\\cimco-bridge\\ui-driver"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/ae615ea8-e898-4173-ac12-90c5a5ad041e/subagents/agent-a0bc0e206af971d83.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review a single additive change to a C# MSAA/Win32 UI driver: `H:\prism\mcp-serv

> **claude-code-cli** | 2026-06-10 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver
> Raw: `H:/.claude/projects/H--prism/ae615ea8-e898-4173-ac12-90c5a5ad041e/subagents/agent-a0bc0e206af971d83.jsonl`

## Transcript

### User | 2026-06-10T13:54:51.892Z

Review a single additive change to a C# MSAA/Win32 UI driver: `H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver\Program.cs`.

The change adds a new `case "list-windows":` op plus 3 helpers (`TopLevelWindows`, `ChildWindowsAll`) and one P/Invoke (`GetDlgCtrlID`). Read the WHOLE file end-to-end, focusing on the new `list-windows` case and the new helpers.

CONTEXT: This driver drives CIMCO Edit (a CNC editor) via MSAA. A prior naive `read-window` op CRASHED with an unmanaged MSAA provider access-violation (exit 255) because it walked arbitrary windows' IAccessible trees. The WHOLE POINT of `list-windows` is to be CRASH-SAFE by using ONLY Win32 window enumeration (EnumWindows/EnumChildWindows/GetClassName/GetWindowText/GetDlgCtrlID) and NEVER touching IAccessible (AccessibleObjectFromWindow/AccessibleChildren). It was just validated live against CIMCO: exit 0, clean JSON, correctly enumerated a #32770 Setup dialog with ~70 child controls.

VERIFY (flag P0/P1, grade PASS/FAIL):
1. Does `list-windows` call ANY MSAA function (AccessibleObjectFromWindow / AccessibleChildren / get_acc*)? It MUST NOT — if it does, it reintroduces the AV crash class. (FireControl in the --pre path DOES use MSAA via accDoDefaultAction on the ribbon controls already walked in Main — that's the pre-existing, proven-stable path, acceptable.)
2. JSON correctness: every string goes through Esc(); the object/array bracket structure is balanced; the output is one valid JSON line parseable by JSON.parse.
3. Bounds: child-window enumeration capped (lwC>=80); is there any unbounded loop or OOM risk? EnumChildWindows recurses ALL descendants — is the cap correctly applied?
4. The --allow-actions gate: firing a UI action via --pre requires --allow-actions; a bare enumeration (no --pre) needs no gate. Is this correct and fail-closed?
5. GetDlgCtrlID P/Invoke signature correctness (returns int, takes IntPtr).
6. Any handle/resource leak, null-deref, or exception that escapes (the outer try/c
... [+252 chars truncated]

### Assistant | 2026-06-10T13:55:01.984Z

I'll review this C# UI driver change. Let me read the whole file end-to-end.

### Assistant | 2026-06-10T13:55:02.997Z

[tool_use: Read]

### User | 2026-06-10T13:55:26.222Z

[tool_result] 1	// PrismCimcoUI - drive CIMCO Edit 2026 Machine Simulation via MSAA / IAccessible (oleacc). slot:echo, 2026-06-04.
2	//
3	// WHY MSAA, not UIA: CIMCO's Codejock XTP ribbon ships an MSAA (IAccessible) provider but NO UI-Automation
4	// provider, so System.Windows.Automation sees an empty 15-21 node tree (0 buttons) while oleacc
5	// AccessibleObjectFromWindow on the XTPToolBar exposes ~213 childr
... [+47685 chars truncated]

### Assistant | 2026-06-10T13:55:36.813Z

Now let me verify the key claims by examining specific aspects. Let me check the helpers used by `list-windows`, the convention patterns, and confirm there are no MSAA calls in the new path.

### Assistant | 2026-06-10T13:55:38.060Z

[tool_use: Grep]

### User | 2026-06-10T13:55:39.125Z

[tool_result] 5:// AccessibleObjectFromWindow on the XTPToolBar exposes ~213 children. PowerShell 5.1 cannot traverse
6:// IAccessible reliably (COM arg-binding does not QI; AccessibleChildren returns empty names); compiled C#
13://   --op invoke <name>       accDoDefaultAction on the named control. GATED behind --allow-actions.
128:                    int hr = AccessibleObjectFromWindow(h.Value, OBJID_CLIENT, 
... [+2742 chars truncated]

### Assistant | 2026-06-10T13:56:45.505Z

The grep confirms the MSAA boundary. The `list-windows` case body is lines 281-326. The only MSAA call reachable inside it is `FireControl` (line 296), which is in the `--pre` path only — exactly the acceptable pre-existing path noted in the prompt. The bare enumeration uses only `TopLevelWindows`/`ChildWindowsAll`/`ClassOf`/`WindowTitle`/`GetDlgCtrlID`. Let me trace each helper to confirm.

The `list-windows` case (281-326), `TopLevelWindows` (569-574), `ChildWindowsAll` (576-581), `ClassOf` (491), `WindowTitle` (492), `GetDlgCtrlID` P/Invoke (487) — all reviewed. Let me verify the `Main` walk at line 119-131 always populates `ctls` before the switch (relevant to the `--pre` FireControl path inside list-windows), and double-check the JSON `cid` field is unquoted-numeric (a non-numeric `GetDlgCtrlID` return would break JSON).

I have everything needed. Let me produce the analysis.

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 1 (`H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver\Program.cs`)
- Issues Found: 3 (0 P0, 1 P1, 2 P2/advisory)
- Scope: the new `list-windows` case (lines 281-326) + helpers `TopLevelWindows` (569-574), `ChildWindowsAll` (576-581), and the `GetDlgCtrlID` P/Invoke (line 487)

### Verification of the 7 checkpoints

**1. MSAA-free enumeration — PASS (the load-bearing claim holds).**
The `list-windows` case body (281-326) calls only Win32: `TopLevelWindows()` (304), `ClassOf`/`WindowTitle` (308, 316), `ChildWindowsAll` (313), `GetDlgCtrlID` (319), `Hex`/`Esc`/`Trunc`. None of `AccessibleObjectFromWindow` / `AccessibleChildren` / `get_acc*` is reachable from the bare-enumeration path. The grep over the file confirms every MSAA call site is outside this case's enumeration loop. The **one** MSAA touch reachable from `list-windows` is `FireControl(ctls, preCtl)` at line 296 — but that is only entered when `--pre` is set, and it walks the *already-resolved* ribbon controls collected i
... [+7631 chars truncated]
