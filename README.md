# 🎰 大乐透摇号模拟器

一个纯前端的大乐透摇号模拟应用，带滚动减速动画，并可自动爬取官方开奖号码。

🌐 **在线访问**：<https://wangzhengwei-gua.github.io/dlt-simulator/>

## ✨ 功能

- 🎲 **摇号模拟**：模拟大乐透摇号过程，球体滚动减速动画，依次开出号码
- 📡 **自动爬取**：定时从中国体彩网官方接口爬取最新开奖号码
- 📜 **历史记录**：展示最近 30 期开奖记录
- 📱 **响应式设计**：支持手机和电脑访问
- 🚀 **零成本部署**：纯静态页面，部署到 Gitee Pages

## 🛠 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | HTML + CSS + JavaScript（无框架依赖） |
| 爬虫 | Python + requests |
| CI/CD | Gitee Go（定时爬取 + 自动部署） |
| 部署 | Gitee Pages |

## 📁 项目结构

```
dlt-simulator/
├── index.html                # 主页面
├── css/style.css             # 样式文件
├── js/simulator.js           # 摇号模拟与动画
├── scripts/crawler.py        # 开奖号码爬虫
├── data/latest.json          # 开奖数据（自动更新）
├── .gitee/workflows/deploy.yml  # Gitee Go CI 配置
└── README.md
```

## 🚀 快速开始

### 在线访问

直接打开网页即可使用（推荐）：

<https://wangzhengwei-gua.github.io/dlt-simulator/>

### 本地爬取数据

```bash
pip install requests
python scripts/crawler.py
```

爬取后刷新页面即可看到最新开奖号码。

## 📌 部署到 Gitee Pages

1. 在 [Gitee](https://gitee.com) 创建仓库并推送代码
2. 进入仓库 **服务 → Gitee Pages**，开启服务
3. 部署目录设为根目录（`/`）
4. 开启**自动部署**，之后每次推送代码会自动更新页面

## ⚙️ 配置自动爬取（Gitee Go）

1. 进入仓库 **流水线（Gitee Go）**
2. 基于 `.gitee/workflows/deploy.yml` 创建流水线
3. 在流水线设置中授予**仓库写权限**（用于提交爬取的数据）
4. 流水线会在每周一、三、六 21:30 自动执行爬虫并推送数据

> 若 Gitee Go 免费额度不足，也可在本地或服务器用 crontab 定时执行 `python scripts/crawler.py` 后推送。

## 🎱 大乐透规则

- **前区**：从 01-35 中选 5 个号码（红球）
- **后区**：从 01-12 中选 2 个号码（蓝球）
- **开奖日**：每周一、三、六晚 20:30

## ⚠️ 免责声明

本软件仅供学习和娱乐，模拟摇号结果与官方无关。开奖数据来源于 500 彩票网公开数据，仅供参考。
