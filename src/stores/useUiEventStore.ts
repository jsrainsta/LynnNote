import { create } from "zustand";

/**
 * 跨组件 UI 事件（阶段八命令面板 → 面板动作）：
 * 命令面板在 App 顶层，而"新建笔记/新建课程/开始复习/打开设置"等
 * 状态都散落在各面板组件里。fire() 写入事件名，订阅方（面板）消费后
 * consume() 清除，避免重复触发。
 */
interface UiEventState {
  event: string | null;
  fire: (event: string) => void;
  consume: () => void;
}

export const useUiEventStore = create<UiEventState>()((set) => ({
  event: null,
  fire: (event) => set({ event }),
  consume: () => set({ event: null }),
}));

/** 命令面板事件名（集中定义避免拼写漂移） */
export const UI_EVENTS = {
  NEW_NOTE: "new-note",
  NEW_COURSE: "new-course",
  OPEN_QUESTIONS: "open-questions",
  START_REVIEW: "start-review",
  OPEN_SETTINGS: "open-settings",
} as const;
