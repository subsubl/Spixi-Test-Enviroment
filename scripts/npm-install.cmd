@echo off
:: Run npm in a cmd shell to avoid PowerShell execution policy blocking npm.ps1
REM Use the nodejs installation's npm.cmd if available
IF EXIST "%ProgramFiles%\nodejs\npm.cmd" (
    "%ProgramFiles%\nodejs\npm.cmd" install %*
) ELSE (
    REM fallback to PATH-installed npm (npm.cmd)
    npm.cmd install %*
)
EXIT /B %ERRORLEVEL%
