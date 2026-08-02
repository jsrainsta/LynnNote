import { create } from "zustand";
import type { EditorMode } from "../types";
import { contentFor } from "../data/mock";

export type SaveStatus = "saved" | "saving" | "unsaved";

interface EditorState {
  /** 编辑模式：所见即所得实时预览 / 分栏 / 纯预览 */
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  /** 各笔记内容缓存（键为 noteId）；阶段三接入文件系统后改为读盘 */
  noteContents: Record<string, string>;
  getNoteContent: (noteId: string, title: string) => string;
  setNoteContent: (noteId: string, content: string) => void;

  /** 自动保存状态展示（阶段三接真实写入前仅为模拟） */
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;

  /** 行号开关（仅编辑器可见；设置持久化在阶段八） */
  showLineNumbers: boolean;
  toggleLineNumbers: () => void;

  /** 每篇笔记的光标位置与滚动位置（仅会话内恢复） */
  lastPosition: Record<string, { pos: number; scrollTop: number }>;
  setLastPosition: (noteId: string, pos: number, scrollTop: number) => void;
}

/** 编辑器 UI 与内容状态（规范 §22：内容只在此处保存一份） */
export const useEditorStore = create<EditorState>()((set, get) => ({
  mode: "edit",
  setMode: (mode) => set({ mode }),

  noteContents: {},
  getNoteContent: (noteId, title) =>
    get().noteContents[noteId] ?? contentFor(noteId, title),
  setNoteContent: (noteId, content) =>
    set((s) => ({ noteContents: { ...s.noteContents, [noteId]: content } })),

  saveStatus: "saved",
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  showLineNumbers: false,
  toggleLineNumbers: () => set((s) => ({ showLineNumbers: !s.showLineNumbers })),

  lastPosition: {},
  setLastPosition: (noteId, pos, scrollTop) =>
    set((s) => ({
      lastPosition: { ...s.lastPosition, [noteId]: { pos, scrollTop } },
    })),
}));
