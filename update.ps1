# ========================================
# 大乐透模拟器 - 一键更新脚本
# 用法：在 E:\dlt-simulator 目录下运行 powershell -ExecutionPolicy Bypass -File update.ps1
# ========================================

param(
    [string]$msg = "更新代码"
)

Set-Location "E:\dlt-simulator"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  大乐透模拟器 - 代码更新脚本" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. 可选：运行爬虫更新开奖数据
$updateData = Read-Host "`n是否先运行爬虫更新开奖数据？(y/n)"
if ($updateData -eq "y" -or $updateData -eq "Y") {
    Write-Host "`n[1/3] 正在爬取最新开奖数据..." -ForegroundColor Yellow
    python scripts/crawler.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "爬虫运行失败，请检查网络" -ForegroundColor Red
    } else {
        Write-Host "开奖数据已更新" -ForegroundColor Green
    }
}

# 2. 提交代码到 Gitee
Write-Host "`n[2/3] 正在提交代码到 Gitee..." -ForegroundColor Yellow
git add -A
git status --short
git commit -m $msg
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "代码已推送到 Gitee" -ForegroundColor Green
} else {
    Write-Host "推送可能需要认证，如果失败请手动运行: git push origin master" -ForegroundColor Yellow
}

# 3. 提醒更新 COS
Write-Host "`n[3/3] 更新腾讯云 COS 网站" -ForegroundColor Yellow
Write-Host "请手动操作：" -ForegroundColor White
Write-Host "  1. 登录 https://console.cloud.tencent.com/cos" -ForegroundColor White
Write-Host "  2. 进入存储桶 dlt-simulator-wzw-1450726893" -ForegroundColor White
Write-Host "  3. 上传修改过的文件覆盖原文件" -ForegroundColor White
Write-Host "  4. 访问网站确认更新：" -ForegroundColor White
Write-Host "     https://dlt-simulator-wzw-1450726893.cos-website.ap-shanghai.myqcloud.com" -ForegroundColor Cyan

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "  更新完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
