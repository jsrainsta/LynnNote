import { useEffect } from "react";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { useFocusStore } from "../../stores/useFocusStore";
import { cx } from "../../lib/utils/cx";

const SAVE_DOT: Record<string, string> = {
  saved: "bg-success",
  saving: "bg-amber-400",
  unsaved: "bg-red-400",
  error: "bg-red-500",
};

const SAVE_LABEL: Record<string, string> = {
  saved: "已保存",
  saving: "正在保存",
  unsaved: "未保存",
  error: "保存失败",
};

/** 专注模式顶栏（规范 §13）：只保留「课程 · 笔记标题  保存状态  计时」一行 */
export function FocusBar() {
  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const notes = useNoteStore((s) => s.notes);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const elapsedSeconds = useFocusStore((s) => s.elapsedSeconds);
  const tick = useFocusStore((s) => s.tick);

  // 计时：每秒 tick（退出时组件卸载自动停止）
  useEffect(() => {
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tick]);

  const course = courses.find((c) => c.id === selectedCourseId);
  const note = notes.find((n) => n.id === selectedNoteId);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-panel px-4">
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink">
        {course && (
          <>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: course.color }}
              aria-hidden="true"
            />
            <span className="truncate">{course.name}</span>
          </>
        )}
        <span className="shrink-0 text-ink-tertiary">·</span>
        <span className="truncate">{note?.title ?? "未选择笔记"}</span>
      </span>

      <span
        className={cx(
          "flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] text-ink-tertiary",
        )}
        role="status"
      >
        <span className={cx("size-1.5 rounded-full", SAVE_DOT[saveStatus])} aria-hidden="true" />
        {SAVE_LABEL[saveStatus]}
      </span>

      <span className="ml-auto shrink-0 font-mono text-[13px] tabular-nums text-ink" aria-live="off">
        {minutes}:{seconds}
      </span>
    </header>
  );
}
