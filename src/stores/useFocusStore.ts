import { create } from "zustand";
import type { EditorMode } from "../types";
import { useEditorStore } from "./useEditorStore";
import { useNoteStore } from "./useNoteStore";
import { countCards, countNonWhitespace, countQuestions } from "../lib/stats";

/** 专注模式总结（退出弹窗显示） */
export interface FocusSummary {
  /** 学习时长（秒） */
  durationSeconds: number;
  addedWords: number;
  addedQuestions: number;
  addedCards: number;
}

interface FocusState {
  active: boolean;
  /** 进入时刻（Date.now()，用于时长计算） */
  startedAt: number;
  /** 计时（秒），FocusBar 每秒 tick 更新 */
  elapsedSeconds: number;
  /** 进入时的统计基线（当前笔记内容） */
  entryStats: { words: number; questions: number; cards: number } | null;
  /** 进入前的编辑模式，退出时恢复 */
  prevMode: EditorMode | null;
  enter: () => void;
  exit: () => FocusSummary | null;
  tick: () => void;
}

/** 统计当前笔记内容（noteContents 缓存，未保存的改动也算） */
function statsForCurrentNote(): { words: number; questions: number; cards: number } {
  const noteId = useNoteStore.getState().selectedNoteId;
  const content = noteId ? useEditorStore.getState().noteContents[noteId] : undefined;
  if (content === undefined) return { words: 0, questions: 0, cards: 0 };
  return {
    words: countNonWhitespace(content),
    questions: countQuestions(content),
    cards: countCards(content),
  };
}

/**
 * 专注听课模式（规范 §13）：
 * - 进入：记录当前笔记统计基线 + 记住编辑模式 → 强制源码模式（"默认关闭实时预览"）
 * - 退出：对比当前内容计算差值 → 恢复原模式
 * 布局（隐藏侧栏）与顶栏由 AppLayout / FocusBar 处理。
 */
export const useFocusStore = create<FocusState>()((set, get) => ({
  active: false,
  startedAt: 0,
  elapsedSeconds: 0,
  entryStats: null,
  prevMode: null,

  enter: () => {
    if (get().active) return;
    const editor = useEditorStore.getState();
    set({
      active: true,
      startedAt: Date.now(),
      elapsedSeconds: 0,
      entryStats: statsForCurrentNote(),
      prevMode: editor.mode,
    });
    editor.setMode("split"); // "默认关闭实时预览"（split 左侧纯源码，无行内实时预览）
  },

  exit: () => {
    if (!get().active) return null;
    const { startedAt, entryStats, prevMode } = get();
    const summary: FocusSummary = {
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      addedWords: 0,
      addedQuestions: 0,
      addedCards: 0,
    };
    if (entryStats) {
      const now = statsForCurrentNote();
      summary.addedWords = Math.max(0, now.words - entryStats.words);
      summary.addedQuestions = Math.max(0, now.questions - entryStats.questions);
      summary.addedCards = Math.max(0, now.cards - entryStats.cards);
    }
    set({ active: false, entryStats: null });
    if (prevMode) useEditorStore.getState().setMode(prevMode);
    return summary;
  },

  tick: () => {
    if (get().active) set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
  },
}));
