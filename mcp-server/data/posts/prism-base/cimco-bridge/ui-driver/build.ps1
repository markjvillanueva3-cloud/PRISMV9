# build.ps1 - compile PrismCimcoUI.exe with the .NET Framework csc.exe. NO .NET SDK required
# (the framework C# 5 compiler at Framework64\v4.0.30319 + the GAC Accessibility.dll are always
# present on Windows). CIMCO MSAA / IAccessible driver, slot:echo 2026-06-04.
# Run from this directory:  powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1
$ErrorActionPreference = "Stop"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$acc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\Accessibility.dll"
if (-not (Test-Path $csc)) { Write-Error "csc.exe not found: $csc"; exit 2 }
if (-not (Test-Path $acc)) { Write-Error "Accessibility.dll not found: $acc"; exit 2 }
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& $csc /nologo /target:exe /platform:x64 /out:"$here\PrismCimcoUI.exe" "/r:$acc" "$here\Program.cs"
if ($LASTEXITCODE -eq 0) { Write-Output "built $here\PrismCimcoUI.exe" } else { Write-Error "compile failed ($LASTEXITCODE)"; exit 1 }
