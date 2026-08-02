import { create } from "zustand";
import { mockNotes } from "../data/mock";
import type { NoteMeta } from "../types";

interface NoteState {
  notes: NoteMeta[];
  selectedNoteId: string;
  selectNote: (id: string) => void;
}

/** 笔记索引状态；内容本身不进入 store（规范 §22），阶段三接入真实文件 */
export const useNoteStore = create<NoteState>()((set) => ({
  notes: mockNotes,
  selectedNoteId: mockNotes[0].id,
  selectNote: (id) => set({ selectedNoteId: id }),
}));
