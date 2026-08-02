# LynnNote

LynnNote —— a lightweight, local-first Markdown note app designed for university study.

一个为大学生日常课堂记录和课后复习设计的轻量 Markdown 笔记应用。

## 技术栈

Tauri 2 · React · TypeScript · Vite · Tailwind CSS · CodeMirror 6 · Zustand

Markdown 渲染：react-markdown + remark-gfm/math + rehype-katex/highlight/sanitize
实时预览：[@atomic-editor/editor](https://github.com/kenforthewin/atomic-editor)（CodeMirror 6 行内渲染扩展）

## 功能特性

- 三栏布局：课程列表 / 笔记列表 / 编辑区，宽度可拖动、可折叠
- Markdown 所见即所得编辑：标题、粗斜体、列表、引用、任务框、代码块实时渲染，光标进入所在行时显示原始语法
- 三种模式：实时预览 / 编辑分栏 / 纯预览
- GFM 表格、LaTeX 公式（KaTeX）、代码块语法高亮（按需加载 20+ 语言）
- 常用快捷键（Ctrl+B/I/K/F/S）、行号开关、会话内光标位置记忆
- 自动保存状态提示（未保存 / 正在保存 / 已保存）
- 浅色 / 深色主题

## 开发

```bash
npm install        # 安装依赖
npm run dev        # 启动前端开发服务器（http://localhost:5173）
npm run tauri dev  # 以桌面应用方式运行（需要 Rust 工具链）
```

## 常用命令

```bash
npm run typecheck  # TypeScript 类型检查
npm run build      # 生产构建（tsc + vite build）
npm run preview    # 预览生产构建
```

## 当前进度

- [x] 阶段一：静态界面（三栏布局、课程/笔记列表、深浅主题、模拟数据）
- [x] 阶段二：Markdown 编辑器（CodeMirror 6 + 所见即所得实时预览、三种模式、公式/代码高亮、快捷键、自动保存状态）
- [ ] 阶段三：本地文件系统
- [ ] 阶段四：课程系统
- [ ] 阶段五：模板和斜杠命令
- [ ] 阶段六：专注听课模式
- [ ] 阶段七：疑问与复习卡片
- [ ] 阶段八：搜索和设置
