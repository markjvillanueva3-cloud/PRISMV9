@echo off
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
cd /d C:\PRISM\mcp-server
echo [1/3] Prebuild gate...
node scripts\prebuild-gate.js
if errorlevel 1 (echo PREBUILD FAILED & exit /b 1)
echo [2/3] Type check...
call npx tsc --noEmit
echo TSC exit: %errorlevel%
echo [3/3] Bundle...
node node_modules\esbuild\bin\esbuild src/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:better-sqlite3 --external:cpu-features --external:ssh2 --external:playwright --external:bufferutil --external:utf-8-validate
for %%F in (dist\index.js) do echo Size: %%~zF bytes
echo BUILD COMPLETE
