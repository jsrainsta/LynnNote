import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { useSettingsStore } from "./stores/useSettingsStore";

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  // 主题切换：通过 html.dark 切换 Tailwind 暗色变量
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <AppLayout />;
}
