# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-BREAKTHROUGH — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-BREAKTHROUGH (slot:echo): BREAKTHROUGH - the autonomous-driving channel is MSAA/IAccessible, NOT UI-Automation. cimco-full-drive-workaround workflow (wf_8b6783b5-262, 6 agents) ranked MSAA-provider-force as the strong lead; cimco-ms-realize-probe.ps1 PROVED it live: AccessibleObjectFromWindow(hwnd, OBJID_CLIENT=-4, IID_IAccessible) returns a valid IAccessible on CIMCO command bars and XTPToolBar exposes 213 MSAA children (reproduced 213/213) - exactly where UIA reports 0 buttons/0 tabs. Codejock XTP ships an MSAA provider but NO UIA provider -> System.Windows.Automation was the wrong API; the A4 'ribbon never realizes' dead-end was UIA-blindness. Same run confirmed UIA Rung-1 DEAD: /ms + SPI_SETFOREGROUNDLOCKTIMEOUT=0 (lock maxed 2147483647) + SetForegroundWindow left UIA subtree at 21. Marshaling invariants: [MarshalAs(Interface)] out IAccessible + Add-Type -ReferencedAssemblies Accessibility; OBJID_CLIENT as int -4; HARD cast [Accessibility.IAccessible]$child for COM QI. Spec A5 pivots driver to oleacc MSAA. Answers operator: yes, full autonomous CIMCO driving IS possible. Next: AccessibleChildren() name-map + accDoDefaultAction drive + report IAccessible read.

**Commit:** `cfc30ff4fbef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T12:47:30-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-msaa-breakthrough, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-BREAKTHROUGH (slot:echo): BREAKTHROUGH - the autonomous-driving channel is MSAA/IAccessible, NOT UI-Automation. cimco-full-drive-workaround workflow (wf_8b6783b5-262, 6 agents) ranked MSAA-provider-force as the strong lead; cimco-ms-realize-probe.ps1 PROVED it live: AccessibleObjectFromWindow(hwnd, OBJID_CLIENT=-4, IID_IAccessible) returns a valid IAccessible on CIMCO command bars and XTPToolBar exposes 213 MSAA children (reproduced 213/213) - exactly where UIA reports 0 buttons/0 tabs. Codejock XTP ships an MSAA provider but NO UIA provider -> System.Windows.Automation was the wrong API; the A4 'ribbon never realizes' dead-end was UIA-blindness. Same run confirmed UIA Rung-1 DEAD: /ms + SPI_SETFOREGROUNDLOCKTIMEOUT=0 (lock maxed 2147483647) + SetForegroundWindow left UIA subtree at 21. Marshaling invariants: [MarshalAs(Interface)] out IAccessible + Add-Type -ReferencedAssemblies Accessibility; OBJID_CLIENT as int -4; HARD cast [Accessibility.IAccessible]$child for COM QI. Spec A5 pivots driver to oleacc MSAA. Answers operator: yes, full autonomous CIMCO driving IS possible. Next: AccessibleChildren() name-map + accDoDefaultAction drive + report IAccessible read.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-BREAKTHROUGH (slot:echo): BREAKTHROUGH - the autonomous-driving channel is MSAA/IAccessible, NOT UI-Automation. cimco-full-drive-workaround workflow (wf_8b6783b5-262, 6 agents) ranked MSAA-provider-force as the strong lead; cimco-ms-realize-probe.ps1 PROVED it live: AccessibleObjectFromWindow(hwnd, OBJID_CLIENT=-4, IID_IAccessible) returns a valid IAccessible on CIMCO command bars and XTPToolBar exposes 213 MSAA children (reproduced 213/213) - exactly where UIA reports 0 buttons/0 tabs. Codejock XTP ships an MSAA provider but NO UIA provider -> System.Windows.Automation was the wrong API; the A4 'ribbon never realizes' dead-end was UIA-blindness. Same run confirmed UIA Rung-1 DEAD: /ms + SPI_SETFOREGROUNDLOCKTIMEOUT=0 (lock maxed 2147483647) + SetForegroundWindow left UIA subtree at 21. Marshaling invariants: [MarshalAs(Interface)] out IAccessible + Add-Type -ReferencedAssemblies Accessibility; OBJID_CLIENT as int -4; HARD cast [Accessibility.IAccessible]$child for COM QI. Spec A5 pivots driver to oleacc MSAA. Answers operator: yes, full autonomous CIMCO driving IS possible. Next: AccessibleChildren() name-map + accDoDefaultAction drive + report IAccessible read.
```

## Files touched (3)
- scripts/cimco-ms-realize-probe.ps1                         | 136 +++++++++++++++++++++++++++++++++++
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md |  10 +++
- 2 files changed, 146 insertions(+)

## Lessons surfaced in commit body
- wrong API; the A4 'ribbon never realizes' dead-end was UIA-blindness. Same run confirmed UIA Rung-1 DEAD: /ms + SPI_SETFOREGROUNDLOCKTIMEOUT=0 (lock maxed 2147483647) + SetForegroundWindow left UIA subtree at 21. Marshaling invariants: [MarshalAs(Interface)] out IAccessible + Add-Type -ReferencedAssemblies Accessibility; OBJID_CLIENT as int -4; HARD cast [Accessibility.IAccessible]$child for COM QI. Sp

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cfc30ff4fbef`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._