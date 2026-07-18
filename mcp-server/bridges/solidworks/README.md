# SolidWorksBridge — C# COM Host

PRISM CAD-AUTOMATION-MS0 / U-CAUT02

This directory contains the C# bridge that hosts `SldWorks.Application` via COM
interop. The TypeScript engine (`src/engines/SolidWorksAutomationBridge.ts`)
spawns `SolidWorksBridge.exe` and communicates with it over newline-delimited
JSON on stdin/stdout.

## Prerequisites

| Requirement | Version |
|---|---|
| .NET Framework | 4.8 (installed with Windows 10/11) |
| SolidWorks | 2020 or newer (must be installed on build machine) |
| Newtonsoft.Json | 13.x (NuGet) |
| MSBuild or VS | Visual Studio 2019/2022 or MSBuild 16+ |

SolidWorks interop DLLs are found in:
```
C:\Program Files\SOLIDWORKS Corp\SOLIDWORKS\api\redist\
```
Required assemblies:
- `SolidWorks.Interop.sldworks.dll`
- `SolidWorks.Interop.swconst.dll`
- `SolidWorks.Interop.swpublished.dll`

## Build (build.bat)

Run from this directory:

```bat
build.bat
```

The batch file below performs a NuGet restore then MSBuild release compile:

```bat
@echo off
setlocal

set SW_ROOT=C:\Program Files\SOLIDWORKS Corp\SOLIDWORKS\api\redist
set NUGET=%~dp0nuget.exe
set OUT=%~dp0SolidWorksBridge.exe

REM Download NuGet CLI if absent
if not exist "%NUGET%" (
    powershell -Command "Invoke-WebRequest https://dist.nuget.org/win-x86-commandline/latest/nuget.exe -OutFile '%NUGET%'"
)

REM Restore Newtonsoft.Json
"%NUGET%" restore "%~dp0SolidWorksBridge.csproj" -NonInteractive

REM Compile
MSBuild "%~dp0SolidWorksBridge.csproj" /p:Configuration=Release /p:Platform=x64 /p:OutputPath="%~dp0" /nologo
if %ERRORLEVEL% neq 0 ( echo BUILD FAILED & exit /b 1 )

echo Build succeeded: %OUT%
```

## Project File (SolidWorksBridge.csproj)

Create `SolidWorksBridge.csproj` alongside `SolidWorksBridge.cs`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net48</TargetFramework>
    <LangVersion>7.3</LangVersion>
    <PlatformTarget>x64</PlatformTarget>
    <Nullable>disable</Nullable>
    <RootNamespace>PRISM.CADAutomation</RootNamespace>
    <AssemblyName>SolidWorksBridge</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>

  <ItemGroup>
    <Reference Include="SolidWorks.Interop.sldworks">
      <HintPath>$(SW_ROOT)\SolidWorks.Interop.sldworks.dll</HintPath>
      <EmbedInteropTypes>false</EmbedInteropTypes>
    </Reference>
    <Reference Include="SolidWorks.Interop.swconst">
      <HintPath>$(SW_ROOT)\SolidWorks.Interop.swconst.dll</HintPath>
      <EmbedInteropTypes>false</EmbedInteropTypes>
    </Reference>
    <Reference Include="SolidWorks.Interop.swpublished">
      <HintPath>$(SW_ROOT)\SolidWorks.Interop.swpublished.dll</HintPath>
      <EmbedInteropTypes>false</EmbedInteropTypes>
    </Reference>
  </ItemGroup>
</Project>
```

## Output

After `build.bat` succeeds:
```
bridges/solidworks/SolidWorksBridge.exe   ← spawned by TypeScript engine
```

The TypeScript engine automatically locates this binary via:
```
{projectRoot}/bridges/solidworks/SolidWorksBridge.exe
```

## IPC Protocol

All communication is newline-delimited JSON over stdin/stdout.

### Startup handshake
The bridge writes `{"ready":true}` on startup. The TypeScript engine waits
for this line (up to 20 s) before sending any commands.

### Request format (stdin)
```json
{"id":1,"cmd":"open","args":{"filePath":"C:\\parts\\widget.sldprt"}}
```

### Response format (stdout)
```json
{"id":1,"ok":true,"result":{"filePath":"...","documentType":"part","title":"widget"}}
{"id":2,"ok":false,"error":"File not found: C:\\missing.sldprt"}
```

### Commands

| cmd | args | result |
|-----|------|--------|
| `open` | `{filePath}` | `{filePath, documentType, title}` |
| `getFeatureTree` | `{}` | `{features:[{name,type,suppressed,children}]}` |
| `exportSTEP` | `{outputPath}` | `{outputPath, success}` |
| `exportPDF` | `{outputPath}` | `{outputPath, success}` |
| `getBoundingBox` | `{}` | `{min:[x,y,z], max:[x,y,z], units:"mm"}` |
| `close` | `{}` | `{closed:true}` |

### Named-pipe override

Set `NAMED_PIPE=1` in the environment before spawning to switch from
stdin/stdout to the named pipe `\\.\pipe\prism-sw-{pid}`. See the
`SWNamedPipeServer` stub at the bottom of `SolidWorksBridge.cs` for the
hook point where this override is wired in (U-CAUT08).

## Troubleshooting

**`SldWorks.Application` ProgID not registered**
SolidWorks is not installed on this machine. The bridge cannot run.

**`OpenDoc6` returns null**
Possible causes: file version newer than installed SW, file locked by another
process, or SW license error. Check stderr output for the error/warning codes.

**Timeout in TypeScript (60 s)**
SolidWorks is performing a long rebuild. Increase `OPERATION_TIMEOUT_MS` in
`SolidWorksAutomationBridge.ts` for large assemblies.

**PROCESS_TERMINATE on timeout**
Intentional — the TypeScript engine hard-kills the bridge after 60 s per
operation. Restart is automatic on the next call.
