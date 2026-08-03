import { useEffect, useRef, useState } from "react";
import type { Course } from "../../types";
import type { CoursePatch } from "../../lib/storage/fs";
import { cx } from "../../lib/utils/cx";

/** 编辑课程可选的预设色板（创建时默认色由后端轮换，此处仅供选择） */
const PALETTE = [
  "#6d7cf6",
  "#7fb069",
  "#5aa9a6",
  "#d9a05b",
  "#e07b5d",
  "#c47eaa",
  "#5b9bd5",
  "#9b8ec4",
];

interface CourseEditDialogProps {
  open: boolean;
  course: Course | null;
  onSave: (patch: CoursePatch) => void;
  onCancel: () => void;
}

const inputClass =
  "h-8 w-full rounded-lg border border-border bg-panel px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-tertiary focus:border-accent focus:ring-2 focus:ring-accent/25";

/** 编辑课程弹窗：名称必填，其余可选；空字符串 = 清空该字段 */
export function CourseEditDialog({ open, course, onSave, onCancel }: CourseEditDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [teacher, setTeacher] = useState("");
  const [location, setLocation] = useState("");
  const [schedule, setSchedule] = useState("");
  const [semester, setSemester] = useState("");
  const [examDate, setExamDate] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // 打开时用当前课程数据初始化表单
  useEffect(() => {
    if (!open) return;
    setName(course?.name ?? "");
    setColor(course?.color ?? PALETTE[0]);
    setTeacher(course?.teacher ?? "");
    setLocation(course?.location ?? "");
    setSchedule(course?.schedule ?? "");
    setSemester(course?.semester ?? "");
    setExamDate(course?.examDate ?? "");
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, course, onCancel]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      color,
      teacher: teacher.trim(),
      location: location.trim(),
      schedule: schedule.trim(),
      semester: semester.trim(),
      examDate: examDate.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="编辑课程"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-ink">编辑课程</h2>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-ink-secondary">课程名称</span>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="课程名称"
              aria-label="课程名称"
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-ink-secondary">课程颜色</span>
            <div className="flex gap-2" role="radiogroup" aria-label="课程颜色">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`选择颜色 ${c}`}
                  onClick={() => setColor(c)}
                  className={cx(
                    "size-6 rounded-full transition-transform hover:scale-110",
                    color === c && "ring-2 ring-ink/60 ring-offset-2 ring-offset-panel",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">教师</span>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="任课教师"
                aria-label="任课教师"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">地点</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="上课地点"
                aria-label="上课地点"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">上课时间</span>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="如：周一 3-4 节"
                aria-label="上课时间"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">学期</span>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="如：2026 秋"
                aria-label="学期"
                className={inputClass}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">考试日期</span>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                aria-label="考试日期"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-panel px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
