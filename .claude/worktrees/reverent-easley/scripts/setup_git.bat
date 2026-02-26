@echo off
REM PRISM Git Repository Setup Script
REM Run this in the PRISM REBUILD folder to initialize git

echo ========================================
echo   PRISM Git Repository Setup
echo ========================================
echo.

REM Initialize git if not already
if not exist ".git" (
    echo Initializing git repository...
    git init
    echo.
) else (
    echo Git already initialized.
    echo.
)

REM Create .gitignore
echo Creating .gitignore...
(
echo # Dependencies
echo node_modules/
echo.
echo # Build outputs
echo dist/
echo build/
echo *.min.js
echo *.min.css
echo.
echo # IDE
echo .idea/
echo .vscode/
echo *.swp
echo *.swo
echo.
echo # OS
echo .DS_Store
echo Thumbs.db
echo desktop.ini
echo.
echo # Logs
echo *.log
echo npm-debug.log*
echo.
echo # Environment
echo .env
echo .env.local
echo *.key
echo *.pem
echo.
echo # Large files ^(use Git LFS if needed^)
echo *.zip
echo *.rar
echo *.7z
echo *.pdf
echo *.step
echo *.stp
echo.
echo # Temp
echo temp/
echo tmp/
echo *.tmp
) > .gitignore

REM Create branch structure
echo.
echo Creating branch structure...
git checkout -b main 2>nul || git checkout main
git checkout -b develop 2>nul || echo Develop branch exists
git checkout -b extraction 2>nul || echo Extraction branch exists
git checkout -b v9-migration 2>nul || echo V9-migration branch exists
git checkout main

echo.
echo Branch structure created:
echo   - main          ^(stable releases^)
echo   - develop       ^(integration^)
echo   - extraction    ^(module extraction work^)
echo   - v9-migration  ^(v9.0 architecture^)
echo.

REM Initial commit
echo Creating initial commit...
git add .gitignore
git add SCRIPTS/
git add _PROJECT_FILES/ 2>nul
git add EXTRACTED/ 2>nul
git commit -m "Initial PRISM v9.0 rebuild setup" 2>nul || echo Nothing to commit

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Create GitHub repo at github.com/new
echo   2. Run: git remote add origin https://github.com/YOUR_USERNAME/prism-v9.git
echo   3. Run: git push -u origin main
echo.
pause
