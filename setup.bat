@echo off
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js nao encontrado. Instale em https://nodejs.org ^(versao LTS^) e rode de novo.
    pause
    exit /b 1
)
node "%~dp0scripts\setup.mjs" %*
echo.
pause
