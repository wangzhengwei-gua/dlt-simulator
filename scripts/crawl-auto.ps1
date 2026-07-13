# ========================================
# 每日自动爬取开奖数据并提交推送（无交互）
# 供 Windows 计划任务调用
# ========================================

$ErrorActionPreference = "Continue"
Set-Location "E:\dlt-simulator"

$logTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Output "[$logTime] 开始自动爬取..."

# 1. 爬取三种彩种最新开奖数据
python scripts/crawler.py
if ($LASTEXITCODE -ne 0) {
    Write-Output "[$logTime] 爬虫执行失败"
    exit 1
}

# 2. 提交数据更新
git add data/
$status = git status --short
if ($status) {
    $date = Get-Date -Format "yyyy-MM-dd"
    git commit -m "auto: 每日更新开奖数据 $date" 2>$null

    # 3. 推送到 GitHub（直连失败则切换 kkgithub 镜像）
    git push github master 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Output "直连 GitHub 失败，尝试 kkgithub 镜像..."
        git config --local url."https://kkgithub.com/".insteadOf "https://github.com/"
        git push github master 2>$null
        $mirrorResult = $LASTEXITCODE
        git config --local --unset url."https://kkgithub.com/".insteadOf 2>$null
        if ($mirrorResult -eq 0) {
            Write-Output "镜像推送成功"
        } else {
            Write-Output "镜像推送也失败，数据已本地提交，待下次手动推送"
        }
    } else {
        Write-Output "推送成功"
    }
} else {
    Write-Output "数据无变化，无需提交"
}

$endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Output "[$endTime] 自动爬取完成"
