@echo off
:: Start npm in a cmd shell to avoid PowerShell execution policy blocking npm.ps1
IF EXIST "%ProgramFiles%\nodejs\npm.cmd" (
    "%ProgramFiles%\nodejs\npm.cmd" start %*
) ELSE (
    npm.cmd start %*
)
EXIT /B %ERRORLEVEL%
