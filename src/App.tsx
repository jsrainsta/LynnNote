import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppLayout } from "./components/layout/AppLayout";
import { ToastHost } from "./components/common/Toast";
import { FocusSummaryDialog } from "./components/focus/FocusSummaryDialog";
import { SearchDialog } from "./components/search/SearchDialog";
import type { SearchMode } from "./components/search/SearchDialog";
import { CommandPalette } from "./components/command/CommandPalette";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useWorkspaceStore } from "./stores/useWorkspaceStore";
import { useEditorStore } from "./stores/useEditorStore";
import { useFocusStore } from "./stores/useFocusStore";
import type { FocusSummary } from "./stores/useFocusStore";
import { useNoteStore } from "./stores/useNoteStore";
import { useToastStore } from "./stores/useToastStore";
import { isTauri } from "./lib/storage/fs";

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const accent = useSettingsStore((s) => s.accent);
  const uiScale = useSettingsStore((s) => s.uiScale);
  const editorFontSize = useSettingsStore((s) => s.editorFontSize);
  const editorLineHeight = useSettingsStore((s) => s.editorLineHeight);
  const editorFont = useSettingsStore((s) => s.editorFont);
  const defaultMode = useSettingsStore((s) => s.defaultMode);
  // 专注模式退出总结（由 Esc 退出时生成，弹窗显示）
  const [focusSummary, setFocusSummary] = useState<FocusSummary | null>(null);
  // 搜索弹窗（null = 关闭；"all" 全局 / "titles" 快速打开 / "note" 当前笔记）
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 主题（阶段八：浅色/深色/跟随系统，规范 §20 外观）
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && mq.matches),
      );
    apply();
    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  // 强调色 → --color-accent（accent-strong/soft 由 CSS color-mix 派生）
  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accent);
  }, [accent]);

  // 界面缩放 → html zoom（整体缩放）
  useEffect(() => {
    document.documentElement.style.zoom = String(uiScale);
  }, [uiScale]);

  // 编辑器字号/行高/字体 → CSS 变量（editor-theme.ts 与 atomic 主题消费）
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty("--ln-editor-font-size", `${editorFontSize}px`);
    el.style.setProperty("--ln-editor-line-height", String(editorLineHeight));
    if (editorFont) el.style.setProperty("--ln-editor-font", editorFont);
    else el.style.removeProperty("--ln-editor-font");
  }, [editorFontSize, editorLineHeight, editorFont]);

  // 启动：应用默认编辑模式 + 加载最近工作区（有则自动打开）
  useEffect(() => {
    useEditorStore.getState().setMode(defaultMode);
  }, []); // 仅启动时应用默认模式，会话内切换不受影响
  useEffect(() => {
    void useWorkspaceStore.getState().init();
  }, []);

  // 快捷键（规范 §19）：F11/Esc（专注模式）+ Ctrl+Shift+P（命令面板）
  // + Ctrl+Shift+F（全局搜索）+ Ctrl+P（快速打开）+ Ctrl+F（编辑器外时当前笔记搜索）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "F11") {
        e.preventDefault();
        const focus = useFocusStore.getState();
        if (focus.active) return;
        if (!useNoteStore.getState().selectedNoteId) {
          useToastStore.getState().show("请先选择一篇笔记", "error");
          return;
        }
        focus.enter();
      } else if (e.key === "Escape") {
        const focus = useFocusStore.getState();
        if (!focus.active) return;
        e.preventDefault();
        const summary = focus.exit();
        if (summary) setFocusSummary(summary);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchMode("all");
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setSearchMode("titles");
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === "f") {
        // 编辑器（CM6/Atomic）内的 Ctrl+F 由编辑器自身的搜索面板处理
        //（其会 preventDefault）；编辑器外打开当前笔记搜索
        if (e.defaultPrevented) return;
        e.preventDefault();
        if (useNoteStore.getState().selectedNoteId) setSearchMode("note");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 关闭窗口前把所有未保存改动写入磁盘（规范 §18；浏览器 dev 模式无 Tauri API）
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      const win = getCurrentWindow();
      unlisten = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        await useEditorStore.getState().flushAll();
        await win.destroy();
      });
    })();
    return () => unlisten?.();
  }, []);

  return (
    <>
      <AppLayout />
      <ToastHost />
      <FocusSummaryDialog summary={focusSummary} onClose={() => setFocusSummary(null)} />
      <SearchDialog
        open={searchMode !== null}
        mode={searchMode ?? "all"}
        onClose={() => setSearchMode(null)}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenQuickOpen={() => {
          setPaletteOpen(false);
          setSearchMode("titles");
        }}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
