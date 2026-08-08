# Bai / 白 · 个人数字花园

当前版本使用 Astro + TypeScript + Markdown Content Collections，适合长期维护文章、项目、工具和收藏内容。

## 本地开发

```bash
npm install
npm run dev
```

然后访问终端显示的本地地址。常用命令：

```bash
npm run check   # Astro 类型检查
npm run build   # 生成 dist/ 静态文件
npm run preview # 预览构建产物
```

## 目录结构

- `src/content/entries/`：文章、项目、工具、游戏、收藏的 Markdown 内容。新增文件即可进入页面。
- `src/pages/games/`：游戏项目列表与详情页。
- `src/data/about.ts`：作者介绍、开发进度和版本说明的集中数据。
- `src/content/config.ts`：统一定义 frontmatter 字段和类型校验。
- `src/components/`：首页各内容区块。
- `src/pages/`：首页、文章列表、项目列表、游戏列表、关于页和详情页路由。
- `src/styles/global.css`：全局视觉系统和响应式规则。
- `src/scripts/site.ts`：搜索、主题切换和滚动导航交互。

## 部署

- **Vercel**：导入仓库，Framework Preset 选择 `Astro`，Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
- **阿里云 CAP / 腾讯云 Makers**：使用 Node.js 构建环境，执行 `npm install && npm run build`，发布 `dist` 目录。
- 项目输出为纯静态文件，不需要后端服务或数据库。

## 新增文章

在 `src/content/entries/` 创建 Markdown 文件，例如：

```md
---
kind: article
title: 一篇新文章
description: 首页列表中显示的摘要。
date: 2025-03-20
minutes: 06 min
tag: 思考
color: blue
featured: false
---

正文写在这里，构建时会生成独立详情页。
```
