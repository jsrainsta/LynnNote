import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { Check, FolderOpen, Moon, PanelLeftClose, Plus, Settings, Sun, X } from "lucide-react";
import logo from "../../assets/logo.png";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useToastStore } from "../../stores/useToastStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { useIndexStore } from "../../stores/useIndexStore";
import { fs } from "../../lib/storage/fs";
import type { CoursePatch } from "../../lib/storage/fs";
import { IconButton } from "../common/IconButton";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { CourseItem } from "./CourseItem";
import { CourseContextMenu } from "./CourseContextMenu";
import type { CourseContextMenuState } from "./CourseContextMenu";
import { CourseEditDialog } from "./CourseEditDialog";
import { QuestionsPanel } from "../question/QuestionsPanel";
import { SettingsDialog } from "../settings/SettingsDialog";
import { UI_EVENTS, useUiEventStore } from "../../stores/useUiEventStore";
import { cx } from "../../lib/utils/cx";

interface CourseSidebarProps {
  panelRef: RefObject<PanelImperativeHandle | null>;
}

type SidebarView = "courses" | "questions";

/** 左侧课程栏（规范 §8.1）：课程视图 / 疑问视图（阶段七）双 tab */
export function CourseSidebar({ panelRef }: CourseSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [menu, setMenu] = useState<CourseContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<SidebarView>("courses");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const addCourse = useCourseStore((s) => s.addCourse);
  const updateCourse = useCourseStore((s) => s.updateCourse);
  const removeCourse = useCourseStore((s) => s.removeCourse);
  const notes = useNoteStore((s) => s.notes);
  const removeNotesByCourseId = useNoteStore((s) => s.removeNotesByCourseId);
  const questionCount = useIndexStore((s) => s.questions.filter((q) => !q.solved).length);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const workspacePath = useWorkspaceStore((s) => s.path);
  const showToast = useToastStore((s) => s.show);

  const editingCourse = courses.find((c) => c.id === editingId) ?? null;
  const deletingCourse = courses.find((c) => c.id === deletingId) ?? null;
  const countFor = (courseId: string) =>
    notes.filter((n) => n.courseId === courseId).length;

  // 命令面板事件（阶段八）：新建课程 / 打开疑问列表 / 打开设置
  const uiEvent = useUiEventStore((s) => s.event);
  const consumeUiEvent = useUiEventStore((s) => s.consume);
  useEffect(() => {
    if (uiEvent === UI_EVENTS.NEW_COURSE) {
      consumeUiEvent();
      setView("courses");
      setCreating(true);
    } else if (uiEvent === UI_EVENTS.OPEN_QUESTIONS) {
      consumeUiEvent();
      setView("questions");
    } else if (uiEvent === UI_EVENTS.OPEN_SETTINGS) {
      consumeUiEvent();
      setSettingsOpen(true);
    }
  }, [uiEvent, consumeUiEvent]);

  const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

  const handleSwitchWorkspace = async () => {
    try {
      await switchWorkspace();
    } catch (error) {
      showToast(errorMessage(error, "切换工作区失败"), "error");
    }
  };

  /** 新建课程：内联输入名称 → slug 自动生成 → courses.json 追加 */
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !workspacePath) return;
    try {
      const meta = await fs.createCourse(workspacePath, name);
      addCourse(meta);
      setNewName("");
      setCreating(false);
    } catch (error) {
      showToast(errorMessage(error, "新建课程失败"), "error");
    }
  };

  /** 编辑课程：保存补丁（名称/颜色/教师等；改名称不动 slug 与目录） */
  const handleSaveEdit = async (patch: CoursePatch) => {
    if (!workspacePath || !editingId) return;
    try {
      const meta = await fs.updateCourse(workspacePath, editingId, patch);
      updateCourse(editingId, meta);
      setEditingId(null);
      showToast("课程已保存", "success");
    } catch (error) {
      showToast(errorMessage(error, "保存课程失败"), "error");
    }
  };

  /** 删除课程：courses.json 移除 + 删除课程目录（含全部笔记） */
  const handleDelete = async (id: string) => {
    if (!workspacePath) return;
    const course = courses.find((c) => c.id === id);
    if (!course) return;
    try {
      await fs.deleteCourse(workspacePath, id);
      // 先清编辑器缓存（按删除前的笔记 id），再移除列表
      const doomed = notes.filter((n) => n.courseId === id).map((n) => n.id);
      useEditorStore.getState().removeNotesContent(doomed);
      useIndexStore.getState().removeNotes(doomed);
      removeCourse(id);
      removeNotesByCourseId(id);
      setDeletingId(null);
      showToast("课程已删除", "success");
    } catch (error) {
      setDeletingId(null);
      showToast(errorMessage(error, "删除课程失败"), "error");
    }
  };

  return (
    <aside className="flex h-full min-w-0 flex-col bg-surface" aria-label="课程栏">
      {/* Logo 与折叠按钮 */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 px-3">
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="size-7 shrink-0 rounded-lg object-contain"
        />
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          LynnNote
        </span>
        <IconButton label="折叠课程栏" className="ml-auto" onClick={() => panelRef.current?.collapse()}>
          <PanelLeftClose className="size-4" />
        </IconButton>
      </div>

      {/* 视图切换：课程 / 疑问 */}
      <div
        role="tablist"
        aria-label="侧栏视图"
        className="flex shrink-0 gap-1 px-2 pb-1.5"
      >
        {(
          [
            { key: "courses", label: "课程" },
            { key: "questions", label: `疑问${questionCount > 0 ? ` ${questionCount}` : ""}` },
          ] as Array<{ key: SidebarView; label: string }>
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={cx(
              "flex-1 rounded-lg px-2 py-1 text-[12px] transition-colors",
              view === key
                ? "bg-active font-medium text-ink"
                : "text-ink-secondary hover:bg-hover hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "questions" ? (
        <QuestionsPanel />
      ) : (
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="课程列表">
        <p className="px-2 pb-1 pt-2 text-[11px] font-medium tracking-wider text-ink-tertiary">
          课程
        </p>

        {/* 新建课程输入行（输入名称后回车确认） */}
        {creating && (
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="课程名称"
              aria-label="新建课程名称"
              className="h-8 min-w-0 flex-1 rounded-lg border border-accent bg-panel px-2.5 text-[13px] text-ink outline-none focus:ring-2 focus:ring-accent/25"
            />
            <IconButton label="确认新建课程" onClick={() => void handleCreate()}>
              <Check className="size-4" />
            </IconButton>
            <IconButton
              label="取消新建课程"
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        <ul className="flex flex-col gap-0.5">
          {courses.map((course) => (
            <li
              key={course.id}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, courseId: course.id });
              }}
            >
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
          onClick={() => setCreating(true)}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
        >
          <Plus className="size-3.5" />
          新建课程
        </button>
      </nav>
      )}

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
        <IconButton label="打开设置" className="ml-auto" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-4" />
        </IconButton>
      </div>

      {/* 课程右键菜单：编辑 / 删除 */}
      <CourseContextMenu
        state={menu}
        onEdit={(id) => setEditingId(id)}
        onDelete={(id) => setDeletingId(id)}
        onClose={() => setMenu(null)}
      />

      {/* 编辑课程弹窗 */}
      <CourseEditDialog
        open={editingId !== null}
        course={editingCourse}
        onSave={(patch) => void handleSaveEdit(patch)}
        onCancel={() => setEditingId(null)}
      />

      {/* 设置弹窗（阶段八） */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* 删除课程二次确认（提示该课程笔记数） */}
      <ConfirmDialog
        open={deletingId !== null}
        title="删除课程"
        description={`确定删除课程「${deletingCourse?.name ?? ""}」吗？该课程下的 ${deletingCourse ? countFor(deletingCourse.id) : 0} 篇笔记将一并从磁盘删除，此操作不可撤销。`}
        confirmLabel="删除"
        danger
        onConfirm={() => {
          if (deletingId) void handleDelete(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </aside>
  );
}
