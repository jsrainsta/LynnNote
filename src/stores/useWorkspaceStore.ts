import { create } from "zustand";
import { fs } from "../lib/storage/fs";
import type { CourseMetaJson, NoteEntryJson } from "../lib/storage/fs";

interface WorkspaceState {
  /** 当前工作区路径；null = 尚未选择（显示工作区选择界面） */
  path: string | null;
  /** 启动/切换工作区时的加载状态 */
  isLoading: boolean;
  /** 最近打开的工作区路径（启动时自动恢复用） */
  recentPaths: string[];
  /** 应用启动时：加载最近记录，有则自动打开最近工作区 */
  init: () => Promise<void>;
  /** 打开指定工作区并扫描，填充课程与笔记数据 */
  openWorkspace: (path: string) => Promise<void>;
  /** 弹出文件夹选择对话框 */
  pickWorkspace: () => Promise<void>;
  /** 切换工作区：先清空当前数据再弹选择框 */
  switchWorkspace: () => Promise<void>;
}

type LoadCourses = (courses: CourseMetaJson[]) => void;
type LoadNotes = (notes: NoteEntryJson[]) => void;

let loadCoursesRef: LoadCourses | null = null;
let loadNotesRef: LoadNotes | null = null;

/**
 * 注册课程/笔记 store 的加载回调（避免 store 间循环依赖）：
 * useCourseStore / useNoteStore 在模块初始化时调用。
 */
export function registerStoreLoaders(loadCourses: LoadCourses, loadNotes: LoadNotes): void {
  loadCoursesRef = loadCourses;
  loadNotesRef = loadNotes;
}

function friendlyError(error: unknown): Error {
  if (typeof error === "string") return new Error(error);
  if (error instanceof Error) return error;
  return new Error("发生未知错误");
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  path: null,
  isLoading: false,
  recentPaths: [],

  init: async () => {
    try {
      const recent = await fs.loadRecent();
      set({ recentPaths: recent });
      if (recent.length > 0) {
        await get().openWorkspace(recent[0]);
      }
    } catch {
      // 最近记录加载失败不阻塞启动
    }
  },

  openWorkspace: async (path) => {
    set({ isLoading: true });
    try {
      const scan = await fs.scanWorkspace(path);
      loadCoursesRef?.(scan.courses);
      loadNotesRef?.(scan.notes);
      set({ path, isLoading: false });
      await fs.saveRecent(path).catch(() => undefined);
    } catch (error) {
      set({ isLoading: false });
      throw friendlyError(error);
    }
  },

  pickWorkspace: async () => {
    set({ isLoading: true });
    try {
      const opened = await fs.pickWorkspace();
      if (opened) {
        loadCoursesRef?.(opened.scan.courses);
        loadNotesRef?.(opened.scan.notes);
        set({ path: opened.path, isLoading: false });
        await fs.saveRecent(opened.path).catch(() => undefined);
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw friendlyError(error);
    }
  },

  switchWorkspace: async () => {
    // 切换前清空当前数据，避免残留内容闪现
    set({ path: null });
    await get().pickWorkspace();
  },
}));
