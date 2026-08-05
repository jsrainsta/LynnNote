# 📝 LynnNote

> 轻量 · 本地优先 · 专为大学生课堂记录与课后复习设计的 Markdown 笔记应用

LynnNote is a lightweight, local-first Markdown note app designed for university study — take notes in class, review after class.

## ✨ 技术栈

| 层 | 技术 |
| --- | --- |
| 🖥️ 桌面外壳 | Tauri 2 + Rust |
| ⚛️ 前端 | React 19 + TypeScript（strict 模式） |
| ⚡ 构建 | Vite + Tailwind CSS v4 |
| ✏️ 编辑器 | CodeMirror 6 + [@atomic-editor/editor](https://github.com/kenforthewin/atomic-editor)（行内实时渲染扩展） |
| 📐 Markdown 渲染 | react-markdown + remark-gfm/math + rehype-katex/highlight/sanitize |
| 🧠 状态管理 | Zustand |

## 🚀 功能特性

### 📁 本地工作区
- 选择任意文件夹作为工作区，笔记以**标准 Markdown 文件**保存在 `notes/` 下，可直接用其他编辑器打开
- 最近工作区自动恢复，打开即续写

### 💾 自动保存
- 停止输入即写盘，切换笔记 / 关闭窗口前立即保存
- 外部修改冲突有提示，**不覆盖**外部改动

### 🖊️ Markdown 所见即所得
- 三栏布局（课程 / 笔记 / 编辑区），宽度可拖拽、可折叠
- 标题、粗斜体、列表、引用、任务框、代码块实时渲染，光标进入所在行时显示原始语法
- 三种模式：实时预览 / 编辑分栏 / 纯预览（`Ctrl+/` 一键切换）
- GFM 表格、LaTeX 公式（KaTeX）、代码块语法高亮（按需加载 20+ 语言）
- 行号开关、会话内光标位置记忆

### ⌨️ 快捷键
`Ctrl+B/I/K` 格式 · `Ctrl+S` 保存 · `Ctrl+N` 新建 · `Ctrl+P` 快速打开 · `Ctrl+Shift+F` 全局搜索 · `Ctrl+F` 就地搜索 · `Ctrl+Shift+P` 命令面板 · `F11` 专注模式

### 🗂️ 笔记与课程管理
- 笔记：新建、重命名（文件名与标题同步）、删除（二次确认）
- 课程：创建（slug 自动生成）、编辑（名称/颜色/教师/地点/学期，改名不动目录）、删除（提示笔记数），元数据持久化

### ⚡ 效率工具
- **斜杠命令**：空行输入 `/` 弹出快捷菜单（标题/列表/待办/引用/代码块/公式/表格/问题/复习卡片/分割线）
- **笔记模板**：内置 4 种（空白/课堂/实验/错题）+ 自定义模板，变量 `{{title}}/{{date}}/{{course}}` 自动替换，随工作区持久化

### 🎧 专注听课模式（F11）
隐藏侧栏全屏记录，顶栏显示课程/笔记/保存状态/计时，退出时总结本次**时长 / 新增字数 / 疑问 / 卡片**

### ❓ 疑问与复习
- `> [!QUESTION]` 标记疑问（或 `/问题` 快捷插入），侧栏疑问面板按课程汇总，点击**直接定位原文并高亮**，可标记已解决（写回 `solved`）
- `Q:` / `A:` 格式创建**复习卡片**，一键开始复习（随机顺序 → 先看问题再看答案 → 标记不会/模糊/掌握），熟悉度统计持久化，可随时跳回来源笔记

### 🔍 搜索与设置
- 全文搜索（`Ctrl+Shift+F`）：标题/正文/课程名全量搜索，点击结果定位高亮
- 命令面板（`Ctrl+Shift+P`）：11 个常用命令键盘直达
- 设置页：主题（浅色/深色/跟随系统）、强调色、界面缩放、编辑器（字号/行高/字体/行号/换行/Tab/自动保存延迟）、公式与代码高亮开关、同步滚动、默认模式、工作区数据管理（打开文件夹/导出设置/重建索引），全部持久化

### 🌙 主题
浅色 / 深色 / 跟随系统，三套主题自由切换

## 🚀 安装与使用

- **便携版**：解压 `LynnNote-便携版-v0.1.0.zip`，双击 `lynnnote.exe` 即可使用（Windows 10/11 自带 WebView2 运行时，无需安装任何依赖）
- **开发模式**：见下方「开发」章节

## 🛠️ 开发

```bash
npm install        # 安装依赖
npm run dev        # 启动前端开发服务器（http://localhost:5173）
npm run tauri dev  # 以桌面应用方式运行（需要 Rust 工具链）
```

## 📦 常用命令

```bash
npm run typecheck  # TypeScript 类型检查
npm run build      # 生产构建（tsc + vite build）
npm run preview    # 预览生产构建
```
