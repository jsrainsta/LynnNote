import { create } from "zustand";
import type { EditorMode } from "../types";
import { fs } from "../lib/storage/fs";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { useNoteStore } from "./useNoteStore";
import { useToastStore } from "./useToastStore";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface EditorState {
  /** 编辑模式：所见即所得实时预览 / 分栏 / 纯预览 */
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  /** 各笔记内容缓存（键为 noteId=相对路径）；打开时从磁盘读取，编辑后写回 */
  noteContents: Record<string, string>;
  /** 从磁盘加载内容（不标记脏；区别于用户编辑的 setNoteContent） */
  loadNoteContent: (noteId: string, content: string) => void;
  /** 用户编辑内容：更新缓存并标记未保存 */
  setNoteContent: (noteId: string, content: string) => void;

  /** 读取笔记时的内容哈希（写入时带回做冲突检测） */
  noteHashes: Record<string, number>;
  setNoteHash: (noteId: string, hash: number) => void;

  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;

  /** 每篇笔记是否有未写盘的改动 */
  dirtyNotes: Record<string, boolean>;

  showLineNumbers: boolean;
  toggleLineNumbers: () => void;

  /** 每篇笔记的光标位置与滚动位置（会话内恢复） */
  lastPosition: Record<string, { pos: number; scrollTop: number }>;
  setLastPosition: (noteId: string, pos: number, scrollTop: number) => void;

  /** 立即把指定笔记的未保存改动写入磁盘（防抖到期 / 切换笔记 / 关闭窗口时调用） */
  saveNow: (noteId: string) => Promise<void>;
  /** 关闭窗口前：把所有脏笔记写入磁盘 */
  flushAll: () => Promise<void>;
  /** 重命名后内容缓存按新 id 迁移 */
  remapNote: (oldId: string, newId: string) => void;
}

function currentNoteIs(noteId: string): boolean {
  return useNoteStore.getState().selectedNoteId === noteId;
}

/** 编辑器 UI 与内容状态（规范 §22：内容只在此处保存一份） */
export const useEditorStore = create<EditorState>()((set, get) => ({
  mode: "edit",
  setMode: (mode) => set({ mode }),

  noteContents: {},
  loadNoteContent: (noteId, content) =>
    set((s) => ({ noteContents: { ...s.noteContents, [noteId]: content } })),
  setNoteContent: (noteId, content) =>
    set((s) => ({
      noteContents: { ...s.noteContents, [noteId]: content },
      dirtyNotes: { ...s.dirtyNotes, [noteId]: true },
      saveStatus: "unsaved",
    })),

  noteHashes: {},
  setNoteHash: (noteId, hash) =>
    set((s) => ({ noteHashes: { ...s.noteHashes, [noteId]: hash } })),

  saveStatus: "saved",
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  dirtyNotes: {},

  showLineNumbers: false,
  toggleLineNumbers: () => set((s) => ({ showLineNumbers: !s.showLineNumbers })),

  lastPosition: {},
  setLastPosition: (noteId, pos, scrollTop) =>
    set((s) => ({
      lastPosition: { ...s.lastPosition, [noteId]: { pos, scrollTop } },
    })),

  saveNow: async (noteId) => {
    const s = get();
    const content = s.noteContents[noteId];
    if (content === undefined || !s.dirtyNotes[noteId]) return; // 未打开或无改动

    const workspace = useWorkspaceStore.getState().path;
    const note = useNoteStore.getState().notes.find((n) => n.id === noteId);
    if (!workspace || !note) return;

    // 仅当前笔记的保存状态反映到工具栏（后台 flush 不打扰界面）
    if (currentNoteIs(noteId)) set({ saveStatus: "saving" });
    try {
      const result = await fs.writeNote(
        workspace,
        note.relativePath,
        content,
        s.noteHashes[noteId],
      );
      if (result.status === "conflict") {
        if (currentNoteIs(noteId)) set({ saveStatus: "error" });
        useToastStore
          .getState()
          .show("笔记已被外部修改，改动暂未写入，请重试或重新打开", "error");
      } else {
        set((st) => ({
          dirtyNotes: { ...st.dirtyNotes, [noteId]: false },
          noteHashes: { ...st.noteHashes, [noteId]: result.hash },
        }));
        if (currentNoteIs(noteId)) set({ saveStatus: "saved" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (currentNoteIs(noteId)) set({ saveStatus: "error" });
      useToastStore.getState().show(`保存失败：${message}`, "error");
    }
  },

  flushAll: async () => {
    const s = get();
    const dirtyIds = Object.entries(s.dirtyNotes)
      .filter(([, dirty]) => dirty)
      .map(([id]) => id);
    if (dirtyIds.length === 0) return;
    await Promise.all(dirtyIds.map((id) => get().saveNow(id)));
  },

  remapNote: (oldId, newId) =>
    set((s) => {
      const move = <T,>(record: Record<string, T>): Record<string, T> => {
        if (!(oldId in record)) return record;
        const next = { ...record };
        next[newId] = next[oldId];
        delete next[oldId];
        return next;
      };
      return {
        noteContents: move(s.noteContents),
        noteHashes: move(s.noteHashes),
        dirtyNotes: move(s.dirtyNotes),
        lastPosition: move(s.lastPosition),
      };
    }),
}));
