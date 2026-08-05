import { useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, Search } from "lucide-react";
import { useNoteStore } from "../../stores/useNoteStore";
import { useCourseStore } from "../../stores/useCourseStore";
import { useIndexStore } from "../../stores/useIndexStore";
import { useEditorActionStore } from "../../stores/useEditorActionStore";
import { indexOfIgnoreCase, makeSnippet } from "../../lib/search";
import { cx } from "../../lib/utils/cx";

/**
 * 搜索弹窗（阶段八，规范 §17/§19）。
 * mode：
 * - "all"：全局全文搜索（Ctrl+Shift+F）——标题/正文/课程名（疑问与卡片文本在正文中）
 * - "titles"：快速打开（Ctrl+P）——只按标题匹配
 * - "note"：当前笔记内搜索（Ctrl+F 在编辑器外时）
 * 点击结果 → 打开笔记并定位到匹配位置（复用阶段七 locate 机制）。
 */
export type SearchMode = "all" | "titles" | "note";

interface SearchResult {
  noteId: string;
  courseId: string;
  title: string;
  /** 匹配说明（课程名匹配时的提示） */
  label: string;
  snippet: string;
  /** 正文匹配偏移（-1 = 无正文定位） */
  offset: number;
}

const MAX_RESULTS = 50;

interface SearchDialogProps {
  open: boolean;
  mode: SearchMode;
  onClose: () => void;
}

export function SearchDialog({ open, mode, onClose }: SearchDialogProps) {
  const notes = useNoteStore((s) => s.notes);
  const courses = useCourseStore((s) => s.courses);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const contents = useIndexStore((s) => s.contents);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      // 打开后聚焦，下一帧让浏览器处理焦点（弹窗刚挂载）
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, mode]);

  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? id;

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    if (mode === "note") {
      if (!selectedNoteId) return [];
      const content = contents[selectedNoteId] ?? "";
      const out: SearchResult[] = [];
      let from = 0;
      let count = 0;
      // 当前笔记内全部匹配位置（最多 50 个，含行号定位）
      while (count < MAX_RESULTS) {
        const idx = content.toLowerCase().indexOf(q, from);
        if (idx === -1) break;
        const note = notes.find((n) => n.id === selectedNoteId);
        out.push({
          noteId: selectedNoteId,
          courseId: note?.courseId ?? "",
          title: note?.title ?? "",
          label: "当前笔记",
          snippet: makeSnippet(content, idx),
          offset: idx,
        });
        from = idx + q.length;
        count += 1;
      }
      return out;
    }

    const titles: SearchResult[] = [];
    const contentMatches: SearchResult[] = [];
    for (const note of notes) {
      if (titles.length + contentMatches.length >= MAX_RESULTS) break;
      const titleHit = note.title.toLowerCase().includes(q);
      const courseHit = courseName(note.courseId).toLowerCase().includes(q);
      const content = contents[note.id];
      const contentHit = content !== undefined && content.toLowerCase().includes(q);
      if (!titleHit && !contentHit && !courseHit) continue;
      const offset = content !== undefined ? indexOfIgnoreCase(content, query.trim()) : -1;
      if (titleHit) {
        titles.push({
          noteId: note.id,
          courseId: note.courseId,
          title: note.title,
          label: "标题匹配",
          snippet: note.summary ?? "",
          offset: -1,
        });
      } else if (courseHit && !contentHit) {
        contentMatches.push({
          noteId: note.id,
          courseId: note.courseId,
          title: note.title,
          label: `课程：${courseName(note.courseId)}`,
          snippet: note.summary ?? "",
          offset: -1,
        });
      } else {
        contentMatches.push({
          noteId: note.id,
          courseId: note.courseId,
          title: note.title,
          label: "正文匹配",
          snippet: offset >= 0 ? makeSnippet(content!, offset) : "",
          offset,
        });
      }
    }
    if (mode === "titles") return titles;
    return [...titles, ...contentMatches].slice(0, MAX_RESULTS);
  }, [query, mode, notes, courses, contents, selectedNoteId]);

  /** 打开结果：选中课程/笔记；正文匹配则定位并高亮 */
  const openResult = (r: SearchResult) => {
    if (r.courseId) useCourseStore.getState().selectCourse(r.courseId);
    useNoteStore.getState().selectNote(r.noteId);
    if (r.offset >= 0) {
      const len = Math.max(query.trim().length, 1);
      useEditorActionStore
        .getState()
        .requestLocate(r.noteId, r.offset, r.offset + len);
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = mode === "titles" ? "快速打开笔记" : mode === "note" ? "当前笔记搜索" : "全局搜索";

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-ink/25 p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="size-4 shrink-0 text-ink-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[selected]) {
                e.preventDefault();
                openResult(results[selected]);
              }
            }}
            placeholder={`${title}…`}
            aria-label="搜索关键词"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-tertiary"
          />
          <span className="shrink-0 text-[11px] text-ink-tertiary">Esc 关闭</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {query.trim() === "" ? (
            <p className="px-3 py-6 text-center text-[12px] text-ink-tertiary">
              {mode === "titles" ? "输入笔记标题快速打开" : "输入关键词搜索全部笔记"}
            </p>
          ) : results.length === 0 ? (
            <p className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
              <FileSearch className="size-6 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[12px] text-ink-secondary">没有匹配的结果</span>
            </p>
          ) : (
            <ul role="listbox" aria-label="搜索结果" className="flex flex-col gap-0.5">
              {results.map((r, i) => (
                <li key={`${r.noteId}:${r.offset}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    onClick={() => openResult(r)}
                    onMouseEnter={() => setSelected(i)}
                    className={cx(
                      "w-full rounded-lg px-2.5 py-2 text-left transition-colors",
                      i === selected ? "bg-active" : "hover:bg-hover",
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-[13px] text-ink">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            courses.find((c) => c.id === r.courseId)?.color ?? "#999",
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {r.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-tertiary">
                        {r.label}
                      </span>
                    </p>
                    {r.snippet && (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-secondary">
                        {r.snippet}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
