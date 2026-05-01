# InventorBridge — Build Instructions

COM host for Autodesk Inventor geometry/tree extraction.
Used by `InventorAutomationBridge.ts` (PRISM engine E2480).

## Prerequisites

| Requirement | Version |
|---|---|
| Windows | 10/11 (COM only works on Windows) |
| .NET Framework | 4.8 (Developer Pack) |
| Autodesk Inventor | 2022 or later |
| NuGet: Newtonsoft.Json | 13.x |

The Inventor interop DLL is registered in the GAC when Inventor is installed.
Reference path: `C:\Windows\assembly\GAC_MSIL\Autodesk.Inventor.Interop\`

## Build with MSBuild

```bat
REM From this directory
nuget restore InventorBridge.csproj
msbuild InventorBridge.csproj /p:Configuration=Release /p:Platform="Any CPU"
REM Output: bin\Release\InventorBridge.exe
```

## Build with Visual Studio

1. Open `InventorBridge.sln` (or create a new Console App targeting .NET Framework 4.8)
2. Add COM reference: Project > Add Reference > COM > Autodesk Inventor Object Library
3. Install NuGet package: `Newtonsoft.Json` v13.x
4. Build > Release > Any CPU

## Environment Variables (TypeScript side)

| Variable | Default | Purpose |
|---|---|---|
| `INVENTOR_BRIDGE_EXE` | `InventorBridge.exe` | Full path to built exe |
| `PRISM_CAD_MOCK` | `0` | Set to `1` to skip spawning; uses fixture data |

## Deployment

Copy `InventorBridge.exe` and `Newtonsoft.Json.dll` to the same folder.
Set `INVENTOR_BRIDGE_EXE` to the full path, e.g.:

```
INVENTOR_BRIDGE_EXE=C:\prism\bridges\inventor\InventorBridge.exe
```

## Protocol

NDJSON (newline-delimited JSON) over stdin/stdout.

**Request:**
```json
{"id":"req-1","cmd":"open","args":{"filePath":"C:\\parts\\die.ipt"}}
```

**Response (success):**
```json
{"id":"req-1","ok":true,"data":{"opened":true,"filePath":"C:\\parts\\die.ipt"}}
```

**Response (error):**
```json
{"id":"req-1","ok":false,"error":"File not found: C:\\parts\\die.ipt"}
```

## Supported Commands

| Command | Args | Returns |
|---|---|---|
| `open` | `filePath: string` | `{ opened, filePath }` |
| `getParameters` | — | `InventorParameters` (model params + iProperties + iMate/iLogic flags) |
| `getModelTree` | — | `InventorModelTree` (feature tree JSON) |
| `exportSTEP` | `outputPath: string` | `{ exported, outputPath, format }` |
| `getMassProperties` | — | `{ mass, volume, centerOfMass, momentsOfInertia, densityUsed }` |
| `close` | — | `{ closed }` |

## iAssembly / iPart Handling

The bridge detects part-number-driven variants:
- `iAssemblyMember: true` — this document is a member of an iAssembly table
- `iPartMember: true` — this document is an iPart factory member
- `hasIMate: true` — document contains iMate definitions
- `hasILogic: true` — document has at least one iLogic rule

The TypeScript engine (`InventorAutomationBridge.ts`) surfaces these flags in
`InventorParameters` so the caller can handle variant-driven BOM scenarios.

## Troubleshooting

**"Inventor is not installed (ProgID not found)"** — Inventor must be installed on the
same machine. The bridge cannot run headless without a licensed Inventor installation.

**"Failed to start Inventor"** — If Inventor is already running, the bridge attaches
to the existing instance (`Marshal.GetActiveObject`). If it crashes, restart Inventor.

**Timeout (60s)** — Large assembly files or slow drives can exceed the default 60s
timeout. Increase `COMMAND_TIMEOUT_MS` in `InventorAutomationBridge.ts` if needed.
