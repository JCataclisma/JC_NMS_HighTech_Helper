@echo off
chcp 65001 > nul
cd /d "%~dp0"
where py > nul 2>&1
if %errorlevel%==0 ( py servidor_local.py ) else (
  where python > nul 2>&1
  if %errorlevel%==0 ( python servidor_local.py ) else (
    echo Python not found. Opening the offline HTML directly...
    start "" "%~dp0index.html"
  )
)
