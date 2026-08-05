import { create } from "zustand";
import { fs } from "../lib/storage/fs";
import { parseCards, parseQuestions } from "../lib/parser";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { useNoteStore } from "./useNoteStore";
import { useToastStore } from "./useToastStore";

/**
 * 疑问 / 复习卡片索引（阶段七，规范 §14/§15 + §23"保存后增量更新"）。
 * - build()：工作区打开时全量构建（阶段八"重建笔记索引"复用）
 * - reparse()：每次保存成功只重解析该篇（增量）
 * - contents：全部笔记全文缓存，阶段八全文搜索的数据源
 *
 * 索引与编辑器内容缓存（useEditorStore.noteContents）分离：
 * 这里保存的是**已写盘**的内容；编辑中的未保存改动在保存后才进入索引。
 */

export interface IndexedQuestion {
  noteId: string;
  courseSlug: string;
  text: string;
  solved: boolean;
  offset: number;
}

export interface IndexedCard {
  noteId: string;
  courseSlug: string;
  question: string;
  answer: string;
  offset: number;
}

interface IndexState {
  questions: IndexedQuestion[];
  cards: IndexedCard[];
  /** noteId → 已保存内容（全文搜索用） */
  contents: Record<string, string>;
  build: () => Promise<void>;
  /** 保存后增量更新单篇（新建笔记后也可直接调用，内容在内存中） */
  reparse: (noteId: string, content: string) => void;
  removeNotes: (noteIds: string[]) => void;
  /** 重命名后 noteId（相对路径）变化，迁移索引键 */
  renameNote: (oldId: string, newId: string) => void;
}

function resolveCourseSlug(noteId: string): string {
  return useNoteStore.getState().notes.find((n) => n.id === noteId)?.courseId ?? "";
}

export const useIndexStore = create<IndexState>()((set, get) => ({
  questions: [],
  cards: [],
  contents: {},

  build: async () => {
    const workspace = useWorkspaceStore.getState().path;
    if (!workspace) return;
    try {
      const items = await fs.readAllNotes(workspace);
      const questions: IndexedQuestion[] = [];
      const cards: IndexedCard[] = [];
      const contents: Record<string, string> = {};
      for (const item of items) {
        contents[item.id] = item.content;
        for (const q of parseQuestions(item.content)) {
          questions.push({
            noteId: item.id,
            courseSlug: item.courseSlug,
            text: q.text,
            solved: q.solved,
            offset: q.offset,
          });
        }
        for (const c of parseCards(item.content)) {
          cards.push({
            noteId: item.id,
            courseSlug: item.courseSlug,
            question: c.question,
            answer: c.answer,
            offset: c.offset,
          });
        }
      }
      set({ questions, cards, contents });
    } catch (error) {
      useToastStore
        .getState()
        .show(`索引构建失败：${error instanceof Error ? error.message : String(error)}`, "error");
    }
  },

  reparse: (noteId, content) => {
    const courseSlug = resolveCourseSlug(noteId);
    const next = get();
    const qs = parseQuestions(content).map((q) => ({
      noteId,
      courseSlug,
      text: q.text,
      solved: q.solved,
      offset: q.offset,
    }));
    const cs = parseCards(content).map((c) => ({
      noteId,
      courseSlug,
      question: c.question,
      answer: c.answer,
      offset: c.offset,
    }));
    set({
      contents: { ...next.contents, [noteId]: content },
      questions: [...next.questions.filter((q) => q.noteId !== noteId), ...qs],
      cards: [...next.cards.filter((c) => c.noteId !== noteId), ...cs],
    });
  },

  removeNotes: (noteIds) => {
    const ids = new Set(noteIds);
    set((s) => ({
      questions: s.questions.filter((q) => !ids.has(q.noteId)),
      cards: s.cards.filter((c) => !ids.has(c.noteId)),
      contents: Object.fromEntries(
        Object.entries(s.contents).filter(([id]) => !ids.has(id)),
      ),
    }));
  },

  renameNote: (oldId, newId) => {
    set((s) => ({
      questions: s.questions.map((q) => (q.noteId === oldId ? { ...q, noteId: newId } : q)),
      cards: s.cards.map((c) => (c.noteId === oldId ? { ...c, noteId: newId } : c)),
      contents: Object.fromEntries(
        Object.entries(s.contents).map(([id, content]) =>
          id === oldId ? [newId, content] : [id, content],
        ),
      ),
    }));
  },
}));

// 工作区路径变化（打开/切换）→ 全量重建索引。
// 用订阅而非在 useWorkspaceStore 里调用，避免 store 间循环依赖。
useWorkspaceStore.subscribe((state, prev) => {
  if (state.path && state.path !== prev.path) {
    void useIndexStore.getState().build();
  }
});
