import { create } from "zustand";
import { notifyActionCheck } from "../lib/action-registry";

/**
 * 跨组件编辑器动作（阶段七：疑问/搜索点击定位、命令面板插入）：
 * 请求先落到 store，已挂载的 CM6 视图（locateExtension / insertExtension）
 * 在构造或每次 docChanged 时检查并消费。
 */

export interface LocateRequest {
  noteId: string;
  /** 定位起点（内容中的字符偏移） */
  from: number;
  /** 高亮区间终点 */
  to: number;
}

export interface InsertRequest {
  noteId: string;
  text: string;
}

interface EditorActionState {
  locate: LocateRequest | null;
  insert: InsertRequest | null;
  /** 请求定位；8 秒内没有视图消费则自动作废（防止残留请求下次误触发） */
  requestLocate: (noteId: string, from: number, to: number) => void;
  /** 请求在光标处插入文本（要求对应笔记视图已挂载） */
  requestInsert: (noteId: string, text: string) => void;
  consumeLocate: () => void;
  consumeInsert: () => void;
}

/** 自动作废时长：覆盖"点击疑问 → 打开笔记 → 视图挂载"的异步链路 */
const LOCATE_TTL = 8000;

export const useEditorActionStore = create<EditorActionState>()((set, get) => ({
  locate: null,
  insert: null,

  requestLocate: (noteId, from, to) => {
    set({ locate: { noteId, from, to } });
    notifyActionCheck();
    window.setTimeout(() => {
      if (get().locate?.noteId === noteId) set({ locate: null });
    }, LOCATE_TTL);
  },

  requestInsert: (noteId, text) => {
    set({ insert: { noteId, text } });
    notifyActionCheck();
  },

  consumeLocate: () => set({ locate: null }),
  consumeInsert: () => set({ insert: null }),
}));
