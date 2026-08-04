import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppLayout } from "./components/layout/AppLayout";
import { ToastHost } from "./components/common/Toast";
import { FocusSummaryDialog } from "./components/focus/FocusSummaryDialog";
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
  // 专注模式退出总结（由 Esc 退出时生成，弹窗显示）
  const [focusSummary, setFocusSummary] = useState<FocusSummary | null>(null);

  // 主题切换：通过 html.dark 切换 Tailwind 暗色变量
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // 启动：加载最近工作区（有则自动打开）
  useEffect(() => {
    void useWorkspaceStore.getState().init();
  }, []);

  // 专注模式快捷键（规范 §19）：F11 进入，Esc 退出并显示总结
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    </>
  );
}
