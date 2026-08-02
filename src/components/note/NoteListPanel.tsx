import { useMemo, useState } from "react";
import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { BookOpen, PanelLeftClose, Plus, Search } from "lucide-react";
import { useCourseStore } from "../../stores/useCourseStore";
import { useNoteStore } from "../../stores/useNoteStore";
import { IconButton } from "../common/IconButton";
import { EmptyState } from "../common/EmptyState";
import { NoteItem } from "./NoteItem";

interface NoteListPanelProps {
  panelRef: RefObject<PanelImperativeHandle | null>;
}

/** 中间笔记栏（规范 §8.2）：置顶优先，按更新时间倒序 */
export function NoteListPanel({ panelRef }: NoteListPanelProps) {
  const [query, setQuery] = useState("");
  const courses = useCourseStore((s) => s.courses);
  const selectedCourseId = useCourseStore((s) => s.selectedCourseId);
  const notes = useNoteStore((s) => s.notes);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);

  const course = courses.find((c) => c.id === selectedCourseId);

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

      {/* 搜索 + 新建笔记 */}
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
        <IconButton label="新建笔记（阶段二实现）" disabled>
          <Plus className="size-4" />
        </IconButton>
      </div>

      {/* 笔记列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={query ? Search : BookOpen}
            title={query ? "没有匹配的笔记" : "暂无笔记"}
            description={query ? "换个关键词试试" : "点击上方 + 新建一篇笔记"}
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((note) => (
              <li key={note.id}>
                <NoteItem note={note} selected={note.id === selectedNoteId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
