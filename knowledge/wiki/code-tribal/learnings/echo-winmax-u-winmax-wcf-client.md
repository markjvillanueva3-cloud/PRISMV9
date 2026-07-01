# ECHO-WINMAX/U-WINMAX-WCF-CLIENT — [MAIN] [ECHO-WINMAX]/U-WINMAX-WCF-CLIENT: net48 WCF shim speaks WinMax IDataService live to the VendorId gate

**Commit:** `3e3266a25e82` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T09:54:02-05:00
**Tags:** echo-winmax, u-winmax-wcf-client, auto-distilled

## Subject
[MAIN] [ECHO-WINMAX]/U-WINMAX-WCF-CLIENT: net48 WCF shim speaks WinMax IDataService live to the VendorId gate

## Body
```
[MAIN] [ECHO-WINMAX]/U-WINMAX-WCF-CLIENT: net48 WCF shim speaks WinMax IDataService live to the VendorId gate

dotnet-svcutil captured the REAL live IDataService (23 ops, a SID data-point bus) - earlier guessed op names (LoadProgram/GetProgramBlocks) DID NOT EXIST, corrected in winmax.actions.json v2. PrismWinMaxShim (net48, since .NET8 WCF throws PlatformNotSupportedException for SecurityMode.Message) negotiates WinMax's exact net.tcp Message+UserName binding end-to-end: server cert trust + DNS identity machine-connect.hurco.com proven against the live stack. Only remaining gate = a valid Hurco Vendor ID (custom VendorIdValidatorReadWrite rejected dummy creds). Read-only default, motion ops -allow-motion gated. Onion + go-live in wcf-client/CONTRACT.md.
```

## Files touched (9)
- mcp-server/data/posts/prism-base/winmax-bridge/DESIGN.md                             |   16 +-
- mcp-server/data/posts/prism-base/winmax-bridge/wcf-client/.gitignore                 |    4 +
- mcp-server/data/posts/prism-base/winmax-bridge/wcf-client/CONTRACT.md                |   94 +++++
- mcp-server/data/posts/prism-base/winmax-bridge/wcf-client/PrismWinMaxShim.csproj     |   47 +++
- mcp-server/data/posts/prism-base/winmax-bridge/wcf-client/Program.cs                 |  238 +++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/wcf-client/WinMaxDataService.cs       | 1797 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/wcf-client/dotnet-svcutil.params.json |   15 +
- mcp-server/data/posts/prism-base/winmax-bridge/winmax.actions.json                   |   68 +++-
- 8 files changed, 2259 insertions(+), 20 deletions(-)

## Lessons surfaced in commit body
- til captured the REAL live IDataService (23 ops, a SID data-point bus) - earlier guessed op names (LoadProgram/GetProgramBlocks) DID NOT EXIST, corrected in winmax.actions.json v2. PrismWinMaxShim (net48, since .NET8 WCF throws PlatformNotSupportedException for SecurityMode.Message) negotiates WinMax's exact net.tcp Message+UserName binding end-to-end: server cert trust + DNS identity machine-connect

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3e3266a25e82`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._