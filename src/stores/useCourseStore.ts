import { create } from "zustand";
import { mockCourses } from "../data/mock";
import type { Course } from "../types";

interface CourseState {
  courses: Course[];
  selectedCourseId: string;
  selectCourse: (id: string) => void;
}

/** 课程状态；阶段一使用模拟数据，阶段四接入真实课程文件 */
export const useCourseStore = create<CourseState>()((set) => ({
  courses: mockCourses,
  selectedCourseId: mockCourses[0].id,
  selectCourse: (id) => set({ selectedCourseId: id }),
}));
