/** 课程信息（规范 §7.1） */
export interface Course {
  id: string;
  name: string;
  slug: string;
  color: string;
  teacher?: string;
  location?: string;
  schedule?: string;
  semester?: string;
  examDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** 笔记元数据（规范 §7.2），内容保存在独立 .md 文件中 */
export interface NoteMeta {
  id: string;
  courseId: string;
  title: string;
  fileName: string;
  relativePath: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  pinned: boolean;
}

/** 阶段八起支持跟随系统（App.tsx 用 matchMedia 解析） */
export type Theme = "light" | "dark" | "system";

export type EditorMode = "edit" | "split" | "preview";
