@echo off
setlocal enabledelayedexpansion

set "SRC=C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS"
set "DST=C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\UPLOAD_ALL"

for /D %%d in ("%SRC%\prism-*") do (
    set "name=%%~nxd"
    if exist "%%d\SKILL.md" (
        copy "%%d\SKILL.md" "%DST%\!name!_SKILL.md" >nul
        echo Copied: !name!
    )
)

echo.
echo Done! Check UPLOAD_ALL folder.
