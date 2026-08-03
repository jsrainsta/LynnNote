import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { BookOpen, FolderOpen, Moon, PanelLeftClose, Plus, Settings, Sun } from "lucide-react";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useToastStore } from "../../stores/useToastStore";
import { IconButton } from "../common/IconButton";
import { CourseItem } from "./CourseItem";

interface CourseSidebarProps {
  panelRef: RefObject<PanelImperativeHandle | null>;
}

/** 左侧课程栏（规范 §8.1） */
export function CourseSidebar({ panelRef }: CourseSidebarProps) {
  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const notes = useNoteStore((s) => s.notes);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const showToast = useToastStore((s) => s.show);

  const countFor = (courseId: string) =>
    notes.filter((n) => n.courseId === courseId).length;

  const handleSwitchWorkspace = async () => {
    try {
      await switchWorkspace();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "切换工作区失败", "error");
    }
  };

  return (
    <aside className="flex h-full min-w-0 flex-col bg-surface" aria-label="课程栏">
      {/* Logo 与折叠按钮 */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 px-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-white">
          <BookOpen className="size-4" strokeWidth={2} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          LynnNote
        </span>
        <IconButton label="折叠课程栏" className="ml-auto" onClick={() => panelRef.current?.collapse()}>
          <PanelLeftClose className="size-4" />
        </IconButton>
      </div>

      {/* 课程列表 */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="课程列表">
        <p className="px-2 pb-1 pt-2 text-[11px] font-medium tracking-wider text-ink-tertiary">
          课程
        </p>
        <ul className="flex flex-col gap-0.5">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseItem
                course={course}
                noteCount={countFor(course.id)}
                selected={course.id === selectedCourseId}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          title="新建课程（阶段四实现）"
          disabled
          className="mt-1 flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-tertiary"
        >
          <Plus className="size-3.5" />
          新建课程
        </button>
      </nav>

      {/* 底部：主题切换 + 切换工作区 + 设置入口 */}
      <div className="flex shrink-0 items-center gap-1 border-t border-border px-3 py-2">
        <IconButton
          label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </IconButton>
        <IconButton label="切换工作区" onClick={() => void handleSwitchWorkspace()}>
          <FolderOpen className="size-4" />
        </IconButton>
        <IconButton label="设置（阶段八实现）" disabled className="ml-auto">
          <Settings className="size-4" />
        </IconButton>
      </div>
    </aside>
  );
}
