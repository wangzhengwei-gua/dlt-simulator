@echo off
chcp 65001 >nul
cd /d E:\dlt-simulator
echo ========================================
echo   大乐透模拟器 - 一键更新
echo ========================================
echo.
set /p msg="请输入提交信息（直接回车使用默认）: "
if "%msg%"=="" (
    powershell -ExecutionPolicy Bypass -File update.ps1
) else (
    powershell -ExecutionPolicy Bypass -File update.ps1 -msg "%msg%"
)
echo.
pause
