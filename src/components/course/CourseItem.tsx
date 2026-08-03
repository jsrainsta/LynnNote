import { useCourseStore } from "../../stores/useCourseStore";
import type { Course } from "../../types";
import { cx } from "../../lib/utils/cx";

interface CourseItemProps {
  course: Course;
  noteCount: number;
  selected: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function CourseItem({ course, noteCount, selected, onContextMenu }: CourseItemProps) {
  const selectCourse = useCourseStore((s) => s.selectCourse);

  return (
    <button
      type="button"
      onClick={() => selectCourse(course.id)}
      onContextMenu={onContextMenu}
      aria-current={selected ? "true" : undefined}
      className={cx(
        "group relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
        "transition-colors duration-150",
        selected ? "bg-active" : "hover:bg-hover",
      )}
    >
      {/* 选中课程左侧细边（课程颜色） */}
      {selected && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: course.color }}
        />
      )}
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: course.color }}
        aria-hidden="true"
      />
      <span
        className={cx(
          "truncate text-[13px]",
          selected ? "font-medium text-ink" : "text-ink-secondary group-hover:text-ink",
        )}
      >
        {course.name}
      </span>
      <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-tertiary">{noteCount}</span>
    </button>
  );
}
