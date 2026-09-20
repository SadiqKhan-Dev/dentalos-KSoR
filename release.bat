@rem release.bat — Windows release script
@echo off
setlocal enabledelayedexpansion

echo DentalOS KSoR Release Script
echo =============================

REM Check prerequisites
where git >nul 2>&1 || (echo ERROR: git not found & exit /b 1)
where npm >nul 2>&1 || (echo ERROR: npm not found & exit /b 1)

REM Check for uncommitted changes
git diff --quiet
if %errorlevel% neq 0 (
    echo ERROR: Uncommitted changes. Commit or stash before releasing.
    exit /b 1
)

REM Get version from instance.md
for /f "tokens=2 delims=: " %%a in ('findstr "^scaffolded:" instance.md') do set VERSION=%%a
set VERSION=%VERSION:"=%

echo Releasing KSoR version: %VERSION%

REM Build the static site
echo Building static site...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)

REM Check build.lock.json
if not exist build.lock.json (
    echo ERROR: build.lock.json not found after build
    exit /b 1
)

REM Get build ID
for /f "tokens=4 delims=," %%a in ('findstr "build_id" build.lock.json') do set BUILD_ID=%%a
set BUILD_ID=%BUILD_ID:"=%
set BUILD_ID=%BUILD_ID: =%

echo Build ID: %BUILD_ID%

REM Commit build artifacts
git add build.lock.json
git commit -m "Release %VERSION% — build %BUILD_ID%"

REM Tag the release
git tag -a "v%VERSION%" -m "KSoR release %VERSION%"
echo Tagged: v%VERSION%

REM Ask to push
set /p PUSH="Push to remote? (y/N): "
if /i "%PUSH%"=="y" (
    git push origin main
    git push origin "v%VERSION%"
    echo Pushed to remote
)

echo Release %VERSION% complete!
