import { create } from "zustand";
import type { Course } from "../types";
import type { CourseMetaJson } from "../lib/storage/fs";

interface CourseState {
  courses: Course[];
  /** null = 工作区中还没有课程 */
  selectedCourseId: string | null;
  selectCourse: (id: string) => void;
  loadCourses: (courses: CourseMetaJson[]) => void;
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
}));
