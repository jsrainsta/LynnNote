import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorMode, Theme } from "../types";

/**
 * 应用设置（阶段八，规范 §20）。
 * zustand persist 存 localStorage（浏览器与 WebView2 均可用），
 * 键 `lynnnote:settings`；字段语义见各选项注释。
 * 行号开关从 useEditorStore 迁移至此（单一数据源）。
 */

/** 强调色预设（阶段八：设置-外观-强调色） */
export const ACCENT_PRESETS: Array<{ name: string; color: string }> = [
  { name: "蓝紫", color: "#6d7cf6" },
  { name: "青", color: "#3aa7a0" },
  { name: "绿", color: "#4aa876" },
  { name: "琥珀", color: "#d99a2b" },
  { name: "珊瑚", color: "#e56b5f" },
  { name: "紫", color: "#9a6bd9" },
];

/** 编辑器字体预设（默认 = 各模式原有字体：源码等宽 / 实时预览系统字体） */
export const EDITOR_FONTS: Array<{ name: string; value: string }> = [
  { name: "默认", value: "" },
  { name: "等宽", value: "var(--font-mono)" },
  { name: "系统", value: "var(--font-sans)" },
  { name: "衬线", value: "Georgia, 'Noto Serif SC', serif" },
];

/** 界面缩放选项（documentElement.zoom） */
export const UI_SCALES = [0.9, 1, 1.1, 1.25];

export interface AppSettings {
  theme: Theme;
  accent: string;
  /** 界面缩放倍数（0.9/1/1.1/1.25） */
  uiScale: number;
  /** 编辑器字号（px） */
  editorFontSize: number;
  /** 编辑器行高 */
  editorLineHeight: number;
  /** 编辑器字体（EDITOR_FONTS 的 value） */
  editorFont: string;
  showLineNumbers: boolean;
  /** 分栏源码自动换行 */
  lineWrapping: boolean;
  /** Tab 宽度（空格数） */
  tabWidth: number;
  /** 自动保存防抖延迟（ms，规范 §18 建议 600-1000） */
  autosaveDelay: number;
  /** 是否启用公式渲染（编辑与预览） */
  enableMath: boolean;
  /** 是否启用代码高亮（编辑与预览） */
  enableCodeHighlight: boolean;
  /** 分栏模式源码→预览同步滚动 */
  syncScroll: boolean;
  /** 启动时的默认编辑模式 */
  defaultMode: EditorMode;
}

interface SettingsState extends AppSettings {
  set: (partial: Partial<AppSettings>) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "light",
      accent: "#6d7cf6",
      uiScale: 1,
      editorFontSize: 15,
      editorLineHeight: 1.8,
      editorFont: "",
      showLineNumbers: false,
      lineWrapping: false,
      tabWidth: 4,
      autosaveDelay: 800,
      enableMath: true,
      enableCodeHighlight: true,
      syncScroll: false,
      defaultMode: "edit",

      set: (partial) => set(partial),
      // 浅/深两态切换；system 视为深色目标（完整三态在设置页选择）
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "lynnnote:settings" },
  ),
);
