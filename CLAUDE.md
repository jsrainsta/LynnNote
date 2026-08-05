# LynnNote 开发指南

## 项目

轻量 Markdown 笔记应用（Tauri 2 + React + TS + Vite + Tailwind v4 + Zustand），面向大学生课堂记录与复习。

- 需求文档：`../LynnNote_Agent_Development_Spec.md`（仓库外，规范 §29 定义了 Agent 工作方式：每次只做一个阶段、不要过度设计、不提前实现后续阶段）
- 开发日志：`../LynnNote_Development_Log.md`（仓库外，每阶段完成后追加）
- 开发按阶段推进：阶段一至六已完成；阶段七（疑问与复习卡片）、阶段八（搜索和设置）已完成，规范全部阶段已实现

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
- 工作区结构：`notes/<课程slug>/*.md`；courses.json 读写（阶段四：课程 CRUD）；笔记 id = 相对路径
- 课程系统（阶段四）：slug 在创建时生成后**不可变**（改课程名不动目录，保证笔记关联）；`slugify` 规则 Unicode 字母数字保留（中文原样）、其余转 `-`，Rust 与 fs.ts 双实现保持一致；删除课程 = courses.json 移除 + 删除整个课程目录（UI 有笔记数确认）；课程编辑弹窗 `CourseEditDialog.tsx`、右键菜单 `CourseContextMenu.tsx`、色板 8 色
- Logo：`src/assets/logo.png`（界面显示）；`src-tauri/icons/` 由 sources/logo.png 用 PIL 生成（改图标用 PIL 重新生成，勿手工编辑）
- 斜杠命令（阶段五）：CM6 插件（slash-commands.ts）检测行首 `/` 同步 `useSlashStore`，菜单 UI 由 React 组件 SlashMenu 渲染——**不要**在 ViewPlugin 里直接持有 DOM（AtomicEditor 编辑中会重建扩展清掉它）；`view.coordsAtPos` 不能在 update 期间调用（须 setTimeout 0）
- 笔记模板（阶段五）：内置 4 种在 `src/lib/templates.ts`（applyTemplate 变量替换）；自定义模板存工作区 `templates.json`（Rust 命令 list/save/delete_template）；新建笔记 → 输入标题 → TemplatePickerDialog 选择模板
- 专注模式（阶段六）：`useFocusStore`（enter/exit/tick，统计差值）；布局分支在 AppLayout（FocusBar + 编辑区全宽，EditorArea 不重挂载）；F11/Esc 快捷键在 App.tsx；统计函数在 `src/lib/stats.ts`（复用阶段七解析器）
- 疑问/卡片（阶段七）：解析器 `src/lib/parser.ts`（`> [!QUESTION]` + 连续引用行；`Q:` 行 + **连续** `A:` 行；行首匹配避免误识别；`normalizeNewlines` CRLF→LF——JS 正则 `.` 不匹配 `\r`）；索引 `useIndexStore`（工作区打开全量 build、保存成功后增量 reparse；contents 全文缓存是搜索数据源）；疑问面板 = 课程侧栏 tab（CourseSidebar 双 tab）；复习 = ReviewDialog + useReviewStore（熟悉度 localStorage，不改 Markdown）；solved 写回 `[!QUESTION] solved` 原文
- **点击定位机制（阶段七/八，易踩坑）**：`useEditorActionStore.requestLocate` → action-registry 通知已挂载 CM6 视图（editor-actions.ts 的 locateExtension/insertExtension）消费。① AtomicEditor 挂载时先创建临时视图再替换（临时视图 dom 永不连接）→ 只在**连接的**视图上消费，否则 150ms 重试；② AtomicEditor 初始化约 1 秒内的状态重建会清掉早期 dispatch 的高亮 → 分 0/250/600/1200ms 幂等重试 dispatch；③ 重试 dispatch 不要 focus（会抢走搜索/快速打开输入框焦点）；④ 不能在一次 update 期间同步 dispatch（setTimeout 0）
- 搜索/设置（阶段八）：SearchDialog 三模式（all 全局 Ctrl+Shift+F / titles 快速打开 Ctrl+P / note 编辑器外 Ctrl+F）；CommandPalette（Ctrl+Shift+P，面板动作经 useUiEventStore fire/consume 桥接）；SettingsDialog 四组（外观/编辑器/Markdown/数据），`useSettingsStore` persist 到 localStorage `lynnnote:settings`（**选择器必须标量**——对象选择器每次新引用会触发 useSyncExternalStore 无限循环）
- 设置生效链路：App.tsx 副作用（theme 跟随系统 matchMedia、accent→`--color-accent`、uiScale→html zoom、字号/行高/字体→`--ln-editor-*` CSS 变量）；MarkdownEditor 用 Compartment+ref 快照+ViewPlugin 重配（AtomicEditor extensions 只在挂载时捕获）；MarkdownPreview 按设置组装 remark/rehype 插件（sanitize 始终最后）+ 订阅 editorScroll 单向同步滚动；accent-strong/soft 由 color-mix 派生
- Rust 命令：`read_all_notes`（批量索引构建）、`reveal_workspace`（explorer）、`export_settings`（写工作区根 lynnnote-settings.json）
- 编辑器：`src/components/editor/`——`MarkdownEditor.tsx`（live=AtomicEditor 实时预览 / source=裸 CM6 分栏源码）、`MarkdownPreview.tsx`（react-markdown 渲染）、`math-widget.ts`（KaTeX 公式 widget）、`editor-theme.ts`（CM6 主题）、`markdown-commands.ts`（Ctrl+B/I/K）
- 编辑器内容存于 `useEditorStore.noteContents`（按 noteId 缓存）；自动保存真实写盘（800ms 防抖 → saveNow → 冲突检测 FNV hash），切换笔记/关闭窗口前 flushAll；SaveStatus 含 error
- 浏览器验证（CDP）：Tauri 桌面模式用 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9223"` 启动 exe 后可连 WebView2 CDP
- Atomic Editor 主题通过 `--atomic-editor-*` CSS 变量覆盖（`src/styles/index.css`），值映射到设计 token 自动跟随深浅色
- 公式渲染：`$$...$$`/`$...$` 由 `math-widget.ts` 正则匹配 + KaTeX widget；代码块语法高亮由 `@codemirror/language-data` 按需懒加载
