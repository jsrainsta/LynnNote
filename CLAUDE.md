# LynnNote 开发指南

## 项目

轻量 Markdown 笔记应用（Tauri 2 + React + TS + Vite + Tailwind v4 + Zustand），面向大学生课堂记录与复习。

- 需求文档：`../LynnNote_Agent_Development_Spec.md`（仓库外，规范 §29 定义了 Agent 工作方式：每次只做一个阶段、不要过度设计、不提前实现后续阶段）
- 开发按阶段推进：阶段一（静态界面）、阶段二（CM6 编辑器 + 所见即所得实时预览）已完成，下一步阶段三（本地文件系统）

## 命令

```bash
npm run dev        # 前端开发服务器 :5173
npm run typecheck  # tsc -b --noEmit
npm run build      # tsc + vite 生产构建
npm run tauri dev  # 桌面应用（需 Rust 工具链，见下）
```

## Rust / Tauri 工具链（Windows 特殊配置）

本机无 VS Build Tools，使用 GNU 工具链（详见记忆 `lynnnote-toolchain-setup`）：

```bash
export PATH="/d/winlibs/mingw64/bin:$PATH"
cd src-tauri && cargo +stable-x86_64-pc-windows-gnu build
```

## 结构要点

- 三栏布局在 `src/components/layout/AppLayout.tsx`（react-resizable-panels v4：组件名为 `Group`/`Panel`/`Separator`，数字尺寸单位是**像素**，百分比要用字符串如 `"17"`）
- 主题 token 在 `src/styles/index.css` 的 `@theme`（Tailwind v4 class 策略暗色模式，`html.dark`）
- 状态拆分：`src/stores/` 下 `useCourseStore`/`useNoteStore`/`useEditorStore`/`useSettingsStore`
- 阶段一使用 `src/data/mock.ts` 模拟数据，阶段三接入文件系统后移除
- 编辑器：`src/components/editor/`——`MarkdownEditor.tsx`（live=AtomicEditor 实时预览 / source=裸 CM6 分栏源码）、`MarkdownPreview.tsx`（react-markdown 渲染）、`math-widget.ts`（KaTeX 公式 widget）、`editor-theme.ts`（CM6 主题）、`markdown-commands.ts`（Ctrl+B/I/K）
- 编辑器内容存于 `useEditorStore.noteContents`（按 noteId 缓存），自动保存为状态模拟（800ms 防抖），阶段三接真实文件系统
- Atomic Editor 主题通过 `--atomic-editor-*` CSS 变量覆盖（`src/styles/index.css`），值映射到设计 token 自动跟随深浅色
- 公式渲染：`$$...$$`/`$...$` 由 `math-widget.ts` 正则匹配 + KaTeX widget；代码块语法高亮由 `@codemirror/language-data` 按需懒加载
