import { create } from "zustand";
import type { Course } from "../types";
import type { CourseMetaJson } from "../lib/storage/fs";

interface CourseState {
  courses: Course[];
  /** null = 工作区中还没有课程 */
  selectedCourseId: string | null;
  selectCourse: (id: string) => void;
  loadCourses: (courses: CourseMetaJson[]) => void;
  /** 创建课程后加入并选中（阶段四） */
  addCourse: (meta: CourseMetaJson) => void;
  /** 更新课程元数据（id 不变，名称/颜色等改变） */
  updateCourse: (id: string, meta: CourseMetaJson) => void;
  /** 删除课程：若删的是当前课程则选中相邻课程（无则第一门/空） */
  removeCourse: (id: string) => void;
}

/** 扫描结果 → 领域模型（Rust CourseMeta 与前端 Course 字段一一对应） */
function toCourse(c: CourseMetaJson): Course {
  return {
    id: c.slug,
    name: c.name,
    slug: c.slug,
    color: c.color,
    teacher: c.teacher ?? undefined,
    location: c.location ?? undefined,
    schedule: c.schedule ?? undefined,
    semester: c.semester ?? undefined,
    examDate: c.examDate ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** 课程索引（阶段三起由工作区扫描填充，课程 CRUD 在阶段四） */
export const useCourseStore = create<CourseState>()((set, get) => ({
  courses: [],
  selectedCourseId: null,
  selectCourse: (id) => set({ selectedCourseId: id }),

  loadCourses: (json) => {
    const courses = json.map(toCourse);
    const current = get().selectedCourseId;
    set({
      courses,
      // 保留当前选中（若课程仍存在），否则选第一门
      selectedCourseId:
        current && courses.some((c) => c.id === current) ? current : (courses[0]?.id ?? null),
    });
  },

  addCourse: (meta) =>
    set((s) => ({
      courses: [...s.courses, toCourse(meta)],
      selectedCourseId: meta.id,
    })),

  updateCourse: (id, meta) =>
    set((s) => ({
      courses: s.courses.map((c) => (c.id === id ? toCourse(meta) : c)),
      selectedCourseId: s.selectedCourseId,
    })),

  removeCourse: (id) =>
    set((s) => {
      const courses = s.courses.filter((c) => c.id !== id);
      let selected = s.selectedCourseId;
      if (selected === id) {
        const removedIndex = s.courses.findIndex((c) => c.id === id);
        selected = courses[Math.min(removedIndex, courses.length - 1)]?.id ?? null;
      }
      return { courses, selectedCourseId: selected };
    }),
}));
