@echo off
echo ============================================
echo  CLAUDE-FLOW INSTALLER FOR PRISM
echo ============================================
echo.

:: Check Node.js version
echo Checking Node.js version...
node -v
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found! Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Installing claude-flow v3 alpha...
npm install -g claude-flow@v3alpha

echo.
echo Initializing claude-flow in PRISM project...
cd /d "%~dp0"
npx claude-flow@v3alpha init

echo.
echo ============================================
echo  INSTALLATION COMPLETE!
echo ============================================
echo.
echo Next steps:
echo   1. Start MCP server: npx claude-flow@v3alpha mcp start
echo   2. List agents: npx claude-flow@v3alpha agent list
echo   3. Run a test: npx claude-flow@v3alpha --agent coder --task "test"
echo.
pause
