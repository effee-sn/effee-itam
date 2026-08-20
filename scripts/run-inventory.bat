@echo off
setlocal

rem ===========================================================================
rem  ITAM inventory agent launcher
rem
rem  Put this file in the SAME FOLDER as inventory-agent.ps1, then double-click
rem  it. Nothing to type, and no administrator rights needed - everything the
rem  agent collects (serial, UUID, OS, BIOS, network, components, attached
rem  monitors, Entra/Intune state) is readable by a normal user account.
rem
rem  SERVER_URL below is your ITAM address, no trailing slash. Change it there
rem  only - the check further down validates the format and must be left alone.
rem ===========================================================================

set "SERVER_URL=http://192.168.10.223"

rem  Only if you set INVENTORY_TOKEN on the server; otherwise leave it empty.
set "TOKEN="

rem ===========================================================================
rem  Nothing below here needs editing.
rem ===========================================================================

rem Optional override, so one copy can be pointed elsewhere:
rem    run-inventory.bat http://other-host
if not "%~1"=="" set "SERVER_URL=%~1"

rem %~dp0 = this file's own folder, so double-clicking works from OneDrive, a
rem USB stick or a mapped drive regardless of the working directory.
set "AGENT=%~dp0inventory-agent.ps1"

if not exist "%AGENT%" (
    echo.
    echo   ERROR: inventory-agent.ps1 was not found next to this launcher.
    echo.
    echo   Looked for: %AGENT%
    echo.
    echo   Put run-inventory.bat and inventory-agent.ps1 in the same folder.
    echo.
    pause
    exit /b 1
)

rem Format check only - deliberately NOT compared against a hard-coded address,
rem so editing SERVER_URL above can never accidentally disable this guard.
echo %SERVER_URL% | findstr /i /r /c:"^https*://[a-z0-9]" >nul
if errorlevel 1 (
    echo.
    echo   ERROR: SERVER_URL does not look like a web address.
    echo.
    echo   Got: "%SERVER_URL%"
    echo.
    echo   Open run-inventory.bat in Notepad and set it to your ITAM address,
    echo   for example:  set "SERVER_URL=http://192.168.10.223"
    echo.
    pause
    exit /b 1
)

echo ===========================================================
echo  ITAM inventory agent
echo  Server: %SERVER_URL%
echo ===========================================================
echo.

if "%TOKEN%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%AGENT%" -ServerUrl "%SERVER_URL%"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%AGENT%" -ServerUrl "%SERVER_URL%" -Token "%TOKEN%"
)

echo.
echo ===========================================================
echo  Finished. Press any key to close.
echo ===========================================================
pause >nul
endlocal
