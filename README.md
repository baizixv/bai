# 白子诩 · 个人工作台


当前版本使用 Astro + TypeScript + Markdown Content Collections，适合长期维护文章、项目、工具和收藏内容。

> 工程维护规则、目录职责、模块化约定和验证流程统一记录在 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 本地开发

```bash
npm install
npm run dev
```

然后访问终端显示的本地地址。常用命令：

```bash
npm run check             # Astro 类型检查
npm run check:structure   # 检查源文件是否超过 300 行
npm run build             # 结构检查 + 类型检查 + 生成 dist/ 静态文件
npm run preview           # 预览构建产物
```

## 目录结构

- `src/content/entries/`：文章、想法、项目、工具、游戏、收藏的 Markdown 内容。新增文件即可进入页面。
- `src/pages/games/`：游戏项目列表、游戏详情页和自托管人类基准测试。

- `src/pages/tools/`：Tiny Tools 集合、在线工具目录和独立工具页面。
- `src/scripts/pages/tiny-tools.ts`：Tiny Tools 的时间戳、Base64、MD5、颜色值和 JSON 工具逻辑。
- `src/data/benchmark.ts`：人类基准测试的测试项配置。
- `src/scripts/pages/benchmark.ts`：人类基准测试状态、页面控制和成绩逻辑。
- `src/scripts/pages/benchmark/`：按记忆、速度和逻辑分组的人类基准测试实现。
- `src/types/`：跨模块共享的 TypeScript 类型。
- `src/data/about.ts`：作者介绍、开发进度和版本说明的集中数据。
- `src/content/config.ts`：统一定义 frontmatter 字段和类型校验。

- `src/components/sections/`：首页各内容区块。
- `src/components/shared/`：跨页面复用的通用组件（Footer、联系我弹窗）。
- `src/scripts/`：全局交互脚本（site 主题/弹窗、search 站内搜索、pwa 安装）。
- `src/scripts/pages/`：绑定具体页面的工具/游戏脚本。
- `src/pages/`：首页、文章列表、项目列表、游戏列表、关于页和详情页路由。
- `src/styles/global.css`：全局样式入口，只负责按顺序导入 CSS 模块。

- `src/styles/modules/`：按基础层、首页区块、独立工具、游戏、响应式覆盖层和全局 UI 拆分的 CSS 模块；文件名前缀数字即导入顺序（层叠顺序），每个文件不超过 300 行。
- `src/lib/`：跨功能复用的浏览器工具，例如防御性 localStorage 读写。
- `scripts/check-file-limits.mjs`：构建前执行的源文件行数检查。
- `public/assets/`：本地 Logo、favicon、首页插画和项目封面。
- `scripts/generate_assets.py`：使用 Pillow 重新生成整套网站图形资源。

## 图形资源

网站图形由本地 Python/Pillow 脚本生成，不依赖在线图片服务：

```bash
python3 scripts/generate_assets.py
```

修改脚本中的配色或绘制逻辑后重新执行即可，生成结果会写入 `public/assets/`。

## 人类基准测试

本站的 `/games/human-benchmark/` 是基于公开参考项目独立重写的本地版，现已包含 18 项测试。成绩只保存在浏览器 localStorage，不需要后端。

参考项目：<https://gitee.com/aring1998/human-benchmark>

参考项目采用 GNU GPL v3。本站实现使用独立代码，不直接复制参考项目文件；如继续改编或分发参考项目代码，请遵守其许可证要求。


## 页面约定

- 详情页中的外部链接必须放在页面开头区域：位于标题、简介和封面之后，正文内容之前，避免用户翻页寻找。
- 同一详情页的操作按钮统一放在 `.detail-actions` 中，本站体验按钮排在前面，外部链接排在后面；按钮使用统一高度并保持顶部对齐。

- 外部链接需要使用明显的视觉样式（颜色、下划线或外链图标），并在新标签页打开。
- 首页项目展示区使用等宽网格，不为首个项目设置额外跨列或放大宽度；移动端按响应式规则降为单列。

- 在线工具统一使用 `kind: tool`，通过 `area: tiny` 放入“更多工具”集合，或通过 `area: standalone` 使用独立工具入口；工具应优先提供本站 `demoUrl`，不再混入项目档案。
- 参考 baizixv.com 的工具分类思路，但所有工具在本站独立实现；当前包括时间、编码、颜色、二维码和财务计算工具。默认采用浏览器本地处理，不上传或保存用户输入。

- `kind: media` 用于图书馆条目，通过 `mediaType: book | screen | music | game` 区分书籍、影视剧、音乐和游戏，可补充作者/导演、年份、评分、书籍字数、`color` 区分视觉主题和外部链接；书名展示统一使用中文书名号。




- Ogden 850 是独立实现的英语学习项目，数据放在 `public/data/ogden850.json`，学习进度和收藏只保存在浏览器 `localStorage`。


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
