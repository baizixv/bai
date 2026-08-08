---
kind: project
title: 书签快存 / Bookmark Quick Save
description: 一个让当前页面快速保存到指定书签位置的 Chrome 扩展。
date: 2025-03-20
label: Chrome 扩展 · React / TypeScript
visual: extension
url: https://github.com/baizixv/chrome-extension-bookmark
---

## 项目简介

“书签快存”是一个使用 React、TypeScript 和 Vite 构建的 Chrome Manifest V3 扩展，用一次选择完成当前页面的收藏。

它把目标文件夹和插入位置合并到同一棵书签树中，减少保存书签时反复打开文件夹、确认位置的操作。

## 主要功能

- 自动读取当前活动标签页的标题、网址和网站图标
- 在树形位置选择器中同时选择文件夹和插入位置
- 默认展开最常用的 Bookmarks Bar
- 单击文件夹保存到顶部，双击文件夹展开或折叠
- 点击已有书签可以将新书签插入到它之前，也可以选择目录末尾
- 支持跟随系统、简体中文和 English
- 记住上次选择的位置和语言偏好
- 当前文件夹存在相同网址时，直接移动已有书签

## 技术栈

React · TypeScript · Vite · Chrome Extension Manifest V3

[查看 GitHub 仓库](https://github.com/baizixv/chrome-extension-bookmark)
