import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 复习卡片熟悉度（阶段七，规范 §15"简单熟悉度统计"）。
 * 第一版只做应用内记录（localStorage 持久化），不改动 Markdown 原文，
 * 保证笔记文件可读性（规范 §14 允许"第一版通过内部索引记录解决状态"）。
 */

export type ReviewRating = "unknown" | "fuzzy" | "mastered";

/** 卡片唯一键：noteId + 问题文本（重命名/内容变化后旧记录自然失效） */
export function cardKey(noteId: string, question: string): string {
  return `${noteId}::${question}`;
}

interface ReviewState {
  /** cardKey → 熟悉度 */
  ratings: Record<string, ReviewRating>;
  rate: (key: string, rating: ReviewRating) => void;
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      ratings: {},
      rate: (key, rating) =>
        set((s) => ({ ratings: { ...s.ratings, [key]: rating } })),
    }),
    { name: "lynnnote:review" },
  ),
);
