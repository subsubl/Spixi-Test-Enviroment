@echo off
REM Pack every app into the packed directory
node "%~dp0\\pack-all.js"
EXIT /B %ERRORLEVEL%
