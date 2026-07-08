# ========================================
# 摇号模拟器 - 一键更新脚本（大乐透/双色球/排列三）
# 用法：在 E:\dlt-simulator 目录下运行
#   powershell -ExecutionPolicy Bypass -File update.ps1
# 或带提交信息：
#   powershell -ExecutionPolicy Bypass -File update.ps1 -msg "添加了新功能"
# ========================================

param(
    [string]$msg = "更新代码"
)

Set-Location "E:\dlt-simulator"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  摇号模拟器 - 代码更新脚本" -ForegroundColor Cyan
Write-Host "  大乐透 / 双色球 / 排列三" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. 可选：运行爬虫更新开奖数据（三种彩种）
$updateData = Read-Host "`n是否先运行爬虫更新开奖数据？(y/n)"
if ($updateData -eq "y" -or $updateData -eq "Y") {
    Write-Host "`n[1/3] 正在爬取最新开奖数据（大乐透/双色球/排列三）..." -ForegroundColor Yellow
    python scripts/crawler.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "爬虫运行失败，请检查网络" -ForegroundColor Red
    } else {
        Write-Host "开奖数据已更新" -ForegroundColor Green
    }
}

# 2. 提交代码
Write-Host "`n[2/3] 正在提交代码..." -ForegroundColor Yellow
git add -A
git status --short
git commit -m $msg

# 3. 推送到 GitHub（GitHub Pages 会自动部署）
Write-Host "`n[3/3] 推送到 GitHub..." -ForegroundColor Yellow
git push github master
if ($LASTEXITCODE -eq 0) {
    Write-Host "  推送成功" -ForegroundColor Green
} else {
    Write-Host "  推送失败，可能需要先同步：git pull github master --rebase" -ForegroundColor Red
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "  更新完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "GitHub Pages 地址（1-2分钟后生效）：" -ForegroundColor White
Write-Host "  https://wangzhengwei-gua.github.io/dlt-simulator/" -ForegroundColor Cyan
