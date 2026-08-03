import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppLayout } from "./components/layout/AppLayout";
import { ToastHost } from "./components/common/Toast";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useWorkspaceStore } from "./stores/useWorkspaceStore";
import { useEditorStore } from "./stores/useEditorStore";
import { isTauri } from "./lib/storage/fs";

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  // 主题切换：通过 html.dark 切换 Tailwind 暗色变量
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // 启动：加载最近工作区（有则自动打开）
  useEffect(() => {
    void useWorkspaceStore.getState().init();
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
    </>
  );
}
