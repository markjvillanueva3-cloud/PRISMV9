# MastercamNetHook — PRISM Bridge DLL

## What It Does

Loaded in-process by Mastercam.exe via the `-runchook` argument.  
Opens a named pipe (`\\.\pipe\prism-mcam-{pid}`) and services JSON commands  
sent by the TypeScript `MastercamAutomationBridge` engine in PRISM.

## Build Requirements

| Item | Value |
|------|-------|
| .NET Framework | 4.8 (matches Mastercam's host CLR) |
| Output type | Class Library (x64) |
| Target platform | x64 only |
| Assembly name | MastercamNetHook |

## Mastercam API References

All assembly paths assume a Mastercam 2024 default install.  
Adjust `MASTERCAM_DIR` to match your installation if different.

```
MASTERCAM_DIR = C:\Program Files\Mastercam 2024\
```

Add the following DLL references to your project:

```
$(MASTERCAM_DIR)Mastercam.App.dll
$(MASTERCAM_DIR)Mastercam.Database.dll
$(MASTERCAM_DIR)Mastercam.IO.dll
$(MASTERCAM_DIR)Mastercam.Curves.dll
$(MASTERCAM_DIR)Mastercam.Support.dll
$(MASTERCAM_DIR)Mastercam.Operations.dll
$(MASTERCAM_DIR)Mastercam.Math.dll
```

Also add a reference to `System.Web.Extensions` (part of .NET 4.8 BCL)  
for `JavaScriptSerializer`.

## Building with MSBuild

1. Open a Visual Studio 2022 Developer Command Prompt.
2. From the `bridges/mastercam/` directory:

```batch
msbuild MastercamNetHook.csproj /p:Configuration=Release /p:Platform=x64
```

Output DLL is written to `bin\x64\Release\MastercamNetHook.dll`.

3. Copy the output DLL to the PRISM deployment path:

```batch
copy bin\x64\Release\MastercamNetHook.dll "C:\ProgramData\PRISM\bridges\MastercamNetHook.dll"
```

## Building with csc (single-file, no project file)

If you do not have a .csproj, compile directly with the C# compiler:

```batch
set MCAM=C:\Program Files\Mastercam 2024
set NETFX=C:\Windows\Microsoft.NET\Framework64\v4.0.30319

%NETFX%\csc.exe ^
  /target:library ^
  /platform:x64 ^
  /optimize+ ^
  /out:"C:\ProgramData\PRISM\bridges\MastercamNetHook.dll" ^
  /reference:"%MCAM%\Mastercam.App.dll" ^
  /reference:"%MCAM%\Mastercam.Database.dll" ^
  /reference:"%MCAM%\Mastercam.IO.dll" ^
  /reference:"%MCAM%\Mastercam.Curves.dll" ^
  /reference:"%MCAM%\Mastercam.Support.dll" ^
  /reference:"%MCAM%\Mastercam.Operations.dll" ^
  /reference:"%MCAM%\Mastercam.Math.dll" ^
  /reference:"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Web.Extensions.dll" ^
  MastercamNetHook.cs
```

## Registering with Mastercam (-runchook)

The `-runchook` argument tells Mastercam to load the DLL in-process immediately  
after the API has been initialized. PRISM passes this automatically when spawning:

```
"C:\Program Files\Mastercam 2024\Mastercam.exe" -runchook "C:\ProgramData\PRISM\bridges\MastercamNetHook.dll"
```

The NET-Hook `Run()` method blocks until a `close` command is received over the pipe,  
keeping Mastercam alive for the duration of the PRISM session.

## Named Pipe Protocol

Pipe name: `\\.\pipe\prism-mcam-{pid}` where `{pid}` is the Mastercam process ID.

All messages are newline-delimited JSON (one JSON object per line).

### Command format

```json
{ "id": "mcam-1-1713000000000", "cmd": "open", "args": { "filePath": "C:/path/part.mcx-8" } }
```

### Response format

```json
{ "id": "mcam-1-1713000000000", "ok": true, "data": { "filePath": "...", "format": ".mcx-8" } }
{ "id": "mcam-2-1713000000001", "ok": false, "error": "File not found: ..." }
```

### Supported commands

| Command | Args | Response data |
|---------|------|---------------|
| `open` | `filePath` (string) | `{ filePath, format, opened }` |
| `getGeometry` | — | `{ lines[], arcs[], splines[], surfaces[], totalEntities }` |
| `getToolpaths` | — | same as `getOperationTree` (host flattens) |
| `getOperationTree` | — | `{ machineGroups[], totalOperations }` |
| `exportSTEP` | `outputPath` (string) | `{ outputPath, format, exported }` |
| `close` | — | `{ closed: true }` |

## Supported File Formats

| Extension | Format | Mastercam version |
|-----------|--------|-------------------|
| `.mcx-8` | Mastercam X8 / 2018+ | 2018 and later |
| `.mcam` | Mastercam 2019+ native | 2019 and later |
| `.MCX` | Legacy Mastercam | Pre-2018 |

All three formats are opened with `FileManager.Open()` — Mastercam handles format detection internally.

## Mock Mode (Development / CI)

Set the environment variable `PRISM_CAD_MOCK=1` before starting the PRISM MCP server.  
In mock mode the TypeScript bridge returns fixture data without spawning Mastercam.  
The C# DLL is not loaded or required.

## Deployment Checklist

- [ ] Build DLL targeting .NET 4.8 x64
- [ ] Copy to `C:\ProgramData\PRISM\bridges\MastercamNetHook.dll`
- [ ] Verify Mastercam install path in `MastercamAutomationBridge.ts` (`MASTERCAM_DEFAULT_PATH`)
- [ ] Verify DLL path in `MastercamAutomationBridge.ts` (`NETHOOK_DLL_DEFAULT`)
- [ ] Test with `PRISM_CAD_MOCK=1` first, then with a real `.mcx-8` file
