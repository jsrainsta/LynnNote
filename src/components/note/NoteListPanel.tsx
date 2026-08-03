import { useMemo, useState } from "react";
import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { BookOpen, Check, PanelLeftClose, Plus, Search, X } from "lucide-react";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { useToastStore } from "../../stores/useToastStore";
import { fs } from "../../lib/storage/fs";
import { IconButton } from "../common/IconButton";
import { EmptyState } from "../common/EmptyState";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { NoteContextMenu } from "./NoteContextMenu";
import type { ContextMenuState } from "./NoteContextMenu";
import { NoteItem } from "./NoteItem";

interface NoteListPanelProps {
  panelRef: RefObject<PanelImperativeHandle | null>;
}

/** 中间笔记栏（规范 §8.2）：置顶优先按更新时间倒序；右键菜单支持重命名/删除，+ 新建笔记 */
export function NoteListPanel({ panelRef }: NoteListPanelProps) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const notes = useNoteStore((s) => s.notes);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const addNote = useNoteStore((s) => s.addNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const removeNote = useNoteStore((s) => s.removeNote);
  const workspacePath = useWorkspaceStore((s) => s.path);
  const showToast = useToastStore((s) => s.show);

  const course = courses.find((c) => c.id === selectedCourseId);
  const deletingNote = notes.find((n) => n.id === deletingId);

  // 阶段一只做标题/摘要的简单过滤，全文搜索在阶段八实现
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => n.courseId === selectedCourseId)
      .filter(
        (n) =>
          q === "" ||
          n.title.toLowerCase().includes(q) ||
          (n.summary ?? "").toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [notes, selectedCourseId, query]);

  const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

  /** 新建笔记：在当前课程目录创建 .md 文件 */
  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || !workspacePath || !course) return;
    try {
      const entry = await fs.createNote(workspacePath, course.slug, title);
      addNote(entry);
      setNewTitle("");
      setCreating(false);
    } catch (error) {
      showToast(errorMessage(error, "新建笔记失败"), "error");
    }
  };

  /** 重命名：改文件名并同步内容中的一级标题 */
  const handleRename = async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed || !workspacePath) return;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    if (trimmed === note.title) {
      setRenaming(null);
      return;
    }
    try {
      const entry = await fs.renameNote(workspacePath, note.relativePath, trimmed);
      updateNote(id, entry);
      // 编辑器内容缓存键随 id（相对路径）变化，一并迁移
      useEditorStore.getState().remapNote(id, entry.id);
      setRenaming(null);
    } catch (error) {
      showToast(errorMessage(error, "重命名失败"), "error");
    }
  };

  /** 删除：从磁盘移除文件（二次确认在 ConfirmDialog 完成） */
  const handleDelete = async (id: string) => {
    if (!workspacePath) return;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    try {
      await fs.deleteNote(workspacePath, note.relativePath);
      removeNote(id);
      setDeletingId(null);
      showToast("笔记已删除", "success");
    } catch (error) {
      setDeletingId(null);
      showToast(errorMessage(error, "删除失败"), "error");
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-col bg-surface" aria-label="笔记列表">
      <header className="flex h-12 shrink-0 items-center gap-2 px-3">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: course?.color }}
          aria-hidden="true"
        />
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
          {course?.name ?? "课程"}
        </h2>
        <IconButton label="折叠笔记栏" onClick={() => panelRef.current?.collapse()}>
          <PanelLeftClose className="size-4" />
        </IconButton>
      </header>

      {/* 新建笔记输入行（输入标题后回车确认） */}
      {creating ? (
        <div className="flex shrink-0 items-center gap-1.5 px-3 pb-2">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setNewTitle("");
              }
            }}
            placeholder="笔记标题"
            aria-label="新建笔记标题"
            className="h-8 min-w-0 flex-1 rounded-lg border border-accent bg-panel px-2.5 text-[13px] text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
          <IconButton label="确认新建" onClick={() => void handleCreate()}>
            <Check className="size-4" />
          </IconButton>
          <IconButton
            label="取消新建"
            onClick={() => {
              setCreating(false);
              setNewTitle("");
            }}
          >
            <X className="size-4" />
          </IconButton>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5 px-3 pb-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-tertiary" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索笔记…"
              aria-label="搜索笔记"
              className="h-8 w-full rounded-lg border border-border bg-panel pl-7 pr-2 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-tertiary focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={!course}
            aria-label="新建笔记"
            title={course ? "新建笔记" : "请先在左侧选择课程"}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            新建
          </button>
        </div>
      )}

      {/* 笔记列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={query ? Search : BookOpen}
            title={query ? "没有匹配的笔记" : "暂无笔记"}
            description={query ? "换个关键词试试" : course ? "点击上方 + 新建一篇笔记" : "先在左侧选择一门课程"}
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((note) => (
              <li
                key={note.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, noteId: note.id });
                }}
              >
                {renaming?.id === note.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={renaming.title}
                    onChange={(e) => setRenaming({ ...renaming, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(renaming.id, renaming.title);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    aria-label="重命名笔记"
                    className="w-full rounded-lg border border-accent bg-panel px-2.5 py-1.5 text-[13px] text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  />
                ) : (
                  <NoteItem note={note} selected={note.id === selectedNoteId} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 右键菜单：重命名 / 删除 */}
      <NoteContextMenu
        state={menu}
        onRename={(id) => {
          const note = notes.find((n) => n.id === id);
          if (note) setRenaming({ id, title: note.title });
        }}
        onDelete={(id) => setDeletingId(id)}
        onClose={() => setMenu(null)}
      />

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={deletingId !== null}
        title="删除笔记"
        description={`确定删除「${deletingNote?.title ?? ""}」吗？文件将从磁盘移除，此操作不可撤销。`}
        confirmLabel="删除"
        danger
        onConfirm={() => {
          if (deletingId) void handleDelete(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </section>
  );
}
