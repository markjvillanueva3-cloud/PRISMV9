@echo off
echo === PRISM FOLDER AUDIT ===
echo.

echo --- C:\PRISM ---
dir /s /a C:\PRISM 2>nul | find "File(s)"
echo.

echo --- C:\PRISM ---
dir /s /a "C:\PRISM" 2>nul | find "File(s)"
echo.

echo === KEY SUBDIRECTORIES ===
echo.

echo --- C:\PRISM\mcp-server ---
if exist C:\PRISM\mcp-server (dir /s /a C:\PRISM\mcp-server 2>nul | find "File(s)") else echo NOT FOUND
echo.

echo --- C:\PRISM\skills-consolidated ---
if exist C:\PRISM\skills-consolidated (dir /s /a C:\PRISM\skills-consolidated 2>nul | find "File(s)") else echo NOT FOUND
echo.

echo --- C:\PRISM\scripts ---
if exist C:\PRISM\scripts (dir /s /a C:\PRISM\scripts 2>nul | find "File(s)") else echo NOT FOUND
echo.

echo --- PRISM REBUILD EXTRACTED ---
if exist "C:\PRISM\EXTRACTED" (dir /s /a "C:\PRISM\EXTRACTED" 2>nul | find "File(s)") else echo NOT FOUND
echo.

echo --- PRISM REBUILD _SKILLS ---
if exist "C:\PRISM\_SKILLS" (dir /s /a "C:\PRISM\_SKILLS" 2>nul | find "File(s)") else echo NOT FOUND
