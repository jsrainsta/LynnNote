import { create } from "zustand";
import type { NoteMeta } from "../types";
import type { NoteEntryJson } from "../lib/storage/fs";
import { registerStoreLoaders } from "./useWorkspaceStore";
import { useCourseStore } from "./useCourseStore";

interface NoteState {
  notes: NoteMeta[];
  /** null = 没有可选的笔记 */
  selectedNoteId: string | null;
  selectNote: (id: string) => void;
  loadNotes: (notes: NoteEntryJson[]) => void;
  /** 新建/读取后加入（并选中新笔记） */
  addNote: (entry: NoteEntryJson) => void;
  /** 重命名结果：按旧 id 替换，若正是当前笔记则同步选中 */
  updateNote: (oldId: string, entry: NoteEntryJson) => void;
  /** 删除：若删的是当前笔记则选中同课程相邻笔记 */
  removeNote: (id: string) => void;
}

/** 从文件头生成摘要：去 markdown 记号、压缩空白、截断 60 字 */
export function summarize(head: string): string {
  const text = head
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s*/, "").replace(/^>\s*/, ""))
    .filter((line) => line.trim() !== "")
    .join(" ")
    .replace(/[`*_~]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** 扫描条目 → 领域模型（id 即相对路径，稳定且唯一） */
function toNoteMeta(n: NoteEntryJson): NoteMeta {
  return {
    id: n.id,
    courseId: n.courseSlug,
    title: n.title,
    fileName: n.fileName,
    relativePath: n.relativePath,
    summary: summarize(n.head),
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    wordCount: n.wordCount,
    pinned: n.pinned,
  };
}

/** 笔记索引；内容本身不进入 store（规范 §22），阶段三由工作区扫描填充 */
export const useNoteStore = create<NoteState>()((set, get) => ({
  notes: [],
  selectedNoteId: null,
  selectNote: (id) => set({ selectedNoteId: id }),

  loadNotes: (json) => {
    const notes = json.map(toNoteMeta);
    const current = get().selectedNoteId;
    set({
      notes,
      selectedNoteId:
        current && notes.some((n) => n.id === current) ? current : (notes[0]?.id ?? null),
    });
  },

  addNote: (entry) => {
    const note = toNoteMeta(entry);
    set((s) => ({ notes: [...s.notes, note], selectedNoteId: note.id }));
  },

  updateNote: (oldId, entry) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === oldId ? toNoteMeta(entry) : n)),
      selectedNoteId: s.selectedNoteId === oldId ? entry.id : s.selectedNoteId,
    })),

  removeNote: (id) =>
    set((s) => {
      const notes = s.notes.filter((n) => n.id !== id);
      let selected = s.selectedNoteId;
      if (selected === id) {
        const removed = s.notes.find((n) => n.id === id);
        const sameCourse = notes.filter((n) => n.courseId === removed?.courseId);
        selected = sameCourse[0]?.id ?? notes[0]?.id ?? null;
      }
      return { notes, selectedNoteId: selected };
    }),
}));

// 工作区扫描结果 → 课程/笔记 store（避免 store 间循环依赖）
registerStoreLoaders(
  (courses) => useCourseStore.getState().loadCourses(courses),
  (notes) => useNoteStore.getState().loadNotes(notes),
);
