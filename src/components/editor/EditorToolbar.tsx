import { Columns2, Eye, Focus, Hash, PenLine } from "lucide-react";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useEditorStore } from "../../stores/useEditorStore";
import type { SaveStatus } from "../../stores/useEditorStore";
import { IconButton } from "../common/IconButton";
import { cx } from "../../lib/utils/cx";
import type { EditorMode } from "../../types";

const MODES: Array<{ mode: EditorMode; label: string; icon: typeof PenLine }> = [
  { mode: "edit", label: "实时预览", icon: PenLine },
  { mode: "split", label: "编辑与预览分栏", icon: Columns2 },
  { mode: "preview", label: "纯预览", icon: Eye },
];

/** 保存状态展示：绿=已保存 / 琥珀=正在保存 / 红=未保存 */
const SAVE_STATES: Record<
  SaveStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  saved: { label: "已保存", dotClass: "bg-success", textClass: "text-ink-tertiary" },
  saving: { label: "正在保存", dotClass: "bg-amber-400", textClass: "text-ink-secondary" },
  unsaved: { label: "未保存", dotClass: "bg-red-400", textClass: "text-ink-secondary" },
};

/** 编辑区顶部工具栏：标题、课程、保存状态、模式切换、行号、专注模式入口 */
export function EditorToolbar() {
  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const notes = useNoteStore((s) => s.notes);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const showLineNumbers = useEditorStore((s) => s.showLineNumbers);
  const toggleLineNumbers = useEditorStore((s) => s.toggleLineNumbers);

  const course = courses.find((c) => c.id === selectedCourseId);
  const note = notes.find((n) => n.id === selectedNoteId);
  const saveState = SAVE_STATES[saveStatus];

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-panel px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="min-w-0 truncate text-[13px] font-medium text-ink">
          {note?.title ?? "未选择笔记"}
        </h1>
        {course && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink-secondary">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: course.color }}
              aria-hidden="true"
            />
            {course.name}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="编辑模式">
        {MODES.map(({ mode: m, label, icon: Icon }) => (
          <IconButton key={m} label={label} active={mode === m} onClick={() => setMode(m)}>
            <Icon className="size-4" />
          </IconButton>
        ))}
      </div>

      <IconButton
        label={showLineNumbers ? "隐藏行号" : "显示行号"}
        active={showLineNumbers}
        onClick={toggleLineNumbers}
      >
        <Hash className="size-4" />
      </IconButton>

      {/* 保存状态（阶段三接真实文件系统后与写入结果联动） */}
      <span
        className={cx(
          "flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px]",
          saveState.textClass,
        )}
        role="status"
      >
        <span className={cx("size-1.5 rounded-full", saveState.dotClass)} aria-hidden="true" />
        {saveState.label}
      </span>

      <IconButton label="专注模式（阶段六实现）" disabled className="ml-0.5">
        <Focus className="size-4" />
      </IconButton>
    </header>
  );
}
