import { create } from "zustand";
import type { Theme } from "../types";

interface SettingsState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** 应用设置（阶段一只含主题；完整设置在阶段八实现） */
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
}));
