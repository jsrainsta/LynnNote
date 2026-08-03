# LynnNote 开发指南

## 项目

轻量 Markdown 笔记应用（Tauri 2 + React + TS + Vite + Tailwind v4 + Zustand），面向大学生课堂记录与复习。

- 需求文档：`../LynnNote_Agent_Development_Spec.md`（仓库外，规范 §29 定义了 Agent 工作方式：每次只做一个阶段、不要过度设计、不提前实现后续阶段）
- 开发日志：`../LynnNote_Development_Log.md`（仓库外，每阶段完成后追加）
- 开发按阶段推进：阶段一（静态界面）、阶段二（CM6 编辑器 + 实时预览）、阶段三（本地文件系统）已完成，下一步阶段四（课程系统）

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

注意：
- **不要用 `cargo test`**（lib test harness 链接 tauri 后启动即 0xc0000139）；逻辑验证用 `cargo run --bin logic-check`
- 直接运行构建出的 exe 需在 exe 旁放 `target/debug/build/webview2-com-sys-*/out/x64/WebView2Loader.dll`（缺了启动报 0xc0000139）

## 结构要点

- 三栏布局在 `src/components/layout/AppLayout.tsx`（react-resizable-panels v4：组件名为 `Group`/`Panel`/`Separator`，数字尺寸单位是**像素**，百分比要用字符串如 `"17"`）
- 主题 token 在 `src/styles/index.css` 的 `@theme`（Tailwind v4 class 策略暗色模式，`html.dark`）
- 状态拆分：`src/stores/` 下 `useCourseStore`/`useNoteStore`/`useEditorStore`/`useSettingsStore`
- 文件系统：Rust 命令在 `src-tauri/src/`（filesystem/mod.rs 实现 + commands/mod.rs 声明）；前端适配层 `src/lib/storage/fs.ts`（Tauri invoke / 浏览器 localStorage 双模式，JSON 类型与 Rust serde camelCase 对应），工作区状态在 `useWorkspaceStore`（启动自动恢复最近工作区，recent.json 存应用配置目录）
- 工作区结构：`notes/<课程slug>/*.md`；courses.json 只读（阶段四写入）；笔记 id = 相对路径
- 编辑器：`src/components/editor/`——`MarkdownEditor.tsx`（live=AtomicEditor 实时预览 / source=裸 CM6 分栏源码）、`MarkdownPreview.tsx`（react-markdown 渲染）、`math-widget.ts`（KaTeX 公式 widget）、`editor-theme.ts`（CM6 主题）、`markdown-commands.ts`（Ctrl+B/I/K）
- 编辑器内容存于 `useEditorStore.noteContents`（按 noteId 缓存）；自动保存真实写盘（800ms 防抖 → saveNow → 冲突检测 FNV hash），切换笔记/关闭窗口前 flushAll；SaveStatus 含 error
- 浏览器验证（CDP）：Tauri 桌面模式用 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9223"` 启动 exe 后可连 WebView2 CDP
- Atomic Editor 主题通过 `--atomic-editor-*` CSS 变量覆盖（`src/styles/index.css`），值映射到设计 token 自动跟随深浅色
- 公式渲染：`$$...$$`/`$...$` 由 `math-widget.ts` 正则匹配 + KaTeX widget；代码块语法高亮由 `@codemirror/language-data` 按需懒加载
