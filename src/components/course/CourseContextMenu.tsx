import { useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";

export interface CourseContextMenuState {
  x: number;
  y: number;
  courseId: string;
}

interface CourseContextMenuProps {
  state: CourseContextMenuState | null;
  onEdit: (courseId: string) => void;
  onDelete: (courseId: string) => void;
  onClose: () => void;
}

const MENU_WIDTH = 176;
const MENU_HEIGHT = 88;

/** 课程右键菜单（编辑 / 删除）；点击外部或 Esc 关闭，超出窗口时向内收拢 */
export function CourseContextMenu({ state, onEdit, onDelete, onClose }: CourseContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [state, onClose]);

  if (!state) return null;

  const style = {
    left: Math.min(state.x, window.innerWidth - MENU_WIDTH - 8),
    top: Math.min(state.y, window.innerHeight - MENU_HEIGHT - 8),
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="课程操作"
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-panel p-1 shadow-xl"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => onEdit(state.courseId)}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-hover"
      >
        <Pencil className="size-3.5 text-ink-secondary" aria-hidden="true" />
        编辑课程
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onDelete(state.courseId)}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        删除课程
      </button>
    </div>
  );
}
